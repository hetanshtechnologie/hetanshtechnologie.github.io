# Chapter 5 — Application Anatomy, Requirements, and the System Life Cycle

## Learning objectives

- Draw the boundaries between browser, backend, and external API in an AI feature.
- Convert business language into requirements that a test can prove or disprove.
- Separate functional behavior from non-functional qualities and name common constraints.
- State non-goals explicitly so scope does not expand unnoticed.
- Describe the life cycle from prototype through staged rollout and rollback.
- Trace a requirement forward to a prompt, a configuration, and a test.

## Key concepts

### Where the boundaries sit

An AI feature is rarely one program. It spans a browser, a backend service, and external APIs, and the seams are where important decisions happen. The browser presents an interface but is a poor place for a secret or a rule, since anything shipped to a device can be inspected. The backend holds credentials, builds the model request, and decides what data leaves the system. The external API generates language but owns none of the application's rules.

Drawing boundaries early prevents recurring mistakes. A browser calling the model directly exposes the key and leaves no place to enforce access control or redact data. Trusting browser input as a standing instruction lets an end user rewrite the assistant's behavior. Asking the model to enforce a permission hands a deterministic security decision to a probabilistic component. In a sound design the browser presents, the backend decides, and the model generates within those limits.

| Boundary | Owns | Must not own | Failure if confused |
| --- | --- | --- | --- |
| Browser | Rendering, input, local interaction | API secrets, authorization, durable state | Exposed key or bypassed permission |
| Backend | Credentials, access control, request assembly, state | Visual presentation detail | Brittle UI logic in the server |
| Model API | Language generation within supplied context | Business rules, permissions, retention | Invented policy or unsafe action |
| Data store | Records and retrieval | Prompt wording, model choice | Stale or inconsistent knowledge |

Authority stays on the server: the browser may ask, the backend decides, and the model may suggest but never act without backend approval. Each crossing is a chance to validate data, so a developer should be able to name the checks at every boundary and the behavior when they fail.

> **Exam note:** A key in browser code, or a permission enforced only by a prompt, signals a boundary error. Secrets and authorization belong on the backend.

### From business language to testable requirements

Projects often begin with a sentence that feels clear but cannot be tested. A stakeholder says the assistant should be fast, accurate, and inexpensive, hiding decisions about speed relative to what, accuracy on which questions, and cost at what volume. Until those are explicit, nobody can say whether the result meets the request.

A requirement is testable when a reviewer can write a check that passes or fails without interpretation. The check names a target, a measurement method, and the conditions of measurement. For AI features the conditions matter unusually much because output varies between runs. A useful form is: given a fixed set of inputs and a pinned configuration, when each is submitted once, then a stated share of results satisfies a stated criterion. Both set and threshold must be fixed, or one can make results look good by choosing friendly examples.

Requirements divide into two kinds. **Functional** ones describe what the system does for a given input; **non-functional** ones describe how fast, cheap, available, private, and correct that behavior is. Teams new to language features write long functional lists and treat quality as an afterthought. That is risky: nondeterminism makes correctness a measured property, and every call costs money. These qualities are constraints from the start.

| Business language | Type | Measurable requirement | Check |
| --- | --- | --- | --- |
| "Answer customer questions" | Functional | Each input in the approved set returns a labeled answer or not-found marker | Run the set, count labeled results |
| "Be quick" | Non-functional | p95 time to first token under two seconds at twenty concurrent users | Load test on a stated device profile |
| "Stay within budget" | Non-functional | Average spend per resolved question at most one cent at forecast volume | Billing export divided by resolutions |
| "Never invent policy" | Non-functional | Every factual claim cites a retrieved passage; unsupported policy claims zero | Citation audit on the fixed set |
| "Protect private data" | Non-functional | No identity number appears in outgoing requests after redaction | Scan captured payloads in a harness |
| "Escalate hard cases" | Functional | Cases below a confidence threshold go to a human queue with the trace | Inspect queue for threshold cases |

