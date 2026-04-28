from __future__ import annotations

import csv
import json
import re
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Iterable

from .agents.copy_agent import CopyAgent
from .config import load_config
from .env import load_dotenv
from .html import write_html_preview
from .models import CardnewsProject, FactoryConfig
from .qa import run_review
from .renderer import render_pngs
from .strategy import infer_topic_from_source, normalize_topic
from .writer import write_project_files


def create_cardnews(
    topic: str | None = None,
    source_text: str = "",
    config_path: Path | None = None,
    output_root: Path = Path("output"),
    render_png: bool = True,
) -> CardnewsProject:
    load_dotenv()
    config = load_config(config_path)
    clean_topic = normalize_topic(topic or infer_topic_from_source(source_text))
    if not clean_topic:
        raise ValueError("topic 또는 source_text가 필요합니다.")

    agent = CopyAgent(config)
    brief, slides, caption, warnings = agent.generate(clean_topic, source_text)
    review_items = run_review(slides, caption)
    output_dir = make_output_dir(clean_topic, output_root)
    project = CardnewsProject(
        topic=clean_topic,
        brief=brief,
        slides=slides,
        caption=caption,
        review_items=review_items,
        output_dir=output_dir,
        config=config,
        source_text=source_text,
        warnings=warnings,
    )
    html_path = write_html_preview(project)
    if render_png:
        render_pngs(project, html_path)
    write_project_files(project)
    return project


def create_from_input_file(
    input_path: Path,
    config_path: Path | None = None,
    output_root: Path = Path("output"),
    render_png: bool = True,
) -> CardnewsProject:
    if not input_path.exists():
        raise FileNotFoundError(f"입력 파일을 찾을 수 없습니다: {input_path}")
    source_text = input_path.read_text(encoding="utf-8")
    return create_cardnews(source_text=source_text, config_path=config_path, output_root=output_root, render_png=render_png)


def create_from_batch(
    batch_path: Path,
    config_path: Path | None = None,
    output_root: Path = Path("output"),
    render_png: bool = True,
) -> list[CardnewsProject]:
    projects: list[CardnewsProject] = []
    for item in read_batch_items(batch_path):
        projects.append(
            create_cardnews(
                topic=item.get("topic"),
                source_text=item.get("source_text", ""),
                config_path=config_path,
                output_root=output_root,
                render_png=render_png,
            )
        )
    return projects


def read_batch_items(path: Path) -> Iterable[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"배치 파일을 찾을 수 없습니다: {path}")
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for item in data:
                if isinstance(item, str):
                    yield {"topic": item}
                elif isinstance(item, dict):
                    yield {str(k): str(v) for k, v in item.items()}
        else:
            raise ValueError("JSON 배치 파일은 배열이어야 합니다.")
        return
    if path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                yield {str(k): str(v) for k, v in row.items() if k and v}
        return
    raise ValueError("배치 입력은 .csv 또는 .json만 지원합니다.")


def make_output_dir(topic: str, output_root: Path) -> Path:
    slug = re.sub(r"[^0-9A-Za-z가-힣]+", "-", topic).strip("-")[:44] or "cardnews"
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return output_root / f"{stamp}_{slug}"


def project_summary(project: CardnewsProject) -> dict[str, object]:
    return {
        "topic": project.topic,
        "output_dir": str(project.output_dir),
        "slides": len(project.slides),
        "review_passed": sum(1 for item in project.review_items if item.passed),
        "review_total": len(project.review_items),
        "warnings": project.warnings,
    }
