from __future__ import annotations

import argparse
import json
from pathlib import Path

from .pipeline import create_cardnews, create_from_batch, create_from_input_file, project_summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="카드뉴스 자동화 공장 CLI")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--topic", help="단일 카드뉴스 주제")
    source.add_argument("--input", type=Path, help="원문 텍스트 파일 경로")
    source.add_argument("--batch", type=Path, help="여러 주제를 담은 CSV 또는 JSON 파일")
    parser.add_argument("--config", type=Path, help="config.yaml 경로")
    parser.add_argument("--output", type=Path, default=Path("output"), help="산출물 저장 폴더")
    parser.add_argument("--no-png", action="store_true", help="PNG 렌더링 생략")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.topic:
        project = create_cardnews(
            topic=args.topic,
            config_path=args.config,
            output_root=args.output,
            render_png=not args.no_png,
        )
        print_summary([project])
        return 0
    if args.input:
        project = create_from_input_file(
            args.input,
            config_path=args.config,
            output_root=args.output,
            render_png=not args.no_png,
        )
        print_summary([project])
        return 0
    projects = create_from_batch(
        args.batch,
        config_path=args.config,
        output_root=args.output,
        render_png=not args.no_png,
    )
    print_summary(projects)
    return 0


def print_summary(projects) -> None:
    print(json.dumps([project_summary(project) for project in projects], ensure_ascii=False, indent=2))