The matrix exposes unfinished decisions. If a row cannot be filled because nobody knows the device profile or forecast volume, that is a conversation to have before design. A provisional threshold is acceptable if written down and revisited after a baseline measurement; an adjective left as an adjective is not, because it can never fail a test.

> **Common mistake:** Treating "the assistant should be accurate" as a functional requirement. Accuracy is a quality measured against a fixed set and threshold; without both it cannot reject a bad build.

### Constraints and non-goals

Constraints are limits the design must respect, whether or not anyone calls them requirements. Budget caps spend and forces choices about model, caching, and routing. Latency decides whether a call can be synchronous, whether output must stream, and how much context fits. Privacy rules decide what may be transmitted, stored, logged, or retained. These interact: a tight latency target may rule out a more accurate model, and a strict privacy rule may rule out a service that retains prompts. Ignoring one to satisfy another is incomplete.

Write constraints as boundaries with owners. A monthly budget becomes a per-request ceiling and a forecast alert; a latency target becomes a percentile under a named load; a privacy rule becomes a redaction step and a retention period. An unowned constraint is a wish.

**Non-goals** are capabilities the team deliberately chooses not to build — the visible edge of scope, not failures. A support assistant may answer policy questions but not modify an account, work in one language but not all, or handle text chat but not voice. Stating exclusions prevents a reviewer from judging the system against a promise nobody made. A non-goal should be specific: "does not place orders" is clearer than "not full service."

> **Try it:** For a feature you know, write three constraints with numeric limits and owners, then three specific non-goals. Notice how the exclusions make the design easier to defend.

### The life cycle from prototype to production

An AI feature moves through stages, each producing an artifact the next needs. Thinking in artifacts turns the vague question "what should happen next?" into "which artifact is missing?" The stages are not a rigid ceremony, but skipping one leaves a gap that usually appears later as an outage or a surprise cost.

| Stage | Central question | Artifact produced | AI-specific concern |
| --- | --- | --- | --- |
| Prototype | Can the idea work? | Thin end-to-end example | Manual checks; no quality guarantee |
| Requirements | What must be true? | Testable statements and non-goals | Quality, cost, privacy explicit |
| Design | How will it work? | Data flow, model choice, prompt plan, fallbacks | Nondeterminism, state ownership |
| Build | What gets implemented? | Code, prompts, schemas, configuration | Prompts are behavior; version them |
| Verify | Does it meet the criteria? | Evaluation, load, and cost reports | Fixed sets, pinned versions, regressions |
| Stage | Can it be tried safely? | Staging environment and rollout plan | Lab data differs from live traffic |
| Release | How does it reach users? | Flags, canary results, rollback plan | Versions travel with traffic |
| Operate | Is it still correct? | Dashboards, alerts, feedback, drift notes | New inputs feed back to requirements |

A prototype answers feasibility. It may be rough and hard-code values, but it must not become production by accretion. Once proven, the team restates what it learned as requirements and designs deliberately. Treating the prototype prompt as the product, with no history or tests, is the most common failure.

Verification is broader than unit testing. Deterministic helpers such as validation can be unit tested; model-dependent parts need a fixed evaluation set and a threshold from the requirements. Load tests check latency under concurrency, cost tests check spend, and security tests probe redaction and unsafe input. Results should be tagged with the prompt and model versions that produced them, since a quality change is meaningless without knowing what changed.

Release should be gradual. Staging exercises the real request path with sanitized data so mistakes surface before users do. A feature flag exposes new behavior to a small share of traffic, and a canary checks whether acceptance metrics improve. Rollback must be rehearsed: if a new prompt or model performs worse, the team needs a tested way to restore the previous version. For a language feature that means reverting the prompt file and the model pin together, since either alone leaves an untested combination.

> **Common mistake:** Promoting a prototype to full traffic because it worked in a demonstration with friendly inputs, no concurrency, and no edge cases. A demonstration proves feasibility, not readiness.

Operating closes the loop. Dashboards track error rate, latency, tokens, and cost alongside validation failures, human handoffs, and feedback. New input patterns found in production are added to the evaluation set, and requirements are revisited when thresholds prove wrong. The life cycle is a cycle, not a line.

