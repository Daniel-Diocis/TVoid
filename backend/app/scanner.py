import json
import logging
import re
import shutil
import subprocess
from pathlib import Path
from sqlite3 import Connection
from typing import Any

from .config import MOVIES_ROOT, SERIES_ROOT, resolve_media_ref, to_media_ref
from .database import get_connection, utc_now

SEASON_RE = re.compile(r"^season(?P<number>\d+)$", re.IGNORECASE)
EPISODE_RE = re.compile(
    r"^S(?P<season>\d{1,2})E(?P<episode>\d{1,3})\s*-\s*(?P<title>.+)\.mp4$",
    re.IGNORECASE,
)
THUMBNAIL_TIMESTAMPS = ("00:02:00", "00:00:10")
logger = logging.getLogger("uvicorn.error")
_ffmpeg_missing_warned = False


def _load_metadata(media_dir: Path, category: str) -> dict[str, Any]:
    metadata_path = media_dir / "metadata.json"
    fallback = {
        "title": media_dir.name,
        "description": "",
        "year": None,
        "category": category,
        "poster": "poster.jpg",
    }

    try:
        data = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
        if not isinstance(data, dict):
            raise ValueError("expected a JSON object")
        for key in ("title", "description", "poster"):
            value = data.get(key)
            if value is not None:
                if not isinstance(value, str) or "\0" in value:
                    raise ValueError(f"invalid {key}")
                value.encode("utf-8")
        year = data.get("year")
        if isinstance(year, int) and not -(2**63) <= year < 2**63:
            raise ValueError("year out of range")
    except FileNotFoundError:
        return fallback
    except (OSError, ValueError, RecursionError) as error:
        logger.warning("Ignoring %s: %s", metadata_path, error)
        return fallback

    return {
        "title": str(data.get("title") or media_dir.name),
        "description": str(data.get("description") or ""),
        "year": data.get("year") if isinstance(data.get("year"), int) else None,
        "category": category,
        "poster": str(data.get("poster") or "poster.jpg"),
    }


def expected_thumbnail_path(series_dir: Path, season_number: int, episode_number: int) -> Path:
    return series_dir / "thumbnails" / f"S{season_number:02d}E{episode_number:02d}.jpg"


def expected_movie_thumbnail_path(movie_dir: Path) -> Path:
    return movie_dir / "thumbnail.jpg"


def generate_thumbnail(video_path: Path, thumbnail_path: Path) -> bool:
    global _ffmpeg_missing_warned

    if thumbnail_path.exists() and thumbnail_path.is_file():
        return True

    if not shutil.which("ffmpeg"):
        if not _ffmpeg_missing_warned:
            logger.warning("FFmpeg is not available; video thumbnails will not be generated.")
            _ffmpeg_missing_warned = True
        return False

    thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = thumbnail_path.with_name(f".{thumbnail_path.stem}.tmp{thumbnail_path.suffix}")
    last_error = ""

    try:
        if temp_path.exists():
            temp_path.unlink()

        for timestamp in THUMBNAIL_TIMESTAMPS:
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-ss",
                    timestamp,
                    "-i",
                    str(video_path),
                    "-frames:v",
                    "1",
                    str(temp_path),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            if result.returncode == 0 and temp_path.exists() and temp_path.stat().st_size > 0:
                temp_path.replace(thumbnail_path)
                logger.info("Generated thumbnail for %s at %s", video_path.name, thumbnail_path)
                return True

            last_error = (result.stderr or result.stdout or "").strip()
            if temp_path.exists():
                temp_path.unlink()
    except OSError as error:
        last_error = str(error)

    if temp_path.exists():
        temp_path.unlink()

    logger.warning(
        "Could not generate thumbnail for %s: %s",
        video_path,
        last_error.splitlines()[-1] if last_error else "unknown FFmpeg error",
    )
    return False


def _thumbnail_ref(series_dir: Path, episode_path: Path, season_number: int, episode_number: int) -> str | None:
    thumbnail = expected_thumbnail_path(series_dir, season_number, episode_number)
    if thumbnail.exists() or generate_thumbnail(episode_path, thumbnail):
        return to_media_ref(thumbnail)
    return None


