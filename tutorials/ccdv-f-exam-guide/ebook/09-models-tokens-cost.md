# Chapter 9 — Model Behaviour, Tokens, Context, and Cost

## Learning objectives

- Describe, in plain language, how a language model turns a prompt into a stream of tokens and why two identical requests can produce different answers.
- Explain what extended reasoning buys you, and recognize the workloads where its extra latency and spend are justified.
- Identify the engineering pieces that sit around a model call — queues, caches, timeouts, and fallbacks — and name the failure each one addresses.
- Compare capable, balanced, and fast model tiers against workload requirements instead of against a leaderboard.
- Budget a context window deliberately, leaving room for instructions, history, retrieved material, tool output, and the answer itself.
- Estimate spend from prompt and output token counts, and apply caching and batch discounts where they genuinely help.
- Distinguish low-latency modes from ordinary calls and list the trade-offs each one introduces.
- Judge a design by cost per successful task rather than cost per call.

## Key concepts

### What happens between a prompt and an answer

It helps to stop thinking of a model as a database that looks up a fact and start thinking of it as a very large prediction machine. Your prompt is converted into small units called tokens. A token might be a whole short word, a piece of a longer word, a punctuation mark, or a space before a word. The model does not see letters; it sees a sequence of token identifiers.

Given that sequence, the model produces a probability distribution over every token it knows. That distribution is a ranked guess at what comes next. One token is selected, appended to the sequence, and the process repeats. The answer you read is the accumulated result of thousands of these small decisions. Nothing in the loop consults a table of correct answers. Each step is a guess conditioned on everything that came before it, which is why the wording of your prompt matters so much: it shapes the probability distribution at every subsequent step.

Two consequences follow immediately. First, output arrives incrementally. Because generation is sequential, a system can stream tokens to a user as they are produced, which improves perceived responsiveness even when total time is unchanged. Second, output length is a cost decision as well as a quality decision. A verbose answer consumes more of the window and more of the budget, because every generated token is another forward pass through the model.

A subtle point that exam questions like to probe: the model predicts the next token, not the next character, and not the whole sentence at once. Token boundaries explain odd behaviours such as a model struggling to spell a word backwards or counting letters in a string. Those tasks are awkward when the unit of processing is a chunk of characters rather than a character. If a requirement depends on exact character manipulation, plan to use code for that step and let the model orchestrate the code, rather than expecting the model to count reliably on its own.

> **Exam note:** When a scenario mentions character-level accuracy, reversals, or exact counting, the strong answer usually moves that work into a deterministic tool. The language model is a predictor over tokens, not a string utility library.

### Why identical requests do not always give identical answers

The probability distribution produced at each step is not a command to take the single most likely token. A sampler chooses from the distribution, and the settings that govern that choice are part of the API contract on most platforms. At one extreme, the sampler always takes the top token; this is often described as greedy or temperature-zero behaviour. At the other extreme, it draws more freely from the higher-probability tokens, producing more varied output. A setting commonly called temperature rescales the distribution before sampling, and a setting often called top-p or nucleus sampling truncates the distribution to a cumulative probability mass before drawing.

Nondeterminism therefore has two sources. One is sampling itself: even with identical input, a randomized draw can select different tokens when the distribution has several plausible candidates. The other is infrastructure: models are served by fleets of machines, routing can change, and backend improvements can alter behaviour over time. A platform may document that a given setting offers *best-effort* reproducibility rather than a guarantee, because hidden state and serving details are outside your control.

This matters for engineering in a very practical way. If your test suite asserts that two runs return byte-identical prose, it will be flaky by design. Assert on properties instead: valid JSON, correct category, required fields present, tone within a defined range, or a fact drawn from the supplied source. Where an application truly needs stable output, reduce sampling randomness, keep prompts fixed, and pin model versions where the platform allows it. Even then, design for variation rather than assuming it has been eliminated.

