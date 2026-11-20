# Chapter 22 — Context Budgeting, Trimming, and Compression

Context is the working memory of an assistant call. It holds everything the model can consider while producing the next answer, and it is finite. When a session grows long, that space fills with instructions, conversation history, retrieved documents, tool results, drafts, and corrections. What gets crowded out is as important as what stays in: a forgotten constraint can derail an otherwise correct piece of work.

This chapter treats context as an engineering resource with a hard budget. You will learn what consumes it, how to recognise pressure before it causes failures, and how to compress or restructure a session without losing what matters. The exam rewards candidates who think in terms of allocation and retention rather than simply adding more material.

## Learning objectives

- Explain why the context window is a hard budget shared by every part of a call.
- Identify the main consumers of context and the lifetime of each kind of content.
- Recognise the practical signs that a session is approaching its context limit.
- Compare trimming, summarisation, and compaction as ways to reclaim space.
- Apply a middle-saver strategy that protects early and late material while compressing the middle.
- Choose between restarting, summarising, and persisting facts externally.

## Key concepts

### Context as a hard budget

Every call to a model has a finite amount of space in which the model can work. That space must hold the system instructions, the user messages, the accumulated history, any documents supplied, the results of tool calls, intermediate reasoning, and room for the answer itself. There is no invisible overflow area. If the content does not fit, something must be removed, truncated, or split across calls.

It helps to think of context as a cache with a strict capacity rather than as a file the model can revisit at will. Items compete for space. A large tool result can crowd out an instruction that was given early. A long history can push a recently retrieved fact into a region the model uses less reliably. Because the budget is shared, adding more retrieved material is never free: it always displaces something else.

The budget also has an output reserve. A call that consumes nearly all available space for input leaves little room for the answer, which can be cut off mid-sentence. Good budgeting allocates space for the expected response before filling the input. This is easy to forget when designing retrieval steps that happily return as much text as they can find.

> **Exam note:** When a scenario describes a model forgetting an earlier instruction after a long session, the root cause is usually context pressure, not disobedience. The fix is to manage the budget, not to repeat the instruction more emphatically.

### What consumes the budget

Several distinct categories compete for space, and they behave differently. Instructions are usually present on every call: role definitions, layered project guidance, and packaged capabilities. They are compact but persistent, so they form a fixed cost. Conversation history grows with every exchange and is often the largest long-term consumer. Retrieved documents arrive in bursts and can be enormous relative to the question. Tool output is the classic surprise: a search or listing that returns thousands of lines can consume more space than the entire rest of the session.

Drafts and intermediate work also matter. A model that writes a long analysis and then revises it several times keeps each version in context unless something removes it. Structured metadata, such as schema definitions and status records, adds a smaller but steady load. Even the reserve for the answer counts against the total.

The useful question for each category is its lifetime. Some content must be present for every remaining call, such as the goal and the hard constraints. Some is needed once and can be discarded after it has been used, such as the raw output of a tool after it has been distilled. Some is valuable but only occasionally, such as a reference document that may be needed again later; that content belongs outside the active context, retrievable on demand. Classifying content by lifetime is the first step to controlling the budget.

| Consumer | Typical behaviour | Lifetime | Default action |
| --- | --- | --- | --- |
| System and project instructions | Fixed, present every call | Persistent | Keep compact and testable |
| Conversation history | Grows with every turn | Long | Compress older turns |
| Retrieved documents | Arrive in large bursts | Task-specific | Retrieve narrowly, keep excerpts |
| Tool output | Highly variable, often bulky | Usually short | Distill immediately after use |
| Drafts and revisions | Multiply during refinement | Short | Retain only the current version |
| Output reserve | Must be left free | Every call | Allocate before filling input |

### Signs of approaching the limit

Context pressure rarely announces itself with an error at first. It shows up as subtle changes in behaviour. The model begins to ignore an instruction given near the start of the session. It answers a question inconsistently because it is relying on a recent restatement rather than the original. It produces vaguer conclusions, drops caveats, or contradicts a decision made earlier. These symptoms are easy to misread as carelessness.

