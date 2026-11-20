# Chapter plan for the CCAR-F Full Prep ebook

This file is the authoring brief. Together with `STYLE_GUIDE.md`, it is the
contract for every chapter. Each chapter is written from scratch in original
prose. Do not copy lecture titles, wording, ordering, or timings from any source
course. Do not include the names of authors, instructors, or any individuals.

Global target: **3,150 words per chapter** (acceptable range 2,950–3,400).
Chapters 27 and 28 are longer because they contain full practice papers:
4,200 and 4,200 words respectively. The front matter is already written; do not
edit `course/00-front.md`.

File naming: `course/NN-short-slug.md`, where `NN` is the two-digit chapter
number. The first line of each file must be exactly
`# Chapter N — <exact title below>` (em dash, spaces around it).

The chapter order below is deliberately different from any lecture list. Each
chapter groups topics by learning logic so that later chapters build on earlier
ones.

---

## Part I — Foundations (Chapters 1–4)

### Chapter 1 — Getting Oriented: Scope, Study Method, and Exam Mindset
Cover: who this course is for; what a foundations-level architect exam tends to
test (design judgment under constraints, not trivia); how to read a scenario
question and locate the constraint that decides the answer; the difference
between recalling a term and defending a trade-off; how the book is organized
and why the order differs from a syllabus; a study cycle of predict, read,
apply, verify, revisit; building a decision journal; managing study time and
exam time, including flagging questions for review. Include a table mapping
question types to study responses, a `text` block with a first-session
checklist, and a note that the book is independent and unofficial. Do not quote
any exam blueprint verbatim; describe domains generically.

### Chapter 2 — How Language Models Produce Text
Cover: tokens and next-token prediction explained from first principles; the
context window as a single hard budget shared by instructions, history,
documents, and output; why the same prompt can produce different answers
(sampling, temperature, randomness); the role of system and user messages;
extended or adaptive thinking as visible reasoning blocks; effort and speed
controls as cost/latency levers; why fluency is not evidence of correctness.
Include a token-budget table and a small Python pseudocode snippet showing a
generation loop. Keep all explanation original.

### Chapter 3 — The Claude Platform: API, Assistant, and Code Environment
Cover: the surface area of a modern assistant platform described generically —
a model API, hosted chat and project spaces, a repository coding assistant, an
agent SDK, and a tool-connection protocol; how these pieces relate and when to
choose each; individual versus team plans at a principle level (permissions,
data handling, collaboration) without price details; what a connector does;
the distinction between a casual chat and a work product that must be checked;
a short orientation checklist for a first session. Include a component table
and a `text` block showing a first-session checklist.

### Chapter 4 — Agents, Tools, and the Nature of Autonomous Work
Cover: three patterns that look alike but behave differently — a single
conversation, a fixed pipeline, and an autonomous agent; why a model without
actions is not an agent; tools as the bridge from reasoning to effect; the
observe–decide–act loop at a conceptual level; bounded autonomy and why stop
conditions matter; the cost of a wrong action versus a wrong answer; when a
script is the better answer. Include a three-pattern comparison table and a
`text` block sketching a minimal agent loop.

## Part II — The Exam and the Layered Model (Chapters 5–6)

### Chapter 5 — The Five Domains and the Layered Mental Model
Cover: five recurring concerns in architect exam questions — agentic design,
tool design, workflow design, prompt design, and context design; the five-layer
mnemonic as a study device for recalling the domains; why real systems cut
across layers; how to identify which layer a question is testing; the role of
cross-layer concerns such as reliability, governance, and cost; an original
mnemonic invented for this book (do not reuse any source mnemonic). Include a
layer-to-concern table and a `text` block showing how to classify a question.
Do not reproduce any source domain names verbatim beyond the generic concepts.