> **Common mistake:** Treating temperature-zero as a promise of reproducibility. It reduces randomness in the sampling step; it does not freeze the serving environment or the model version.

### Thinking modes and extended reasoning

Some models expose a mode in which they spend extra computation before answering. Rather than producing the answer immediately, the model generates a longer internal chain of working — exploring cases, checking arithmetic, reconsidering an assumption — and then returns a distilled result. From your application's perspective this looks like higher latency and higher output-token billing, because those working tokens are part of the response stream even if your user never sees them.

Extended reasoning pays for itself when the task has structure that rewards intermediate work. Multi-step arithmetic, constraint satisfaction, diagnosis from several weak signals, careful comparison of two long documents, and planning under conflicting requirements are good candidates. The extra working gives the model more opportunities to catch an early mistake before it commits to an answer. In these cases the cost of a wrong answer — a bad clinical suggestion, an incorrect financial figure, a failed deployment — dwarfs the cost of the extra tokens.

It does not pay for itself when the task is a direct lookup, a simple classification, a short rewrite, or an extraction where the answer is explicitly present in the input. On those workloads the additional computation mostly generates confidence about an already easy decision. If a one-line label is all you need, a thinking mode that produces a thousand working tokens is a poor trade: slower for the user, more expensive per request, and no measurable accuracy gain.

A useful mental test is to ask what a careful human would need to do. If a careful human would pause, write down intermediate values, and check a few cases, extended reasoning is worth trying. If a careful human would glance and answer, it probably is not. Confirm with a small evaluation set: run the same examples with and without the thinking mode, compare accuracy, and compare latency at the tail rather than the average.

| Workload | Extended reasoning likely worth it? | Why |
| --- | --- | --- |
| Label a support message as billing or technical | No | Direct pattern match; no intermediate steps needed |
| Summarize a contract clause in one paragraph | Usually no | Compression task, not a reasoning task |
| Reconcile totals across three inconsistent tables | Yes | Requires intermediate arithmetic and cross-checks |
| Decide whether a migration plan violates two policies | Yes | Conflicting constraints benefit from explicit checking |
| Rewrite a sentence in a friendlier tone | No | Style transformation, low error cost |
| Diagnose intermittent failures from sparse logs | Sometimes | Helps if evidence must be combined; test it first |

> **Try it:** Pick twenty examples from your own workload. Run them twice, varying only the reasoning mode. Record accuracy and the ninety-fifth-percentile latency. If accuracy is unchanged and latency doubles, you have measured a decision, not guessed at one.

### The engineering layer around the model

A model call is only one component in a production request. The behaviour your users experience is shaped by the machinery surrounding it, and exam scenarios often test whether you can name the right piece for the right failure.

A **queue** smooths bursts. If traffic arrives in spikes and the upstream service has a rate limit, enqueueing requests and draining them at a controlled rate avoids rejections. Queues also buy you a place to record work that has not yet been attempted, which helps with retries. The cost is waiting time, so a queue is a poor fit for an interactive path where the user is staring at a spinner.

A **cache** avoids repeating work. If the same instruction prefix, the same reference document, or the same classification question appears many times, storing the result or the reusable prefix saves both tokens and time. Caches help most when inputs repeat; they do nothing for unique requests. They also introduce staleness, so you need a policy for expiry and invalidation when the underlying document changes.

A **timeout** bounds the damage from a slow call. Without one, a single hung request holds a connection, a worker, and possibly a user's attention indefinitely. Timeouts should be set from the latency budget of the whole workflow, not copied from a default. A short timeout on a slow but necessary call will manufacture failures; a long timeout on a fast path will let a bad dependency degrade every request.

A **fallback** defines what happens when the primary path fails. The most common pattern is to retry a transient error, then try a smaller or faster tier, then return a safe degraded answer or a clear refusal to guess. A fallback is only useful if it is actually cheaper or more available than the primary path; falling back from one overloaded capable tier to another overloaded capable tier changes nothing.

