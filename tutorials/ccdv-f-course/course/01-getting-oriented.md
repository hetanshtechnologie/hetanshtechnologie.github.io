# Chapter 1 — Getting Oriented: The Exam, the Platform, and This Book

## Learning objectives

- Describe who this course is written for and what kind of preparation it offers.
- Decide which of two published exam blueprints applies to your sitting, using the date boundary and the guide version.
- Name the eight domains and explain the competence each tests at a principle level.
- Recognize how scenario items are built and why reasoning from constraints beats recalling features.
- Sketch the five platform surfaces covered here and how they compose.
- Set up a scratch repository and a reversible lab routine.
- Follow a study loop that turns reading into measured practice.

## Key concepts

### Who this course is for

This book is for people who make decisions while building software around a language model. Some readers write application code daily. Others specify systems, review designs, test behavior, or manage delivery and need to read code well enough to challenge an assumption. Both groups face the same problem: the model is powerful, but it sits inside a system of prompts, tools, data, permissions, budgets, and users. Most mistakes happen at those seams, not inside the model.

A foundations-level credential tests whether you can navigate the seams. It does not ask for internal architecture or product trivia. It asks what you would do when a requirement is ambiguous, a tool returns nonsense, a latency budget is missed, or a prompt works in one conversation and fails in another. The answer is a design judgment: which boundary to draw, which signal to trust, which trade-off to accept, and which control belongs in code rather than in prose.

Every topic here is therefore treated as a decision. When a feature is described, so are the situation that makes it right and the situation that makes it wrong. Snippets make ideas visible; they are not production code. Experienced engineers get a shared frame of reference, and readers newer to programming get the vocabulary needed to follow the labs.

> **Exam note:** This is an independent study aid, not affiliated with or endorsed by any certification program or vendor. Domain names and dates help you choose a study track; they imply no official status.

### Two blueprints, one credential

The credential has two published blueprints. Version 1.0 took effect in July 2026. Version 1.1 was published in November 2026 and takes effect on 7 December 2026. The split is a fact about your booking, not a choice made while studying. Sit before that date and you prepare against version 1.0; sit on or after it and you prepare against version 1.1.

Three checks decide which applies. First, read the date of your scheduled sitting; that single fact settles it. Second, check the version printed on the guide attached to your registration or in the candidate portal. Third, sanity-check any practice material: the earlier blueprint describes 53 items, while the updated one describes 70 items with 60 scored. A practice paper with the wrong item count belongs to the other track.

The eight domains are the same in both versions, so little learning is wasted at the boundary. What changes is emphasis. The earlier guide gives Applications and Integration roughly a third of the exam and leaves two domains with only a few items. The updated guide spreads weight more evenly: evaluation, debugging, repository tooling, and context work all grow. A candidate who plans to skip the small domains is taking a riskier bet under the updated blueprint.

| Check | Version 1.0 track | Version 1.1 track |
| --- | --- | --- |
| Applies to sittings | Before 7 December 2026 | On or after 7 December 2026 |
| Guide timing | Effective July 2026 | Published November 2026 |
| Items | 53 | 70, of which 60 are scored |
| Largest domain | Applications and Integration, about 33 percent | Applications and Integration, about 20 percent |
| Study implication | Focus on integration and API mechanics, but sample every domain | Spread effort; give evaluation, context, and tooling real time |

> **Common mistake:** Using a popular checklist without checking its date. One built for the earlier weights will underprepare you for an updated sitting, especially on evaluation and repository tooling.

### The eight domains at a principle level

The domain names are labels; the verbs behind them matter more. Each is described by the judgment it tests and the chapters that develop it. Weights below are approximate published figures, to be confirmed against your own guide before you allocate hours.

| Domain | What it really tests | Earlier | Updated | Chapters |
| --- | --- | --- | --- | --- |
| Agents and Workflows | Choosing a pipeline or an adaptive loop, structuring delegation, diagnosing an agent from its trace | 14.7 percent | 17 percent | 17–20 |
| Applications and Integration | Turning requirements into architecture, API and SDK use, session state, configuration, life cycle | 33.1 percent | 20 percent | 3–9 |
| Claude Code | Repository work: instructions, settings, permissions, headless use, skills, hooks | 3.1 percent | 8 percent | 25–26 |
| Eval, Testing, and Debugging | Test sets, graders, traces, failure naming, regression attribution | 2.6 percent | 10 percent | 6, 27–28 |
| Model Selection and Optimization | Generation mechanics, thinking and effort, tier choice, pinning, caching, cost | 16.8 percent | 12 percent | 2, 21–24 |
| Prompt and Context Engineering | Instruction structure, examples, long sessions, structured output, grounding | 11.0 percent | 15 percent | 10–12 |
| Security and Safety | Injection defense, untrusted input, least privilege, secrets, redaction, guardrails | 8.1 percent | 8 percent | 29 |
| Tools and MCP | Tool contracts and errors, connector servers, choosing among extensions | 10.6 percent | 10 percent | 13–16 |

