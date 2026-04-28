"use client";

import { useMemo, useRef, useState } from "react";
import { createMockProject, projectToMarkdown, projectToJson, type FactoryProject } from "@/lib/cardnews";

const sampleTopic = "퍼스널 브랜딩이 2026년에 더 중요해지는 이유";

export default function HomePage() {
  const [mode, setMode] = useState<"topic" | "source">("topic");
  const [topic, setTopic] = useState(sampleTopic);
  const [source, setSource] = useState("");
  const [project, setProject] = useState<FactoryProject>(() => createMockProject(sampleTopic, "", "초기 샘플"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const deckRef = useRef<HTMLDivElement>(null);

  const markdown = useMemo(() => projectToMarkdown(project), [project]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, source, mode })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "생성에 실패했습니다.");
      setProject(data);
    } catch (err) {
      setError(String(err));
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

  async function exportPngs() {
    const htmlToImage = await import("html-to-image");
    const nodes = Array.from(deckRef.current?.querySelectorAll<HTMLElement>(".card-slide") || []);
    for (const [index, node] of nodes.entries()) {
      const dataUrl = await htmlToImage.toPng(node, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `slide_${String(index + 1).padStart(2, "0")}.png`;
      link.click();
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <aside className="control-panel">
          <div>
            <p className="eyebrow">Cardnews AI Factory</p>
            <h1>카드뉴스 자동화 공장</h1>
            <p className="lede">주제 하나를 8장 인스타그램 카드뉴스 기획서, 카피, 검토표, PNG로 바꿉니다.</p>
          </div>

          <div className="segmented">
            <button className={mode === "topic" ? "active" : ""} onClick={() => setMode("topic")}>주제</button>
            <button className={mode === "source" ? "active" : ""} onClick={() => setMode("source")}>원문</button>
          </div>

          {mode === "topic" ? (
            <label className="field">
              <span>카드뉴스 주제</span>
              <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={4} />
            </label>
          ) : (
            <label className="field">
              <span>원문 자료</span>
              <textarea value={source} onChange={(event) => setSource(event.target.value)} rows={10} placeholder="강의 자료, 블로그 글, PDF에서 추출한 텍스트를 붙여넣으세요." />
            </label>
          )}

          <button className="primary" disabled={busy} onClick={generate}>{busy ? "생성 중..." : "8장 카드뉴스 생성"}</button>
          {error ? <p className="error">{error}</p> : null}

          <div className="download-grid">
            <button onClick={() => downloadText("cardnews.json", projectToJson(project), "application/json;charset=utf-8")}>JSON</button>
            <button onClick={() => downloadText("slides.md", markdown)}>Markdown</button>
            <button onClick={() => downloadText("caption.md", captionText(project))}>Caption</button>
            <button onClick={exportPngs}>PNG 8장</button>
          </div>
        </aside>

        <section className="result-panel">
          <div className="brief-row">
            <Info label="타겟" value={project.brief.targetPersona} />
            <Info label="앵글" value={project.brief.contentAngle} />
            <Info label="CTA" value={project.brief.ctaStrategy} />
          </div>

          <div className="deck" ref={deckRef}>
            {project.slides.map((slide) => (
              <article className={`card-slide role-${slide.role.toLowerCase().replaceAll(" ", "-")}`} key={slide.slideNumber}>
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

          <section className="review">
            <h2>검토 체크리스트</h2>
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
        </section>
      </section>
    </main>
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
