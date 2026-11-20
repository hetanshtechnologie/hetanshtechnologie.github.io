# Chapter 7 — The Orchestration Loop and Session Model

## Learning objectives

- Describe the perceive, reason, act, observe, repeat cycle and the role of each stage.
- Explain why control belongs in orchestration code rather than in the model's instructions.
- Distinguish step budgets from stop conditions and explain how they work together.
- Trace how a tool result becomes the observation that drives the next decision.
- Tell the difference between a loop that is waiting and one that is stuck.
- Read a loop trace and identify the point where a safeguard should be added.

## Key concepts

### The loop as the heart of an agent

A single prompt produces a single response. An agent does something more: it keeps working across a series of decisions, using the results of its own actions to choose what to do next. The mechanism that makes this possible is an orchestration loop. It repeatedly gives the model a view of the current situation, asks for a next move, carries out that move through a tool or a state change, and then feeds the result back as new evidence.

The cycle has five stages: perceive, reason, act, observe, and repeat. Perceive means assembling what the model can currently see: the goal, the rules, the history so far, and the most recent results. Reason means deciding what to do next, either by choosing a tool call or by concluding that the task is finished. Act means executing the chosen move under the constraints set by the system. Observe means interpreting the outcome and adding it to the session record. Repeat means starting over with an updated view, unless a stop condition has been met.

The word "loop" is important. The model is not given a long script to follow from memory. It is consulted again and again, each time with a slightly different working set. That is why small changes in tool results can produce large changes in behaviour: the result is not merely logged, it becomes the model's next perception. A design that ignores this feedback path will keep making the same mistake, because the same mistaken view is reconstructed on every turn.

### The stages in detail

| Stage | What happens | Main input | Main output | Failure signal |
| --- | --- | --- | --- | --- |
| Perceive | Assemble the current working view | Goal, rules, history, last result | A bounded prompt context | Missing or stale facts in the view |
| Reason | Choose a next move or declare completion | Working view and available actions | A proposed action with arguments | A proposal outside granted authority |
| Act | Execute the proposal under constraints | Proposed action | Tool result or state change | Rejected call, timeout, partial effect |
| Observe | Interpret and record the outcome | Raw result | A concise, provenance-bearing observation | Ambiguous or bloated result |
| Repeat | Decide whether another cycle is allowed | Observation plus budgets | Next cycle or a clean stop | Repetition without progress |

Perceive is a design responsibility, not a passive read. Deciding which facts enter the working view determines what the model can reason about. If the most recent tool result is buried under an old transcript, the model may act on outdated information. If the goal statement has drifted out of view, it may pursue a sub-goal that no longer matters. A well-built loop treats perception as a curated step.

Reason is where the model contributes most, but its contribution is a proposal. It may suggest calling a tool with certain arguments, or it may signal that the goal is met. The orchestration code decides whether that proposal is acceptable. That separation is what makes the loop safe to operate: the model can be creative within a corridor, while the corridor itself is fixed.

Act is where reasoning becomes effect. The tool may read something, compute something, or change something. Effects carry risk, so this stage is where permissions, approval gates, and idempotency matter. A read operation that fails can simply be retried; a write operation that half-succeeds needs careful reporting.

Observe converts a raw tool result into a usable observation. A search that returns hundreds of matches is not yet an observation the model can reason about well; it is a pile of data. The loop should reduce it to the few facts that matter, preserve source identifiers, and state clearly whether anything new was found. This stage is the bridge to the next perception.

Repeat is governed by budgets and stop conditions. It is tempting to think of the loop as running until the model says it is finished, but that handing over too much control. The system needs its own criteria for stopping, including criteria that override an optimistic model.

> **Exam note:** When a loop problem is described as "the model keeps trying," look for the mechanism that should have intervened. In a well-designed system the stop decision belongs to orchestration code, not to a stronger instruction inside the prompt.

### Treating the loop like a request handler

A useful engineering analogy is a service that handles requests. A session arrives with a goal and a set of permissions, much like a request arrives with parameters and an identity. The loop acts as the handler: it manages state for the duration of the session, calls downstream capabilities, applies timeouts and budgets, and returns a final result. When the session ends, the handler's working state is discarded or handed off, just as a request-scoped store is cleared.

