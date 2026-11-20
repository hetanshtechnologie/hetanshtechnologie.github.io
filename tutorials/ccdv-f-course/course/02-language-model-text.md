# Chapter 2 — How a Language Model Produces Text

## Learning objectives

- Explain generation as repeated next-token prediction from a probability distribution.
- Treat the context window as one shared hard budget and reserve space for instructions, history, data, tools, thinking, and the answer.
- Describe how sampling controls shape output and why identical prompts can differ.
- Distinguish extended thinking from adaptive thinking and explain what a thinking block is.
- Use effort and fast-mode controls for their distinct purposes.
- Read usage metadata and write assertions that tolerate legitimate variation.

## Key concepts

### One token at a time

The most useful picture of a language model is not a librarian retrieving an answer but a prediction machine working on small pieces of text called tokens. A token may be a short word, a fragment of a longer word, a punctuation mark, or a space before a word. Your prompt is converted into token identifiers; the model receives a numbered sequence, not letters.

Given that sequence, the model computes a probability distribution over its vocabulary: a ranked guess about what comes next. One token is drawn, appended, and the calculation runs again. The paragraph you read is thousands of such decisions. No step consults a table of correct sentences; each guess is conditioned on everything before it. That is why a small wording change can ripple through the rest of the answer.

The mechanics explain several quirks. Output arrives incrementally because generation is sequential, so streaming simply forwards each new piece. Character-level tasks are awkward because the processing unit is a chunk of characters, not a character. Spelling a word backwards or counting a letter can fail even in a capable model. When a requirement depends on exact string manipulation, put that step in ordinary code and let the model call it.

Output length is also a design decision. Each token requires another pass, so verbose answers cost more, occupy more of the window, and delay the user. The right length is the shortest that satisfies the task's acceptance criteria.

> **Exam note:** For exact counting, reversal, or character-level accuracy, the strong answer moves that step into a deterministic tool. The model predicts tokens; it is not a string utility.

### The context window is one hard budget

The context window is the total tokens the model can consider for one request. Input and output do not have separate allowances. Instructions, tool definitions, history, retrieved documents, tool results, thinking blocks, and the answer all compete for the same space. Fill it with source material and the response is cut off mid-thought.

Budget each region before writing code. Instructions are small and stable, which also makes them reusable across calls. History grows without bound unless trimmed or summarized. Retrieved documents are the largest, most variable region and deserve the tightest cap. Tool definitions are fixed overhead on every call; exposing twenty when three suffice means paying for seventeen unused definitions. Tool results can be surprisingly verbose.

The most common omission is the response reserve. Decide how many tokens the answer may take, subtract that from the window, and treat the remainder as the input ceiling. Thinking tokens complicate this because they are generated before visible text and count toward the same output cap. A maximum sized for a short answer with no thinking can be exhausted by reasoning alone.

| Region | Example allowance in a 16,000-token window | Controlled by | Failure if unchecked |
| --- | --- | --- | --- |
| System and task instructions | 1,200 | Prompt author | Less room for evidence; unstable reusable prefix |
| Tool definitions | 800 | Tool designer | Fixed overhead on every call |
| Conversation history | 2,000 | Session logic | Old turns crowd out current evidence |
| Retrieved documents | 6,000 | Retrieval settings | Relevant passage lost in padding |
| Tool results | 1,500 | Output contract | Noisy results dominate the window |
| Thinking reserve | 2,000 | Model configuration | Reasoning consumes the answer's space |
| Response reserve | 2,000 | Maximum output setting | Truncated or incomplete answers |
| Safety margin | 500 | Engineering convention | Overflow when estimates are wrong |

The allowances sum exactly to the window; a budget that does not add up is a wish. Pre-call counting is approximate because tokenization depends on exact characters, so keep the margin and use the matching tokenizer where available. After the call, feed reported usage back to calibrate estimates. Order matters too: durable rules near the beginning, the immediate task near the end, reference material between, because long middles are easier to overlook.

> **Common mistake:** Filling the window with documents and wondering why the answer is truncated. Reserve output space before assembling the input.

### Sampling and the sources of variation

