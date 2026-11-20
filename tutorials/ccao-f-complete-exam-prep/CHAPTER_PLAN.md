# Chapter plan for the CCAO-F Complete Exam Prep ebook

This file is the authoring brief. Together with `STYLE_GUIDE.md`, it is the
contract for every chapter. Each chapter is written from scratch in original
prose. Do not copy lecture titles, wording, ordering, or timings from any source
course or outline. Do not include the names of authors, instructors, presenters,
or any individuals, and do not include named projects or contact invitations.

Global target: **3,600–3,800 words per chapter** (acceptable range 3,500–3,900).
Chapters 23 and 24 are longer because they contain question banks: 4,800–5,200
and 6,200–6,800 words respectively. Chapter 25 targets 3,300–3,700 words. The
front matter targets 700–1,000 words and is written separately.

File naming: `ebook/NN-short-slug.md`, where `NN` is the two-digit chapter
number. The first line of each file must be exactly
`# Chapter N — <exact title below>` (em dash, spaces around it).

The chapter order below is deliberately different from any lecture list. Each
chapter groups topics by learning logic so that later chapters build on earlier
ones. Nine parts mirror broad topic areas, not any source sequence.

---

## Chapter 1 — Reading the Exam: Scope, Judgment, and Scenario Reasoning

**Part I — Exam Foundations and the Working Surface.** Cover: what a
foundations-level associate exam is likely to test (judgment, safe use, clear
communication) rather than trivia; how to read a scenario question and identify
the constraint that decides the answer; the difference between recognition
questions and judgment questions; common distractor families (absolute
language, wrong surface, skipped verification, over-privileged access,
polished-but-wrong output); a simple four-step method for attacking any
scenario item (restate the goal, list constraints, eliminate unsafe options,
choose the option satisfying every constraint); how to flag and return to a
difficult item; why the exam rewards principle-level reasoning over brand
recall. Include a table comparing recognition versus scenario items and a
`text` block showing a scenario-annotation template. Do not quote any exam
blueprint verbatim; describe domains generically.

## Chapter 2 — Setting Up: Interface, Accounts, and a First Session

**Part I.** Cover: the parts of a typical assistant interface described
generically (conversation area, model and feature controls, navigation panel,
project and artifact spaces, scheduling and voice entry points); account and
plan tiers at a principle level (individual versus team, what changes in
permissions and data handling) described without prices; the difference between
a casual chat and a work product that must be checked; orientation steps for a
first session; how to keep a clean thread and name conversations so they can be
found later; where settings such as response length and style live conceptually;
a short first-session checklist. Include a table comparing plan tiers by
administrative control, data handling, and collaboration rather than price, and
a `text` block with a first-session checklist.

## Chapter 3 — How the Assistant Works: Models, Thinking, and Tiers

**Part II — Models, Features, and Surfaces.** Cover: a plain-language account of
how a language model produces text (pattern prediction from training, not
database lookup); why fluency is not evidence of truth; generic capability
tiers (compact, balanced, capable) before any product names; workload signals
that favor each tier; high-volume classification and extraction as compact-tier
candidates; multi-source analysis and ambiguous judgment as capable-tier
candidates; extended or longer reasoning as an option with a specific payoff
and cost; the cost of a wrong answer as a selection criterion; latency and user
waiting as constraints; routing between tiers rather than one global choice;
measuring cost per successful task. Then describe generically that a model
family often carries small, medium, and large variants with different
strengths, and that exam questions expect reasoning from the scenario. Include
a model-selection matrix and an illustrative cost-comparison table.

## Chapter 4 — The Four Work Surfaces: Conversation, Projects, Artifacts, Research

**Part II.** Cover: the conversation as the default working surface; turns,
attachments, and the value of a clean thread; project spaces as persistent
context with uploaded knowledge and custom instructions; artifacts as
separately rendered, iterable outputs (documents, code, visual drafts, simple
interactive views); research-oriented modes that gather and cite sources; when
to use each surface and when to move from one to another; response controls
(length, verbosity, tone, format) and how they differ from the prompt itself;
voice and dictation entry points and their accuracy limits. Include a table
mapping task types to the right surface and a `text` block showing a surface
selection guide.

