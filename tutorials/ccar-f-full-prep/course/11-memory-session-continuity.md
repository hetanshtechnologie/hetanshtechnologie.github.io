# Chapter 11 — Memory, Session Continuity, and Timeline Separation

A model does not remember a project. It receives text, and whatever is not in that text is unavailable to it. Continuity is therefore a property of the system around the model: the state it records, the summaries it carries forward, and the boundaries it maintains between unrelated work. Architects who treat memory as a feature of the model tend to build systems that work convincingly for a short conversation and then fail quietly when the conversation grows or when two tasks overlap.

This chapter examines how to keep work coherent across those conditions. It covers what belongs in a session record, when to compress a long thread, when to move facts into external storage, and how to keep one task's assumptions from leaking into another's. The governing idea is simple: memory is engineered, not recalled.

## Learning objectives

- Explain why session state belongs to the system rather than to the model.
- Contrast in-context memory with external memory and name the trade-off between them.
- Build a handoff summary that preserves decisions, constraints, and open questions.
- Separate timelines so that different tasks or users cannot contaminate one another.
- Recognize the signs that a long session has lost its early decisions.
- Choose among restarting with a distilled brief, summarizing, and persisting facts externally.

## Key concepts

### State Belongs to the System

The orchestration loop can only reason about what it can see. If a decision made earlier in a project is not present in the current context or in a store the loop can query, that decision does not exist for purposes of the current step. This is not a limitation to be worked around with better wording; it is the operating condition. The practical response is to make state explicit: a record of the goal, the decisions taken, the artifacts produced, the constraints in force, and the current position in the plan.

Treating state as a system component changes several design habits. Instead of hoping the model "keeps track," the architect decides where each kind of information lives and who may update it. Instead of assuming a correction will be honored indefinitely, the correction is written into the record that subsequent steps read. Instead of treating the conversation transcript as the source of truth, the transcript becomes one input among several, and the structured state becomes the canonical version.

This distinction also clarifies what continuity means. Continuity is not the illusion of an unbroken conversation. It is the ability to resume correct work after a break — a compacted context, a new session, a delegated subtask, or a pause of several days. A system has continuity when a fresh participant can read the handoff and proceed without re-deriving decisions that were already settled.

A state record also needs ownership. If every participant may edit it freely, it will eventually contain contradictory entries with no indication of which one is current. A common pattern is to let the orchestrator write the canonical record while workers only propose updates through their result payloads. Each update should carry a source — a decision, a tool result, or a human confirmation — so that a later reader can judge its authority. This is the same provenance discipline used for retrieved documents, applied to the memory of the workflow itself.

> **Exam note:** When an option says the model will "remember" a constraint from earlier in a long session, look for a competing option that records the constraint in state. The recorded version is almost always the intended answer.

### In-Context and External Memory

In-context memory is whatever is present in the current prompt: the instructions, the recent exchange, attached documents, and tool results. It is immediately available to the reasoning process, which makes it fast and flexible. It is also finite, expensive, and easily diluted. As unrelated material accumulates, important early constraints lose influence. A constraint that appears once at the beginning of a long thread may effectively disappear by the end.

External memory is anything the loop can retrieve on demand: a task record, a fact store, a document, or a catalog of previous decisions. It is durable and can be selective, so the loop pulls in only what the current step needs. The cost is retrieval discipline. Information that is stored but never queried is no more useful than information that was forgotten. External memory also introduces questions of freshness and authority: which record wins when two versions disagree?

Most working systems use both. A small, stable core of instructions and current decisions stays in context. Detailed histories, evidence, and per-task facts live outside and are fetched when needed. The design task is deciding what crosses the boundary in each direction. A useful rule is that in-context material should be what the next step must consider regardless of what it chooses to look up, while external material should be what the step may need but should not carry at all times.

| Quality | In-context memory | External memory |
| --- | --- | --- |
| Availability | Immediately visible to reasoning | Requires a retrieval step |
| Capacity | Limited by the context budget | Effectively expandable |
| Durability | Lost when the context is replaced | Persists across sessions |
| Risk | Dilution and lost early decisions | Stale or unretrieved records |
| Best use | Current goal, active constraints, recent decisions | Evidence, history, per-task facts |

