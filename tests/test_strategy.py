import unittest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from cardnews_factory.config import load_config
from cardnews_factory.pipeline import create_cardnews
from cardnews_factory.strategy import build_mock_brief, build_mock_caption, build_mock_slides


class FactoryTests(unittest.TestCase):
    def test_builds_eight_slide_story(self):
        config = load_config()
        brief = build_mock_brief("콘텐츠 루틴", "", config)
        slides = build_mock_slides(brief)

        self.assertEqual(len(slides), 8)
        self.assertEqual(slides[0].role, "Hook")
        self.assertEqual(slides[-1].role, "Hard CTA")
        self.assertFalse(slides[0].approved)

    def test_caption_hashtags_are_bounded(self):
        config = load_config()
        brief = build_mock_brief("퇴근 후 30분 콘텐츠 루틴", "", config)
        caption = build_mock_caption(brief, 8)

        self.assertGreaterEqual(len(caption.hashtags), 5)
        self.assertLessEqual(len(caption.hashtags), 12)
        self.assertTrue(all(tag.startswith("#") for tag in caption.hashtags))

    def test_pipeline_creates_required_files_without_png(self):
        project = create_cardnews("테스트 카드뉴스", output_root=__import__("pathlib").Path("output/test"), render_png=False)
        required = [
            "brief.json",
            "slides.json",
            "slides.md",
            "caption.md",
            "review_checklist.md",
            "index.html",
        ]
        for name in required:
            self.assertTrue((project.output_dir / name).exists(), name)


if __name__ == "__main__":
    unittest.main()
