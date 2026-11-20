# Chapter 9 — Multi-Agent Coordination and Subagent Design

A single agent is usually the simplest design that can do the job. Adding a second agent is not a way to make a system look more capable; it is a way to buy something specific — parallel progress, a cleaner context, or a narrower grant of authority — at the price of coordination. Architects who internalize that trade-off make better decisions under exam pressure, because the question is rarely "can this be split?" It is "what breaks if it is split, and who pays for the break?"

This chapter treats multi-agent design as an exercise in boundaries. Each agent is a small system with its own loop, its own context, and its own permissions. Every handoff between agents is a contract that must carry enough meaning to survive the trip. When those contracts are vague, a system of capable agents can still produce duplicated effort, contradictory conclusions, and work that nobody owns.

## Learning objectives

- Decide when an additional agent earns its coordination cost and when a single agent remains the better choice.
- Distinguish an orchestrator from a worker and describe what each one owns.
- Describe a subagent as a scoped call that wraps a model, tools, and instructions.
- Explain how context isolation and authority isolation reduce coupling between tasks.
- Write a handoff payload that carries decisions and constraints instead of raw history.
- Recognize duplicate work, conflicting decisions, and runaway spawning, and name the guardrail for each.

## Key concepts

### When More Than One Agent Helps

There are four honest reasons to introduce another agent. First, context pressure: a task may require holding two large, mostly unrelated bodies of material in mind at once, and putting both into one context window makes the model worse at using either. Second, parallelism: several independent investigations can proceed at the same time instead of queuing behind one another. Third, authority: a subtask may need a powerful capability that the main task should not possess, so it is safer to grant that capability to a short-lived worker. Fourth, specialization: a subtask may benefit from a different set of instructions or a tighter output contract than the main thread can comfortably carry.

Each reason has a mirror image in which splitting makes things worse. If the subtasks need constant access to the same evolving facts, isolation becomes a liability because every agent works from a stale snapshot. If the work is small, the time spent briefing and collecting results exceeds the time saved. If a correct answer depends on one coherent line of reasoning, parallel voices can produce a compromise that is worse than any single voice. A useful mental test is to ask what unique thing the second agent can see or do that the first one cannot. If the answer is "nothing, it just has fewer distractions," a context trim is probably the cheaper fix.

> **Exam note:** A scenario that emphasizes *shared, rapidly changing state* usually argues against splitting. A scenario that emphasizes *independent evidence sources* or *different permission needs* usually argues for it.

The cost side deserves equal attention. Coordination is not free even when the model calls are cheap. Someone must define the boundary, restate the constraints on both sides of it, validate each result, and reconcile results that disagree. Those duties fall on the orchestrator, and they consume the same attention budget that the actual analysis would have used. A design that adds three workers to save reasoning often spends the savings on bookkeeping.

There is also a failure-surface cost. Every added agent is another place where instructions can drift out of date, another set of permissions to review, and another result that must be interpreted. When a requirement changes, the orchestrator must propagate it to every affected brief. If that propagation is manual and undocumented, the system slowly accumulates workers operating on obsolete rules. Architects should therefore treat the number of agents as a design decision with maintenance consequences, not as a one-time choice made at launch. A useful question during review is: if this policy changes tomorrow, how many places must be edited?

| Reason to add an agent | What it buys | What it costs |
| --- | --- | --- |
| Context pressure | Room to reason over separate corpora | Restating constraints in every brief |
| Parallelism | Shorter wall-clock time for independent work | Reconciliation when results disagree |
| Authority separation | Smaller blast radius for powerful tools | Extra trust boundary to audit |
| Specialization | Tighter instructions and output contracts | More surfaces to maintain and version |

### The Orchestrator and the Worker

In the orchestrator-and-worker pattern, one agent owns the goal and the others own pieces of it. The orchestrator decomposes the goal, chooses what to run next, supplies each worker with a brief, and decides whether the collected results are sufficient. It is the only participant that may revise the plan. The worker accepts a bounded task, performs its own observe–decide–act loop, and returns a result. It does not decide that the overall goal should change, and it does not assign work to other agents unless it has been explicitly given that authority.

