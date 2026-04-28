from __future__ import annotations

from pathlib import Path


def load_dotenv(path: Path = Path(".env")) -> None:
    try:
        from dotenv import load_dotenv as real_load_dotenv  # type: ignore

        real_load_dotenv(path)
        return
    except ModuleNotFoundError:
        pass

    if not path.exists():
        return
    import os

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
