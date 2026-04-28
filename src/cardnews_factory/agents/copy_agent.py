from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from ..models import Brief, Caption, FactoryConfig, Slide
from ..strategy import build_mock_brief, build_mock_caption, build_mock_slides


class CopyAgent:
    def __init__(self, config: FactoryConfig, prompts_dir: Path = Path("prompts")) -> None:
        self.config = config
        self.prompts_dir = prompts_dir

    def generate(self, topic: str, source_text: str = "") -> tuple[Brief, list[Slide], Caption, list[str]]:
        warnings: list[str] = []
        if self.config.mock_mode:
            warnings.append("mock_mode=true: API 호출 없이 로컬 샘플 생성기를 사용했습니다.")
            return self._mock(topic, source_text, warnings)
        if os.getenv("OPENAI_API_KEY"):
            try:
                return self._openai(topic, source_text)
            except Exception as exc:  # pragma: no cover - depends on external API
                warnings.append(f"OpenAI 호출 실패, mock mode로 대체: {exc}")
                return self._mock(topic, source_text, warnings)
        if os.getenv("ANTHROPIC_API_KEY"):
            warnings.append("Anthropic API 키가 감지됐지만 v1은 구조만 열어두었습니다. mock mode로 생성합니다.")
            return self._mock(topic, source_text, warnings)
        warnings.append("API 키가 없어 mock mode로 생성했습니다.")
        return self._mock(topic, source_text, warnings)

    def _mock(self, topic: str, source_text: str, warnings: list[str]) -> tuple[Brief, list[Slide], Caption, list[str]]:
        brief = build_mock_brief(topic, source_text, self.config)
        slides = build_mock_slides(brief)
        caption = build_mock_caption(brief, self.config.hashtag_count)
        return brief, slides, caption, warnings

    def _openai(self, topic: str, source_text: str) -> tuple[Brief, list[Slide], Caption, list[str]]:
        from openai import OpenAI  # type: ignore

        client = OpenAI()
        prompt = self._load_prompt("brief_prompt.md") + "\n\n" + self._load_prompt("slides_prompt.md") + "\n\n" + self._load_prompt("caption_prompt.md")
        user_input = {
            "topic": topic,
            "source_text": source_text,
            "config": self.config.__dict__,
            "required_json_schema": {
                "brief": "topic, source_summary, target_persona, reader_desire, reader_problem, content_angle, core_message, cta_strategy, funnel_stage",
                "slides": "8 items: slide_number, role, headline, body, visual_direction, open_loop, save_or_share_trigger, has_cta, approved",
                "caption": "seo_first_sentence, body, save_cta, share_cta, comment_cta, hashtags",
            },
        }
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(user_input, ensure_ascii=False)},
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        data: dict[str, Any] = json.loads(content)
        brief = Brief(**data["brief"])
        slides = [Slide(**item) for item in data["slides"]]
        caption = Caption(**data["caption"])
        return brief, slides, caption, ["OpenAI API로 생성했습니다."]

    def _load_prompt(self, name: str) -> str:
        path = self.prompts_dir / name
        if path.exists():
            return path.read_text(encoding="utf-8")
        return ""
