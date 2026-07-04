from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..config import resolve_media_ref
from ..database import get_connection

DEFAULT_USER_ID = 1
COMPLETION_THRESHOLD = 0.9
router = APIRouter(prefix="/api", tags=["media"])


def _progress_percent(current_time: float, duration: float | None) -> int:
    if not duration or duration <= 0:
        return 0
    return min(100, max(0, round((current_time / duration) * 100)))


def _progress_payload(row) -> dict:
    current_time = float(row["current_time_seconds"] or 0)
    duration = row["progress_duration"] if "progress_duration" in row.keys() else row["duration_seconds"]
    completed = bool(row["completed"] or 0)

    return {
        "current_time_seconds": current_time,
        "duration_seconds": duration,
        "completed": completed,
        "progress_percent": _progress_percent(current_time, duration),
    }


def _media_item_payload(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"] or "",
        "year": row["year"],
        "poster_url": f"/api/images/poster/{row['id']}",
    }


@router.get("/home")
def get_home() -> dict:
    with get_connection() as connection:
        episode_continue_rows = connection.execute(
            """
            SELECT
                e.id AS episode_id,
                e.media_item_id AS media_id,
                e.title AS episode_title,
                e.season_number,
                e.episode_number,
                m.title AS series_title,
                wp.current_time_seconds,
                COALESCE(wp.duration_seconds, e.duration_seconds) AS duration_seconds,
                wp.completed,
                wp.updated_at
            FROM watch_progress wp
            JOIN episodes e ON e.id = wp.episode_id
            JOIN media_items m ON m.id = e.media_item_id
            WHERE wp.user_id = ?
              AND wp.current_time_seconds > 0
              AND wp.completed = 0
              AND (
                COALESCE(wp.duration_seconds, e.duration_seconds) IS NULL
                OR COALESCE(wp.duration_seconds, e.duration_seconds) <= 0
                OR wp.current_time_seconds / COALESCE(wp.duration_seconds, e.duration_seconds) < ?
              )
            ORDER BY wp.updated_at DESC
            """,
            (DEFAULT_USER_ID, COMPLETION_THRESHOLD),
        ).fetchall()
        movie_continue_rows = connection.execute(
            """
            SELECT
                mf.id AS movie_file_id,
                mf.media_item_id AS media_id,
                m.title,
                mp.current_time_seconds,
                COALESCE(mp.duration_seconds, mf.duration_seconds) AS duration_seconds,
                mp.completed,
                mp.updated_at
            FROM movie_progress mp
            JOIN movie_files mf ON mf.id = mp.movie_file_id
            JOIN media_items m ON m.id = mf.media_item_id
            WHERE mp.user_id = ?
              AND mp.current_time_seconds > 0
              AND mp.completed = 0
              AND (
                COALESCE(mp.duration_seconds, mf.duration_seconds) IS NULL
                OR COALESCE(mp.duration_seconds, mf.duration_seconds) <= 0
                OR mp.current_time_seconds / COALESCE(mp.duration_seconds, mf.duration_seconds) < ?
              )
            ORDER BY mp.updated_at DESC
            """,
            (DEFAULT_USER_ID, COMPLETION_THRESHOLD),
        ).fetchall()
        series_rows = connection.execute(
            """
            SELECT id, title, description, year
            FROM media_items
            WHERE category = 'series'
            ORDER BY title COLLATE NOCASE
            """
        ).fetchall()
        recent_rows = connection.execute(
            """
            SELECT id, title, description, year
            FROM media_items
            WHERE category = 'series'
            ORDER BY created_at DESC
            LIMIT 12
            """
        ).fetchall()
        movie_rows = connection.execute(
            """
            SELECT
                m.id,
                m.title,
                m.description,
                m.year,
                mf.id AS movie_file_id,
                mf.duration_seconds,
                COALESCE(mp.current_time_seconds, 0) AS current_time_seconds,
                COALESCE(mp.duration_seconds, mf.duration_seconds) AS progress_duration,
                COALESCE(mp.completed, 0) AS completed
            FROM media_items m
            LEFT JOIN movie_files mf ON mf.media_item_id = m.id
            LEFT JOIN movie_progress mp
              ON mp.movie_file_id = mf.id AND mp.user_id = ?
            WHERE m.category = 'movies'
            ORDER BY m.title COLLATE NOCASE
            """,
            (DEFAULT_USER_ID,),
        ).fetchall()

    continue_watching = []
    for row in episode_continue_rows:
        duration = row["duration_seconds"]
        current_time = float(row["current_time_seconds"] or 0)
        continue_watching.append(
            {
                "type": "episode",
                "episode_id": row["episode_id"],
                "media_id": row["media_id"],
                "series_title": row["series_title"],
                "episode_title": row["episode_title"],
                "season_number": row["season_number"],
                "episode_number": row["episode_number"],
                "current_time_seconds": current_time,
                "duration_seconds": duration,
                "progress_percent": _progress_percent(current_time, duration),
                "thumbnail_url": f"/api/images/thumbnail/{row['episode_id']}",
                "updated_at": row["updated_at"],
            }
        )

    for row in movie_continue_rows:
        duration = row["duration_seconds"]
        current_time = float(row["current_time_seconds"] or 0)
        continue_watching.append(
            {
                "type": "movie",
                "movie_file_id": row["movie_file_id"],
                "media_id": row["media_id"],
                "title": row["title"],
                "current_time_seconds": current_time,
                "duration_seconds": duration,
                "progress_percent": _progress_percent(current_time, duration),
                "thumbnail_url": f"/api/images/movie-thumbnail/{row['movie_file_id']}",
                "updated_at": row["updated_at"],
            }
        )

    continue_watching.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    for item in continue_watching:
        item.pop("updated_at", None)

    movies = []
    for row in movie_rows:
        movie_file_id = row["movie_file_id"]
        movie = _media_item_payload(row)
        movie["movie_file_id"] = movie_file_id
        movie["thumbnail_url"] = f"/api/images/movie-thumbnail/{movie_file_id}" if movie_file_id else None
        movie["progress"] = _progress_payload(row) if movie_file_id else None
        movies.append(movie)

    return {
        "continue_watching": continue_watching,
        "series": [_media_item_payload(row) for row in series_rows],
        "recently_added": [_media_item_payload(row) for row in recent_rows],
        "movies": movies,
    }


