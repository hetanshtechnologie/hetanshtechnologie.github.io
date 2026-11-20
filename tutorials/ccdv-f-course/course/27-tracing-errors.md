# Chapter 27 — Tracing, Errors, Recovery, and Monitoring

## Learning objectives

- Separate failures caused by your integration from failures caused by the model, and explain why that distinction changes the fix.
- Read a trace in sequence to locate the first step where a request stopped being correct.
- Recognize the main error families — authentication, validation, timeouts, and rate limits — and the signature each one leaves behind.
- Choose a retry strategy, including backoff and jitter, that suits the specific error rather than retrying everything.
- Build lightweight monitoring that surfaces quality regressions before users report them.
- Decide when to fail fast, when to retry automatically, and when to hand a failure to a human.

## Key concepts

### Two suspects: the integration or the model

When a request goes wrong, there are only two broad places to look. The first is the integration: everything your application controls around the model call — the credentials, the request shape, the network route, and the way you parse the response. The second is the model: the output it produces, its habit of ignoring a rule, inventing a fact, or declining a harmless request.

Keeping the suspects distinct prevents wasted effort. If the service rejects a request before the model sees it, rewriting the prompt cannot help. If the model produced a good answer but your parser discarded the field you needed, changing the instructions is equally pointless. Only a record of what actually happened separates the two.

Integration faults tend to be deterministic: the same bad key fails every time, and a single code change fixes it. Model faults tend to be probabilistic: identical input may produce a good answer nine times and a poor one on the tenth. Those call for evaluation sets, clearer instructions, guardrails, and thresholds rather than one code fix.

A middle category also exists: the model behaved as asked, but its data was wrong. A retrieval step fetched an outdated document, or a tool returned an empty result treated as authoritative. The answer looks like a model failure, yet the model reasoned correctly from bad inputs. A trace separates the two.

> **Exam note:** Scenario questions often describe a symptom and ask what to investigate first. A rejected request or a parse failure points at the integration. An answer that is present but wrong or unsafe points at the model or its inputs. Read the symptom before you choose the layer.

### Reading a trace to find the first wrong step

A trace is an ordered record of one request: what was sent, what was retrieved, which tools ran, and what was produced. The useful skill is not collecting traces but reading them in order, to find the first step where reality stopped matching your expectation. Every step after that is built on a compromised foundation.

Ask one question at each stage, in order: is this what I intended? Check the user text, the assembled prompt, the retrieved documents, each tool call and result, and finally the output. Stop at the first mismatch. A wrong answer that follows a missing document is a retrieval bug in disguise; polishing the wording will not restore the document.

Symptoms travel downstream. A malformed tool argument produces an empty result, then a thin context, then a vague answer, then a low grade. Starting at the low grade invites a guess about the prompt; walking forward catches the malformed argument and fixes the real defect in one edit.

That discipline requires a trace that records every stage. Logging only input and final text hides the middle. A diagnostic trace should capture identifiers, versions, assembled messages, retrieved context, tool calls and results, and the outcome.

| Trace field | What it lets you confirm |
| --- | --- |
| Request and session identifiers | Which calls belong to one user action, so a multi-step flow can be replayed as a unit |
| Timestamp | The order of events and the moment a problem began |
| Model and prompt-template versions | Whether a behavior change followed a version change or a code edit |
| Assembled messages | Exactly what the model was told after templates and context were merged |
| Retrieved context | Which documents or records were actually supplied |
| Tool calls and results | What the model attempted and what each action returned |
| Token counts and latency | Whether context or cost grew unexpectedly before the failure |
| Output and grade | What was produced and how it was judged |

Keep instrumentation consistent across environments; a production trace that hides tool results guarantees unexplainable failures. Treat traces as sensitive data, since they hold user text and sometimes secrets, and apply access, retention, and redaction rules accordingly.

> **Try it:** Take one recent failure and explain it using only the input and final output. Then open its tool calls and retrieved context. Note how often the real cause was invisible in the short version. That gap argues for richer traces.

