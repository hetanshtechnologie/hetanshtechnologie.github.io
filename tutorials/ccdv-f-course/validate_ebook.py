"""Validate the CCDV-F Course chapter sources against the authoring standard."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "course"

REQUIRED = [
    "## Learning objectives",
    "## Key concepts",
    "## Practice lab",
    "## Worked scenario",
    "## Common mistakes",
    "## Chapter summary",
    "## Checkpoint questions",
    "### Answers and rationale",
    "*End of chapter",
]

# Patterns that would reveal a named individual or copied lecture metadata.
FORBIDDEN = [
    r"\b(?:Dr|Prof|Professor|Mr|Mrs|Ms)\.?\s+[A-Z][a-z]+",
    r"\blecture\s+\d+\b",
    r"\b\d{1,2}:\d{2}\b",
    r"\bquiz\b",
]


def main() -> None:
    paths = sorted(SRC.glob("*.md"))
    problems: list[str] = []
    total = 0

    for p in paths:
        if p.stem.startswith("00-"):
            continue
        text = p.read_text(encoding="utf-8")
        words = len(re.findall(r"\b[\w'-]+\b", text))
        total += words

        first = next((l for l in text.splitlines() if l.strip()), "")
        if not re.match(r"^# Chapter \d+ — ", first):
            problems.append(f"{p.name}: bad first line: {first[:60]!r}")

        for section in REQUIRED:
            if section not in text:
                problems.append(f"{p.name}: missing '{section}'")

        if text.count("|") < 12:
            problems.append(f"{p.name}: fewer than two tables worth of pipe characters")

        if "```" not in text:
            problems.append(f"{p.name}: no fenced code block")

        if not re.search(r"> \*\*[A-Za-z ]+:\*\*", text):
            problems.append(f"{p.name}: no bold-label callout")

        for pattern in FORBIDDEN:
            m = re.search(pattern, text, flags=re.IGNORECASE)
            if m:
                problems.append(f"{p.name}: forbidden pattern {pattern!r} -> {m.group(0)!r}")

        target_lo, target_hi = (3000, 4000) if p.stem.startswith("30") else (2500, 4000)
        if not (target_lo <= words <= target_hi):
            problems.append(f"{p.name}: {words} words (target {target_lo}-{target_hi})")

    print(f"Checked {len(paths)} files, {total:,} words, ~{round(total / 440)} printed pages.")
    if problems:
        print(f"{len(problems)} issue(s):")
        for item in problems:
            print(f"  - {item}")
    else:
        print("All checks passed.")


if __name__ == "__main__":
    main()