No domain is purely theoretical or purely code. Applications and Integration mixes business language with HTTP mechanics; Model Selection mixes probability with billing. When you study a domain, ask what input an examiner could hand you — a trace, a configuration file, a request body, an error message, a stakeholder sentence — and what decision you would make from it.

> **Try it:** Write the eight names in a scratch note. Beside each, add one sentence: "Given ___, I would choose ___ because ___." Replace guesses with reasons as you progress.

### How exam items are framed

A trivia item asks for a definition. A scenario item gives a situation with a constraint and asks what to do next. Stems typically supply a role, a system, a symptom or requirement, and a goal. The options are often all technically true, which is the difficulty: the question is not which statement is generally correct, but which action satisfies this particular constraint.

Imagine a stem with a two-second latency target, a repeated instruction prefix, and a traffic spike causing rate-limit errors. A queue smooths the spike but adds waiting time on an interactive path. A faster model helps generation but not rate limits. A cache helps repetition but not bursts. The strongest answer names the actual bottleneck while respecting the latency constraint.

A reliable reading routine has four moves. Circle the constraint that cannot be violated, such as a deadline, privacy rule, or fixed budget. Locate the layer where the symptom appears: prompt, model, tool, data, or integration. Prefer the option that changes that layer directly. Then check the side effects of your candidate against every other constraint. An option that solves the symptom but breaks a rule you circled is out.

Multiple-response items add a wrinkle: the stem states how many answers to select, so a partial selection typically earns no credit. Treat each option as a true-or-false claim about this scenario, not as a preference ranking. Good advice for a different situation is still a distractor here.

### The five platform surfaces

Beginners often imagine one product with several names. It is more accurate to picture one underlying model reached through different doors, each suited to a different job. The doors compose: an SDK call still sends an API request, an agent still calls a model, and a connector does not replace the model but gives it somewhere to reach.

The model API is the wire contract. You assemble a structured request, authenticate, send it over HTTP, and receive a structured response. It offers the most control and the most responsibility: retries, timeouts, streaming, error codes, and usage accounting are yours.

Client SDKs are language libraries wrapping that contract. They serialize data, attach credentials, present streams as iterators, and normalize errors. They are a convenience boundary, not a different model. For clean application code the SDK is usually the answer; for the question of what the provider received, reason at the API.

The repository assistant changes software. It reads files, searches a tree, runs commands, and proposes edits, guided by instruction files, scoped rules, permission modes, and hooks. It is a colleague in your checkout, not a feature you deploy.

The agent SDK builds applications that act over multiple steps. It supplies the loop, tool registration, deterministic hooks, subagent support, and service connections. The design unit is a workflow that inspects results, not a single request.

The connector protocol is a standard for exposing capabilities. A server publishes tools, resources, and reusable prompts; a host discovers them and calls only permitted tools. Local servers use standard streams, remote servers use streamable HTTP, and one server can serve several hosts.

| Surface | Best understood as | Question it answers |
| --- | --- | --- |
| Model API | The wire contract | What is actually sent and received? |
| Client SDKs | A wrapper around that contract | How do I call it cleanly in my language? |
| Repository assistant | A developer tool with file access | How do I change this codebase safely? |
| Agent SDK | A framework for multi-step behavior | How do I build a system that acts and observes? |
| Connector protocol | A shared standard for capabilities | How do I expose a service once for many hosts? |

> **Exam note:** Cleaner calls from application code suggest an SDK. Reaching an external service from several hosts suggests a connector. A loop that calls tools until a goal is reached suggests an agent SDK.

### Using the book with a repository and labs

Reading alone will not prepare you for scenarios, because the exam tests decisions under incomplete information. Each lab is small: a goal, ordered steps, and an expected observation you can check yourself. The point is not to build a product but to make one behavior visible so you can attach a reason to it.

Work in a scratch repository separate from anything stable. Create a branch per chapter, commit before variations, and use placeholder keys and sample documents. Never point a lab at production credentials, real customer data, or a shared repository. If a tool behaves unexpectedly, inspect the difference from the baseline instead of guessing.

```bash
git status --short
git switch -c study/chapter-01
git commit -am "baseline before lab"
```

Those three commands express the safety routine: see what changed, isolate the work, record a baseline. Keep a notebook with four lines per experiment: what changed, what you expected, what you observed, and what to do differently. After a few chapters it becomes a personalized revision sheet, because a surprise forces an explanation.

### A study loop that compounds

Each cluster of chapters benefits from the same five phases. Preview the objectives and summary so you know what decision the chapter should change. Read the concepts and restate each table in your own words. Run the lab before the worked scenario so you have an observation to compare. Answer checkpoint questions without looking, giving a reason for every rejected option. Revisit misses a day later, when the answer has faded.

| Phase | Action | Output |
| --- | --- | --- |
| Preview | Read objectives and summary | Decisions you should be able to make |
| Explain | Restate tables aloud | Vocabulary for an answer |
| Experiment | Run the lab in a branch | One observation you can explain |
| Test | Answer questions with reasons | Wrong distinctions, not just wrong letters |
| Recover | Revisit misses after a day | Durable recall |