The asymmetry matters. An orchestrator that starts doing worker-level reasoning tends to reabsorb all the context the design was meant to keep out. A worker that starts making orchestration decisions tends to spawn work nobody requested. Good designs keep these roles crisp and make the boundary visible in the configuration: the orchestrator holds the plan and the stop conditions; workers hold task-specific instructions and a limited tool set.

This pattern also makes failure easier to localize. When a result is wrong, an architect can ask whether the brief was wrong, the worker's execution was wrong, or the orchestrator's aggregation was wrong. Those are three different repairs. In a single undifferentiated thread, the same question often has no clean answer.

Aggregation deserves particular care because it is where the orchestrator adds the most value and can do the most damage. Aggregation is not formatting. It means checking coverage, comparing results against the same facts, detecting contradictions, and deciding whether the evidence is sufficient to proceed. An orchestrator that merely staples worker outputs together has added coordination cost without adding judgment. In a well-designed system, the workers make the observations and the orchestrator owns the conclusion.

> **Design rule:** Give the orchestrator the plan and the stop conditions. Give each worker the task and the tools. Do not give either role the other's job "just in case."

### What a Subagent Actually Is

A subagent is best understood as a scoped call rather than as a character. The caller supplies a brief that names the task, the information available, the tools the worker may use, the expected output shape, and the budget. The runtime creates a fresh execution environment from that brief, runs a loop, and returns a result. Nothing about the caller's conversation is silently inherited; whatever the worker needs must be stated in the brief.

Structurally, an agent is a wrapper around three things: a model that reasons, a set of tools that act, and instructions that frame the work. Changing any of the three changes the agent's behavior. This is why "just add a subagent" is not a complete design statement. An architect still has to decide which model configuration is appropriate, which tools are in scope, and what instructions travel with the call. A worker with the same tools and the same instructions as its caller is usually just the same agent with extra steps.

It is worth separating a subagent call from a tool call. A tool call sends arguments and receives data or an effect; the caller remains the reasoning authority. A subagent call sends a goal and receives a result that already contains reasoning. That distinction explains why subagents are useful for judgment-heavy subtasks and wasteful for lookups. Delegating a dictionary lookup to a subagent adds a whole loop to a job that a single tool call finishes.

### Isolation as a Design Feature

Isolation is the reason delegation works, and it is also the thing that most often surprises newcomers. Context isolation means a worker does not see the main thread's history. This prevents early speculation in the main thread from anchoring the worker, and it keeps the worker's context small enough to reason clearly. The price is that any constraint the worker must respect has to be written into the brief explicitly. A rule that everyone "knows" from the main conversation does not exist for the worker.

Authority isolation means a worker receives only the tools it needs. A worker that reads documents should not be able to send messages. A worker that drafts text should not be able to modify a production record. This is the same least-privilege principle applied to a temporary participant rather than to a long-lived account, and it limits the damage when a worker misunderstands its task. Isolation also creates a cleaner audit story: each result can be traced to a specific brief with a specific permission set.

Isolation is not the same as secrecy between agents. If two workers must agree on a shared set of facts, those facts should be supplied to both from a common source rather than discovered independently. Otherwise the system pays for isolation and then quietly reintroduces inconsistency through different inputs.

Isolation should also be tested, not assumed. A practical test is to run a worker with a deliberately misleading line in the main thread and confirm that the worker's result does not change. Another is to grant a worker only read tools and verify that a request to write fails rather than being quietly reinterpreted. These checks are cheap, and they catch the common case in which a design document claims isolation that the actual configuration does not enforce.

### Handoffs and Communication Contracts

A handoff payload should carry decisions, not dialogue. A raw transcript drags along every false start and every abandoned hypothesis, which is precisely the clutter delegation was meant to avoid. A good payload is short, structured, and answerable: what was asked, what was found, what was decided, what is still open, what artifacts exist, and who owns the next step. When a result is passed upward, it should also say how confident the worker is and which evidence supports the claim.

