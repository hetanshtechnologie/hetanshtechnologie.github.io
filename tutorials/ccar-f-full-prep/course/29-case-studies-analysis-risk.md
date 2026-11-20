# Chapter 29 — Case Studies: Analysis, Risk, and Stress Testing

## Learning objectives

- Extract the deciding constraint from a long, deliberately noisy business scenario.
- Map a domain narrative onto the five architectural layers and name the cross-layer concerns it activates.
- Choose between competing designs when regulation, capital, or risk appetite narrows the feasible set.
- Build observability and cost reasoning into an answer instead of treating them as afterthoughts.
- Apply a repeatable stress-testing exercise that probes where a proposed design breaks.
- Defend a recommendation with evidence drawn from the scenario rather than from general preference.

## Key concepts

### What a case-study question is really measuring

A recall question asks whether you recognize a term. A case study asks whether you can decide while several plausible answers compete for attention. The narrative is intentionally over-stuffed: budgets, team structures, deadlines, and departments appear alongside one or two facts that actually determine the correct design. The skill being measured is not how quickly you read but how cleanly you separate signal from decoration.

Think of the scenario as a stack of claims. Some describe the environment, some describe goals, and a few impose hard restrictions. A hard restriction is something the design cannot violate: a regulation that forbids a data flow, a capital charge that makes a compute choice uneconomic, a latency ceiling that rules out a multi-pass review. Everything else is context that shapes but does not decide the answer. When two answers both seem reasonable, the deciding constraint is usually the tie-breaker.

> **Exam note:** In a case study, the longest paragraph is rarely the most important one. The deciding constraint is often a single clause buried in a short sentence about obligations, limits, or approvals.

### The extraction routine

Use a fixed routine every time so that pressure does not change your method. First, read once for the goal: what is the organization actually trying to accomplish? Second, read again and mark every sentence that contains a "must," "cannot," "only," "before," or a number with a unit. These are candidate constraints. Third, sort the candidates into hard constraints, soft preferences, and background. Fourth, ask which layer each hard constraint belongs to, because that tells you which family of answers to search. Fifth, choose the design that satisfies every hard constraint with the least machinery.

This routine matters because case-study distractors are usually built from soft preferences. An option may describe a genuinely good practice that the scenario did not require, or a practice that conflicts with a hard constraint while sounding modern. If you have already classified the constraints, those options lose their pull.

### Mapping the scenario to the five layers

The five layers — agentic, tool, workflow, prompt, and context — are a classification device, not a design prescription. In a case study you use them to locate where the problem lives and where the fix must be applied. A scenario about an assistant that keeps taking actions after it should stop is an agentic-layer problem: the loop needs a step budget or stop condition. A scenario about a tool that returns huge payloads is a tool-layer problem: the result needs filtering before it re-enters reasoning. A scenario about approvals is a workflow-layer problem. A scenario about unclear instructions is a prompt-layer problem. A scenario about stale or conflicting documents in the window is a context-layer problem.

Real scenarios cut across layers, so the mapping is a starting point rather than a conclusion. A capital constraint may surface in the workflow layer as a limit on review passes and in the context layer as a limit on retained history. The exam rewards answers that name the primary layer and acknowledge the secondary one, rather than answers that pretend the problem is single-layered.

> **Common mistake:** Treating the layer map as the answer. The map tells you where to look; the deciding constraint tells you what to choose.

### Regulatory and capital constraints

Two families of hard constraint appear often in applied scenarios. Regulatory constraints restrict what may be done with data or decisions: certain information cannot leave a boundary, certain decisions require a recorded human approval, and certain outputs must be reproducible from a retained record. Capital constraints restrict what is affordable in compute, latency, or staffing: every extra review pass, every larger context window, and every additional model call carries a cost that may be charged directly against a budget.

These families interact. When a regulator requires a recorded approval for each high-impact action, the workflow gains a gate. A gate adds latency and a storage obligation for the approval record. If the capital budget is tight, the design must reduce cost elsewhere — perhaps by routing only high-impact actions through the gate and letting low-impact actions proceed under a narrower automatic rule. The correct answer is rarely "add more governance everywhere." It is "place governance where the scenario says it is required, and keep the rest lean."

### Observability and cost in a case study

Observability is not a decorative logging feature. In a regulated or capital-sensitive setting it is the evidence that the system behaved as designed. A case-study answer should say what will be recorded, who can read it, and how a reviewer can reconstruct a decision. Useful records include the input that triggered a run, the tools that were called, the constraints that were checked, the approvals that were obtained, and the final output. Without these, an architect cannot demonstrate that a control worked.

Cost reasoning should be equally concrete. Rather than saying a design is "expensive," name the driver: the number of model calls per case, the size of the context carried into each call, the storage retained for audit, or the human time consumed by review. Then connect the driver to the scenario. If the scenario emphasizes high case volume with low value per case, an answer that adds two model calls per case will fail on cost even if it is technically elegant.

