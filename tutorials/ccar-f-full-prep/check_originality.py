"""Static checks that help keep the CCAR-F Full Prep course original.

This script is a helper, not a guarantee. Every reported hit should be reviewed
by a human. Run it from any directory:

    python check_originality.py

It scans the Markdown sources in course/ and reports:
  - chapters outside the target word-count range
  - missing required sections or incorrect first/last lines
  - lecture timings, lecture counts, and copied quiz labels
  - raw HTML tags and external links
  - likely person-name patterns (heuristic; review manually)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "course"

TARGETS: dict[str, tuple[int, int]] = {
    "00": (700, 1_100),
    "27": (4_000, 4_600),
    "28": (4_000, 4_600),
}
DEFAULT_TARGET = (2_950, 3_400)

REQUIRED_SECTIONS = [
    "## Learning objectives",
    "## Key concepts",
    "## Worked scenario",
    "## Common mistakes",
    "## Chapter summary",
    "## Checkpoint questions",
    "### Answers and rationale",
]

HONORIFICS = r"\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor|Sir|Dame)\.?\s+[A-Z][a-z]+"
NAME_PAIR = (
    r"\b(?:James|John|Robert|Michael|William|David|Richard|Joseph|Thomas|"
    r"Charles|Daniel|Matthew|Anthony|Mark|Donald|Steven|Andrew|Paul|Joshua|"
    r"Mary|Patricia|Jennifer|Linda|Elizabeth|Barbara|Susan|Jessica|Sarah|"
    r"Karen|Nancy|Lisa|Betty|Margaret|Sandra|Ashley|Dorothy|Kimberly|Emily|"
    r"Amy|Amanda|Ravi|Arjun|Priya|Anita|Snehal|Hetansh|Alex|Chris|Jordan|"
    r"Taylor|Morgan|Casey|Sam|Nick|Greg|Steve|Bill|Bob|Alice|Carol|Dave)\s+"
    r"[A-Z][a-z]+"
)

FORBIDDEN_PATTERNS = {
    "lecture timing": r"\b\d{1,2}:\d{2}\b|\b\d{1,2}h\s+\d{1,2}m\b",
    "copied lecture count": r"\b\d+\s+lectures?\b|\b\d+\s+sections?\b",
    "copied quiz label": r"^\s*Quiz\s*$",
    "bare quiz word": r"\bQuiz\b",
    "raw HTML tag": r"<[a-zA-Z][^>]*>",
    "external link": r"https?://",
}


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def main() -> int:
    paths = sorted(SRC.glob("*.md"))
    if not paths:
        print("No sources found in course/")
        return 1

    problems = 0
    warnings = 0

    for path in paths:
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        key = path.stem[:2]

        lo, hi = TARGETS.get(key, DEFAULT_TARGET)
        words = word_count(text)
        if not (lo <= words <= hi):
            print(f"[WORDS] {path.name}: {words} (target {lo}-{hi})")
            problems += 1

        if key != "00":
            expected_first = re.match(r"^# Chapter \d+ — .+", lines[0] if lines else "")
            if not expected_first:
                print(f"[TITLE] {path.name}: first line is not '# Chapter N — Title'")
                problems += 1

        for section in REQUIRED_SECTIONS:
            if key == "00":
                break
            if section not in text:
                print(f"[SECTION] {path.name}: missing '{section}'")
                problems += 1

        if key != "00":
            nonblank = [ln for ln in lines if ln.strip()]
            if nonblank[-2:] != ["---", f"*End of chapter {int(key)}.*"]:
                print(f"[ENDING] {path.name}: final lines are not the expected end marker")
                problems += 1

        for label, pattern in FORBIDDEN_PATTERNS.items():
            flags = re.MULTILINE if label == "copied quiz label" else 0
            matches = re.findall(pattern, text, flags)
            if matches:
                sample = ", ".join(str(m)[:40] for m in matches[:3])
                print(f"[{label.upper()}] {path.name}: {len(matches)} hit(s) — {sample}")
                problems += 1

        for label, pattern in (("honorific", HONORIFICS), ("name pair", NAME_PAIR)):
            matches = re.findall(pattern, text)
            if matches:
                sample = ", ".join(sorted(set(matches))[:5])
                print(f"[POSSIBLE {label.upper()}] {path.name}: {sample}")
                warnings += 1

    print()
    print(f"Scanned {len(paths)} source files.")
    print(f"Problems: {problems}   Manual-review warnings: {warnings}")
    print("A non-zero problem count does not prove infringement; review each hit.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
