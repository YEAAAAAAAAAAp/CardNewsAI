import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createMockProject, normalizeTopic, type FactoryProject } from "@/lib/cardnews";

export const runtime = "nodejs";

type RequestBody = {
  topic?: string;
  source?: string;
  mode?: "topic" | "source";
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  const topic = normalizeTopic(body.topic || inferTopic(body.source || ""));
  const source = body.source?.trim() || "";

  if (!topic) {
    return NextResponse.json({ error: "topic 또는 source가 필요합니다." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(createMockProject(topic, source, "Vercel mock mode"));
  }

  try {
    const project = await createWithOpenAI(topic, source);
    return NextResponse.json(project);
  } catch (error) {
    const fallback = createMockProject(topic, source, `OpenAI 실패, mock으로 대체: ${String(error)}`);
    return NextResponse.json(fallback);
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

function inferTopic(source: string) {
  const first = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (first && first.length <= 80) return first;
  return source.trim().slice(0, 60);
}