@router.get("/media")
def list_media(category: str = "series") -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, description, year
            FROM media_items
            WHERE category = ?
            ORDER BY title COLLATE NOCASE
            """,
            (category,),
        ).fetchall()

    return [_media_item_payload(row) for row in rows]


@router.get("/media/{media_id}")
def get_media(media_id: int) -> dict:
    with get_connection() as connection:
        media = connection.execute(
            """
            SELECT id, category, title, description, year
            FROM media_items
            WHERE id = ?
            """,
            (media_id,),
        ).fetchone()
        if not media:
            raise HTTPException(status_code=404, detail="Media item not found")

        seasons = connection.execute(
            """
            SELECT id, season_number
            FROM seasons
            WHERE media_item_id = ?
            ORDER BY season_number
            """,
            (media_id,),
        ).fetchall()
        episodes = connection.execute(
            """
            SELECT
                e.id,
                e.season_id,
                e.title,
                e.season_number,
                e.episode_number,
                e.duration_seconds,
                COALESCE(wp.current_time_seconds, 0) AS current_time_seconds,
                COALESCE(wp.duration_seconds, e.duration_seconds) AS progress_duration,
                COALESCE(wp.completed, 0) AS completed
            FROM episodes e
            LEFT JOIN watch_progress wp
              ON wp.episode_id = e.id AND wp.user_id = ?
            WHERE e.media_item_id = ?
            ORDER BY e.season_number, e.episode_number
            """,
            (DEFAULT_USER_ID, media_id),
        ).fetchall()

    episodes_by_season: dict[int, list[dict]] = {}
    for episode in episodes:
        episodes_by_season.setdefault(episode["season_id"], []).append(
            {
                "id": episode["id"],
                "title": episode["title"],
                "season_number": episode["season_number"],
                "episode_number": episode["episode_number"],
                "duration_seconds": episode["duration_seconds"],
                "thumbnail_url": f"/api/images/thumbnail/{episode['id']}",
                "progress": _progress_payload(episode),
            }
        )

    return {
        "id": media["id"],
        "category": media["category"],
        "title": media["title"],
        "description": media["description"] or "",
        "year": media["year"],
        "poster_url": f"/api/images/poster/{media['id']}",
        "seasons": [
            {
                "id": season["id"],
                "season_number": season["season_number"],
                "episodes": episodes_by_season.get(season["id"], []),
            }
            for season in seasons
        ],
    }


@router.get("/movies/{media_id}")
def get_movie(media_id: int) -> dict:
    with get_connection() as connection:
        movie = connection.execute(
            """
            SELECT id, category, title, description, year
            FROM media_items
            WHERE id = ? AND category = 'movies'
            """,
            (media_id,),
        ).fetchone()
        if not movie:
            raise HTTPException(status_code=404, detail="Movie not found")

        movie_file = connection.execute(
            """
            SELECT
                mf.id,
                mf.title,
                mf.duration_seconds,
                COALESCE(mp.current_time_seconds, 0) AS current_time_seconds,
                COALESCE(mp.duration_seconds, mf.duration_seconds) AS progress_duration,
                COALESCE(mp.completed, 0) AS completed
            FROM movie_files mf
            LEFT JOIN movie_progress mp
              ON mp.movie_file_id = mf.id AND mp.user_id = ?
            WHERE mf.media_item_id = ?
            """,
            (DEFAULT_USER_ID, media_id),
        ).fetchone()

    payload = {
        "id": movie["id"],
        "category": movie["category"],
        "title": movie["title"],
        "description": movie["description"] or "",
        "year": movie["year"],
        "poster_url": f"/api/images/poster/{movie['id']}",
        "movie_file": None,
    }

    if movie_file:
        payload["movie_file"] = {
            "id": movie_file["id"],
            "title": movie_file["title"],
            "video_url": f"/api/movie-video/{movie_file['id']}",
            "thumbnail_url": f"/api/images/movie-thumbnail/{movie_file['id']}",
            "duration_seconds": movie_file["duration_seconds"],
            "progress": _progress_payload(movie_file),
        }

    return payload


@router.get("/episodes/{episode_id}")
def get_episode(episode_id: int) -> dict:
    with get_connection() as connection:
        episode = connection.execute(
            """
            SELECT
                e.id,
                e.media_item_id AS media_id,
                e.title,
                e.season_number,
                e.episode_number,
                m.title AS series_title,
                COALESCE(wp.current_time_seconds, 0) AS current_time_seconds,
                COALESCE(wp.duration_seconds, e.duration_seconds) AS progress_duration,
                COALESCE(wp.completed, 0) AS completed
            FROM episodes e
            JOIN media_items m ON m.id = e.media_item_id
            LEFT JOIN watch_progress wp
              ON wp.episode_id = e.id AND wp.user_id = ?
            WHERE e.id = ?
            """,
            (DEFAULT_USER_ID, episode_id),
        ).fetchone()
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")

        next_episode = connection.execute(
            """
            SELECT id
            FROM episodes
            WHERE media_item_id = ?
              AND (
                season_number > ?
                OR (season_number = ? AND episode_number > ?)
              )
            ORDER BY season_number, episode_number
            LIMIT 1
            """,
            (
                episode["media_id"],
                episode["season_number"],
                episode["season_number"],
                episode["episode_number"],
            ),
        ).fetchone()

    return {
        "id": episode["id"],
        "media_id": episode["media_id"],
        "series_title": episode["series_title"],
        "title": episode["title"],
        "season_number": episode["season_number"],
        "episode_number": episode["episode_number"],
        "video_url": f"/api/video/{episode['id']}",
        "thumbnail_url": f"/api/images/thumbnail/{episode['id']}",
        "progress": _progress_payload(episode),
        "next_episode_id": next_episode["id"] if next_episode else None,
    }


@router.get("/images/poster/{media_id}")
def get_poster(media_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT poster_path FROM media_items WHERE id = ?",
            (media_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Media item not found")

    path = resolve_media_ref(row["poster_path"])
    if not path or not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Poster not found")

    return FileResponse(path)


@router.get("/images/thumbnail/{episode_id}")
def get_thumbnail(episode_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT thumbnail_path FROM episodes WHERE id = ?",
            (episode_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Episode not found")

    path = resolve_media_ref(row["thumbnail_path"])
    if not path or not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(path)


@router.get("/images/movie-thumbnail/{movie_file_id}")
def get_movie_thumbnail(movie_file_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT thumbnail_path FROM movie_files WHERE id = ?",
            (movie_file_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Movie file not found")

    path = resolve_media_ref(row["thumbnail_path"])
    if not path or not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Movie thumbnail not found")

    return FileResponse(path)
