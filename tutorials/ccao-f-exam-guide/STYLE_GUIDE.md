# Authoring standard for this ebook

Every chapter in this project is written **from scratch**. This file is the shared
contract for all contributors so the finished ebook reads like one book.

## Non-negotiable rules

1. **Original expression only.** Do not copy, paraphrase closely, or reproduce
   the wording, titles, metaphors, examples, or ordering of any third-party
   course, article, lecture, video, or book. Technical facts are fine; the
   sentences explaining them must be written freshly for this project.
2. **No person names.** Do not mention authors, instructors, presenters,
   company founders, or named individuals anywhere in the body. Use role names
   only ("a reviewer", "an analyst", "the exam candidate"). Trademark holders
   may be named only in the legal disclaimer in the front-matter chapter.
3. **Reorganized structure.** Do not follow any source lecture order. Each file
   has its own chapter number and an original chapter title supplied in the
   brief. Subtopics are grouped by learning logic, not by the order of any
   source list.
4. **No lecture timings, no lecture counts, no copied quiz labels.** Use neutral
   labels such as "Checkpoint questions" or "Practice set".
5. **No claims of endorsement, certification authority, or official status.**
   This is an independent study aid.

## Audience and voice

- Reader: a business or technical professional preparing for a foundations-level
  exam on using an AI assistant effectively and responsibly.
- Voice: calm, practical, exam-focused. Explain *why* a choice is correct, not
  only *which* choice is correct.
- Prefer concrete scenarios over abstract theory. Use short, realistic examples.

## Required page features

- The exact chapter title from the brief in the page `<title>` and `<h1>`.
- Keep chapter content between `<!-- BOOK-CONTENT-START -->` and
  `<!-- BOOK-CONTENT-END -->` so the combined book can be rebuilt.
- An `<h2>` called `Learning objectives` near the top, with a bullet list.
- An `<h2>` called `Key concepts` — the main teaching body, with `<h3>` subsections.
- At least **two** tables where comparison helps.
- At least **one** `<pre><code>` block where it aids understanding. Prompts may
  be shown in a plain-text block.
- Callouts written as `<blockquote>` elements with a bold label, e.g.
  **Exam note:**, **Common mistake:**, **Try it:**
- An `<h2>` called `Worked scenario` — a realistic problem, reasoning, resolution.
- An `<h2>` called `Common mistakes` — short bullet list.
- An `<h2>` called `Chapter summary` — bullet recap.
- An `<h2>` called `Checkpoint questions` — 5 to 8 questions, followed by an
  `<h3>` called `Answers and rationale` with an explanation for every option.
- A final `<hr>` then `<em>End of chapter N.</em>`

## Length

Hit the word count in the brief as closely as possible. Depth matters more than
padding: prefer more explained examples, comparison tables, and answered
questions over repeated sentences.

## Formatting constraints

- Use semantic HTML tags (`h2`, `h3`, `p`, `ul`, `ol`, `table`, `pre`, `code`,
  `blockquote`, `strong`, `em`, `hr`). Do not add inline styles or scripts to
  chapter bodies.
- The shared `styles.css` supplies the visual design; do not duplicate it.
- Do not use emoji. Do not use horizontal rules except the final one.
- Do not add links to external sites inside chapter content.
