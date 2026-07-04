from fastapi import APIRouter

from ..scanner import scan_series_library

router = APIRouter(prefix="/api", tags=["scan"])


@router.post("/scan")
def scan_library(cleanup: bool = False) -> dict:
    return scan_series_library(cleanup=cleanup)
