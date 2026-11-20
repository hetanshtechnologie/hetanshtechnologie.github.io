# Chapter 13 — Error Responses, Recovery, and Reliability

## Learning objectives

- Treat error results as a designed part of the tool interface rather than an afterthought.
- Classify failures as retryable, terminal, or conditional, and encode that classification in the result.
- Write error payloads that give the model a specific, safe next action.
- Report partial success honestly and preserve the work that already completed.
- Explain why idempotency matters when a model may repeat a call.
- Apply retry budgets and backoff at a principle level, and know when to stop retrying.
- Use structured failure logs to diagnose and improve a system without exposing sensitive data.

## Key concepts

### Errors as part of the tool contract

A tool call has two possible kinds of outcome: it succeeds, or it does not. Many designs treat the second case as an exception that escapes the tool and is handled somewhere outside the agent loop. That is a mistake for an agentic system. If an exception escapes, the model receives no structured information about what happened and cannot reason about a next step. It may retry blindly, abandon a task that could have been completed, or invent a result that was never produced.

A better design treats a failed call as a normal result with a distinct shape. The tool returns a value that says, in machine-readable form, that the operation did not complete and why. This keeps the failure inside the observe phase of the loop, where the model can read it alongside the rest of the context. The model then decides whether to retry, change its approach, ask for clarification, or report the problem. Failure becomes a branch in the workflow rather than a crash.

This shift has a practical consequence for tool authors: the error result deserves as much design attention as the success result. It needs stable field names, a controlled vocabulary of codes, and text written for a reader who must act quickly. A vague error such as "something went wrong" is almost useless to a model. A precise error that names the failing parameter and suggests a corrective call is enormously valuable, because it converts a dead end into a small detour.

> **Exam note:** When a scenario describes an agent that gets stuck after a tool failure, look at whether the failure re-enters the loop as structured data. Silent exceptions and unstructured messages are common root causes.

### Classifying failures: retryable, terminal, and conditional

Not all failures deserve the same response. The first distinction is between failures that may succeed if repeated and failures that cannot succeed without a change. A transient network interruption, a temporary resource shortage, or a rate limit are retryable: the same call might work later. A malformed argument, a missing permission, a reference to a nonexistent record, or a business rule that forbids the action are terminal with respect to the current attempt: repeating the identical call will fail in the same way.

A third category is conditional. The operation might succeed, but only after something changes outside the tool: a user provides missing information, an approval is granted, or a conflicting state is resolved. These failures are not retries in the narrow sense, but they are not dead ends either. The correct response is to surface the condition to the model and let it decide whether to ask, to wait, or to switch approach. Treating a conditional failure as terminal loses a recoverable path; treating it as retryable wastes steps on a call that cannot yet work.

The classification should travel with the error result. A code that tells the model "retryable with backoff" or "terminal, do not repeat" removes the need for the model to infer behavior from prose. Inference is fragile because the same underlying condition can be described in many ways. A stable category field makes the decision consistent across different tools and different parts of a workflow.

| Failure class | Typical causes | Correct response | Model guidance |
| --- | --- | --- | --- |
| Retryable | Temporary outage, rate limit, resource contention | Retry with limits and backoff | "retry after a short wait" |
| Terminal | Invalid argument, missing permission, forbidden action | Do not repeat the identical call | "change the request or stop" |
| Conditional | Missing input, required approval, conflicting state | Resolve the condition first | "ask or switch approach" |
| Partial | Some items succeeded, others failed | Preserve successes, retry remainder | "report counts and continue" |

### Anatomy of an actionable error result

An error result should be compact but complete. At minimum it should carry a stable code, a human-readable message, a category, and a suggested action. A request identifier lets an operator correlate the failure with logs, and a field that names the offending parameter helps the model repair its call. Where a retry is appropriate, the result can include a hint about whether waiting is required, without prescribing a precise delay that the model must interpret.

The suggested action is the field that most distinguishes a good error contract from a poor one. It should be phrased as an instruction the model can follow: supply a valid value for a named parameter, request approval, or ask the user for a missing detail. Avoid suggestions that are really just restatements of the problem. "Check the input" is not actionable; "replace the channel value with one from the supported list" is.