def _movie_thumbnail_ref(movie_dir: Path, movie_path: Path) -> str | None:
    thumbnail = expected_movie_thumbnail_path(movie_dir)
    if thumbnail.exists() or generate_thumbnail(movie_path, thumbnail):
        return to_media_ref(thumbnail)
    return None


def _poster_ref(media_dir: Path, metadata: dict[str, Any]) -> str | None:
    poster_name = metadata.get("poster") or "poster.jpg"
    try:
        poster = (media_dir / poster_name).resolve()
        if not poster.is_relative_to(media_dir.resolve()):
            poster = media_dir / "poster.jpg"
        if poster.is_file():
            return to_media_ref(poster)
    except (OSError, RuntimeError):
        logger.warning("Ignoring unreadable poster in %s", media_dir)
    return None


def _upsert_media_item(connection: Connection, media_dir: Path, metadata: dict[str, Any]) -> int:
    now = utc_now()
    folder_ref = to_media_ref(media_dir)
    poster_ref = _poster_ref(media_dir, metadata)

    connection.execute(
        """
        INSERT INTO media_items (
            category, title, description, year, folder_path, poster_path, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(folder_path) DO UPDATE SET
            category = excluded.category,
            title = excluded.title,
            description = excluded.description,
            year = excluded.year,
            poster_path = excluded.poster_path,
            updated_at = excluded.updated_at
        """,
        (
            metadata["category"],
            metadata["title"],
            metadata["description"],
            metadata["year"],
            folder_ref,
            poster_ref,
            now,
            now,
        ),
    )
    row = connection.execute(
        "SELECT id FROM media_items WHERE folder_path = ?",
        (folder_ref,),
    ).fetchone()
    return int(row["id"])


def _upsert_season(
    connection: Connection,
    media_item_id: int,
    season_number: int,
    season_dir: Path,
) -> int:
    now = utc_now()
    folder_ref = to_media_ref(season_dir)

    connection.execute(
        """
        INSERT INTO seasons (
            media_item_id, season_number, folder_path, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(media_item_id, season_number) DO UPDATE SET
            folder_path = excluded.folder_path,
            updated_at = excluded.updated_at
        """,
        (media_item_id, season_number, folder_ref, now, now),
    )
    row = connection.execute(
        """
        SELECT id FROM seasons
        WHERE media_item_id = ? AND season_number = ?
        """,
        (media_item_id, season_number),
    ).fetchone()
    return int(row["id"])


def _upsert_episode(
    connection: Connection,
    media_item_id: int,
    season_id: int,
    episode_path: Path,
    season_number: int,
    episode_number: int,
    title: str,
    thumbnail_ref: str | None,
) -> None:
    now = utc_now()
    file_ref = to_media_ref(episode_path)

    existing = connection.execute(
        """
        SELECT id
        FROM episodes
        WHERE file_path = ?
           OR (media_item_id = ? AND season_number = ? AND episode_number = ?)
        ORDER BY
            CASE
                WHEN media_item_id = ? AND season_number = ? AND episode_number = ? THEN 0
                ELSE 1
            END
        LIMIT 1
        """,
        (
            file_ref,
            media_item_id,
            season_number,
            episode_number,
            media_item_id,
            season_number,
            episode_number,
        ),
    ).fetchone()

    if existing:
        connection.execute(
            """
            UPDATE episodes
            SET media_item_id = ?,
                season_id = ?,
                title = ?,
                season_number = ?,
                episode_number = ?,
                file_path = ?,
                thumbnail_path = COALESCE(?, thumbnail_path),
                updated_at = ?
            WHERE id = ?
            """,
            (
                media_item_id,
                season_id,
                title,
                season_number,
                episode_number,
                file_ref,
                thumbnail_ref,
                now,
                existing["id"],
            ),
        )
        return

    connection.execute(
        """
        INSERT INTO episodes (
            media_item_id, season_id, title, season_number, episode_number,
            file_path, thumbnail_path, duration_seconds, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        """,
        (
            media_item_id,
            season_id,
            title,
            season_number,
            episode_number,
            file_ref,
            thumbnail_ref,
            now,
            now,
        ),
    )


