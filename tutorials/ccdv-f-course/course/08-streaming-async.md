# Chapter 8 — Streaming, Async, and Real-Time Delivery

## Learning objectives

- Contrast synchronous and asynchronous calls using user expectation and task duration rather than habit.
- Explain fan-out with many concurrent requests and the controls that keep it from overwhelming a service.
- Describe server-sent events, recognize the typical event sequence, and state what a client should do at each step.
- Forward a model stream to a browser without buffering the entire answer first.
- Identify when a WebSocket is justified and when a one-way event stream is simpler.
- Explain backpressure, partial output, and safe error handling when a stream fails partway through.

## Key concepts

### Two timing models

A synchronous call holds the caller open until one complete response arrives. The client sends a request, waits, and then receives a finished message. This is the natural shape for a short interactive task where a person is waiting for an answer, because the code path is easy to follow and the result is whole when it returns.

An asynchronous call separates submission from collection. The client posts a job, receives an acknowledgement with a job identifier, and later obtains the result by polling a status endpoint, receiving a callback, or listening on an event channel. This suits work that runs longer than a person should wait, such as summarizing hundreds of documents or scoring an entire evaluation set. The cost is extra machinery: a job store, status tracking, callback verification, and a policy for what happens when the caller disconnects.

A third idea sits between them. A streaming request is still one logical call, but the response arrives progressively over a long-lived connection. The caller waits for the call to finish, yet useful text appears well before completion. Streaming does not shorten the total generation time; it shortens the time to the first useful token, which is what a user perceives as speed.

| Lens | Synchronous | Asynchronous |
| --- | --- | --- |
| Caller is held open | Yes, until the response completes | No; submission returns an acknowledgement |
| Result delivery | In the response body | Polling, callback, or event channel |
| Best fit | Short interactive work | Long tasks and bulk workloads |
| Failure handling | Retry the call under a bounded policy | Track job status; retries must avoid duplicate work |
| Extra machinery | Minimal | Job store, status, callback security |

Choosing between these is a requirements question. If a person expects an answer now, keep the interactive path responsive, possibly with streaming. If the work takes minutes and nobody is watching, a job queue is more honest than a request that might time out.

### Fan-out and concurrency

Many applications need a batch of independent answers: grading several prompts, translating the same text into several languages, or running a test set. Sending those calls one after another wastes wall-clock time, while sending all of them at once can trip rate limits or exhaust memory. Fan-out means launching many calls concurrently with a deliberate ceiling.

The usual pattern is an asynchronous client plus a semaphore that caps in-flight work. Each task acquires a slot, performs the call, and releases the slot in a `finally` block so a failure cannot leak capacity. Results are gathered with a helper that can either fail fast or return per-item outcomes. A per-item outcome is often preferable in a batch, because one bad document should not erase the other results.

Three controls make fan-out safe. A concurrency limit protects both the local process and the remote quota. Backoff with jitter spreads retries so that many failed tasks do not retry in lockstep. Idempotency, where the interface supports it, ensures a retried submission does not create a second side effect. Without the third control, backoff alone tames load but can still duplicate work.

> **Exam note:** When a scenario mentions many simultaneous calls plus duplicate charges or repeated side effects, look for idempotency. Rate limiting is a separate concern.

### What a stream actually sends

Server-sent events are a common transport for model output. The server keeps an HTTP response open and writes newline-delimited events as they occur. Each event has a type and a data payload. The client reads events in order, accumulates fragments, and treats a terminal event as the point at which the message is complete. Because the transport is ordinary HTTP, existing authentication, routing, and observability tooling usually still apply.

The sequence is structured rather than a raw trickle of characters. A message-start event opens the response and may carry initial usage information. Content-block events announce each block, then deliver incremental text fragments, then close the block. A message-delta event carries final metadata such as the stop reason and usage totals. A message-stop event ends the stream. Heartbeat events may appear during quiet periods to keep proxies from closing an idle connection, and an error event can terminate the stream early.

