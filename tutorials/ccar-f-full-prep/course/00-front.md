# Claude Certified Architect — Foundations (CCAR-F) Full Prep

## An independent, original preparation course

This book is a complete, independently written preparation course for a
foundations-level examination on architecting agentic systems with a
Claude-based assistant. It is designed to be read from start to finish, to be
used as a reference during revision, and to be printed as a single volume.

## What makes this book different

A certification syllabus is a list of topics. It tells you what exists but says
little about the order in which ideas make sense, or about the reasoning that
connects them. This course supplies that missing structure. It rearranges the
material into a learning path, restates every idea in original language, and
adds worked examples, decision tables, design trade-offs, exercises, and
review questions.

The order is deliberate. Foundations come first so that later terminology has
a meaning. The five architectural layers are introduced one at a time, then
compared, then combined in practice papers and case studies. A concept that
appears early is often revisited later in a different context; that repetition
is intentional, not an editing error.

## Who this book is for

- A solution architect or engineer who needs to justify a design, not just name
  its parts.
- A developer preparing to work with an assistant API, a repository coding
  assistant, and a tool-connection protocol.
- A business or risk professional who must evaluate agentic proposals and know
  where human oversight is required.
- Any candidate who wants to understand *why* an answer is correct rather than
  memorise which answer looks familiar.

## How to use this book

Work in cycles. Before each chapter, skim the headings and write down what you
expect to find. Read once, actively, noting every sentence that changes one of
your predictions. Then apply the idea: sketch a design, answer a scenario, or
change a configuration. Verify by attempting the checkpoint questions without
looking back. Revisit missed items after a day, then after three days, then
after a week.

Keep a decision journal. For each chapter, record one decision you would make
in a real system and the constraint that drove it. By the final week you will
have a catalogue of defensible trade-offs rather than a set of highlighted
pages.

## Copyright and originality notice

This course was written from first principles for this project. Every chapter
title, explanation, example, table, scenario, and question is original to this
text. No instructor, author, presenter, or named individual appears in the
content. No lecture recording, transcript, slide deck, or paid course material
was copied or closely paraphrased. Lecture titles, section counts, lecture
counts, and duration figures from any source course are deliberately absent.

Product, framework, and certification names that do appear are used only as
descriptive technical identifiers. They are the property of their respective
owners. Their appearance here implies no endorsement, sponsorship, affiliation,
or certification authority. This is an independent study aid, not an official
guide, and it is not affiliated with or endorsed by any vendor or certifying
body.

If you adapt or redistribute this material, keep this notice and add your own
source attributions where appropriate.

## Contents at a glance

| Part | Focus | Chapters |
| --- | --- | --- |
| I | Foundations of study and technology | 1–4 |
| II | The exam and the layered model | 5–6 |
| III | The agentic layer | 7–11 |
| IV | The tool layer | 12–15 |
| V | The workflow layer | 16–18 |
| VI | The prompt layer | 19–21 |
| VII | The context layer | 22–24 |
| VIII | Integration and exam practice | 25–28 |
| IX | Applied domains | 29–31 |

## A note on terminology

You will meet a handful of recurring terms: a *tool* is a callable capability
with a described contract; an *agent* is a loop that can perceive, decide, act,
and observe; a *workflow* is an ordered arrangement of steps; a *skill* is a
reusable package of instructions; and *context* is the working memory available
to the model during a task. These words are used consistently throughout the
book, and each is defined more fully where it first matters. When a vendor uses
a slightly different word for the same idea, this book prefers the plain
description so that the concept survives a change of product names.

## A final word before you begin

Exam questions in this domain are design questions. A fact recalled without a
justification is nearly useless; a trade-off you can defend under pressure is
the whole game. Read with that goal in mind, and treat every checkpoint
question as a small design review rather than a memory test.

When you are unsure, return to the constraint. Almost every hard question hides
one detail — a permission boundary, a latency limit, a confidence threshold, or
a regulatory obligation — that makes one option safe and the others merely
plausible. Find that detail first, and the answer usually follows. The chapters
that follow are built to make that habit automatic.
