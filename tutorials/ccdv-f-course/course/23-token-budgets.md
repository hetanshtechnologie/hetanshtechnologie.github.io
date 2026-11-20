# Chapter 23 — Token Budgets, Pinning, and Cost Models

## Learning objectives

- Treat the context window as one shared budget and assign an allowance to each component.
- Read usage fields from a response and reconcile them with pre-call estimates.
- Explain why input, output, cache reads, and cache writes carry different unit prices.
- Build a workload cost model from token counts and call volume.
- Apply a cost model to a worked example and interpret the result.
- Set guardrails, thresholds, and alerts that catch spend changes early.
- Explain how model pinning affects both reproducibility and cost forecasts.

## Key concepts

### One window, many claimants

The context window is a single pool that every part of a request draws from. Instructions, examples, conversation history, retrieved passages, tool definitions, tool results, and the answer itself all consume the same allowance. It is not a separate input quota plus a separate output quota. If a long document fills the window, the model has less room to answer, and a request can end with a truncated response.

Budgeting means deciding the allowances before writing the prompt. Start with the output you need and reserve it first; everything else must fit around that reservation. Then assign a ceiling to history, because it grows on every turn unless you window or summarize it. Retrieved material is usually the most variable component, so rank and cap it rather than stuffing everything into the request. Tool definitions are fixed overhead paid on every call, which is an argument for exposing only the tools a given route can use.

| Component | How to bound it | Failure if left unbounded |
| --- | --- | --- |
| System instructions | Keep stable and concise | Reuses tokens that could hold source material |
| Examples | Use the smallest set that covers the pattern | Repetitive examples crowd out real input |
| Conversation history | Window turns or summarize older ones | Unbounded growth and lost instructions |
| Retrieved passages | Rank, deduplicate, cap per passage | Relevant detail pushed out by padding |
| Tool definitions and results | Expose relevant tools, trim verbose results | Fixed cost on every call, noisy context |
| Reserved output | Set a maximum derived from the answer contract | Truncated or structurally invalid answers |
| Safety margin | Leave a small unused buffer | Estimate errors causing overflow |

> **Common mistake:** Filling the window with source documents and assuming the answer will simply be shorter. Output space must be reserved explicitly, because input and output compete for the same tokens.

### Estimates before the call, measurements after it

Before a request, token counts are estimates. Tokenization depends on exact characters, and different models use different vocabularies. A tokenizer that matches the chosen model gives the best pre-flight estimate, but it remains an estimate. After the call, the response reports usage: input tokens, output tokens, and often separate fields for tokens served from cache and tokens written to cache.

Those reported numbers are the ones to bill from and to log. Feed them into your monitoring so that your estimates can be calibrated against reality. A gap that grows over time usually means history is creeping up, a tool started returning verbose results, or a prompt edit added a block nobody noticed. Counting only the visible answer text is a frequent error; reasoning tokens and hidden usage are part of the output figure.

A practical logging record contains the resolved model version, the route or prompt version, input tokens, output tokens, cache-read tokens, cache-write tokens, elapsed time, and the outcome of any validation. Without the route and version fields, a cost spike cannot be attributed to a cause.

> **Try it:** Take one real request and count its tokens with a tokenizer before sending it. Compare that number with the usage reported afterward, then repeat with a long tool result attached. The size of the gap tells you how much buffer your budget needs.

### What a price card contains

A model's unit price is not one number. Fresh input tokens and generated output tokens are priced separately, with output typically several times more expensive because generation is sequential and consumes more compute. Cached input reads are much cheaper than fresh input, while cache writes may carry a small premium over the base input rate. Batch submissions are often discounted because the provider can schedule them when capacity is available.

| Billable component | What it represents | Relative price | Main driver |
| --- | --- | --- | --- |
| Fresh input | Prompt tokens not served from cache | Baseline input rate | Prompt length and history growth |
| Output | All generated tokens, including reasoning | Several times the input rate | Answer length and thinking budget |
| Cache read | Prefix tokens reused from a stored entry | A small fraction of the input rate | Prefix stability and repeat calls |
| Cache write | First storage or refresh of a prefix | Slightly above the input rate | Prefix length and update frequency |
| Batch tokens | Tokens processed asynchronously | Often a fraction of synchronous rates | Tolerance for delay |

The rates themselves change between models and regions, and they change over time. Treat any table in a study guide as an illustration of *shape*, not a quote. In production, load rates from configuration so that a price change is an edit to one file rather than a hunt through source code.

> **Exam note:** A cost question usually turns on which token bucket a token lands in. Output tokens dominate when answers are long; input tokens dominate when documents are large; cache reads dominate the discussion when a prefix is stable and reused heavily.

### Building a workload cost model

A cost model is an arithmetic statement about a workload. For each route, estimate fresh input tokens, cached input tokens, and output tokens per call; multiply by expected calls in the period; apply the appropriate unit rates; then add the cost of retries and any downstream review. Sum across routes. That total is a forecast you can compare with the invoice later.

