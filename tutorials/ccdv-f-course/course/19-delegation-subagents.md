# Chapter 19 — Delegation, Subagents, and Memory Isolation

## Learning objectives

- Distinguish manager, supervisor, and worker roles and explain what each contributes.
- Identify the conditions under which subagents improve quality, speed, or context use.
- Recognize when delegation costs more than it saves.
- Separate shared knowledge from isolated working context and design a worker summary contract.
- Judge a framework abstraction by which responsibilities it performs rather than by its name.

## Key concepts

### Three roles that are easy to confuse

Delegation sounds simple until the roles are named precisely. A **worker** runs a bounded loop on one subtask, using a restricted tool set and returning a structured result. A **manager** receives the overall goal, decomposes it into worker assignments, decides when to send work back for clarification, and merges the returned results. A **supervisor** controls policy: it decides whether a proposed action is acceptable, collects approval, and owns any externally visible write. These are roles, not separate products; one component can wear two hats when the task is small.

Consider an audit for deprecated SDK usage across a dozen repositories. A manager splits the request by repository. Each worker searches code, reads a few files, and reports only the deprecated calls it found with file and line references. A supervisor checks that findings have evidence, resolves contradictions, and is the only component allowed to open a tracking issue. The workers never write anything.

Each role needs different capabilities: a worker needs deep data access but shallow authority, a supervisor needs authority without a large data view, and a manager needs a compact overview. Combining all three in one agent removes the boundaries that make delegation useful.

| Pattern | Structure | Best fit | Main cost | Typical failure |
| --- | --- | --- | --- | --- |
| Single agent | One loop and one context | Short, tightly coupled work | Context grows on large jobs | Late decisions ignore early constraints |
| Manager with workers | Fan-out assignments, summary returns | Parallel research or comparison | More total tokens and merge effort | Contradictory summaries accepted blindly |
| Supervisor with scouts | Read-only investigators, one acting authority | Environments with high blast radius | Extra handoffs and waiting | A scout proposes action without evidence |
| Specialist pipeline | Sequential workers with different tools | Staged transformation of an artifact | Latency accumulates across stages | One blocked stage stalls everything |
| Hierarchy | Manager, lead workers, then leaf workers | Very large investigations | Hardest trace to reconstruct | Duplicate work across branches |

The pattern follows the work: independent branches invite fan-out, ordered dependencies invite a pipeline, and risky consequences invite a supervisor with sole write authority.

### Why subagents help

**Context isolation** is the main benefit. A worker's search history, failed queries, and long documents stay inside its own view. The manager receives a compact result instead of a transcript. Without isolation, three branches of research would flood the manager with raw detail, and the quality of its final decision would fall as the view grew. Isolation is not merely a storage trick; it defines an information boundary that keeps reasoning focused.

**Parallel research** reduces wall-clock time when subtasks are independent. Four workers can investigate four repositories at once, while a single agent would process them in sequence. The trade-off is peak token use: four contexts run simultaneously, so total spend rises even though the wait shortens.

**Specialization** improves reliability when subtasks need different tools or different instructions. A worker that only reads code can have a narrow tool set and a precise contract. A worker that only checks documentation can be tuned for citation quality. Small tool sets reduce the chance of an irrelevant or unsafe call.

**Failure containment** is a quieter benefit. A worker that becomes stuck can be abandoned without discarding the whole run. Its partial result is marked incomplete, and the manager can either retry with a tighter assignment or report the gap honestly.

The mechanism that makes all four benefits real is the **summary return**. Each worker must finish with a required shape: answer, evidence identifiers, confidence, open questions, and any limits it hit. A narrative is not a summary. If the manager cannot see where a claim came from, it cannot verify the claim, and isolation has traded one problem for another.

> **Exam note:** A scenario with large intermediate output and a short final conclusion points to a subagent with an isolated context and a structured summary, not to one agent carrying every result.

### When delegation costs more than it saves