### Chapter 6 — Question Design, Testing Process, and Study Strategy
Cover: how scenario questions are constructed; common distractor families
(absolute language, wrong layer, skipping verification, over-privileged
access, polished-but-wrong output); a triage routine for hard questions; what
to do when two answers both look right; time management and flagging; a
preparation prioritizer that weighs weak domains; a two-pass exam strategy;
handling test anxiety without naming any person. Include a distractor table and
a `text` block with an exam-day checklist. Use neutral labels, never a copied
quiz title.

## Part III — The Agentic Layer (Chapters 7–11)

### Chapter 7 — The Orchestration Loop and Session Model
Cover: the orchestration loop as the heart of an agent — perceive, reason, act,
observe, repeat; treating the loop like a server that handles requests; where
control lives (in orchestration code, not in the model); step budgets and stop
conditions; how tool results feed back into the next decision; the difference
between a loop that is waiting and one that is stuck; a worked loop trace.
Include a loop-stage table and a `text` block showing a loop skeleton in
pseudocode.

### Chapter 8 — Structured Tool Use and Output Boundaries
Cover: why tools need machine-readable contracts; structured inputs and
structured results; the risk of including extensive tool output in context and
how to bound it; summarizing or filtering tool results before they re-enter the
loop; choosing between returning raw data and a distilled view; side effects
of context bloat; a worked example with a large search result. Include a
raw-versus-distilled table and a `text` block showing a result filter.

### Chapter 9 — Multi-Agent Coordination and Subagent Design
Cover: when multiple agents help versus when they add coordination cost;
orchestrator and worker patterns; subagent instantiation as a scoped call;
agents as wrappers around a model, tools, and instructions; isolation of
context and authority; communication protocols and handoff payloads; common
multi-agent failure modes (duplicate work, conflicting decisions, runaway
spawning). Include a topology comparison table and a `text` block showing a
subagent brief.

### Chapter 10 — Workflow Decomposition and Safeguarding
Cover: breaking a large goal into ordered subtasks; how the orchestration loop
decides the next step; splitting when something in the environment changes;
sequential, parallel, and hierarchical decomposition; guardrails that bound
the workflow (step limits, spend limits, allowed tools, approval gates); why a
prompt alone is not a safeguard; designing checks between steps. Include a
decomposition-shape table and a `text` block showing a guarded workflow plan.

### Chapter 11 — Memory, Session Continuity, and Timeline Separation
Cover: session state as part of the system, not of the model; in-context versus
external memory; what belongs in a handoff summary; separating timelines for
different tasks or users; preventing cross-task contamination; managing long
sessions where early decisions get lost; when to restart with a distilled brief
versus summarize versus persist facts externally. Include a strategy comparison
table and a `text` block with a continuity handoff template.

## Part IV — The Tool Layer (Chapters 12–15)

### Chapter 12 — Tool Definitions, Descriptions, and Selection
Cover: how a model chooses a tool; descriptions as routing instructions; input
schemas with typed parameters, enums, and constraints; the value of a strict
schema and prose as a fallback; granularity — too coarse versus too fine;
tool naming and naming collisions; maintaining a tool catalog; a worked
before-and-after tool definition. Include a tool-definition table and a
`text` (or JSON) block showing a schema.

### Chapter 13 — Error Responses, Recovery, and Reliability
Cover: designing error results the model can act on; distinguishing retryable
from terminal errors; partial success and how to report it; giving the model a
clear next action after failure; idempotency and duplicate calls; retry budgets
and backoff at a principle level; logging failures for diagnosis; a worked
error-contract example. Include an error-classification table and a `text`
block showing an error result payload.

### Chapter 14 — MCP Architecture, Governance, and the Tool Ecosystem
Cover: the tool-connection protocol as infrastructure for tool usage; core
primitives — tools, resources, and prompts; local versus remote transport;
server and client responsibilities; governance questions — who may expose a
tool, who may call it, and with what scope; versioning and change control;
security boundaries and least privilege; when a direct integration is simpler.
Include an architecture table and a `text` block showing a minimal server
skeleton.

