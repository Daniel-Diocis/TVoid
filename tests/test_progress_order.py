import sqlite3
import unittest
from contextlib import closing
from unittest.mock import patch

from backend.app import database
from backend.app.models import ProgressPayload
from backend.app.routes import progress


class ProgressOrderTests(unittest.TestCase):
    def setUp(self):
        self.db = self.enterContext(closing(sqlite3.connect(":memory:")))
        self.db.row_factory = sqlite3.Row
        self.enterContext(patch.object(database, "get_connection", return_value=self.db))
        self.enterContext(patch.object(progress, "get_connection", return_value=self.db))
        self.enterContext(patch.object(database, "ensure_runtime_directories"))
        database.init_db()
        self.db.executescript("""
            INSERT INTO media_items (id, category, title, folder_path, created_at, updated_at)
                VALUES (1, 'series', 'S', 'series/S', 'a', 'a'), (2, 'movies', 'M', 'movies/M', 'a', 'a');
            INSERT INTO seasons (id, media_item_id, season_number, folder_path, created_at, updated_at)
                VALUES (1, 1, 1, 'series/S/season1', 'a', 'a');
            INSERT INTO episodes (id, media_item_id, season_id, title, season_number, episode_number,
                                  file_path, created_at, updated_at) VALUES (1, 1, 1, 'E', 1, 1, 'E.mp4', 'a', 'a');
            INSERT INTO movie_files (id, media_item_id, title, file_path, created_at, updated_at)
                VALUES (1, 2, 'M', 'M.mp4', 'a', 'a');
        """)

    def test_reordered_duplicate_backward_and_cross_session_writes(self):
        for save, table in [(progress.save_progress, "watch_progress"), (progress.save_movie_progress, "movie_progress")]:
            with self.subTest(table=table):
                session = progress.start_playback_session()["playback_session"]
                newer = progress.start_playback_session()["playback_session"]

                def send(sequence, position, token=session):
                    return save(1, ProgressPayload(playback_session=token, save_sequence=sequence,
                                                   current_time_seconds=position, duration_seconds=1000))

                self.assertEqual(send(2, 750)["status"], "ok")
                timestamp = self.db.execute(f"SELECT updated_at FROM {table}").fetchone()[0]
                for seq in (1, 2):
                    rejected = send(seq, 720)
                    self.assertEqual((rejected["status"], rejected["current_time_seconds"]), ("ignored", 750))
                self.assertEqual(self.db.execute(f"SELECT updated_at FROM {table}").fetchone()[0], timestamp)
                self.assertTrue(send(3, 950)["completed"])
                rewind = send(4, 0)
                self.assertEqual((rewind["status"], rewind["current_time_seconds"], rewind["completed"]), ("ok", 0, False))
                self.assertEqual(send(1, 20, newer)["status"], "ok")
                self.assertEqual(send(5, 960)["current_time_seconds"], 20)

    def test_existing_database_and_unordered_client(self):
        # Simulate the original schema, with a saved position before the upgrade.
        for table in ("watch_progress", "movie_progress"):
            self.db.execute(f"ALTER TABLE {table} DROP COLUMN playback_session")
            self.db.execute(f"ALTER TABLE {table} DROP COLUMN save_sequence")
        self.db.execute("""INSERT INTO watch_progress
            (user_id, episode_id, current_time_seconds, duration_seconds, updated_at)
            VALUES (1, 1, 720, 1000, 'original')""")
        self.db.commit()
        database.init_db()
        database.init_db()
        self.assertEqual(progress.get_progress(1)["current_time_seconds"], 720)
        for save in (progress.save_progress, progress.save_movie_progress):
            result = save(1, ProgressPayload(current_time_seconds=750, duration_seconds=1000))
            self.assertEqual(result["status"], "ok")
