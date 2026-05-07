import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  createMockProject,
  findContentTypePreset,
  imageModelName,
  normalizeOptions,
  normalizeTopic,
  type CardnewsOptions,
  type FactoryProject
} from "@/lib/cardnews";

export const runtime = "nodejs";
export const maxDuration = 300;

type RequestBody = {
  topic?: string;
  source?: string;
  mode?: "topic" | "source";
  useGeminiImages?: boolean;
  options?: Partial<CardnewsOptions>;
};

type ImageModelAttempt = {
  model: string;
  source: "primary" | "fallback";
};

type ImagePipelineProfile = {
  concurrency: number;
  primaryRetries: number;
  fallbackRetries: number;
  timeoutMs: number;
  retryBaseDelayMs: number;
  usePromptVariants: boolean;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  const options = normalizeOptions(body.options);
  const topic = normalizeTopic(body.topic || inferTopic(body.source || ""));
  const source = body.source?.trim() || "";

  if (!topic) {
    return NextResponse.json({ error: "topic 또는 source가 필요합니다." }, { status: 400 });
  }

  try {
    const project = await createCopyProject(topic, source, options);
    const shouldGenerateImages = body.useGeminiImages !== false && options.imageScope !== "off";
    return NextResponse.json(await maybeEnhanceWithGeminiImages(project, shouldGenerateImages));
  } catch (error) {
    const fallback = createMockProject(topic, source, `AI 생성 실패, mock으로 대체: ${summarizeError(error)}`, options);
    return NextResponse.json(await maybeEnhanceWithGeminiImages(fallback, body.useGeminiImages !== false && options.imageScope !== "off"));
  }
}

async function createCopyProject(topic: string, source: string, options: CardnewsOptions): Promise<FactoryProject> {
  if (process.env.OPENAI_API_KEY) {
    return createWithOpenAI(topic, source, options);
  }

  if (process.env.GEMINI_API_KEY) {
    return createWithGemini(topic, source, options);
  }

  return createMockProject(topic, source, "API 키가 없어 mock mode로 생성했습니다.", options);
}

async function createWithOpenAI(topic: string, source: string, options: CardnewsOptions): Promise<FactoryProject> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: buildProjectPrompt(topic, source, options) }
    ]
  });
  return mergeGeneratedProject(topic, source, options, response.choices[0]?.message?.content || "{}", "openai");
}

async function createWithGemini(topic: string, source: string, options: CardnewsOptions): Promise<FactoryProject> {
  const preferredModel = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
  const fallbackModels = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];
  const models = [...new Set([preferredModel, ...fallbackModels])];
  const errors: string[] = [];

  for (const model of models) {
    try {
      const raw = await generateGeminiJson(model, topic, source, options);
      const project = mergeGeneratedProject(topic, source, options, raw, "gemini");
      return {
        ...project,
        warnings: [`Gemini copy generated: ${model}`]
      };
    } catch (error) {
      errors.push(`${model}: ${summarizeError(error)}`);
    }
  }

  throw new Error(errors.join(" | "));
}

async function generateGeminiJson(model: string, topic: string, source: string, options: CardnewsOptions) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${buildProjectPrompt(topic, source, options)}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.75
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status}: ${text.slice(0, 220)}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

function mergeGeneratedProject(
  topic: string,
  source: string,
  options: CardnewsOptions,
  rawJson: string,
  sourceType: FactoryProject["sourceType"]
): FactoryProject {
  const base = createMockProject(topic, source, `${sourceType} generated`, options);
  const parsed = JSON.parse(cleanJson(rawJson)) as Partial<FactoryProject>;

  return {
    ...base,
    ...parsed,
    topic: parsed.topic || topic,
    sourceType,
    options,
    brief: { ...base.brief, ...parsed.brief },
    slides: (parsed.slides?.length === 8 ? parsed.slides : base.slides).map((slide, index) => ({
      ...base.slides[index],
      ...slide,
      slideNumber: index + 1,
      approved: false
    })),
    caption: { ...base.caption, ...parsed.caption },
    reviewChecklist: parsed.reviewChecklist?.length ? parsed.reviewChecklist : base.reviewChecklist,
    warnings: [sourceType === "gemini" ? "Gemini copy generated" : "OpenAI copy generated"]
  };
}