### A field guide to common error types

Group failures by where they surface and what they mean. Four families dominate integration troubleshooting: authentication, validation, timeouts, and rate limits. Each leaves a recognizable signature and has a cheap first check. The failure-signature table is a starting vocabulary, not an exhaustive list.

| Failure signature | Typical signal | Likely cause | First check |
| --- | --- | --- | --- |
| Authentication | Rejection before any output, often a 401 or 403 | Missing, expired, or wrong-scope credential; wrong environment | Confirm the credential exists at runtime and belongs to the intended project or tenant |
| Validation | Immediate refusal of the request, often a 400 or 422 | Malformed JSON, unknown parameter, wrong message role, schema mismatch | Validate the request body against the documented shape before sending |
| Timeout | No response within the deadline, sometimes after a long delay | Network path, overloaded upstream, or an unrealistic deadline | Measure where the time went and compare with the configured deadline |
| Rate limit | Explicit throttling response, often a 429, sometimes with a retry time | Too many requests in a window, bursty concurrency, shared quota | Read the returned retry guidance and inspect concurrency and quota usage |
| Parse failure | Response arrives but your code cannot decode it | Assumptions about format, truncated stream, or unexpected wrapper | Log the raw response and check it against the parser's expected shape |

Authentication and validation failures are deterministic and client-side in origin. They recur on every attempt until something changes, which is exactly why retrying them is wasted work. Timeouts and rate limits are often transient; a later attempt may succeed. Parse failures sit in between: one malformed response may be a fluke worth a retry, while a systematic mismatch means parser and producer disagree.

Model-specific families need a parallel vocabulary. Instruction-following failures ignore a stated rule; fabrication states unsupported facts; grounding failures use stale context; format failures fail validation; refusals decline safe tasks; safety failures produce withheld content. Match the response to severity: repair a format slip automatically, flag a fabrication, and stop and escalate a safety failure.

> **Common mistake:** Treating every bad answer as a reason to rewrite the prompt. If the trace shows the required document was never retrieved, a more elaborate prompt cannot supply information the model never received. Fix the supply, then judge the answer.

### Retry, backoff, and knowing when to stop

A retry helps only when the cause is likely gone by the next attempt. That holds for transient network faults, brief overload, and rate limits that reset; it fails for bad credentials, invalid payloads, and most quality problems. Retrying a safety failure is harmful, since it multiplies the chance that one attempt finally produces the disallowed output.

Backoff means waiting longer between attempts, usually doubling each delay. Without it, aggressive retries keep an overloaded service overloaded. Jitter adds a small random amount, stopping many clients from retrying in lockstep; together they spread a thundering herd into a trickle.

A sound policy has a ceiling: cap the attempts and the delay, respect server guidance, then fail clearly rather than hanging. In an agent loop a retry also consumes steps and tokens, so the step budget belongs in the same decision.

The snippet below retries only plausibly transient errors, honors an explicit retry time when the server provides one, and adds jitter to a capped exponential delay.

```python
import random
import time

NON_RETRYABLE = {400, 401, 403, 422}

def call_with_backoff(call, *, max_attempts=5, base=0.5, cap=8.0):
    for attempt in range(max_attempts):
        try:
            return call()
        except ApiError as exc:
            if exc.status in NON_RETRYABLE:
                raise                       # auth or validation: a retry cannot help
            if exc.status == 429 and exc.retry_after:
                delay = exc.retry_after     # follow the server's own guidance
            else:
                delay = min(cap, base * (2 ** attempt))
            delay += random.uniform(0, delay * 0.25)   # jitter spreads clients out
            if attempt == max_attempts - 1:
                raise
            time.sleep(delay)
```

Note what the code does not retry: authentication and validation errors are raised immediately, since repeating them cannot change the result. The exponential term grows the delay, the cap bounds it, and jitter breaks synchronization. In production the sleep would be asynchronous.

> **Common mistake:** Wrapping every call in an unlimited retry loop. This hides deterministic bugs, inflates cost and latency, and can turn one throttling event into a sustained flood. A retry policy is a decision, not a reflex.

