"""Build the CCDV-F Course ebook from its Markdown sources.

Outputs:
  ebook.html          one self-contained, print-ready book
  ebook.md            combined Markdown (usable with pandoc for EPUB/PDF)
  chapters/*.html     one page per chapter for browsing on GitHub Pages
  index.html          landing page with the table of contents
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


HEAD_SCRIPTS = """<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9334539225953790" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1RVMWL4SDK"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-1RVMWL4SDK');</script>"""


def shell(title: str, body: str, *, css_href: str | None = None,
          inline_css: str | None = None, scripts: str = "",
          imgroot: str = "../../") -> str:
    if css_href is not None:
        head_css = f'<link rel="stylesheet" href="{css_href}">'
    else:
        head_css = f"<style>\n{inline_css if inline_css is not None else EMBEDDED_CSS}\n</style>"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<link rel="icon" type="image/png" sizes="32x32" href="{imgroot}images/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="{imgroot}images/favicon-16.png">
<link rel="apple-touch-icon" href="{imgroot}images/apple-touch-icon.png">
{HEAD_SCRIPTS}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
{head_css}
</head>
<body>
{body}
{scripts}
</body>
</html>
"""


def site_header(depth: int) -> str:
    """Logo and back link used across the tutorial site.

    depth 1 = pages in tutorials/ccdv-f-course/, depth 2 = pages in chapters/.
    """
    to_root = "../" * (depth + 1)
    to_tutorials = "../" * depth
    return (
        f'<a href="{to_root}" class="site-logo"><img src="{to_root}images/logo.png" '
        f'alt="Hetansh Technologie"></a>\n'
        f'<a class="back" href="{to_tutorials}">&larr; Back to Tutorials</a>'
    )


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
<nav class="book-nav">
  <a href="index.html">&larr; Course Home</a>
  <a href="chapters/{paths[1].stem}.html">Start Reading</a>
  <a href="ccdv-f-course.pdf">Download PDF</a>
</nav>
<div class="cover">
  <p class="eyebrow">Independent course companion &middot; Original content</p>
  <h1>Claude Certified Developer<br>Foundations (CCDV-F)<br>Course</h1>
  <p class="subtitle">A complete, reorganized course in one volume</p>
  <p class="meta">30 chapters &middot; {words:,} words &middot; approximately {pages} printed pages</p>
  <p class="fineprint">Not affiliated with or endorsed by any certification body or vendor.</p>
</div>
<section class="chapter toc-page">
  <h1>Contents</h1>
  <ol class="book-toc">{toc}</ol>
</section>
{''.join(sections)}
<p class="colophon">End of the Claude Certified Developer Foundations Course.</p>
"""
    (ROOT / "ebook.html").write_text(
        shell("Claude Certified Developer Foundations (CCDV-F) Course", body,
              inline_css=EMBEDDED_CSS + EXTRA_CSS),
        encoding="utf-8",
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
            f'<a href="{paths[i+1].stem}.html">Next: {short_title(chapter_title(paths[i+1]))} &rarr;</a>'
            if i < len(paths) - 1
            else "<span></span>"
        )
        number = re.match(r"^Chapter (\d+)", title)
        tag = f'<span class="tag">Chapter {number.group(1)}</span>' if number else '<span class="tag">Front Matter</span>'
        body = f"""
<div class="chapter">
  {site_header(2)}
  {tag}
  {render(p.read_text(encoding='utf-8'))}
  <nav><a href="../index.html">&larr; Index</a>{prev_link}{next_link}</nav>
</div>
"""
        scripts = (
            '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n'
            '<script src="../../js/feedback.js"></script>\n'
            '<script src="../../js/access.js"></script>\n'
            '<script src="../../js/progress.js"></script>\n'
            '<script src="../../../js/analytics-tracker.js" defer></script>'
        )
        (CHAPTERS / f"{p.stem}.html").write_text(
            shell(title, body, css_href="../styles.css", scripts=scripts,
                  imgroot="../../../"),
            encoding="utf-8",
        )


PART_BY_CHAPTER = {
    1: 0, 2: 0, 3: 0,
    4: 1, 5: 1, 6: 1, 7: 1,
    8: 2, 9: 2,
    10: 3, 11: 3, 12: 3,
    13: 4, 14: 4, 15: 4, 16: 4,
    17: 5, 18: 5, 19: 5, 20: 5,
    21: 6, 22: 6, 23: 6, 24: 6,
    25: 7, 26: 7,
    27: 8, 28: 8, 29: 8,
    30: 9,
}


PARTS = [
    "I — Orientation",
    "II — Requests and Applications",
    "III — Data in Motion",
    "IV — Prompts and Output",
    "V — Tools and Connectors",
    "VI — Agents and Workflows",
    "VII — Models and Cost",
    "VIII — Tooling and Configuration",
    "IX — Quality and Security",
    "X — Exam Readiness",
]