It is also useful to separate the diagnostic message from the user-facing message. The diagnostic text can be technical and precise because it is read by the model and by logs. The user-facing text can be shorter and safer, avoiding internal identifiers or details that should not leave the system. Returning both in separate fields prevents the common mistake of either overwhelming the user with internals or starving the model of the detail it needs to recover.

```text
{
  "ok": false,
  "code": "INVALID_CHANNEL",
  "category": "terminal",
  "message": "The channel value is not one of the supported channels.",
  "offending_field": "channel",
  "suggested_action": "Choose a channel from the supported list and retry.",
  "request_id": "req-8842",
  "user_message": "That destination is not available. Please choose another."
}
```

> **Try it:** Read each field of the payload above from the point of view of a model that has never seen the tool before. If any field is ambiguous, rewrite it until a single clear next step emerges.

### The next action: guiding recovery in the loop

A failure result is only useful if the loop does something with it. The model reads the result and chooses a next move, but it needs guardrails that keep that choice bounded. Without them, a model may retry a terminal failure repeatedly, cycling through variations until it exhausts the context window or the step budget. This is one of the most common ways an agent becomes stuck rather than waiting.

The first guardrail is the category field discussed earlier. The orchestration layer can reject a retry of a terminal result before the model even considers it, turning a suggestion into a rule. The second is a per-tool retry count maintained outside the model, so that repeated attempts are tracked by code rather than remembered by the model. A model operating in a long session may forget how many times it has tried; a counter in the orchestration layer does not.

The third guardrail is a clear escalation path. Some failures should end the current branch and hand control back to a person or a higher-level planner. The error result can signal this by setting a field that requests escalation, and the workflow can treat that signal as a stop condition.

### Partial success and honest reporting

Many operations touch multiple items. A batch write may update several records and fail on the rest. A search across several sources may return results from some and time out on others. Reporting such an outcome as a simple success or a simple failure is misleading. A simple success hides the gap; a simple failure invites the model to repeat the whole operation, duplicating the work that already succeeded.

Partial success should be represented explicitly. The result should state that the operation completed for a subset, give counts or identifiers for what succeeded, and describe what did not. The suggested action should focus on the remainder: retry only the failed items, continue with the available results, or stop and report the gap. This lets the model preserve completed work and avoid repeating it.

Honesty matters because the model will build its next decision on the reported state. If a result claims full success when only part of it completed, downstream steps may assume records exist that do not, and errors propagate quietly. If it claims total failure, the model may reissue writes that were already applied. A precise partial result is the difference between a contained incident and a cascade.

In workflows that mix independent items, one useful pattern is to make each item its own operation so that isolation is natural. Where batching is necessary for efficiency, the result structure should still itemize outcomes. The extra structure costs little and pays for itself the first time a retry would otherwise duplicate a write.

### Idempotency and duplicate calls

A model may call a tool more than once for reasons that are entirely reasonable: a retry after a timeout, a recovery step after a partial failure, or a repeated plan branch in a long loop. If the tool has side effects, a duplicate call can produce duplicate effects. Two charges, two messages, or two created records are the classic examples, and each is worse than the original failure that triggered the retry.

Idempotency is the property that repeating the same operation yields the same final state as performing it once. Read-only operations are naturally idempotent. Side-effecting operations must be designed for it. The usual mechanism is an idempotency key: a stable identifier attached to the request that the tool records, so that a repeated request with the same key returns the original result instead of applying the effect again. The key should be created by the caller and kept stable across retries, not regenerated on each attempt.

| Situation | Risk without idempotency | Safer design |
| --- | --- | --- |
| Retry after timeout | Effect applied twice | Stable key with recorded outcome |
| Repeated plan branch | Duplicate record created | Upsert semantics on a natural identifier |
| Partial batch recovery | Completed items repeated | Item-level keys and status |
| Long session resume | Old action replayed | Key carried in the handoff state |

The tool definition should tell the model how to supply the key and when to keep it stable. If the model regenerates the identifier on each attempt, the protection disappears. This is another reason the boundary between definition design and error design is thin: the instructions that make retries safe live in the same contract that tells the model how to call the tool.

