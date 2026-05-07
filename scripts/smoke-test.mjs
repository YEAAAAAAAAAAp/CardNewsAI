const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

function assertProject(project, label) {
  const slides = project.slides || [];
  const visuals = slides.filter((slide) => slide.imageDataUrl).length;
  if (slides.length !== 8) throw new Error(`${label}: expected 8 slides, got ${slides.length}`);
  if (visuals !== 8) throw new Error(`${label}: expected 8 visuals, got ${visuals}`);
  if (!project.caption?.hashtags?.length) throw new Error(`${label}: caption hashtags are missing`);
  if (!project.reviewChecklist?.length) throw new Error(`${label}: review checklist is missing`);
}

async function main() {
  const project = await postJson("/api/generate", {
    topic: "실무자가 AI 카드뉴스를 빠르게 만드는 법",
    mode: "topic",
    useGeminiImages: true,
    options: {
      imageScope: "all",
      imageModel: "fast",
      imageReliability: "balanced",
      contentType: "실무 가이드형",
      targetAudience: "콘텐츠를 빠르게 만들고 싶은 1인 창업가와 퍼스널 브랜더",
      readerDesire: "저장과 공유가 나오는 카드뉴스를 안정적으로 만들고 싶다",
      painPoint: "후킹, 구조, 디자인을 매번 새로 고민한다",
      brandVoice: "명확하고 실무적인 한국어",
      ctaGoal: "저장과 댓글 유도",
      visualMood: "프리미엄 에디토리얼, 차분하지만 선명한 대비",
      imageStyle: "텍스트 없는 1:1 배경 이미지",
      colorPalette: "오프화이트, 차콜, 코랄 포인트",
      extraInstructions: "한 슬라이드에는 한 가지 메시지만 담는다."
    }
  });
  assertProject(project, "generate");

  const refined = await postJson("/api/refine", {
    project,
    instruction: "1번 슬라이드 후킹을 더 날카롭게 만들고 저장 가치가 보이게 해줘.",
    scope: "selected",
    selectedSlide: 1
  });
  assertProject(refined, "refine");

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceType: refined.sourceType,
        slides: refined.slides.length,
        visuals: refined.slides.filter((slide) => slide.imageDataUrl).length,
        firstHeadline: refined.slides[0].headline,
        warnings: refined.warnings || []
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
