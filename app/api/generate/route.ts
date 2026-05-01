import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  createMockProject,
  imageModelName,
  normalizeOptions,
  normalizeTopic,
  type CardnewsOptions,
  type FactoryProject
} from "@/lib/cardnews";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  topic?: string;
  source?: string;
  mode?: "topic" | "source";
  useGeminiImages?: boolean;
  options?: Partial<CardnewsOptions>;
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
    return {
      ...project,
      warnings: [...project.warnings, "GEMINI_API_KEY가 없어 기본 카드 디자인으로 생성했습니다."]
    };
  }

  const model = process.env.GEMINI_IMAGE_MODEL_FORCE || imageModelName(project.options.imageModel);
  const warnings = [...project.warnings, `Image model: ${model}`];
  const slides: FactoryProject["slides"] = [];
  const targetSlides = project.options.imageScope === "hero" ? new Set([1, 7, 8]) : new Set(project.slides.map((slide) => slide.slideNumber));

  for (const slide of project.slides) {
    if (!targetSlides.has(slide.slideNumber)) {
      slides.push(slide);
      continue;
    }

    try {
      const imageDataUrl = await generateGeminiImage(apiKey, model, slide.imagePrompt || fallbackImagePrompt(project, slide));
      slides.push({ ...slide, imageDataUrl });
    } catch (error) {
      warnings.push(`Slide ${slide.slideNumber} 이미지 생성 실패: ${summarizeError(error)}`);
      slides.push(slide);
    }
  }

  return {
    ...project,
    slides,
    warnings: [...new Set(warnings)]
  };
}

async function generateGeminiImage(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
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
    throw new Error(`${response.status} ${text.slice(0, 240)}`);
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
  return JSON.stringify({
    topic,
    source,
    strategyInputs: options,
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
  return [
    "Create a square 1:1 premium Instagram cardnews background.",
    `Topic: ${project.topic}. Slide role: ${slide.role}.`,
    `Visual direction: ${slide.visualDirection}.`,
    `Mood: ${project.options.visualMood}. Style: ${project.options.imageStyle}. Palette: ${project.options.colorPalette}.`,
    "No readable text, no letters, no numbers, no logos, no watermark.",
    "Leave generous negative space for Korean headline overlay."
  ].join(" ");
}

function cleanJson(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function summarizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429") || message.toLowerCase().includes("quota")) {
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
