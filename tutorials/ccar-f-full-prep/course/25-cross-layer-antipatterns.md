# Chapter 25 — Cross-Layer Patterns and Architectural Antipatterns

A diagram of five tidy layers is a useful study device, but systems fail in the seams: where a tool result becomes a context entry, where a workflow rule turns into a line in a prompt, where a model suggestion becomes an irreversible action. This chapter is about those joints, the habits that keep them healthy, and the recurring shapes of designs that feel wrong before you can say why.

The exam tests this judgment. A question describes a system that mostly works and asks what to change. Every option may name a real technique. The deciding factor is which seam is leaking, and which fix acts at the source rather than at a downstream symptom.

## Learning objectives

- Trace a single request across the agentic, tool, workflow, prompt, and context layers, naming which layer owns each decision.
- Recognize three patterns that recur at every layer: bounding the loop, validating at boundaries, and keeping a human in the loop for risky actions.
- Identify the common antipatterns from their observable symptoms rather than from their labels.
- Apply a short triage routine when an architecture feels wrong but the cause is unclear.
- Use a review-board checklist to test a design against every layer before it ships.
- Defend a repair by explaining why it acts at the source of a problem instead of at a downstream symptom.

## Key concepts

### The five layers as a request path

Picture the layers as a relay, not a stack. A request arrives through a workflow trigger, is reframed by a prompt, enriched from context, dispatched through tools, and acted on by an agentic loop that can hand work back to an earlier layer. Each tool result re-enters context, each entry influences the next prompt, and each prompt can change what the workflow does next.

That view explains why a defect in one layer shows up in another. A vague tool description lives in the tool layer, yet its consequence is repeated wrong calls in the agentic layer and a window full of failed results in the context layer. A rule duplicated between configuration and prompt produces a contradiction that surfaces only during an agentic decision. Repairing the earliest layer beats cleaning up later damage.

| Handoff | What crosses the seam | Decision owner | Failure when neglected |
| --- | --- | --- | --- |
| Workflow to prompt | Trigger and variables | Workflow author | Generic instructions for the wrong case |
| Prompt to context | Query, source scope, budget | Context owner | Whole documents loaded unfiltered |
| Context to agentic | Selected facts and history | Loop controller | Confident actions on stale facts |
| Agentic to tool | Structured call and authority | Tool designer | A suggestion becomes an unapproved side effect |
| Tool to context | Result and status | Result filter | Raw output displaces reasoning |
| Agentic to workflow | Completion signal and outcome | Workflow author | A pipeline waits for a missing message |

Reliability, governance, and cost are not rows in the table; they are properties of the whole relay. A step budget is agentic, a retry limit is part of a tool contract, a model choice is workflow configuration, a short instruction is prompt design, and trimming retrieved material is context work. Questions asking which single layer owns reliability are probing whether you see that cross-layer concerns need coordinated answers.

> **Exam note:** When an option proposes a fix, ask where the defect originates and where the fix acts. If the fix acts one seam downstream, look for a better answer.

### Pattern one: bound the loop

Every autonomous loop needs a budget with teeth. The agentic layer should know the maximum steps, tool calls, and spend, plus the condition that counts as success. A stop condition written only as prose is a hope, not a bound; it belongs in orchestration code that actually halts the loop.

The same instinct applies elsewhere. A tool that can retry forever needs a retry budget, a workflow that spawns subagents needs a spawn cap, a prompt asking for an elaborate answer needs an output expectation, and a context window needs a token allowance set before retrieval. In each case the pattern is the same: decide the limit first, measure during the work, and make exceeding it produce a visible outcome rather than silent continuation.

Bounds are also diagnostic. A halt at the step ceiling is evidence that the design gave the agent no reachable path to done. Raising the ceiling makes the confusion more expensive; reading the halt as a signal prompts inspection of the stop condition, tool descriptions, and context quality.

### Pattern two: validate at boundaries

Each arrow in the relay table is a trust boundary. Data crossing it should be checked, not assumed. Tool results are untrusted even when the tool is trusted, because the data may originate outside your system. Retrieved documents are untrusted as instructions, and session history is untrusted as current fact. Even a structured model output should be validated before a downstream step consumes it.