This analogy clarifies several design questions. The first is isolation. Two sessions must not share working memory unless sharing is explicitly intended; otherwise one task's facts can leak into another. The second is scope. Permissions should be attached to the request, so a tool that is available in one session is not automatically available in another. The third is observability. A handler should emit a trace of each stage so that a reviewer can reconstruct what happened without guessing.

The analogy also has limits. A conventional service usually follows a fixed control flow, while an agent's loop chooses its next call based on results. That difference means the handler must be defensive about anything the model proposes. Validation at the act stage plays the role that input validation plays at a public interface: it keeps a surprising decision from becoming an unsafe effect.

### Where control lives

Control lives in the orchestration code. The model supplies judgements: which tool seems useful, what arguments seem appropriate, whether the goal appears satisfied. The surrounding code supplies enforcement: which tools are registered, which calls are permitted, how many cycles may run, and when the session must end. Confusing these two roles is one of the most common design errors in agentic systems.

A prompt can say "stop after a few attempts," but a prompt is advice. The model might ignore it, reinterpret it, or lose it when context is trimmed. A step counter in code is a fact. It cannot be argued with, and it does not depend on attention. Similarly, a prompt can say "do not send messages," but only the tool registry determines whether a messaging capability exists to be called. Governance expressed as policy in code is durable; governance expressed only as instruction is fragile.

This does not make prompts unimportant. Instructions shape the quality of each proposal, reduce the chance of invalid calls, and help the model produce legible observations. The point is that safeguards should not rely on the model's compliance when code can enforce them. Exam questions often test this distinction by offering an option that strengthens wording and another that changes the loop's enforcement. The enforcement option usually wins for safety questions.

> **Common mistake:** Treating a stronger instruction as equivalent to a technical control. If the system must guarantee a limit, the limit belongs in the loop's implementation.

### Step budgets and stop conditions

A budget is a limit on resources consumed. A stop condition is a rule about when to end. Both are needed, and they are not interchangeable. A budget might allow a certain number of cycles, a certain amount of generated text, a certain spend, or a certain elapsed time. A stop condition might be that the goal is achieved, that approval is required, that a terminal error occurred, that no new information appeared, or that the user cancelled.

Budgets answer "how much is allowed?" Stop conditions answer "when is it right to finish?" A loop can stop well before its budget is exhausted when a stop condition is met. Conversely, a budget can force a stop even when the model believes more work would help. Forcing a clean stop is better than letting a session run without bound: the loop should return its best current result, state what remains unfinished, and hand off clearly.

Good stop conditions are observable. "No new information in the last observation" can be checked; "the model seems confused" cannot. Designers often add a progress fingerprint: a compact summary of what changed in the last cycle. If the fingerprint is unchanged across cycles, the loop concludes that it is repeating itself. This is more reliable than asking the model whether it is making progress, because a model asked to assess its own progress may answer optimistically.

Budgets should be visible to the model as well as enforced in code. If the loop knows it has limited cycles remaining, it can prioritize the most valuable next action instead of exploring. That visibility must be honest: telling the model it has ample room when the code is about to stop creates inconsistency between perception and enforcement.

### Tool results as the next decision's input

Every tool result re-enters the loop as new perception. Its shape therefore influences the next decision as much as the original instruction does. A result that says only "failure" gives the model nothing to work with; it may retry the same call indefinitely. A result that says "not found, the record may be archived, try the archive index" supplies a next action. Designing results for the loop means designing them for decision-making, not merely for correctness.

Useful results carry at least three things: a status that distinguishes success from retryable failure from terminal failure, the substantive payload, and provenance that says where the information came from. They should also say whether anything changed relative to the previous cycle. That last field is what allows the loop to detect empty progress. When results are large, the observe stage should distill them before they re-enter the working view, preserving enough detail for verification without crowding out the goal.

### Waiting versus stuck