### Chapter 15 — The Claude Code Toolset and Local Workflows
Cover: common tools available in a repository coding assistant — reading files,
editing, searching, running commands, and managing tasks; how these map to the
same principles as API tools; permission modes and risk; planning versus
execution modes; designing a local workflow that is repeatable; when to use a
subagent inside a coding session. Include a tool-to-purpose table and a
`text` block showing a workflow sketch.

## Part V — The Workflow Layer (Chapters 16–18)

### Chapter 16 — Layered Configuration with CLAUDE.md
Cover: configuration files as persistent project guidance; the hierarchy of
configuration levels and load order; what belongs in each level; conflict
resolution and precedence; when to use a project instruction file versus a
retrieval-based knowledge source; keeping instructions short and testable;
scoped rules for subdirectories; testing instructions with representative
prompts. Include a hierarchy table and a `text` block showing a configuration
template.

### Chapter 17 — Skills, Commands, and Reusable Instruction Packages
Cover: the "skills" idea as packaged instructions the assistant can draw on;
the difference between a command and a reusable capability; when a skill beats
a one-off prompt; structure of a skill (trigger, steps, constraints, example);
how skills relate to subagents; maintenance and versioning of skills; common
skill-design mistakes. Include a command-versus-skill table and a `text` block
showing a skill template.

### Chapter 18 — Workflow Design, CI/CD, and Automation
Cover: integrating an assistant into continuous integration and delivery;
treating an automated step like any other operation in a pipeline; idempotent
and reviewable changes; separating generation from approval; secrets and
permission handling in automation; designing for deterministic checks; a worked
pipeline example. Include a workflow-stage table and a `text` block showing a
pipeline configuration sketch.

## Part VI — The Prompt Layer (Chapters 19–21)

### Chapter 19 — Prompting Fundamentals and Few-Shot Design
Cover: the five parts of a useful instruction — frame, task, constraints,
format, and examples; placing the most important instruction where it is least
likely to be missed; positive examples versus negative instructions;
few-shot example selection and diversity; specificity versus over-specification;
separating instructions from untrusted source text; a before-and-after rewrite
with rationale. Include a prompt-skeleton `text` block and an anti-pattern table.

### Chapter 20 — Structured Outputs and Deterministic Schemas
Cover: why structured output matters for machine consumption; specifying a
schema with field names and types; enforcing enums and required fields;
validation and repair loops; the trade-off between strictness and flexibility;
when prose is the right output; a worked JSON-schema example. Include a
schema-design table and a JSON `text` block showing a response shape.

### Chapter 21 — Quality Enforcement, Batch Processing, and Multi-Pass Review
Cover: building quality checks into a prompt workflow; feedback loops that
critique and revise; traditional sanitization of untrusted input; batch
processing for independent items; batching as a way to isolate context and cut
cost; independent and multi-pass review; deciding how many passes are worth the
cost; review modality selection. Include a review-mode table and a `text` block
showing a two-pass review prompt pair.

## Part VII — The Context Layer (Chapters 22–24)

### Chapter 22 — Context Budgeting, Trimming, and Compression
Cover: context as an engineering resource with a hard budget; what consumes it
(instructions, history, documents, tool output, drafts); signs of approaching
the limit; compaction and summarization strategies; a "middle saver" approach
that keeps early and late material while compressing the middle; when to
restart, summarize, or persist externally; a budget-builder exercise. Include a
budget table and a `text` block showing a compaction plan.

### Chapter 23 — Escalation, Ambiguity, and Error Containment
Cover: handling ambiguous instructions by asking a clarifying question or
choosing a safe default; the option to take no action; preventing error
propagation from one step to the next; deciding whether to stay and recover or
escalate to a human; escalation triggers and thresholds; confidence labels and
when to distrust them; designing a reliability policy. Include an
escalation-trigger table and a `text` block showing a reliability-policy sketch.

