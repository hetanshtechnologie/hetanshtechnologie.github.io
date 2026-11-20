"""Render the CCDV-F Course ebook to a print-ready PDF with reportlab.

The Markdown chapter sources in course/ are parsed with a small, purpose-built
converter so the PDF mirrors the HTML ebook without needing a browser.

Usage:  python build_pdf.py
Output: ccdv-f-course.pdf
"""

from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "course"
OUT = ROOT / "ccdv-f-course.pdf"

ACCENT = colors.HexColor("#7c3a12")
ACCENT_2 = colors.HexColor("#a2471b")
LIGHT = colors.HexColor("#fff4e8")
BORDER = colors.HexColor("#e3cfbe")

styles = getSampleStyleSheet()

S_TITLE = ParagraphStyle(
    "BookTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=26, leading=31, textColor=ACCENT, alignment=TA_CENTER,
    spaceAfter=14,
)
S_SUB = ParagraphStyle(
    "BookSub", parent=styles["Normal"], fontName="Helvetica",
    fontSize=13, leading=18, textColor=colors.HexColor("#5d5148"),
    alignment=TA_CENTER, spaceAfter=10,
)
S_META = ParagraphStyle(
    "BookMeta", parent=styles["Normal"], fontName="Helvetica",
    fontSize=9.5, leading=14, textColor=colors.HexColor("#8a7c70"),
    alignment=TA_CENTER,
)
S_FINE = ParagraphStyle(
    "BookFine", parent=styles["Normal"], fontName="Helvetica",
    fontSize=8, leading=12, textColor=colors.HexColor("#9a8f85"),
    alignment=TA_CENTER,
)
S_H1 = ParagraphStyle(
    "ChTitle", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=16, leading=20, textColor=ACCENT, spaceBefore=2, spaceAfter=12,
)
S_H2 = ParagraphStyle(
    "SecTitle", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12, leading=15, textColor=ACCENT, spaceBefore=14, spaceAfter=6,
)
S_H3 = ParagraphStyle(
    "SubTitle", parent=styles["Heading3"], fontName="Helvetica-Bold",
    fontSize=10, leading=13, textColor=ACCENT_2, spaceBefore=10, spaceAfter=4,
)
S_H4 = ParagraphStyle(
    "MinorTitle", parent=styles["Heading4"], fontName="Helvetica-Bold",
    fontSize=9.5, leading=12, textColor=ACCENT_2, spaceBefore=8, spaceAfter=3,
)
S_BODY = ParagraphStyle(
    "Body", parent=styles["BodyText"], fontName="Times-Roman",
    fontSize=9.4, leading=13.2, alignment=TA_LEFT, spaceAfter=6,
)
S_BULLET = ParagraphStyle(
    "Bullet", parent=S_BODY, leftIndent=14, bulletIndent=4, spaceAfter=3,
)
S_QUOTE = ParagraphStyle(
    "Quote", parent=S_BODY, fontName="Times-Italic", fontSize=9,
    leading=12.5, leftIndent=6,
)
S_CODE = ParagraphStyle(
    "Code", parent=styles["Code"], fontName="Courier", fontSize=7.8,
    leading=9.8, textColor=colors.HexColor("#f4e6d8"),
)
S_TABLE = ParagraphStyle(
    "Cell", parent=S_BODY, fontName="Helvetica", fontSize=7.6, leading=9.6,
    spaceAfter=0,
)
S_TABLE_H = ParagraphStyle(
    "CellH", parent=S_TABLE, fontName="Helvetica-Bold",
    textColor=colors.white,
)


def inline(text: str) -> str:
    """Escape XML then apply the small subset of inline Markdown we use."""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`", r'<font face="Courier" color="#7c3a12">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
    return text


def is_separator(line: str) -> bool:
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return bool(cells) and all(re.fullmatch(r":?-{2,}:?", c) for c in cells)


def parse_table(lines: list[str], start: int) -> tuple[Table, int]:
    rows: list[list[str]] = []
    i = start
    while i < len(lines) and lines[i].lstrip().startswith("|"):
        if not is_separator(lines[i]):
            cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
            rows.append([Paragraph(inline(c), S_TABLE_H if not rows else S_TABLE) for c in cells])
        i += 1
    ncols = max(len(r) for r in rows) if rows else 1
    for r in rows:
        while len(r) < ncols:
            r.append(Paragraph("", S_TABLE))
    t = Table(rows, colWidths=[(170 * mm) / ncols] * ncols, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fffaf6")]),
        ("GRID", (0, 0), (-1, -1), 0.4, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t, i


def parse_code(lines: list[str], start: int):
    i = start + 1
    buf: list[str] = []
    while i < len(lines) and not lines[i].lstrip().startswith("```"):
        buf.append(lines[i])
        i += 1
    body = "\n".join(buf).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    pre = Preformatted(body, S_CODE)
    inner = Table([[pre]], colWidths=[170 * mm])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#251c17")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return inner, i + 1


