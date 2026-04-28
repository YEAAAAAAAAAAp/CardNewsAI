# 카드뉴스 자동화 공장 사용 가이드

이 프로젝트는 두 가지 방식으로 쓸 수 있습니다.

1. 로컬 CLI: 대량 생성, 파일 저장, PNG 생성에 적합
2. Vercel 웹 앱: 브라우저에서 주제 입력, 미리보기, JSON/Markdown/PNG 다운로드에 적합

## 1. 가장 빠른 사용법

웹 배포 후 Vercel URL에 접속합니다.

1. `주제` 탭에 카드뉴스 주제를 입력합니다.
2. `8장 카드뉴스 생성`을 누릅니다.
3. 오른쪽에서 8장 흐름과 검토 체크리스트를 확인합니다.
4. 필요한 파일을 다운로드합니다.
   - `JSON`: 전체 구조 백업
   - `Markdown`: 사람이 검토하고 수정하기 좋은 원고
   - `Caption`: 인스타그램 캡션
   - `PNG 8장`: 업로드용 이미지

원문 자료를 카드뉴스로 바꾸고 싶다면 `원문` 탭에 긴 글, 강의 자료, PDF 추출 텍스트를 붙여넣으면 됩니다.

## 2. 실무 작업 순서

1. 주제를 너무 넓게 쓰지 않습니다.
   - 나쁨: `브랜딩`
   - 좋음: `AI 시대에 1인 창업가가 퍼스널 브랜딩을 해야 하는 이유`
2. 생성 후 1번 슬라이드를 가장 먼저 봅니다.
   - 첫 장이 약하면 나머지가 좋아도 넘김이 일어나지 않습니다.
3. 7번 슬라이드를 저장용으로 점검합니다.
   - 체크리스트, 템플릿, 결정 기준 중 하나가 있어야 합니다.
4. 8번 슬라이드의 CTA를 구체적으로 바꿉니다.
   - 나쁨: `어떻게 생각하세요?`
   - 좋음: `댓글에 지금 만들고 싶은 카드뉴스 주제 1개를 남겨주세요.`
5. PNG를 다운로드해 인스타그램, 블로그, 커뮤니티에 맞게 최종 편집합니다.

## 3. 로컬 CLI 사용법

설치:

```powershell
pip install -r requirements.txt
python -m playwright install chromium
```

단일 주제:

```powershell
python main.py --topic "퍼스널 브랜딩이 2026년에 더 중요해지는 이유"
```

원문 텍스트:

```powershell
python main.py --input inputs/source.txt
```

여러 주제 배치:

```powershell
python main.py --batch inputs/topics.csv
```

결과는 `output/날짜_시간_주제명/`에 저장됩니다.

## 4. Vercel 배포 방법

처음 한 번:

```powershell
cmd /c npm install
cmd /c npm run build
```

Vercel에 배포:

```powershell
vercel
```

프로덕션 배포:

```powershell
vercel --prod
```

OpenAI 실제 생성 모드:

1. Vercel 프로젝트 Settings로 이동합니다.
2. Environment Variables에 `OPENAI_API_KEY`를 추가합니다.
3. 필요하면 `OPENAI_MODEL`도 추가합니다. 예: `gpt-4o-mini`
4. 다시 배포합니다.

API 키가 없으면 웹 앱은 mock mode로 작동합니다.

## 5. 품질 체크 기준

생성 후 아래 기준을 꼭 확인하세요.

- 1번 슬라이드가 문제, 욕망, 대담한 주장, 공감 중 하나로 시작하는가?
- 1번에서 답을 다 말하지 않고 다음 장을 넘기게 만드는가?
- 8장 흐름이 Hook → Setup → Tension → Insight → Shift → Proof → Soft CTA → Hard CTA인가?
- 각 슬라이드가 한 가지 메시지만 말하는가?
- 7번에 저장할 만한 체크리스트, 템플릿, 결정 기준이 있는가?
- 8번 CTA가 구체적인 행동 하나를 요청하는가?
- 캡션 첫 문장에 핵심 키워드가 들어갔는가?
- 해시태그가 5~12개인가?

## 6. 추천 운영 방식

- 매주 주제 10개를 `inputs/topics.csv`에 모읍니다.
- CLI 배치로 초안을 생성합니다.
- 웹 앱에서 가장 좋은 주제만 다시 다듬습니다.
- 최종 업로드 전에는 1번 슬라이드와 8번 CTA만큼은 직접 손봅니다.
- 반응이 좋았던 카드뉴스는 다음 주 배치 주제로 다시 쪼개 재활용합니다.