| Layer | Failure it addresses | Cost of adding it |
| --- | --- | --- |
| Queue | Bursts, rate limits, lost work | Added wait time and operational state |
| Cache | Repeated identical work | Staleness and invalidation logic |
| Timeout | Hung calls consuming resources | Abandoned work if set too aggressively |
| Fallback | Temporary unavailability or over-budget calls | Complexity and possible quality drop |

> **Exam note:** If a scenario describes a sudden traffic spike causing rate-limit errors on an asynchronous batch job, a queue is the direct answer. If it describes a user-facing assistant that must answer within two seconds, a queue before the call is usually the wrong answer because it adds latency.

### Choosing among capable, balanced, and fast tiers

Model selection is a requirements exercise, not a prestige exercise. Vendors typically expose a family of models trading capability against speed and price. Rather than memorizing model names, classify them by what they are good at and match that to the workload.

The **capable tier** is the strongest general reasoner. It handles ambiguity, long chains of dependencies, and subtle instruction following best. It is also the slowest and most expensive option, and it may be unnecessary for narrow tasks. Choose it when the error cost is high or when a simpler tier has demonstrably failed on your evaluation set.

The **fast tier** is optimized for low latency and low unit cost. It excels at short, well-specified transformations: classification, extraction of an obvious field, reformatting, and quick drafts. Its weakness is complex reasoning and long, noisy contexts, where it may miss a constraint buried in the middle of a prompt. Choose it when the task is simple, volume is high, and mistakes are cheap and easy to detect downstream.

The **balanced tier** sits between them and is the sensible default for many products. It provides enough reasoning for moderate complexity without the full cost of the top tier. When you do not yet know what a workload needs, start here, collect measurements, then move up or down with evidence.

| Dimension | Fast tier | Balanced tier | Capable tier |
| --- | --- | --- | --- |
| Best-fit tasks | Classification, extraction, reformatting, short drafts | Summaries, moderate analysis, customer-facing answers | Multi-step reasoning, ambiguous policy calls, complex code review |
| Relative latency | Lowest | Moderate | Highest |
| Relative price per token | Lowest | Middle | Highest |
| Tolerance for long, noisy context | Limited | Moderate | Best |
| Instruction-following precision | Good for short instructions | Good for mixed instructions | Best for dense, conflicting constraints |
| Extended reasoning support | Often limited or absent | Usually available | Usually strongest |
| Typical failure mode | Misses a buried constraint | Occasional shallow reasoning | Overkill cost and slow tail latency |
| Good default? | Only for narrow, high-volume tasks | Yes, until measurements say otherwise | No, unless error cost is high |

Two practical rules follow. First, select on the *hardest common case*, not the average request. A tier that handles 90 percent of inputs but fails on the ten percent that matter to the business is the wrong tier. Second, selection is reversible. Route simple requests down and hard requests up, using a cheap classifier or an explicit signal from the caller. A mixed routing policy often beats a single global choice.

> **Common mistake:** Picking the capable tier for everything because quality is "more important than cost." At high volume that decision dominates the bill, and it does not fix a poorly written prompt. Fix the prompt, measure, then decide whether the tier is still the constraint.

### Context windows and token budgeting

The context window is the total number of tokens the model can consider in one request. It includes your system instructions, the conversation so far, retrieved documents, tool definitions, tool results, and the tokens reserved for the answer. It is a single shared budget, not a separate allowance for input and output. If you fill it with source material, you squeeze out room for the response, and the response may be cut off mid-sentence.

Budgeting means assigning an allowance to each component before you write code. Instructions are usually small and stable, which makes them good candidates for caching. Conversation history grows without bound unless you truncate or summarize it. Retrieved documents are typically the largest and most variable part, and they deserve the tightest controls. Tool definitions are fixed overhead per request; if you expose twenty tools when the task needs three, you pay for seventeen definitions on every call. Output reservation is the part people forget: decide up front that the answer may take two thousand tokens, and never let the input crowd that out.