Matching the check to the handoff matters more than blanket paranoia. A search result summarized for a reader needs a source label. A field that selects an approval path needs an enum and a required-value check. An argument that becomes a shell command needs strict typing and a restricted vocabulary. A prompt quoting an external document needs instruction text separated from quoted source text.

Ask at review time: if this value were wrong, how far would it travel before anyone noticed? A bad value that dies at the next check is an inconvenience; one that reaches an external write is an incident. The number of seams a value crosses without inspection is a rough measure of risk.

> **Common mistake:** Treating a valid-looking response as evidence that every upstream boundary was checked. Fluency is not validation.

### Pattern three: keep a human in the loop for risky actions

Autonomy should be proportional to reversibility. Sending a message, deleting records, or publishing a document deserves a gate; reading, summarizing, and drafting usually do not.

A gate is not a prompt line asking the model to confirm. A real gate is enforced outside the model: the tool refuses to execute without an approval token, and the workflow records who approved what. A model can describe an approval that never happened as fluently as a real one, so governance in prose exists only while the prose is believed.

| Action class | Reversibility | Suitable control |
| --- | --- | --- |
| Read, search, summarize | High | No gate; log for provenance |
| Draft content for review | High | No gate; require a named reviewer at the end |
| Update an internal record | Moderate | Schema check plus post-change audit entry |
| Send external communication | Low | Explicit approval token and a preview of the exact payload |
| Delete or publish irreversibly | Very low | Two-person confirmation and a recorded rationale |

The table is a starting point. A read against a sensitive store may deserve a gate because the harm is disclosure, not mutation. Ask what damage becomes possible when the action goes wrong.

### The antipattern catalogue

Antipatterns are easier to spot by symptom than by name. A reviewer hears "the assistant sometimes skips approval," not "we have prompt-as-policy." The table connects the label to observable behavior.

| Antipattern | Observable symptom | Where it starts | Minimal repair |
| --- | --- | --- | --- |
| Unbounded loop | Repeated calls with no ceiling; no final report | Agentic layer | Add step, spend, and call budgets plus a stop condition |
| Tool sprawl | Overlapping tools; the wrong one is often selected | Tool layer | Prune the catalog and sharpen descriptions |
| Duplicated instructions | One rule in configuration, a skill, and a prompt; copies disagree | Workflow and prompt layers | Keep one source of truth and reference it |
| Prompt-as-policy | Authorization only in prose; the agent bypasses it | Prompt and tool layers | Enforce permission in code and at the tool boundary |
| Context dumping | Whole documents loaded "just in case"; slow, vague answers | Context layer | Retrieve bounded snippets with provenance and a budget |
| Silent error propagation | A failed step is invisible; later steps use stale data | Tool and context layers | Return typed errors with a next action and log them |
| Over-privileged access | One credential covers every tool and environment | Tool and workflow layers | Scope credentials per tool and call; apply least privilege |

Tool sprawl and duplicated instructions both look like "too much stuff," but the repairs differ. Sprawl is a routing problem: the model cannot tell which tool fits, so the catalog needs fewer, better-described entries. Duplication is a maintenance problem: several copies of a rule exist, so the fix is consolidation. More documentation helps the first and worsens the second.

Prompt-as-policy and over-privileged access both show up as unauthorized actions, but one is a control never enforced and the other a control granted too broadly. A stronger sentence helps neither.

> **Review heuristic:** If your proposed fix is "write a clearer instruction," check whether the problem is actually one that code, scope, or configuration should solve.

### Triaging an architecture that feels wrong

When a reviewer says a design feels wrong but cannot name why, a short routine restores clarity. Answer these questions in order before proposing changes.

1. Where is the work spent? Look for unbounded loops and repeated calls; this exposes budget failures.
2. What can change state? Inventory tools that write, send, delete, or publish and their authority; this exposes privilege failures.
3. What does the model see at the decision point? Reconstruct actual context, not intended context; this exposes freshness failures.
4. What happens on failure? Trace a failed step forward and ask whether it is visible; this exposes silent propagation.
5. Which rule is written more than once? Search configuration, skills, prompts, and tool descriptions; this exposes drift.