| Event | Meaning | Client action |
| --- | --- | --- |
| `message_start` | A new response has begun | Create a fresh accumulator and record identifiers |
| `content_block_start` | A block of output is opening | Prepare a buffer for text or a tool payload |
| `content_block_delta` | Incremental text or partial structured data arrived | Append the fragment; optionally render it |
| `content_block_stop` | The current block is finished | Close the buffer and store the completed block |
| `message_delta` | Final metadata such as stop reason and usage | Record cost and termination reason |
| `message_stop` | The stream ended normally | Mark the message complete and run validation |
| `ping` | Heartbeat to keep the connection alive | Ignore for content; reset idle timers |
| `error` | The stream failed before completion | Log partial output and apply the error policy |

Two subtleties matter. First, a delta is a fragment, not an answer; assembling it into a buffer before judging correctness avoids reacting to half a sentence. Second, usage totals often arrive near the end, so a cost dashboard that reads only the first event will undercount. A robust client keeps a small state machine keyed on these event types.

### Forwarding a stream to a browser

A backend rarely lets the browser call the model directly, because that would expose credentials and bypass application policy. Instead, the browser opens an event source against the backend, and the backend opens its own stream to the model. As each event arrives, the backend translates it into a browser-friendly event and writes it onward. The response should declare the event-stream content type, disable buffering where possible, and flush each event promptly.

The forwarding layer is also the right place to enforce boundaries. It can strip internal fields, redact sensitive content, attach a conversation identifier, and record metrics. It should not reserialize the entire answer at the end, because that defeats progressive rendering. A thin translation that preserves order and timing is the goal.

```python
import asyncio
from model_client import AsyncClient

MODEL = "your-model-id"
client = AsyncClient()

async def answer_stream(prompt: str, send_to_browser) -> str:
    collected = []
    try:
        async with client.messages.stream(
            model=MODEL,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                collected.append(text)
                await send_to_browser(text)
    except Exception as exc:
        # Preserve what was already emitted; do not silently restart.
        await send_to_browser(f"[stream interrupted: {type(exc).__name__}]")
        raise
    final = stream.get_final_message()
    await send_to_browser(f"\n[stop={final.stop_reason}, tokens={final.usage.output_tokens}]")
    return "".join(collected)

async def main() -> None:
    async def send_to_browser(chunk: str) -> None:
        print(chunk, end="", flush=True)
    await answer_stream("Explain server-sent events in two sentences.", send_to_browser)

asyncio.run(main())
```

The `send_to_browser` function stands in for the HTTP response writer. In a web framework, it would yield a formatted event instead of printing. Notice that the partial text is retained in `collected`, that an interruption is reported rather than hidden, and that final usage is read only after the stream ends.

### WebSockets and when they apply

A WebSocket keeps a bidirectional connection open, so either side can send messages at any time. That is genuinely useful when the client must stream data up continuously, when several participants share a live session, or when the server needs to push updates unrelated to a single request. Collaborative editing, live telemetry, and interactive voice are typical examples.

For one-way delivery of generated text, a server-sent event stream is usually simpler. It rides on standard HTTP, works naturally with request authentication, and many browser clients reconnect automatically. A WebSocket adds connection lifecycle management, heartbeat rules, and scaling concerns such as sticky routing. Choosing it only because it sounds more real-time is a common architectural mistake. If the flow is "one question in, one answer out, delivered progressively," an event stream is the better default.

| Situation | Preferred transport | Reason |
| --- | --- | --- |
| Progressive answer to one question | Server-sent events | One-way flow; simple HTTP semantics |
| Continuous client-side audio or telemetry | WebSocket | Efficient bidirectional traffic |
| Shared live session with several participants | WebSocket | Server can push to all members |
| Bulk job with no user watching | Async job plus polling or callback | No long-lived connection needed |