The brief that starts a worker should have the same discipline. It should state the goal in one sentence, list the constraints that actually bind, name the allowed tools, define the output shape, and set a budget. A subagent brief is a small contract, and vague contracts produce vague results.

```text
SUBAGENT BRIEF
task: Identify all contractual commitments with a future date in the supplied reports.
inputs: Three reports attached by reference; no external lookups.
scope: Obligations and renewal dates only. Exclude pricing discussion.
allowed_tools: read_document, search_within_documents
output: JSON list of {report_id, obligation, date, evidence_quote}
budget: At most 12 tool calls. Stop and report partial results if exceeded.
escalate_if: Two reports disagree on the same obligation.
on_return: State coverage and list any unread sections.
```

> **Common mistake:** Copying the entire main-thread conversation into a worker brief. That defeats context isolation and makes the worker inherit the caller's assumptions. Restate the need, not the history.

### Failure Modes and Their Guardrails

Three failure modes recur often enough to memorize. Duplicate work happens when boundaries overlap: two workers are asked to "review the vendor documents" and neither knows the other has the same file. The guardrail is an explicit ownership map in the brief, including which inputs each worker may touch. Conflicting decisions happen when two workers answer the same underlying question from different premises. The guardrail is a single source of shared facts plus an aggregation step that compares results before accepting them. Runaway spawning happens when workers are allowed to delegate without a budget. The guardrail is a depth limit and a total task cap enforced by the runtime, not by a sentence in a prompt.

A fourth, quieter failure is the orphaned subtask: a worker finishes after the orchestrator has already moved on, and its result is never read. This is a sequencing problem. Results should be collected at defined synchronization points, and any result arriving after that point should be marked as late rather than silently merged.

| Failure mode | Typical symptom | Guardrail |
| --- | --- | --- |
| Duplicate work | Two results cover the same material | Explicit input ownership in each brief |
| Conflicting decisions | Results recommend incompatible actions | Shared facts and a comparison step |
| Runaway spawning | Task count grows without bound | Depth limit and hard task cap |
| Orphaned subtask | A late result is never used | Defined collection points and late-result flags |

> **Exam note:** If a scenario describes an agent creating more agents without a cap, the correct answer is almost always a runtime-enforced limit. Instructions alone are not a safeguard.

## Worked scenario

A risk team needs a short memo summarizing commitments found in a set of internal project reports. The reports are long, and the team also has a policy catalog that defines which commitments require escalation. The main thread has already accumulated the discussion with the requester, including several tentative interpretations that should not influence the analysis.

An architect considers a single agent that reads everything. The trouble is not raw size alone; it is that the tentative interpretations and the policy catalog compete for attention, and the memo must reflect the reports rather than the earlier speculation. The architect chooses an orchestrator with two workers. One worker reads only the reports and extracts commitments with supporting quotations. The other reads only the policy catalog and returns the escalation rules in a fixed format. Neither worker sees the main-thread discussion.

The orchestrator's brief for each worker restates the shared date format and the definition of a commitment, because those constraints exist only in the main conversation. It also assigns disjoint inputs so the workers cannot duplicate each other. Each brief caps tool calls and requires a coverage statement. When the results return, the orchestrator does not simply concatenate them. It checks that every extracted commitment has a rule assigned, flags any commitment with no matching rule, and asks a clarifying question rather than inventing a policy. The final memo is then written from those checked results.

The design succeeds for a modest reason: the orchestrator keeps the decisions, and the workers keep the reading. If the policy catalog had been changing while the reports were being read, the architect would have reversed the choice — a single thread with a fresh catalog read at the point of decision would have been safer than two workers holding different snapshots.

## Common mistakes

