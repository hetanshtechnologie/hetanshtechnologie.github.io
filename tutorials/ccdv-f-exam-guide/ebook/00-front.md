# Claude Certified Developer Foundations (CCDV-F) Exam Guide

## An independent, original study guide

This book is a self-contained preparation aid for a foundations-level exam on
designing and building applications with a large-language-model assistant, its
API, and its developer tooling. It is written to be read cover to cover, to be
used as a reference during revision, and to be printed or exported as a PDF.

> **Important:** This is an independent, original study guide. It is not
> affiliated with, sponsored by, endorsed by, or approved by any certification
> body, cloud provider, or AI vendor. It does not reproduce, summarize, or
> replace any paid course, lecture recording, or official training material.
> Every chapter was written from first principles for this project. The exam
> code used in the title is used descriptively; no official status is claimed.

> **Trademarks:** "Claude" and other product names mentioned in this book are
> trademarks of their respective owners. They are used only for identification
> and explanation. No affiliation or endorsement is implied.

## How this book is organized

The material has been deliberately arranged in a different order from typical
lecture lists, so that ideas build on one another:

| Part | Chapters | What you will be able to do |
| --- | --- | --- |
| I — Agent Thinking | 1–2 | Explain when an agent is the right shape, and build a safe agent loop |
| II — From Request to Running Service | 3–6 | Turn a vague request into an architecture and ship it through the API |
| III — Developer Workflow | 7 | Use an AI coding assistant effectively inside a repository |
| IV — Quality and Diagnosis | 8 | Find, measure, and fix failures with traces, grades, and evaluations |
| V — Models, Tokens, and Cost | 9 | Choose a model and control latency, context, and spend |
| VI — Prompting and Context | 10 | Write instructions that behave predictably and feed the model well |
| VII — Security and Safety | 11 | Threat-model an AI application and apply guardrails |
| VIII — Tool Use and Connectors | 12 | Connect the model to external capabilities safely |
| IX — Exam Practice | 13–14 | Work through scenarios and two full practice papers |
| X — Final Preparation | 15–16 | Consolidate with capstone projects and last-minute checklists |

## How to use each chapter

Each chapter follows the same rhythm:

1. **Learning objectives** tell you what should be different after reading.
2. **Key concepts** carry the explanation, with tables and code where useful.
3. **Worked scenario** models the reasoning an exam question is testing.
4. **Common mistakes** flags the traps that appear in distractor options.
5. **Chapter summary** gives you a revision sheet.
6. **Checkpoint questions** let you test yourself immediately; every answer has
   a rationale, including why the other options are wrong.

A suggested approach: read the objectives, skim the summary, read the chapter,
then answer the checkpoint questions without looking at the answers. Write down
any option you got wrong and revisit it the next day.

## Exam preparation plan

A realistic eight-week plan for a working developer:

| Week | Focus | Chapters |
| --- | --- | --- |
| 1 | Agent concepts and boundaries | 1–2 |
| 2 | Requirements, API, and design | 3–6 |
| 3 | Developer tooling | 7 |
| 4 | Debugging and evaluations | 8 |
| 5 | Models, cost, prompting, context | 9–10 |
| 6 | Security and tool connectors | 11–12 |
| 7 | Scenario practice and practice papers | 13–14 |
| 8 | Capstones, review, and exam simulation | 15–16 |

If you have less time, prioritize Chapters 1, 5, 8, 9, 10, 11, 12, and 13. Those
topics generate the largest share of scenario questions.

## Conventions used in this book

- **Exam note** — a fact that is frequently tested.
- **Common mistake** — a wrong answer that looks plausible.
- **Try it** — a small exercise you can perform in a scratch project.
- Code blocks use Python, JSON, bash, or plain text, and are illustrative; they
  are not meant to be copied into production unchanged.
- Where a vendor option is discussed, the principle is stated first and the
  product name second. The exam rewards principle-level reasoning.

## A note on scope

A foundations exam tests judgment: which shape of solution fits the constraint
you were given, and what trade-off you are accepting. It does not reward
memorizing product trivia. When two answers both sound reasonable, ask yourself
which one actually satisfies every constraint in the scenario, especially the
constraints about safety, cost, and reliability. That habit is the single most
useful preparation strategy this book can offer.

---

*End of front matter.*