### Traceability from requirement to test

Traceability means each requirement can be followed forward to the design choice, prompt, configuration, and test that satisfy it, and backward from a failing test to the requirement it protects. When a metric moves, it says which requirement is at risk; when a prompt is edited, it says which tests to rerun. Without it, a change is a guess with a hope attached.

A compact record keeps the chain visible. Each requirement carries an identifier, a linked prompt template and version, the configuration it depends on, and the test that checks it. Stored with the code, the record lets a reviewer see why a prompt says what it says.

```json
{
  "requirement_id": "R-014",
  "statement": "Unsupported policy claims must be zero on the fixed question set.",
  "prompt_template": "support_answer_v3",
  "model_pin": "general-purpose-latest-2026-09",
  "depends_on": ["retrieval.policy_index", "output.citation_required"],
  "verified_by": ["eval.policy_claims", "eval.citation_audit"],
  "non_goals": ["account_modification", "voice_input"]
}
```

The record's value appears during change. If the model pin must move, the team can list every requirement tied to it and rerun those checks. If a test fails, the engineer can ask whether the system is wrong or the threshold is outdated. Traceability also supports staged release: a canary can watch metrics tied to sensitive requirements rather than an average that hides a localized regression.

Keep the record small and current. A sprawling document nobody updates gives false confidence. A handful of links — requirement to prompt to test — in version control is enough for most teams.

## Practice lab

**Goal:** Turn a vague request into a boundary drawing, a requirements matrix, and a traceability record a teammate could review.

**Steps:**

1. Write the request in one sentence using two adjectives such as "quick" and "helpful."
2. Draw boxes for browser, backend, and model API. For each arrow, list what crosses it and which checks happen there. Mark where the key lives.
3. Rewrite each adjective as a measurable requirement with a threshold, method, and conditions. Classify each as functional or non-functional.
4. Add two constraints with an owner and two non-goals as specific exclusions.
5. Choose one requirement and fill a traceability record with a prompt template, pinned model, and a test name.

**Expected observation:** The original sentence cannot be tested, while each rewrite can pass or fail. The drawing places the key in the backend and validates at each crossing. The record points to one reviewable slice of behavior rather than the whole system.

## Worked scenario

**The problem.** A team is asked for "a quick assistant for our help center." Hidden constraints surface: answers must appear on a phone within two seconds, monthly spending is fixed, and the assistant must not state policy absent from the approved knowledge base. "Quick" is the only written specification.

**Reasoning.** The engineer starts with boundaries. The browser renders and collects input; the backend holds the key, checks entitlement, redacts identifiers, retrieves passages, and builds the request. The model only generates phrasing grounded in those passages, with no permission decision and no key exposure.

The matrix follows. "Quick" becomes a p95 time-to-first-token target on a named phone profile at stated concurrency; "cheap" becomes a maximum average spend per resolved question. "No invented policy" becomes a rule that every factual claim cites a passage, with zero unsupported claims on a fixed set. Non-goals exclude account changes and languages outside the approved list.

Constraints drive design. A single large call for every question would miss the latency target and burn the budget on simple questions. The team chooses a two-stage path: a small classifier flags routine questions, answered from the approved store with short phrasing; ambiguous cases reach the larger model with retrieved passages. Output streams so the first token arrives quickly, repeated questions are cached by normalized text and knowledge-base version, and non-urgent summarization moves to a queue.

Traceability makes the plan durable. Each requirement gets an identifier linked to a prompt template, pinned model, and evaluation slice, with prompts and settings in version control. Verification runs the fixed set, a load test, a cost test, and a redaction test. Release uses staging with sanitized data, then a flag for a small share of traffic, with rollback restoring prompt and pin together. Dashboards tag observations with those versions.

**Resolution.** Complaints stop because the failing category was made visible and improved. The team no longer argues from favorite examples: each edit is compared with a baseline, and new question patterns are added to the evaluation set. The decisive move was surfacing hidden constraints early enough to design around them.

