from pathlib import Path
import os

APP_NAME = "TVoid"

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MEDIA_ROOT = Path(os.getenv("TVOID_MEDIA_ROOT", PROJECT_ROOT / "media")).resolve()
SERIES_ROOT = MEDIA_ROOT / "series"
MOVIES_ROOT = MEDIA_ROOT / "movies"
DATA_DIR = Path(os.getenv("TVOID_DATA_DIR", PROJECT_ROOT / "data")).resolve()
DB_PATH = Path(os.getenv("TVOID_DB_PATH", DATA_DIR / "tvoid.db")).resolve()
FRONTEND_ROOT = PROJECT_ROOT / "frontend"

VIDEO_CHUNK_SIZE = 1024 * 1024


def ensure_runtime_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SERIES_ROOT.mkdir(parents=True, exist_ok=True)
    MOVIES_ROOT.mkdir(parents=True, exist_ok=True)


def to_media_ref(path: Path) -> str:
    resolved = path.resolve()
    try:
        return resolved.relative_to(MEDIA_ROOT).as_posix()
    except ValueError:
        return resolved.as_posix()


def resolve_media_ref(value: str | None) -> Path | None:
    if not value:
        return None

    path = Path(value)
    if path.is_absolute():
        return path

    return (MEDIA_ROOT / path).resolve()