### Retry budgets, backoff, and diagnostic logging

Retries should be bounded. A retry budget is a limit on how many attempts a workflow may make for a given operation or across a whole task. Keeping that budget in orchestration code rather than in the prompt makes it enforceable. When the budget is exhausted, the loop stops retrying and takes the escalation path, instead of continuing until the context fills or the run is cancelled. A budget that is too small causes premature failure; one that is too large wastes time and cost on operations that cannot succeed.

Backoff means waiting longer between successive retries. The principle is simple: if a service is overloaded, immediate retries add pressure and make recovery less likely. Increasing delays give the service room to recover. A bounded number of attempts with increasing gaps is more reliable than rapid repetition, and a small element of variation prevents many calls from arriving at the same moment. The model does not need to compute the schedule; the orchestration layer can apply it and report only that a retry followed a wait.

Diagnostic logging turns failures into improvement. Each failed call should record the tool name, the error code, the category, the request identifier, and enough context to reproduce the condition, without capturing secrets or sensitive content. Logs should be structured so that an operator can count failure classes, spot a tool with an unusual rate of invalid arguments, and trace a particular request through a chain of attempts. Aggregated signals drive definition fixes: a spike in one code often points to a misleading description or a schema that invites the wrong call.

> **Common mistake:** Logging full arguments on failure. This frequently captures sensitive values and creates a privacy problem in a system whose reliability was otherwise sound.

### Worked error-contract example

Consider a tool that reserves an appointment slot. An early definition returned a bare failure string whenever anything went wrong. The model could not tell a full slot from an invalid date, so it sometimes retried the same impossible request many times and sometimes told the user that no slots existed when only one date was unavailable.

The revised contract distinguishes three outcomes. A full slot is terminal for that date and suggests choosing another date. An invalid date is terminal and names the offending field. A temporary reservation-service outage is retryable and carries a request identifier. A fourth result represents partial success when several requested slots are booked together.

| Scenario | Code returned | Category | Suggested action |
| --- | --- | --- | --- |
| Requested date fully booked | SLOT_UNAVAILABLE | terminal | Offer nearby dates |
| Malformed date text | INVALID_DATE | terminal | Supply a valid date value |
| Service temporarily down | RESERVATION_UNAVAILABLE | retryable | Retry with bounded backoff |
| Some slots booked | PARTIAL_RESERVATION | partial | Keep confirmed slots, retry rest |

The payload below shows the partial case. It reports what was secured, what was not, and a single call to make next. Because the confirmed slots are returned as identifiers, the model can carry them forward without reissuing their reservations.

```text
{
  "ok": "partial",
  "code": "PARTIAL_RESERVATION",
  "category": "partial",
  "confirmed": ["slot-17", "slot-19"],
  "unconfirmed": [
    {"slot": "slot-22", "reason": " SLOT_UNAVAILABLE"}
  ],
  "category_for_unconfirmed": "terminal",
  "suggested_action": "Keep the confirmed slots and offer alternate times for slot-22.",
  "request_id": "req-1190"
}
```

This contract also changes the loop: a partial result records confirmed identifiers as state, so a resumed session does not reserve the same slots twice. Error design, idempotency, and continuity are one connected problem.

## Worked scenario

A support workflow used a tool that looked up account status and then a tool that issued a credit. During a busy period, the status lookup began timing out intermittently. The model responded by retrying the lookup several times, then gave up and issued a credit based on an assumption, even though the account had not been verified. A reviewer needed to make the workflow reliable without removing the credit capability.

The diagnosis separated two issues. The timeout was retryable, but the result carried no category, so the model treated it like any other failure and eventually improvised. The credit tool had no idempotency key, so a retry after an ambiguous timeout could have issued a second credit. Both problems were in the contracts, not in the underlying services.

The team changed the lookup tool to return a structured result with a category of retryable and a bounded retry hint. They added a rule in the orchestration layer that a credit call is not permitted unless a fresh, successful status result is present in state, converting a best practice into an enforced gate. They added an idempotency key to the credit tool and required it in the schema. Finally, they made the failure log record the category and request identifier, so a recurring timeout pattern would be visible.