A loop that is waiting is blocked by something legitimate: an approval, a scheduled job, an external system that is slow, or a human review. It has a handle for resuming, an expected condition that will release it, and a timeout that converts indefinite waiting into a reportable event. Waiting is a state the session model can represent and recover from.

A loop that is stuck is consuming cycles without changing anything. It issues the same call with the same arguments, receives the same result, and draws the same conclusion. The difference is not the passage of time but the absence of state change. A stuck loop can look busy in logs, which is why activity metrics alone are misleading. Detection relies on comparing fingerprints, counting repeated calls, and requiring each cycle to either add information or move toward a stop condition.

The remedy differs too. A waiting loop needs a resume mechanism and clear ownership of the pending item. A stuck loop needs a guard: a repeated-call limit, a requirement that each call include a new parameter, or a rule that identical results are reported as terminal for this session. In exam scenarios, the word "repeatedly" is a strong hint that the design lacks progress detection.

### A loop skeleton

The `text` block below sketches the control structure in pseudocode. It shows that the model is consulted inside a loop whose boundaries are set by code.

```text
session_loop(goal, permissions, budgets):
    history = initial_record(goal, permissions)
    fingerprint = empty

    while budgets_remain():
        view = perceive(goal, rules, bounded(history))
        proposal = ask_model(view, allowed_tools(permissions))

        if proposal.says_done:
            return summarize(history)

        if not authorized(proposal, permissions):
            record("rejected: outside authority")
            continue

        result = execute(proposal, budgets)
        observation = distill(result, previous=fingerprint)
        record(observation)

        if terminal(result) or approval_required(result):
            return handoff(history, reason)

        if observation.fingerprint == fingerprint:
            record("no progress")
            return handoff(history, reason="stuck")

        fingerprint = observation.fingerprint

    return handoff(history, reason="budget exhausted")
```

Notice that every exit closes the session with a reason. There is no path that simply ends with an unexplained silence. That habit matters for session continuity: the next handler, or the human reviewer, needs to know why the loop stopped and what remains open.

> **Exam note:** A loop that returns a partial result with an explicit reason is usually a better answer than one that keeps trying. Partial progress with honest handoff is a feature of a bounded design.

## Worked scenario

A travel-assistance service helps reviewers prepare refund decisions for cancelled bookings. The assistant may read a booking, look up the refund policy, and draft a decision note. It may not issue a refund; that action belongs to a human with ledger access. The session model treats each case as a separate request with its own permissions and budgets.

A case arrives for a customer whose flight was cancelled. The loop begins by perceiving the goal, the permission set, and the case identifier. It reasons that the booking details are needed first, calls the read tool, and observes a record showing a cancelled flight and a ticket that was partly used. It then looks up the policy and receives a clause stating that partly used tickets may qualify for a partial refund pending documentation.

The trace then goes wrong. The loop calls the policy lookup again with the same query, receives the same clause, and concludes that documentation is still needed. It calls the lookup again. The observation is identical each time, and the fingerprint does not change. From outside, the session appears active: calls are being made and text is being generated. In reality it is stuck, because no new information is entering the working view and no decision is being advanced.

| Cycle | Perceive | Reason | Act | Observe | Loop decision |
| --- | --- | --- | --- | --- | --- |
| One | Case goal and identifier | Need booking facts | Read booking | Cancelled flight, partly used | Continue |
| Two | Booking facts added | Need policy rule | Look up policy | Partial refund clause, documentation needed | Continue |
| Three | Same policy clause | Recheck rule | Look up policy again | Identical clause | Continue, unsafe |
| Four | Identical clause again | Recheck rule | Look up policy again | Identical fingerprint | Stop as stuck |

The fix is not a stronger instruction telling the model to avoid repetition. The fix is a progress rule in the observe stage: if a result's fingerprint matches the previous one, record that no new information was obtained and stop with a handoff. The handoff should include the draft decision note, the policy clause with its source, and a statement that documentation is outstanding. A reviewer can then complete the case without reconstructing the loop's history.

Two additional safeguards fit the same design. Because the session is request-scoped, the case's facts cannot leak into another case. Because the permission set excludes refund issuance, even a strong suggestion from the model cannot produce a ledger change. The loop's intelligence is useful precisely because it is bounded by these structural facts.

