# Claude Certified Associate Foundations (CCAO-F) Exam Guide

An original, independently written study guide for a foundations-level exam on
using an AI assistant effectively, accurately, and responsibly in business and
technical work.

## What is here

| Path | Purpose |
| --- | --- |
| `index.html` | Landing page with the full table of contents |
| `chapters/*.html` | One navigable HTML page per chapter — **edit these** |
| `ebook.html` | Single self-contained book — open it and print to PDF |
| `ccao-f-exam-guide.pdf` | Print-ready PDF of the full book |
| `styles.css` | Shared stylesheet, consistent with the other tutorial books |
| `build_ebook.py` | Rebuilds `index.html` and `ebook.html` from the chapter pages |
| `check_originality.py` | Scans chapter text for names, timings, and copied labels |
| `CHAPTER_PLAN.md` | Authoring brief with all twenty chapter assignments |
| `STYLE_GUIDE.md` | Originality and formatting rules for contributors |

## Reading and navigating

- **Start here:** open `index.html` and choose a chapter.
- **Page by page:** every chapter page has *Previous*, *Back to Index*, and
  *Next* links, matching the navigation used by the other tutorial books.
- **Read as one book:** open `ebook.html` for a continuous document with a
  cover, contents, and all 20 chapters.
- **PDF:** `ccao-f-exam-guide.pdf` is ready to read or print.
- **Marketplace:** the book is registered by
  `../../shop/add-ccao-f-exam-guide-to-marketplace.sql`. Run that script in the
  Supabase SQL Editor to make it appear in the marketplace with a link back to
  this tutorial.

## Regenerating the outputs

Python 3.10+ and the `markdown` package are required:

```bash
pip install markdown
python build_ebook.py
```

The script rewrites `index.html` and `ebook.html` from the chapter pages. It
does not modify chapter content, so keep edits in `chapters/*.html`. Chapter
content is delimited by `<!-- BOOK-CONTENT-START -->` and
`<!-- BOOK-CONTENT-END -->`; leave those markers in place.

## Checking originality

```bash
python check_originality.py
```

The checker strips HTML markup and scans the visible text of every chapter for
person-name patterns, copied lecture timings and counts, quiz labels, and
missing sections. Every hit should be reviewed manually.

## Originality policy

This guide was written from first principles. Chapter titles, ordering,
examples, explanations, scenarios, and questions are original to this project.
No instructor, author, or presenter names appear in the content. No lecture
recordings, transcripts, slides, or paid course materials were copied or closely
paraphrased. Product names are used only descriptively, and the guide claims no
affiliation with or endorsement from any vendor or certification body. The
disclaimer in the front-matter chapter states this explicitly for readers.

Contributors must read `STYLE_GUIDE.md` before adding or editing content.