### Monitoring quality and stopping regressions

Fixing today's failure is half the work; the other half is noticing tomorrow's before a user does. Monitoring has two layers: operational signals about whether the system works, and quality signals about whether its answers remain good.

Operational signals include error rates, latency percentiles, token usage, tool-call success, and throttling. A step change after a deployment points at that change; a slow rise in empty retrieval results points at data going stale. Plot signals against deployment and prompt-edit markers.

Quality signals come from graded samples; a representative sample plus a fixed regression set suffices. Track task success, unsupported claims, false refusals, format validity, and critical categories. Report per-category results, since a stable average can conceal a collapsing slice.

| Monitoring question | Signal to watch | Response when it moves |
| --- | --- | --- |
| Is the service reachable? | Error rate by family, timeout rate | Investigate integration; page an engineer if sustained |
| Are we within budget and quota? | Tokens per request, 429 count, cost per request | Tune context, concurrency, or caching |
| Did a change hurt quality? | Graded regression-set score by category | Block rollout; compare versions; inspect failing traces |
| Are answers drifting over time? | Unsupported-claim and refusal rates over days | Inspect source freshness and data pipelines |
| Are critical cases still safe? | Safety-gate failures, blocked actions | Stop rollout and escalate immediately |

Thresholds need tolerance bands because output varies between runs. Define a floor and a maximum allowed drop from the last accepted baseline, with stricter limits for critical and safety categories. Record each metric's definition beside its value so future comparisons are meaningful.

Make changes reviewable: pin the model version, version prompt templates, and scrutinize tool schemas and retrieval settings as behavior-defining artifacts. Turn each found regression into a permanent test so every incident leaves the system more observable.

> **Exam note:** A canary release — exposing a change to a small share of traffic — complements a fixed regression set. The set catches known failures deterministically; the canary catches novel ones while limiting the number of affected users.

## Practice lab

**Goal:** Build a small diagnostic loop that can classify a failure and choose a retry policy from a recorded trace.

**Steps:**

1. Create a scratch script that wraps one model call and logs, in order: request identifier, assembled messages, tool calls and results, raw response, and elapsed time.
2. Introduce four deliberate faults one at a time: a wrong credential, a malformed request field, a forced timeout, and a simulated throttling response with retry guidance.
3. For each fault, record which trace field first revealed the problem and whether a retry would have helped.
4. Add the backoff function from this chapter and confirm that it raises immediately for the authentication and validation faults but waits and retries for the other two.
5. Add a tiny regression set of five cases and a score comparison that flags a drop greater than a chosen margin.

**Expected observation:** The two deterministic faults fail identically on every attempt and are rejected without sleeping. The transient faults follow the retry policy, with visibly increasing delays. The trace shows the first wrong step for each fault at a different stage, so a single canned response cannot handle all four.

## Worked scenario

A support assistant answers questions from a document store. After engineers enable a new model version, the share of "unusable" answers climbs sharply. Rather than soften the prompt, an engineer reads traces first.

The traces reveal two clusters. In one, the answer is empty and the tool log shows a throttling response followed by rapid retries that all failed. In the other, a full answer is present but the retrieved context contains a document from an older policy revision. Different first wrong steps require different fixes.

For the throttling cluster, the retry code attempts calls immediately with no backoff. Each burst deepens the overload. Replacing the tight loop with capped exponential backoff and jitter, and honoring server guidance, returns the error rate to normal without touching the prompt.

For the stale-document cluster, the model is not at fault either. The retrieval filter still points at an archived collection that was not updated when the policy migrated. The assistant faithfully answered from an outdated source. Reindexing the active collection and correcting the filter removes the cluster.

The new model version is a coincidence in time, not a cause. Had the team rewritten the prompt on the first morning, both defects would have remained, and the edit would have made attribution harder. Recorded versions let the engineer rule the model out quickly.