## Common mistakes

- Calling the model API from browser code and exposing the key.
- Leaving a permission decision to the prompt instead of the backend.
- Treating adjectives as requirements without thresholds and measurement methods.
- Defining a quality target without a fixed set of inputs.
- Omitting non-goals and allowing scope to expand during review.
- Promoting a working prototype directly to full traffic.
- Rolling out a new prompt without a tested way to restore the prior version.
- Changing a model pin without knowing which requirements and tests depend on it.

## Chapter summary

- The browser presents, the backend decides, and the model generates within limits; authority stays server-side.
- A requirement is testable when it names a target, a method, and the conditions of measurement.
- Functional requirements describe behavior; non-functional ones describe qualities such as latency and cost.
- Budget, latency, and privacy constraints interact and need named owners.
- Non-goals mark the deliberate edge of scope and should be as specific as requirements.
- The life cycle runs from prototype through requirements, design, build, verification, staging, release, and operation.
- Staging, canary releases, and rehearsed rollback protect users from prompt and model changes.
- Traceability links requirements to prompts, configuration, and tests, making change safe.

## Checkpoint questions

1. Where should an API key and an authorization decision live in an AI web feature?

   - A. In the browser, so calls are faster.
   - B. In the backend, which validates before calling the model.
   - C. In the prompt, so the model can enforce it.
   - D. In a hidden browser field users cannot see.

2. Which is a non-functional requirement?

   - A. The system returns an intent label for each message.
   - B. The system stores a record of each interaction.
   - C. The system offers a human handoff control.
   - D. p95 time to first token is under two seconds at twenty concurrent users.

3. What is the main purpose of stating non-goals?

   - A. To list bugs that remain unfixed.
   - B. To mark capabilities deliberately excluded from scope.
   - C. To replace requirements with suggestions.
   - D. To document the model's internal architecture.

4. A prototype answered a few sample questions correctly. What is the next step?

   - A. Release it to all users immediately.
   - B. Remove testing to preserve its speed.
   - C. Restate what was learned as requirements and design deliberately.
   - D. Increase the token cap to guarantee correctness.

5. Why should rollback restore the previous prompt and model version together?

   - A. Because either alone can leave an untested combination.
   - B. Because prompts do not affect behavior.
   - C. Because model versions are immutable.
   - D. Because rollback is only needed for browser changes.

6. What does traceability provide when a quality metric changes?

   - A. A guarantee that no change occurred.
   - B. A map from the affected requirement to the prompt, configuration, and test.
   - C. A replacement for evaluation testing.
   - D. A way to avoid version control.

7. Which constraint most directly argues for streaming output?

   - A. A requirement that answers arrive quickly on a phone.
   - B. A requirement to store every request.
   - C. A requirement to use one language.
   - D. A requirement to exclude account changes.

### Answers and rationale

1. **B.** Secrets and authorization belong on the server, which validates before calling out. A and D expose the key to the device; C wrongly delegates a deterministic permission to a probabilistic component.

2. **D.** A latency percentile is a quality of behavior. A and C describe functions, and B describes storage behavior; all are functional.

3. **B.** Non-goals are explicit exclusions defining scope. A confuses them with defects, C weakens them into suggestions, and D mistakes them for internal documentation.

4. **C.** A prototype proves feasibility; its lessons should become requirements before deliberate design. A releases without evidence, B removes the safety net, and D assumes a larger cap solves quality.

5. **A.** Behavior depends on the prompt and model combination, so reverting one can yield an untested state. B is false because prompts shape behavior, C is irrelevant, and D wrongly limits rollback to the browser.

6. **B.** Traceability identifies the connected requirement, prompt, configuration, and test. A is false because changes do occur, C because traceability complements testing, and D because version control is essential.

7. **A.** Streaming delivers early tokens and serves a fast-perception requirement on a phone. B, C, and D concern storage, language scope, and exclusions, none of which imply streaming.

---

*End of chapter 5.*
