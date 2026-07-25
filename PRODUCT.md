# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

TVoid is primarily for a personal media owner who wants to watch their own local movies and series through a browser. Household use may be added later through separate profiles, but TVoid is not intended for a broad self-hosting audience.

## Product Purpose

TVoid turns a filesystem library of owned video files into a polished personal streaming experience. It exists to make local media easy to browse, play, and resume without cloud accounts or uploads. Success means the product feels coherent and effortless to watch while the system remains understandable and maintainable.

## Positioning

TVoid combines local-first simplicity with the continuity and presentation of a personal streaming platform. Its focus is a small, legible product for one person's library rather than the administration and extensibility of a general-purpose media server.

## Operating Context

- The user organizes media in local `media/series` and `media/movies` directories.
- Series use season folders and episode filenames such as `S01E01 - Titolo episodio.mp4`; movies use one primary MP4 in each movie folder.
- Optional `metadata.json`, poster, and thumbnail files enrich the library. Missing assets fall back gracefully, and FFmpeg can generate thumbnails during scanning.
- The product runs in a web browser, typically from Docker Compose at `http://localhost:8080` or directly through FastAPI at `http://127.0.0.1:8000`.

## Capabilities and Constraints

- The focused MVP supports series and movies, filesystem scanning, seasons and episodes, HTML5 playback, progress persistence, automatic resume, and a “Continua a guardare” section.
- Playback is MP4-first; H.264 video with AAC audio is the recommended compatibility target.
- Progress is stored locally in SQLite for a single fixed user profile. An item is considered completed at 90% watched and leaves the continue-watching list.
- The app must remain usable with an empty or partially malformed library and when metadata, artwork, thumbnails, FFmpeg, or previously indexed video files are missing.
- The current implementation is a plain multi-page web frontend served with a FastAPI backend, optionally behind Nginx through Docker Compose.
- Household profiles, subtitles, and additional media categories are deliberate future extension points. Their workflows and priority are undecided.
- Future growth must remain gradual and must not turn TVoid into a general-purpose media server.

## Brand Commitments

- The product name is TVoid.
- The current product language is Italian.
- The experience should feel like a polished personal streaming platform while remaining direct, understandable, and maintainable.

## Evidence on Hand

- [`README.md`](README.md) documents the supported library structure, metadata format, runtime, conversion workflow, API, and resilience behavior.
- [`frontend/`](frontend/) contains the existing home, library-detail, and player surfaces with Italian product copy.
- [`backend/app/`](backend/app/) contains the scanner, media API, byte-range video streaming, progress persistence, and image delivery implementation.
- [`tools/convert/convert_to_mp4.py`](tools/convert/convert_to_mp4.py) provides a local MKV-to-MP4 conversion workflow.
- No testimonials, customer claims, usage benchmarks, press, pricing, or commercial proof are present and future work must not fabricate them.

## Product Principles

1. Make local media feel effortless: browsing, playback, and resume should behave like one coherent viewing experience.
2. Keep ownership local: the user's files and viewing state remain under their control without cloud accounts or uploads.
3. Prefer a focused product over server administration: protect the personal-viewing job from general-purpose complexity.
4. Grow in legible steps: add profiles, subtitles, and categories without compromising the small, maintainable foundation.
5. Fail gracefully: incomplete libraries and missing optional tooling should degrade the experience, not break it.