The fifth question is productive. Two copies of a rule drift apart, the agent follows one while planning and the other while executing, and the contradiction looks like a reasoning failure that invites a futile prompt rewrite.

Triage also distinguishes the reported path from the actual one. Draw the request as it really runs, including retries, fallbacks, and subagents; the clean design diagram rarely contains the loop causing trouble.

### The review-board checklist

A review board does not need a long form, only questions that force attention to each layer and seam. Require a concrete answer rather than a nod.

```text
ARCHITECTURE REVIEW CHECKLIST

Scope and stop
[ ] What is the success condition, and who detects it?
[ ] What are the step, spend, and call ceilings?
[ ] What happens visibly when a ceiling is reached?

Boundary checks
[ ] Which handoffs validate data before it crosses?
[ ] Which tool results are filtered before re-entering context?
[ ] Is untrusted source text separated from instructions?

Authority
[ ] Which actions can change external state?
[ ] Which require an approval token enforced in code?

Single source of truth
[ ] Where is each durable rule defined exactly once?
[ ] Do other layers reference that definition rather than copy it?

Context health
[ ] What is the token budget, and who enforces it?
[ ] How are sources labeled for provenance?

Failure path
[ ] Which errors are retryable and which are terminal?
[ ] What next action does each error result give the caller?

Review points
[ ] Where does a human inspect real work rather than a summary?
[ ] Is the review depth matched to the failure affordance?
```

> **Try it:** Take a system you know well and answer the checklist with evidence, not intentions. Any item you answer with "we assumed" marks a seam that deserves attention.

## Worked scenario

A compliance team asked for an assistant that reviews contract amendments against an internal policy manual. Early versions read a folder, produced a summary, and flagged clauses. Reviewers soon reported three problems: long stretches of activity with no report, flags on clauses the policy allowed, and one annotated copy saved over an original document.

An architect traced one problematic request across the layers instead of rewriting prompts.

At the workflow layer, a scheduled job launched reviews and expected a completion message. With no timeout, a stalled run left the queue waiting. The completion message existed only as prose in the instruction, so it was not reliably produced. This was an unbounded loop paired with a missing workflow signal.

At the prompt layer, one instruction said "do not modify source documents," a configuration file repeated it differently, and a reusable instruction package added a third copy. One version said "avoid changing files," which the agent read as permission to annotate in place. This was duplicated instructions, and the overwritten original followed directly.

At the tool layer, one file tool had both read and write capability under a broad credential, with no approval token. The prompt said not to modify sources, but the tool accepted the write. This was prompt-as-policy plus over-privileged access. The fix was a read-only tool for review and a separate write tool requiring approval.

At the context layer, each run loaded the entire manual. As it grew, the governing rule was buried and the agent selected a similar-sounding paragraph elsewhere. The polished summary cited a real passage, making the mistake hard to notice: context dumping producing polished-but-wrong output. The repair was budgeted retrieval with source labels and a requirement that each flag cite a rule identifier.

A retrieval call once returned an empty result. The agent read it as "no relevant policy" rather than a failure, and the workflow marked the run complete. Silent error propagation had turned a transient problem into a confident false conclusion; a typed error with a retry action fixed it.

Changes followed source order: enforce a timeout and structured completion in the workflow, consolidate the duplicated rules, split the file tool, replace the full load with budgeted retrieval, and give errors an explicit status. Only then did the team revisit prompt wording, and the revision was small because the prompt had been carrying responsibilities that belonged elsewhere.

> **Exam note:** A scenario that mentions several symptoms at once is usually asking you to find the earliest responsible layer, not the most visible symptom.

## Common mistakes

- Fixing the symptom in the layer where it appears instead of the layer where it originates.
- Raising a step ceiling when the real problem is an unreachable stop condition.
- Adding more tools to reduce wrong-tool selection, which usually worsens tool sprawl.
- Copying a durable rule into several configuration files to "make sure it is obeyed."
- Treating a permission statement in a prompt as an enforced control.
- Loading complete source documents to avoid the effort of designing retrieval.
- Assuming a successful-looking result means earlier steps succeeded.
- Reviewing only the happy path and ignoring retries, fallbacks, and subagent branches.

## Chapter summary