### What a Handoff Summary Must Carry

A handoff summary is not a transcript with the boring parts removed. It is a purpose-built snapshot that lets a successor continue without reopening settled questions. At minimum it should name the goal, the constraints that still bind, the decisions already taken, the artifacts produced and where they live, the current status, and the open questions. It should also say what was tried and rejected, because otherwise a successor may spend effort rediscovering a dead end.

The summary should distinguish facts from interpretations. A fact is something recorded from a source or a tool result. An interpretation is a conclusion drawn from those facts. Mixing them is dangerous: a successor may treat an earlier hypothesis as established evidence. Labelling the difference costs a few words and prevents a common form of drift.

A good handoff also states its own limits. If certain files were not examined or a step ended with partial results, that belongs in the summary. Silence about gaps invites the assumption that coverage was complete. This is especially important when the successor is a subagent with no access to the earlier thread; it cannot discover what was omitted unless the omission is written down.

```text
CONTINUITY HANDOFF
goal: Produce a reviewed commitments memo for the current reporting period.
status: Extraction complete; reconciliation blocked on one missing policy rule.
decisions:
  - Only items with a dated obligation are in scope.
  - Pricing discussion is excluded from the memo.
  - Unmatched obligations are flagged, never inferred.
facts_recorded:
  - Source versions: reports A and B at current revision; policy catalog at prior revision.
  - Twelve obligations extracted with supporting quotations.
interpretations_pending:
  - Whether the renewal clause in report B counts as an obligation.
artifacts:
  - extract_results.json in the task workspace.
  - draft_outline.md in the task workspace.
gaps:
  - Report C was not supplied and has not been reviewed.
next_action: Retrieve the current policy catalog, re-run reconciliation, then draft.
do_not_repeat: The earlier approach of guessing a rule from similar wording was rejected.
```

> **Common mistake:** Summarizing the conversation chronologically. Chronology preserves the order in which ideas occurred, not the structure a successor needs. Organize by goal, decision, artifact, and gap instead.

A handoff should itself be checked before it is trusted. The check is straightforward: compare the summary against the active state and confirm that every binding constraint, every artifact reference, and every known gap appears in it. If the summary is generated by the same process that produced the thread, an independent pass is preferable, because a summarizing step can repeat an omission made earlier. Some teams keep a short standing list of must-carry fields and require the summary to fill each one, using an explicit marker when a field is empty. An honest "none recorded" is far more useful than a blank that a successor might overlook.

### Separating Timelines

Different tasks and different users require separate timelines. A timeline here means the combined context and state associated with one line of work. Keeping them separate prevents two kinds of harm. The first is factual contamination: a value from one task appears in another because both were present in the same context. The second is authority contamination: a permission or exception granted for one task is treated as available in another.

Separation works best when it is structural. Separate sessions or threads with their own state records are stronger than a single thread with verbal reminders to "forget the previous task." If a shared store is used, records should carry a task or user identifier, and retrieval should be scoped by that identifier. Relying on the model to ignore irrelevant material is unreliable precisely because relevance is a judgment the model makes, and a confident judgment can still be wrong.

> **Design rule:** Scope by identity at the storage and retrieval layer. A label inside a prompt is a hint; a filter on the query is a boundary.

There is a legitimate need for cross-task knowledge, such as a house style rule or a shared security policy. That material should live in a common source that is explicitly included in each timeline, rather than being accidentally inherited from a neighboring task. The difference matters: explicitly included guidance is visible, versioned, and reviewable. Accidentally inherited context is none of those things.

Separation also makes exceptions manageable. A temporary exception granted for one task — access to a restricted record, for example — should be recorded against that task's identifier and expire with it. If exceptions are kept only in a shared conversation, they tend to persist informally and be reused in contexts where they were never authorized. An auditor should be able to answer two questions from the record: which task was granted the exception, and when did it cease to apply.

### Long Sessions and Lost Decisions

