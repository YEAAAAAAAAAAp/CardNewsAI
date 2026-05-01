import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createMockProject, type FactoryProject } from "@/lib/cardnews";

export const runtime = "nodejs";
export const maxDuration = 60;

type RefineBody = {
  project?: FactoryProject;
  instruction?: string;
  scope?: "selected" | "all";
  selectedSlide?: number;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RefineBody;
  const project = body.project;
  const instruction = body.instruction?.trim() || "";

  if (!project || !instruction) {
    return NextResponse.json({ error: "project와 instruction이 필요합니다." }, { status: 400 });
  }

  try {
    const refined = await refineWithAvailableModel(project, instruction, body.scope || "selected", body.selectedSlide || 1);
    return NextResponse.json(preserveImages(project, refined));
  } catch (error) {
    const fallback = localRefine(project, instruction, body.scope || "selected", body.selectedSlide || 1);
    return NextResponse.json({
      ...fallback,
      warnings: [...fallback.warnings, `AI 다듬기 실패로 로컬 보정만 적용했습니다: ${summarizeError(error)}`]
    });
  }
}

async function refineWithAvailableModel(project: FactoryProject, instruction: string, scope: "selected" | "all", selectedSlide: number) {
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: refineSystemPrompt },
        { role: "user", content: buildRefinePrompt(project, instruction, scope, selectedSlide) }
      ]
    });
    return JSON.parse(cleanJson(response.choices[0]?.message?.content || "{}")) as FactoryProject;
  }

  if (process.env.GEMINI_API_KEY) {
    const models = [...new Set([process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"])];
    const errors: string[] = [];
    for (const model of models) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
          signal: AbortSignal.timeout(18000),
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${refineSystemPrompt}\n\n${buildRefinePrompt(project, instruction, scope, selectedSlide)}` }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.65
            }
          })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`${response.status}: ${text.slice(0, 180)}`);
        }

        const data = await response.json();
        return JSON.parse(cleanJson(data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}")) as FactoryProject;
      } catch (error) {
        errors.push(`${model}: ${summarizeError(error)}`);
      }
    }
    throw new Error(errors.join(" | "));
  }

  return localRefine(project, instruction, scope, selectedSlide);
}

const refineSystemPrompt = [
  "너는 한국어 인스타그램 카드뉴스 편집장이다.",
  "사용자의 수정 프롬프트를 반영해 기존 카드뉴스 JSON을 다듬는다.",
  "반드시 8슬라이드 구조와 기존 JSON 스키마를 유지한다.",
  "이미지 data URL은 수정하지 말고 유지한다.",
  "각 슬라이드는 한 가지 메시지만 담고, 첫 장은 넘기고 싶게 만든다.",
  "JSON만 반환한다. 마크다운 코드블록은 쓰지 않는다."
].join("\n");

function buildRefinePrompt(project: FactoryProject, instruction: string, scope: "selected" | "all", selectedSlide: number) {
  return JSON.stringify({
    instruction,
    scope,
    selectedSlide,
    project: stripImagePayload(project),
    rules: [
      scope === "selected" ? `Slide ${selectedSlide} 중심으로 수정하고 전체 톤과 캡션은 필요한 만큼만 맞춘다.` : "전체 슬라이드, 캡션, 브리프를 일관되게 수정한다.",
      "headline은 더 짧고 강하게, body는 모바일에서 읽기 쉬운 1~3줄로 유지한다.",
      "저장/공유/댓글 유도 구조를 약하게 만들지 않는다.",
      "imageDataUrl은 그대로 유지한다."
    ]
  });
}

function stripImagePayload(project: FactoryProject): FactoryProject {
  return {
    ...project,
    slides: project.slides.map((slide) => ({
      ...slide,
      imageDataUrl: slide.imageDataUrl ? "[preserved]" : undefined
    }))
  };
}

function preserveImages(original: FactoryProject, refined: FactoryProject): FactoryProject {
  const slides = (refined.slides?.length === 8 ? refined.slides : original.slides).map((slide, index) => ({
    ...original.slides[index],
    ...slide,
    imageDataUrl: original.slides[index]?.imageDataUrl || slide.imageDataUrl,
    slideNumber: index + 1
  }));

  return {
    ...original,
    ...refined,
    slides,
    options: original.options,
    warnings: [...new Set([...(refined.warnings || []), "Prompt refined"])]
  };
}

function localRefine(project: FactoryProject, instruction: string, scope: "selected" | "all", selectedSlide: number): FactoryProject {
  const target = scope === "all" ? null : selectedSlide;
  return {
    ...project,
    slides: project.slides.map((slide) => {
      if (target && slide.slideNumber !== target) return slide;
      return {
        ...slide,
        openLoop: `${slide.openLoop} / 수정 지시: ${instruction.slice(0, 80)}`
      };
    }),
    warnings: [...project.warnings, "Prompt refined locally"]
  };
}

function cleanJson(value: string) {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
}

function summarizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("429") || message.toLowerCase().includes("quota")) return "모델 쿼터가 초과되었습니다.";
  if (message.includes("503") || message.toLowerCase().includes("unavailable")) return "모델 수요가 높아 잠시 사용할 수 없습니다.";
  return message.slice(0, 220);
}
