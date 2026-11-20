# Chapter 4 — Messages, Tools, Streaming, and Advanced Request Features

## Learning objectives

- Describe the message model and the job of each role, and assemble a request with correct role ordering.
- Write system instructions that set durable behavior without relying on them for facts that change.
- Explain a tool definition and trace the full tool-call and tool-result round trip, including who executes the tool.
- Handle a streamed response event by event, and explain why streaming changes retry and error handling.
- Send images and mixed-format content, and state when each format is appropriate.
- Decide when extended thinking is worth its latency and cost, and when it is not.
- Explain what prompt caching stores, what invalidates it, and how to decide whether to use it.
- Use batch processing, a vendor-neutral interface, and rate-limit-aware retries in a high-volume design.

## Key concepts

### The message model and the job of each role

Almost every modern assistant API expresses a conversation as an ordered list of messages. Each message has a role and some content. The model reads the list from beginning to end and produces the next message. That simple idea has a consequence that shapes everything else: the API is stateless. It does not remember your previous call. To have a conversation, the client sends the whole history each time, plus the new turn.

The roles divide responsibility. A system-level instruction sets the frame for the whole conversation: the assistant's purpose, tone, boundaries, and the rules it should follow. User messages carry input from the person or upstream process. Assistant messages are prior model outputs, included so the model can see what it already said. Tool-result messages carry the output of a function the application executed on the model's behalf. Some APIs add a distinct developer or instruction tier between system and user content, but the principle is the same: guidance from the application outranks content from the end user.

| Role | Who supplies it | What it carries | Ordering and notes |
| --- | --- | --- | --- |
| System or developer instruction | Application | Standing rules, persona, constraints, output format | Placed first; applies to the whole conversation |
| User | End user or upstream process | The current question, task, or data | May repeat across turns; untrusted input |
| Assistant | Model, replayed by the client | Earlier answers and earlier tool calls | Included to preserve context across turns |
| Tool result | Application, after running a tool | The returned value of a function call | Follows an assistant message containing a tool call |

Two practical rules follow. First, role accuracy matters. A user message smuggled in as a system message may get more authority than it deserves and creates an injection risk; a tool result labelled as assistant text confuses the model about what it knows. Second, because the entire list is resent on every turn, unbounded histories grow in token cost and eventually exceed the context window. Real systems trim, summarize, or retrieve earlier context rather than replaying every word forever.

A minimal request and response make the structure concrete. The response echoes the model's message plus metadata such as identifiers, usage counts, and a stop reason that tells you why generation ended.

```json
{
  "model": "general-purpose-latest",
  "max_tokens": 512,
  "messages": [
    {
      "role": "system",
      "content": "You classify support messages. Reply only with the agreed JSON shape."
    },
    {
      "role": "user",
      "content": "I was charged twice for my subscription this month."
    }
  ]
}
```

```json
{
  "id": "msg_01X",
  "type": "message",
  "role": "assistant",
  "model": "general-purpose-latest",
  "stop_reason": "end_turn",
  "content": [
    {
      "type": "text",
      "text": "{\"intent\": \"billing\", \"urgency\": 4}"
    }
  ],
  "usage": {
    "input_tokens": 46,
    "output_tokens": 12
  }
}
```

Notice that `stop_reason` is operationally useful. A value meaning the model finished normally differs from one meaning it hit the token cap. If the cap was hit, the output may be truncated, and a classifier returning half a JSON object should be treated as a failure rather than parsed hopefully.

> **Exam note:** Because the API is stateless, "continue the conversation" always means "resend the history." If a question asks why a second turn lost context, the answer is usually that the client failed to include the earlier messages.

### System instructions that set behavior

The system instruction is the application's chance to set the rules before any user text arrives. It is the right place for durable behavior: the assistant's purpose, the tone to use, what it must never do, the format it should return, and how it should handle uncertainty. A good instruction is specific about the decision boundaries that matter and short enough that it survives being repeated on every call.

What does not belong there is volatile fact. If the instruction says the support desk closes at a particular hour and that hour changes, every request now carries a stale rule, and updating it means redeploying or reconfiguring the prompt. Facts that change belong in retrieved data or in a tool the model can call. The instruction should instead say how to use such facts, for example: "Answer policy questions only from the supplied policy passages; if none applies, say so." That phrasing stays true when the underlying policy changes.