Long sessions fail in predictable ways. Early decisions stop influencing later steps because they are far from the recent text. Corrections are repeated because the record does not show that they were adopted. The system starts producing confident statements that contradict what it agreed to earlier. None of these require a model error; they follow from treating the transcript as memory rather than as raw material for memory.

The remedy is periodic consolidation. At defined points — after a major decision, before a handoff, or when the context grows large — the orchestrator should write a compact current state and carry that forward instead of the full history. Consolidation should be an explicit step with a check: does the new summary preserve all binding constraints and all decisions that later steps depend on? Without that check, summarizing can lose exactly the detail that made the summary necessary.

Another remedy is to restate the active constraints at decision points rather than only at the start. A short reminder immediately before a consequential step has more influence than the same sentence embedded in a long preamble. This is not a substitute for state; it is a way of projecting the state into the place where reasoning happens.

Consolidation should be triggered by events rather than left to intuition. Sensible triggers include completion of a major step, any change to a binding decision, an approaching context limit, and the arrival of a new participant. Each trigger produces the same artifact: a refreshed snapshot plus a check that nothing essential was lost. Event-driven consolidation is easier to audit than a rule to "summarize when it feels long," and it prevents the common situation in which the need is recognized only after the context is already crowded.

### Choosing Restart, Summarize, or Persist

Three responses are available when memory pressure or continuity risk becomes significant. Restart with a distilled brief means ending the current context and beginning a fresh one with only the essential goal, decisions, and constraints. Summarize means compressing the current thread into a durable snapshot while keeping the same line of work. Persist externally means writing structured facts to a store so they can be retrieved selectively later. They solve different problems.

Restart is best when the thread has accumulated contradictory material, abandoned approaches, or speculation that keeps resurfacing. It gives a clean reasoning surface but risks losing detail that was never written down. Summarize is best when the work is healthy but the context is large; it preserves continuity with less disruption. Persist is best when facts will be needed across many sessions or by several participants, and when those facts have a natural structure, such as a list of decisions or a catalog of source versions.

| Situation | Preferred response | Reason |
| --- | --- | --- |
| Thread full of abandoned hypotheses | Restart with a distilled brief | Removes misleading material at the root |
| Healthy task with a large context | Summarize at a checkpoint | Preserves decisions with minimal disruption |
| Facts needed across many sessions | Persist externally | Durable and selectively retrievable |
| Correction repeated several times | Update the state record and restate it | Prevents recurrence at the decision point |
| Two tasks sharing one context | Separate timelines with scoped retrieval | Stops cross-task contamination |

The choices can be combined. An architect might persist key facts, summarize the current thread, and then start a fresh context from that summary. What matters is that each action is deliberate and that the resulting record is checked. A summary that silently drops a constraint is worse than a long thread, because it looks authoritative while being incomplete.

> **Exam note:** A crowded but otherwise sound thread points toward summarization; a thread full of retracted claims and abandoned approaches points toward a fresh start. Facts needed by several participants point toward external persistence.

The choice also has an authority dimension. A summary carries forward what the previous process asserted, including any mistaken conclusion that was never corrected. Persisting raw facts separately gives a reviewer something independent to check against. That is why high-stakes workflows often keep both a narrative snapshot for continuity and a structured fact record for verification.

## Worked scenario

A review project runs over several working periods. Early in the project, the team agreed that only dated obligations would be counted and that unmatched items would be flagged rather than inferred. Two extraction runs were completed, and their results were saved with the source versions they came from. A later drafting step begins to include an undated clause because the original agreement is now buried deep in the thread.

An architect traces the problem to memory handling rather than reasoning quality. The agreement existed only as an early message, the extraction results were present as raw tool output, and no current summary stated the rule at the point of drafting. The team adds three changes. First, the two rules are written into a persistent task record and carried in every handoff. Second, a consolidation step after each extraction produces a short state snapshot that includes decisions, artifacts, and gaps. Third, the drafting step begins by reading the snapshot and restating the two rules before it writes anything.

When a new participant joins to review the draft, the team does not hand over the transcript. It hands over the continuity summary: goal, status, binding decisions, recorded facts, interpretations still pending, artifacts, known gaps, and the rejected approach. Because the summary separates facts from interpretations, the reviewer can see that the status of one clause is still open rather than settled. Because it names the source versions, the reviewer can tell that a later policy update would require re-checking the reconciliation step.