### Chapter 24 — Large Codebases, Human Review, and Data Provenance
Cover: working with context in a large repository; using scratchpads and
delegation to keep the main thread clean; designing human review points that
match the failure affordance of the use case; tracking where each fact came
from; provenance for retrieved material; detecting conflicts between sources;
a provenance-detective exercise. Include a review-depth table and a `text`
block showing a provenance record format.

## Part VIII — Integration and Exam Practice (Chapters 25–28)

### Chapter 25 — Cross-Layer Patterns and Architectural Antipatterns
Cover: how the five layers interact in a real system; patterns that recur across
layers (bound the loop, validate at boundaries, keep the human in the loop for
risky actions); common antipatterns — unbounded loops, tool sprawl, duplicated
instructions, prompt-as-policy, context dumping, silent error propagation,
over-privileged access; triaging an architecture that feels wrong; using a
review-board checklist. Include an antipattern table and a `text` block showing
an architecture-review checklist.

### Chapter 26 — The Preparation Framework and Question Traps
Cover: a triangle preparation framework of concept, scenario, and elimination;
three groups of language traps common in exam questions (absolute qualifiers,
scope shifts, and negative framing); content traps (wrong layer, skipping
verification, over-privileged access, polished-but-wrong output); case-study
extraction — how to pull the deciding constraint from a long scenario; a
prioritization matrix for remaining study time. Include a trap-group table and
a `text` block showing a case-study extraction worksheet.

### Chapter 27 — Practice Paper One
Cover: a complete original practice paper of about forty multiple-choice
questions across all five layers and cross-layer concerns, in original wording.
Group into sections with checkpoint-style headings. Provide four answer options
per question, then a full answer key with a one-paragraph rationale for each
option, explaining why the correct answer wins and why each distractor fails.
Use role names, never person names. Include a scoring guide table and a topic-
to-question map table, plus a `text` block showing an answer-sheet template.
Do not reproduce any question from an external source.

### Chapter 28 — Practice Paper Two
Cover: a second complete original practice paper of about forty questions with
a different emphasis — more multi-agent, MCP, and case-study scenarios. Provide
four answer options per question and a full answer key with rationales for every
option. Use role names only. Include a scoring guide table and a table comparing
the emphasis of the two papers, plus a `text` block answer-sheet template.
All wording must be original.

## Part IX — Applied Domains (Chapters 29–31)

### Chapter 29 — Case Studies: Analysis, Risk, and Stress Testing
Cover: how to approach case-study questions in domains such as idea vetting,
risk and compliance, and stress testing; extracting the deciding constraint;
mapping a business scenario to the five layers; choosing an architecture under
regulatory or capital constraints; observability and cost considerations in a
case study; worked original scenarios with reasoning. Include a scenario-to-layer
table and a `text` block showing a case-study worksheet. Do not copy any source
case study; invent new ones.

### Chapter 30 — Case Studies: Agreements, Negotiation, and Capital
Cover: case studies in agreement drafting, fund/subscription documents,
negotiation of side letters, and regulatory capital validation; how local
workflows, context architecture, and retrieval choices interact with risk;
handling confidential documents and access scope; human review gates in legal
and financial settings; worked original scenarios with trade-off analysis.
Include a document-type table and a `text` block showing a review-gate plan.

### Chapter 31 — Claude Tag: A Managed Agent Workspace
Cover: a managed workspace where an assistant works on tasks in a supervised
environment; how a task runs and produces a result; context management and
thread lifecycle in a managed workspace; why a frozen or paused thread is not
necessarily a failed one; identity, scope, and access controls; channel
segmentation as a form of access control; security gaps to mitigate; working
effectively with a managed agent and avoiding the trap of handing off
supervision too early. Include a control table and a `text` block showing a
task brief. Use only generic descriptions; no product marketing copy.

---

## Final notes for contributors

- Do not mention lecture counts, section counts, or duration figures anywhere.
- Do not reuse the exact title of any source lecture as a chapter title; the
  titles above are original and must be used verbatim.
- Every question you write must be newly invented for this book.
- Run `python check_originality.py` and resolve every reported problem before
  considering a chapter complete.