async function maybeEnhanceWithGeminiImages(project: FactoryProject, enabled: boolean): Promise<FactoryProject> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!enabled) return project;
  if (!apiKey) {
    return applyFallbackImages(project, "GEMINI_API_KEY가 없어 내장 프리미엄 배경으로 모든 슬라이드를 완성했습니다.");
  }

  const models = imageModelCascade(project.options.imageModel);
  const profile = imagePipelineProfile(project.options);
  const warnings = [...project.warnings];
  const targetSlides = project.options.imageScope === "hero" ? new Set([1, 7, 8]) : new Set(project.slides.map((slide) => slide.slideNumber));
  const stats = { generated: 0, fallback: 0 };
  const errors: string[] = [];
  const slides = await mapWithConcurrency(project.slides, profile.concurrency, async (slide) => {
      if (!targetSlides.has(slide.slideNumber)) return slide;

      try {
        const prompt = slide.imagePrompt || fallbackImagePrompt(project, slide);
        const imageDataUrl = await generateGeminiImageWithModelCascade(apiKey, models, prompt, profile);
        stats.generated += 1;
        return { ...slide, imageDataUrl };
      } catch (error) {
        stats.fallback += 1;
        errors.push(`Slide ${slide.slideNumber}: ${summarizeError(error)}`);
        return { ...slide, imageDataUrl: generateFallbackCardImage(project, slide) };
      }
  });

  if (stats.generated > 0) {
    warnings.push(`Image pipeline: Gemini ${stats.generated}/${targetSlides.size}, premium fallback ${stats.fallback}/${targetSlides.size}`);
  }
  if (stats.fallback > 0) {
    warnings.push(`${errors[0]} 성격별 내장 프리미엄 배경으로 실패한 슬라이드를 완성했습니다.`);
  }

  return {
    ...project,
    slides,
    warnings: [...new Set(warnings)]
  };
}

function applyFallbackImages(project: FactoryProject, notice: string): FactoryProject {
  const targetSlides = project.options.imageScope === "hero" ? new Set([1, 7, 8]) : new Set(project.slides.map((slide) => slide.slideNumber));
  return {
    ...project,
    slides: project.slides.map((slide) => (targetSlides.has(slide.slideNumber) ? { ...slide, imageDataUrl: generateFallbackCardImage(project, slide) } : slide)),
    warnings: [...new Set([...project.warnings, notice])]
  };
}

async function generateGeminiImageWithModelCascade(
  apiKey: string,
  models: ImageModelAttempt[],
  prompt: string,
  profile: ImagePipelineProfile
): Promise<string> {
  const errors: string[] = [];
  const prompts = profile.usePromptVariants ? [prompt, simplifyImagePrompt(prompt)] : [prompt];

  for (const attempt of models) {
    for (const candidatePrompt of prompts) {
      try {
        const retryCount = attempt.source === "primary" ? profile.primaryRetries : profile.fallbackRetries;
        return await retryImageGeneration(
          () => generateGeminiImage(apiKey, attempt.model, candidatePrompt, profile.timeoutMs),
          retryCount,
          profile.retryBaseDelayMs
        );
      } catch (error) {
        errors.push(`${attempt.model}: ${summarizeError(error)}`);
        if (isHardQuotaError(error)) throw new Error(errors.join(" | "));
      }
    }
  }

  throw new Error(errors.join(" | "));
}

async function retryImageGeneration(operation: () => Promise<string>, retryCount: number, baseDelayMs: number): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableImageError(error) || attempt === retryCount) break;
      await sleep(baseDelayMs * (attempt + 1) ** 2);
    }
  }

  throw lastError;
}