## Chapter 5 — The Capability Layer: Skills, Code Execution, and Memory

**Part II.** Cover: the "skills" idea as packaged instructions the assistant
can draw on; when a reusable skill beats repeating a long prompt; sandbox code
execution as a tool for calculation, transformation, and file creation; what a
sandbox can and cannot access; memory features as convenience versus as a
governed data store; temporary or incognito modes and what they do and do not
guarantee; managing writing preferences across chats; curation and deletion of
stored memories; privacy implications of each feature. Include a table comparing
the three capabilities by purpose, risk, and best use, and a `text` block showing
a skill-definition sketch.

## Chapter 6 — Extended Workflows: Deep Chats, Research, Artifacts, Projects, Scheduling, Design

**Part II.** Cover: getting more from a single conversation by building on
earlier turns; an end-to-end research flow from question to sourced answer; an
end-to-end artifact flow from first draft to iteration to sharing; a realistic
project walkthrough that sets a purpose, uploads knowledge, and asks across it;
assistant-to-code surfaces and browser extensions described only at a principle
level (editing files in a repository, reading a page in context); customization
through styles and personal preferences; generating slides, prototypes, and
one-page documents as artifact variants; scheduled or recurring tasks at a
principle level and what they require. Include a table mapping an activity to
its best surface plus a `text` block with an end-to-end flow outline. Do not name
any specific product in the examples beyond generic descriptive references.

## Chapter 7 — Anatomy of a Strong Instruction

**Part III — Instruction Craft.** Cover: why context changes output quality;
the five parts of a useful instruction (frame or role, task, constraints,
format, examples); giving background without dumping irrelevant material;
placing the most important instructions where they are least likely to be
overlooked; the difference between a negative instruction and a positive
example; few-shot examples and how to choose them; specificity versus
over-specification; asking for a draft, then a critique, then a revision;
separating instructions from untrusted source text; a before-and-after rewrite
with rationale. Include a prompt skeleton in a `text` block and a table of
prompt anti-patterns with fixes.

## Chapter 8 — Shaping Format, Tone, and Length

**Part III.** Cover: specifying the output structure explicitly; choosing a
format that matches the next step (table for scanning, bullets for action,
prose for narrative, structured data for import); specifying schemas and field
names; controlling length with a number or a bound rather than "short";
adjusting tone and register while preserving meaning; asking for a version with
and without jargon; using response controls versus restating format in the
prompt; the trap of polishing an answer that is still factually wrong. Include
a table of audience versus emphasis versus recommended format and a `text`
block showing an output-format request.

## Chapter 9 — Iteration and Prompt Patterns for Work

**Part III.** Cover: why a single large request often fails; task decomposition
into ordered steps; chaining prompts where each step's output becomes the next
step's input; deciding how many steps are enough; checkpoints between steps;
when parallelism is safe and when order matters; iterative refinement using
specific feedback rather than "make it better"; keeping a change log of prompt
versions; measuring whether iteration actually improved the result; recurring
work-task patterns (summarise, extract, compare, classify, draft, critique).
Include a `text` block showing a three-step chain and a table comparing
one-shot, chained, and iterative approaches.

## Chapter 10 — Why Evaluation Matters: Detecting Fabrication

**Part IV — Verification and Responsible Output.** Cover: what completeness
means relative to the request; checking that every requested part is present;
the mechanism of confident fabrication and why fluency is not evidence;
categories of hallucination (invented source, wrong attribution, plausible
number, incorrect date or name); warning signs in a response; grounding a
request in supplied material and asking for quotations or citations; asking the
assistant to mark what it does not know; source triangulation and the limits of
a single generated answer; a verification checklist applicable in two minutes.
Include a table of hallucination types with detection tactics and a `text` block
showing a fact-check prompt.

## Chapter 11 — Fact-Checking and a Two-Minute Validation Routine

