"use client";

import { useMemo, useRef, useState } from "react";
import { createMockProject, projectToJson, projectToMarkdown, type FactoryProject } from "@/lib/cardnews";

const sampleTopic = "퍼스널 브랜딩이 2026년에 더 중요해지는 이유";
const roles = ["Hook", "Setup", "Tension", "Insight", "Shift", "Proof", "Soft CTA", "Hard CTA"];

export default function HomePage() {
  const [mode, setMode] = useState<"topic" | "source">("topic");
  const [topic, setTopic] = useState(sampleTopic);
  const [source, setSource] = useState("");
  const [project, setProject] = useState<FactoryProject>(() => createMockProject(sampleTopic, "", "초기 샘플"));
  const [selectedSlide, setSelectedSlide] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deckRef = useRef<HTMLDivElement>(null);

  const markdown = useMemo(() => projectToMarkdown(project), [project]);
  const activeSlide = project.slides.find((slide) => slide.slideNumber === selectedSlide) ?? project.slides[0];
  const passedChecks = project.reviewChecklist.filter((item) => item.passed).length;

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ topic, source, mode })
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
        backgroundColor: "#f5f2ea"
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
        <div>
          <p className="eyebrow">Cardnews AI Factory</p>
          <h1>카드뉴스 자동화 공장</h1>
        </div>
        <div className="topbar-actions">
          <StatusPill label="Slides" value="8" />
          <StatusPill label="Review" value={`${passedChecks}/${project.reviewChecklist.length}`} />
          <StatusPill label="Mode" value={project.warnings[0]?.includes("mock") ? "Mock" : "AI"} />
        </div>
      </header>

      <section className="studio-grid">
        <aside className="panel input-panel">
          <div className="panel-head">
            <span className="step">01</span>
            <div>
              <h2>입력</h2>
              <p>주제 또는 원문을 넣고 카드뉴스 초안을 만듭니다.</p>
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
            <label className="field">
              <span>카드뉴스 주제</span>
              <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={4} />
            </label>
          ) : (
            <label className="field">
              <span>원문 자료</span>
              <textarea
                value={source}
                onChange={(event) => setSource(event.target.value)}
                rows={11}
                placeholder="강의 자료, 블로그 글, PDF에서 추출한 텍스트를 붙여넣으세요."
              />
            </label>
          )}

          <button className="primary" disabled={busy} onClick={generate}>
            {busy ? "생성 중..." : "8장 카드뉴스 생성"}
          </button>
          {error ? <p className="error">{error}</p> : null}

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
            <button onClick={() => downloadText("cardnews.json", projectToJson(project), "application/json;charset=utf-8")}>
              JSON
            </button>
            <button onClick={() => downloadText("slides.md", markdown)}>Markdown</button>
            <button onClick={() => downloadText("caption.md", captionText(project))}>Caption</button>
            <button onClick={exportPngs}>PNG 8장</button>
          </div>
        </aside>

        <section className="canvas-panel">
          <div className="brief-strip">
            <Info label="타겟" value={project.brief.targetPersona} />
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

          <section className="selected-slide">
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