async function generateGeminiImage(apiKey: string, model: string, prompt: string, timeoutMs: number): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "1:1" }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    const retryAfter = response.headers.get("retry-after");
    throw new Error(`${response.status}${retryAfter ? ` retry-after=${retryAfter}` : ""} ${text.slice(0, 240)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part: { inlineData?: { mimeType?: string; data?: string } }) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini 응답에 이미지 데이터가 없습니다.");
  }
  return `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`;
}

const systemPrompt = [
  "너는 한국어 인스타그램 카드뉴스 콘텐츠 디렉터다.",
  "목표는 단순 요약이 아니라 저장, 공유, 댓글, DM 전환을 유도하는 8장 카드뉴스 설계다.",
  "반드시 자연스러운 한국어로 작성하고, 각 슬라이드는 한 가지 아이디어만 말한다.",
  "Slide 1 Hook, 2 Setup, 3 Tension, 4 Insight, 5 Shift, 6 Proof, 7 Soft CTA, 8 Hard CTA 구조를 지킨다.",
  "JSON만 반환한다. 마크다운 코드블록을 쓰지 않는다."
].join("\n");

function buildProjectPrompt(topic: string, source: string, options: CardnewsOptions) {
  const preset = findContentTypePreset(options.contentType);
  return JSON.stringify({
    topic,
    source,
    strategyInputs: options,
    categoryStrategy: {
      name: preset.label,
      description: preset.description,
      promptRules: preset.promptRules,
      visualKeywords: preset.visualKeywords
    },
    outputRules: [
      "headline은 짧고 강하게, body는 1~3줄로 작성",
      "첫 장은 답을 다 말하지 말고 다음 장을 넘기게 만들 것",
      "Slide 7은 저장용 체크리스트나 기준",
      "Slide 8은 구체적인 댓글/DM/공유 행동 1개",
      "imagePrompt는 영어로 작성하고 텍스트, 로고, 워터마크 없이 1:1 배경 이미지를 지시",
      "visualDirection은 사람이 편집할 때 참고할 수 있는 한국어 방향"
    ],
    schema: {
      topic: "string",
      brief: {
        targetPersona: "string",
        readerDesire: "string",
        readerProblem: "string",
        contentAngle: "string",
        coreMessage: "string",
        ctaStrategy: "string"
      },
      slides: [
        {
          slideNumber: "number",
          role: "Hook|Setup|Tension|Insight|Shift|Proof|Soft CTA|Hard CTA",
          headline: "string",
          body: "string",
          visualDirection: "string",
          imagePrompt: "string",
          openLoop: "string",
          saveOrShareTrigger: "string",
          hasCta: "boolean",
          approved: false
        }
      ],
      caption: {
        seoFirstSentence: "string",
        body: "string",
        saveCta: "string",
        shareCta: "string",
        commentCta: "string",
        hashtags: ["string"]
      },
      reviewChecklist: [{ name: "string", passed: "boolean", note: "string" }],
      warnings: ["string"]
    }
  });
}

function fallbackImagePrompt(project: FactoryProject, slide: FactoryProject["slides"][number]) {
  const preset = findContentTypePreset(project.options.contentType);
  return [
    "Create a square 1:1 premium Instagram cardnews background.",
    `Topic: ${project.topic}. Slide role: ${slide.role}.`,
    `Visual direction: ${slide.visualDirection}.`,
    `Category: ${preset.label}. Keywords: ${preset.visualKeywords.join(", ")}.`,
    `Mood: ${project.options.visualMood}. Style: ${project.options.imageStyle}. Palette: ${project.options.colorPalette}.`,
    "Use tactile lighting, editorial art direction, subtle depth, realistic material texture, and a premium social media campaign look.",
    "No readable text, no letters, no numbers, no logos, no watermark.",
    "Leave generous negative space for Korean headline overlay."
  ].join(" ");
}

function generateFallbackCardImage(project: FactoryProject, slide: FactoryProject["slides"][number]) {
  const preset = findContentTypePreset(project.options.contentType);
  const palette = fallbackPalette(preset.id, slide.slideNumber);
  const seed = hashString(`${project.topic}:${preset.id}:${slide.role}:${slide.slideNumber}`);
  const motif = fallbackMotif(preset.id, palette, seed);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="paper" x1="${seed % 2}" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${palette.paper1}"/>
      <stop offset="100%" stop-color="${palette.paper2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="${18 + (seed % 18)}%" cy="${14 + (seed % 14)}%" r="62%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="coolGlow" cx="${78 - (seed % 12)}%" cy="${24 + (seed % 24)}%" r="54%">
      <stop offset="0%" stop-color="${palette.green}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${palette.green}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grain" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M0 42L42 0" stroke="${palette.ink}" stroke-opacity="0.045" stroke-width="1"/>
      <circle cx="7" cy="9" r="1.1" fill="${palette.ink}" fill-opacity="0.05"/>
    </pattern>
    <filter id="noise" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="${seed % 997}" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.055"/>
      </feComponentTransfer>
    </filter>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="22" stdDeviation="32" flood-color="${palette.ink}" flood-opacity="0.12"/>
    </filter>
    <filter id="blurGlass" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.2"/>
      <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="${palette.ink}" flood-opacity="0.1"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(#paper)"/>
  <rect width="1080" height="1080" fill="url(#coolGlow)"/>
  <rect width="1080" height="1080" fill="url(#grain)"/>
  <rect width="1080" height="1080" fill="url(#glow)"/>
  <rect width="1080" height="1080" filter="url(#noise)" opacity="0.9"/>
  ${motif}
</svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function fallbackPalette(presetId: string, index: number) {
  const palettes: Record<string, Array<{ paper1: string; paper2: string; ink: string; accent: string; green: string }>> = {
    "practical-guide": [
      { paper1: "#fffdf8", paper2: "#f5ecdf", ink: "#20252c", accent: "#f45745", green: "#1f5b50" },
      { paper1: "#fbfbf8", paper2: "#eaf0ec", ink: "#20252c", accent: "#2f7f6f", green: "#f0bd63" }
    ],
    "problem-solving": [
      { paper1: "#f8fbff", paper2: "#e8edf5", ink: "#20252c", accent: "#4a6fd6", green: "#f45745" },
      { paper1: "#fffaf2", paper2: "#efe7dc", ink: "#26242a", accent: "#d85f45", green: "#375d74" }
    ],
    "point-of-view": [
      { paper1: "#fffaf2", paper2: "#f1e7d8", ink: "#26242a", accent: "#9f2f2b", green: "#4d6044" },
      { paper1: "#fbf6eb", paper2: "#e8ded0", ink: "#1e2229", accent: "#d46a42", green: "#2d4f49" }
    ],
    checklist: [
      { paper1: "#fffdf6", paper2: "#eef3e8", ink: "#20252c", accent: "#2f7f6f", green: "#f0bd63" },
      { paper1: "#fbfbf8", paper2: "#e9efe7", ink: "#20252c", accent: "#1f5b50", green: "#d8a648" }
    ],
    "sales-conversion": [
      { paper1: "#23272f", paper2: "#15191f", ink: "#fffdf8", accent: "#f45745", green: "#f0bd63" },
      { paper1: "#1f2b27", paper2: "#111715", ink: "#fffdf8", accent: "#f0bd63", green: "#f45745" }
    ]
  };
  const selected = palettes[presetId] || palettes["practical-guide"];
  return selected[(index - 1) % selected.length];
}

function fallbackMotif(presetId: string, palette: { ink: string; accent: string; green: string }, seed: number) {
  const common = `fill="#fffdf8" fill-opacity="0.46" filter="url(#blurGlass)"`;
  const x = 48 + (seed % 30);
  const y = 690 + (seed % 62);
  if (presetId === "problem-solving") {
    return `
  <rect x="${x}" y="${y}" width="336" height="164" rx="38" ${common}/>
  <path d="M${x + 42} ${y + 72} H${x + 256}" stroke="${palette.ink}" stroke-opacity="0.12" stroke-width="12" stroke-linecap="round"/>
  <path d="M610 782 C708 686 820 704 948 596" fill="none" stroke="${palette.accent}" stroke-width="24" stroke-linecap="round" stroke-opacity="0.22"/>
  <path d="M636 846 C744 764 830 802 966 724" fill="none" stroke="${palette.green}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.2"/>
  <circle cx="878" cy="200" r="130" fill="#fffdf8" fill-opacity="0.36" stroke="${palette.ink}" stroke-opacity="0.08"/>
  <circle cx="920" cy="240" r="54" fill="${palette.accent}" fill-opacity="0.1"/>`;
  }
  if (presetId === "point-of-view") {
    return `
  <polygon points="700,156 972,266 858,536 594,420" fill="${palette.accent}" fill-opacity="0.12"/>
  <polygon points="748,210 930,286 846,480 650,402" fill="#fffdf8" fill-opacity="0.24"/>
  <circle cx="824" cy="310" r="142" fill="#fffdf8" fill-opacity="0.3" stroke="${palette.ink}" stroke-opacity="0.08"/>
  <path d="M104 790 C252 690 354 750 490 640" fill="none" stroke="${palette.accent}" stroke-width="22" stroke-linecap="round" stroke-opacity="0.22"/>
  <rect x="${x}" y="${y}" width="410" height="158" rx="28" ${common}/>`;
  }
  if (presetId === "checklist") {
    return `
  <rect x="688" y="138" width="250" height="294" rx="38" ${common}/>
  <path d="M740 222 h126 M740 296 h140 M740 372 h106" stroke="${palette.ink}" stroke-opacity="0.15" stroke-width="11" stroke-linecap="round"/>
  <path d="M710 220 l13 13 26-34 M710 294 l13 13 26-34 M710 370 l13 13 26-34" fill="none" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.48"/>
  <rect x="${x}" y="${y}" width="386" height="138" rx="30" ${common}/>
  <path d="M${x + 40} ${y + 70} h220" stroke="${palette.green}" stroke-opacity="0.18" stroke-width="12" stroke-linecap="round"/>`;
  }
  if (presetId === "sales-conversion") {
    return `
  <circle cx="846" cy="214" r="136" fill="${palette.accent}" fill-opacity="0.2"/>
  <circle cx="900" cy="280" r="64" fill="${palette.green}" fill-opacity="0.16"/>
  <rect x="646" y="682" width="326" height="194" rx="44" fill="#fffdf8" fill-opacity="0.15" filter="url(#blurGlass)"/>
  <path d="M704 756 h184 M704 814 h122" stroke="${palette.ink}" stroke-opacity="0.24" stroke-width="12" stroke-linecap="round"/>
  <path d="M104 812 C258 698 388 752 534 628" fill="none" stroke="${palette.green}" stroke-width="20" stroke-linecap="round" stroke-opacity="0.28"/>
  <rect x="98" y="172" width="180" height="54" rx="27" fill="#fffdf8" fill-opacity="0.1"/>`;
  }
  return `
  <circle cx="880" cy="188" r="126" fill="#fffdf8" fill-opacity="0.48" stroke="${palette.ink}" stroke-opacity="0.07"/>
  <circle cx="930" cy="246" r="50" fill="${palette.green}" fill-opacity="0.14"/>
  <rect x="${x}" y="${y}" width="394" height="158" rx="38" ${common}/>
  <rect x="${x + 2}" y="${y + 2}" width="390" height="154" rx="36" fill="none" stroke="${palette.ink}" stroke-opacity="0.07"/>
  <path d="M634 760 C728 690 820 702 922 632" fill="none" stroke="${palette.accent}" stroke-width="20" stroke-linecap="round" stroke-opacity="0.18"/>
  <path d="M662 824 C742 774 836 786 946 716" fill="none" stroke="${palette.green}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.16"/>`;
}

function imageModelCascade(choice: CardnewsOptions["imageModel"]): ImageModelAttempt[] {
  const forced = process.env.GEMINI_IMAGE_MODEL_FORCE?.trim();
  const preferred = imageModelName(choice);
  const fallbacks = choice === "pro" ? ["gemini-2.5-flash-image"] : ["gemini-3-pro-image-preview"];
  const models = [forced, preferred, ...fallbacks].filter((model): model is string => Boolean(model));
  return [...new Set(models)].map((model, index) => ({
    model,
    source: index === 0 ? "primary" : "fallback"
  }));
}

function imagePipelineProfile(options: CardnewsOptions): ImagePipelineProfile {
  const reliability = options.imageReliability || "persistent";
  const envConcurrency = Number(process.env.IMAGE_GENERATION_CONCURRENCY || "");

  if (reliability === "fast") {
    return {
      concurrency: clampNumber(envConcurrency || 3, 1, 4),
      primaryRetries: 1,
      fallbackRetries: 0,
      timeoutMs: 45000,
      retryBaseDelayMs: 900,
      usePromptVariants: false
    };
  }

  if (reliability === "balanced") {
    return {
      concurrency: clampNumber(envConcurrency || 2, 1, 4),
      primaryRetries: 2,
      fallbackRetries: 1,
      timeoutMs: 75000,
      retryBaseDelayMs: 1200,
      usePromptVariants: true
    };
  }

  return {
    concurrency: clampNumber(envConcurrency || 1, 1, 2),
    primaryRetries: 4,
    fallbackRetries: 2,
    timeoutMs: 110000,
    retryBaseDelayMs: 1600,
    usePromptVariants: true
  };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function isRetryableImageError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (isHardQuotaError(error)) return false;
  return (
    message.includes("429") ||
    message.includes("timeout") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("high demand") ||
    message.includes("unavailable") ||
    message.includes("rate limit")
  );
}

function isHardQuotaError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("quota") || message.includes("resource_exhausted") || message.includes("billing");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function simplifyImagePrompt(prompt: string) {
  return [
    "Create a square 1:1 premium editorial background for an Instagram carousel.",
    "No text, no letters, no numbers, no logos, no watermark.",
    "Clean negative space for a large Korean headline overlay.",
    "Tactile material texture, soft studio lighting, refined composition, premium brand campaign look.",
    prompt.slice(0, 900)
  ].join(" ");
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] || char));
}

function cleanJson(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function summarizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    if (!message.toLowerCase().includes("quota") && !message.toLowerCase().includes("resource_exhausted")) {
      return "Gemini 요청 제한이 발생했습니다. 품질 우선 모드에서 자동 재시도와 순차 생성을 수행했습니다.";
    }
    return "Gemini 이미지/모델 쿼터가 초과되었습니다. Google AI Studio 결제/쿼터를 확인하거나 이미지 생성 범위를 줄여주세요.";
  }
  if (message.includes("503") || message.toLowerCase().includes("high demand") || message.toLowerCase().includes("unavailable")) {
    return "Gemini 모델 수요가 높아 잠시 사용할 수 없습니다. 자동으로 fallback 모델 또는 mock 결과를 사용했습니다.";
  }
  return message.slice(0, 240);
}

function inferTopic(source: string) {
  const first = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (first && first.length <= 80) return first;
  return source.trim().slice(0, 60);
}
