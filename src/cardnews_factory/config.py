from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import FactoryConfig


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = ROOT / "config.yaml"
LEGACY_CONFIG_PATH = ROOT / "config" / "brand.json"


def load_config(path: Path | None = None) -> FactoryConfig:
    config_path = path or DEFAULT_CONFIG_PATH
    if config_path.exists():
        data = read_config_dict(config_path)
    elif LEGACY_CONFIG_PATH.exists():
        legacy = json.loads(LEGACY_CONFIG_PATH.read_text(encoding="utf-8"))
        data = {
            "brand_name": legacy.get("brand_name"),
            "default_tone": legacy.get("tone"),
            "target_audience": legacy.get("persona"),
            "visual_style": "clean editorial Instagram cards",
            "primary_color": legacy.get("colors", {}).get("accent"),
            "secondary_color": legacy.get("colors", {}).get("ink"),
            "font_family": "Malgun Gothic",
            "slide_size": {"width": 1080, "height": 1080},
            "output_language": "ko",
            "default_cta_type": "save_comment",
            "hashtag_count": 8,
            "mock_mode": True,
        }
    else:
        data = {}
    return FactoryConfig.from_dict(data)


def read_config_dict(path: Path) -> dict[str, Any]:
    if path.suffix.lower() == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    try:
        import yaml  # type: ignore

        return yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except ModuleNotFoundError:
        return parse_simple_yaml(path.read_text(encoding="utf-8"))


def parse_simple_yaml(text: str) -> dict[str, Any]:
    data: dict[str, Any] = {}
    current_key: str | None = None
    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if not line.startswith(" ") and ":" in line:
            key, value = line.split(":", 1)
            key = key.strip()
            value = value.strip()
            if value == "":
                data[key] = {}
                current_key = key
            else:
                data[key] = parse_scalar(value)
                current_key = None
        elif current_key and ":" in line:
            key, value = line.strip().split(":", 1)
            nested = data.setdefault(current_key, {})
            if isinstance(nested, dict):
                nested[key.strip()] = parse_scalar(value.strip())
    return data


def parse_scalar(value: str) -> Any:
    cleaned = value.strip().strip('"').strip("'")
    if cleaned.lower() in {"true", "false"}:
        return cleaned.lower() == "true"
    try:
        return int(cleaned)
    except ValueError:
        return cleaned
