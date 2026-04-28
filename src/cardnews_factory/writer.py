from __future__ import annotations

import json
from dataclasses import asdict

from .models import CardnewsProject


def write_project_files(project: CardnewsProject) -> None:
    project.output_dir.mkdir(parents=True, exist_ok=True)
    write_json(project)
    write_markdown(project)


def write_json(project: CardnewsProject) -> None:
    (project.output_dir / "brief.json").write_text(
        json.dumps(asdict(project.brief), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (project.output_dir / "slides.json").write_text(
        json.dumps([asdict(slide) for slide in project.slides], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def write_markdown(project: CardnewsProject) -> None:
    slides_md = [f"# {project.topic}", ""]
    for slide in project.slides:
        slides_md.extend(
            [
                f"## Slide {slide.slide_number}: {slide.role}",
                f"### {slide.headline}",
                slide.body,
                "",
                f"- Visual: {slide.visual_direction}",
                f"- Open loop: {slide.open_loop}",
                f"- Save/share trigger: {slide.save_or_share_trigger}",
                f"- CTA: {'yes' if slide.has_cta else 'no'}",
                f"- Approved: {str(slide.approved).lower()}",
                "",
            ]
        )
    (project.output_dir / "slides.md").write_text("\n".join(slides_md), encoding="utf-8")

    caption = project.caption
    caption_md = [
        "# Instagram Caption",
        "",
        caption.seo_first_sentence,
        "",
        caption.body,
        "",
        caption.save_cta,
        caption.share_cta,
        caption.comment_cta,
        "",
        " ".join(caption.hashtags),
        "",
    ]
    (project.output_dir / "caption.md").write_text("\n".join(caption_md), encoding="utf-8")

    checklist = ["# Review Checklist", ""]
    for item in project.review_items:
        mark = "x" if item.passed else " "
        checklist.append(f"- [{mark}] {item.name}: {item.note}")
    if project.warnings:
        checklist.extend(["", "## Warnings", ""])
        checklist.extend(f"- {warning}" for warning in project.warnings)
    (project.output_dir / "review_checklist.md").write_text("\n".join(checklist), encoding="utf-8")