The engineer adds both signatures to the regression set, separates throttling errors from quality grades on the dashboard, and alerts on retrieval freshness. The lesson is procedural: find the first wrong step, classify the error, apply a matching fix, and make the incident impossible to miss.

## Common mistakes

- Changing a prompt before reproducing the failure and reading the trace.
- Logging only inputs and outputs, which hides the middle of the request where most faults live.
- Retrying authentication, validation, or safety failures as though they were transient.
- Retrying with a fixed, short delay and no jitter, which can amplify an overload.
- Trusting a stable aggregate score while a small critical category collapses.
- Treating a wrong answer as a model defect when the retrieved context was missing or stale.
- Failing to pin model and prompt versions, making later attribution guesswork.

## Chapter summary

- Failures come from the integration or from the model or its inputs, and the distinction determines the fix.
- Read a trace forward and stop at the first wrong step; downstream symptoms mislead.
- A useful trace carries identifiers, timestamps, versions, messages, context, tool calls, results, and outcomes.
- Authentication and validation errors are deterministic; timeouts and rate limits are often transient.
- Backoff with jitter, an attempt ceiling, and respect for retry guidance make retries safe.
- Never retry safety failures; escalate them instead.
- Monitor both operational signals and graded quality signals, sliced by category.
- Pin versions, use tolerance bands, and convert every incident into a regression case.

## Checkpoint questions

1. A request is rejected immediately with an authentication error before any output is produced. What is the best first action?

A. Rewrite the system prompt to be more explicit.

B. Confirm the credential exists at runtime and belongs to the intended environment.

C. Add three automatic retries with a short delay.

D. Lower the effort setting to reduce cost.

2. In a trace, the final answer is vague, and the retrieved-context field is empty. What is the first wrong step?

A. The final answer's wording.

B. The output parser.

C. The retrieval step that produced no context.

D. The model's temperature.

3. Which failure is most appropriate for automatic retry with backoff?

A. A malformed request payload.

B. An expired API key.

C. A transient timeout followed by a throttling response.

D. A safety-policy violation.

4. Why does jitter accompany exponential backoff?

A. It makes each delay exactly twice the previous one.

B. It prevents many clients from retrying at the same instant.

C. It removes the need for an attempt ceiling.

D. It converts deterministic errors into transient ones.

5. Which trace fields best support attributing a quality change to a specific edit?

A. Output text and word count only.

B. Token counts and latency only.

C. Model version and prompt-template version.

D. Timestamp and session identifier only.

6. A grading report shows a flat overall score but a sharp fall in one small critical category. What does this illustrate?

A. That the application needs more retries.

B. That aggregate scores can hide localized regressions, so per-category thresholds are needed.

C. That the trace has too many fields.

D. That rate limiting is the true cause.

### Answers and rationale

1. **B.** An early authentication rejection is deterministic and points at credential configuration. A is wrong because the prompt is never reached. C is wrong because repeating a bad credential cannot succeed and wastes calls. D addresses effort and cost, which are unrelated to authentication.

2. **C.** The empty context precedes and explains the vague answer, so it is the first wrong step. A describes a downstream symptom rather than the cause. B is wrong because the parser received a valid, if poor, answer. D is a plausible-sounding guess that the trace does not support.

3. **C.** Transient timeouts and throttling may clear after a wait, so backoff is suitable. A is a validation fault that fails identically every time. B is an authentication fault with the same problem. D must be blocked, never retried, because repetition increases risk.

4. **B.** Jitter spreads attempts across time so clients do not synchronize. A describes exponential growth, which is the role of the doubling term, not jitter. C is false because an attempt ceiling is still required. D is false because jitter cannot change an error's nature.

5. **C.** Version fields identify which change accompanied the behavior shift. A records symptoms without attribution. B speaks to cost and speed, not cause. D orders events but does not name the changed component.

6. **B.** A stable average with a failing slice shows why thresholds must apply per category. A invents a retry problem not present in the scenario. C misreads the situation as excessive logging. D assumes throttling without evidence.

---

*End of chapter 27.*
