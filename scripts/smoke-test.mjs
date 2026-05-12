import { spawn, spawnSync } from "node:child_process";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const shouldManageServer = !process.env.SMOKE_BASE_URL;
const bypassToken = process.env.SMOKE_VERCEL_BYPASS_TOKEN;

let devServer;
let failed = false;

async function ensureServer() {
  if (await isServerReady()) return;
  if (!shouldManageServer) {
    throw new Error(`Smoke server is not reachable at ${baseUrl}. Start the app or set SMOKE_BASE_URL to a running deployment.`);
  }

  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd run dev"] : ["run", "dev"];

  devServer = spawn(command, args, {
    env: { ...process.env, PORT: new URL(baseUrl).port || "3000" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  devServer.stdout.on("data", (chunk) => process.stdout.write(`[dev] ${chunk}`));
  devServer.stderr.on("data", (chunk) => process.stderr.write(`[dev] ${chunk}`));

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await isServerReady()) return;
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for dev server at ${baseUrl}`);
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, {
      headers: smokeHeaders(),
      signal: AbortSignal.timeout(1500)
    });
    return response.ok;
  } catch {
    return false;
  }
}

function stopServer() {
  if (!devServer) return;
  if (process.platform === "win32" && devServer.pid) {
    spawnSync("taskkill.exe", ["/pid", String(devServer.pid), "/t", "/f"], { stdio: "ignore" });
  } else {
    devServer.kill();
  }
  devServer = undefined;
}

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: smokeHeaders({ "content-type": "application/json; charset=utf-8" }),
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

function smokeHeaders(headers = {}) {
  if (!bypassToken) return headers;
  return { ...headers, "x-vercel-protection-bypass": bypassToken };
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
  await ensureServer();

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    failed = true;
    console.error(error);
  })
  .finally(() => {
    stopServer();
    process.exit(failed ? 1 : 0);
  });
