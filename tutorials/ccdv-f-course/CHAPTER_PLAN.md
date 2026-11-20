# Chapter plan for the CCDV-F Course ebook

This file is the authoring brief. Together with `STYLE_GUIDE.md`, it is the
contract for every chapter. Each chapter is written from scratch in original
prose. Do not copy lecture titles, wording, ordering, or timing from any source
course. Do not include the names of authors, instructors, or any individuals.

Global target: **2,950 words per chapter** (acceptable range 2,700–3,200).
The front matter is already written; do not edit `course/00-front.md`.

File naming: `course/NN-short-slug.md`, where `NN` is the two-digit chapter
number. The first line of each file must be exactly
`# Chapter N — <exact title below>` (em dash, spaces around it).

A technical reference is available at `../ccdv-f-exam-guide/ebook/*.md`. Consult
it for correctness only; never reuse its sentences, tables, examples, or
questions. Write everything here afresh.

---

## Part I — Orientation (Chapters 1–3)

### Chapter 1 — Getting Oriented: The Exam, the Platform, and This Book
Cover: who the course is for; the two exam versions split by a December 2026
date and how to tell which one applies to you; the eight exam domains at a
principle level; how questions are framed as scenarios rather than trivia;
how to use the book alongside a code repository and labs. Include a table of
domains to chapters and a short "how to study" plan. Original framing only;
do not reproduce any course welcome wording.

### Chapter 2 — How a Language Model Produces Text
Cover: tokens and next-token prediction; context window as a hard budget;
sampling controls and non-determinism; why the same prompt can differ;
extended/adaptive thinking as visible reasoning blocks; effort and fast-mode
controls. Include a token-budget table and a small Python pseudocode snippet.
Explain concepts from first principles.

### Chapter 3 — The Developer Platform and Reading Its Code
Cover: the surface area — API, client SDKs, a repository coding assistant, an
agent SDK, and a connector protocol; how these pieces relate; what a non-developer
needs to read Python snippets (variables, functions, dictionaries, async calls,
try/except); how labs are structured and how to run them safely. Include a
component table and an annotated code block.

## Part II — Requests and Applications (Chapters 4–7)

### Chapter 4 — Requests, Responses, and Conversation State
Cover: anatomy of a REST request to a model API; roles and turns in the message
model; content blocks; JSON as the interchange format; client SDKs as wrappers;
first-request walkthrough; conversation state living in application code, not
in the model; system vs user message placement. Include a JSON request example
and a roles table.

### Chapter 5 — Application Anatomy, Requirements, and the System Life Cycle
Cover: browser, backend, and API boundaries; turning business language into
testable requirements; functional vs non-functional requirements; constraints
(budget, latency, privacy); non-goals; the system life cycle from prototype to
production; staging, rollout, rollback; traceability from requirement to prompt
to test. Include a requirements matrix and a boundary table.

### Chapter 6 — Evaluations First: Test Sets, Graders, and Baselines
Cover: why an eval set is the foundation of prompt work; building a small
representative test set; graders (exact match, schema check, human, model-as-judge);
establishing a baseline; rerunning after a change; regression detection;
session hygiene — what each conversation carries. Include a grader comparison
table and a JSON test-case example.

### Chapter 7 — Images, Files, and Grounded Data
Cover: how vision input works — images as content blocks; reading text from a
photo; ways to hand data to a model (inline, a files API, citations, or a tool);
when each is appropriate; source grounding and "not found" behavior; full-context
vs retrieval by size, cost, and freshness. Include a data-delivery decision table
and a Python image-message snippet.

## Part III — Data in Motion (Chapters 8–9)

### Chapter 8 — Streaming, Async, and Real-Time Delivery
Cover: synchronous vs asynchronous calls; fan-out with many concurrent calls;
server-sent events and the event sequence; forwarding a stream to a browser;
the WebSocket alternative and when it applies; backpressure and partial output;
error handling mid-stream. Include a streaming event table and a Python
async/stream snippet.

### Chapter 9 — Cloud Hosts, Sessions, and Integration Decisions
Cover: using the model through cloud providers instead of directly; what the
provider abstraction changes; session hygiene and state ownership; choosing
between direct API and cloud hosting; decision lenses for requirements and
integration; exam-style reasoning about constraints. Include a hosting table
and a decision checklist.

## Part IV — Prompts and Output (Chapters 10–12)

### Chapter 10 — Prompt Architecture and Instruction Priority
Cover: structure of a clear instruction — role, task, constraints, format;
where instructions live (system prompt vs user message vs code); instruction
conflict and priority; zero-shot, one-shot, and few-shot prompting; templates;
long-input handling. Include a prompt skeleton and an instruction-source table.

### Chapter 11 — Examples, Iteration, and Context Engineering
Cover: iterative refinement loop — adjust, rerun the set, compare; context
engineering to prevent drift and bloat; what to include, exclude, and ordering;
isolating untrusted content; measuring changes against the baseline. Include
a before/after example and a context-budget table.

### Chapter 12 — Structured Output, Grounding, and Defensive Parsing
Cover: output schemas and strict tool definitions; output configuration;
validating and defensively parsing model output; what to do on doubt;
retry-with-error patterns; consuming output safely; schema-valid extraction
example. Include a JSON schema block and a validation table.

## Part V — Tools and Connectors (Chapters 13–16)

### Chapter 13 — Tool Use: From Request to Executed Action
Cover: the request/execute split — the model asks, your code runs; tool
definitions; the tool-call and tool-result round; end-to-end first tool call;
built-in vs custom tools; when a tool is the right mechanism. Include a tool
round sequence table and a Python tool loop snippet.