At each step the model produces probabilities, not a command. A sampler chooses the token. At one extreme it always takes the most likely token, often called greedy or temperature-zero behavior. At the other it draws more freely, producing varied prose. Temperature rescales the distribution before selection; top-p or nucleus sampling limits the draw to the smallest set whose combined probability reaches a threshold.

Variation has two independent sources. The sampler is one: when several tokens are plausible, a randomized draw can choose differently across runs. The serving environment is the other: models run on fleets, routing shifts, and providers improve backends. A platform may therefore describe a low-randomness setting as best-effort reproducibility rather than a guarantee, because model version and serving path are outside your control.

| Control | What it changes | Typical use | What it does not do |
| --- | --- | --- | --- |
| Greedy or temperature zero | Selects the most likely token | Extraction and classification | Freeze version or infrastructure |
| Higher temperature | Flattens the distribution | Brainstorming, varied phrasing | Improve factual accuracy |
| Top-p nucleus | Restricts the probability mass | Balance variety and coherence | Guarantee a fixed token set |
| Maximum output tokens | Caps generated tokens | Length and cost limits | Tell the model what to include |
| Version pinning | Fixes the serving snapshot | Reproducible evaluations | Remove sampler randomness |

A test that asserts byte-identical prose will be flaky by design. Assert properties instead: valid JSON, a required field, a category from an allowed set, a citation to supplied text, a length bound. For truly stable output, reduce randomness, fix the prompt, and pin the model where possible. Design for variation rather than assuming it vanished.

> **Exam note:** Lowering randomness narrows one source of change; pinning narrows another. Neither turns a probabilistic generator into a deterministic function.

### Thinking as a visible content block

Some models spend extra computation before answering. In the manual form called extended thinking, a request sets a thinking budget and the response contains thinking content blocks ahead of text blocks. The budget is a target, not a promise; the hard ceiling remains the maximum output setting, and thinking tokens are billed as output. A minimum applies, and the budget must leave room for the visible answer.

Adaptive thinking changes who decides. The model evaluates each request, determines whether thinking is useful, and chooses its depth. A simple factual turn may produce no thinking block; a multi-step diagnostic turn may produce a long one. Thinking can also appear between tool calls so the model can examine a result before choosing the next action. Because a turn can legitimately have no block, code must never assume one is present.

A thinking block is generated content separated from the canonical answer. It may carry a signature to pass back unchanged on later turns, and its visible summary can be omitted on some models. The text shown is a condensed summary, not a raw internal transcript. Treat it as a signal about how much work occurred, not a full explanation.

Thinking pays off when a careful person would pause, write intermediate values, and check cases: reconciling figures, applying conflicting policies, diagnosing from weak signals. It wastes time on direct lookup, simple classification, and short rewrites. Measure the choice on a small representative set rather than trusting intuition.

> **Try it:** Run twenty examples twice, changing only whether thinking is enabled. Record accuracy and ninety-fifth-percentile latency. Unchanged accuracy with doubled latency is a measured decision.

### Effort, budgets, and fast mode

Effort and thinking are separate controls. Thinking decides whether and how reasoning blocks occur; effort sets how much work the model puts into the whole response, including text, tool calls, and thinking. It belongs in the output configuration, not inside the thinking object, and ranges from low through medium and high to extended and maximum levels on supporting models. Effort is soft guidance, not a token count.

So to cut cost on a thinking-enabled workload, lower effort first, because it scales the entire response down. For a hard ceiling, change maximum output tokens. If responses keep ending with a truncation reason, either give more room or ask for less work; which is right depends on whether the missing reasoning was needed. Lower effort also yields terser tool calls, useful in agent loops where each call consumes budget.

Fast mode addresses delivery, not depth. It runs the same model on a faster inference configuration, increasing output tokens per second rather than reducing time to the first token. It is a paid acceleration, not a smaller model or a reasoning setting. Long streamed answers benefit most; a short answer slow to start is not rescued by faster tokens. Some modes restrict features or require explicit opt-in, so check eligibility before assuming the benefit.

