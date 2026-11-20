# Chapter 24 — Prompt Caching and Batch Processing

## Learning objectives

- Describe what a prompt cache stores and why only a leading prefix can be reused.
- List the properties that make a prefix cacheable in practice.
- Compare single, layered, and rolling breakpoint layouts and choose between them.
- Explain how cache writes and cache reads appear in usage and price.
- Submit work through a message batches API and handle per-item results and errors.
- Decide whether a workload belongs on a realtime path or in a batch job.
- Recognize when caching and batching can be combined and when neither helps.

## Key concepts

### What a prompt cache actually stores

When a request arrives, the provider processes the prompt into an internal representation before generating anything. If a later request begins with exactly the same text, that work can be skipped and the stored representation reused. The cache does not remember the answer; it remembers the processed beginning of the request. Only a leading segment can be reused, because generation depends on everything that came before it.

A **breakpoint** marks the end of a segment you want stored. The platform writes that prefix on the first request and reads it on later requests that match byte for byte. Entries live for a limited time, often only a few minutes, so repetition must happen while the entry is still available. Long prefixes are worthwhile; short ones may not clear a minimum length requirement, and the storage premium can outweigh the saving.

| Term | Meaning | Practical consequence |
| --- | --- | --- |
| Prefix | Leading text up to a breakpoint | Must be identical to be reused |
| Breakpoint | Marker placed at the end of a reusable segment | Declared in the request, often on content blocks |
| Cache write | Storing or refreshing a prefix | Small premium over the base input rate |
| Cache read | Reusing a stored prefix | Much lower than the fresh input rate |
| Time to live | Window during which an entry remains valid | Repetition must occur inside the window |

> **Exam note:** Caching saves repeated *input* processing, not generation. A request with a short answer and a long shared document is the ideal shape; a request with a unique two-line prompt is not.

### What makes a prefix cacheable

The leading text must be stable in the strictest sense: the same characters in the same order. A timestamp, a random request identifier, or a rotating greeting placed before the shared material changes the prefix and destroys the hit. Even a harmless-looking change such as reordering two sections produces a different prefix. Model identity matters too, since a cache built for one model cannot serve another.

Reuse must also be frequent enough and fast enough. If each prefix is seen once an hour and entries expire after minutes, every request pays a write premium and no reads. If the shared text is only a few dozen tokens, the saved amount is too small to justify the marker. The best candidates are long policy documents, code repositories, instruction libraries, and example sets that are edited rarely and reused constantly.

Variable content belongs after the last breakpoint. Conversation history is the classic problem: if it is placed before the stable material, the prefix changes on every turn. The usual fix is to put stable instructions and reference text first, then append history, then the newest user message. For a growing conversation, a rolling breakpoint can capture the stable part of the history as well.

> **Common mistake:** Putting a request identifier or current date at the start of a system prompt and then wondering why the cache hit rate is zero. Volatile content belongs in the variable tail.

### Three breakpoint layouts

A single breakpoint is the simplest layout: one stable prefix, then everything variable. It is easy to reason about and sufficient when the whole reusable section changes as a unit. Its weakness is granularity. If a small piece at the start of the prefix changes, the entire cached segment becomes invalid.

Layered breakpoints split the stable material into nested segments. An outer breakpoint captures a short, very stable header; an inner breakpoint captures the header plus a larger document; a third may add a set of examples. Because later prefixes include earlier ones, a change deep in the document only invalidates the deeper entries, leaving the header cache intact. The cost is more markers to maintain and more cache writes when several layers change at once.

A rolling layout is used for conversations. Breakpoints are placed at the end of a stable block of recent turns, and as the conversation grows, the marker moves forward. Previously cached history remains reusable while the newest turns stay in the variable tail. The pattern requires care: moving a breakpoint too often causes extra writes, and truncating history changes the prefix and invalidates the entry.

| Layout | Structure | Use it when | Main benefit | Main risk |
| --- | --- | --- | --- | --- |
| Single | One stable prefix, then variable input | One document shared by all calls | Simplest to implement and debug | One small edit invalidates everything |
| Layered | Nested breakpoints over progressively longer prefixes | Several blocks with different change frequencies | Localizes invalidation to the changed layer | More markers and more write events |
| Rolling | Breakpoint moves along growing conversation history | Multi-turn assistants with a stable early segment | Reuses history across turns | Frequent movement can cause write churn |

### A request with layered breakpoints

The example below places two markers in the system content and leaves the user message variable. The first segment holds a short instruction block that almost never changes. The second segment extends the prefix to include a reference manual that changes occasionally. A third layer for examples could be added in the same way if the examples form a long, stable block.

```json
{
  "model": "balanced-snapshot-2026-09",
  "system": [
    {
      "type": "text",
      "text": "Answer only from the supplied manual. Cite the clause you rely on.",
      "cache_control": {"type": "ephemeral"}
    },
    {
      "type": "text",
      "text": "<<the complete policy manual, byte-identical across calls>>",
      "cache_control": {"type": "ephemeral"}
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "Does the damaged-goods exception change the 30-day return limit?"
    }
  ],
  "max_tokens": 400
}
```

