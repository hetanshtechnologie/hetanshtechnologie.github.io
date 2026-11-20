# Authoring standard for this ebook

Every chapter in this project is written **from scratch**. This file is the shared
contract for all contributors so the finished course reads like one book.

## Non-negotiable rules

1. **Original expression only.** Do not copy, paraphrase closely, or reproduce the
   wording, titles, metaphors, examples, or ordering of any third-party course,
   article, lecture, video, or book. Technical facts are fine; the sentences
   explaining them must be written freshly for this project.
2. **No person names.** Do not mention authors, instructors, presenters, company
   founders, or named individuals anywhere in the body. Use role names only
   ("a reviewer", "an architect", "the exam candidate", "a team lead"). Product
   and framework names are used only as descriptive technical identifiers.
3. **Reorganized structure.** Do not follow any source lecture order. Each file
   has its own chapter number and an original chapter title supplied in the
   brief. Subtopics are grouped by learning logic, not by the order of any
   source list.
4. **No lecture timings, no lecture counts, no copied quiz labels.** Use neutral
   labels such as "Checkpoint questions" or "Practice set". Do not reproduce
   course section counts, lecture counts, or duration figures.
5. **No claims of endorsement, certification authority, or official status.**
   This is an independent study aid.

## Audience and voice

- Reader: a technical or business professional preparing for a foundations-level
  exam on architecting agentic systems with a Claude-based assistant.
- Voice: calm, practical, exam-focused. Explain *why* a choice is correct, not
  only *which* choice is correct.
- Prefer concrete scenarios over abstract theory. Use short, realistic examples.
- When a product name is unavoidable (for example, Claude Code, MCP, CLAUDE.md,
  or a skill), treat it as a descriptive identifier, not as branding.

## Required Markdown features

- `# Chapter N — Title` as the first line (exact title given in the brief).
- `## Learning objectives` near the top, with a bullet list.
- `## Key concepts` — the main teaching body. Use `###` subsections.
- At least **two** tables where comparison helps.
- At least **one** fenced code block (` ```python `, ` ```json `, ` ```bash `,
  or ` ```text `) where it aids understanding. Prompts and configurations may
  be shown in a fenced ` ```text ` block.
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