The useful part is not the final number. It is the sensitivity analysis. Double the call volume and see which component grows fastest. Shorten the answer by 30 percent and see whether output or input dominates. Remove the cache and watch what happens. A model that shows which lever moves the bill is worth more than a precise estimate that nobody acts on.

```python
RATES = {  # Illustrative placeholder rates, not published prices.
    "balanced": {"input": 2.00, "output": 8.00,
                 "cache_read": 0.20, "cache_write": 2.50},
}

def monthly_cost(rate, calls, fresh_in, cached_in, out, batch_factor=1.0):
    parts = {
        "fresh_input": calls * fresh_in / 1_000_000 * rate["input"],
        "cache_read": calls * cached_in / 1_000_000 * rate["cache_read"],
        "output": calls * out / 1_000_000 * rate["output"],
    }
    return {name: round(value * batch_factor, 2)
            for name, value in parts.items()}

print(monthly_cost(RATES["balanced"], 25_000, 800, 5_200, 400))
```

For 25,000 calls with 800 fresh input tokens, 5,200 cached input tokens, and 400 output tokens, the parts are 40.00, 26.00, and 80.00 in the illustrative currency, for a monthly total of 146.00. Sending the same 6,000 input tokens fresh on every call would produce 300.00 of input charges instead of 66.00, so the cached prefix removes most of the input cost. Processing the same work as a batch at half the synchronous rate would bring the total to about 73.00, provided no one is waiting for individual results.

### Guardrails and alerts

A cost model predicts; guardrails enforce. Set a hard cap per project or tenant so that a runaway loop cannot spend without limit. Set a per-request output ceiling derived from the answer contract, because a single verbose response is small but a thousand of them are not. Bound concurrency in agent loops, since parallel workers can multiply spend before anyone notices.

Alerts should fire on *rates and ratios*, not only on totals. Useful signals include cost per request trending upward, cache hit rate falling, average output length growing, promotion rate to a stronger tier climbing, and usage from one tenant jumping relative to its own baseline. A monthly budget alert that fires on the last day is too late to change anything; a daily threshold at a fraction of the budget gives time to act.

| Guardrail | What it stops | Suggested signal |
| --- | --- | --- |
| Spend cap per project | Unbounded aggregate spend | Block or throttle near the cap |
| Output ceiling per request | Accidental essays and runaway reasoning | Reject or trim overlong output |
| Step or tool-call cap | Agent loops that never terminate | Force a stopped status with a reason |
| Cache hit-rate alert | Silent loss of prefix reuse | Investigate when the rate drops |
| Tier promotion alert | Escalation drift toward the expensive model | Compare promotion rate with baseline |
| Per-tenant anomaly alert | One caller dominating the bill | Compare with that caller's own history |

> **Common mistake:** Watching only the monthly total. By the time a total looks wrong, the behavior that caused it has been running for weeks. Component-level ratios expose the change much earlier.

### Pinning changes the cost story too

Pinning is usually discussed as a quality and reproducibility measure, but it affects cost forecasts as well. A moving alias can change both unit prices and behavior at any time. A request that used to finish in 300 output tokens may produce 600 under a new default, doubling the largest line in the bill without a code deploy. Recording the resolved version in your logs lets you separate "we changed the workload" from "the model changed underneath us."

When you evaluate a new snapshot, include cost per successful task in the comparison. A version that improves accuracy but spends twice as many output tokens may still be a bargain if it prevents expensive rework; it may also be a bad trade if the extra tokens buy nothing on your workload. The decision needs evidence from your own prompts rather than from a general announcement.

> **Exam note:** If a scenario reports a cost increase with no change in traffic or prompts, look for a model version change, a thinking budget added upstream, or a cache prefix that stopped matching. Those are the usual causes.

## Practice lab

**Goal.** Build a small cost model for one route and see which component dominates.

**Steps.**

1. Pick a repeatable request in a scratch project and run it ten times with usage logging enabled.
2. Record fresh input, cached input, and output tokens for each run, plus the resolved model identifier.
3. Compute a per-call average, then multiply by a hypothetical 20,000 calls per month using placeholder rates from a configuration file.
4. Recompute twice: once with output shortened by a quarter, and once with the cached prefix removed.
5. Add a threshold alert on output tokens per request and trigger it deliberately with a very long answer.

**Expected observation.** Output tokens usually dominate cost when answers are verbose, while fresh input dominates when documents are long. Removing the cache raises input charges sharply. The alert fires on the long answer, demonstrating that a per-request ceiling would have prevented the spike.

## Worked scenario

An internal service summarizes project status notes for a weekly digest. There are about 25,000 notes each month. Every note is preceded by the same 5,000-token style guide and example section; the note itself adds roughly 1,000 tokens, and the summary averages 400 output tokens. Nobody reads the summaries in real time, but the team wants them ready by morning. The finance team asks for a forecast before a model change is approved.

The analyst starts by separating the buckets. The style guide is identical across calls and long enough to be worth caching, so 5,000 tokens per call belong in the cache-read bucket. The note text is unique, so 1,000 tokens are fresh input. The 400 generated tokens are output. There is no thinking phase, and the team confirms that the chosen snapshot supports the desired output format.