With these changes, a timeout produced a bounded series of retries followed by an escalation, not an assumed status. A credit call could not proceed without verification, and repeated calls could not duplicate a credit. The workflow did not become more complex in its reasoning; it became better constrained at its boundaries.

## Common mistakes

- Letting exceptions escape the tool so the model never sees a structured failure.
- Using a single generic error code for both retryable and terminal conditions.
- Repeating an identical terminal call because the result did not say not to.
- Reporting a partial operation as a total failure and duplicating completed work.
- Regenerating an idempotency key on each retry, defeating duplicate protection.
- Embedding retry limits only in prompt text, where they cannot be enforced.
- Logging full tool arguments on failure and capturing sensitive values.

## Chapter summary

- Errors should re-enter the loop as structured results that the model can reason about.
- Classify failures as retryable, terminal, conditional, or partial, and carry the class in the result.
- An actionable error result names the offending field and gives one clear next step.
- Partial success must be reported explicitly so completed work is preserved.
- Idempotency keys keep repeated calls from duplicating side effects.
- Retry budgets and backoff belong in orchestration code, with a clear escalation path.
- Structured, minimal failure logs support diagnosis and governance without leaking sensitive data.

## Checkpoint questions

1. A lookup fails because the service is temporarily overloaded. Which classification and response are most appropriate?

- A. Terminal; stop and report failure.
- B. Retryable; retry with a bounded budget and backoff.
- C. Conditional; ask the user for different input.
- D. Partial; report the items that succeeded.

2. Which field most directly helps a model repair an invalid tool call?

- A. A generic message such as "operation failed."
- B. A suggested action that names the offending field and a valid alternative.
- C. A long description of the tool's implementation.
- D. A timestamp in the log.

3. A batch operation updates four records and fails on the fifth. What is the best result to return?

- A. A single failure, so the model knows to redo the whole batch.
- B. A single success, so the model continues without concern.
- C. A partial result listing confirmed items and the unconfirmed item with a reason.
- D. No result, so the orchestration layer can handle it silently.

4. Why must an idempotency key remain stable across retries?

- A. Because a changing key creates a new logical operation and allows duplicate effects.
- B. Because keys must be short.
- C. Because the model prefers familiar strings.
- D. Because logs reject repeated keys.

5. Where should a retry budget be enforced for reliable behavior?

- A. In the prompt, as a polite suggestion to the model.
- B. In the tool description, as a warning.
- C. In orchestration code, as a hard limit with an escalation path.
- D. In the user interface, as a visual hint.

6. Which logging practice is most consistent with good error handling?

- A. Record every full argument value to maximize detail.
- B. Record the tool name, error code, category, and request identifier without sensitive values.
- C. Record only the final success of a run.
- D. Avoid logging entirely to reduce storage use.

### Answers and rationale

1. Correct: B. A temporary overload is the classic retryable case, and bounded retries with backoff give the service room to recover. A is wrong because a transient condition is not terminal. C is wrong because new user input does not address an overload. D is wrong because nothing succeeded yet.

2. Correct: B. A specific suggestion tied to the offending field turns an error into a repair step. A is wrong because a generic message gives no direction. C is wrong because implementation detail does not guide the next call. D is wrong because a timestamp helps logs, not call repair.

3. Correct: C. A partial result preserves the confirmed records and isolates the failed one. A is wrong because redoing the batch duplicates four writes. B is wrong because it hides a real gap. D is wrong because the model receives no information and cannot proceed.

4. Correct: A. A stable key identifies one logical operation; changing it makes each retry look new, permitting duplicates. B is irrelevant to correctness. C is an anthropomorphic distraction. D is wrong because logs normally welcome repeated keys for correlation.

5. Correct: C. Code-enforced limits cannot be ignored by the model and can trigger escalation. A and B are wrong because prompt text is guidance, not enforcement. D is wrong because a visual hint does not constrain an automated loop.

6. Correct: B. Structured, minimal records support diagnosis while respecting privacy. A is wrong because full arguments often contain sensitive data. C is wrong because failures are exactly what need recording. D is wrong because no logging prevents diagnosis.

---

*End of chapter 13.*