def render_markdown(text: str) -> list:
    lines = text.splitlines()
    story: list = []
    i = 0
    list_mode = None
    counter = 0

    def close_list() -> None:
        nonlocal list_mode, counter
        if list_mode is not None:
            story.append(Spacer(1, 4))
            list_mode = None
            counter = 0

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            close_list()
            i += 1
            continue

        if stripped.startswith("```"):
            close_list()
            node, i = parse_code(lines, i)
            story.append(node)
            story.append(Spacer(1, 6))
            continue

        if stripped.startswith("|") and i + 1 < len(lines) and lines[i + 1].lstrip().startswith("|"):
            close_list()
            node, i = parse_table(lines, i)
            story.append(node)
            story.append(Spacer(1, 6))
            continue

        if stripped.startswith("> "):
            close_list()
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(lines[i].strip().lstrip(">").strip())
                i += 1
            q = Paragraph("<br/>".join(inline(x) for x in quote_lines), S_QUOTE)
            box = Table([[q]], colWidths=[170 * mm])
            box.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("LINEBEFORE", (0, 0), (0, -1), 3, colors.HexColor("#d97745")),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(box)
            story.append(Spacer(1, 6))
            continue

        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            close_list()
            level = len(m.group(1))
            title = inline(m.group(2))
            style = {1: S_H1, 2: S_H2, 3: S_H3, 4: S_H4}[level]
            story.append(Paragraph(title, style))
            i += 1
            continue

        if stripped == "---":
            close_list()
            story.append(HRFlowable(width="100%", thickness=0.6, color=BORDER,
                                    spaceBefore=8, spaceAfter=8))
            i += 1
            continue

        m = re.match(r"^[-*]\s+(.*)$", stripped)
        if m:
            if list_mode != "bullet":
                close_list()
                list_mode = "bullet"
            story.append(Paragraph(inline(m.group(1)), S_BULLET, bulletText="\u2022"))
            i += 1
            continue

        m = re.match(r"^\d+\.\s+(.*)$", stripped)
        if m:
            if list_mode != "number":
                close_list()
                list_mode = "number"
                counter = 0
            counter += 1
            story.append(Paragraph(inline(m.group(1)), S_BULLET, bulletText=f"{counter}."))
            i += 1
            continue

        close_list()
        story.append(Paragraph(inline(stripped), S_BODY))
        i += 1

    close_list()
    return story


def chapter_title(path: Path) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem


def on_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#9a8f85"))
    canvas.drawString(20 * mm, 12 * mm, "Claude Certified Developer — Foundations (CCDV-F) Course")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, str(canvas.getPageNumber()))
    canvas.setStrokeColor(BORDER)
    canvas.line(20 * mm, 15 * mm, A4[0] - 20 * mm, 15 * mm)
    canvas.restoreState()


def main() -> None:
    paths = sorted(SRC.glob("*.md"))
    if not paths:
        raise SystemExit("No Markdown sources found in course/")

    doc = BaseDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=18 * mm, bottomMargin=20 * mm,
        title="Claude Certified Developer — Foundations (CCDV-F) Course",
        author="Independent study guide",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    doc.addPageTemplates([PageTemplate(id="book", frames=[frame], onPage=on_page)])

    story: list = []
    story.append(Spacer(1, 55 * mm))
    story.append(Paragraph("Claude Certified Developer", S_TITLE))
    story.append(Paragraph("Foundations (CCDV-F) Course", S_TITLE))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("A complete, independently written course companion", S_SUB))
    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph("30 chapters &middot; original content &middot; print-ready", S_META))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("Not affiliated with or endorsed by any certification body or vendor.", S_FINE))
    story.append(PageBreak())

    story.append(Paragraph("Contents", S_H1))
    story.append(Spacer(1, 4))
    for p in paths:
        story.append(Paragraph(inline(chapter_title(p)), S_BULLET))
    story.append(PageBreak())

    for idx, p in enumerate(paths):
        if idx > 0:
            story.append(PageBreak())
        story.extend(render_markdown(p.read_text(encoding="utf-8")))

    doc.build(story)
    print(f"Built {OUT.name}: {doc.page} pages from {len(paths)} chapters.")


if __name__ == "__main__":
    main()
