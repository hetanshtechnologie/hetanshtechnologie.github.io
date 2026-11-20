# Claude Certified Developer — Foundations (CCDV-F) Course

An original, independently written course companion for a foundations-level
exam on building applications with an LLM assistant, its API, and its developer
tooling.

## What is here

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page with the full table of contents |
| `ebook.html` | Single self-contained book — open it and print to PDF |
| `ebook.md` | Combined Markdown source (for pandoc / EPUB export) |
| `ccdv-f-course.pdf` | Print-ready PDF generated from the sources |
| `chapters/*.html` | One HTML page per chapter for web browsing |
| `course/*.md` | Chapter sources — **edit these**, not the generated files |
| `build_ebook.py` | Regenerates the HTML and Markdown outputs |
| `build_pdf.py` | Regenerates the PDF with reportlab |
| `CHAPTER_PLAN.md` | Authoring brief for every chapter |
| `STYLE_GUIDE.md` | Originality and formatting rules for contributors |

## Reading and exporting

- **Read online:** open `index.html`, then pick a chapter.
- **Read as one book:** open `ebook.html` — it has a cover, contents, and all
  30 chapters in a continuous document.
- **Read as PDF:** open `ccdv-f-course.pdf`.
- **Export to EPUB (optional):** with pandoc installed, run
  `pandoc ebook.md -o ccdv-f-course.epub --toc --toc-depth=2`.

## Regenerating the outputs

Python 3.10+ with `markdown` and `reportlab` installed:

```bash
pip install markdown reportlab
python build_ebook.py
python build_pdf.py
```

The scripts report the total word count and printed-page count. They overwrite
the generated files, so keep edits in `course/*.md` only.

## Originality policy

Every chapter was written from first principles. Chapter titles, ordering,
examples, explanations, scenarios, and questions are original to this project.
No instructor, author, or presenter names appear in the content. No lecture
recordings, transcripts, slides, or paid course materials were copied or closely
paraphrased. Product names are used only descriptively, and the guide claims no
affiliation with or endorsement from any vendor or certification body. The
disclaimer in `course/00-front.md` states this explicitly for readers.

Contributors must read `STYLE_GUIDE.md` before adding or editing content.