## Common mistakes

- Assuming the model controls how long the loop runs.
- Treating a budget and a stop condition as the same mechanism.
- Letting raw tool results re-enter the working view without distillation.
- Measuring activity instead of progress when diagnosing a stuck session.
- Allowing a loop to end silently instead of returning a reason and a handoff.
- Sharing working state across sessions in the name of efficiency.
- Trying to fix repetition by rewriting the prompt when the loop lacks a progress rule.

## Chapter summary

- The orchestration loop cycles through perceive, reason, act, observe, and repeat.
- The model proposes next moves; orchestration code owns authority, budgets, and stopping.
- Budgets limit resources while stop conditions define when finishing is correct.
- Tool results become the next perception, so their shape steers subsequent decisions.
- Waiting has a resumable handle; stuck means repeated cycles without state change.
- Every loop exit should return a reason and a usable handoff.

## Checkpoint questions

1. Which component should enforce a limit on the number of loop cycles?

- A. The model's system instruction
- B. The orchestration code
- C. The wording of the user's goal
- D. The tool description text

2. In the five-stage cycle, which stage converts a raw tool result into something the next decision can use?

- A. Perceive
- B. Reason
- C. Observe
- D. Repeat

3. What is the main difference between a budget and a stop condition?

- A. A budget limits resources; a stop condition says when ending is correct.
- B. A stop condition limits resources; a budget says when ending is correct.
- C. Both are instructions written into the prompt.
- D. Both apply only to external tools.

4. A loop issues the same call repeatedly with identical results. What is the best diagnosis?

- A. The loop is waiting for approval.
- B. The loop is stuck because no state is changing.
- C. The loop has met its goal and should exit.
- D. The loop needs a larger step budget.

5. Which field in a tool result best supports detection of empty progress?

- A. A decorative title
- B. A change indicator relative to the previous result
- C. A long narrative description
- D. A list of all possible queries

6. Why is request-scoped state important in a session model?

- A. It prevents facts from one case leaking into another.
- B. It makes the model's instructions longer.
- C. It removes the need for tool permissions.
- D. It guarantees that every loop finishes successfully.

7. A loop stops after exhausting its budget while the goal is unfinished. What should it return?

- A. Silence, because the budget ended the session
- B. A partial result with the reason and outstanding work
- C. A request for a larger budget issued to the model
- D. The full tool log without interpretation

### Answers and rationale

1. Correct: B. Cycle limits are enforced by the code surrounding the model. A is incorrect because instructions can be ignored or trimmed. C is incorrect because a user's goal is not a control mechanism. D is incorrect because a description guides tool selection, not loop length.

2. Correct: C. Observation interprets and records the outcome for reuse. A is incorrect because perception assembles the view before a decision. B is incorrect because reasoning chooses the next move. D is incorrect because repetition refers to starting another cycle.

3. Correct: A. Budgets constrain consumption; stop conditions define legitimate completion. B reverses the two ideas. C is incorrect because both should be implemented in the system, not left as prose. D is incorrect because they govern the whole loop.

4. Correct: B. Identical calls with identical results indicate no progress, which is the signature of a stuck loop. A is incorrect because waiting involves a legitimate pending condition and a resume handle. C is incorrect because the goal is not met. D is incorrect because more cycles would repeat the same result.

5. Correct: B. A change indicator lets the loop compare cycles and detect repetition. A is incorrect because decoration carries no state information. C is incorrect because length does not establish novelty. D is incorrect because listing options does not describe what happened.

6. Correct: A. Scoping state to the request keeps unrelated cases isolated. B is incorrect because state scope does not affect instruction length. C is incorrect because permissions remain necessary. D is incorrect because scoping cannot guarantee success.

7. Correct: B. An honest partial result with a reason and open items allows a clean handoff. A is incorrect because silence hides the state of the work. C is incorrect because the model does not control its own budget. D is incorrect because an uninterpreted log is not a usable result.

---

*End of chapter 7.*
