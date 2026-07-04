from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import APP_NAME, FRONTEND_ROOT, ensure_runtime_directories
from .database import init_db
from .routes import media, progress, scan, video

app = FastAPI(title=APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    ensure_runtime_directories()
    init_db()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "app": APP_NAME}


app.include_router(scan.router)
app.include_router(media.router)
app.include_router(progress.router)
app.include_router(video.router)

if FRONTEND_ROOT.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_ROOT, html=True), name="frontend")