Fan-out is not free. Every worker pays its own startup context, model calls, and trace storage. The manager must decompose the goal well; a vague assignment produces a vague finding. Workers may duplicate discovery when they cannot see one another's work. Merging requires resolving overlaps and contradictions, which can consume more reasoning than the original task. Debugging becomes harder because a failure may live in any of several contexts.

| Benefit gained | Price paid | Diagnostic question |
| --- | --- | --- |
| Focused worker contexts | Token cost per worker | Is the manager's view actually bloated today? |
| Shorter wall-clock time | Higher peak spend | Can branches truly run independently? |
| Specialized tools and instructions | More contracts to maintain | Do subtasks need different capabilities? |
| Isolated failures | Harder cross-context debugging | Can a stuck branch be safely discarded? |
| Narrow authority per worker | More handoffs and approvals | Can authority be centralized without losing speed? |

Delegation is justified when the work decomposes into clean branches, each result is checkable, and the manager's context would otherwise become the bottleneck. It is not justified for one short investigation, for branches that constantly need one another's intermediate state, or when the team cannot describe the summary contract.

A special caution applies to shared writable resources. If several workers can create records, duplicate artifacts appear. The robust fix is structural: remove write tools from workers, give creation authority to one component, and require an idempotency key derived from the source identifier. Telling workers in their instructions to avoid duplicates is weaker, because concurrent workers cannot see each other's writes.

> **Common mistake:** Adding subagents to make a design look sophisticated. If the task has one branch, delegation adds cost and confusion without adding capability.

### Agent memory: what travels and what stays

Memory in an agent system is a matter of scope. **Working context** is the live material for one run: the goal, recent observations, the plan, and scratch notes. **Durable memory** holds curated facts that should survive across runs, such as a stable preference or a known constraint. The two are managed differently, and confusing them causes both bloated prompts and forgotten facts.

Delegation adds a third question: who can see what? In a **shared context** design, all participants read one evolving transcript. This is simple and gives everyone the same information, but it scales badly and lets one worker's wrong claim contaminate every other participant. In an **isolated context** design, each worker has its own view and communicates only through the summary contract. This protects focus but requires careful verification of what comes back. A **hybrid** keeps a shared read-only knowledge base while working sets remain isolated.

| Memory scope | Visible to | Lifetime | Appropriate contents |
| --- | --- | --- | --- |
| Worker working set | One worker only | Single subtask | Its queries, partial findings, and rejected leads |
| Manager working set | Manager only | Single run | Assignments, summaries, decisions, and conflicts |
| Shared session facts | All participants in one run | One session | The goal, constraints, and approved plan |
| Durable agent memory | Future runs that retrieve it | Across sessions | Curated preferences, stable environment facts, reusable procedures |
| External knowledge store | Any participant with read access | Managed separately | Documents, code, records, and references |

Writes to durable memory should be deliberate. Store conclusions, not transcripts; attach provenance and a timestamp; exclude secrets and sensitive personal data. Stale memory can poison many future runs, so some systems keep memory append-only and let later entries correct earlier ones. When a worker discovers a durable fact, it should propose the write rather than perform it silently, giving the supervisor a chance to check it.

Compaction shrinks a working set while preserving decisions and references; memory retrieval brings a durable fact into it when relevant. Neither substitutes for the other.

### Framework abstractions at a principle level

An agent SDK or orchestration framework usually supplies a loop engine, tool registry, hook bus, memory adapter, tracing layer, and subagent coordination. These encode patterns that are easy to implement incorrectly, but careless use hides state and policy behind an unfamiliar interface.

The useful question is which responsibilities the framework owns. Where does it store the current view? Where are arguments validated? Can a hook deny an action, or only observe it? How are summaries passed upward and traces correlated across branches? A team that cannot answer these questions will struggle to debug a strange run.

Frameworks help when the project genuinely needs several agents, dynamic tool selection, lifecycle hooks, and cross-run memory. They hurt when a fixed three-step task is wrapped in an engine that adds abstraction without managing real complexity. A practical middle path is to build a minimal direct loop first, then adopt a framework when the direct version becomes limiting. The direct version teaches exactly what the abstraction is doing.