A well-known pattern is the weakness for material in the middle of a long context. Information at the beginning and end tends to be used more reliably than information buried centrally. As the session grows, a crucial fact can sit in that middle region and effectively disappear from practical consideration. The fact is technically present but functionally lost.

Other signals are mechanical. Tool calls may be truncated, output may stop abruptly, and latency or cost may climb as each call resends a larger payload. If the same instruction has to be repeated several times to get consistent behaviour, that repetition is itself a sign that the budget needs attention. The right response is structural: reduce, reorganise, or split the context rather than adding more text.

### Trimming, summarisation, and compaction

There are three related ways to reclaim space, and they differ in how much information they preserve. *Trimming* removes content that is redundant or no longer needed: duplicate tool results, superseded drafts, and conversational filler. It is essentially lossless with respect to the facts that matter. *Summarisation* replaces a body of text with a shorter narrative version. It is lossy by nature, because a summary must choose what to omit. *Compaction* is a broader term for rewriting the context into a denser representation that retains the information needed to continue, often combining trimming and summarisation with structured notes.

The design decision is what must survive verbatim. Constraints, identifiers, decisions, commitments, and exact quotations usually should not be paraphrased. A summary that turns "never include client identifiers" into "handle client data carefully" has destroyed a hard rule. Background discussion, repeated explanations, and raw tool dumps are usually safe to compress. A good compaction step produces a structured record rather than a free-flowing paragraph, because structured notes make it easier to check what survived.

Compaction should be triggered deliberately, not left to chance. Common triggers include a threshold on how much of the budget is occupied, the completion of a major subtask, or the start of a new phase of work. Compacting at a phase boundary is especially effective because the summary can be organised around what the next phase needs. Compacting in the middle of an active reasoning chain risks losing the thread.

> **Common mistake:** Summarising the whole session into one paragraph and continuing as if nothing changed. This tends to erase exact constraints and decisions, which are precisely the items that must be preserved.

### The middle-saver strategy

Because early and late positions in a context are used more reliably than the middle, a useful strategy is to protect the two ends and compress the centre. Think of the context as three regions. The *pinned head* holds the original task, the role, and the non-negotiable constraints. It is never compressed, because losing it changes the nature of the work. The *pinned tail* holds the most recent state: the latest user request, the current best answer, and the next intended action. It is also kept verbatim because it defines continuity.

The *rolling middle* contains everything between them: completed exchanges, retrieved material, and tool results. As the budget tightens, this region is repeatedly rewritten into a compact set of notes. Decisions made, facts verified, open questions, and distilled tool findings are retained; conversational padding and superseded drafts are discarded. The middle summary is itself rolled forward, so each compaction consumes the previous summary plus new material.

This arrangement has several advantages. The model keeps the goal in view at the front and the current state in view at the back, which is where attention is strongest. The middle holds a dense map of what has happened rather than the raw journey. When the map grows too large, it is compressed again without touching the protected ends. The strategy also makes it clear when compaction is no longer enough: if the pinned head and tail together consume too much space, the task itself needs to be split or restarted.

### Restart, summarise, or persist

When pressure builds, there are three primary responses, and they are not interchangeable. *Restarting* means beginning a fresh session with a distilled brief that contains the goal, constraints, decisions, and current state. It is the cleanest option when the old session has accumulated noise or when the work has shifted phase. Its cost is the loss of nuance that was never written into the brief.

*Summarising* means continuing in the same session with a compacted history. It preserves continuity and is appropriate when the thread of reasoning still matters. Its risk is drift: each summary is an interpretation, and repeated summarisation can gradually change the meaning of earlier decisions. Keeping critical phrases verbatim reduces this risk.

*Persisting externally* means storing facts outside the active context, in a file, record, or memory store, and retrieving them selectively when needed. This is the right choice for information that must survive beyond one session or be shared across tasks. It requires retrieval discipline: a store that is never consulted is wasted, and a store that is dumped wholesale recreates the problem it was meant to solve.