### Chapter 14 — Tool Contracts, Errors, and Approval Patterns
Cover: designing reliable tool contracts — narrow inputs, clear descriptions,
predictable outputs; structured tool errors; client-side vs server-side tools;
approval and confirmation patterns for risky actions; versioning contracts.
Include a contract table and a JSON error example.

### Chapter 15 — MCP: Servers, Resources, Prompts, and Transports
Cover: connector-server architecture — tools, resources, prompts, and transports;
building and deploying a reusable server; local vs remote transports; lifecycle
and capability negotiation; testing a server. Include a component table and a
server configuration snippet.

### Chapter 16 — Choosing an Extension: Skills, Built-Ins, and MCP
Cover: deciding between a built-in tool, a custom tool, a skill, or a connector
server; trade-offs in reuse, deployment, and governance; exam-lens reasoning
about tool and connector decisions; a worked choice scenario. Include a
comparison table and a decision flow in text.

## Part VI — Agents and Workflows (Chapters 17–20)

### Chapter 17 — Workflow or Agent? Choosing the Shape
Cover: fixed workflows vs autonomous agents; decision criteria — ambiguity,
need for adaptation, cost, latency, auditability, blast radius; anti-patterns
(loop where a pipeline suffices, pipeline where adaptation is needed); agent
as a design choice. Include a decision table and a short scenario.

### Chapter 18 — Inside the Agent Loop
Cover: observe–think–act–observe; tool results as loop fuel; stopping conditions
and step budgets; custom harnesses and checks; hooks as deterministic guards
around tool calls; tracing a loop. Include a pseudocode loop and a stop-condition
table.

### Chapter 19 — Delegation, Subagents, and Memory Isolation
Cover: manager, supervisor, and worker patterns; when subagents help — context
isolation, parallel research, specialization; when they cost more than they
save; agent memory; shared vs isolated context; framework abstractions at a
principle level. Include a pattern table and a coordinator snippet.

### Chapter 20 — Agent SDK, Hooks, Deployment, and Trace Diagnosis
Cover: building agents with an agent SDK; hooks for deterministic checks;
self-hosted vs vendor-hosted deployment; diagnosing an agent from its trace —
which pattern is missing; exam-lens agent architecture decisions. Include a
hook example and a trace-signature table.

## Part VII — Models and Cost (Chapters 21–24)

### Chapter 21 — Model Families and Thinking Modes
Cover: model families and their roles; extended and adaptive thinking; what
appears in the response; effort controls; fast mode and its limits; generic
tier labels before product examples. Include a family table and a response-block
example.

### Chapter 22 — Choosing a Model Under Constraints
Cover: quality, latency, and cost trade-offs; escalation from a small to a
larger model; decision matrix; version pinning and breaking changes; when to
upgrade. Include a decision matrix and a pinning table.

### Chapter 23 — Token Budgets, Pinning, and Cost Models
Cover: token budgets and usage tracking; cost modeling for a workload; input
vs output pricing; cache-read pricing; guardrails and alerts; estimation
worked example. Include a cost table and a short calculation snippet.

### Chapter 24 — Prompt Caching and Batch Processing
Cover: cache breakpoints — single, layered, rolling; cache hits and price;
what makes a prefix cacheable; message batches API and when to use it; realtime
vs batch decision. Include a breakpoint table and a request snippet.

## Part VIII — Claude Code and Configuration (Chapters 25–26)

### Chapter 25 — Repository-Aware Coding with an Assistant
Cover: version control, pull requests, and code review with an assistant;
refactoring — small edits and large migrations; what the tool can see and do;
safe debugging loops; one model across many surfaces. Include an instruction-file
excerpt and a change-size table.

### Chapter 26 — Configuration, Skills, Plugins, Permissions, and CI
Cover: settings scopes and versioned prompts; project instruction hierarchy and
rules; skills and slash commands; subagents and agent memory in the assistant;
plugins, marketplaces, scopes, dependencies; choosing an extension type;
sessions and permission modes; headless and streaming mode; JSON output in CI.
Include a scope table and a headless command snippet.

## Part IX — Quality and Security (Chapters 27–29)

### Chapter 27 — Tracing, Errors, Recovery, and Monitoring
Cover: integration vs model as the failure source; reading traces to find the
first wrong step; error types — auth, validation, timeouts, rate limits;
retry and backoff strategies; monitoring quality and preventing regressions.
Include a failure-signature table and a retry snippet.

### Chapter 28 — Failure Modes, Model-as-Judge, and Evaluation Decisions
Cover: naming a failure from a trace; calibrating a model-based grader against
human labels; bias and drift in graders; when to trust a grade; exam-lens
evaluation and debugging decisions. Include a calibration table and a grader
rubric example.

### Chapter 29 — Prompt Injection, Secrets, and Layered Guardrails
Cover: prompt injection and jailbreak defense; injection through a tool result;
untrusted input, data leakage, and PII; authentication, authorization, and
access control; secrets, credentials, and API keys; redacting before sending;
layered guardrails, least privilege, content policy; blocking destructive
actions with hooks. Include a threat table and a redaction snippet.

## Part X — Exam Readiness (Chapter 30)

### Chapter 30 — Key Distinctions, Exam Simulators, and Quick Reference
Cover: three distinction sets — API/integration/output, agents/tools/context,
and models/cost/tooling/security; the decision routine for reading a question;
two short exam simulators with answers and rationale; a compact quick-reference
sheet; final study checklist. Include a distinction table and at least twelve
answered questions.
