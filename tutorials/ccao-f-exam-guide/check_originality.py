"""Static checks that help keep the CCAO-F guide original and consistent.

This script is a helper, not a guarantee. Every reported hit should be reviewed
by a human. Run it from any directory:

    python check_originality.py

It reads the visible text of each chapter page in chapters/ and reports:
  - chapters outside the target word-count range
  - missing required sections
  - lecture timings, lecture counts, and copied quiz labels
  - likely person-name patterns (heuristic; review manually)
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHAPTERS = ROOT / "chapters"
START = "<!-- BOOK-CONTENT-START -->"
END = "<!-- BOOK-CONTENT-END -->"

TARGETS: dict[str, tuple[int, int]] = {
    "00": (700, 1_000),
    "17": (4_900, 5_500),
    "18": (5_500, 6_100),
}
DEFAULT_TARGET = (4_400, 5_000)

REQUIRED_SECTIONS = [
    "Learning objectives",
    "Key concepts",
    "Worked scenario",
    "Common mistakes",
    "Chapter summary",
    "Checkpoint questions",
    "Answers and rationale",
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
}


def visible_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    if START in raw and END in raw:
        raw = raw.split(START, 1)[1].split(END, 1)[0]
    raw = re.sub(r"<script.*?</script>", " ", raw, flags=re.DOTALL | re.IGNORECASE)
    raw = re.sub(r"<style.*?</style>", " ", raw, flags=re.DOTALL | re.IGNORECASE)
    raw = re.sub(r"<[^>]+>", " ", raw)
    return html.unescape(raw)


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text))


def main() -> int:
    paths = sorted(CHAPTERS.glob("*.html"))
    if not paths:
        print("No chapter pages found in chapters/")
        return 1

    problems = 0
    warnings = 0

    for path in paths:
        text = visible_text(path)
        key = path.stem[:2]

        lo, hi = TARGETS.get(key, DEFAULT_TARGET)
        words = word_count(text)
        if not (lo <= words <= hi):
            print(f"[WORDS] {path.name}: {words} (target {lo}-{hi})")
            problems += 1

        for section in REQUIRED_SECTIONS:
            if key == "00":
                break
            if section not in text:
                print(f"[SECTION] {path.name}: missing '{section}'")
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
    print(f"Scanned {len(paths)} chapter pages.")
    print(f"Problems: {problems}   Manual-review warnings: {warnings}")
    print("A non-zero problem count does not prove infringement; review each hit.")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
