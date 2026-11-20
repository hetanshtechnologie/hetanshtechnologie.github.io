# Authoring standard for this ebook

Every chapter in this project is written **from scratch**. This file is the shared
contract for all contributors so the finished ebook reads like one book.

## Non-negotiable rules

1. **Original expression only.** Do not copy, paraphrase closely, or reproduce
   the wording, titles, metaphors, examples, or ordering of any third-party
   course, article, lecture, video, book, or outline. Technical facts are fine;
   the sentences explaining them must be written freshly for this project.
2. **Reorganized structure.** Do not follow the order of any source lecture list.
   Each file has its own chapter number and an original chapter title supplied in
   the brief. Subtopics are grouped by learning logic, not by the order in which
   they were presented anywhere else.
3. **No person names.** Do not mention authors, instructors, presenters,
   founders, named individuals, or named projects anywhere in the body. Use role
   names only ("a reviewer", "an analyst", "the exam candidate"). Product names
   may be used descriptively. Trademark holders may be named only in the legal
   disclaimer in `ebook/00-front.md`.
4. **No contact or promotional material.** Do not include invitations to connect
   on social networks, consultation offers, or calls to get in touch.
5. **No lecture timings, no lecture counts, no copied labels.** Use neutral
   labels such as "Checkpoint questions" or "Practice set". Do not use the word
   "Quiz" anywhere. Do not reproduce numeric durations such as `6:10` or counts
   such as "56 lectures" or "9 sections".
6. **No claims of endorsement, certification authority, or official status.**
   This is an independent study aid. The exam code in the title is descriptive.

## Audience and voice

- Reader: a business or technical professional preparing for a foundations-level
  exam on using an AI assistant effectively, accurately, and responsibly.
- Voice: calm, practical, exam-focused. Explain *why* a choice is correct, not
  only *which* choice is correct.
- Prefer concrete scenarios over abstract theory. Use short, realistic examples.

## Required Markdown features

- `# Chapter N — Title` as the first line (exact title given in the brief).
- `## Learning objectives` near the top, with a bullet list.
- `## Key concepts` — the main teaching body. Use `###` subsections.
- At least **two** tables where comparison helps.
- At least **one** fenced code block (`text`, `json`, `python`, or `bash`) where
  it aids understanding. Prompts may be shown in a fenced `text` block.
- Callouts written as blockquotes with a bold label, e.g.
  `> **Exam note:** ...`, `> **Common mistake:** ...`, `> **Try it:** ...`
- `## Worked scenario` — a realistic problem, reasoning, and resolution.
- `## Common mistakes` — short bullet list.
- `## Chapter summary` — bullet recap.
- `## Checkpoint questions` — 5 to 8 multiple-choice or short-answer questions,
  followed by `### Answers and rationale` with an explanation for every option.
- A final line `---` then `*End of chapter N.*`

## Length

Hit the word count in the brief as closely as possible. Depth matters more than
padding: prefer more explained examples, comparison tables, and answered
questions over repeated sentences.

## Formatting constraints for the build script

- Use standard Markdown only. No raw HTML.
- Use `-` for bullets and `1.` for numbered lists.
- Blank line before and after every list, table, code block, and callout.
- Do not use emoji. Do not use horizontal rules except the final `---`.
- Do not use links to external sites (the build script does not rewrite them).
- Do not use named people, named projects, contact details, or social handles.
