import tempfile
import unittest
from pathlib import Path

from backend.app.scanner import _load_metadata, _poster_ref


class MetadataTests(unittest.TestCase):
    def test_invalid_metadata_uses_folder_name_and_logs_the_file(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            metadata = folder / "metadata.json"
            for raw in (b"[", b"[]", b"null", b"42", b"\xff", b'{"poster":"a\\u0000b"}'):
                with self.subTest(raw=raw):
                    metadata.write_bytes(raw)
                    with self.assertLogs("uvicorn.error", level="WARNING") as captured:
                        result = _load_metadata(folder, "movies")
                    self.assertEqual(result["title"], folder.name)
                    self.assertEqual(result["category"], "movies")
                    self.assertIn(str(metadata), captured.output[0])

    def test_valid_utf8_metadata_with_bom_keeps_the_title(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            (folder / "metadata.json").write_text('{"title": "Città"}', encoding="utf-8-sig")
            self.assertEqual(_load_metadata(folder, "series")["title"], "Città")

    def test_unusable_poster_path_does_not_block_the_title(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(_poster_ref(Path(directory), {"poster": "p" * 4096}))
