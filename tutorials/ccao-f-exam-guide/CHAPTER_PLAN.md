# Chapter plan for the CCAO-F study guide

This file is the authoring brief. Together with `STYLE_GUIDE.md`, it is the
contract for every chapter. Each chapter is written from scratch in original
prose. Do not copy lecture titles, wording, ordering, or timings from any source
course. Do not include the names of authors, instructors, or any individuals.

Global target: **4,700 words per chapter** (acceptable range 4,400–5,000).
Chapters 17 and 18 are longer because they contain question banks: 5,200 and
5,800 words respectively. The front matter is already written; do not edit
`ebook/00-front.md`.

File naming: `chapters/NN-short-slug.html`, where `NN` is the two-digit chapter
number. Chapter content sits between the `<!-- BOOK-CONTENT-START -->` and
`<!-- BOOK-CONTENT-END -->` markers. The page `<title>` must contain the exact
title below (em dash, spaces around it).

The chapter order below is deliberately different from any lecture list. Each
chapter groups topics by learning logic so that later chapters build on earlier
ones.

---

## Chapter 1 — Entering the Workspace: Interface, Accounts, and Exam Scope

**Part I — Orientation and the Exam.** Cover: what a foundations-level associate
exam is likely to test (judgment, safe use, clear communication) versus trivia;
how to read a scenario question and identify the constraint that decides the
answer; the parts of a typical assistant interface (conversation area, model
and feature controls, navigation panel, project and artifact spaces, scheduling
and voice entry points) described generically; account and plan tiers at a
principle level (individual versus team, what changes in permissions and data
handling); the difference between a casual chat and a work product that must be
checked; a short orientation checklist for a first session; how to manage time
in the exam and flag questions for review. Include a table comparing plan tiers
by administrative control, data handling, and collaboration rather than price
details, and a `text` block showing a first-session checklist. Do not quote any
exam blueprint verbatim; describe the domains generically.

## Chapter 2 — The Assistant at Work: Chats, Projects, Artifacts, and Controls

**Part I.** Cover: the conversation as a working surface; turns, attachments,
and the value of a clean thread; project spaces as persistent context with
uploaded knowledge and custom instructions; artifacts as separately rendered,
iterable outputs (documents, code, visual drafts, simple interactive views);
when to use a chat, a project, or an artifact; response controls (length,
verbosity, tone, format) and how they differ from the prompt itself; voice and
dictation entry points and their accuracy limits; scheduled or recurring tasks
at a principle level; research-oriented modes that gather and cite sources;
memory features and their privacy implications; code execution as a sandboxed
tool for calculation and transformation; the "skills" idea as packaged
instructions the assistant can draw on. Include a table mapping task types to
the right surface and a `text` block showing a project set-up sketch.

## Chapter 3 — Context, Examples, and Instruction Design

**Part II — Prompting Foundations.** Cover: why context changes output quality;
the five parts of a useful instruction (role or frame, task, constraints,
format, examples); giving background without dumping irrelevant material;
placing the most important instructions where they are least likely to be
overlooked; the difference between a negative instruction and a positive
example; few-shot examples and how to choose them; specificity versus
over-specification; asking for a draft, then a critique, then a revision;
separating instructions from untrusted source text; a before-and-after rewrite
with rationale. Include a prompt skeleton in a `text` block and a table of
prompt anti-patterns with fixes.

## Chapter 4 — Decomposing Work: Step Chains and Iteration

**Part II.** Cover: why a single large request often fails; task decomposition
into ordered steps; chaining prompts where each step's output becomes the next
step's input; deciding how many steps are enough; checkpoints between steps;
when parallelism is safe and when order matters; iterative refinement using
specific feedback rather than "make it better"; keeping a change log of prompt
versions; measuring whether iteration actually improved the result; a short
worked chain for a research-to-summary pipeline. Include a `text` block showing
a three-step chain and a table comparing one-shot, chained, and iterative
approaches.

## Chapter 5 — Task-Family Playbooks: Analysis, Research, Drafting, and Ideation

**Part II.** Cover: four recurring task families and the prompting shape each
one rewards; analysis prompts that state the decision to be made and the
evidence allowed; research prompts that request sources, dates, and
uncertainty labels; drafting prompts that supply audience, purpose, tone, and
model documents; brainstorming prompts that separate divergence from
evaluation; combining families in one workflow; common failure signatures for
each family; how to write a prompt brief that a colleague could reuse. Include
a table of task family versus required inputs versus likely failure, and a
`text` block with two contrasting prompt briefs.