### Backpressure and partial output

Backpressure appears when the producer generates events faster than the consumer can absorb them. A browser on a slow device, a proxy with small buffers, or a logging system doing synchronous writes can all fall behind. If the backend queues every fragment without limit, memory grows until something fails. Bound the queue, flush on a fixed cadence rather than per character when necessary, and choose a policy for overflow: slow the producer if the transport supports it, coalesce fragments into larger chunks, or stop and mark the response truncated.

Partial output changes how correctness is judged. A client that renders every fragment immediately gives a lively experience but may show a wrong opening clause before the sentence resolves. Many interfaces render tokens while clearly labeling the message as in progress, then run validation once the final event arrives. Structured output deserves extra care: a half-formed JSON object should never be parsed as if it were complete. Buffer structured content until its block closes, unless the interface explicitly supports incremental JSON.

Partial output also complicates retries. If a connection drops after a dozen visible tokens, restarting from the beginning duplicates text the user already saw. Sensible options include marking the stream consumed and offering a regenerate action, resuming from a recorded event position when the transport supports it, or keeping streams short enough that a clean restart is acceptable. Decide this before an outage, not during one.

### Errors in the middle of a stream

Failures on a long-lived connection are normal. Authentication and validation errors usually surface before generation starts, while rate limits, timeouts, and network drops can appear after text has already been emitted. The client should classify the failure, preserve a log of what was delivered, and apply a policy that matches the error type. Retrying a permanent validation error is pointless; abandoning a transient timeout immediately is wasteful.

A `retry-after` header or an explicit rate-limit signal should guide the wait before a retry. Backoff with jitter prevents a crowd of clients from retrying together. When a retry does happen, idempotency and a clear rule about discarding previously displayed text prevent duplicates. The final principle is transparency: a user is better served by a visible interruption marker than by a response that stops mid-sentence with no explanation.

> **Common mistake:** Treating the first text delta as a complete answer and running downstream logic before `message_stop`.

## Practice lab

**Goal:** Observe an event sequence and verify that partial text differs from a completed message.

1. Wrap a streaming call in a small script that prints each event type and a short preview of its data.
2. Run the same prompt once with streaming and once without, and compare total output and elapsed time to the first visible token.
3. Add a counter that prints accumulated characters after each text delta.
4. Simulate an interruption by cancelling the task midway, then inspect the collected partial text.
5. Write down what a retry would do to the already displayed characters.

**Expected observation:** The event log starts with a message-level event, moves through block start, deltas, and block stop, and ends with final metadata and a stop event. The first token appears sooner in the streaming run even though total generation time is similar. Cancellation leaves a partial buffer, which demonstrates why a naive restart would duplicate output.

## Worked scenario

A support portal shows model answers in a chat panel. During a traffic spike, users see answers freeze halfway, and a background retry then prints the beginning of each answer a second time. The team also notices that the cost dashboard trails real spending by several minutes.

**Reasoning.** Three separate design gaps are hiding behind one symptom. The stream has no explicit interruption marker, so a freeze looks like normal completion. The retry policy restarts from the beginning with no record of what was already displayed, which explains duplication. The dashboard reads usage from the initial event, but final usage arrives near the end of the stream. Fan-out may also be too aggressive, since the spike likely pushed the service into rate limiting.

**Resolution.** The client now tracks event types, renders a clearly labeled interrupted state when a stream ends early, and offers a regenerate action rather than silently restarting. A bounded queue and periodic flushing absorb slow browsers without unbounded memory. Concurrency is reduced and retries use backoff with jitter plus an idempotency key where available. Finally, accounting waits for the message-delta and message-stop events before recording usage. The visible behavior becomes honest, duplicates disappear, and cost reporting catches up.

## Common mistakes