The marker placement is the whole design. If the user message were moved into the system array ahead of the manual, every request would create a new prefix. If a retrieval step inserted passages before the manual, the same thing would happen. Ordering rules should be encoded in one template function so that a future edit cannot quietly break caching.

> **Try it:** Log the cache-read and cache-write token fields for twenty identical-prefix requests. The first should show a write with no reads; later ones within the entry's lifetime should show reads. If reads never appear, print the exact prefix bytes and compare them across calls.

### Cache accounting and price

Cache usage appears in the response's usage block. A write records tokens stored; a read records tokens served from storage. The first request in a series pays the write premium, and subsequent requests pay the much smaller read rate. Because input is often the largest token bucket on document-heavy workloads, a high hit rate can remove most of the input charges.

The hit rate is the share of eligible prefix tokens that were read rather than written or fetched fresh. Track it per route and per prefix version, not just globally. A global average can look healthy while one important route has stopped matching, and the reason is usually a template edit, a model change, or a longer gap between calls than the entry's lifetime.

| Event | Usage field | Relative cost | When it happens |
| --- | --- | --- | --- |
| First request with a new prefix | Cache write | Slightly above fresh input | Entry created or refreshed |
| Later matching request | Cache read | Far below fresh input | Entry still within its lifetime |
| Changed prefix | Fresh input | Base input rate | Bytes differ at any earlier position |
| Expired entry | Cache write | Slightly above fresh input | Gap exceeded the lifetime |

### The message batches API

A batch endpoint accepts a collection of independent requests in one submission and returns results later. Each item carries a caller-supplied identifier, which lets you map results back to source records even when they arrive out of order. The usual workflow is to build a file of request lines, upload it, start the batch, poll a status endpoint or accept a callback, and then download the output file. Per-item failures are reported alongside successes, so the client must separate the two and retry only what failed.

```json
{"custom_id":"doc-0001","params":{"model":"balanced-snapshot-2026-09","messages":[{"role":"user","content":"Summarize record 1."}],"max_tokens":200}}
{"custom_id":"doc-0002","params":{"model":"balanced-snapshot-2026-09","messages":[{"role":"user","content":"Summarize record 2."}],"max_tokens":200}}
```

Batching changes the shape of the system. There is no interactive response to stream, results may take hours, and the job needs durable state so a worker restart does not duplicate work. Stable identifiers and idempotent writes are essential: if a submission is retried after a lost response, the same item must not produce two stored results or two charges. Repeated failures should be routed to a dead-letter path rather than consuming the queue forever.

The reward is a lower unit price and better throughput, not speed. Processing can be delayed under load, so deadlines must be generous and monitored. A batch job also couples many items into one submission, which means a malformed request line can affect the whole file if validation happens too late. Validate each item before submission.

> **Common mistake:** Running a batch workload inside an HTTP request handler to reuse code. That ties up request threads, hides failures, and loses the durability that asynchronous work needs.

### Realtime or batch

The decision is usually made by the consumer of the result, not by the size of the job. If a person or another service is waiting on each answer, the work belongs on the realtime path and batch is disqualified. If results are consumed later — a nightly digest, an archive backfill, an evaluation run — batch fits and usually costs less. Ambiguous cases can be split: return a quick acknowledgement for oversized inputs and complete the detailed work asynchronously.

| Dimension | Realtime path | Batch path |
| --- | --- | --- |
| Consumer | Person or dependent service waiting | Scheduled job or later review |
| Latency target | Seconds | Hours, with a monitored deadline |
| Pricing | Standard synchronous rates | Usually discounted |
| Streaming | Available and often useful | Not applicable |
| Failure handling | Retry the single call with backoff | Per-item errors, dead-letter path, idempotency |
| Caching | Useful for a stable shared prefix | Also useful; the two mechanisms compose |

Caching and batching solve different problems and can be applied together. A nightly job can reuse a cached manual prefix and pay batch rates for the same tokens. An interactive assistant can cache its instructions but cannot use batch. A workload of unique short prompts with no repeated prefix benefits from neither, which is a useful finding: the remedy is a smaller tier or shorter prompts, not a discount that never applies.

> **Exam note:** When a scenario names a deadline, eliminate batch immediately. When it names an unchanged long prefix, caching is the matching lever. These two facts often determine the answer on their own.

## Practice lab

**Goal.** Measure a cache hit and compare a synchronous route with a batch route for the same work.

**Steps.**

1. Prepare a stable reference block of at least a few thousand tokens and a template that places it before a variable question.
2. Send five requests in quick succession with the same block and different final questions, logging cache-write and cache-read tokens.
3. Edit one character in the middle of the block and repeat, noting whether the cached entries are still read.
4. Add a second breakpoint so that a short header and the longer block are cached separately, then edit only the longer block.
5. Submit ten independent items through a batch endpoint with unique custom identifiers, poll until completion, and inspect both successes and deliberate failures.