**Part IV.** Cover: a line-by-line verification method; separating checkable
claims from opinions and recommendations; tracing each source reference to an
original document; checking names, dates, numbers, and units; cross-checking a
generated summary against its source; using a second independent source;
recording what was verified and what remains uncertain; when to stop and
escalate rather than keep checking; how to present uncertainty to a reader.
Include a table of claim types versus verification method and a `text` block
with a line-by-line checking worksheet.

## Chapter 12 — Judging Quality and the Human Review Line

**Part IV.** Cover: internal inconsistency across a long answer; contradictions
between a summary and its source; bias as systematic skew rather than isolated
error; common sources of skew (training data, framing, omitted groups, loaded
word choices); testing for bias by changing surface details while holding
substance constant; the difference between a factual error and a value
judgment; which decisions require a human sign-off and why; building a review
ladder from light check to full review; documenting who reviewed what;
escalation triggers. Include a table mapping output risk to review depth and a
`text` block with a bias-probe prompt.

## Chapter 13 — Editing and Adapting Output for Audiences

**Part IV.** Cover: rewriting for a non-technical audience without losing
precision; adapting the same finding for executives, peers, and customers;
preserving meaning while changing register; refinement through comparison of
two candidate answers against a rubric; editing for length without dropping
qualifiers; keeping caveats attached to the claims they qualify; checking that
format changes did not introduce errors; a reusable three-audience drill.
Include a table of audience versus emphasis versus recommended format and a
`text` block showing one answer rewritten for three audiences.

## Chapter 14 — Fitting the Assistant Into Real Work and Decomposing Tasks

**Part V — Workflows and Real Work.** Cover: where an assistant adds value in a
working day and where it does not; screening out use cases that need real-time
systems, privileged actions, or unverifiable facts; turning a large request into
ordered steps; a worked example of splitting one big task into four smaller
ones; deciding what to keep in the conversation and what to store externally;
the role of human checkpoints between steps; distinguishing augmentation from
removal of a step. Include a table of task signals versus recommended approach
and a `text` block showing a four-step decomposition.

## Chapter 15 — Designing Repeatable Workflows and Templates

**Part V.** Cover: designing a workflow that a colleague could follow without
re-deciding the prompt each time; reusable report templates with fixed sections
and variable inputs; separating the stable instruction from the changing data;
versioning a workflow and recording why a change was made; pilot design with a
small sample and a baseline; process mapping before automation; finding
bottlenecks and handoff delays; when a spreadsheet or rule-based tool is the
better answer; a maintenance cadence for templates. Include a table of process
signals versus recommended action and a `text` block with a reusable weekly
report template.

## Chapter 16 — Measuring Value and Communicating With Stakeholders

**Part V.** Cover: defining success metrics and acceptance criteria before a
pilot; measuring cycle time, rework, and quality rather than output volume alone;
establishing a baseline so improvement can be shown; communicating value in
terms of time, quality, and risk; communicating limits honestly, including what
the assistant cannot verify; handling questions about accuracy and policy;
building a short pilot readout; a one-page brief combining goal, use case,
non-goals, metrics, and review owner. Include a table of stakeholder concerns
versus evidence to present and a `text` block with a pilot readout outline.

## Chapter 17 — Project Spaces, Knowledge, and Custom Instructions

**Part VI — Projects, Knowledge, and Connections.** Cover: when a project space
beats a one-off chat; setting up a project with a clear purpose; uploading
knowledge and organizing it so retrieval is predictable; writing project-level
instructions that state role, scope, format, and boundaries; testing
instructions with representative prompts; demonstrating how custom instructions
change an answer; keeping knowledge current when policies change; recognizing
stale or conflicting documents; versioning and ownership of shared projects.
Include a table of knowledge types versus freshness risk and a `text` block with
a project instruction template.

## Chapter 18 — Maintaining Projects and Connecting Sources

**Part VI.** Cover: what a connector does and what access it grants; document
and mail connectors as examples; reading versus writing permissions and why the
distinction matters on a team; scoping connectors to the smallest useful set;
asking across a connected source while keeping instructions separate from
source text; prompt injection delivered through an external document and how to
contain it; permissions in team spaces; a maintenance cadence; a pre-connection
checklist. Include a connector risk table and a `text` block with a
data-classification checklist.