| Component | How to control it | Typical risk if ignored |
| --- | --- | --- |
| System instructions | Keep concise; place stable prefix first | Eats budget, harder to cache if edited often |
| Few-shot examples | Use the fewest that cover the pattern | Redundant examples crowd out real input |
| Conversation history | Window it, or summarize older turns | Unbounded growth; late instructions drown in early text |
| Retrieved documents | Rank, deduplicate, cap per document | Relevant passage pushed out by padding |
| Tool definitions and outputs | Expose only relevant tools; trim verbose results | Fixed overhead on every request |
| Reserved output | Set a maximum and subtract from the input budget | Truncated answers and lost structure |
| Safety margin | Leave a small unused buffer | Off-by-one overflow when token counts are estimates |

Token counting is approximate before the call, because tokenization depends on the exact characters and the model's vocabulary. Count with the tokenizer that matches the chosen model where possible, and treat the result as an estimate with a small buffer. On platforms that report usage after the call, feed those numbers back into your monitoring so the estimate can be calibrated against reality.

Order also matters within the window. Many systems give special weight to material near the beginning and the end, while long middles are easier to overlook. Put the durable rules first, the task statement near the end, and the bulk of reference material between them. This is not a law of physics, but it is a useful default that also makes prompts easier for humans to review.

> **Exam note:** If a scenario says a long document causes the answer to omit a requirement that appeared in the middle, the fix is context engineering — reorder, compress, or retrieve the relevant passage — not switching to a more expensive model as a first move.

### Caching and batch discounts

Two mechanisms can reduce spend without changing the answer, provided your workload has the right shape.

**Prompt caching** reuses a prefix that is identical across many calls. You structure the request so the stable part — a long instruction block, a reference manual, a shared set of examples — comes first, and the variable part comes last. The platform stores the processed prefix and charges less for reading it again. To benefit, the prefix must be byte-for-byte stable, long enough that the saving matters, and reused before the cache entry expires. A timestamp or a random identifier at the start of the prefix destroys the benefit instantly. When the reference document changes, the cache key changes, so update deliberately rather than on every request.

**Batch processing** trades time for money. Instead of sending requests one at a time, you submit a file or collection, the provider runs them when capacity allows, and results arrive later at a reduced rate. The discount is real but the latency is unbounded from your application's point of view. Batch is excellent for nightly classification of archived messages, bulk summarization, and backfills. It is wrong for anything a user is waiting on.

These mechanisms compose. A nightly job can use a cached reference prefix and a batch endpoint at the same time. An interactive assistant can use a cached prefix but cannot use batch. A high-volume classifier with unique short inputs may benefit from neither, which is a useful finding: it tells you to reduce token count or move to a cheaper tier rather than hoping a discount will arrive.

| Technique | Requires | Saves | Does not help when |
| --- | --- | --- | --- |
| Prompt caching | Long identical prefix, repeated calls | Repeated input tokens | Every prompt is unique or the prefix changes constantly |
| Batch endpoint | Tolerance for delayed results | A percentage of each token charge | A user is waiting for the response |
| Shorter prompts | Editing discipline | Input tokens on every call | Needed context is genuinely large |
| Output limits | Clear answer contract | Output tokens | Answers are naturally long and required |

### Low-latency modes and their trade-offs

Some platforms offer a mode optimized for time to first token. The usual implementation runs a smaller, faster model for the initial part of the response and hands off to a larger model for later tokens, or applies a latency-focused serving path. From the outside the experience feels snappier, which matters for conversational products where a pause of a second is noticeable.

The trade-offs are worth stating explicitly. A fast opening does not guarantee a fast whole answer; total completion time may be close to that of a standard call. The handoff can introduce a slight stylistic shift partway through the response. Some modes restrict features such as extended reasoning, large contexts, or certain tool behaviours, and eligibility may depend on the request shape. If your request does not qualify, the platform may route it to the standard path, so you cannot assume the latency benefit in every case.