| Situation | Preferred response | Reason |
| --- | --- | --- |
| Session is noisy but task is unchanged | Summarise and continue | Preserves continuity while reclaiming space |
| Work has shifted to a new phase | Restart with a distilled brief | Removes material irrelevant to the new phase |
| Facts must survive across sessions | Persist externally and retrieve selectively | Avoids carrying everything in every call |
| Pinned material alone exceeds the budget | Split the task into smaller calls | No compaction can recover enough space |
| A tool dump dominates the context | Distill and discard the raw result | The raw text has served its purpose |

### Building a budget: an exercise

A practical way to manage context is to construct a budget before a long session, then check against it as work proceeds. Start by listing what must be present on every call and estimating its relative size. Next, estimate what each phase will add: documents, tool results, and drafts. Reserve a portion for the output. Finally, decide in advance which thresholds trigger compaction, external persistence, or a restart. This converts context management from a reaction into a plan.

The following compaction plan illustrates the structure. It uses relative shares rather than fixed capacities so the pattern can be applied to any environment.

```text
PINNED HEAD (never compress)
- original task statement and success criteria
- role definition and non-negotiable constraints
- output contract and required field names

ROLLING MIDDLE (compress at threshold)
- decisions made, with the reasoning that cannot be reconstructed
- facts verified, with their source labels
- open questions and unresolved conflicts
- tool results distilled to short findings

PINNED TAIL (keep verbatim)
- latest instruction from the user
- current best answer or working state
- the single next action

TRIGGERS
- compact the middle when it exceeds the planned share
- persist facts externally when they are needed in later phases
- restart when pinned head plus tail leave no working room
```

The value of writing this down is that it forces explicit choices. If the pinned head is larger than expected, you can shorten the instructions before the session begins. If tool output is likely to dominate, you can design the tool calls to return summaries rather than raw data. A budget-builder exercise is really a design review in disguise.

> **Try it:** For an upcoming task, list the five largest expected context consumers and assign each a share of the budget. Identify which share you would compress first if the total ran over. That item is your compaction candidate.

## Worked scenario

A team is preparing a due-diligence memo from a large set of internal documents. The assistant reads each document, extracts relevant passages, and drafts sections of the memo. Early in the session the team states a hard constraint: client identifiers must never appear in the memo. The work proceeds well at first, but after many document reads and tool calls the draft begins to include identifiers that were present in the source passages. When questioned, the assistant produces a vague explanation about handling data carefully. The constraint was present in the original instruction but had been pushed out of practical reach.

An architect reviews the session and finds the expected pattern. The pinned instruction at the start was still technically in the context, but it sat behind a long mass of retrieved text and intermediate drafts. The most recent messages concerned formatting, which dominated attention. Several tool calls had returned full documents when only short excerpts were needed. No compaction had occurred because nobody had defined a trigger.

The remediation has four parts. First, the hard constraint and the memo outline are moved into a pinned head that is reasserted at every phase boundary. Second, tool calls are changed to return short excerpts with source labels instead of entire documents; the raw text, when occasionally needed, is retrieved separately. Third, a rolling middle summary is maintained with three sections: verified facts, open questions, and decisions, each written as compact notes with exact phrases preserved for rules. Fourth, the latest instruction and current draft are kept verbatim as the pinned tail.

When the extracted material from the first phase is complete, the team persists verified facts to an external record, then restarts a fresh session for drafting with a distilled brief containing the outline, the constraints, and pointers to the record. The drafting session stays short, and the final memo contains no client identifiers. The team also adds a simple check that scans the output for identifier patterns before it leaves the workflow.

Notice that the solution is not a stronger reminder. It is a structure that keeps the reminder where it will be used, reduces the volume of material competing with it, and splits the work so no single session has to hold everything.

## Common mistakes

