import logging

from fastapi import APIRouter, HTTPException

from ..database import get_connection, utc_now
from ..models import ProgressPayload

DEFAULT_USER_ID = 1
COMPLETION_THRESHOLD = 0.9
logger = logging.getLogger("uvicorn.error")
router = APIRouter(prefix="/api", tags=["progress"])


def _progress_percent(current_time: float, duration: float | None) -> int:
    if not duration or duration <= 0:
        return 0
    return min(100, max(0, round((current_time / duration) * 100)))


def _is_completed(current_time: float, duration: float | None) -> bool:
    return bool(duration and duration > 0 and current_time / duration >= COMPLETION_THRESHOLD)


@router.get("/progress/{episode_id}")
def get_progress(episode_id: int) -> dict:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT current_time_seconds, duration_seconds, completed
            FROM watch_progress
            WHERE user_id = ? AND episode_id = ?
            """,
            (DEFAULT_USER_ID, episode_id),
        ).fetchone()

    if not row:
        return {
            "episode_id": episode_id,
            "current_time_seconds": 0,
            "duration_seconds": None,
            "completed": False,
            "progress_percent": 0,
        }

    current_time = float(row["current_time_seconds"] or 0)
    duration = row["duration_seconds"]
    return {
        "episode_id": episode_id,
        "current_time_seconds": current_time,
        "duration_seconds": duration,
        "completed": bool(row["completed"]),
        "progress_percent": _progress_percent(current_time, duration),
    }


def _next_session(connection) -> int:
    connection.execute("UPDATE playback_counter SET last_session = last_session + 1 WHERE id = 1")
    return connection.execute("SELECT last_session FROM playback_counter WHERE id = 1").fetchone()[0]


@router.post("/playback-session")
def start_playback_session() -> dict:
    with get_connection() as connection:
        return {"playback_session": _next_session(connection)}


def _save_progress(target_id: int, payload: ProgressPayload, *, movie: bool) -> dict:
    if (payload.playback_session is None) != (payload.save_sequence is None):
        raise HTTPException(status_code=422, detail="playback_session and save_sequence must be supplied together")
    if movie:
        table, column, media_table, label = "movie_progress", "movie_file_id", "movie_files", "Movie file"
    else:
        table, column, media_table, label = "watch_progress", "episode_id", "episodes", "Episode"

    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        if not connection.execute(f"SELECT 1 FROM {media_table} WHERE id = ?", (target_id,)).fetchone():
            raise HTTPException(status_code=404, detail=f"{label} not found")

        session = payload.playback_session
        if session is None:
            # Older API clients provide no ordering information. Treat receipt as a new write.
            session = _next_session(connection)
        elif session > connection.execute("SELECT last_session FROM playback_counter WHERE id = 1").fetchone()[0]:
            raise HTTPException(status_code=422, detail="Unknown playback session")

        write = connection.execute(
            f"""
            INSERT INTO {table} (
                user_id, {column}, current_time_seconds, duration_seconds, completed, updated_at,
                playback_session, save_sequence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, {column}) DO UPDATE SET
                current_time_seconds = excluded.current_time_seconds,
                duration_seconds = excluded.duration_seconds,
                completed = excluded.completed,
                updated_at = excluded.updated_at,
                playback_session = excluded.playback_session,
                save_sequence = excluded.save_sequence
            WHERE (excluded.playback_session, excluded.save_sequence) > ({table}.playback_session, {table}.save_sequence)
            """,
            (DEFAULT_USER_ID, target_id, payload.current_time_seconds, payload.duration_seconds,
             _is_completed(payload.current_time_seconds, payload.duration_seconds), utc_now(),
             session, payload.save_sequence or 0),
        )
        saved = connection.execute(
            f"SELECT current_time_seconds, duration_seconds, completed FROM {table} WHERE user_id = ? AND {column} = ?",
            (DEFAULT_USER_ID, target_id),
        ).fetchone()

    status = "ok" if write.rowcount else "ignored"
    logger.info("Progress %s: %s=%s position=%.2f", status, column, target_id, saved["current_time_seconds"])
    return {
        "status": status,
        column: target_id,
        "current_time_seconds": saved["current_time_seconds"],
        "duration_seconds": saved["duration_seconds"],
        "completed": bool(saved["completed"]),
        "progress_percent": _progress_percent(saved["current_time_seconds"], saved["duration_seconds"]),
    }


@router.post("/progress/{episode_id}")
def save_progress(episode_id: int, payload: ProgressPayload) -> dict:
    return _save_progress(episode_id, payload, movie=False)


@router.get("/movie-progress/{movie_file_id}")
def get_movie_progress(movie_file_id: int) -> dict:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT current_time_seconds, duration_seconds, completed
            FROM movie_progress
            WHERE user_id = ? AND movie_file_id = ?
            """,
            (DEFAULT_USER_ID, movie_file_id),
        ).fetchone()

    if not row:
        return {
            "movie_file_id": movie_file_id,
            "current_time_seconds": 0,
            "duration_seconds": None,
            "completed": False,
            "progress_percent": 0,
        }

    current_time = float(row["current_time_seconds"] or 0)
    duration = row["duration_seconds"]
    return {
        "movie_file_id": movie_file_id,
        "current_time_seconds": current_time,
        "duration_seconds": duration,
        "completed": bool(row["completed"]),
        "progress_percent": _progress_percent(current_time, duration),
    }


@router.post("/movie-progress/{movie_file_id}")
def save_movie_progress(movie_file_id: int, payload: ProgressPayload) -> dict:
    return _save_progress(movie_file_id, payload, movie=True)