| Control | Axis changed | Hard or soft | Best reason to use it | Main trap |
| --- | --- | --- | --- | --- |
| Thinking configuration | Whether reasoning blocks occur | Mode with budget targets | Tasks rewarding intermediate checks | Assuming a block each turn |
| Effort level | Work across the response | Soft guidance | Matching depth to difficulty | Treating it as a token cap |
| Maximum output tokens | Generated token ceiling | Hard limit | Cost and length bounds | Setting it too low for thinking plus text |
| Fast mode | Token delivery speed | Option with restrictions | Long streamed answers | Expecting faster first tokens |

A pseudocode sketch makes the loop concrete; it is for reading, not pasting into a client.

```python
# Illustrative pseudocode: one response, token by token.
def generate(prompt_tokens, settings, max_output):
    window = settings.context_window
    if len(prompt_tokens) + settings.think_reserve + max_output > window:
        raise BudgetError("reserve room for thinking and the answer")

    sequence = list(prompt_tokens)
    for _ in range(max_output):
        distribution = model_next_token(sequence)
        candidate = sample(distribution,
                           temperature=settings.temperature,
                           top_p=settings.top_p)
        if candidate == END_OF_TURN:
            break
        sequence.append(candidate)
        yield decode(candidate)   # streaming forwards each piece
```

The budget check comes first, sampling is an explicit step, and yielding each token is what makes streaming possible. Real clients add retries, signatures, and usage accounting around the same shape.

> **Common mistake:** Expecting fast mode to make a hard task easier. It changes delivery speed, not reasoning depth or context budget.

### Usage metadata closes the loop

Responses normally carry usage figures: input tokens processed, output tokens generated, and often a breakdown separating thinking tokens from visible text. These numbers turn the budget table from a plan into a measurement. Compare the tokenizer estimate made before the call with the reported input count; a persistent gap means the estimation method needs adjustment. Compare the response reserve with reported output; frequent truncation reasons mean the reserve was too small or effort was too high for that task.

```json
{
  "usage": {
    "input_tokens": 8120,
    "output_tokens": 1730,
    "output_tokens_details": { "thinking_tokens": 940 }
  },
  "stop_reason": "end_turn"
}
```

In this example more than half the generated tokens were reasoning rather than visible answer, yet all of them counted against the output cap and the bill. A team that budgeted only for a four-hundred-word reply would be surprised by the cost of the same reply under adaptive thinking. The remedy is not to abandon thinking but to record the split, set the cap for thinking plus text, and review the numbers by task type. A classification route might show almost no thinking, while a policy-conflict route shows a large share; one global setting then looks obviously wrong.

Usage data also supports honest comparisons. When two prompt versions are evaluated, record the version alongside the token counts, because a quality gain that triples output is a different trade from one that costs nothing. When latency is reported, measure both time to first token and time to completion; a mode that opens quickly can still finish slowly. Together these fields turn a vague claim such as "this prompt is cheaper" into a checkable statement about tokens, cost, and tail latency.

> **Exam note:** If a scenario gives you a usage report with a high thinking-token share and a truncated answer, the two facts belong together. Raise the output ceiling or lower effort; do not blame the prompt alone.

## Practice lab

**Goal:** Observe sampling variation and verify a token budget.

**Steps:**

1. Create a scratch branch and a file `token_notes.md`.
2. Write a fixed prompt and a made-up next-token distribution: three candidates at 0.6, 0.3, and 0.1.
3. Simulate ten draws by hand or with a short random script, recording each chosen token.
4. Compare the sequences; they share a distribution but will differ.
5. Fill the eight-row budget table for a 16,000-token window and confirm the sum.
6. Cut the response reserve by 500 and choose which region to shrink to keep the total valid.

**Expected observation:** Identical inputs plus a random sampler yield different sequences, while a greedy rule would not. The budget sums exactly, and moving space forces a conscious trade — the same trade scenario items ask about.

## Worked scenario

A support application answers questions from a 9,000-token policy manual. It sends the whole manual, the last thirty turns, and a 4,000-token maximum output. Users report truncated answers and inconsistent wording for the same rule. The team proposes a larger model.

The symptoms are different. Truncation is a budget problem; variation is a sampling and versioning problem. A larger model addresses neither and costs more, so the proposal fails the constraint check.