| Scenario signal | Likely primary layer | Typical deciding constraint | First design question |
| --- | --- | --- | --- |
| Assistant keeps acting after the goal is met | Agentic | Stop condition or step budget | What bounds the loop? |
| Tool returns more data than the window can hold | Tool | Result size and relevance | What is filtered before re-entry? |
| Approval required before a consequential action | Workflow | Recorded human gate | Where does the gate sit? |
| Instructions ambiguous across teams | Prompt | Unspecified output contract | What must the output contain? |
| Conflicting versions of a document in context | Context | Source authority and freshness | Which source wins? |
| Volume high, value per case low | Cross-layer | Cost per case | What can be removed safely? |

> **Try it:** When practising, cover the answer choices with a sheet and write your own one-sentence recommendation first. If your sentence names a constraint from the scenario, you are reading correctly.

### Stress testing as an architectural exercise

A stress test asks a simple question: under what conditions does this design stop meeting its obligations? A useful stress test changes one variable at a time. Raise the case volume tenfold and watch cost per case. Introduce a source document that contradicts the policy and watch provenance. Remove the human reviewer at the busiest hour and watch the approval gate. Feed a tool a malformed result and watch the error path. Each change probes a different seam.

The goal is not to find a flaw in every design — every design has flaws — but to find the flaw that matters most in the scenario. An answer that identifies a failure mode and pairs it with a containment step is stronger than an answer that claims the design is robust. Containment can be a step limit, a fallback to a narrower automatic action, a circuit that pauses the workflow when error rates climb, or an escalation to a reviewer.

| Stress dimension | What you change | What you observe |
| --- | --- | --- |
| Volume | Cases per hour | Cost per case, queue depth, review backlog |
| Source conflict | Two documents disagree | Provenance, authority rule, escalation |
| Tool failure | Malformed or empty result | Error contract, retry budget, fallback |
| Missing reviewer | Approval gate unstaffed | Pause behaviour, default action, audit record |
| Hostile input | Instructions embedded in data | Boundary between instructions and source text |

The case-study worksheet below is a compact version of the routine. Use it until the steps become automatic.

```text
CASE-STUDY WORKSHEET
Goal:            What is the organisation trying to achieve?
Hard constraints: List "must / cannot / only / before / number+unit" clauses.
Layer map:       Agentic / Tool / Workflow / Prompt / Context / cross-layer.
Decider:         Which single constraint breaks the tie between options?
Cost driver:     Calls, context size, retained records, human time.
Observability:   What is recorded, who reads it, can a decision be replayed?
Stress probe:    Which one variable would break this design first?
Containment:     What limits the damage when it does?
Recommendation:  One sentence naming the decider.
```

## Worked scenario

Three short scenarios show the routine in action. Each is invented for this book and each hides its deciding constraint among distracting detail.

**Scenario A — idea vetting at a lending unit.** A lending unit wants an assistant to triage incoming proposals for small business loans. The team describing the request emphasises a large backlog, a desire for consistent written summaries, and a preference for a popular chat interface. Near the end, a compliance representative mentions that every rejection must be accompanied by a recorded reason tied to an approved policy clause, and that the unit cannot afford to add reviewer hours. Two designs are on the table: a single conversation that drafts a free-text recommendation, or a structured workflow that extracts policy criteria, produces a reasoned recommendation with clause references, and routes only borderline cases to a reviewer.

The deciding constraint is the recorded reason tied to a policy clause, reinforced by the no-extra-reviewer-hours clause. That is a workflow-and-prompt concern with a cost rider. The free-text chat option fails because a fluent paragraph cannot be checked against a clause and would require more human reading, not less. The structured workflow wins: it requires a fixed output shape, a retrieval step that cites the governing policy, a confidence threshold, and a review gate limited to borderline cases. The cost driver is review hours, so narrowing the gate is exactly right. A stress test that introduces an outdated policy document shows why provenance matters: the workflow must record which policy version was retrieved, or the reason cannot be trusted.

**Scenario B — risk and compliance monitoring.** A compliance function wants an assistant to scan internal messages for potential policy breaches and escalate candidates. The scenario mentions a strict rule that raw message content may not leave the internal boundary, a requirement that every escalation include the evidence that triggered it, and a hard latency ceiling because escalations are reviewed during live operations. An architect proposes sending message excerpts to a hosted model with a long context window and asking it to return a narrative assessment. Another proposes running extraction inside the boundary, returning only structured flags with references to the source location, and keeping the raw text local.

Here the deciding constraint is the data boundary: raw content may not leave it. The layer is tool-and-context, because the design must control what crosses an interface and what enters the model's window. The hosted long-context option violates the boundary even though it would produce richer narratives. The local-extraction option wins because the model sees only structured flags and references; the evidence remains inside and is attached to the escalation by the orchestration layer. The latency ceiling reinforces this choice, since structured flags are cheaper to process than long narratives. A stress probe that embeds instructions inside a message shows the need to treat message text as untrusted source text, never as directions to the assistant.

**Scenario C — stress testing a capital-constrained service.** A financial service wants an assistant to summarise daily exposure reports for a small internal audience. The scenario stresses that the monthly compute allocation is fixed, that summaries must be reproducible from retained inputs, and that audience members occasionally disagree about which figure is authoritative. One design uses multiple review passes and a large retained context to maximise polish. Another uses a single generation pass, a fixed input bundle with recorded provenance, and a lightweight check that the figures in the output match the input bundle.