Under the earlier blueprint, give extra time to API mechanics, requirements, configuration, and the life cycle while sampling every small domain. Under the updated one, invest in evaluations, traces, context decisions, and repository tooling. In both tracks, scenario practice beats another pass through feature lists.

## Practice lab

**Goal:** Identify your blueprint and create a safe workspace for the course.

**Steps:**

1. Record the exact date of your scheduled sitting.
2. Compare it with the 7 December 2026 boundary and note the guide version.
3. Check the item count of any study material you already have.
4. Create a scratch directory, initialize version control, and branch for this chapter.
5. Copy the eight domain names into a note with their chapter ranges.

**Expected observation:** You can state your guide version unaided, you have a clean branch, and every domain has a destination. A conflicting item count identifies material aimed at the other track.

## Worked scenario

A developer has two possible sittings: 2 December 2026 and 19 December 2026. A colleague recommends a checklist built around 53 items and heavy on integration mechanics.

The date decides everything. For the earlier sitting, version 1.0 applies and the checklist is consistent. For the later sitting, version 1.1 applies, the item count is wrong, and evaluation and debugging would be badly underweighted. She notes that the eight domains are shared, so the reading transfers; only the hours change.

She turns weights into a plan. Booking the earlier date still leaves short sessions for tooling and evaluation. Booking the later date moves real time to traces, test sets, context management, and instruction files. The lab routine stays identical, since reproduce-and-isolate is tested in every domain.

**Resolution:** Choose the sitting for logistical reasons, then derive emphasis from its date rather than from convenient material. Domain knowledge transfers; weighting does not.

## Common mistakes

- Assuming one blueprint regardless of sitting date.
- Treating the December boundary as flexible.
- Studying only the largest domain.
- Memorizing percentages instead of the decisions behind domain names.
- Reading code without running or modifying it.
- Running labs against real credentials or shared data.

## Chapter summary

- The course is for people who design, build, review, or test systems around a model.
- Version 1.0 applies before 7 December 2026; version 1.1 applies from that date.
- Your date decides the blueprint; guide version and item count confirm it.
- Both versions cover the same eight domains, with noticeably different weights.
- Scenario items reward identifying the inviolable constraint and rejecting options that break it.
- Five surfaces recur: API, SDKs, repository assistant, agent SDK, connector protocol.
- Labs belong in a scratch branch with a baseline and an observation note.
- The study loop is preview, explain, experiment, test, and recover.

## Checkpoint questions

1. A candidate is booked for 7 December 2026. Which blueprint applies, and what confirms it?

A. Version 1.0, because it was published earlier.
B. Version 1.1, because the updated guide takes effect on the boundary date; the printed version confirms it.
C. Either, at the candidate's choice.
D. Version 1.0, because item counts are decisive.

2. Which change most clearly distinguishes the updated blueprint?

A. Evaluation and repository tooling gain weight; Applications and Integration loses some.
B. Security disappears and Tools and MCP doubles.
C. The eight domains are replaced by five.
D. One domain takes half the exam.

3. A stem gives a two-second target and rate-limit errors during a burst. What should drive the answer?

A. Pacing matters, but a queue's added wait must be weighed against the deadline.
B. A larger model, because quality always wins.
C. Extended reasoning, because more thinking reduces errors.
D. A longer timeout, because timeouts cause rate limits.

4. What is the main difference between the API and an SDK?

A. The SDK runs another model.
B. The API is restricted to large organizations.
C. The SDK wraps the API and handles serialization, credentials, and streams.
D. The SDK removes the need to understand requests.

5. Which statement about the connector protocol is accurate?

A. It standardizes how a server publishes tools, resources, and prompts to hosts.
B. It is the model's reasoning process.
C. It is required in every SDK.
D. It edits source files in a repository.

6. Why run labs in a branch with a baseline commit?

A. Branching improves model quality.
B. It makes changes visible and reversible, supporting careful diagnosis.
C. The exam requires a branch name.
D. It removes the need for observations.

### Answers and rationale

1. **B.** The boundary date itself belongs to version 1.1, and the guide's printed version is the natural check. A confuses publication with applicability. C is false because candidates do not choose. D is wrong because the date decides and counts only corroborate.

2. **A.** The updated guide spreads weight toward evaluation, debugging, and repository tooling and away from Applications and Integration. B is false because security remains and Tools and MCP does not double. C is false because domains persist. D is false because no domain reaches half.

3. **A.** A burst against a rate limit suggests pacing, but the deadline makes the queue's wait a real cost. B does not address rate limits and may worsen latency. C adds time without touching the bottleneck. D does not prevent rejections and holds resources longer.

4. **C.** An SDK is a convenience layer over the same contract. A is wrong because the model is unchanged. B is false. D is wrong because request structure still matters when debugging.

5. **A.** The protocol defines discovery and capability publication for multiple hosts. B confuses it with model internals. C is not a universal SDK requirement. D describes a repository assistant.

6. **B.** Isolation and a baseline make changes inspectable and reversible. A is unrelated. C is false because branch naming is local. D is wrong because observations carry the learning.

---

*End of chapter 1.*
