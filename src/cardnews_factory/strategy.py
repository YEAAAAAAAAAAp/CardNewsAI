from __future__ import annotations

import re
from collections import Counter

from .models import Brief, Caption, FactoryConfig, Slide


SLIDE_ROLES = [
    "Hook",
    "Setup",
    "Tension",
    "Insight",
    "Shift",
    "Proof",
    "Soft CTA",
    "Hard CTA",
]


def normalize_topic(topic: str) -> str:
    return re.sub(r"\s+", " ", topic).strip()


def infer_topic_from_source(source_text: str) -> str:
    clean = normalize_topic(source_text)
    first_line = next((line.strip() for line in source_text.splitlines() if line.strip()), "")
    if 6 <= len(first_line) <= 80:
        return first_line
    first_sentence = re.split(r"(?<=[.!?。！？다요])\s+", clean)[0].strip()
    if 10 <= len(first_sentence) <= 80:
        return first_sentence
    keywords = extract_keywords(clean, limit=4)
    if keywords:
        return " ".join(keywords) + " 카드뉴스"
    return clean[:60] or "새 카드뉴스"


def summarize_source(source_text: str, limit: int = 260) -> str:
    clean = normalize_topic(source_text)
    if not clean:
        return "사용자가 입력한 단일 주제를 기반으로 생성"
    return clean[:limit] + ("..." if len(clean) > limit else "")


def extract_keywords(text: str, limit: int = 8) -> list[str]:
    words = re.findall(r"[0-9A-Za-z가-힣]{2,}", text)
    stopwords = {
        "그리고",
        "하지만",
        "그래서",
        "있는",
        "없는",
        "합니다",
        "입니다",
        "카드뉴스",
        "콘텐츠",
    }
    counts = Counter(w for w in words if w not in stopwords)
    return [word for word, _ in counts.most_common(limit)]


def build_mock_brief(topic: str, source_text: str, config: FactoryConfig) -> Brief:
    summary = summarize_source(source_text)
    persona = (
        f"{config.target_audience}. 단순 조회수보다 저장, 공유, DM, 커뮤니티 전환을 원하는 동류 집단"
    )
    return Brief(
        topic=topic,
        source_summary=summary,
        target_persona=persona,
        reader_desire=f"{topic}을 막연히 이해하는 수준을 넘어, 바로 실행할 기준과 언어를 얻고 싶다.",
        reader_problem="정보는 많지만 내 상황에 맞게 어떻게 해석하고 행동해야 할지 모른다.",
        content_angle=f"{topic}은 더 많이 아는 문제가 아니라, 첫 판단 기준을 바꾸는 문제다.",
        core_message=f"{topic}의 핵심은 독자의 욕망, 문제의식, 되고 싶은 모습을 먼저 잡는 것이다.",
        cta_strategy="7번에서 저장을 유도하고, 8번에서 댓글 또는 DM으로 구체 행동을 요청한다.",
        funnel_stage="인지 -> 저장 -> 공유 -> 댓글/DM -> 뉴스레터/커뮤니티/상품 전환",
    )


