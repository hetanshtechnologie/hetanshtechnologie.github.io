"""Quality checks for the Markdown chapter sources.

Run after the build script. Reports missing required sections, word counts, and
an estimated printed-page total. Exits non-zero if a structural problem is found.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "ebook"

EXPECTED = [
    "00-front.md",
    "01-agent-thinking.md",
    "02-building-safe-agents.md",
    "03-requirements-to-architecture.md",
    "04-api-mechanics.md",
    "05-designing-the-boundary.md",
    "06-guided-implementation.md",
    "07-working-in-the-repository.md",
    "08-diagnosis-and-evaluations.md",
    "09-models-tokens-cost.md",
    "10-instructions-and-context.md",
    "11-security-and-safety.md",
    "12-tool-use-and-connectors.md",
    "13-scenario-bank.md",
    "14-practice-papers.md",
    "15-capstones-and-final-review.md",
    "16-appendices.md",
]

CORE_SECTIONS = [
    "## Learning objectives",
    "## Key concepts",
    "## Worked scenario",
    "## Common mistakes",
    "## Chapter summary",
]
QUESTION_CHAPTERS = {"13-scenario-bank.md", "14-practice-papers.md"}


def words(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def check(path: Path) -> list[str]:
    problems: list[str] = []
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if not lines or not lines[0].startswith("# "):
        problems.append("missing H1 title on first line")
    number_match = re.match(r"# Chapter (\d+) — ", lines[0]) if lines else None
    if path.name != "00-front.md":
        if not number_match:
            problems.append("H1 does not use 'Chapter N — Title' form")
        else:
            chapter = int(number_match.group(1))
            if not text.rstrip().endswith(f"*End of chapter {chapter}.*"):
                problems.append(f"missing or wrong closing line for chapter {chapter}")
            if not re.search(r"\n---\n+\*End of chapter", text):
                problems.append("missing final horizontal rule")

    if path.name == "00-front.md":
        return problems

    if path.name not in QUESTION_CHAPTERS:
        for section in CORE_SECTIONS:
            if section not in text:
                problems.append(f"missing section: {section}")
        if "## Checkpoint questions" not in text:
            problems.append("missing checkpoint questions")
        if "### Answers and rationale" not in text:
            problems.append("missing answers and rationale")
        if len(re.findall(r"^\|", text, re.MULTILINE)) < 6:
            problems.append("fewer than two tables detected")
        if re.search(r"^```", text, re.MULTILINE) is None:
            problems.append("no fenced code block")
    if "> **" not in text:
        problems.append("no labelled callout blockquote")
    if words(text) < 2500 and path.name != "00-front.md":
        problems.append("chapter is unexpectedly short")
    return problems


def main() -> int:
    missing = [name for name in EXPECTED if not (SRC / name).exists()]
    if missing:
        print("MISSING FILES: " + ", ".join(missing))
        return 1

    total = 0
    failed = False
    for name in EXPECTED:
        path = SRC / name
        text = path.read_text(encoding="utf-8")
        count = words(text)
        total += count
        problems = check(path)
        status = "OK" if not problems else "CHECK"
        print(f"{status:5} {name:36} {count:6,} words")
        for problem in problems:
            failed = True
            print(f"        - {problem}")
    print(f"\nTotal: {total:,} words, approximately {max(1, round(total / 440))} printed pages.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