Instruction design also interacts with security. User input must never be able to rewrite the instruction. Patterns that help include placing user content in clearly delimited sections, telling the model to treat those sections as data rather than commands, validating outputs against a schema, and keeping powerful tools behind an application-level authorization check rather than trusting the model to decide alone. No instruction is a complete defense; it is one layer among several.

Because the instruction is resent on every turn, its token cost multiplies across a conversation and across all traffic. A verbose instruction can be the largest single line item in a cost report. Trim it the way you would trim any repeated payload, and measure the effect with an evaluation set before and after.

> **Common mistake:** Putting a long list of changing facts into the system instruction, then being surprised when answers go stale and every request grows expensive. Instructions are for rules; retrieved data is for facts.

### Tools and the call-and-result round trip

A tool definition tells the model that a function exists, what it does, and what arguments it accepts. The model does not execute anything. It decides that a tool would help and emits a structured request to call it; the application runs the function and returns the result as a new message; the model then continues using that result. Understanding who executes what is the single most important idea in tool use.

The round trip has a fixed shape. You send the conversation plus a set of tool definitions. The model either answers normally or returns a tool call containing a name and arguments. Your application validates the arguments, checks authorization, executes the function, and appends a tool-result message. You then call the model again with the updated history. The model uses the result to produce the final answer or to request another tool. A loop guard is essential, because a model can otherwise request tools indefinitely.

```json
{
  "name": "lookup_order",
  "description": "Return the status and total for a customer order number.",
  "input_schema": {
    "type": "object",
    "properties": {
      "order_id": {
        "type": "string",
        "description": "The customer's order identifier."
      }
    },
    "required": ["order_id"],
    "additionalProperties": false
  }
}
```

```json
{
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_01A",
      "name": "lookup_order",
      "input": { "order_id": "48391" }
    }
  ],
  "stop_reason": "tool_use"
}
```

The application then runs the lookup and appends the result, keyed by the same call identifier:

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_01A",
      "content": "{\"status\": \"shipped\", \"total\": 42.50}"
    }
  ]
}
```

Several design rules matter. Descriptions are part of the prompt the model reads, so a vague description produces wrong calls; write them as precise contracts. Validate arguments before execution, because the model can invent values. Treat tools as privileged capabilities: the application, not the model, decides whether the caller is allowed to use them. Keep tool results small and relevant, since they consume context and cost. And plan for tool failure: return an error in the result channel so the model can recover, rather than crashing the loop.

> **Exam note:** If a scenario asks what the system should do after the model emits a tool call, the correct sequence is validate arguments, check permission, execute the function in your own code, append the result, and call the model again. The model never runs the function itself.

### Streaming and event handling

In a non-streaming call the client waits and receives one complete response. In a streaming call the response arrives as a sequence of events over a long-lived channel. Streaming does not make the model faster in total; it makes the first useful output arrive sooner, which is what users perceive as responsiveness. It also lets a UI render progressively and lets a client start acting before generation finishes.

A stream is a sequence of typed events. Some announce the start of the message or a content block, some carry incremental text fragments, and some mark the end. There may also be heartbeat events to keep the connection alive and error events when something fails mid-stream. A robust client processes events in order, accumulates fragments into a buffer, and treats the end event as the point at which the complete message is known.

| Event | Meaning | Typical client action |
| --- | --- | --- |
| Message start | A new response has begun; includes an identifier and initial metadata | Create a fresh buffer and record the identifier |
| Content block start | A new block of content is beginning, such as text or a tool call | Initialize the appropriate accumulator for the block |
| Content delta | An incremental fragment of text or partial tool arguments | Append the fragment to the current buffer and render if appropriate |
| Content block stop | The current block is complete | Validate and finalize that block |
| Message delta | Updated message-level metadata, such as a stop reason | Record the terminating condition |
| Message stop | The response is complete | Finalize usage totals and persist the result |
| Ping or heartbeat | Keep-alive signal with no content | Ignore for display; use to detect a dead connection |
| Error | The stream failed before completion | Log the partial output, apply the error policy, and decide whether to retry |

Streaming complicates three things that were simpler in the non-streaming case. Error handling must account for partial output: if the connection drops after several tokens, restarting from the beginning can duplicate text the user already saw. Usage accounting may only be complete in the final event, so cost dashboards must wait for the end of the stream. And retries must be deliberate: a failed stream is not safely replayable unless the client can discard what it already displayed or resume from a recorded position.

A practical client keeps a small state machine and flushes the accumulated text once the stream ends.

```python
def consume_stream(event_source):
    text = []
    stop_reason = None
    for event in event_source:
        if event.type == "content_block_delta":
            text.append(event.delta.text)
        elif event.type == "message_delta":
            stop_reason = event.delta.stop_reason
        elif event.type == "error":
            raise StreamFailed(event.message)
        elif event.type == "message_stop":
            break
    return "".join(text), stop_reason