def build_mock_slides(brief: Brief) -> list[Slide]:
    topic = brief.topic
    return [
        Slide(
            1,
            "Hook",
            f"{topic}, 지금 놓치면 늦습니다",
            "사람들은 좋은 정보를 기다리지 않습니다.\n첫 장에서 자기 이야기라고 느낄 때만 넘깁니다.",
            "큰 제목과 강한 대비. 3초 안에 읽히는 문장.",
            "그렇다면 첫 장에는 무엇이 들어가야 할까?",
            "공감형 후킹으로 넘김 유도",
            False,
        ),
        Slide(
            2,
            "Setup",
            "왜 지금 더 중요할까",
            "정보가 많아질수록 사람들은 더 빨리 거릅니다.\n이제 콘텐츠는 설명보다 선택받는 구조가 먼저입니다.",
            "정보 과잉과 선택받는 콘텐츠를 대비",
            "선택받지 못하는 콘텐츠의 공통점은?",
            "현재 문제를 선명하게 보여줘 공유 유도",
            False,
        ),
        Slide(
            3,
            "Tension",
            "대부분 여기서 막힙니다",
            "열심히 요약하고 예쁘게 디자인합니다.\n하지만 독자의 욕망을 건드리지 못하면 저장도 공유도 일어나지 않습니다.",
            "요약 중심 방식과 욕망 중심 방식을 비교",
            "그럼 무엇을 먼저 설계해야 할까?",
            "실패 원인을 콕 집어 저장 가치 형성",
            False,
        ),
        Slide(
            4,
            "Insight",
            "PDA로 먼저 잡으세요",
            "Persona: 누구에게 말하는가\nDesire: 무엇을 원하나\nAwareness: 문제를 얼마나 아는가",
            "PDA 3분할 구조",
            "이 세 가지가 정리되면 카피가 어떻게 달라질까?",
            "템플릿형 정보로 저장 유도",
            False,
        ),
        Slide(
            5,
            "Shift",
            "관점을 바꾸면 보입니다",
            "카드뉴스는 내용을 줄이는 작업이 아닙니다.\n독자가 되고 싶은 모습으로 초대하는 설계입니다.",
            "Before: 요약 / After: 초대",
            "이 관점이 실제 슬라이드에서 어떻게 작동할까?",
            "아하 모먼트로 공유 유도",
            False,
        ),
        Slide(
            6,
            "Proof",
            "저장되는 카드의 공통점",
            "체크리스트, 단계별 가이드, 결정 기준.\n이 셋 중 하나가 있으면 사람들은 나중에 다시 보려고 저장합니다.",
            "체크리스트 카드 UI",
            "바로 저장하게 만들려면 마지막 전에 무엇을 말해야 할까?",
            "체크리스트로 저장 트리거 제공",
            False,
        ),
        Slide(
            7,
            "Soft CTA",
            "이 기준만 저장하세요",
            "다음 카드뉴스를 만들 때\n1. 누구에게 말하나\n2. 무엇을 원하나\n3. 왜 지금 봐야 하나\n이 3가지만 먼저 적어보세요.",
            "저장용 미니 체크리스트",
            "이제 오늘 바로 할 행동은 하나입니다.",
            "명시적 저장 유도",
            True,
        ),
        Slide(
            8,
            "Hard CTA",
            "당신의 주제는 무엇인가요?",
            "댓글에 카드뉴스로 만들고 싶은 주제 1개를 남겨주세요.\n가장 막히는 지점을 기준으로 후킹 문장부터 잡아보겠습니다.",
            "댓글 입력창과 CTA 버튼 느낌",
            "대화가 DM 또는 다음 콘텐츠로 이어짐",
            "구체적인 댓글 CTA",
            True,
        ),
    ]


def build_mock_caption(brief: Brief, hashtag_count: int) -> Caption:
    keywords = extract_keywords(brief.topic, limit=4)
    tags = unique_hashtags(keywords + ["카드뉴스", "콘텐츠기획", "퍼스널브랜딩", "인스타그램마케팅", "AI자동화"])
    tags = tags[: max(5, min(12, hashtag_count))]
    first = f"{brief.topic}을 카드뉴스로 만들 때 가장 먼저 볼 것은 첫 장의 후킹입니다."
    return Caption(
        seo_first_sentence=first,
        body=(
            f"{brief.content_angle}\n\n"
            "좋은 카드뉴스는 정보를 줄인 결과물이 아니라, 독자가 넘기고 저장하고 공유하게 만드는 흐름입니다.\n"
            "오늘 만든 8장 구조를 다음 기획의 체크리스트로 써보세요."
        ),
        save_cta="저장해두고 다음 카드뉴스 기획 전에 다시 확인하세요.",
        share_cta="이 주제로 고민하는 동료나 친구에게 보내주세요.",
        comment_cta="댓글에 지금 만들고 싶은 카드뉴스 주제 1개를 남겨주세요.",
        hashtags=tags,
    )


def unique_hashtags(words: list[str]) -> list[str]:
    seen: set[str] = set()
    tags: list[str] = []
    for word in words:
        cleaned = re.sub(r"[^0-9A-Za-z가-힣]", "", word)
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        tags.append(f"#{cleaned[:20]}")
    return tags