They rebuild the budget: cap and rank manual sections, reduce history to four turns plus a summary, declare a thinking reserve only for policy conflicts, set the response reserve from the answer contract, and keep a safety margin. For variation they lower randomness, pin the version, and replace string equality with checks for the rule identifier, a citation, and a length bound. A small ambiguous set keeps flexible wording.

**Resolution:** Reserve output space and fix test design before changing models. The larger model would have added cost without touching either cause.

## Common mistakes

- Believing the model retrieves answers rather than predicting tokens.
- Treating input and output as separate allowances.
- Forgetting the response reserve before filling the window.
- Assuming a thinking block exists on every turn.
- Passing effort inside the thinking configuration.
- Treating effort as a hard cap instead of soft guidance.
- Expecting fast mode to change reasoning or first-token speed.
- Asserting byte-identical prose in tests.

## Chapter summary

- Generation is repeated next-token prediction conditioned on the preceding sequence.
- Token boundaries explain poor character-level counting; use code for exact work.
- The window is shared and must include reserves for thinking and the answer.
- Sampling and serving changes both create variation; reproducibility is best-effort.
- Extended thinking uses a budget and emits blocks; adaptive thinking is decided per request.
- Effort is soft guidance; maximum output tokens are the hard ceiling.
- Fast mode increases tokens per second, not depth or first-token speed.
- Assert properties such as schema, fields, and citations rather than exact wording.

## Checkpoint questions

1. Why is exact character counting unreliable for a language model?

A. Because it cannot read numbers.
B. Because it processes tokens, chunks of characters, rather than characters.
C. Because counting needs higher temperature.
D. Because thinking blocks replace text.

2. A full document leaves no room for the answer. What is the most direct fix?

A. Raise temperature.
B. Reserve output space and rank or trim the input.
C. Enable fast mode.
D. Raise effort.

3. Which statement about adaptive thinking is accurate?

A. Every turn must begin with a block.
B. The model decides per request, so a turn may have no block.
C. It is an effort level.
D. It removes the output ceiling.

4. Which control gives a strict per-request spending ceiling?

A. Effort, because it is a hard budget.
B. The thinking summary display.
C. Maximum output tokens, because it is a hard cap.
D. Fast mode, because it costs less.

5. What does fast mode primarily change?

A. Reasoning depth.
B. Vocabulary size.
C. The speed at which output tokens arrive.
D. Input token price only.

6. Which assertion suits extraction of a policy identifier from supplied text?

A. Exact match to a memorized sentence.
B. A valid identifier from the allowed set plus a citation to the text.
C. At least two thousand tokens.
D. A thinking block must appear.

7. A usage report shows 940 thinking tokens out of 1,730 generated tokens and a truncated answer. What is the most direct response?

A. Increase temperature so the answer finishes sooner.
B. Raise the output ceiling or lower effort so thinking plus text fits.
C. Remove all citations from the prompt.
D. Switch to batch processing for this interactive request.

### Answers and rationale

1. **B.** Tokens are chunks, so character operations misalign with processing steps. A is false; models handle numeric text. C confuses sampling with counting. D is unrelated.

2. **B.** Input and output share one window, so reserve space and reduce or rank sources. A changes wording only. C changes delivery speed. D may consume more of the cap.

3. **B.** Adaptive thinking delegates the decision to each request, so absence is valid. A is the opposite. C confuses a mode with effort. D is false because the cap remains.

4. **C.** Maximum output is a hard ceiling; effort is soft guidance. A reverses that. B affects display, not generation. D is a premium acceleration, not a discount.

5. **C.** Fast mode uses a quicker inference configuration for the same model. A is governed by thinking and effort. B is unrelated. D misstates pricing.

6. **B.** Property checks accept varied wording while verifying the decision and grounding. A is brittle. C imposes irrelevant length. D assumes a block that may be absent.

7. **B.** Thinking and text share the output cap, so either more room or less work addresses truncation. A changes selection, not length allocation. C weakens grounding without fixing the cap. D adds delay on an interactive path.

---

*End of chapter 2.*