def _movie_candidates(movie_dir: Path) -> list[Path]:
    return sorted(
        (path for path in movie_dir.glob("*.mp4") if path.is_file()),
        key=lambda path: path.name.lower(),
    )


def _upsert_movie_file(
    connection: Connection,
    media_item_id: int,
    movie_path: Path,
    title: str,
    thumbnail_ref: str | None,
) -> None:
    now = utc_now()
    file_ref = to_media_ref(movie_path)

    existing = connection.execute(
        """
        SELECT id FROM movie_files
        WHERE media_item_id = ? OR file_path = ?
        LIMIT 1
        """,
        (media_item_id, file_ref),
    ).fetchone()

    if existing:
        connection.execute(
            """
            UPDATE movie_files
            SET media_item_id = ?,
                title = ?,
                file_path = ?,
                thumbnail_path = COALESCE(?, thumbnail_path),
                updated_at = ?
            WHERE id = ?
            """,
            (media_item_id, title, file_ref, thumbnail_ref, now, existing["id"]),
        )
        return

    connection.execute(
        """
        INSERT INTO movie_files (
            media_item_id, title, file_path, thumbnail_path, duration_seconds, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, NULL, ?, ?)
        """,
        (media_item_id, title, file_ref, thumbnail_ref, now, now),
    )


def _discover_movies():
    MOVIES_ROOT.mkdir(parents=True, exist_ok=True)

    for movie_dir in sorted(MOVIES_ROOT.iterdir(), key=lambda path: path.name.lower()):
        if not movie_dir.is_dir():
            continue

        candidates = _movie_candidates(movie_dir)
        if not candidates:
            logger.warning("Movie folder has no direct MP4 file: %s", movie_dir)
            continue

        if len(candidates) > 1:
            logger.warning(
                "Movie folder has multiple MP4 files, using first alphabetically: %s",
                movie_dir,
            )

        metadata = _load_metadata(movie_dir, "movies")
        movie_path = candidates[0]
        yield movie_dir, metadata, movie_path, _movie_thumbnail_ref(movie_dir, movie_path)


def _discover_seasons(series_dir: Path):
    for season_dir in sorted(series_dir.iterdir(), key=lambda path: path.name.lower()):
        season_match = SEASON_RE.match(season_dir.name)
        if not season_match or not season_dir.is_dir():
            continue
        season_number = int(season_match.group("number"))
        episodes = []
        for path in sorted(season_dir.glob("*.mp4"), key=lambda path: path.name.lower()):
            match = EPISODE_RE.match(path.name)
            if not match or int(match.group("season")) != season_number:
                continue
            number = int(match.group("episode"))
            thumbnail = _thumbnail_ref(series_dir, path, season_number, number)
            episodes.append((path, number, match.group("title").strip(), thumbnail))
        yield season_dir, season_number, episodes


def _video_ref_exists(value: str | None) -> bool:
    path = resolve_media_ref(value)
    if not path:
        return False

    try:
        return path.exists() and path.is_file()
    except OSError as error:
        logger.warning("Could not access video path %s: %s", path, error)
        return False


def _orphan_episode_ids(connection: Connection) -> list[int]:
    rows = connection.execute("SELECT id, file_path FROM episodes").fetchall()
    return [int(row["id"]) for row in rows if not _video_ref_exists(row["file_path"])]


def _orphan_movie_rows(connection: Connection) -> list[tuple[int, int]]:
    rows = connection.execute("SELECT id, media_item_id, file_path FROM movie_files").fetchall()
    return [
        (int(row["id"]), int(row["media_item_id"]))
        for row in rows
        if not _video_ref_exists(row["file_path"])
    ]


def _delete_by_ids(connection: Connection, table: str, column: str, ids: list[int]) -> None:
    if not ids:
        return

    placeholders = ", ".join("?" for _ in ids)
    connection.execute(f"DELETE FROM {table} WHERE {column} IN ({placeholders})", ids)


def _remove_empty_seasons(connection: Connection) -> int:
    cursor = connection.execute(
        """
        DELETE FROM seasons
        WHERE NOT EXISTS (
            SELECT 1
            FROM episodes
            WHERE episodes.season_id = seasons.id
        )
        """
    )
    return int(cursor.rowcount or 0)


