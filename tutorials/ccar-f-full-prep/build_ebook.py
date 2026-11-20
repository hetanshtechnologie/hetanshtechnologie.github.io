"""Build the CCAR-F Full Prep course from its Markdown sources.

Outputs:
  ebook.html          one self-contained, print-ready book
  ebook.md            combined Markdown (usable with pandoc for EPUB/PDF)
  chapters/*.html     one page per chapter for browsing on GitHub Pages
  index.html          landing page with the table of contents

Run: python build_ebook.py
"""

from __future__ import annotations

import re
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "course"
CHAPTERS = ROOT / "chapters"

MD = markdown.Markdown(
    extensions=["extra", "tables", "fenced_code", "sane_lists", "toc"],
    extension_configs={"toc": {"permalink": False}},
)

PARTS = [
    "I — Foundations",
    "II — The Exam and the Layered Model",
    "III — The Agentic Layer",
    "IV — The Tool Layer",
    "V — The Workflow Layer",
    "VI — The Prompt Layer",
    "VII — The Context Layer",
    "VIII — Integration and Exam Practice",
    "IX — Applied Domains",
]

# Chapter number (1-based, excluding the front-matter file) -> part index.
CHAPTER_PARTS = {
    1: 0, 2: 0, 3: 0, 4: 0,
    5: 1, 6: 1,
    7: 2, 8: 2, 9: 2, 10: 2, 11: 2,
    12: 3, 13: 3, 14: 3, 15: 3,
    16: 4, 17: 4, 18: 4,
    19: 5, 20: 5, 21: 5,
    22: 6, 23: 6, 24: 6,
    25: 7, 26: 7, 27: 7, 28: 7,
    29: 8, 30: 8, 31: 8,
}

BOOK_TITLE = "Claude Certified Architect — Foundations (CCAR-F) Full Prep"
COVER_TITLE = (
    "Claude Certified Architect<br>Foundations (CCAR-F)<br>Full Prep"
)


def sources() -> list[Path]:
    return sorted(SRC.glob("*.md"))