The project also runs a separate analysis for a different department at the same time. Rather than one long thread with reminders to keep the two apart, each analysis receives its own state record and its own retrieval scope. A shared style guide is included explicitly in both. When a figure from the first analysis appears in a draft of the second, the scoped record makes the anomaly visible immediately instead of allowing it to pass as plausible-looking content.

## Common mistakes

- Assuming that a model retains earlier constraints without them being present or retrievable.
- Using a chronological transcript as the handoff summary.
- Mixing recorded facts with interpretations in the same unlabelled field.
- Keeping separate tasks in one context and relying on verbal reminders to separate them.
- Summarizing a thread without checking that binding decisions survived.
- Persisting facts but never defining who retrieves them or when.

## Chapter summary

- Continuity is a property of recorded system state, not of the model's memory.
- In-context memory is immediate but finite; external memory is durable but needs retrieval discipline.
- A handoff should carry goal, status, decisions, facts, interpretations, artifacts, gaps, and next action.
- Separate timelines structurally, with scoped storage and retrieval rather than prompt-level reminders.
- Long sessions need consolidation and restatement of constraints at decision points.
- Restart, summarize, and persist solve different problems and can be combined deliberately.

## Checkpoint questions

1. Why is a conversation transcript a weak source of truth for a long task?

   - A. Transcripts are too short to be useful.
   - B. Models cannot read transcripts at all.
   - C. It preserves chronology rather than current decisions, and early constraints lose influence.
   - D. Transcripts cannot be stored externally.

2. Which item belongs in a continuity handoff summary?

   - A. Every message exchanged during the task.
   - B. Binding decisions, artifacts, gaps, and the next action.
   - C. Only the most recent reply.
   - D. A list of the model's uncertain phrases.

3. What is the strongest way to prevent cross-task contamination?

   - A. Ask the model to forget the other task.
   - B. Put a reminder at the end of the prompt.
   - C. Use separate state records and scoped retrieval by task identifier.
   - D. Alternate between the two tasks in one thread.

4. A thread is healthy but has grown large. Which response fits best?

   - A. Restart from scratch with no summary.
   - B. Summarize at a checkpoint and verify that key decisions survived.
   - C. Delete all tool results without recording anything.
   - D. Continue indefinitely and rely on the model to prioritize.

5. When does restarting with a distilled brief beat summarizing?

   - A. When the thread contains contradictory material and abandoned hypotheses that keep resurfacing.
   - B. When facts are needed across many future sessions.
   - C. When the context is large but the reasoning is sound.
   - D. When two tasks must share a style guide.

6. Why should a summary separate facts from interpretations?

   - A. To make the summary longer.
   - B. To let a successor treat a hypothesis as established evidence.
   - C. To prevent an earlier hypothesis from being mistaken for recorded evidence.
   - D. To remove the need for a next action.

### Answers and rationale

1. **C.** A transcript records what happened in order, not what currently binds, and distant text has less practical influence. **A** is false; transcripts are often very long. **B** is false; transcripts are exactly what the model reads. **D** is false; transcripts can be stored like any other text.

2. **B.** A successor needs the current state, decisions, artifacts, gaps, and a starting point. **A** is clutter rather than continuity. **C** omits almost everything necessary. **D** captures tone rather than substance.

3. **C.** Identity-scoped state and retrieval form an actual boundary. **A** and **B** are hints that a model may or may not honor. **D** increases the opportunity for contamination.

4. **B.** Summarizing preserves continuity while relieving context pressure, provided the summary is checked. **A** loses unrecorded detail unnecessarily. **C** destroys evidence. **D** ignores the problem.

5. **A.** A clean start is valuable when old material is actively misleading. **B** calls for external persistence. **C** calls for summarization. **D** calls for an explicitly shared common source.

6. **C.** The label prevents a conclusion from being promoted to evidence. **A** is not a goal. **B** states the opposite of the intended safeguard. **D** is unrelated; the next action remains essential.

---

*End of chapter 11.*
