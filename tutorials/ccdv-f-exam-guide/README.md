# Claude Certified Developer Foundations (CCDV-F) Exam Guide

An original, independently written study guide for a foundations-level exam on
building applications with an LLM assistant, its API, and its developer tooling.

## What is here

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page with the full table of contents |
| `ebook.html` | Single self-contained book — open it and print to PDF |
| `ebook.md` | Combined Markdown source (for pandoc / EPUB export) |
| `chapters/*.html` | One HTML page per chapter for web browsing |
| `ebook/*.md` | Chapter sources — **edit these**, not the generated files |
| `build_ebook.py` | Regenerates every generated file from the sources |
| `STYLE_GUIDE.md` | Originality and formatting rules for contributors |

## Reading and exporting

- **Read online:** open `index.html`, then pick a chapter. Each chapter page
  follows the same pattern as the other tutorials: site logo, *Back to Index*,
  and *Index / Previous / Next* links at the bottom. The shared feedback,
  access, text-to-speech, analytics, and progress scripts are loaded too, so
  reading progress is tracked under the `ccdv-f-exam-guide` tutorial slug.
- **Read as one book:** open `ebook.html`. It has a cover, contents, and all
  16 chapters in a continuous document.
- **Export to PDF:** open `ebook.html` in a browser, choose *Print*, set the
  destination to *Save as PDF*, enable background graphics, and save. The print
  stylesheet gives every chapter a fresh page.
- **Export to EPUB (optional):** with pandoc installed, run
  `pandoc ebook.md -o ccdv-f-guide.epub --toc --toc-depth=2`.

## Regenerating the outputs

Python 3.10+ and the `markdown` package are required:

```bash
pip install markdown
python build_ebook.py
```

The script reports the total word count and an estimated printed-page count.
It overwrites `ebook.html`, `ebook.md`, `index.html`, and everything in
`chapters/`, so keep edits in `ebook/*.md` only.

## Originality policy

This guide was written from first principles. Chapter titles, ordering,
examples, explanations, scenarios, and questions are original to this project.
No instructor, author, or presenter names appear in the content. No lecture
recordings, transcripts, slides, or paid course materials were copied or closely
paraphrased. Product names are used only descriptively, and the guide claims no
affiliation with or endorsement from any vendor or certification body. The
disclaimer in `ebook/00-front.md` states this explicitly for readers.

Contributors must read `STYLE_GUIDE.md` before adding or editing content.