- The five layers form a relay; defects in one layer surface as symptoms in another.
- Cross-layer concerns such as reliability, governance, and cost require coordinated decisions, not a single owner.
- Bound the loop at every layer, with ceilings that produce visible outcomes when exceeded.
- Validate data at each handoff, matching the check to the damage a bad value could cause.
- Gate risky actions with controls enforced in code, with authority scoped to the task.
- Diagnose antipatterns by symptom, then repair the earliest responsible layer.
- Use a short review checklist to force evidence-based answers about budgets, boundaries, authority, duplication, context, failure, and review points.

## Checkpoint questions

1. An agent repeatedly calls a search tool, produces no final answer, and the pipeline never advances. Which fix acts at the earliest responsible layer?

A. Add a prompt sentence asking the agent to finish sooner.

B. Add a step budget and an enforced stop condition in orchestration code.

C. Increase the context window so more tool results fit.

D. Rename the search tool for more reliable discovery.

2. A rule saying "never modify source documents" appears in configuration, a skill, and a prompt. Runs have added annotations because one copy says "avoid changing files." What is the best repair?

A. Add a fourth copy with stronger wording.

B. Ask the model to restate the rule before each action.

C. Keep one authoritative definition and reference it elsewhere.

D. Remove all file tools from the assistant.

3. Which situation most clearly demonstrates prompt-as-policy?

A. A tool refuses a write without an approval token; the prompt explains why.

B. A prompt says approval is needed, but the tool accepts the call without a token.

C. A prompt lists allowed tools and the runtime filters them.

D. A skill describes a workflow whose steps are enforced in code.

4. A polished summary cites a real paragraph from the policy manual, but the paragraph reflects a superseded rule. What repairs the root cause?

A. Ask for a longer summary so more context is visible.

B. Replace the full load with budgeted retrieval that labels sources and dates.

C. Lower sampling so the answer is more repeatable.

D. Add a second pass that rewrites the summary in another style.

5. A failed retrieval returned an empty result and the next step treated it as "no matching policy." Which principle was violated?

A. Bounding the loop.

B. Keeping one source of truth.

C. Validating at boundaries and making failures visible.

D. Matching review depth to failure affordance.

6. A catalog has three tools that read customer records, with overlapping descriptions and parameters. The agent picks the wrong one. What helps most?

A. Add two more specialized tools for missing cases.

B. Consolidate into a few clearly described tools with distinct purposes.

C. Give all three tools broader permissions so any can finish.

D. Write a prompt telling the agent to try each tool until one works.

### Answers and rationale

1. Correct answer: B. A missing ceiling and absent stop condition are agentic-layer defects, and enforced code halts the loop. Option A is a prompt-level hope; prose cannot stop a loop with no enforced limit. Option C changes capacity, not control, and makes a runaway loop costlier. Option D addresses discovery, but the tool is plainly being found and called.

2. Correct answer: C. Consolidation removes the drift and references preserve one authoritative rule. Option A adds another copy, guaranteeing another drift point. Option B puts a compliance decision inside model output, exactly the pattern to avoid. Option D removes capability instead of governing it, blocking legitimate reads too.

3. Correct answer: B. The control exists only as prose and the tool does not enforce it, so the policy is advisory. Option A is the desired design because the token check holds regardless of the prompt. Option C is runtime filtering, an enforced control. Option D implements rules in code, the opposite of prompt-as-policy.

4. Correct answer: B. Unfiltered, unlabeled context buried a superseded rule; retrieval with provenance and dates removes it. Option A adds material to an overloaded window and worsens selection. Option C affects consistency, not correctness, and repeats the wrong citation reliably. Option D changes presentation while leaving faulty evidence untouched.

5. Correct answer: C. An empty result caused by failure should be classified and surfaced, not read as a finding. Option A concerns ceilings, which are not at issue. Option B concerns duplicated rules, unrelated here. Option D concerns how deeply a human reviews, which does not repair an invisible error.

6. Correct answer: B. Fewer tools with accurate descriptions improve routing and remove overlap. Option A increases sprawl and makes selection harder. Option C widens authority without improving routing and adds security risk. Option D turns design into trial and error, wasting steps and risking side effects.

---

*End of chapter 25.*
