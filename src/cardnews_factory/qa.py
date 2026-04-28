from __future__ import annotations

from .models import Caption, ReviewItem, Slide


def run_review(slides: list[Slide], caption: Caption) -> list[ReviewItem]:
    return [
        ReviewItem("1번 슬라이드 후킹", _has_strong_hook(slides), "문제, 욕망, 대담한 주장 중 하나로 시작하는지 확인"),
        ReviewItem("한 슬라이드 한 포인트", all(_one_point(slide) for slide in slides), "본문이 과도하게 길거나 복합 메시지인지 확인"),
        ReviewItem("열린 고리", all(bool(slide.open_loop.strip()) for slide in slides), "각 장이 다음 장을 보게 만드는지 확인"),
        ReviewItem("저장 트리거", any("저장" in slide.save_or_share_trigger or "체크리스트" in slide.body for slide in slides), "체크리스트, 템플릿, 기준 포함 여부"),
        ReviewItem("공유 트리거", any("공유" in slide.save_or_share_trigger or "공감" in slide.save_or_share_trigger for slide in slides), "누군가에게 보내고 싶은 공감 포인트"),
        ReviewItem("CTA 2개", sum(1 for slide in slides if slide.has_cta) >= 2, "Soft CTA와 Hard CTA가 모두 있는지 확인"),
        ReviewItem("캡션 SEO", len(caption.seo_first_sentence) > 10, "첫 문장에 핵심 키워드가 있는지 확인"),
        ReviewItem("해시태그", 5 <= len(caption.hashtags) <= 12, "해시태그 5~12개 권장"),
    ]


def _has_strong_hook(slides: list[Slide]) -> bool:
    if not slides:
        return False
    hook = slides[0]
    text = hook.headline + " " + hook.body
    cues = ["왜", "지금", "놓치", "문제", "늦", "갈립니다", "3초", "중요"]
    return hook.role == "Hook" and any(cue in text for cue in cues)


def _one_point(slide: Slide) -> bool:
    return len(slide.body) <= 180 and len(slide.body.splitlines()) <= 5