## Chapter 19 — Responsible Use, Transparency, and Data Privacy

**Part VII — Safety, Privacy, and Troubleshooting.** Cover: appropriate versus
inappropriate use cases; requests that must be refused (fabricated reviews,
deceptive content, impersonation); data sensitivity classification (public,
internal, confidential, regulated); personal data and student or patient
information as high-sensitivity categories; what an assistant may and may not do
with such data under organizational rules; transparency to affected people;
following organizational AI policies and disclosure requirements; regulatory
considerations described generically (sector rules, retention, disclosure,
cross-border transfer); protecting children's and vulnerable users' data.
Include a table of scenario versus decision versus reason and a `text` block with
a data-sharing decision checklist.

## Chapter 20 — Redaction, Refusals, and Clarifying Briefs

**Part VII.** Cover: a practical redaction method before pasting text into a
tool (identify direct identifiers, remove them, replace with neutral tokens,
check the result); deciding whether a request should be refused outright;
refusing an unsafe request to paste customer data while offering a safe
alternative; clarifying a vague brief from a stakeholder with targeted
questions; the "can versus should" test; ethical themes — fairness,
transparency, accountability, and human agency; knowing when to escalate to a
legal, security, or compliance owner; documenting an incident. Include a table
of request versus safe response versus reason and a `text` block with a
redaction worksheet.

## Chapter 21 — Troubleshooting and Optimization

**Part VII.** Cover: diagnosing weak outputs by category (unclear instruction,
missing context, wrong surface, wrong model, unverifiable claim, format
mismatch, context overflow); a decision tree for the most common failures; when
to restart a thread versus continue it; reducing cost and latency without
lowering quality; improving repeatability across a team; when the problem is the
workflow rather than the prompt; how to write a bug-style report for a bad
output; a short optimization loop. Include a diagnostic table and a `text`
block with a four-step troubleshooting checklist.

## Chapter 22 — Exam Strategy: Pacing, Reading, and Readiness

**Part VIII — Exam Practice.** Cover: time management and a simple pacing rule;
reading the question stem before the options; identifying the constraint that
decides the answer; flagging and returning; handling two answers that both look
right; eliminating absolute language; avoiding the trap of choosing the most
impressive-sounding feature; a readiness checklist covering the domains; a
one-page revision plan for the final week; what to do on exam day (sleep,
steady pace, review of flagged items). Include a table of question type versus
time guidance and a `text` block with a readiness checklist.

## Chapter 23 — Scenario Workshop: Judgment Exercises

**Part VIII.** Cover: thirty original multiple-choice scenario questions in
original wording, grouped into six themes of five questions each: prompting and
context, verification and bias, models and features, projects and connectors,
governance and privacy, and workflow design. Every question must be paraphrased
into an original scenario — do not reuse the wording of any source question.
Provide four answer options and a full rationale for each option, including why
each distractor is wrong. Use checkpoint-style sections. Include at least two
tables (a theme map and a scoring guide) and one `text` code block. Do not use
person names in any scenario; use role names such as "an analyst", "a team
lead", "a coordinator".

## Chapter 24 — Full Domain-Weighted Practice Paper

**Part VIII.** Cover: a complete original practice paper of about forty
questions, followed by a second shorter set of about fifteen questions, each
with an answer key and a one-paragraph rationale per answer. Mix scenario,
judgment, and recognition items across the domains. Do not reproduce any
question from an external source. Include a scoring guide, a table mapping
topics to question numbers, and a second table comparing the two sets'
emphasis. Use role names, never person names. Include at least one `text` code
block (for example, an answer-sheet template).

## Chapter 25 — Final Review: Checklists, Glossary, and Exam Day

**Part IX — Final Review.** Cover: a consolidated decision checklist; a glossary
of core terms in table form; common distractor patterns revisited; triage rules
for scenario questions; a final one-page revision sheet; a "last things to
check" list; closing encouragement without naming any person. Include at least
two tables and one `text` code block.
