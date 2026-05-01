"use client";

import { useMemo, useRef, useState } from "react";
import {
  createMockProject,
  defaultOptions,
  projectToJson,
  projectToMarkdown,
  type CardnewsOptions,
  type FactoryProject
} from "@/lib/cardnews";

const sampleTopic = "퍼스널 브랜딩이 2026년에 더 중요해지는 이유";
const roles = ["Hook", "Setup", "Tension", "Insight", "Shift", "Proof", "Soft CTA", "Hard CTA"];
const contentTypes = ["실무 가이드형", "문제 해결형", "관점 제안형", "체크리스트형", "세일즈 전환형"];
const visualPresets = [
  "프리미엄 에디토리얼, 따뜻한 종이 질감, 차분하지만 선명한 대비",
  "미니멀 테크 SaaS, 선명한 데이터 비주얼, 차가운 배경",
  "브랜드 매거진, 고급 라이프스타일, 여백이 큰 구성",
  "교육 워크북, 손으로 정리한 노트, 실용적인 체크리스트",
  "강한 주장형 포스터, 높은 대비, 대담한 오브젝트"
];

export default function HomePage() {
  const [mode, setMode] = useState<"topic" | "source">("topic");
  const [topic, setTopic] = useState(sampleTopic);
  const [source, setSource] = useState("");
  const [options, setOptions] = useState<CardnewsOptions>(defaultOptions);
  const [project, setProject] = useState<FactoryProject>(() => createMockProject(sampleTopic, "", "", defaultOptions));
  const [selectedSlide, setSelectedSlide] = useState(1);
  const [busy, setBusy] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineScope, setRefineScope] = useState<"selected" | "all">("selected");
  const [refineInstruction, setRefineInstruction] = useState("1번 슬라이드 후킹을 더 강하게 만들고, 전체 톤은 실무자답게 유지해줘.");
  const [error, setError] = useState("");
  const deckRef = useRef<HTMLDivElement>(null);

  const markdown = useMemo(() => projectToMarkdown(project), [project]);
  const activeSlide = project.slides.find((slide) => slide.slideNumber === selectedSlide) ?? project.slides[0];
  const passedChecks = project.reviewChecklist.filter((item) => item.passed).length;
  const visualCount = project.slides.filter((slide) => slide.imageDataUrl).length;
  const visibleWarnings = project.warnings.filter(
    (warning) =>
      !warning.startsWith("Gemini copy generated") &&
      !warning.startsWith("OpenAI copy generated") &&
      !warning.startsWith("Image model:") &&
      !warning.startsWith("Prompt refined") &&
      !warning.includes("내장 프리미엄 배경")
  );

  function updateOption<K extends keyof CardnewsOptions>(key: K, value: CardnewsOptions[K]) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          topic,
          source,
          mode,
          options,
          useGeminiImages: options.imageScope !== "off"
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "생성에 실패했습니다.");
      setProject(data);
      setSelectedSlide(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function refineProject() {
    if (!refineInstruction.trim()) return;
    setRefining(true);
    setError("");
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          project,
          instruction: refineInstruction,
          scope: refineScope,
          selectedSlide
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "다듬기에 실패했습니다.");
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefining(false);
    }
  }

  function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(captionText(project));
  }

  async function exportPngs() {
    const htmlToImage = await import("html-to-image");
    const nodes = Array.from(deckRef.current?.querySelectorAll<HTMLElement>(".card-slide") || []);
    for (const [index, node] of nodes.entries()) {
      const dataUrl = await htmlToImage.toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#fffdf8"
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `slide_${String(index + 1).padStart(2, "0")}.png`;
      link.click();
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="eyebrow">Cardnews AI Factory</p>
          <h1>카드뉴스 자동화 공장</h1>
          <p>주제 입력부터 8장 카피, 캡션, 검토표, PNG 추출까지 한 화면에서 완성합니다.</p>
        </div>
        <div className="topbar-actions">
          <StatusPill label="Slides" value="8" />
          <StatusPill label="Visuals" value={`${visualCount}/8`} />
          <StatusPill label="Copy" value={project.sourceType === "mock" ? "Mock" : project.sourceType.toUpperCase()} />
          <StatusPill label="Review" value={`${passedChecks}/${project.reviewChecklist.length}`} />
        </div>
      </header>

      <section className="studio-grid">
        <aside className="panel input-panel">
          <div className="panel-head">
            <span className="step">01</span>
            <div>
              <h2>기획 입력</h2>
              <p>주제, 독자, 전환 목표, 비주얼 톤까지 한 번에 설계합니다.</p>
            </div>
          </div>

          <div className="segmented" aria-label="입력 방식">
            <button className={mode === "topic" ? "active" : ""} onClick={() => setMode("topic")}>
              주제
            </button>
            <button className={mode === "source" ? "active" : ""} onClick={() => setMode("source")}>
              원문
            </button>
          </div>

          {mode === "topic" ? (
            <Field label="카드뉴스 주제">
              <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={3} />
            </Field>
          ) : (
            <Field label="원문 자료">
              <textarea
                value={source}
                onChange={(event) => setSource(event.target.value)}
                rows={8}
                placeholder="강의 자료, 블로그 글, PDF에서 추출한 텍스트를 붙여넣으세요."
              />
            </Field>
          )}

          <details className="control-section" open>
            <summary>
              <span>전략 설계</span>
              <small>누구에게, 어떤 욕망을 건드릴지 정합니다.</small>
            </summary>

            <Field label="카드뉴스 성격">
              <div className="chip-grid">
                {contentTypes.map((type) => (
                  <button
                    key={type}
                    className={options.contentType === type ? "chip active" : "chip"}
                    onClick={() => updateOption("contentType", type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="타깃 동류 집단">
              <textarea value={options.targetAudience} onChange={(event) => updateOption("targetAudience", event.target.value)} rows={3} />
            </Field>

            <Field label="독자의 욕망">
              <textarea value={options.readerDesire} onChange={(event) => updateOption("readerDesire", event.target.value)} rows={3} />
            </Field>

            <Field label="지금 막힌 문제">
              <textarea value={options.painPoint} onChange={(event) => updateOption("painPoint", event.target.value)} rows={3} />
            </Field>

            <Field label="브랜드 말투">
              <input value={options.brandVoice} onChange={(event) => updateOption("brandVoice", event.target.value)} />
            </Field>

            <Field label="CTA 목표">
              <input value={options.ctaGoal} onChange={(event) => updateOption("ctaGoal", event.target.value)} />
            </Field>
          </details>

          <details className="control-section" open>
            <summary>
              <span>비주얼 / 모델</span>
              <small>카드 배경 이미지와 생성 모델을 선택합니다.</small>
            </summary>

            <Field label="배경 이미지 톤">
              <select value={options.visualMood} onChange={(event) => updateOption("visualMood", event.target.value)}>
                {visualPresets.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="이미지 스타일">
              <input value={options.imageStyle} onChange={(event) => updateOption("imageStyle", event.target.value)} />
            </Field>

            <Field label="컬러 팔레트">
              <input value={options.colorPalette} onChange={(event) => updateOption("colorPalette", event.target.value)} />
            </Field>

            <div className="model-grid">
              <label className={options.imageModel === "pro" ? "model-card active" : "model-card"}>
                <input type="radio" checked={options.imageModel === "pro"} onChange={() => updateOption("imageModel", "pro")} />
                <strong>Nano Banana Pro</strong>
                <span>고품질 실무 산출물용. 복잡한 비주얼 지시를 더 잘 따릅니다.</span>
              </label>
              <label className={options.imageModel === "fast" ? "model-card active" : "model-card"}>
                <input type="radio" checked={options.imageModel === "fast"} onChange={() => updateOption("imageModel", "fast")} />
                <strong>Nano Banana</strong>
                <span>빠른 초안과 대량 생성용. 비용과 속도에 유리합니다.</span>
              </label>
            </div>

            <Field label="이미지 생성 범위">
              <select value={options.imageScope} onChange={(event) => updateOption("imageScope", event.target.value as CardnewsOptions["imageScope"])}>
                <option value="hero">핵심 3장만 생성: 1, 7, 8번</option>
                <option value="all">8장 전체 생성</option>
                <option value="off">이미지 생성 끄기</option>
              </select>
            </Field>

            <Field label="추가 지시">
              <textarea value={options.extraInstructions} onChange={(event) => updateOption("extraInstructions", event.target.value)} rows={3} />
            </Field>
          </details>

          <button className="primary" disabled={busy} onClick={generate}>
            {busy ? "생성 중..." : options.imageScope === "off" ? "카드뉴스 카피 생성" : "카드뉴스 설계 + 비주얼 생성"}
          </button>
          {busy ? <div className="busy-bar" aria-hidden="true" /> : null}
          {error ? <p className="error">{error}</p> : null}
          {visibleWarnings.length ? (
            <div className="warnings">
              {visibleWarnings.slice(0, 2).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="workflow">
            {roles.map((role, index) => (
              <button
                key={role}
                className={selectedSlide === index + 1 ? "active" : ""}
                onClick={() => setSelectedSlide(index + 1)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {role}
              </button>
            ))}
          </div>

          <div className="download-grid">
            <button onClick={() => downloadText("cardnews.json", projectToJson(project), "application/json;charset=utf-8")}>JSON</button>
            <button onClick={() => downloadText("slides.md", markdown)}>Markdown</button>
            <button onClick={() => downloadText("caption.md", captionText(project))}>Caption</button>
            <button onClick={exportPngs}>PNG 8장</button>
          </div>
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <span>Preview</span>
              <strong>8-slide carousel</strong>
            </div>
            <p>{options.imageScope === "off" ? "이미지 생성 꺼짐" : options.imageModel === "pro" ? "Nano Banana Pro" : "Nano Banana"}</p>
          </div>

          <div className="brief-strip">
            <Info label="타깃" value={project.brief.targetPersona} />
            <Info label="앵글" value={project.brief.contentAngle} />
            <Info label="CTA" value={project.brief.ctaStrategy} />
          </div>

          <div className="deck" ref={deckRef}>
            {project.slides.map((slide) => (
              <article
                className={`card-slide role-${slide.role.toLowerCase().replaceAll(" ", "-")} ${
                  slide.slideNumber === selectedSlide ? "selected" : ""
                }`}
                key={slide.slideNumber}
                onClick={() => setSelectedSlide(slide.slideNumber)}
              >
                {slide.imageDataUrl ? (
                  <div className="visual-art" style={{ backgroundImage: `url(${slide.imageDataUrl})` }} aria-hidden="true" />
                ) : (
                  <div className="fallback-art" aria-hidden="true" />
                )}
                <div className="card-top">
                  <span>{String(slide.slideNumber).padStart(2, "0")} / 08</span>
                  <span>{slide.role}</span>
                </div>
                <div className="card-copy">
                  <h2>{slide.headline}</h2>
                  <p>{slide.body}</p>
                </div>
                <div className="card-bottom">{slide.visualDirection}</div>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel inspector">
          <div className="panel-head">
            <span className="step">02</span>
            <div>
              <h2>검토</h2>
              <p>선택한 슬라이드와 게시 전 체크를 확인합니다.</p>
            </div>
          </div>

          <section className="refine-box">
            <div className="section-title">
              <h3>프롬프트로 다듬기</h3>
              <select value={refineScope} onChange={(event) => setRefineScope(event.target.value as "selected" | "all")}>
                <option value="selected">선택 슬라이드</option>
                <option value="all">전체 카드뉴스</option>
              </select>
            </div>
            <textarea value={refineInstruction} onChange={(event) => setRefineInstruction(event.target.value)} rows={4} />
            <button className="secondary-action" disabled={refining} onClick={refineProject}>
              {refining ? "다듬는 중..." : "현재 결과 다듬기"}
            </button>
          </section>

          <section className="selected-slide">
            {activeSlide.imageDataUrl ? (
              <div className="selected-visual" style={{ backgroundImage: `url(${activeSlide.imageDataUrl})` }} aria-hidden="true" />
            ) : (
              <div className="selected-visual empty">이미지 없음</div>
            )}
            <div className="mini-meta">
              <span>Slide {String(activeSlide.slideNumber).padStart(2, "0")}</span>
              <strong>{activeSlide.role}</strong>
            </div>
            <h3>{activeSlide.headline}</h3>
            <p>{activeSlide.body}</p>
            <dl>
              <div>
                <dt>Open loop</dt>
                <dd>{activeSlide.openLoop}</dd>
              </div>
              <div>
                <dt>Trigger</dt>
                <dd>{activeSlide.saveOrShareTrigger}</dd>
              </div>
              <div>
                <dt>Image prompt</dt>
                <dd>{activeSlide.imagePrompt || "없음"}</dd>
              </div>
            </dl>
          </section>

          <section className="caption-box">
            <div className="section-title">
              <h3>캡션</h3>
              <button onClick={copyCaption}>복사</button>
            </div>
            <p className="caption-first">{project.caption.seoFirstSentence}</p>
            <p>{project.caption.body}</p>
            <p className="caption-cta">
              {project.caption.saveCta}
              <br />
              {project.caption.shareCta}
              <br />
              {project.caption.commentCta}
            </p>
            <div className="hashtags">
              {project.caption.hashtags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          <section className="review">
            <h3>체크리스트</h3>
            <div className="checks">
              {project.reviewChecklist.map((item) => (
                <div className="check" key={item.name}>
                  <span>{item.passed ? "✓" : "!"}</span>
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <span>{label}</span>
      {children}
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function captionText(project: FactoryProject) {
  return [
    project.caption.seoFirstSentence,
    "",
    project.caption.body,
    "",
    project.caption.saveCta,
    project.caption.shareCta,
    project.caption.commentCta,
    "",
    project.caption.hashtags.join(" ")
  ].join("\n");
}