```

> **Try it:** In a scratch project, print each event type as it arrives rather than only the text. Seeing the order of start, delta, stop, and final events makes the state machine obvious and prevents the classic bug of treating a partial fragment as a complete answer.

### Images and multi-format content

A message does not have to be plain text. Many APIs accept content as a list of blocks, so a single user message can interleave text with one or more images. This is useful when the question depends on visual evidence: reading a screenshot, checking a form, identifying a product from a photo, or interpreting a chart. The model is given the image alongside the text, and the answer can refer to both.

When you include an image, think about three things. Source format and transport: images are commonly passed as a data reference embedded in the request or as a URL the service can fetch, and only certain formats and sizes are accepted. Resolution and detail: a tiny or heavily compressed image may make the question unanswerable, while a huge image wastes bandwidth and context capacity. Relevance: every image competes for space with the rest of the conversation, so crop to the region that matters when possible.

Use images when the information is genuinely visual. A photograph of a damaged item, a screenshot of an error dialog, or a handwritten note are good cases. If the same information is already available as text, send the text: it is cheaper, more reliable, and easier to check. For documents, consider extracting text first, and use images only for layout-dependent meaning such as tables or diagrams.

Mixed-format content also raises data-handling questions. Images may contain personal data, and embedding them in requests means they pass through the provider and appear in logs unless those are controlled. Decide retention and redaction rules before enabling image upload, and strip metadata such as location tags when it is not needed.

> **Common mistake:** Sending a full-resolution photo when a crop would do, then wondering why latency and cost rose. Image tokens are part of the request budget, exactly like text.

### Extended thinking and when it helps

Some requests benefit from letting the model work through intermediate reasoning before it answers. This is often exposed as an extended-thinking or reasoning option that allocates extra computation and produces a longer internal trace, with only a concise final answer returned to the caller. The value is real for problems where naive first answers are usually wrong: multi-step arithmetic, constraints that must all be satisfied, debugging a subtle contradiction, or planning with several interacting dependencies.

The trade-off is equally real. Extended thinking adds latency and token cost, and it does not help tasks that are essentially retrieval or simple classification. If the answer is a lookup in a supplied passage or a short label choice, extra deliberation mostly burns budget. It can also produce longer outputs that are harder to fit into a strict schema, so the final answer usually needs validation regardless.

Decide with a short test rather than a rule of thumb. Build a small set of representative hard cases and a set of routine cases. Measure accuracy, latency, and cost with the option off and on. Adopt it only where the accuracy gain justifies the extra resources, and consider routing: use a fast path for routine inputs and enable deliberation only when a classifier or a confidence signal flags difficulty. That keeps the average cost low while protecting the cases that need care.

> **Exam note:** Questions about extended thinking usually test judgment, not mechanics. The right answer enables it for genuinely hard reasoning and avoids it for simple, high-volume, or latency-sensitive work.

### Prompt caching and what actually gets cached

A large share of a typical request is repeated. The system instruction, tool definitions, and a long reference document are identical across thousands of calls. Prompt caching is designed for exactly this: the service stores a reusable representation of a stable prefix, so later requests that begin with the same bytes can reuse it instead of reprocessing it. The benefit is lower latency and lower cost for the repeated portion; the variable tail of each request is still processed normally.

What gets cached is a prefix, measured in tokens, up to a supported boundary. This matters enormously. If you change one character near the beginning of the cached region, everything from that point onward has a new cache key and must be recomputed. That is why stable, unchanging material goes first, and variable material goes last. A common ordering is: system instruction, tool definitions, large reference or few-shot block, then the specific user turn. Anything that changes per request—timestamps, user identifiers, random examples—must stay out of the cached prefix.

Caching also has a lifetime. Entries expire after a period of inactivity, and a write may take effect only after a short delay. Providers expose usage fields that report how many tokens were a cache hit versus a miss, so you can measure whether your ordering is working. A design that claims to use caching but shows zero cache hits is a design that has accidentally put variable content in the prefix.

| Situation | Cache it? | Why |
| --- | --- | --- |
| Long, stable system instruction reused across all calls | Yes | Identical prefix; high hit rate and clear savings |
| Tool definitions that rarely change | Yes | They sit at the start of the request and are reused widely |
| A large policy document shared by many users | Yes, with a version tag in the key | Stable content; a new version intentionally starts a new cache entry |
| Many few-shot examples fixed across a task | Yes | Repeated tokens with unchanged ordering |
| The current user's question | No | Unique per request; placing it in the prefix would prevent hits |
| A timestamp or request identifier near the start | No | Changes every call and invalidates the entire cached prefix |
| A short prompt with almost no repeated text | Usually no | Overhead and minimum token thresholds can erase the benefit |
| Content that must never be retained by the provider | No | Caching stores a representation; check the data-handling rules first |

Cache-aware design is mostly an ordering discipline. Keep the stable region byte-for-byte identical, place it first, put version markers where they belong, and verify hits in the usage metadata. When a prompt change is needed, change it deliberately and accept the one-time miss wave as the cost of a behavior change.

### Batch processing

A batch endpoint accepts many independent requests in one submission and returns their results later, usually at a reduced unit price because the provider can schedule the work efficiently. Batching is the right tool when there is no user waiting for each individual answer: classifying an archive, generating embeddings, tagging documents, or producing evaluation results overnight.

Batch changes the shape of the system. Instead of one call per event, you assemble a file or list of requests, submit it, receive a batch identifier, and poll or receive a callback when processing completes. Failures are reported per item, so the application needs logic that separates successful results from rejected ones and retries only the failures. Because results arrive out of order, each request should carry a stable custom identifier that lets you map results back to source records.

The main constraints are latency and coupling. A batch is not suitable for an interactive question, and adding one to a latency-sensitive path defeats its purpose. Batches can also take much longer than expected under load, so deadlines must be generous and monitored. The reward is cost and throughput, not speed.

### One interface behind many vendors

Real systems rarely stay tied to a single provider. Procurement, resilience, regional rules, or model capability can all push a team toward more than one source. Calling each provider directly scatters vendor-specific details through the application: different message shapes, different tool syntax, different streaming events, different error codes. That scattering makes switching costly and testing painful.

A thin internal abstraction solves most of this. Define your own domain objects for a conversation, a tool, and a result, then write a small adapter for each provider that translates between your objects and its wire format. Normalize the things that vary: role names, stop reasons, usage fields, and error categories. Keep the vocabulary of your domain about the task, not about a particular vendor. A classifier should ask for a structured label, not know which vendor's parameter name enables JSON output.

The abstraction should be deliberately leaky in a few places. Capabilities differ: one provider may support image input, another extended thinking, a third larger caches. Pretend they are all identical and you will either hide useful features or write code that fails at runtime. Represent capabilities explicitly, let callers request them, and give adapters a clear way to say "unsupported." A capability check at runtime is better than a surprise.

Testing improves as a side effect. With adapters, you can record one canonical conversation and replay it through each provider in a regression suite. You can also route a fraction of traffic to a second provider as a resilience exercise, comparing quality and cost before making a larger commitment.

> **Exam note:** The principle tested here is separation of concerns. The application expresses intent in its own vocabulary; adapters handle vendor mechanics. Exam answers that sprinkle vendor-specific fields through business logic are usually wrong.

### Rate limits and retry strategy

Providers protect shared capacity with rate limits, commonly expressed per minute in both requests and tokens. A request limit constrains how many calls you make; a token limit constrains how much text you push through. Hitting either yields a temporary rejection, usually a 429 status, often with a retry-after value. Ignoring these limits turns a busy hour into a wave of failures.

The first line of defense is shaping your own traffic. Bound concurrency with a queue or semaphore, and pace submissions with a token bucket that accounts for both requests and estimated tokens. Estimate input tokens before sending when you can, because a large prompt can exhaust a token budget even at a low request count. Separate interactive traffic from background work so a batch job cannot starve a user-facing call.

The second line of defense is a retry policy that respects the signal. On a 429, wait at least the retry-after interval, then apply exponential backoff with jitter. Keep attempts bounded by both count and total time. Never retry deterministic errors such as malformed input or missing permission. Combine retries with idempotency keys so a replay cannot create duplicate work, and record the rate-limit headers in telemetry so you can see how close to the edge you are running.

When limits are strict and volume is high, the real answer is often architectural rather than tactical. Batch the non-urgent work, cache repeated prefixes, shorten prompts, route simple cases to a cheaper fast path, and smooth arrivals instead of letting them spike. Retry strategy keeps you alive at the margin; good design keeps you away from the margin in the first place.

## Worked scenario

**The problem.** A messaging platform must classify roughly 200,000 inbound customer messages per day and attach an intent label and urgency score to each. A separate interactive path lets agents ask questions about individual conversations and expects the first token within two seconds. The classification provider enforces a per-minute request ceiling and a per-minute token ceiling. The monthly budget is fixed, and the team has observed that about a third of messages are near-duplicates of templates already seen.

**Reasoning.** Start by separating the two workloads, because their constraints conflict. The agent-facing path is interactive and latency-sensitive, so it stays synchronous and streaming, with a short prompt and a cached stable prefix. The classification workload has no user waiting for each item, so it belongs in the asynchronous or batch world. Mixing them into one request stream would let a flood of classification calls destroy interactive latency.

Next, reduce the number of calls and the size of each call. Near-duplicate messages are handled with a normalized hash: if the same normalized text and the same classifier version were seen recently, reuse the stored label instead of calling the model again. That removes a meaningful share of traffic outright. For the remaining messages, group them into batches submitted through the batch interface, with a stable custom identifier on each item so results can be mapped back even when they return out of order. The prompt is kept short, with tool definitions and shared instructions forming a cached prefix and the individual message as the variable tail.

Rate limits drive the submission design. A token-bucket scheduler meters both requests and estimated tokens, and it runs below the published ceilings to leave headroom. Interactive calls have a reserved slice of capacity so a large batch cannot consume everything. When a 429 does occur, the client reads the retry-after value, applies jittered backoff, and respects a total time budget. Every item carries an idempotency identifier, so a retried submission cannot create a second stored result or a second charge.

Quality and cost are protected together. Classifications must conform to a JSON schema with a fixed set of intent values and a bounded urgency score; items that fail validation are retried once and then routed to a human queue rather than being accepted blindly. Extended thinking is disabled for this task, because a short label decision does not justify its latency or expense. A small weekly sample is reviewed to estimate accuracy against a labeled set, and the prompt and classifier version are recorded with each result so any drift can be traced.

Monitoring closes the design. Dashboards show accepted versus rejected requests, 429 frequency, cache hit rate, tokens per message, average cost per classification, validation failures, and human-handoff rate. Alerts fire when the monthly spend projection crosses a threshold or when cache hit rate drops, which usually signals that someone accidentally moved variable content into the cached prefix.

**Resolution.** The team meets both goals by treating the two workloads differently. Bulk classification becomes a cached, batched, rate-limited pipeline with schema validation and deduplication; the agent path stays synchronous and streaming with a shared cached instruction prefix. Retry logic handles transient rejections without duplicating work, and the architecture reduces demand rather than merely surviving limits. The key insight is that rate limits are a design input: the right response is to call less, call smaller, and call at the right time, not simply to retry harder.

## Common mistakes

- Sending a conversation as only the newest message, expecting the API to remember earlier turns.
- Mixing role labels, such as placing user text in a system instruction, which confuses authority and creates injection risk.
- Putting changing facts in the system instruction instead of retrieving them or calling a tool.
- Assuming the model executes tools itself; the application must validate arguments, run the function, and return the result.
- Treating a streamed delta as a complete answer, or replaying a failed stream without considering duplicated text.
- Placing variable content such as timestamps at the front of a prompt, which destroys cache hits.
- Using extended thinking for simple, high-volume classification and paying latency and cost for no quality gain.
- Pacing only by request count and ignoring token-based rate limits, which a large prompt can exhaust quickly.
- Retrying 429 responses immediately and in lockstep across many workers, producing a retry storm.

## Chapter summary

- A conversation is an ordered list of role-labelled messages; the API is stateless, so history must be resent each turn.
- System instructions set durable rules and output format; changing facts belong in retrieved data or tools.
- Tool use is a round trip: define the function, let the model request it, validate and execute in application code, return the result, then call the model again.
- Streaming delivers typed events; handle start, delta, stop, heartbeat, and error events with a small state machine and plan for partial output.
- Multi-format messages can include images; use them for genuinely visual information and watch size, relevance, and data handling.
- Extended thinking helps hard reasoning but costs latency and tokens; enable it selectively and measure the gain.
- Prompt caching reuses a stable token prefix; keep invariant content first and variable content last, and verify hits in usage metadata.
- Batch processing trades speed for lower cost and higher throughput, with per-item identifiers and per-item failure handling.
- A thin vendor-neutral interface with explicit capability checks keeps the application portable without pretending all providers are identical.
- Rate limits cover both requests and tokens; shape traffic, reserve capacity, and retry with backoff, jitter, and idempotency.

## Checkpoint questions

1. Why must a client resend earlier messages on each turn of a conversation?
   - A. Because the model has a short attention span.
   - B. Because the API is stateless and only knows what is in the current request.
   - C. Because system instructions expire after one call.
   - D. Because tool results replace the conversation history.

2. Where should a fact that changes frequently, such as today's support hours, be placed?
   - A. In the system instruction, so the model always sees it.
   - B. In the user message, formatted as a command.
   - C. In retrieved data or a tool the model can call.
   - D. In the model name.

3. After a model emits a tool call, what should the application do first?
   - A. Execute the function immediately with the supplied arguments.
   - B. Validate the arguments and check that the caller is authorized.
   - C. Send the tool call to another model for approval.
   - D. Discard it and answer from memory.

4. Which streaming event carries incremental text that should be appended to a buffer?
   - A. Message start
   - B. Content block stop
   - C. Content delta
   - D. Message stop

5. Which prompt layout is most likely to produce prompt-cache hits?
   - A. A timestamp, then the user question, then the system instruction.
   - B. The user question, then a changing identifier, then stable tool definitions.
   - C. Stable system instruction and tool definitions first, then the per-request user message.
   - D. A different random ordering on every call.

6. When is extended thinking most appropriate?
   - A. For a short intent label on a high-volume stream.
   - B. For a lookup that can be answered directly from a supplied passage.
   - C. For a problem with several interacting constraints where first attempts are often wrong.
   - D. For any request, because it always improves accuracy.

7. A 429 response arrives with a retry-after value. What is the best response?
   - A. Retry immediately with the same arguments and no delay.
   - B. Wait at least the indicated interval, add jittered backoff, and keep an idempotency key.
   - C. Treat the request as permanently invalid and stop.
   - D. Switch to a larger max_tokens value and retry in a tight loop.

8. Why use a vendor-neutral interface with explicit capability checks?
   - A. Because all providers support identical features.
   - B. To keep vendor details out of business logic while still handling real differences honestly.
   - C. Because streaming is unavailable through adapters.
   - D. Because tool definitions cannot be cached.

### Answers and rationale

1. **B.** Statelessness means the service retains nothing between calls, so context exists only in the messages you send. A is anthropomorphic and wrong. C is false because system instructions are not single-use. D reverses the relationship; tool results are added to history, not substituted for it.

2. **C.** Volatile facts belong in retrievable data or a callable tool so they can be updated without rewriting prompts. A makes the instruction stale and expensive to change. B treats untrusted user text as authoritative. D is meaningless for storing facts.

3. **B.** Arguments must be validated and authorization checked before any real action, because the model can invent values and is not itself a permission authority. A executes untrusted input too early. C adds needless complexity and is not the standard loop. D abandons a valid capability.

4. **C.** Content delta events carry incremental fragments to append. A announces the message, B marks a block complete, and D signals the end of the response; none of them carry the text fragments themselves.

5. **C.** A stable prefix first and variable content last maximizes shared cache keys. A and B put changing material ahead of stable material, invalidating the prefix. D guarantees poor reuse through constant reordering.

6. **C.** Extra deliberation pays off where reasoning is genuinely difficult and errors are common. A and B are routine, high-volume, or retrieval-like tasks where the cost is not justified. D is wrong because extended thinking does not help every request and can hurt latency and cost.

7. **B.** Waiting the indicated interval, adding jitter, and keeping idempotency together respect the limit and avoid duplicate work. A and D create retry storms. C mistakes a temporary condition for a permanent error.

8. **B.** The abstraction keeps vendor specifics out of business logic, while capability checks acknowledge that providers genuinely differ. A is false and would lead to runtime surprises. C is false because streaming can be adapted. D is unrelated to the purpose of the interface.

---

*End of chapter 4.*