def _cleanup_orphans(
    connection: Connection,
    episode_ids: list[int],
    movie_rows: list[tuple[int, int]],
) -> tuple[int, int, int]:
    movie_file_ids = [movie_file_id for movie_file_id, _ in movie_rows]
    movie_media_ids = sorted({media_item_id for _, media_item_id in movie_rows})

    _delete_by_ids(connection, "watch_progress", "episode_id", episode_ids)
    _delete_by_ids(connection, "episodes", "id", episode_ids)
    empty_seasons_removed = _remove_empty_seasons(connection)

    _delete_by_ids(connection, "movie_progress", "movie_file_id", movie_file_ids)
    _delete_by_ids(connection, "movie_files", "id", movie_file_ids)

    if movie_media_ids:
        placeholders = ", ".join("?" for _ in movie_media_ids)
        connection.execute(
            f"""
            DELETE FROM media_items
            WHERE category = 'movies'
              AND id IN ({placeholders})
              AND NOT EXISTS (
                SELECT 1
                FROM movie_files
                WHERE movie_files.media_item_id = media_items.id
              )
            """,
            movie_media_ids,
        )

    return len(episode_ids), len(movie_file_ids), empty_seasons_removed


def scan_series_library(cleanup: bool = False) -> dict[str, int | str | bool]:
    SERIES_ROOT.mkdir(parents=True, exist_ok=True)

    seasons_found = 0
    episodes_found = 0
    orphan_episodes_removed = 0
    orphan_movies_removed = 0
    empty_seasons_removed = 0

    # Discover files and generate artwork before taking SQLite's write lock.
    series = [
        (folder, _load_metadata(folder, "series"), list(_discover_seasons(folder)))
        for folder in sorted(SERIES_ROOT.iterdir(), key=lambda path: path.name.lower())
        if folder.is_dir()
    ]
    movies = list(_discover_movies())

    with get_connection() as connection:
        for folder, metadata, seasons in series:
            media_id = _upsert_media_item(connection, folder, metadata)
            for season_dir, season_number, episodes in seasons:
                season_id = _upsert_season(connection, media_id, season_number, season_dir)
                seasons_found += 1
                for path, number, title, thumbnail in episodes:
                    _upsert_episode(connection, media_id, season_id, path, season_number, number, title, thumbnail)
                    episodes_found += 1

        for folder, metadata, path, thumbnail in movies:
            media_id = _upsert_media_item(connection, folder, metadata)
            _upsert_movie_file(connection, media_id, path, metadata["title"], thumbnail)

        orphan_episode_ids = _orphan_episode_ids(connection)
        orphan_movie_rows = _orphan_movie_rows(connection)

        if orphan_episode_ids or orphan_movie_rows:
            logger.warning(
                "Scan found orphan video records: episodes=%s movies=%s cleanup=%s",
                len(orphan_episode_ids),
                len(orphan_movie_rows),
                cleanup,
            )

        if cleanup:
            orphan_episodes_removed, orphan_movies_removed, empty_seasons_removed = _cleanup_orphans(
                connection,
                orphan_episode_ids,
                orphan_movie_rows,
            )
            if orphan_episodes_removed or orphan_movies_removed or empty_seasons_removed:
                logger.info(
                    "Cleanup removed orphan records: episodes=%s movies=%s empty_seasons=%s",
                    orphan_episodes_removed,
                    orphan_movies_removed,
                    empty_seasons_removed,
                )

        connection.execute("INSERT OR REPLACE INTO library_index (id, scanned_at) VALUES (1, ?)", (utc_now(),))
        connection.commit()

    return {
        "status": "ok",
        "series_found": len(series),
        "seasons_found": seasons_found,
        "episodes_found": episodes_found,
        "movies_found": len(movies),
        "orphan_episodes_found": len(orphan_episode_ids),
        "orphan_movies_found": len(orphan_movie_rows),
        "orphan_episodes_removed": orphan_episodes_removed,
        "orphan_movies_removed": orphan_movies_removed,
        "empty_seasons_removed": empty_seasons_removed,
        "cleanup": cleanup,
    }


def file_exists_for_ref(value: str | None) -> bool:
    return _video_ref_exists(value)