def chapter_title(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem


def short_title(title: str) -> str:
    return re.sub(r"^Chapter \d+ — ", "", title)


def render(text: str) -> str:
    MD.reset()
    return MD.convert(text)


def word_count(paths: list[Path]) -> int:
    total = 0
    for path in paths:
        total += len(re.findall(r"\b[\w'-]+\b", path.read_text(encoding="utf-8")))
    return total


def shell(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="icon" type="image/png" sizes="32x32" href="../../images/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="../../images/favicon-16.png">
<link rel="apple-touch-icon" href="../../images/apple-touch-icon.png">
<style>
{EMBEDDED_CSS}
</style>
</head>
<body>
{body}
</body>
</html>
"""


def build_combined(paths: list[Path], words: int, pages: int) -> None:
    toc = "\n".join(
        f'<li><a href="#chapter-{i:02d}">Chapter {i:02d} &mdash; '
        f'{short_title(chapter_title(p))}</a></li>'
        for i, p in enumerate(paths)
        if i > 0
    )
    sections = []
    for i, p in enumerate(paths):
        sections.append(
            f'<section class="chapter" id="chapter-{i:02d}">'
            f"{render(p.read_text(encoding='utf-8'))}</section>"
        )
    body = f"""
<div class="cover">
  <p class="eyebrow">Independent full-prep course &middot; Original content</p>
  <h1>{COVER_TITLE}</h1>
  <p class="subtitle">A complete, reorganized preparation course in one volume</p>
  <p class="meta">{len(paths) - 1} chapters &middot; {words:,} words &middot; approximately {pages} printed pages</p>
  <p class="fineprint">Not affiliated with or endorsed by any certification body or vendor.</p>
</div>
<section class="chapter toc-page">
  <h1>Contents</h1>
  <ol class="book-toc">{toc}</ol>
</section>
{''.join(sections)}
<p class="colophon">End of the Claude Certified Architect Foundations Full Prep course.</p>
"""
    (ROOT / "ebook.html").write_text(
        shell(BOOK_TITLE, body), encoding="utf-8"
    )
    combined = "\n\n".join(p.read_text(encoding="utf-8").strip() for p in paths)
    (ROOT / "ebook.md").write_text(combined + "\n", encoding="utf-8")


def build_chapters(paths: list[Path]) -> None:
    CHAPTERS.mkdir(exist_ok=True)
    for i, p in enumerate(paths):
        title = chapter_title(p)
        prev_link = (
            f'<a href="{paths[i-1].stem}.html">&larr; Previous</a>'
            if i > 0
            else "<span></span>"
        )
        next_link = (
            f'<a href="{paths[i+1].stem}.html">Next &rarr;</a>'
            if i < len(paths) - 1
            else "<span></span>"
        )
        body = f"""
<div class="chapter">
  <a class="back" href="../">&larr; Back to the Full Prep Course</a>
  {render(p.read_text(encoding='utf-8'))}
  <nav>{prev_link}<span></span>{next_link}</nav>
</div>
"""
        (CHAPTERS / f"{p.stem}.html").write_text(
            shell(title, body), encoding="utf-8"
        )


def build_index(paths: list[Path], words: int, pages: int) -> None:
    grouped: dict[int, list[tuple[int, str]]] = {}
    for i, p in enumerate(paths):
        if i == 0:
            continue
        grouped.setdefault(CHAPTER_PARTS.get(i, 8), []).append(
            (i, chapter_title(p))
        )
    sections = []
    for key in sorted(grouped):
        heading = PARTS[key] if key < len(PARTS) else f"Part {key + 1}"
        links = "\n".join(
            f'<li><a href="chapters/{paths[i].stem}.html">{title}</a></li>'
            for i, title in grouped[key]
        )
        sections.append(f"<h2>{heading}</h2><ul class=\"toc\">{links}</ul>")
    body = f"""
<div class="chapter">
  <a href="../../" class="brand">Hetansh Technologie</a>
  <h1>{BOOK_TITLE}</h1>
  <p>An independent, original full-prep course with {words:,} words across approximately
  {pages} printed pages. Written from first principles; no course material is reproduced.</p>
  <p class="callout"><strong>Read online:</strong> choose a chapter below, or open the
  <a href="ebook.html">single-file ebook</a> and print it to PDF from your browser.</p>
  {''.join(sections)}
  <nav><span></span><a href="chapters/{paths[1].stem}.html">Start Reading &rarr;</a></nav>
</div>
"""
    (ROOT / "index.html").write_text(
        shell("CCAR-F Full Prep — Independent Study Course", body),
        encoding="utf-8",
    )


EMBEDDED_CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;background:#f2f4f8;color:#1f2937;line-height:1.65;padding:24px}
.chapter,.cover{max-width:860px;margin:0 auto 28px;background:#fff;border-radius:10px;padding:44px 52px;box-shadow:0 2px 14px rgba(30,41,59,.12)}
.cover{text-align:center;padding-top:90px;padding-bottom:90px}
.cover .eyebrow{font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.16em;font-size:.72rem;color:#4f46e5;margin-bottom:32px}
.cover h1{font-family:Arial,sans-serif;font-size:2.7rem;line-height:1.18;color:#312e81;border:0;padding:0;margin-bottom:24px}
.cover .subtitle{font-size:1.2rem;color:#4b5563;margin-bottom:36px}
.cover .meta{font-family:Arial,sans-serif;font-size:.9rem;color:#6b7280}
.cover .fineprint{font-family:Arial,sans-serif;font-size:.75rem;color:#9ca3af;margin-top:24px}
h1,h2,h3,h4{font-family:Arial,Helvetica,sans-serif;color:#312e81}
h1{font-size:1.95rem;line-height:1.25;margin-bottom:22px;border-bottom:3px solid #6366f1;padding-bottom:10px}
h2{font-size:1.4rem;margin:34px 0 12px}
h3{font-size:1.12rem;margin:24px 0 8px;color:#4338ca}
h4{font-size:1rem;margin:18px 0 6px}
p{margin-bottom:14px}
ul,ol{margin:10px 0 16px 26px}
li{margin-bottom:5px}
strong{color:#3730a3}
table{width:100%;border-collapse:collapse;margin:16px 0;font-family:Arial,sans-serif;font-size:.88rem}
th,td{border:1px solid #dbe2f0;padding:8px 11px;text-align:left;vertical-align:top}
th{background:#312e81;color:#fff;font-weight:600}
td{background:#fafbff}
pre{background:#1e2233;color:#e8ecf8;padding:15px 18px;border-radius:7px;overflow-x:auto;font-size:.82rem;margin:16px 0;tab-size:2}
code{background:#e8e9fb;padding:2px 5px;border-radius:4px;font-size:.86rem;color:#3730a3}
pre code{background:transparent;padding:0;color:inherit}
blockquote{background:#eef0ff;border-left:4px solid #6366f1;padding:11px 16px;margin:16px 0;border-radius:0 7px 7px 0;font-size:.92rem}
blockquote p{margin:0}
a{color:#4338ca}
nav{display:flex;justify-content:space-between;margin-top:34px;padding-top:16px;border-top:1px solid #dbe2f0;font-family:Arial,sans-serif;flex-wrap:wrap;gap:8px}
nav a{background:#312e81;color:#fff;padding:8px 18px;border-radius:6px;font-size:.86rem;text-decoration:none}
.book-toc{list-style:none;margin-left:0}
.book-toc li{padding:7px 0;border-bottom:1px solid #e6eaf5}
.back,.brand{font-family:Arial,sans-serif;font-size:.85rem;color:#4338ca;text-decoration:none;display:inline-block;margin-bottom:16px}
.callout{background:#eef0ff;border-left:4px solid #6366f1;padding:12px 16px}
.colophon{text-align:center;font-style:italic;color:#6b7280;margin:40px auto}
@media(max-width:600px){body{padding:10px}.chapter,.cover{padding:22px 18px}.cover h1{font-size:1.9rem}}
@media print{
  body{background:#fff;padding:0;line-height:1.5;font-size:10.5pt}
  .chapter,.cover{box-shadow:none;border-radius:0;max-width:none;margin:0;padding:0}
  .cover{page-break-after:always;min-height:90vh}
  .toc-page{page-break-after:always}
  .chapter{page-break-before:always}
  .cover+h1,.cover+h2{page-break-before:avoid}
  h1,h2,h3{page-break-after:avoid}
  table,pre,blockquote{page-break-inside:avoid}
  nav,.back,.brand{display:none}
  a{color:inherit;text-decoration:none}
}
"""


def main() -> None:
    paths = sources()
    if not paths:
        raise SystemExit("No Markdown sources found in course/")
    words = word_count(paths)
    # The print stylesheet uses 10.5pt type at full page width, which packs
    # roughly 518 words onto a page; this keeps the estimate realistic.
    pages = max(1, round(words / 518))
    build_combined(paths, words, pages)
    build_chapters(paths)
    build_index(paths, words, pages)
    print(f"Built {len(paths) - 1} chapters, {words:,} words, ~{pages} printed pages.")


if __name__ == "__main__":
    main()
