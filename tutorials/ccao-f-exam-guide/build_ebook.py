"""Build the CCAO-F exam guide as navigable HTML pages.

The chapter pages in chapters/ are the source of truth. This script:
  1. On first run, migrates any legacy ebook/*.md sources into styled HTML
     chapter pages (then removes the Markdown sources).
  2. Rebuilds index.html from the chapter pages.
  3. Rebuilds ebook.html, a single self-contained, print-ready book.

Run: python build_ebook.py
"""

from __future__ import annotations

import html
import re
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "ebook"
CHAPTERS = ROOT / "chapters"

START = "<!-- BOOK-CONTENT-START -->"
END = "<!-- BOOK-CONTENT-END -->"

MD = markdown.Markdown(
    extensions=["extra", "tables", "fenced_code", "sane_lists", "toc"],
    extension_configs={"toc": {"permalink": False}},
)

PARTS = [
    "I — Orientation and the Exam",
    "II — Prompting Foundations",
    "III — Verification and Responsible Output",
    "IV — Models, Features, and Context",
    "V — Business Analysis and Workflow Design",
    "VI — Projects, Data, and Governance",
    "VII — Exam Practice",
    "VIII — Final Preparation",
]

CHAPTER_PARTS = {
    1: 0, 2: 0,
    3: 1, 4: 1, 5: 1,
    6: 2, 7: 2, 8: 2,
    9: 3, 10: 3,
    11: 4, 12: 4, 13: 4,
    14: 5, 15: 5, 16: 5,
    17: 6, 18: 6,
    19: 7, 20: 7,
}

BOOK_TITLE = "Claude Certified Associate Foundations (CCAO-F) Exam Guide"

def head(title: str, css: str, root: str) -> str:
    """Build a page head. `root` is the relative path to the repository root."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<link rel="icon" type="image/png" sizes="32x32" href="{root}images/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="{root}images/favicon-16.png">
<link rel="apple-touch-icon" href="{root}images/apple-touch-icon.png">
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="stylesheet" href="{css}">
</head>
<body>
"""


def tail(root: str, tutorials: str) -> str:
    return f"""  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="{tutorials}js/feedback.js"></script>
  <script src="{tutorials}js/access.js"></script>
  <script src="{tutorials}js/tts.js"></script>
  <script src="{root}js/analytics-tracker.js" defer></script>
  <script src="{tutorials}js/progress.js"></script>
</body>
</html>
"""


def brand(root: str) -> str:
    return f"""<a href="{root}" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none;margin-bottom:14px;"><img src="{root}images/logo.png" alt="Hetansh Technologie" style="height:100px;width:auto;vertical-align:middle;border-radius:10px;object-fit:contain;position:relative;top:20px;"></a>
<a href="../" style="display:inline-block;margin-bottom:12px;font-size:.9rem;color:#3b82f6;text-decoration:none;">&larr; Back to Tutorials</a>
"""


def render(text: str) -> str:
    MD.reset()
    return MD.convert(text)


def chapter_page(number: int, title: str, body: str, prev: Path | None, next_: Path | None) -> str:
    tag = "Front matter" if number == 0 else f"Chapter {number}"
    display = re.sub(r"^Chapter \d+ — ", "", title)
    nav_prev = f'<a href="{prev.name}">&larr; Previous</a>' if prev else "<span></span>"
    nav_next = f'<a href="{next_.name}">Next &rarr;</a>' if next_ else "<span></span>"
    return (
        head(f"{title} — CCAO-F Exam Guide", "../styles.css", "../../../")
        + '<div class="chapter">\n'
        + brand("../../../")
        + f'  <span class="tag">{tag}</span>\n'
        + f"  <h1>{html.escape(display)}</h1>\n"
        + f"  {START}\n{body}\n  {END}\n\n"
        + "  <nav>\n"
        + f"    {nav_prev}\n"
        + '    <a href="../index.html">Back to Index</a>\n'
        + f"    {nav_next}\n"
        + "  </nav>\n"
        + "</div>\n"
        + tail("../../../", "../../")
    )


def migrate() -> None:
    """Convert legacy Markdown sources into styled HTML chapter pages."""
    md_files = sorted(SRC.glob("*.md"))
    if not md_files:
        return

    CHAPTERS.mkdir(exist_ok=True)
    entries: list[tuple[str, str, str]] = []
    for path in md_files:
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        title = lines[0][2:].strip() if lines and lines[0].startswith("# ") else path.stem
        body = render("\n".join(lines[1:]).strip())
        entries.append((path.stem, title, body))

    for i, (stem, title, body) in enumerate(entries):
        number = int(stem[:2])
        prev = Path(entries[i - 1][0] + ".html") if i > 0 else None
        next_ = Path(entries[i + 1][0] + ".html") if i < len(entries) - 1 else None
        (CHAPTERS / f"{stem}.html").write_text(
            chapter_page(number, title, body, prev, next_), encoding="utf-8"
        )

    for path in md_files:
        path.unlink()
    if not any(SRC.iterdir()):
        SRC.rmdir()
    for legacy in (ROOT / "ebook.md",):
        if legacy.exists():
            legacy.unlink()
    print(f"Migrated {len(entries)} Markdown sources into HTML chapter pages.")


def load_chapters() -> list[tuple[Path, str, str]]:
    result = []
    for path in sorted(CHAPTERS.glob("*.html")):
        text = path.read_text(encoding="utf-8")
        title_match = re.search(r"<title>(.*?)</title>", text, re.DOTALL)
        title = html.unescape(title_match.group(1)) if title_match else path.stem
        title = re.sub(r"\s+—\s+CCAO-F Exam Guide\s*$", "", title)
        if START in text and END in text:
            body = text.split(START, 1)[1].split(END, 1)[0].strip()
        else:
            body = text
        result.append((path, title, body))
    return result