- Adding agents because the task "feels big," without naming the specific benefit being bought.
- Assuming workers inherit the main thread's constraints and corrections.
- Giving a worker the same broad tool set as the orchestrator.
- Letting workers delegate further with no depth or count limit.
- Passing raw transcripts as handoffs instead of distilled decisions.
- Treating disagreement between workers as noise to be averaged away.

## Chapter summary

- Multi-agent design trades coordination cost for parallelism, context room, authority separation, or specialization.
- The orchestrator owns the plan and stop conditions; workers own bounded tasks and return results.
- A subagent is a scoped call wrapping a model, tools, and instructions — not a persistent persona.
- Context and authority isolation must be paid for by restating constraints in each brief.
- Handoffs should carry decisions, evidence, coverage, and open questions.
- Duplicate work, conflicting decisions, runaway spawning, and orphaned subtasks each have a specific runtime or contract-level guardrail.

## Checkpoint questions

1. A task requires reading two unrelated corpora and combining findings, and the main thread already contains speculative interpretations. Which design is most defensible?

   - A. Put both corpora into one context and ask the model to ignore the speculation.
   - B. Use two workers with disjoint inputs and a brief that restates the binding constraints.
   - C. Let each worker read both corpora so neither misses anything.
   - D. Allow workers to spawn additional workers until all files are covered.

2. Which statement best describes a subagent?

   - A. A persistent identity that remembers every past conversation.
   - B. A tool that returns raw data without reasoning.
   - C. A scoped call that wraps a model, tools, and instructions in a fresh context.
   - D. A prompt template stored for later reuse.

3. A worker must respect a formatting rule that was agreed verbally in the main thread. What should the orchestrator do?

   - A. Assume the worker infers it from the overall goal.
   - B. Repeat the entire main-thread conversation in the brief.
   - C. Write the rule explicitly into the worker's brief.
   - D. Ask the worker to guess a reasonable format.

4. Two workers produce incompatible recommendations. What is the first appropriate response?

   - A. Average the recommendations into a compromise.
   - B. Compare their premises against a shared source of facts and flag the disagreement.
   - C. Discard both and start over with a single worker.
   - D. Let the worker with the longer output win.

5. Which guardrail directly addresses runaway spawning?

   - A. A polite instruction asking agents not to over-delegate.
   - B. A longer handoff summary.
   - C. A runtime-enforced depth limit and total task cap.
   - D. A more detailed tool description.

6. When is a single agent most likely the better choice?

   - A. When subtasks share rapidly changing state and require one coherent line of reasoning.
   - B. When independent evidence sources must be read in parallel.
   - C. When a subtask needs a powerful tool the main task should not hold.
   - D. When two large, unrelated corpora must be analyzed separately.

### Answers and rationale

1. **B.** Disjoint inputs prevent duplication, and restating constraints compensates for the worker's lack of main-thread history. **A** mixes the speculation back into the evidence the memo must avoid. **C** deliberately creates duplicate work. **D** introduces unbounded delegation without a cap or ownership map.

2. **C.** A subagent is created for a scoped purpose from a model, tools, and instructions, and returns a result. **A** confuses it with a persistent persona; its context is fresh. **B** describes a tool call, which does not perform its own reasoning loop. **D** describes a reusable instruction package, not an executing agent.

3. **C.** Isolation means constraints must be stated in the brief. **A** relies on information the worker cannot see. **B** is technically inclusive but defeats the purpose of isolation by importing clutter and speculation. **D** turns a binding rule into a guess.

4. **B.** Reconciliation starts by checking premises against shared facts; the disagreement may reveal a genuine source conflict that needs escalation. **A** produces a compromise neither result supports. **C** discards useful work before diagnosing the cause. **D** uses output length as a proxy for correctness.

5. **C.** A limit enforced by the runtime actually stops growth. **A** is a request, not a control. **B** improves communication but does not constrain behavior. **D** affects tool selection, not delegation depth.

6. **A.** Shared mutable state and the need for one coherent argument favor a single thread. **B** favors parallel workers because the sources are independent. **C** favors delegation for authority separation. **D** favors delegation for context relief.

---

*End of chapter 9.*
