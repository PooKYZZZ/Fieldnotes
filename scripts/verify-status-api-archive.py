import argparse
from pathlib import Path, PurePosixPath
import subprocess
from stat import S_IFREG
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


root = Path(__file__).resolve().parents[1]
source = root / "public" / "labs" / "status-api"
archive = root / "public" / "labs" / "status-api.zip"
tracked = subprocess.run(
    ["git", "ls-files", "-z", "--", "public/labs/status-api/"],
    cwd=root,
    check=True,
    capture_output=True,
).stdout.decode().split("\0")
tracked = {
    f"status-api/{Path(name).relative_to('public/labs/status-api').as_posix()}"
    for name in tracked
    if name
}
if not tracked:
    raise SystemExit("FAIL no tracked Status API starter files found; stage intended new members first")

missing_source = sorted(
    name.removeprefix("status-api/") for name in tracked
    if not (source / name.removeprefix("status-api/")).is_file()
    or (source / name.removeprefix("status-api/")).is_symlink()
)
if missing_source:
    raise SystemExit(f"FAIL tracked Status API source files are missing or symlinks: {missing_source}")

expected = {
    name: (source / name.removeprefix("status-api/")).read_bytes()
    for name in sorted(tracked)
}

parser = argparse.ArgumentParser()
parser.add_argument("--write", action="store_true", help="Regenerate from tracked files with stable ZIP metadata")
args = parser.parse_args()

if args.write:
    with ZipFile(archive, "w", compression=ZIP_DEFLATED, compresslevel=9) as zipped:
        for name, contents in sorted(expected.items()):
            info = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (S_IFREG | 0o644) << 16
            zipped.writestr(info, contents, compress_type=ZIP_DEFLATED, compresslevel=9)

with ZipFile(archive) as zipped:
    entries = zipped.infolist()
    if any(info.is_dir() for info in entries):
        raise SystemExit("FAIL Status API archive has directory entries; canonical archive stores files only")
    names = [info.filename for info in entries]
    if len(names) != len(set(names)):
        raise SystemExit("FAIL Status API archive contains duplicate file names")
    if any(PurePosixPath(name).is_absolute() or ".." in PurePosixPath(name).parts for name in names):
        raise SystemExit("FAIL Status API archive contains an unsafe path")
    actual = {name: zipped.read(name) for name in names}

missing = sorted(expected.keys() - actual.keys())
extra = sorted(actual.keys() - expected.keys())
changed = sorted(name for name in expected.keys() & actual.keys() if expected[name] != actual[name])
if missing or extra or changed:
    raise SystemExit(f"FAIL Status API archive parity: missing={missing}, extra={extra}, changed={changed}")

print(f"PASS Status API archive matches all {len(expected)} source files byte for byte")