def refresh_chapters(chapters: list[tuple[Path, str, str]]) -> None:
    """Rewrite chapter shells from their current content and titles."""
    for i, (path, title, body) in enumerate(chapters):
        prev = Path(chapters[i - 1][0].name) if i > 0 else None
        next_ = Path(chapters[i + 1][0].name) if i < len(chapters) - 1 else None
        path.write_text(
            chapter_page(int(path.stem[:2]), title, body, prev, next_),
            encoding="utf-8",
        )


def build_index(chapters: list[tuple[Path, str, str]]) -> None:
    grouped: dict[int, list[tuple[int, str, Path]]] = {}
    for path, title, _ in chapters:
        number = int(path.stem[:2])
        if number == 0:
            continue
        grouped.setdefault(CHAPTER_PARTS.get(number, 7), []).append((number, title, path))

    sections = []
    for key in sorted(grouped):
        heading = PARTS[key] if key < len(PARTS) else f"Part {key + 1}"
        links = "\n".join(
            f'      <li><a href="chapters/{path.name}">{html.escape(label)}</a></li>'
            for number, title, path in grouped[key]
            for label in [title if title.startswith("Chapter ") else f"Chapter {number} — {title}"]
        )
        sections.append(f'    <h2>{heading}</h2>\n    <ul class="toc">\n{links}\n    </ul>')

    front = chapters[0][2] if chapters else ""
    count = len(chapters) - 1
    body = (
        '<div class="chapter">\n'
        + brand("../../")
        + f"  <h1>{BOOK_TITLE}</h1>\n"
        + '  <p class="intro">An independent, original study guide with '
        + f"{count} chapters. Written from first principles; no course material is reproduced.</p>\n"
        + '  <p class="note"><strong>Read online:</strong> choose a chapter below, or open the '
        + '<a href="ebook.html">single-file ebook</a> and print it to PDF from your browser.</p>\n'
        + "\n".join(sections)
        + "\n\n  <nav>\n"
        + f'    <a href="chapters/{chapters[0][0].name}">Front Matter</a>\n'
        + f'    <a href="chapters/{chapters[1][0].name}">Start Reading &rarr;</a>\n'
        + "  </nav>\n"
        + "</div>\n"
    )
    (ROOT / "index.html").write_text(
        head("CCAO-F Exam Guide — Independent Study Guide", "styles.css", "../../")
        + body
        + tail("../../", "../"),
        encoding="utf-8",
    )


PRINT_CSS = """
@media print{
  body{background:#fff;padding:0;line-height:1.38;font-size:9.5pt}
  .chapter,.cover{box-shadow:none;border-radius:0;max-width:none;margin:0;padding:0}
  .cover{page-break-after:always;min-height:90vh}
  .toc-page{page-break-after:always}
  .chapter{page-break-before:always}
  h1{font-size:1.6rem;margin-bottom:14px;padding-bottom:8px}
  h2{font-size:1.2rem;margin:20px 0 8px}
  h3{font-size:1.02rem;margin:14px 0 6px}
  h1,h2,h3{page-break-after:avoid}
  p{margin-bottom:9px}
  ul,ol{margin:6px 0 10px 22px}
  li{margin-bottom:3px}
  table,pre,blockquote{page-break-inside:avoid;font-size:.85em}
  th,td{padding:5px 8px}
  pre{padding:10px 12px;margin:10px 0}
  blockquote{padding:8px 12px;margin:10px 0}
  nav,.back,.brand,img[alt="Hetansh Technologie"]{display:none}
  a{color:inherit;text-decoration:none}
}
"""


def build_combined(chapters: list[tuple[Path, str, str]]) -> None:
    css = (ROOT / "styles.css").read_text(encoding="utf-8") + PRINT_CSS
    toc = "\n".join(
        f'<li><a href="#chapter-{int(path.stem[:2]):02d}">{html.escape(title)}</a></li>'
        for path, title, _ in chapters
        if int(path.stem[:2]) > 0
    )
    sections = "\n".join(
        f'<section class="chapter" id="chapter-{int(path.stem[:2]):02d}">{body}</section>'
        for path, _, body in chapters
    )
    body = f"""
<div class="cover" style="text-align:center;padding:80px 20px;">
  <p class="tag">Independent study guide &middot; Original content</p>
  <h1 style="border:none;">Claude Certified Associate<br>Foundations (CCAO-F)<br>Exam Guide</h1>
  <p class="intro">A complete, reorganized preparation course in one volume</p>
  <p style="font-size:.85rem;color:#64748b;">{len(chapters) - 1} chapters &middot; Not affiliated with or endorsed by any certification body or vendor.</p>
</div>
<section class="chapter toc-page">
  <h1>Contents</h1>
  <ul class="toc">{toc}</ul>
</section>
{sections}
"""
    (ROOT / "ebook.html").write_text(
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
        f"<title>{BOOK_TITLE}</title>\n<style>\n{css}\n</style>\n</head>\n<body>\n"
        + body
        + "\n</body>\n</html>\n",
        encoding="utf-8",
    )


def main() -> None:
    migrate()
    chapters = load_chapters()
    if not chapters:
        raise SystemExit("No chapter pages found in chapters/")
    refresh_chapters(chapters)
    chapters = load_chapters()
    build_index(chapters)
    build_combined(chapters)
    print(f"Built index.html, ebook.html and {len(chapters)} chapter pages.")


if __name__ == "__main__":
    main()