- Assuming that a larger context window removes the need for budgeting, when added material still competes for attention.
- Repeating an early instruction many times instead of changing the structure that pushed it out of effective use.
- Returning full documents from tools when a short excerpt would serve the current question.
- Summarising constraints and identifiers into vague general phrases, destroying the precision that made them useful.
- Compacting in the middle of an active reasoning chain rather than at a clean phase boundary.
- Keeping multiple superseded drafts in the context when only the current version matters.
- Treating external persistence as a cure-all without a plan for retrieving the stored facts selectively.
- Failing to reserve output space, so a long input causes the answer to be cut short.

## Chapter summary

- Context is a hard, shared budget covering instructions, history, documents, tool output, drafts, and the answer reserve.
- Content should be classified by lifetime: persistent, single-use, or occasionally needed and better stored outside the session.
- Pressure shows up as forgotten instructions, inconsistent answers, vagueness, truncation, and rising cost.
- Trimming removes redundancy, summarisation compresses narrative, and compaction produces a dense structured record that retains what matters.
- The middle-saver strategy pins the head and tail verbatim while repeatedly compressing the centre.
- Restart when a phase changes, summarise when continuity matters, and persist externally when facts must outlive a session.
- A written budget with explicit triggers turns context management into a plan rather than a reaction.

## Checkpoint questions

1. A long session begins to ignore a constraint given at the start. What is the most likely cause?

A. The model has decided the constraint is no longer relevant.
B. The constraint has been displaced from effective use by accumulated context, so the budget needs managing.
C. The constraint was written in prose rather than as a question.
D. The session needs a longer output reserve.

2. Which category of content is usually the best candidate for immediate distillation after use?

A. The original task statement.
B. Non-negotiable safety constraints.
C. A large tool result whose useful content is a few findings.
D. The latest user instruction.

3. Which statement about summarisation is most accurate?

A. It preserves every detail if written carefully.
B. It is lossy, so exact constraints and identifiers should be kept verbatim elsewhere.
C. It removes the need for any other context strategy.
D. It only applies to tool output.

4. In the middle-saver strategy, what belongs in the pinned tail?

A. The oldest instructions and the original goal.
B. A compressed history of all completed work.
C. The latest instruction, the current state, and the next action.
D. Every document retrieved so far.

5. Facts must survive across several separate sessions and be shared with other tasks. What is the best response?

A. Repeat them in every prompt from memory.
B. Persist them externally and retrieve them selectively when needed.
C. Keep them in the middle summary of one long session forever.
D. Remove them from all sessions to save space.

6. A compaction plan shows that the pinned head and tail together leave almost no working room. What should happen?

A. Compact the middle again more aggressively.
B. Add more documents to give the model more to work with.
C. Split the task into smaller calls or restart with a narrower brief.
D. Repeat the original instruction until it fits.

### Answers and rationale

1. **B** is correct because context pressure pushes early material out of effective attention. **A** is wrong because the model is not making a deliberate decision to disregard a rule. **C** is wrong because prose is not the issue; position and competition for space are. **D** is wrong because a larger output reserve would make the input problem worse.

2. **C** is correct because a bulky tool result has usually served its purpose once its findings are extracted. **A** and **B** are wrong because the task and constraints are pinned content that must remain verbatim. **D** is wrong because the latest instruction defines continuity and belongs in the tail.

3. **B** is correct because summarisation necessarily omits detail, so critical exact phrases need separate protection. **A** is wrong because no summary preserves everything. **C** is wrong because summarisation is one tool among several. **D** is wrong because summarisation applies to many kinds of content.

4. **C** is correct because the tail protects current state and the immediate next step. **A** describes the pinned head, not the tail. **B** describes the rolling middle. **D** is wrong because retaining every document defeats the purpose of the strategy.

5. **B** is correct because external persistence with selective retrieval supports reuse without bloating every session. **A** is unreliable and wasteful. **C** is wrong because one session cannot serve unrelated tasks. **D** is wrong because discarding needed facts loses information.

6. **C** is correct because when protected regions consume the budget, no amount of middle compression helps and the work must be split. **A** is wrong because the middle is no longer the binding constraint. **B** is wrong because adding documents increases pressure. **D** is wrong because repetition adds more content rather than freeing space.

---

*End of chapter 22.*