Use low-latency modes when the user is waiting and the task is conversational or lightweight. Avoid them when the answer must be correct on a first pass under difficult constraints, when you rely on a feature the mode excludes, or when your measurement shows that time to last token has not improved. Measure both time to first token and time to completion; optimizing only the first number can produce a product that starts quickly and finishes slowly.

> **Common mistake:** Assuming that a low-latency mode is just a cheaper version of the standard model. It is a different serving strategy with feature restrictions, and it must be tested against the actual request shape.

### Measuring cost per successful task

Cost per call is a misleading metric. A cheap call that returns unusable output and needs two retries is more expensive than a costly call that succeeds once. A fast tier that misclassifies seven percent of inputs may create a manual-review queue that costs far more than the tokens saved. The unit that matters is cost per successful task, where a successful task is one that meets the acceptance criteria of the workflow.

The calculation is simple in form. Estimate the expected cost of one attempt, then divide by the probability that the attempt succeeds. If retries are possible, include the expected number of attempts and the cost of any downstream verification. Then compare that figure across designs, including the human time spent correcting mistakes. The tier with the lowest sticker price often loses once rework is counted.

```python
from dataclasses import dataclass

@dataclass
class PriceCard:
    name: str
    input_per_mtok: float
    output_per_mtok: float
    cached_input_per_mtok: float
    batch_multiplier: float = 1.0

# Illustrative placeholder rates, not published prices.
CARDS = {
    "fast":     PriceCard("fast",     0.25,  1.25, 0.03, 0.50),
    "balanced": PriceCard("balanced", 3.00, 15.00, 0.30, 0.50),
    "capable":  PriceCard("capable", 15.00, 75.00, 1.50, 0.50),
}

def call_cost(card, input_tokens, output_tokens,
              cached_tokens=0, batch=False):
    fresh = max(0, input_tokens - cached_tokens)
    total = (fresh / 1_000_000) * card.input_per_mtok
    total += (cached_tokens / 1_000_000) * card.cached_input_per_mtok
    total += (output_tokens / 1_000_000) * card.output_per_mtok
    return total * card.batch_multiplier if batch else total

def cost_per_success(cost_per_attempt, success_rate,
                     max_attempts=1, review_cost=0.0):
    # Expected spend across bounded retries, then amortized over successes.
    expected_spend = 0.0
    still_needed = 1.0
    for _ in range(max_attempts):
        attempts = still_needed
        expected_spend += attempts * (cost_per_attempt + review_cost)
        still_needed *= (1.0 - success_rate)
    return expected_spend

for tier in CARDS:
    per_call = call_cost(CARDS[tier], 900, 40, cached_tokens=700)
    print(tier, round(per_call, 6),
          round(cost_per_success(per_call, 0.93, 1, 0.00005), 6))
```

Read the output as a comparison of designs, not as a real quote. The fast tier may have the lowest per-call number, but if its success rate is lower than the balanced tier's, the two columns can reorder. That reordering is the whole point of the exercise.

A complete evaluation also tracks latency at the ninety-fifth percentile, because tail latency determines whether users abandon a request, and tracks the rate of silent failures — answers that look plausible but are wrong. Silent failures are the expensive ones, since they pass without triggering a retry and surface later as bad data.

> **Exam note:** When a question offers a choice between "reduce tokens per call" and "route failures to a stronger model," check the volume and the error cost. High-volume, low-stakes work usually rewards the first; low-volume, high-stakes work rewards the second.

## Worked scenario

A team runs an internal service that labels incoming feedback messages as one of four categories. Volume is about 200,000 messages per month. The labels feed a dashboard, not an automated action, and a mislabeled message is corrected by an analyst during a weekly review. There is no user waiting on an individual result. The current design sends every message to the capable tier with a long instruction block and extended reasoning enabled. The monthly bill is high, and a proposal on the table is to negotiate a larger discount.