## Chapter 6 — Accuracy, Completeness, and Hallucination Detection

**Part III — Verification and Responsible Output.** Cover: what completeness
means relative to the request; checking that every requested part is present;
the mechanism of confident fabrication and why fluency is not evidence;
categories of hallucination (invented source, wrong attribution, plausible
number, incorrect date or name); warning signs in a response; grounding a
request in supplied material and asking for quotations or citations; asking the
assistant to mark what it does not know; source triangulation and the limits of
a single generated answer; a verification checklist that can be applied in two
minutes. Include a table of hallucination types with detection tactics and a
`text` block showing a fact-check prompt.

## Chapter 7 — Consistency, Bias, and the Human Review Boundary

**Part III.** Cover: internal inconsistency across a long answer; contradictions
between a summary and its source; bias as systematic skew rather than isolated
error; common sources of skew (training data, framing, omitted groups, loaded
word choices); testing for bias by changing surface details while holding
substance constant; the difference between a factual error and a value judgment;
which decisions require a human sign-off and why; building a review ladder from
light check to full review; documenting who reviewed what; escalation triggers.
Include a table mapping output risk to review depth and a `text` block with a
bias-probe prompt.

## Chapter 8 — Shaping Output: Audience, Refinement, and Format

**Part III.** Cover: rewriting for a non-technical audience without losing
precision; adapting the same finding for executives, peers, and customers;
preserving meaning while changing register; refinement through comparison of
two candidate answers against a rubric; choosing a format that matches the next
step (table for scanning, bullets for action, prose for narrative, structured
data for import); specifying schemas and field names; controlling length
explicitly; asking for a version with and without jargon; avoiding the trap of
polishing an answer that is still factually wrong. Include a table of audience
versus emphasis versus recommended format and a `text` block showing an
output-format request.

## Chapter 9 — Model Selection: Capability, Speed, Cost, and Risk

**Part IV — Models, Features, and Context.** Cover: generic capability tiers
(compact, balanced, capable) before any product names; workload signals that
favor each tier; high-volume classification and extraction as compact-tier
candidates; multi-source analysis and ambiguous judgment as capable-tier
candidates; the cost of a wrong answer as a selection criterion; latency and
user waiting as constraints; extended thinking and longer reasoning as a paid
option with a specific payoff; routing between tiers rather than one global
choice; measuring cost per successful task; a decision matrix. Then describe,
generically, that a family of models often carries small, medium, and large
variants with different strengths, and that exam questions expect reasoning from
the scenario rather than brand recall. Include a model-selection matrix and a
cost comparison table with illustrative numbers.

## Chapter 10 — Context Windows, Memory, and Session Continuity

**Part IV.** Cover: the context window as a single shared budget for
instructions, history, documents, tool output, and the answer; signs that a
conversation is approaching its limit; three recovery strategies — restart with
a distilled brief, summarize the thread, or persist key facts externally; when
each strategy is correct; what belongs in a handoff summary; memory features as
convenience versus as a governed data store; incognito or temporary modes and
what they do and do not guarantee; managing writing preferences across chats;
long conversations where early decisions get lost; a continuity checklist.
Include a table comparing restart, summarize, and persist strategies and a
`text` block showing a handoff summary template.

## Chapter 11 — Requirements, Use Cases, and Fit Assessment

**Part V — Business Analysis and Workflow Design.** Cover: turning a vague
business request into testable requirements; asking clarifying questions before
proposing a tool; separating what the user asks for from what they need;
functional and non-functional requirements; success metrics and acceptance
criteria; identifying initial use cases that are low-risk, repetitive, and
measurable; screening out use cases that need real-time systems, privileged
actions, or unverifiable facts; a fit-assessment matrix; explicit non-goals;
building a one-page brief. Include a requirements matrix and a `text` block
with a one-page brief skeleton.

## Chapter 12 — Research, Planning, and Process Improvement

**Part V.** Cover: using the assistant as a research partner with source
discipline; turning research into a plan with milestones and owners; process
mapping before automation; finding bottlenecks and handoff delays; distinguishing
a task worth augmenting from a step worth removing; pilot design with a small
sample and a baseline; using the assistant to draft process documentation and
checklists; measuring cycle time and rework; when a spreadsheet or a rule-based
tool is the better answer. Include a table of process signals versus recommended
action and a `text` block with a pilot measurement plan.

## Chapter 13 — Designing, Redesigning, and Communicating Workflows

