# 카드뉴스 자동화 공장

하나의 주제 또는 원문 자료를 입력하면 인스타그램 카드뉴스용 콘텐츠를 자동으로 기획하고, 8장짜리 카드뉴스 카피와 검토용 파일, HTML 미리보기, PNG 이미지를 생성하는 로컬 자동화 시스템입니다.

## 설치

```powershell
pip install -r requirements.txt
python -m playwright install
```

API 키 없이도 `config.yaml`의 `mock_mode: true` 상태에서는 바로 실행됩니다. 실제 AI 생성을 붙일 때는 `.env`에 키를 넣고 `mock_mode: false`로 바꾸면 됩니다.

## 실행

웹 앱 배포본:

[https://cardnews-ai-factory.vercel.app](https://cardnews-ai-factory.vercel.app)

단일 주제:

```powershell
python main.py --topic "퍼스널 브랜딩이 2026년에 더 중요해지는 이유"
```

원문 텍스트:

```powershell
python main.py --input inputs/source.txt
```

배치 생성:

```powershell
python main.py --batch inputs/topics.csv
```

PNG를 생략하고 JSON/Markdown/HTML만 만들고 싶다면:

```powershell
python main.py --topic "AI 에이전트 시대의 개인 브랜딩" --no-png
```

## 출력 구조

각 카드뉴스 세트는 `output/YYYYMMDD_HHMMSS_주제명/`에 저장됩니다.

- `brief.json`: 페르소나, 욕망, 문제, 앵글, 핵심 메시지, CTA 전략
- `slides.json`: 8개 슬라이드 카피와 역할, 열린 고리, 저장/공유 트리거, 승인 필드
- `slides.md`: 사람이 검토하기 쉬운 슬라이드 문서
- `caption.md`: 인스타그램 캡션, CTA, 해시태그
- `review_checklist.md`: 후킹, 열린 고리, 저장/공유, CTA, SEO 점검표
- `index.html`: 8장 카드뉴스 HTML 미리보기
- `png/slide_01.png` ~ `png/slide_08.png`: 최종 이미지

## 설정

주요 설정은 `config.yaml`에서 바꿉니다.

- `brand_name`
- `default_tone`
- `target_audience`
- `visual_style`
- `primary_color`
- `secondary_color`
- `font_family`
- `slide_size`
- `default_cta_type`
- `hashtag_count`
- `mock_mode`

## AI 연동

LLM 호출부는 `src/cardnews_factory/agents/copy_agent.py`에 분리되어 있습니다.

우선순위:

1. `mock_mode: true`면 로컬 샘플 생성기 사용
2. `mock_mode: false`이고 `OPENAI_API_KEY`가 있으면 OpenAI API 사용
3. `ANTHROPIC_API_KEY`는 v1에서 확장 포인트만 열어둠
4. API 실패 시 mock mode로 폴백

## 사용 흐름

1. 주제 또는 원문을 넣고 실행합니다.
2. 생성된 `slides.md`와 `review_checklist.md`를 먼저 봅니다.
3. 수정할 내용이 있으면 `slides.json` 또는 `slides.md`를 참고해 다음 버전 생성 프롬프트를 조정합니다.
4. `index.html`로 전체 흐름을 보고, `png/` 이미지를 업로드 또는 편집합니다.

## 개발 점검

```powershell
python -m unittest discover -s tests
python -m compileall -q src tests
```
