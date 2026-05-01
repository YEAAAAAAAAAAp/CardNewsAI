import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createMockProject, normalizeTopic, type FactoryProject } from "@/lib/cardnews";

export const runtime = "nodejs";

type RequestBody = {
  topic?: string;
  source?: string;
  mode?: "topic" | "source";
  useGeminiImages?: boolean;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  const topic = normalizeTopic(body.topic || inferTopic(body.source || ""));
  const source = body.source?.trim() || "";

  if (!topic) {
    return NextResponse.json({ error: "topic 또는 source가 필요합니다." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    const project = createMockProject(topic, source, "Vercel mock mode");
    return NextResponse.json(await maybeEnhanceWithGeminiImages(project, body.useGeminiImages !== false));
  }

  try {
    const project = await createWithOpenAI(topic, source);
    return NextResponse.json(await maybeEnhanceWithGeminiImages(project, body.useGeminiImages !== false));
  } catch (error) {
    const fallback = createMockProject(topic, source, `OpenAI 실패, mock으로 대체: ${String(error)}`);
    return NextResponse.json(await maybeEnhanceWithGeminiImages(fallback, body.useGeminiImages !== false));
  }
}

async function createWithOpenAI(topic: string, source: string): Promise<FactoryProject> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "너는 한국어 인스타그램 카드뉴스 콘텐츠 공장이다. 8장 구조, 강한 후킹, 저장/공유/댓글 CTA, 동류 집단 기반 페르소나, 자연스러운 한국어를 지켜 JSON만 출력한다."
      },
      {
        role: "user",
        content: JSON.stringify({
          topic,
          source,
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
                imagePrompt: "string, English prompt for a square editorial image background without text",
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
        })
      }
    ]
  });
  const raw = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as FactoryProject;
  return {
    ...createMockProject(topic, source, "OpenAI generated"),
    ...parsed,
    topic: parsed.topic || topic
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

  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const warnings = [...project.warnings];
  const slides: FactoryProject["slides"] = [];

  for (const slide of project.slides) {
    try {
      const imageDataUrl = await generateGeminiImage(apiKey, model, slide.imagePrompt || fallbackImagePrompt(project.topic, slide));
      slides.push({ ...slide, imageDataUrl });
    } catch (error) {
      warnings.push(`Slide ${slide.slideNumber} 이미지 생성 실패: ${String(error)}`);
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
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${text.slice(0, 220)}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part: { inlineData?: { mimeType?: string; data?: string } }) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini 응답에 이미지 데이터가 없습니다.");
  }
  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

function fallbackImagePrompt(topic: string, slide: FactoryProject["slides"][number]) {
  return [
    "Square Instagram cardnews visual background, premium editorial style.",
    `Topic: ${topic}. Slide role: ${slide.role}.`,
    `Visual direction: ${slide.visualDirection}.`,
    "No readable text, no letters, no logos, no watermark.",
    "Generous negative space, warm paper, charcoal ink, coral accent, subtle green detail."
  ].join(" ");
}

function inferTopic(source: string) {
  const first = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (first && first.length <= 80) return first;
  return source.trim().slice(0, 60);
}