The first step is to describe the task honestly. It is a four-way classification with a short input, a stable instruction, and a cheap, detectable error. There are no multi-step dependencies, no arithmetic, and no conflicting constraints. That description immediately weakens the case for extended reasoning and for the capable tier. The dashboard use case also removes the latency constraint: since nobody waits, a batch endpoint is available.

The second step is to measure quality rather than assume it. The team takes 500 labelled messages, representative of the real distribution, and runs three configurations: capable tier with reasoning, balanced tier without reasoning, and fast tier without reasoning. They score accuracy and inspect the confusion matrix. The capable and balanced tiers are within a fraction of a point of each other. The fast tier trails by two points, concentrated in one ambiguous category where the distinction depends on a policy nuance.

The third step is to look at the cost model. The instruction block is identical for all 200,000 calls, so placing it first makes it cacheable. Because the work is asynchronous, batch pricing applies. Combining a cached prefix with batch submission removes the two largest avoidable charges. Output is a single label, so an output cap prevents accidental essays.

The fourth step is to consider routing instead of a single global choice. Most messages are unambiguous; a small subset mentions the policy nuance. A cheap rule identifies that subset and sends only those to the balanced tier, while the rest go to the fast tier. The review queue receives the ambiguous subset automatically, which also gives the team fresh labelled examples for future evaluations.

The resolution is a layered decision. Use the fast tier as the default, with a cached instruction prefix and batch submission. Route the small ambiguous slice to the balanced tier. Drop extended reasoning entirely, since measurement showed no gain. Keep a small human review loop, and log token usage and accuracy by route so the choice can be revisited with data. The team does not need a discount negotiation; it needs a design that matches a low-stakes, high-volume task to the cheapest tier that meets an explicitly measured accuracy bar.

> **Exam note:** The reasoning pattern to reuse is: describe the task, measure tier quality on representative examples, apply structural savings such as caching and batch, then route exceptions. Reaching straight for a discount or a bigger model skips the steps that actually matter.

## Common mistakes

- Choosing a model by reputation instead of by workload requirements and measured accuracy.
- Treating temperature-zero as a guarantee of identical output across time and infrastructure.
- Enabling extended reasoning for simple classification or extraction tasks, paying for tokens that buy nothing.
- Forgetting that the context window is shared, so a large input leaves no room for the answer.
- Building a prompt prefix that changes slightly on every call and then wondering why caching never helps.
- Using a batch endpoint on a request path where a user is waiting.
- Claiming a latency mode improves total completion time without measuring it.
- Comparing cost per call across tiers instead of comparing cost per successful task.
- Setting a timeout from a default value rather than from the workflow's latency budget.
- Adding a fallback that points to an equally overloaded service and calling it resilience.

## Chapter summary

- A model predicts one token at a time from a probability distribution; token boundaries explain several of its quirks.
- Sampling settings and serving infrastructure make exact reproducibility a best-effort goal, not a guarantee.
- Extended reasoning helps when a task benefits from intermediate checking, and wastes money on direct tasks.
- Queues absorb bursts, caches avoid repeated work, timeouts bound slow calls, and fallbacks define graceful degradation.
- Model tiers should be matched to task complexity, error cost, and volume; balanced is a reasonable starting default.
- The context window is one shared budget; allocate allowances for instructions, history, retrieved text, tools, and output.
- Caching needs a stable prefix and repetition; batch processing needs tolerance for delay.
- Low-latency modes improve time to first token at the cost of feature restrictions and uncertain total time.
- The meaningful unit of economics is cost per successful task, including retries, review, and silent failures.

## Checkpoint questions

1. A developer sets temperature to zero and expects byte-identical output for the same prompt every time. What is the best correction to that expectation?

