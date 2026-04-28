from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class FactoryConfig:
    brand_name: str
    default_tone: str
    target_audience: str
    visual_style: str
    primary_color: str
    secondary_color: str
    font_family: str
    slide_size: dict[str, int]
    output_language: str
    default_cta_type: str
    hashtag_count: int
    mock_mode: bool

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FactoryConfig":
        return cls(
            brand_name=str(data.get("brand_name", "Cardnews AI Factory")),
            default_tone=str(data.get("default_tone", "clear, practical, human Korean")),
            target_audience=str(data.get("target_audience", "solo creators and knowledge workers")),
            visual_style=str(data.get("visual_style", "clean editorial Instagram cards")),
            primary_color=str(data.get("primary_color", "#F25F4C")),
            secondary_color=str(data.get("secondary_color", "#1F2933")),
            font_family=str(data.get("font_family", "Malgun Gothic")),
            slide_size={
                "width": int(data.get("slide_size", {}).get("width", 1080)),
                "height": int(data.get("slide_size", {}).get("height", 1080)),
            },
            output_language=str(data.get("output_language", "ko")),
            default_cta_type=str(data.get("default_cta_type", "save_comment")),
            hashtag_count=int(data.get("hashtag_count", 8)),
            mock_mode=_as_bool(data.get("mock_mode", True)),
        )


@dataclass(frozen=True)
class Brief:
    topic: str
    source_summary: str
    target_persona: str
    reader_desire: str
    reader_problem: str
    content_angle: str
    core_message: str
    cta_strategy: str
    funnel_stage: str


@dataclass(frozen=True)
class Slide:
    slide_number: int
    role: str
    headline: str
    body: str
    visual_direction: str
    open_loop: str
    save_or_share_trigger: str
    has_cta: bool
    approved: bool = False


@dataclass(frozen=True)
class Caption:
    seo_first_sentence: str
    body: str
    save_cta: str
    share_cta: str
    comment_cta: str
    hashtags: list[str]


@dataclass(frozen=True)
class ReviewItem:
    name: str
    passed: bool
    note: str


@dataclass(frozen=True)
class CardnewsProject:
    topic: str
    brief: Brief
    slides: list[Slide]
    caption: Caption
    review_items: list[ReviewItem]
    output_dir: Path
    config: FactoryConfig
    source_text: str = ""
    warnings: list[str] = field(default_factory=list)


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}