**Part V.** Cover: augmenting an existing workflow with minimal disruption;
redesigning a workflow when the old one no longer fits; prototyping before
committing; testing a parent or customer FAQ flow with sample questions;
defining where generated content enters the process and where a human approves;
communicating value to leadership in terms of time, quality, and risk;
communicating limits honestly, including what the assistant cannot verify;
handling questions about jobs, accuracy, and policy; building a pilot readout.
Include a table of stakeholder concerns versus evidence to present and a
`text` block with a pilot readout outline.

## Chapter 14 — Building Projects: Knowledge, Instructions, and Maintenance

**Part VI — Projects, Data, and Governance.** Cover: when a project space beats
a one-off chat; setting up a project with a clear purpose; uploading knowledge
and organizing it so retrieval is predictable; writing project-level
instructions that state role, scope, format, and boundaries; testing instructions
with representative prompts; keeping knowledge current when policies change;
versioning and ownership of shared projects; permissions in team spaces;
recognizing stale or conflicting documents; a maintenance cadence. Include a
table of knowledge types versus freshness risk and a `text` block with a
project instruction template.

## Chapter 15 — Connectors, Data Sensitivity, and Privacy

**Part VI.** Cover: what a connector does and what access it grants; document
and mail connectors as examples; reading versus writing permissions and why the
distinction matters on a team; scoping connectors to the smallest useful set;
data sensitivity classification (public, internal, confidential, regulated);
personal data and student or patient information as high-sensitivity categories;
what an assistant may and may not do with such data under organizational rules;
prompt injection delivered through an external document and how to contain it;
incognito chats and organizational data policies; a pre-connection checklist.
Include a connector risk table and a `text` block with a data-classification
checklist.

## Chapter 16 — Governance, Ethics, and the Escalation Line

**Part VI.** Cover: appropriate versus inappropriate use cases; requests that
must be refused (fabricated reviews, deceptive content, impersonation);
regulatory considerations described generically (sector rules, retention,
disclosure, cross-border transfer); following organizational AI policies and
disclosure requirements; ethical themes — fairness, transparency, accountability,
and human agency; protecting children's and vulnerable users' data; knowing when
to escalate to a legal, security, or compliance owner; documenting an incident;
the "can versus should" test. Include a table of scenario versus decision versus
reason and a `text` block with an escalation note template.

## Chapter 17 — Scenario Workshop: Thirty Judgment Exercises

**Part VII — Exam Practice.** Cover: thirty original multiple-choice scenario
questions in original wording, grouped into six themes of five questions each:
prompting and context, verification and bias, models and features, projects and
connectors, governance and privacy, and workflow design. Every question must be
paraphrased into an original scenario — do not reuse the wording of any source
question, and do not reproduce the source question titles. Provide four answer
options and a full rationale for each option, including why each distractor is
wrong. Use checkpoint-style sections. Include at least two tables (a theme map
and a scoring guide) and one `text` code block. Do not use person names in any
scenario; use role names such as "an analyst", "a team lead", "a coordinator".

## Chapter 18 — Two Full Practice Papers

**Part VII.** Cover: a complete original practice paper of about forty
questions, then a second original paper of about forty questions, each with an
answer key and a one-paragraph rationale per answer. Mix scenario, judgment, and
recognition items across all ten domains. Do not reproduce any question from an
external source. Include a scoring guide, a table mapping topics to question
numbers, and a second table comparing the two papers' emphasis. Use role names,
never person names. Include at least one `text` code block (for example, an
answer-sheet template).

## Chapter 19 — Clinics: From Vague Task to Verified Answer

**Part VIII — Final Preparation.** Cover: four consolidated clinics that mirror
the most common exam tasks, written in original language: (1) turn a vague task
into a clear prompt; (2) check the output before sending it; (3) pick the right
feature and model; (4) apply "can versus should" and fix bad outputs. Each clinic
should present a starting situation, a diagnosis, a corrected approach, and a
short drill with answers. Include a diagnostic table for bad outputs and a
`text` block with a reusable four-step checklist.

## Chapter 20 — Final Review, Checklists, and Exam-Day Strategy

**Part VIII.** Cover: a consolidated decision checklist; a glossary of core
terms in table form; common distractor patterns (absolute language, wrong
surface, skipping verification, over-privileged access, polished-but-wrong
output); triage rules for scenario questions; time management and flagging;
what to do when two answers both look right; a final one-page revision sheet;
closing encouragement without naming any person. Include at least two tables
and one `text` code block.