A. Temperature zero disables all randomness in the model itself, so the expectation is correct.
B. Temperature zero reduces sampling randomness, but serving details and model versions can still change output.
C. Temperature zero only affects output length, so the expectation was never related to determinism.
D. Temperature zero guarantees identical tokens only when batch processing is enabled.

2. Which workload is the strongest candidate for extended reasoning?

A. Assigning a one-word category to a short message
B. Copying a date from a form into a JSON field
C. Reconciling conflicting totals across several tables under a deadline
D. Replacing formal wording with friendlier wording

3. A nightly job processes 50,000 archived documents, and nobody waits for individual results. Which two savings are most appropriate?

A. A queue and a low-latency mode
B. Prompt caching with a stable prefix and a batch endpoint
C. A shorter timeout and a capable-tier fallback
D. Extended reasoning and a larger context window

4. Why must an output reservation be part of context budgeting?

A. Because output tokens are billed at a lower rate than input tokens
B. Because the context window is shared and a full input leaves no room for the answer
C. Because output tokens are not counted toward usage reporting
D. Because output length is fixed by the tokenizer regardless of the prompt

5. A fast tier is cheaper per call but misclassifies a larger share of inputs, each of which enters a paid review queue. Which metric reveals the problem most clearly?

A. Cost per successful task
B. Tokens per second
C. Number of calls per day
D. Time to first token

6. What is the main requirement for prompt caching to reduce cost?

A. The request must use extended reasoning.
B. The output must be short.
C. A long identical prefix must be reused across calls before the cache expires.
D. The request must be submitted through a batch endpoint.

7. An interactive assistant must feel responsive, and the team wants faster first tokens. What should they measure before declaring success?

A. Only the vendor's advertised tier name
B. Both time to first token and time to completion, plus feature availability
C. Only the number of tokens in the system prompt
D. Only the cache hit rate

8. A user-facing request is failing because traffic spikes exceed a rate limit. Which layer directly addresses this, and what is its main cost?

A. A batch endpoint; the cost is delayed results
B. A queue; the cost is added waiting time
C. Prompt caching; the cost is staleness
D. A longer timeout; the cost is higher token usage

### Answers and rationale

1. **B.** Sampling settings reduce randomness at the selection step, but routing, hardware, and model version changes can still alter output, so platforms describe this as best-effort. A is wrong because it overstates what the setting controls. C is wrong because temperature does influence selection, not just length. D is wrong because batch processing has no bearing on determinism.

2. **C.** Reconciliation requires intermediate computation and cross-checking, which is exactly what extended reasoning supports. A and B are direct tasks where the extra work buys little. D is a style transformation with low error cost, so the cheaper path is preferable.

3. **B.** A stable prefix makes caching effective, and tolerance for delay makes batch pricing available. A is wrong because a low-latency mode adds no value to an unattended job and a queue is not the main saving. C is wrong because a fallback does not reduce routine cost. D increases cost without a measured need.

4. **B.** Input and output share one window, so reserving output space prevents truncation. A is wrong because billing rates do not determine window allocation. C is wrong because output usage is normally reported. D is wrong because output length is not fixed by the tokenizer.

5. **A.** Cost per successful task includes the retries and review work caused by errors, exposing a false economy. B and D measure speed, not economics. C is a volume figure that says nothing about efficiency.

6. **C.** Caching depends on a reusable, unchanged prefix and a cache entry that has not expired. A is unrelated. B is helpful for cost but not a caching requirement. D is wrong because batch and caching are independent mechanisms.

7. **B.** A mode can start quickly yet finish slowly, and it may exclude features the request relies on. A is a label, not evidence. C and D measure only narrow inputs to the decision and cannot establish responsiveness or compatibility.

8. **B.** A queue smooths bursts and respects rate limits, at the price of waiting. A is wrong because batch delays results on an interactive path. C addresses repeated work, not spikes. D does not prevent rate-limit rejections and may worsen resource hold time.

---

*End of chapter 9.*
