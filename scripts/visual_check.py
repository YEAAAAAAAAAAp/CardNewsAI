from __future__ import annotations

from playwright.sync_api import sync_playwright


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 1100}, device_scale_factor=1)
        page.goto("http://127.0.0.1:3000", wait_until="networkidle")
        page.screenshot(path="output/ui-review-desktop.png", full_page=True)
        issues = page.evaluate(
            """
            () => {
              const els = Array.from(document.querySelectorAll('h1,h2,h3,p,button,textarea,.card-slide,.panel,.info'));
              const viewportW = window.innerWidth;
              const bad = [];
              for (const el of els) {
                const r = el.getBoundingClientRect();
                if (r.width > viewportW + 1) bad.push({ text: (el.textContent || '').slice(0, 50), width: r.width, viewportW });
                if (r.height === 0 && (el.textContent || '').trim()) bad.push({ text: (el.textContent || '').slice(0, 50), zeroHeight: true });
              }
              return bad;
            }
            """
        )
        print({"title": page.title(), "issues": issues})
        mobile = browser.new_page(viewport={"width": 390, "height": 1200}, device_scale_factor=2)
        mobile.goto("http://127.0.0.1:3000", wait_until="networkidle")
        mobile.screenshot(path="output/ui-review-mobile.png", full_page=True)
        browser.close()


if __name__ == "__main__":
    main()
