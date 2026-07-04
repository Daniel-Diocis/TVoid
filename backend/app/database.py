import sqlite3
from datetime import datetime, timezone

from .config import DB_PATH, ensure_runtime_directories


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_connection() -> sqlite3.Connection:
    ensure_runtime_directories()
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    ensure_runtime_directories()

    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS media_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                year INTEGER,
                folder_path TEXT NOT NULL UNIQUE,
                poster_path TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS seasons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                media_item_id INTEGER NOT NULL,
                season_number INTEGER NOT NULL,
                folder_path TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(media_item_id, season_number),
                FOREIGN KEY(media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS episodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                media_item_id INTEGER NOT NULL,
                season_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                season_number INTEGER NOT NULL,
                episode_number INTEGER NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                thumbnail_path TEXT,
                duration_seconds REAL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(media_item_id, season_number, episode_number),
                FOREIGN KEY(media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
                FOREIGN KEY(season_id) REFERENCES seasons(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS watch_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                episode_id INTEGER NOT NULL,
                current_time_seconds REAL NOT NULL DEFAULT 0,
                duration_seconds REAL,
                completed INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, episode_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(episode_id) REFERENCES episodes(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS movie_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                media_item_id INTEGER NOT NULL UNIQUE,
                title TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                thumbnail_path TEXT,
                duration_seconds REAL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS movie_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                movie_file_id INTEGER NOT NULL,
                current_time_seconds REAL NOT NULL DEFAULT 0,
                duration_seconds REAL,
                completed INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, movie_file_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(movie_file_id) REFERENCES movie_files(id) ON DELETE CASCADE
            );
            """
        )

        connection.execute(
            """
            INSERT OR IGNORE INTO users (id, username, created_at)
            VALUES (1, 'default', ?)
            """,
            (utc_now(),),
        )
        connection.commit()