> **Try it:** Pick a framework you have used and map its features to the five responsibilities above. Any responsibility you cannot locate is a place where behavior may be invisible during debugging.

### A coordinator sketch

The following snippet shows the essential shape of delegation. It is deliberately compact; real code would add retries, timeouts, and a stronger storage layer.

```python
def coordinate(goal, repos, registry, supervisor):
    assignments = [
        Task(question=f"Find deprecated SDK calls in {repo}",
             allowed_tools=["search_code", "read_file"],
             return_shape=FindingSchema)       # answer, evidence, confidence, gaps
        for repo in repos
    ]

    results = parallel([
        run_worker(a, step_cap=6, token_cap=12_000) for a in assignments
    ])

    usable = [r for r in results if r.status == "complete" and r.evidence]
    merged = merge_by_file(usable)             # overlaps removed, references kept

    if conflicts(merged):
        return supervisor.resolve(merged, evidence_required=True)
    return supervisor.approve_and_file(merged)  # the only component that writes
```

Workers hold read-only tools, so their exploration cannot change shared state. The required shape makes findings comparable. The merge step keeps provenance and removes overlap, and conflicts go back to the supervisor rather than being settled arbitrarily. Only the supervisor writes, which makes duplicate tracking issues structurally unlikely.

## Practice lab

**Goal.** Compare one agent with a two-worker fan-out on the same research question.

1. Choose a question that spans two independent sources, such as two separate code directories.
2. Run a single agent with both directories available and record its token use and final view size.
3. Run two workers, each restricted to one directory, with a required summary shape.
4. Compare traces: count how many raw search results reached the manager in each design.
5. Introduce a deliberate contradiction between the two summaries and observe the merge step.
6. Write down which design was easier to debug from its trace alone.

**Expected observation.** The single agent accumulates raw search output; the manager in the fan-out sees only two compact summaries. Total tokens are usually higher with two workers, while wall-clock time is lower. The contradiction reveals whether a conflict policy exists: without one, the manager may pick a claim arbitrarily.

## Worked scenario

### The problem

A platform team asks an agent to audit twelve repositories for deprecated SDK usage and produce one report. The first attempt used a single agent with full access to every repository. The run filled its context with file listings, lost track of repositories already checked, and produced a report with several unverified claims. A second attempt used twelve workers that could each open tracking issues. That run created overlapping issues for the same call site because workers could not see one another's writes.

### Reasoning

Both attempts failed for structural reasons. The single agent had an information problem: too much raw data in one view. The fan-out had an authority problem: too many writers. The fix is not a better prompt in either case. The work decomposes cleanly by repository, so fan-out is justified, but the summary contract and the write boundary must be designed explicitly.

### Resolution

The team assigns one read-only worker per repository. Each worker may search and read files but cannot write anything. Its summary must list the deprecated call, file and line, the rule it violated, and a confidence value. Workers receive a step cap and a token cap, and a stuck worker is marked incomplete rather than retried indefinitely.

A manager merges summaries by file and line, collapsing duplicates and preserving the rule reference for each finding. When two workers report different classifications for the same call, the manager escalates the conflict to a supervisor instead of choosing one. The supervisor verifies a sample of findings, approves the report, and is the only component permitted to open issues. Issue creation uses an idempotency key derived from repository, file, and line.

| Earlier failure | Structural cause | Change made |
| --- | --- | --- |
| Context filled with file listings | No isolation for parallel branches | Read-only workers with compact summaries |
| Unverified claims in report | No evidence requirement | Mandatory file and line references |
| Duplicate tracking issues | Many workers held write authority | One supervisor writer with an idempotency key |
| Conflicting classifications | No conflict policy | Escalation to supervisor with evidence required |

The new run costs more tokens but finishes sooner and produces a report whose claims can be checked. The trace is larger, yet each branch is readable on its own, which makes debugging practical.

> **Exam note:** When a scenario combines parallel workers with a shared writable resource, look for centralized writes plus an idempotency key. Instructions to "be careful" are not a mechanism.

