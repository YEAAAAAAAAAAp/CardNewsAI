from __future__ import annotations

import asyncio
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .models import CardnewsProject, Slide


def render_pngs(project: CardnewsProject, html_path: Path) -> list[Path]:
    png_dir = project.output_dir / "png"
    png_dir.mkdir(parents=True, exist_ok=True)
    try:
        return asyncio.run(render_with_playwright(project, html_path, png_dir))
    except Exception as exc:
        project.warnings.append(f"Playwright 렌더링 실패, PIL 폴백 사용: {exc}")
        return render_with_pillow(project, png_dir)


async def render_with_playwright(project: CardnewsProject, html_path: Path, png_dir: Path) -> list[Path]:
    from playwright.async_api import async_playwright  # type: ignore

    size = project.config.slide_size
    rendered: list[Path] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": size["width"], "height": size["height"]})
        await page.goto(html_path.resolve().as_uri())
        await page.add_style_tag(
            content=f"""
            .preview {{
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
            }}
            .slide {{
              width: {size["width"]}px !important;
              height: {size["height"]}px !important;
              max-width: none !important;
              margin: 0 !important;
            }}
            """
        )
        for slide in project.slides:
            locator = page.locator(f"#slide-{slide.slide_number:02d}")
            path = png_dir / f"slide_{slide.slide_number:02d}.png"
            await locator.screenshot(path=str(path))
            rendered.append(path)
        await browser.close()
    return rendered


def render_with_pillow(project: CardnewsProject, png_dir: Path) -> list[Path]:
    rendered: list[Path] = []
    for slide in project.slides:
        rendered.append(render_slide_with_pillow(project, slide, png_dir))
    return rendered


def render_slide_with_pillow(project: CardnewsProject, slide: Slide, png_dir: Path) -> Path:
    width = project.config.slide_size["width"]
    height = project.config.slide_size["height"]
    primary = project.config.primary_color
    ink = project.config.secondary_color
    paper = "#F7F3EA"
    image = Image.new("RGB", (width, height), paper)
    draw = ImageDraw.Draw(image)
    title_font = load_font(66 if len(slide.headline) > 24 else 72)
    body_font = load_font(36)
    small_font = load_font(26)

    margin = 64
    draw.rounded_rectangle((margin, margin, width - margin, height - margin), radius=28, fill="white", outline=ink, width=3)
    draw.text((margin + 48, margin + 44), f"{slide.slide_number:02d} / 08", fill=primary, font=small_font)
    draw.text((width - margin - 330, margin + 44), project.config.brand_name, fill="#667085", font=small_font)
    title_bottom = draw_wrapped(draw, slide.headline, margin + 48, 230, title_font, ink, 13, 12)
    body_y = max(440, title_bottom + 42)
    draw_wrapped(draw, slide.body, margin + 48, body_y, body_font, ink, 24, 16)
    draw.rounded_rectangle((margin + 48, height - margin - 118, width - margin - 48, height - margin - 34), radius=12, fill=primary)
    label = f"{slide.role} · {slide.visual_direction}"
    draw_wrapped(draw, label, margin + 74, height - margin - 95, small_font, "white", 34, 4)
    path = png_dir / f"slide_{slide.slide_number:02d}.png"
    image.save(path)
    return path


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    text: str,
    x: int,
    y: int,
    font: ImageFont.ImageFont,
    fill: str,
    width: int,
    line_gap: int,
) -> int:
    lines: list[str] = []
    for raw in text.splitlines():
        lines.extend(textwrap.wrap(raw, width=width) or [""])
    line_height = font.getbbox("가")[3] - font.getbbox("가")[1]
    for line in lines:
        draw.text((x, y), line, fill=fill, font=font)
        y += line_height + line_gap
    return y


def load_font(size: int) -> ImageFont.ImageFont:
    for font_path in [
        "C:/Windows/Fonts/malgun.ttf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]:
        if Path(font_path).exists():
            return ImageFont.truetype(font_path, size=size)
    return ImageFont.load_default()
