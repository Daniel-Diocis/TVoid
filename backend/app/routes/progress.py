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


@router.post("/progress/{episode_id}")
def save_progress(episode_id: int, payload: ProgressPayload) -> dict:
    with get_connection() as connection:
        episode = connection.execute(
            "SELECT id FROM episodes WHERE id = ?",
            (episode_id,),
        ).fetchone()
        if not episode:
            raise HTTPException(status_code=404, detail="Episode not found")

        current_time = payload.current_time_seconds
        duration = payload.duration_seconds
        completed = 1 if _is_completed(current_time, duration) else 0
        progress_percent = _progress_percent(current_time, duration)
        now = utc_now()

        connection.execute(
            """
            INSERT INTO watch_progress (
                user_id, episode_id, current_time_seconds, duration_seconds, completed, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, episode_id) DO UPDATE SET
                current_time_seconds = excluded.current_time_seconds,
                duration_seconds = excluded.duration_seconds,
                completed = excluded.completed,
                updated_at = excluded.updated_at
            """,
            (DEFAULT_USER_ID, episode_id, current_time, duration, completed, now),
        )
        connection.commit()

    logger.info(
        "Saved progress: user_id=%s episode_id=%s current_time=%.2f duration=%s percent=%s completed=%s",
        DEFAULT_USER_ID,
        episode_id,
        current_time,
        f"{duration:.2f}" if duration is not None else "unknown",
        progress_percent,
        bool(completed),
    )

    return {
        "status": "ok",
        "episode_id": episode_id,
        "current_time_seconds": current_time,
        "duration_seconds": duration,
        "completed": bool(completed),
        "progress_percent": progress_percent,
    }


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
    with get_connection() as connection:
        movie_file = connection.execute(
            "SELECT id FROM movie_files WHERE id = ?",
            (movie_file_id,),
        ).fetchone()
        if not movie_file:
            raise HTTPException(status_code=404, detail="Movie file not found")

        current_time = payload.current_time_seconds
        duration = payload.duration_seconds
        completed = 1 if _is_completed(current_time, duration) else 0
        progress_percent = _progress_percent(current_time, duration)
        now = utc_now()

        connection.execute(
            """
            INSERT INTO movie_progress (
                user_id, movie_file_id, current_time_seconds, duration_seconds, completed, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, movie_file_id) DO UPDATE SET
                current_time_seconds = excluded.current_time_seconds,
                duration_seconds = excluded.duration_seconds,
                completed = excluded.completed,
                updated_at = excluded.updated_at
            """,
            (DEFAULT_USER_ID, movie_file_id, current_time, duration, completed, now),
        )
        connection.commit()

    logger.info(
        "Saved movie progress: user_id=%s movie_file_id=%s current_time=%.2f duration=%s percent=%s completed=%s",
        DEFAULT_USER_ID,
        movie_file_id,
        current_time,
        f"{duration:.2f}" if duration is not None else "unknown",
        progress_percent,
        bool(completed),
    )

    return {
        "status": "ok",
        "movie_file_id": movie_file_id,
        "current_time_seconds": current_time,
        "duration_seconds": duration,
        "completed": bool(completed),
        "progress_percent": progress_percent,
    }
