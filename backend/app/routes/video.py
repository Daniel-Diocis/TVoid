import re
from pathlib import Path
from typing import Iterator

from fastapi import APIRouter, Header, HTTPException, Response
from fastapi.responses import FileResponse, StreamingResponse

from ..config import VIDEO_CHUNK_SIZE, resolve_media_ref
from ..database import get_connection

router = APIRouter(prefix="/api", tags=["video"])
RANGE_RE = re.compile(r"bytes=(?P<start>\d*)-(?P<end>\d*)")


def _iter_file(path: Path, start: int, end: int) -> Iterator[bytes]:
    with path.open("rb") as file:
        file.seek(start)
        remaining = end - start + 1
        while remaining > 0:
            chunk = file.read(min(VIDEO_CHUNK_SIZE, remaining))
            if not chunk:
                break
            remaining -= len(chunk)
            yield chunk


def _parse_range(range_header: str, file_size: int) -> tuple[int, int] | None:
    match = RANGE_RE.fullmatch(range_header.strip())
    if not match:
        return None

    start_text = match.group("start")
    end_text = match.group("end")

    if not start_text and not end_text:
        return None

    if start_text:
        start = int(start_text)
        end = int(end_text) if end_text else file_size - 1
    else:
        suffix_length = int(end_text)
        if suffix_length == 0:
            return None
        start = max(file_size - suffix_length, 0)
        end = file_size - 1

    if start >= file_size or end < start:
        return None

    return start, min(end, file_size - 1)


def _stream_file(path_ref: str | None, range_header: str | None):
    path = resolve_media_ref(path_ref)
    if not path or not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Video file not found")

    file_size = path.stat().st_size
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": "video/mp4",
    }

    if not range_header:
        return FileResponse(path, media_type="video/mp4", headers=headers)

    parsed = _parse_range(range_header, file_size)
    if not parsed:
        return Response(
            status_code=416,
            headers={
                "Content-Range": f"bytes */{file_size}",
                "Accept-Ranges": "bytes",
            },
        )

    start, end = parsed
    content_length = end - start + 1
    headers.update(
        {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Content-Length": str(content_length),
        }
    )

    return StreamingResponse(
        _iter_file(path, start, end),
        status_code=206,
        media_type="video/mp4",
        headers=headers,
    )


@router.get("/video/{episode_id}")
def stream_video(episode_id: int, range_header: str | None = Header(default=None, alias="Range")):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT file_path FROM episodes WHERE id = ?",
            (episode_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Episode not found")

    return _stream_file(row["file_path"], range_header)


@router.get("/movie-video/{movie_file_id}")
def stream_movie_video(movie_file_id: int, range_header: str | None = Header(default=None, alias="Range")):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT file_path FROM movie_files WHERE id = ?",
            (movie_file_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Movie file not found")

    return _stream_file(row["file_path"], range_header)