def build_index(paths: list[Path], words: int, pages: int) -> None:
    grouped: dict[int, list[tuple[int, str]]] = {}
    for i, p in enumerate(paths):
        if i == 0:
            continue
        grouped.setdefault(PART_BY_CHAPTER.get(i, 0), []).append((i, chapter_title(p)))
    sections = []
    for key, items in grouped.items():
        heading = PARTS[key] if key < len(PARTS) else f"Part {key + 1}"
        links = "\n".join(
            f'<li><a href="chapters/{paths[i].stem}.html">{title}</a></li>'
            for i, title in items
        )
        sections.append(f"<h2>{heading}</h2><ul class=\"toc\">{links}</ul>")
    body = f"""
<div class="chapter">
  {site_header(1)}
  <span class="tag">Free Course</span>
  <h1>Claude Certified Developer Foundations (CCDV-F) Course</h1>
  <p>An independent, original course with {words:,} words across approximately
  {pages} printed pages. Written from first principles; no course material is reproduced.</p>
  <p class="callout"><strong>Read online:</strong> choose a chapter below, open the
  <a href="ebook.html">single-file ebook</a>, or download the
  <a href="ccdv-f-course.pdf">print-ready PDF</a>.</p>
  {''.join(sections)}
  <nav><span></span><a href="chapters/{paths[1].stem}.html">Start Reading &rarr;</a></nav>
</div>
"""
    scripts = (
        '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n'
        '<script src="../js/feedback.js"></script>\n'
        '<script src="../js/progress.js"></script>\n'
        '<script src="../../js/analytics-tracker.js" defer></script>'
    )
    (ROOT / "index.html").write_text(
        shell("CCDV-F Course — Independent Study Guide", body,
              css_href="styles.css", scripts=scripts),
        encoding="utf-8",
    )


EMBEDDED_CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;background:#f5f3ef;color:#24211d;line-height:1.65;padding:24px}
.chapter,.cover{max-width:860px;margin:0 auto 28px;background:#fff;border-radius:10px;padding:44px 52px;box-shadow:0 2px 14px rgba(60,50,40,.12)}
.cover{text-align:center;padding-top:90px;padding-bottom:90px}
.cover .eyebrow{font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.16em;font-size:.72rem;color:#9a5b2e;margin-bottom:32px}
.cover h1{font-family:Arial,sans-serif;font-size:2.7rem;line-height:1.18;color:#7c3a12;border:0;padding:0;margin-bottom:24px}
.cover .subtitle{font-size:1.2rem;color:#5d5148;margin-bottom:36px}
.cover .meta{font-family:Arial,sans-serif;font-size:.9rem;color:#8a7c70}
.cover .fineprint{font-family:Arial,sans-serif;font-size:.75rem;color:#9a8f85;margin-top:24px}
h1,h2,h3,h4{font-family:Arial,Helvetica,sans-serif;color:#7c3a12}
h1{font-size:1.95rem;line-height:1.25;margin-bottom:22px;border-bottom:3px solid #d97745;padding-bottom:10px}
h2{font-size:1.4rem;margin:34px 0 12px}
h3{font-size:1.12rem;margin:24px 0 8px;color:#a2471b}
h4{font-size:1rem;margin:18px 0 6px}
p{margin-bottom:14px}
ul,ol{margin:10px 0 16px 26px}
li{margin-bottom:5px}
strong{color:#6b2f0f}
table{width:100%;border-collapse:collapse;margin:16px 0;font-family:Arial,sans-serif;font-size:.88rem}
th,td{border:1px solid #e3cfbe;padding:8px 11px;text-align:left;vertical-align:top}
th{background:#7c3a12;color:#fff;font-weight:600}
td{background:#fffaf6}
pre{background:#251c17;color:#f4e6d8;padding:15px 18px;border-radius:7px;overflow-x:auto;font-size:.82rem;margin:16px 0;tab-size:2}
code{background:#f5e4d7;padding:2px 5px;border-radius:4px;font-size:.86rem;color:#7c3a12}
pre code{background:transparent;padding:0;color:inherit}
blockquote{background:#fff4e8;border-left:4px solid #d97745;padding:11px 16px;margin:16px 0;border-radius:0 7px 7px 0;font-size:.92rem}
blockquote p{margin:0}
a{color:#a2471b}
nav{display:flex;justify-content:space-between;margin-top:34px;padding-top:16px;border-top:1px solid #e3cfbe;font-family:Arial,sans-serif;flex-wrap:wrap;gap:8px}
nav a{background:#7c3a12;color:#fff;padding:8px 18px;border-radius:6px;font-size:.86rem;text-decoration:none}
.book-toc{list-style:none;margin-left:0}
.book-toc li{padding:7px 0;border-bottom:1px solid #eee2d6}
.back,.brand{font-family:Arial,sans-serif;font-size:.85rem;color:#a2471b;text-decoration:none;display:inline-block;margin-bottom:16px}
.callout{background:#fff4e8;border-left:4px solid #d97745;padding:12px 16px}
.colophon{text-align:center;font-style:italic;color:#8a7c70;margin:40px auto}
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


EXTRA_CSS = """
.site-logo{display:inline-flex;align-items:center;text-decoration:none;margin-bottom:14px}
.site-logo img{height:100px;width:auto;vertical-align:middle;border-radius:10px;object-fit:contain;position:relative;top:20px}
.tag{display:inline-block;background:#7c3a12;color:#fff;font-family:Arial,sans-serif;font-size:.72rem;font-weight:700;padding:4px 12px;border-radius:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
nav a:hover{text-decoration:underline;background:#fff4e8}
.book-nav{max-width:860px;margin:0 auto 18px;display:flex;justify-content:space-between;gap:10px;font-family:Arial,sans-serif;font-size:.85rem}
.book-nav a{background:#7c3a12;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none}
@media print{.site-logo,.book-nav,.tag,.back{display:none}}
"""


def main() -> None:
    paths = sources()
    if not paths:
        raise SystemExit("No Markdown sources found in course/")
    words = word_count(paths)
    # ~440 words per printed page at this book's type size, with additional
    # allowance for tables, code blocks, and chapter breaks.
    pages = max(1, round(words / 440))
    (ROOT / "styles.css").write_text(EMBEDDED_CSS + EXTRA_CSS, encoding="utf-8")
    build_combined(paths, words, pages)
    build_chapters(paths)
    build_index(paths, words, pages)
    print(f"Built {len(paths)} chapters, {words:,} words, ~{pages} printed pages.")


if __name__ == "__main__":
    main()