**Expected observation.** The first request writes the prefix and later requests read it. A one-character edit breaks the deeper prefix, while the layered header survives if it was cached separately. Batch results arrive together rather than individually, carry the custom identifiers, and include per-item errors that can be retried independently.

## Worked scenario

A compliance team labels 40,000 archived messages each quarter for a weekly report, so nobody waits for an individual result. Every request begins with the same long rulebook and worked examples, then one unique message. The current design calls a capable tier synchronously and sends the rulebook fresh each time.

The consumer is a scheduled report, so latency is flexible and batch pricing available. The rulebook and examples are byte-identical across all calls, making them a strong caching candidate. Output is one label, so long generation and reasoning are unnecessary.

The redesigned request puts the rulebook and examples ahead of the message with layered breakpoints: one after a short scope statement, another after the full reference block. Revising examples then invalidates only the deeper prefix. A small run confirms cache reads on later calls.

The same items go into a batch file with identifiers tied to archive keys. Results are written idempotently, failures go to a review queue with bounded retries, and a weekly sample is checked for drift. Because this no longer runs inside a request handler, an interrupted worker can restart safely.

The final design keeps one synchronous route for the rare case where an investigator requests an immediate single review. That route reuses the same cached prefix but pays synchronous rates. Sharing the template function between the two routes guarantees that the prefix stays identical; only the submission mechanism differs.

> **Exam note:** The reusable reasoning is to name the consumer first. A scheduled consumer unlocks batch; a stable long prefix unlocks caching; the two are independent and often appear together in a correct answer.

## Common mistakes

- Placing timestamps or identifiers at the start of a cached prefix.
- Using a prefix so short that the saving never covers the write premium.
- Assuming cached entries last indefinitely and spacing reuse far beyond the lifetime.
- Expecting batch results immediately or streaming from a batch job.
- Omitting stable custom identifiers and losing the mapping to source records.
- Retrying an entire batch after a lost response without idempotent writes.
- Treating per-item failures as a reason to discard successful results.
- Assuming caching and batching are mutually exclusive.
- Using batch processing on a path where a user is waiting.

## Chapter summary

- A prompt cache stores a processed leading prefix, not the answer to the request.
- Cacheable prefixes are byte-identical, long enough to matter, reused inside the entry lifetime, and tied to one model.
- Single breakpoints are simplest, layered breakpoints localize invalidation, and rolling breakpoints reuse conversation history.
- Writes cost slightly more than fresh input; reads cost much less, so hit rate is the key metric.
- A batch API takes a file of independent items, returns results later, and reports failures per item.
- Realtime paths are chosen by a waiting consumer; batch paths suit scheduled or deferred work.
- Caching and batching are independent and compose when the workload has both a stable prefix and flexible timing.

## Checkpoint questions

1. What does a prompt cache store?

A. The final answer to a previous request

B. A processed leading prefix that can be reused

C. A copy of the model's weights on the client

D. The output of every tool call in the conversation

2. Which change is most likely to destroy a cache hit?

A. Adding a new question after the last breakpoint

B. Increasing the maximum output limit

C. Inserting a current timestamp at the start of the system prompt

D. Running the request during a busy period

3. Why use layered breakpoints instead of one?

A. To allow several models to share one cache entry

B. To limit invalidation when only a deeper block changes

C. To remove the need for a cache write

D. To make batch processing unnecessary

4. A conversation grows by two turns each exchange. Which layout is designed to reuse the stable part of the history?

A. Single breakpoint on the instruction only

B. Rolling breakpoint moved along the history

C. No breakpoint, since conversations cannot be cached

D. A breakpoint on the newest user message

5. Which usage field indicates that a stored prefix was reused?

A. Cache write tokens

B. Fresh input tokens

C. Cache read tokens

D. Output tokens

6. Which request is the best candidate for a batch endpoint?

A. A chat reply shown word by word to a user

B. A nightly label run over 30,000 archived records

C. A checkout validation with a two-second ceiling

D. A live translation with a streaming response

### Answers and rationale

1. **B.** The stored object is the processed leading text. A is wrong because answers are not reused. C is wrong because model weights are not cached in the client. D is wrong because tool results are ordinary content, not the cached prefix itself.

2. **C.** A timestamp at the front changes the prefix bytes on every call. A is wrong because the variable tail is expected to differ. B is wrong because the output limit is not part of the prefix. D is wrong because timing affects availability, not prefix identity.

3. **B.** Nested markers keep earlier segments valid when a deeper one changes. A is wrong because caches are model-specific. C is wrong because a new prefix still needs a write. D is wrong because batching addresses timing, not invalidation.

4. **B.** A rolling layout moves the marker forward as history grows. A is wrong because it ignores reusable history. C is wrong because parts of a conversation can be cached. D is wrong because the newest message is variable and should sit after the marker.

5. **C.** Cache reads report tokens served from storage. A reports storage events. B reports uncached input. D reports generated tokens.

6. **B.** A scheduled job over many independent records has no waiting consumer. A, C, and D all describe interactive paths where batch delays would violate the requirement.

---

*End of chapter 24.*