- Assuming streaming reduces total generation time rather than time to first token.
- Parsing accumulated text as complete before the terminal event arrives.
- Retrying a failed stream from the beginning after text has already been shown to the user.
- Letting an unbounded queue absorb every fragment when the browser is slow.
- Choosing a WebSocket for a simple one-way answer flow.
- Recording usage from the first event instead of the final metadata.

## Chapter summary

- Synchronous calls suit short interactive work; asynchronous jobs suit long or bulk work.
- Streaming keeps one logical call but delivers progressive output, improving perceived responsiveness.
- Fan-out needs a concurrency cap, jittered backoff, and idempotency to avoid overload and duplicates.
- Server-sent events follow a typed sequence from message start through block deltas to a terminal stop.
- Backend forwarding preserves order and timing while enforcing policy and redaction.
- WebSockets fit bidirectional or multi-party live flows; one-way event streams are simpler for single answers.
- Backpressure, partial output, and mid-stream errors require explicit policies, not improvised retries.

## Checkpoint questions

1. What does streaming primarily improve for an interactive user?

   - A. Total generation time for every request
   - B. Time until the first useful text appears
   - C. The accuracy of the model's answer
   - D. The number of tokens the model may produce

2. Which event carries incremental text that should be appended to a buffer?

   - A. `message_start`
   - B. `content_block_start`
   - C. `content_block_delta`
   - D. `message_stop`

3. A batch of 500 independent classifications must finish overnight, and nobody is waiting on each item. Which shape fits best?

   - A. One synchronous request per item from an interactive endpoint
   - B. An asynchronous job with status tracking and bounded concurrency
   - C. A WebSocket connection held open for the whole night
   - D. A stream that renders tokens into a browser

4. Why is restarting a failed stream from the beginning risky?

   - A. Servers never allow more than one stream per session
   - B. Already displayed text would be duplicated
   - C. Text deltas do not contain any actual content
   - D. Usage totals are unavailable at the start

5. Which condition most strongly justifies a WebSocket over server-sent events?

   - A. The answer is delivered progressively to one browser
   - B. The client must send continuous updates and receive server pushes in the same session
   - C. The task runs as an overnight batch
   - D. The response is short and fully buffered

6. A slow browser causes the backend queue to grow without limit. What is the best response?

   - A. Increase `max_tokens` on the request
   - B. Bound the queue and coalesce or throttle fragments
   - C. Ignore the issue because HTTP handles backpressure automatically
   - D. Switch to a synchronous non-streaming call without changing anything else

7. Which piece of information should be awaited before recording final token usage?

   - A. The heartbeat event
   - B. The first text delta
   - C. The final metadata near the end of the stream
   - D. The moment the HTTP connection opens

### Answers and rationale

1. **B.** Streaming makes output visible earlier, which changes perceived responsiveness. A is false because total generation time is roughly unchanged. C is false because accuracy is not a transport property. D is false because `max_tokens` controls the ceiling, not the delivery mode.

2. **C.** Text fragments arrive as content-block deltas. A opens the message, B announces a block without its text, and D marks the end of the stream.

3. **B.** An asynchronous job with bounded concurrency handles volume without holding callers open or overwhelming the service. A wastes resources and risks timeouts. C adds a connection pattern that serves no purpose here. D assumes a browser that does not exist in this workload.

4. **B.** Fragments already shown would appear again, confusing users and possibly duplicating downstream effects. A is false in general. C is false because deltas do carry content. D is related to accounting, not the duplication problem.

5. **B.** Continuous client-to-server traffic plus server pushes in one session is the case for bidirectional transport. A is the textbook case for server-sent events. C belongs in a job queue. D needs neither transport.

6. **B.** A bounded queue with coalescing or throttling applies backpressure and protects memory. A changes output length, not flow control. C is false because the network does not solve application-level buffering. D hides the symptom and may still leave a large response to buffer.

7. **C.** Usage totals are finalized near the end of the stream. A heartbeat carries no accounting data. B is too early to be complete. D occurs before generation.

---

*End of chapter 8.*
