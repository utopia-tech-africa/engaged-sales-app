#!/usr/bin/env python3
"""
Convert docs/engaged-sales-product-guide.md to docs/engaged-sales-product-guide.pdf
using ReportLab (no browser / cairo). Tailored to this guide's Markdown patterns.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


# Must match SimpleDocTemplate horizontal margins in main().
PAGE_MARGIN_X = 18 * mm
USABLE_BODY_WIDTH_PT = A4[0] - 2 * PAGE_MARGIN_X


def inline_markup(text: str) -> str:
    """Escape for ReportLab Paragraph XML, then restore **bold** and `code`."""
    s = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r'<font name="Courier" size="9">\1</font>', s)
    return s


def is_table_separator(line: str) -> bool:
    stripped = line.strip().strip("|")
    if not stripped:
        return False
    parts = stripped.split("|")
    for p in parts:
        cell = p.strip()
        if cell == "":
            return False
        if not re.fullmatch(r":?-{3,}:?", cell):
            return False
    return True


def parse_table_row(line: str) -> list[str]:
    inner = line.strip()
    if inner.startswith("|"):
        inner = inner[1:]
    if inner.endswith("|"):
        inner = inner[:-1]
    return [c.strip() for c in inner.split("|")]


def build_story(md_path: Path) -> list:
    base = getSampleStyleSheet()
    body = ParagraphStyle(
        name="BodyJustified",
        parent=base["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    h1 = ParagraphStyle(
        name="GuideH1",
        parent=base["Heading1"],
        fontSize=18,
        leading=22,
        spaceAfter=10,
        spaceBefore=0,
    )
    h2 = ParagraphStyle(
        name="GuideH2",
        parent=base["Heading2"],
        fontSize=13,
        leading=16,
        spaceAfter=8,
        spaceBefore=14,
    )
    h3 = ParagraphStyle(
        name="GuideH3",
        parent=base["Heading3"],
        fontSize=11,
        leading=14,
        spaceAfter=6,
        spaceBefore=10,
    )
    table_header_style = ParagraphStyle(
        name="GuideTableHeader",
        parent=base["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        alignment=TA_LEFT,
        spaceAfter=0,
        spaceBefore=0,
    )
    table_body_style = ParagraphStyle(
        name="GuideTableBody",
        parent=base["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        alignment=TA_LEFT,
        spaceAfter=0,
        spaceBefore=0,
    )

    lines = md_path.read_text(encoding="utf-8").splitlines()
    story: list = []
    i = 0

    while i < len(lines):
        raw = lines[i]
        stripped = raw.strip()

        if stripped == "":
            i += 1
            continue

        if stripped == "---":
            story.append(Spacer(1, 8))
            i += 1
            continue

        if stripped.startswith("# "):
            story.append(Paragraph(inline_markup(stripped[2:].strip()), h1))
            i += 1
            continue

        if stripped.startswith("## "):
            story.append(Paragraph(inline_markup(stripped[3:].strip()), h2))
            i += 1
            continue

        if stripped.startswith("### "):
            story.append(Paragraph(inline_markup(stripped[4:].strip()), h3))
            i += 1
            continue

        if stripped.startswith("|"):
            table_lines: list[str] = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row = lines[i].strip()
                if is_table_separator(row):
                    i += 1
                    continue
                table_lines.append(row)
                i += 1
            if not table_lines:
                continue
            grid = [parse_table_row(row) for row in table_lines]
            col_count = max(len(r) for r in grid)
            for r in grid:
                while len(r) < col_count:
                    r.append("")
            # Fixed widths + Paragraph cells so long text wraps instead of clipping.
            col_widths = [USABLE_BODY_WIDTH_PT / col_count] * col_count
            wrapped_grid: list[list[Paragraph]] = []
            for row_idx, row in enumerate(grid):
                style = table_header_style if row_idx == 0 else table_body_style
                wrapped_grid.append(
                    [Paragraph(inline_markup(cell) if cell else " ", style) for cell in row]
                )
            tbl = Table(
                wrapped_grid,
                colWidths=col_widths,
                repeatRows=1,
                hAlign="LEFT",
            )
            tbl.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#111111")),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 5),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            story.append(Spacer(1, 4))
            story.append(tbl)
            story.append(Spacer(1, 8))
            continue

        if stripped.startswith("- "):
            bullet_items: list[ListItem] = []
            while i < len(lines):
                s = lines[i].strip()
                if not s.startswith("- "):
                    break
                bullet_items.append(
                    ListItem(Paragraph(inline_markup(s[2:].strip()), body), leftIndent=8)
                )
                i += 1
            story.append(
                ListFlowable(
                    bullet_items,
                    bulletType="bullet",
                    start="bulletchar",
                    leftPadding=18,
                )
            )
            story.append(Spacer(1, 6))
            continue

        if re.match(r"^\d+\.\s", stripped):
            numbered: list[ListItem] = []
            while i < len(lines):
                s = lines[i].strip()
                m = re.match(r"^\d+\.\s+(.*)$", s)
                if not m:
                    break
                numbered.append(ListItem(Paragraph(inline_markup(m.group(1)), body), leftIndent=8))
                i += 1
            story.append(
                ListFlowable(
                    numbered,
                    bulletType="1",
                    start="1",
                    leftPadding=22,
                )
            )
            story.append(Spacer(1, 6))
            continue

        para_lines: list[str] = []
        while i < len(lines):
            s = lines[i].strip()
            if s == "":
                break
            if (
                s.startswith("#")
                or s.startswith("|")
                or s.startswith("- ")
                or s == "---"
                or re.match(r"^\d+\.\s", s)
            ):
                break
            para_lines.append(lines[i].rstrip())
            i += 1
        if para_lines:
            merged = " ".join(para_lines)
            story.append(Paragraph(inline_markup(merged), body))

    return story


def main() -> int:
    root = repo_root()
    md_path = root / "docs" / "engaged-sales-product-guide.md"
    out_path = root / "docs" / "engaged-sales-product-guide.pdf"
    if not md_path.is_file():
        print(f"Missing source: {md_path}", file=sys.stderr)
        return 1

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=PAGE_MARGIN_X,
        rightMargin=PAGE_MARGIN_X,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="Engaged Sales — Product guide",
        author="Engaged Sales",
    )
    doc.build(build_story(md_path))
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