## Common mistakes

- Delegating work that has no independent branches.
- Letting workers return long narratives instead of structured summaries.
- Omitting evidence identifiers, which makes the manager's output unverifiable.
- Giving write-capable tools to parallel workers that share a resource.
- Assuming a shared context solves coordination when it actually spreads contamination.
- Persisting raw worker transcripts into durable memory.
- Choosing a framework before understanding which responsibilities it hides.
- Resolving contradictory findings by picking the first one rather than escalating.

## Chapter summary

- A worker executes a bounded subtask, a manager decomposes and merges, and a supervisor owns policy and writes.
- The pattern follows the work: independent branches favor fan-out, ordered stages favor a pipeline, and risky actions favor a supervisor.
- Subagents help through context isolation, parallel research, specialization, and failure containment.
- They cost more through extra tokens, duplicated discovery, merge effort, and harder debugging.
- A summary contract with evidence, confidence, and gaps is what makes isolation useful.
- Shared context spreads information and contamination; isolated context contains both.
- Durable memory should hold curated conclusions, not transcripts, and writes should be deliberate.

## Checkpoint questions

1. Which role should be the only one able to open a customer-visible tracking issue?

A. Every worker, so each can report directly
B. A supervisor with an approval gate and an idempotency key
C. The worker that finishes first
D. No component; issues should never be created

2. What is the main purpose of a worker summary contract?

A. To make workers run faster
B. To give the manager compact, comparable results with evidence
C. To replace the tool registry
D. To remove the need for a trace

3. Which situation most clearly justifies delegation?

A. One short lookup with a single tool
B. Four independent investigations whose raw output would flood one context
C. A fixed three-step conversion with no uncertainty
D. A task with no checkable result

4. Several workers are creating duplicate records for the same finding. Which fix is strongest?

A. Ask each worker to check for existing records first
B. Give workers different search terms so they cannot overlap
C. Remove write tools from workers and centralize creation with an idempotency key
D. Increase each worker's step cap

5. What is a key risk of a fully shared context across all agents?

A. Workers use too few tokens
B. One worker's incorrect claim can contaminate every other participant
C. The manager cannot read any results
D. Traces become impossible to store

6. Which item belongs in durable memory rather than a worker's working set?

A. The worker's failed queries from this run
B. A stable, verified rule that applies in future runs
C. The raw text of a large file
D. A one-time token used by one tool call

7. When does a framework most likely hurt a project?

A. It supplies a hook bus and tracing for a multi-agent system
B. It centralizes tool registration for many tools
C. It hides state and policy in a simple task that has no framework-level complexity
D. It provides a tested orchestration pattern for parallel workers

### Answers and rationale

1. **Correct: B.** A visible write belongs to one authorized component with approval and an idempotency key. A is wrong because parallel writers cannot see one another's records. C is wrong because speed does not confer authority. D is wrong because visible writes may be legitimate; they simply need control.

2. **Correct: B.** The contract defines the information boundary between worker and manager, including evidence. A is wrong because summaries do not change execution speed. C is wrong because a registry and a summary serve different purposes. D is wrong because traces are still needed for audit.

3. **Correct: B.** Independent branches with heavy intermediate data are the classic case for isolation and fan-out. A and C are simple enough for one agent or a workflow. D is wrong because an unverifiable result makes delegation harder to manage, not easier.

4. **Correct: C.** One writer with an idempotency key makes duplicates structurally impossible. A is wrong because concurrent workers cannot see uncommitted writes. B only reduces overlap. D would likely produce more records.

5. **Correct: B.** A single evolving transcript spreads any wrong claim to all readers. A is unrelated. C is the opposite of what shared context does. D is false; traces remain storable, though less clearly separated.

6. **Correct: B.** Durable memory holds verified facts useful across runs. A and C are volatile working material. D is a secret that should not be persisted at all.

7. **Correct: C.** Abstraction hurts when it manages complexity the project does not have. A, B, and D describe genuine needs that a framework can satisfy well.

---
*End of chapter 19.*
