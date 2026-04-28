from __future__ import annotations

import html
from pathlib import Path

from .models import CardnewsProject, Slide


def write_html_preview(project: CardnewsProject) -> Path:
    project.output_dir.mkdir(parents=True, exist_ok=True)
    html_text = render_html(project)
    path = project.output_dir / "index.html"
    path.write_text(html_text, encoding="utf-8")
    return path


def render_html(project: CardnewsProject) -> str:
    size = project.config.slide_size
    slides = "\n".join(render_slide(slide, project) for slide in project.slides)
    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(project.topic)}</title>
  <style>
    :root {{
      --primary: {project.config.primary_color};
      --ink: {project.config.secondary_color};
      --paper: #f7f3ea;
      --card: #ffffff;
      --muted: #667085;
      --w: {size["width"]}px;
      --h: {size["height"]}px;
      font-family: "{project.config.font_family}", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: #ece7dd;
      color: var(--ink);
      font-family: inherit;
    }}
    .preview {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      padding: 24px;
    }}
    .slide {{
      width: var(--w);
      height: var(--h);
      max-width: 100%;
      aspect-ratio: 1 / 1;
      background: var(--paper);
      padding: 64px;
      position: relative;
      overflow: hidden;
    }}
    .slide-inner {{
      width: 100%;
      height: 100%;
      background: var(--card);
      border: 3px solid var(--ink);
      border-radius: 28px;
      padding: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}
    .meta {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: var(--muted);
      font-size: 25px;
    }}
    .num {{ color: var(--primary); font-weight: 700; }}
    .copy {{ padding-top: 68px; }}
    h1 {{
      margin: 0 0 44px;
      font-size: 74px;
      line-height: 1.08;
      letter-spacing: 0;
      word-break: keep-all;
    }}
    p {{
      margin: 0;
      white-space: pre-line;
      font-size: 39px;
      line-height: 1.45;
      letter-spacing: 0;
      word-break: keep-all;
    }}
    .role {{
      display: inline-flex;
      width: fit-content;
      align-items: center;
      min-height: 74px;
      padding: 0 28px;
      border-radius: 12px;
      background: var(--primary);
      color: white;
      font-size: 27px;
      font-weight: 700;
    }}
    .hook h1 {{ font-size: 82px; }}
    .soft-cta .role,
    .hard-cta .role {{ background: var(--ink); }}
    @media screen and (max-width: 720px) {{
      .preview {{ grid-template-columns: 1fr; padding: 12px; }}
    }}
  </style>
</head>
<body>
  <main class="preview">
    {slides}
  </main>
</body>
</html>"""


def render_slide(slide: Slide, project: CardnewsProject) -> str:
    role_class = slide.role.lower().replace(" ", "-")
    return f"""<section class="slide {role_class}" id="slide-{slide.slide_number:02d}" data-slide="{slide.slide_number}">
  <div class="slide-inner">
    <div>
      <div class="meta">
        <span class="num">{slide.slide_number:02d} / 08</span>
        <span>{html.escape(project.config.brand_name)}</span>
      </div>
      <div class="copy">
        <h1>{html.escape(slide.headline)}</h1>
        <p>{html.escape(slide.body)}</p>
      </div>
    </div>
    <div class="role">{html.escape(slide.role)} · {html.escape(slide.visual_direction)}</div>
  </div>
</section>"""