Using the illustrative rate card from this chapter with 25,000 calls gives fresh input charges of 50.00, cache-read charges of 25.00, and output charges of 80.00, for a total near 155.00 per month. The same workload without caching would charge 300.00 for input alone. Because the digest is prepared overnight, the calls are eligible for batch processing; applying the illustrative half-rate discount brings the total to roughly 77.50.

The analyst then examines sensitivity. Output is the largest single component, but it cannot be shortened much without losing useful detail. Input is mostly cached already, so the remaining lever is the unique note text. A proposal to truncate notes to a fixed length would harm the summaries and save little, so it is rejected. The batch discount is adopted because it fits the deadline, and the team adds an alert on cache hit rate so that a broken prefix is caught quickly.

A month later the bill rises even though volume is flat. The trace fields show the same prompt and the same route but a different resolved model version, and output tokens per call have increased by a third. Because versions were logged, the cause is established in minutes. The team compares the new snapshot on a frozen set, finds no quality gain, pins back to the previous version, and adds a pre-rollout cost check to the upgrade checklist.

> **Exam note:** Cost diagnosis follows the same discipline as quality diagnosis: attribute by dimension first, then change one thing. Logging versions, routes, and token buckets is what makes attribution possible.

## Common mistakes

- Assuming input and output share a single unit price.
- Forgetting that reasoning tokens appear in the output bucket.
- Reserving no output space and then wondering why answers are truncated.
- Comparing pre-call token estimates with the invoice without using reported usage.
- Treating example price tables as current quotes instead of loading rates from configuration.
- Ignoring cache writes when a prefix is refreshed frequently.
- Setting a monthly budget alert but no per-request or per-tenant signal.
- Failing to log the resolved model version during a cost increase.
- Judging a new snapshot on quality alone when its output length changed.

## Chapter summary

- The context window is one shared budget; reserve output first, then bound history, retrieved text, and tools.
- Pre-call counts are estimates; reported usage after the call is the source of truth for billing and monitoring.
- Fresh input, output, cache reads, cache writes, and batch tokens have different unit prices.
- A workload cost model multiplies per-call token buckets by call volume and adds retries and review.
- Guardrails include spend caps, output ceilings, step caps, and alerts on component-level ratios.
- Pinning stabilizes both behavior and cost forecasts; always log the resolved version.
- Compare model versions on cost per successful task, not on unit price alone.

## Checkpoint questions

1. Why must output space be reserved before filling the input side of the context window?

A. Output tokens are billed at a lower rate than input tokens

B. Input and output draw from one shared window, so a full input leaves no room for the answer

C. Output tokens are excluded from usage reporting

D. Tokenizers fix output length independently of the prompt

2. A response reports separate fields for cache reads and cache writes. Why does that distinction matter for cost?

A. Cache reads are usually much cheaper than fresh input, while writes may carry a premium

B. Cache writes are always free and reads are always billed at output rates

C. The two fields are aliases and are summed twice by mistake

D. Cache fields only appear in batch requests

3. In a workload with 20,000 calls, 5,000 cached input tokens, 1,000 fresh input tokens, and 300 output tokens, which bucket is largest in tokens?

A. Fresh input

B. Output

C. Cache read

D. All three are equal

4. A cost increase appears with flat traffic and unchanged prompts. Which log field most directly identifies a model version change?

A. Resolved model identifier recorded on each trace

B. The user interface theme

C. The number of checkpoint questions in a chapter

D. The name of the application repository

5. Which alert is most likely to catch a broken cache prefix early?

A. A monthly invoice total

B. A cache hit-rate trend compared with its baseline

C. A count of deployed services

D. A daily count of pull requests

6. What does a per-request output ceiling achieve?

A. It guarantees higher answer quality

B. It removes the need for usage logging

C. It bounds the cost of a single verbose or runaway response

D. It makes every request eligible for batch processing

### Answers and rationale

1. **B.** The window is shared, so reserving output prevents truncation. A is wrong because billing rates do not allocate window space. C is wrong because output usage is normally reported. D is wrong because output length is not fixed by tokenization.

2. **A.** Reads are discounted and writes may cost slightly more than base input. B is wrong because writes are not free and reads are not billed as output. C is wrong because the fields represent different events. D is wrong because cache accounting applies to synchronous requests as well.

3. **C.** Five thousand cached tokens per call exceeds 1,000 fresh input tokens and 300 output tokens. A and B are wrong because their counts are smaller. D is wrong because the counts plainly differ.

4. **A.** A recorded resolved identifier lets you see a version change immediately. B, C, and D are unrelated fields that cannot attribute a cost change to a model.

5. **B.** A falling hit rate reveals prefix reuse failure before it shows up in totals. A is too slow and aggregates many causes. C and D describe activity unrelated to token economics.

6. **C.** An output ceiling limits the blast radius of verbose generation. A is wrong because a ceiling does not improve quality. B is wrong because logging remains necessary. D is wrong because batch eligibility depends on timing, not output limits.

---

*End of chapter 23.*
