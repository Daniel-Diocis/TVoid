import sqlite3
import unittest
from contextlib import closing
from unittest.mock import patch

from backend.app import database
from backend.app.routes import media


class RecentlyAddedTests(unittest.TestCase):
    def setUp(self):
        self.db = self.enterContext(closing(sqlite3.connect(":memory:")))
        self.db.row_factory = sqlite3.Row
        self.enterContext(patch.object(media, "get_connection", return_value=self.db))
        with patch.object(database, "get_connection", return_value=self.db), patch.object(database, "ensure_runtime_directories"):
            database.init_db()

    def add(self, category, title, created, updated):
        self.db.execute(
            """INSERT INTO media_items
               (category, title, folder_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)""",
            (category, title, f"{category}/{title}", created, updated),
        )

    def test_empty_and_movies_only(self):
        self.assertEqual(media.get_home()["recently_added"], [])
        self.add("movies", "Un film", "2026-01-01", "2026-01-01")
        recent, = media.get_home()["recently_added"]
        self.assertEqual((recent["title"], recent["category"]), ("Un film", "movies"))

    def test_mixed_list_uses_first_index_date_and_one_limit(self):
        for day in range(1, 14):
            category = "movies" if day % 2 else "series"
            self.add(category, str(day), f"2026-01-{day:02d}", "2026-01-30")
        self.add("series", "Stessa data", "2026-01-13", "2026-01-13")
        self.add("movies", "Più vecchio", "2025-01-01", "2026-02-01")

        recent = media.get_home()["recently_added"]
        self.assertEqual([item["title"] for item in recent],
                         ["Stessa data", *map(str, range(13, 2, -1))])
        self.assertEqual([item["category"] for item in recent[:3]], ["series", "movies", "series"])