The deciding constraint is the fixed compute allocation combined with reproducibility. That pushes the answer toward fewer calls and a retained, versioned input bundle. The multi-pass design fails on cost and adds no reproducibility by itself; polish is a soft preference. The lean design wins, with one addition: a documented authority rule for conflicting figures, because the scenario says disagreements occur. The stress test raises report volume and confirms that cost per summary stays flat, then introduces two conflicting figures and confirms that the authority rule produces a deterministic choice with a recorded explanation.

> **Exam note:** In all three scenarios the correct answer is the one that satisfies the hard constraint with the least machinery. Elegance, polish, and popularity are soft preferences until the scenario promotes them.

## Common mistakes

- Reading for the goal but ignoring the small clause that imposes a hard limit.
- Assuming the most detailed option is the best one; detail often hides a constraint violation.
- Treating "add a review" as a universal fix even when the scenario forbids extra reviewer time.
- Naming the correct layer but failing to connect it to a specific design choice.
- Discussing cost in adjectives instead of naming the driver that the scenario constrains.
- Claiming a design is robust without describing the condition under which it fails.
- Forgetting that data entered as source text may contain instructions that must be ignored.

## Chapter summary

- Case studies measure decision quality under ambiguity, not recall.
- Extract the goal, then classify clauses as hard constraints, soft preferences, or background.
- Use the five layers to locate the problem and the deciding constraint to choose the answer.
- Regulatory constraints restrict data and approvals; capital constraints restrict calls, context, and review time.
- Observability supplies the evidence that a control worked; cost reasoning names the driver.
- Stress testing changes one variable at a time and pairs each discovered failure with containment.

## Checkpoint questions

1. A scenario says a rejection reason must be tied to an approved policy clause, and no reviewer hours may be added. Which option best satisfies the deciding constraint?

A. A chat interface that writes a polished free-text reason for each case.

B. A workflow that emits a structured reason with a clause reference and routes only borderline cases to review.

C. A workflow that requires a reviewer to approve every case before any reason is written.

D. A design that removes all policy references to speed up decisions.

2. Which sentence is most likely to contain a hard constraint in a case study?

A. "The team preferred a familiar interface for its daily work."

B. "The programme aimed to improve consistency across departments."

C. "Raw message content may not leave the internal boundary."

D. "The new approach was described as modern and flexible."

3. An assistant keeps taking actions after its goal is reached. Which layer is the primary location of the problem?

A. Agentic, because the loop needs a stop condition or step budget.

B. Context, because the window is too small.

C. Prompt, because the prose could be more persuasive.

D. Tool, because the tool descriptions are too short.

4. In a capital-constrained case with high volume and low value per case, which cost driver deserves the most attention?

A. The aesthetic quality of the output prose.

B. The number of model calls and the size of context per case.

C. The number of colours in the reporting dashboard.

D. The length of the project name.

5. A stress test introduces two conflicting source documents. What should the design demonstrate?

A. That it ignores both documents and generates from memory.

B. That it selects a source using a recorded authority rule and explains the choice.

C. That it doubles the context window so both documents fit.

D. That it deletes the older document from storage.

6. Why is a frozen thread not necessarily a failed task in a supervised workspace-style scenario?

A. Because a paused run may be waiting for an approval or an external condition.

B. Because frozen threads always indicate a bug in the model.

C. Because supervision is unnecessary once a task has started.

D. Because context windows expand while paused.

### Answers and rationale

1. Correct answer: B. The constraint requires a clause-tied reason and forbids extra reviewer time. B produces a structured, checkable reason and limits review to borderline cases, satisfying both halves. A fails because free text cannot be reliably tied to a clause and adds human reading. C fails because approving every case directly violates the no-extra-hours clause. D fails because removing references destroys the very evidence the constraint demands.

2. Correct answer: C. Hard constraints are expressed as prohibitions, obligations, or numeric limits; "may not leave the internal boundary" is a clear prohibition. A is a preference about interface familiarity. B is a goal, not a restriction. D is decorative language with no operative limit.

3. Correct answer: A. Continuing after the goal is reached is a failure of loop control, which belongs to the agentic layer and is fixed with a stop condition or step budget. B is wrong because window size is not the cause. C is wrong because more persuasive prose does not bound actions. D is wrong because tool description length does not govern when the loop stops.

4. Correct answer: B. With high volume and low per-case value, per-call count and context size dominate cost. A, C, and D describe cosmetic or irrelevant factors that the scenario's constraint does not touch.

5. Correct answer: B. A well-designed system applies a recorded authority rule and can explain which source won, preserving provenance. A is wrong because generating from memory discards evidence. C is wrong because fitting both documents does not resolve which one governs. D is wrong because deleting the older document hides the conflict rather than managing it.

6. Correct answer: A. A paused or frozen task may legitimately be waiting for a human approval or an external signal, so pause alone is not failure. B is wrong because pause is not proof of a model bug. C is wrong because supervision remains necessary. D is wrong because pausing does not expand a context window.

---
*End of chapter 29.*
