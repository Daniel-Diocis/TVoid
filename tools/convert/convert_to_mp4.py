#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_INPUT_DIR = BASE_DIR / "mkv"
DEFAULT_OUTPUT_DIR = BASE_DIR / "mp4"

MODES = ("auto", "remux", "audio-aac", "full")


@dataclass(frozen=True)
class Strategy:
    name: str
    args: tuple[str, ...]


STRATEGIES = {
    "remux": Strategy("remux", ("-c", "copy")),
    "audio-aac": Strategy("audio-aac", ("-c:v", "copy", "-c:a", "aac", "-b:a", "160k")),
    "full": Strategy(
        "full",
        ("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "160k"),
    ),
}


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(Path.cwd()))
    except ValueError:
        return str(path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert MKV files from tools/convert/mkv to MP4 files in tools/convert/mp4.",
    )
    parser.add_argument(
        "--mode",
        choices=MODES,
        default="auto",
        help="Conversion mode. Default: auto.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite MP4 files that already exist.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be converted without running FFmpeg.",
    )
    return parser.parse_args()


def selected_strategies(mode: str) -> list[Strategy]:
    if mode == "auto":
        return [STRATEGIES["remux"], STRATEGIES["audio-aac"], STRATEGIES["full"]]
    return [STRATEGIES[mode]]


def ffmpeg_command(input_path: Path, output_path: Path, strategy: Strategy) -> list[str]:
    return [
        "ffmpeg",
        "-y",
        "-i",
        str(input_path),
        *strategy.args,
        str(output_path),
    ]


def remove_partial(path: Path) -> None:
    try:
        if path.exists():
            path.unlink()
    except OSError as error:
        print(f"Warning: could not remove partial output {display_path(path)}: {error}")


def run_strategy(input_path: Path, temp_output_path: Path, strategy: Strategy) -> tuple[bool, str]:
    result = subprocess.run(
        ffmpeg_command(input_path, temp_output_path, strategy),
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode == 0 and temp_output_path.exists() and temp_output_path.stat().st_size > 0:
        return True, ""

    remove_partial(temp_output_path)
    message = (result.stderr or result.stdout or "").strip()
    if message:
        return False, message.splitlines()[-1]
    return False, f"ffmpeg exited with code {result.returncode}"


def convert_file(input_path: Path, output_path: Path, strategies: list[Strategy], mode: str) -> bool:
    temp_output_path = output_path.with_name(f".{output_path.stem}.tmp.mp4")
    remove_partial(temp_output_path)

    last_error = ""
    for index, strategy in enumerate(strategies):
        if mode == "auto" and index > 0:
            print(f"{strategies[index - 1].name} failed, trying {strategy.name}...")
        else:
            print(f"Trying {strategy.name}...")

        ok, error = run_strategy(input_path, temp_output_path, strategy)
        if ok:
            temp_output_path.replace(output_path)
            print(f"OK: {display_path(output_path)}")
            return True

        last_error = error

    print(f"Failed: {input_path.name}")
    if last_error:
        print(f"Reason: {last_error}")
    return False


def main() -> int:
    args = parse_args()

    input_dir = DEFAULT_INPUT_DIR
    output_dir = DEFAULT_OUTPUT_DIR
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("TVoid MKV -> MP4 converter")
    print(f"Input folder: {display_path(input_dir)}")
    print(f"Output folder: {display_path(output_dir)}")
    print(f"Mode: {args.mode}")
    print(f"Overwrite: {'yes' if args.overwrite else 'no'}")
    if args.dry_run:
        print("Dry run: yes")
    print()

    mkv_files = sorted(input_dir.glob("*.mkv"), key=lambda path: path.name.lower())
    print(f"Found {len(mkv_files)} MKV file(s).")
    print()

    if not mkv_files:
        print("No MKV files to convert.")
        print()
        print("Summary:")
        print("Found: 0")
        print("Converted: 0")
        print("Skipped: 0")
        print("Failed: 0")
        return 0

    if not args.dry_run and not shutil.which("ffmpeg"):
        print("Error: FFmpeg is not installed or is not available in PATH.")
        print("Install FFmpeg and run this command again.")
        return 1

    converted = 0
    skipped = 0
    failed = 0
    strategies = selected_strategies(args.mode)

    for index, input_path in enumerate(mkv_files, start=1):
        output_path = output_dir / f"{input_path.stem}.mp4"

        if output_path.exists() and not args.overwrite:
            print(f"[{index}/{len(mkv_files)}] Skipped, already exists: {output_path.name}")
            skipped += 1
            print()
            continue

        print(f"[{index}/{len(mkv_files)}] Converting: {input_path.name}")
        if args.dry_run:
            action = "Would overwrite" if output_path.exists() else "Would create"
            print(f"{action}: {display_path(output_path)}")
            skipped += 1
            print()
            continue

        if convert_file(input_path, output_path, strategies, args.mode):
            converted += 1
        else:
            failed += 1
        print()

    print("Summary:")
    print(f"Found: {len(mkv_files)}")
    print(f"Converted: {converted}")
    print(f"Skipped: {skipped}")
    print(f"Failed: {failed}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
