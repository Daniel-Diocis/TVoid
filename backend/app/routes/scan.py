import logging
from threading import Lock

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..database import get_connection
from ..scanner import scan_series_library

router = APIRouter(prefix="/api", tags=["scan"])
logger = logging.getLogger("uvicorn.error")
_lock = Lock()
_state = "idle"


def _has_index() -> bool:
    with get_connection() as connection:
        # Existing libraries predate the marker for a successful empty scan.
        return bool(connection.execute(
            "SELECT EXISTS (SELECT 1 FROM library_index) OR EXISTS (SELECT 1 FROM media_items)"
        ).fetchone()[0])


def _run_scan(cleanup: bool = False) -> dict:
    global _state
    try:
        result = scan_series_library(cleanup=cleanup)
    except Exception:
        with _lock:
            _state = "failed"
        raise
    with _lock:
        _state = "idle"
    return result


def _background_scan() -> None:
    try:
        _run_scan()
    except Exception:
        logger.exception("Library scan failed")


@router.get("/scan/status")
def scan_status() -> dict:
    with _lock:
        return {"state": _state, "indexed": _has_index()}


@router.post("/scan/start")
def start_scan(background_tasks: BackgroundTasks, initial: bool = False) -> dict:
    global _state
    with _lock:
        if _state == "running" or (initial and _has_index()):
            return {"state": _state}
        _state = "running"
        background_tasks.add_task(_background_scan)
        return {"state": _state}


@router.post("/scan")
def scan_library(cleanup: bool = False) -> dict:
    global _state
    with _lock:
        if _state == "running":
            raise HTTPException(status_code=409, detail="Scansione già in corso")
        _state = "running"
    return _run_scan(cleanup)
