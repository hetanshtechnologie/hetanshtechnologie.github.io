# Chapter 3 — Turning a Vague Request into Measurable Requirements

## Learning objectives

- Rewrite ambiguous business language into requirements that a test can prove or disprove, with explicit acceptance criteria.
- Separate functional behavior from non-functional constraints, and explain why AI features make non-functional limits especially important.
- Explain the HTTP, JSON, and concurrency foundations that an AI feature depends on, and predict the consequences of getting them wrong.
- Contrast synchronous and asynchronous request patterns, and apply idempotency and retry rules that avoid duplicate work.
- Trace an AI system through requirements, design, build, test, release, and monitoring, naming the artifact each stage produces.
- Treat prompts and configuration as reviewable, versioned assets, and refactor them without destabilizing behavior.

## Key concepts

### The real starting point is a vague sentence

Every project begins with a sentence that sounds clear but is not. "We want the assistant to answer customer questions quickly and cheaply" is a reasonable thing for a stakeholder to say, and it is nearly useless for an engineer who must build and test the result. The words "answer," "quickly," and "cheaply" each hide a decision that has not yet been made. Until those decisions are made explicit, nobody can say whether the finished system is correct.

This is not a complaint about stakeholders. Vagueness is the natural condition of a new request. Business language is compressed because the speaker assumes a shared context that the delivery team does not yet have. The engineer's first job is decompression: turning each adjective into a number, a condition, or a boundary that can be checked.

A requirement becomes testable when a reviewer can write a check that passes or fails without interpretation. "Fast" fails that standard, because one person's fast is another person's slow. "The 95th percentile time from request to first visible token is under two seconds for prompts of 500 tokens or fewer, measured with 20 concurrent users" passes it, because a load test can produce a single number and compare it with a threshold.

Testability is not an academic preference. It is what lets a team agree that work is done, what lets an exam question have one correct answer, and what lets a regression be caught before users notice. A requirement that cannot fail a test cannot protect anyone.

> **Exam note:** Foundations questions often sit exactly in the gap between a business adjective and a measurable limit. When a scenario says "fast," "accurate," or "secure," favor the answer that converts the word into a metric plus a measurement method, not the one that repeats the adjective in different words.

### Acceptance criteria and non-functional constraints

A requirement describes what the system must do; an acceptance criterion describes the evidence that will convince a reviewer it actually does it. Good acceptance criteria share three properties. They are binary, so the outcome is pass or fail rather than "mostly." They are observable, so the evidence comes from something the team can inspect, such as a log, a metric, a test result, or a stored record. And they are scoped, so the conditions under which they hold are stated: which inputs, which load, which environment.

A common and useful shape is the given-when-then form: given a certain starting state, when an action occurs, then a specific observable result follows. For an AI feature this shape is valuable because model behavior is probabilistic. Instead of demanding "the answer is correct," you define a held-out evaluation set and require a threshold, such as "given a fixed set of 200 support questions, when each is submitted once, then at least 180 are assigned the correct intent label." The set and the threshold together make a probabilistic system measurable.

Requirements also split into two broad kinds. Functional requirements describe behavior: what the system does when a particular input arrives. Non-functional requirements describe qualities: how fast, how cheap, how available, how secure, how accurate, and how maintainable the behavior is. Teamsnew to AI systems often over-invest in the functional list and treat quality as an afterthought. That is dangerous here, because the defining property of a language model is that the same input can produce different outputs, and because each call carries a monetary and time cost. Quality limits and cost limits are not polish; they are part of the design constraints.

The non-functional categories worth naming explicitly are latency, throughput, cost per request or per resolved task, output quality measured on an evaluation set, availability and error rate, security and data handling, regulatory or privacy obligations, and maintainability. Any one of them can be the hidden constraint that decides which architecture is correct.

> **Common mistake:** Treating "the model should be accurate" as a functional requirement. Accuracy is a measured quality with a threshold and a test set. Without those, it is an aspiration, and an aspiration cannot reject a bad build.

#### A rewrite table

The table below shows how abstract requests become checkable statements. Notice that each rewrite names a measurement method as well as a target, because a number without a method invites disagreement.

| Vague request | Why it cannot be tested | Measurable rewrite | Acceptance check |
| --- | --- | --- | --- |
| "Respond quickly" | No threshold, load, or starting point | For prompts up to 500 tokens, p95 time to first visible token is under 2 s at 20 concurrent users | Load test emits p95; must be below 2 s |
| "Understand what users ask" | "Understand" is undefined | At least 90% of 200 labeled support questions receive the correct intent label | Run the fixed eval set; count correct labels |
| "Keep costs low" | No unit or volume | Average API spend per resolved request is at most $0.01 at the forecast daily volume | Billing export divided by resolved requests |
| "Handle lots of users" | No rate or error budget | Sustain 50 requests per second for 10 minutes with error rate below 0.1% | Soak test with latency and error counters |
| "Give correct answers" | Correctness is not defined | At least 95% of factual answers cite a retrieved source; fewer than 2% contain a claim contradicted by that source | Human or automated citation check on eval set |
| "Be safe" | No threat list | Refuse 100% of prompts in the banned-topic red-team suite and leak no secrets in the data-leak suite | Red-team suite reports zero violations |
| "Work on mobile" | Device and network undefined | First visible token under 3 s on a mid-tier handset over a simulated 4G link | Field or lab measurement on a named device profile |
| "Never lose a request" | Durability is unspecified | Every accepted request produces either a stored result or a stored error record within 60 s | Reconcile accepted requests against stored records |

Each row also illustrates a negotiation. The rewritten version may be harder to promise than the original, but it is the only version a team can build against. When a stakeholder cannot supply a number, a useful move is to propose a provisional one and agree to revisit it after a baseline measurement. A provisional threshold is still testable; an adjective is not.

> **Try it:** Take three adjectives from a real request you have seen, such as "helpful," "fast," and "reliable." For each, write a threshold, a measurement method, and the conditions under which it applies. If you cannot name a measurement method, you have found an unfinished conversation rather than a finished requirement.

### The engineering foundations under every AI feature

A language model call is easy to make in a demo: send text, receive text. A production feature is a distributed system wearing a demo's clothes. It crosses a network, obeys HTTP rules, exchanges structured data, consumes shared capacity, and can fail in partial and surprising ways. The foundations below are not optional background; they are the reasons certain designs work and others collapse under load.

#### HTTP and REST semantics

HTTP gives us a small vocabulary whose precise meaning matters. A GET retrieves a representation and is expected to be safe and idempotent, meaning it does not change server state and repeating it yields the same effect. A PUT replaces a resource and is idempotent because applying it twice leaves the same final state. A DELETE is also idempotent in that sense. A POST requests an action or creates a resource, and it is generally not idempotent: two identical POSTs may create two records or incur two charges. PATCH applies a partial change and sits somewhere in between, depending on how it is implemented.

Status codes carry equal weight. The 2xx family means the request was handled. The 4xx family means the client must change something: 400 for a malformed request, 401 for missing authentication, 403 for insufficient permission, 404 for a missing resource, 409 for a conflict, 422 for data that is syntactically valid but semantically unacceptable, and 429 for rate limiting. The 5xx family means the server failed: 500 for an unexpected fault, 502 for a bad upstream response, 503 for unavailability, and 504 for an upstream timeout. A client that treats all non-200 responses alike will retry permanent errors pointlessly and give up on transient ones too early.

An AI generation endpoint is usually modelled as a POST, because each call is an action that produces a new result and consumes billable capacity. Streaming responses are commonly delivered over server-sent events or a similar long-lived channel. Headers do real work here: content type declares the body format, authorization carries credentials, and a retry-after header tells a client how long to wait following a 429.

Why does an exam care about method verbs and status codes? Because they are the raw material of correct retries, caching, and idempotency. If you know a POST is not idempotent, you know a blind retry can duplicate a side effect, and you go looking for an idempotency key. If you know a 429 is temporary and often carries a retry-after value, you back off instead of treating the request as invalid.

#### JSON contracts and schemas

The request and response bodies are structured data, most often JSON. A contract is the shared agreement about that structure: which fields exist, their types, which are required, what values are allowed, and what happens with unknown fields. When both sides honor the contract, services can evolve independently. When the contract is implicit, a small change on one side becomes a production incident on the other.

A schema makes the contract executable. The example below describes the structured result a classifier is expected to return. Defining it as a schema lets the application validate the model's output before trusting it, and it tells the model, when the API supports structured output, exactly what shape to produce.

```json
{
  "title": "SupportTicketClassification",
  "type": "object",
  "properties": {
    "intent": {
      "type": "string",
      "enum": ["billing", "technical", "account", "other"]
    },
    "urgency": {
      "type": "integer",
      "minimum": 1,
      "maximum": 5
    },
    "needs_human": {
      "type": "boolean"
    },
    "evidence": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    }
  },
  "required": ["intent", "urgency", "needs_human", "evidence"],
  "additionalProperties": false
}
```

Several details are worth pausing on. The `enum` prevents invented intent labels, a common failure when a model tries to be helpful. Bounds on `urgency` keep a stray numeric value from cascading into downstream logic. `additionalProperties: false` forces an explicit decision about unexpected fields instead of silently accepting them. And a required `evidence` array pushes the design toward answers that can be checked rather than assertions that float free of the input.

Validation belongs at the boundary. If the model returns data that fails the schema, the application should treat that as a handled failure: retry once under a bounded policy, fall back to a default classification, or route to a human. Passing unvalidated output into a database or a downstream service is how a probabilistic system acquires deterministic corruption.

> **Exam note:** A schema is a contract, not a suggestion. If a question asks how to make model output safe to consume, the strong answers involve validating structure and constraining values, not hoping the model behaves.

#### Synchronous versus asynchronous work

The next foundational choice is whether the caller waits. In a synchronous design, the client sends a request and holds a connection open until the full result arrives. This is simple to reason about and easy to map to a single HTTP exchange, but it ties the client's patience to the model's slowest case. A long generation can hit a gateway timeout even though the server is still working, and the client cannot tell whether the request failed or merely finished late.

In an asynchronous design, the client submits a job and immediately receives an acknowledgement, often a 202 status with a job identifier. The result is collected later by polling an endpoint or by receiving a callback. This decouples the caller from generation time, which helps for long tasks, large batches, and anything that can run without a human watching. The cost is extra machinery: a job store, status tracking, callback security, and a story for what happens when the client disappears.

Neither pattern is universally better. A chat interface that must show tokens as they appear is naturally synchronous at the transport level, even if the tokens stream. A nightly summarization of thousands of documents is naturally asynchronous. The mistake is choosing one by habit rather than by constraint.

| Dimension | Synchronous request | Asynchronous job |
| --- | --- | --- |
| Client experience | Caller waits for the result | Caller receives an acknowledgement and returns later |
| Typical status code | 200 on success | 202 Accepted with a job reference |
| Connection lifetime | Held open for the whole generation | Short; closed after submission |
| Timeout exposure | High for long generations | Low during submission; moved to polling or callback |
| Server resources | Ties up a request slot and possibly a connection | Queues work; workers process independently |
| Result delivery | In the response body | Polling endpoint, callback, or event |
| Failure handling | Retry the whole request | Retry submission or query status; deduplicate by job key |
| Ordering and backpressure | Caller naturally paces itself | Queue can grow; needs limits and visibility |
| Best fit | Interactive chat, short calls, streaming to UI | Batch jobs, long analysis, work that survives client restarts |
| Main risk | Gateway timeouts and fragile retries | Duplicate jobs and stale or lost status |

A hybrid is common and worth naming. A request can be synchronous over a streaming channel, giving the user immediate tokens while still being a single logical call. Or a synchronous endpoint can accept a short task and hand longer work to a queue, returning a job reference when the estimated run time crosses a threshold. Exam scenarios often hinge on spotting that "the user expects an answer now" and "the work takes minutes" cannot both be satisfied by one plain synchronous call.

#### Idempotency

An operation is idempotent when performing it repeatedly has the same effect as performing it once. Repeating a GET is harmless. Repeating a PUT to set a value to "active" leaves the value active. Repeating a POST that creates a record may create several records, so it is not idempotent by default.

This distinction is sharper for AI features than for ordinary CRUD, because each call may cost money and may trigger side effects. If a network failure causes a client to resend a generation request, the provider may charge twice. If the request also sends an email or writes an audit entry, the user may receive two messages. The model's output being nondeterministic makes exact repetition impossible, but the *business* effect of the operation must still be single.

The standard tool is an idempotency key: a unique value generated by the client and attached to the request. The server records the key with the outcome. If the same key arrives again, the server returns the stored outcome instead of starting new work. A robust implementation stores the key and the result atomically, defines how long keys are retained, and returns a conflict response if the same key is reused with a different payload.

Design the boundary so that side effects happen once. If generation is followed by storage, use a deterministic key derived from the request and the job identifier so a replay writes to the same record rather than appending a new one. If generation triggers external actions, put the idempotency check immediately before the action, not before the model call, so a retried call cannot re-trigger the action with a fresh internal identifier.

> **Common mistake:** Assuming that because a request "failed" from the client's point of view, no work happened on the server. A timeout is ambiguous. The server may have completed the generation, charged for it, and stored the result. This is precisely why retry logic and idempotency must be designed together.

#### Retries

Retries exist because distributed systems have transient failures: a connection resets, a gateway returns 503 during a deploy, a rate limit briefly trips. A sensible retry policy classifies errors first. Retry transient conditions such as network timeouts, 429, 502, 503, and 504. Do not retry deterministic client errors such as 400, 401, 403, and 422; repeating them will not make them valid. A 409 may be retried only after resolving the conflict.

When retrying, use exponential backoff with jitter. Exponential backoff stretches the delay between attempts so a struggling service is not hammered. Jitter randomizes the delay so many clients do not retry in lockstep, a phenomenon often called a retry storm. Good policy also carries a retry budget, meaning a maximum number of attempts and a total time cap, and it respects a retry-after header when the server supplies one.

```python
import random
import time

RETRYABLE = {429, 502, 503, 504}

def call_with_retries(client, payload, max_attempts=4, total_budget_s=20):
    key = payload["idempotency_key"]
    started = time.monotonic()
    for attempt in range(max_attempts):
        remaining = total_budget_s - (time.monotonic() - started)
        if remaining <= 0:
            raise TimeoutError("retry budget exhausted")
        try:
            return client.generate(payload, idempotency_key=key)
        except TransientError as exc:
            if exc.status not in RETRYABLE or attempt == max_attempts - 1:
                raise
            base = min(2 ** attempt, 8)
            delay = random.uniform(0, base)
            time.sleep(min(delay, remaining))
```

The example makes three ideas concrete. The idempotency key is fixed for every attempt, so a retry can be deduplicated by the server. The budget is measured in elapsed time as well as attempt count, so a slow sequence of attempts cannot run forever. And the backoff is capped and jittered, so the client neither waits absurdly long nor synchronizes with every other client.

For streaming requests, retries need extra thought. A failure after the client has already displayed several tokens cannot simply restart the call from the beginning, because the user would see duplicated text. Options include treating the stream as consumed and asking the user to continue, resuming from a recorded event identifier if the transport supports it, or keeping streams short enough that a restart is acceptable. This is a design decision, not a detail to discover during an outage.

> **Exam note:** When a question mentions both retries and duplicate charges or duplicate messages, the missing piece is idempotency. Backoff alone controls load; it does not prevent duplicate side effects.

### The life of an AI system

An AI feature is not delivered in a single act. It moves through a sequence of stages, and each stage produces an artifact that the next stage consumes. Thinking in terms of these artifacts is useful in exams because it turns a vague question—"what should you do next?"—into a concrete one: "which artifact is missing?"

| Stage | Core question | Artifact produced | AI-specific concern |
| --- | --- | --- | --- |
| Requirements | What must be true? | Testable requirements and acceptance criteria | Quality, latency, and cost are explicit constraints |
| Design | How will it work? | Architecture, data flow, model and prompt choices, fallback plan | Nondeterminism, tool boundaries, data handling |
| Build | What gets implemented? | Code, prompts, configuration, schemas, tests | Prompts are behavior and must be versioned |
| Test | Does it meet the criteria? | Evaluation results, load and cost reports, security findings | Evaluation sets, regression on prompt changes |
| Release | How does it reach users safely? | Rollout plan, feature flags, rollback procedure | Canary prompts, output monitoring, kill switch |
| Monitor | Is it still correct in the real world? | Dashboards, alerts, feedback and drift reports | Quality drift, token and cost trends, prompt version tags |

Requirements are the contract with the business. Design turns that contract into decisions: which calls are synchronous, what the model is allowed to do, what data reaches it, what happens when it is unavailable or wrong, and how much a request may cost. A good design names its fallbacks explicitly. "If the model is slow, show a cached answer"; "if the output fails validation, route to a human"; "if the provider is down, degrade to a rule-based path." A design without fallbacks is a design that assumes perfect conditions.

Build turns decisions into code, and for AI systems that includes assets that do not look like code. Prompt templates, tool definitions, few-shot examples, model identifiers, temperature and other sampling settings, and validation schemas all shape behavior. They belong beside the application code, under the same discipline.

Test is broader than unit testing. Unit tests cover deterministic helpers such as validation and transformation. Integration tests cover the real API contract, ideally against a controlled endpoint. Evaluation sets measure quality against the acceptance thresholds defined earlier. Load tests check latency and throughput. Cost tests verify spend per request at realistic traffic. Security testing probes for prompt injection, data leakage, and misuse of tools. Regression testing repeats all of these when prompts, models, or configuration change.

Release should be gradual. Feature flags let a team expose a new prompt or model to a small slice of traffic. Canary comparisons can measure whether the new version actually improves the acceptance metrics before a full rollout. A rollback path must be rehearsed, not imagined: if the new behavior is worse, the team needs a fast way to restore the previous prompt and model version.

Monitoring closes the loop. Track operational signals such as error rate, latency percentiles, request volume, token consumption, and cost. Track quality signals such as validation failures, fallback frequency, human handoff rate, and user feedback. Tag each observation with the prompt and model version that produced it, so a regression can be attributed. Over time, real traffic reveals new inputs the original requirements never anticipated; those discoveries feed back into requirements, and the cycle repeats.

> **Try it:** For a feature you know, write the six artifacts above in one line each. If you cannot name the design artifact, you probably have a team that starts coding before it decides how failures will be handled.

### Version control, review, and refactoring discipline

Prompts are behavior expressed in text. A one-word change can alter routing decisions, tone, or the likelihood of a hallucination. Configuration values such as model choice, sampling temperature, maximum tokens, tool availability, and timeout thresholds have the same power. Treating these as casual edits in a dashboard is one of the most common ways a working AI feature quietly breaks.

The remedy is to apply the same discipline used for application code. Store prompts, schemas, and configuration in version control. Make changes through small, focused commits that a reviewer can understand. Attach a clear message describing the intended behavior change and the evidence supporting it, such as an evaluation result. Never edit a production prompt directly in a console; that creates a divergence nobody can reproduce or roll back.

Code review for prompt and config changes asks different questions from ordinary review. Does the instruction remain clear to a reader who did not write it? Does it introduce new injection surface by interpolating untrusted text too freely? How many tokens does it add to every request, and is that cost justified? Are examples representative and free of accidental bias? What explicit fallback does the system use when the model ignores the instruction? Is the change isolated from unrelated infrastructure edits so a regression can be attributed?

Refactoring means changing structure without changing behavior. For prompts, that might mean splitting a long instruction into sections, naming variables consistently, or moving repeated guidance into a shared block. The discipline is to keep such changes separate from behavior changes in review, and to keep the evaluation suite green throughout. If a "refactor" also changes the answer rate, it was not a refactor; it was a behavior change wearing a costume.

Feature flags and version tags make this practical. A prompt version identifier travels with each request and each logged result. When a metric moves, the team can ask whether it moved across versions. Canary rollouts expose a new version to a small fraction of traffic, and comparison against the stable version decides whether to proceed. This is the same release engineering used for code, applied to an asset that happens to be prose.

> **Common mistake:** Keeping prompts only in a remote configuration panel because it is convenient to tweak. Convenient tweaks produce unreproducible behavior, no review trail, and no reliable rollback.

## Worked scenario

**The request.** A client asks for "a smart assistant that answers our customers' questions." During the kickoff, three constraints surface almost as asides: the answer must begin appearing within two seconds on a phone, the whole engagement must stay under a tight monthly budget, and the assistant must not invent policy details. The word "smart" is the only specification they offer.

**Reasoning.** The first move is to refuse to treat "smart" as buildable and decompose every constraint into something testable. "Smart" becomes a measured correct-answer rate on a held-out set of real customer questions, with a hard rule that any answer contradicting the policy source counts as a failure. The two-second requirement becomes a p95 time-to-first-token target on a defined device and network profile. The budget becomes a maximum average spend per resolved question at the forecast monthly volume. "Do not invent policy" becomes a requirement that every factual claim cite a retrieved passage, with zero tolerance for unsupported policy statements.

Those constraints immediately shape the architecture. A single large model call for every question would likely miss the latency target on a slow link and would spend the entire budget on simple questions. Instead, design a two-stage path. A small, cheap classifier assigns intent and decides whether the question is routine. Routine questions are answered from an approved knowledge store with short generated phrasing; only genuinely ambiguous or complex questions reach the larger model, and those calls include retrieved passages so claims can be grounded. Token budgets are capped per stage. Streaming is enabled so the first token reaches the phone quickly even while the full answer is still being produced.

Cost control is built in rather than hoped for. Repeated questions are served from a cache keyed by a normalized form of the question and the knowledge-base version. The monthly budget is translated into a per-request cap and a daily spend alarm. Non-urgent work, such as summarizing transcripts for later review, is moved to an asynchronous queue so it never competes with interactive latency.

Reliability work follows from the earlier foundations. Each generation call is a POST under a stable endpoint contract with a JSON schema for the classification output. Because a retry could double-charge or duplicate a logged interaction, every call carries an idempotency key derived from the request identifier. Retries are limited to transient status codes, use jittered backoff, and respect a total time budget so a slow provider cannot exhaust the latency allowance. Output that fails schema validation is not trusted: it is retried once, then routed to a human.

The lifecycle artifacts make the plan concrete. Requirements record the numbers and measurement methods. Design documents the two-stage path, the cache, the tool boundaries, and every fallback. Build stores prompts, schemas, and configuration under version control. Test runs an evaluation set, a load test for the p95 target, a cost test at forecast volume, and a red-team suite for unsupported claims. Release uses a feature flag to expose the assistant to a small share of traffic and compares metrics against the human-only baseline. Monitoring tags each interaction with the prompt and knowledge-base version, alerts on cost and validation failures, and feeds new question patterns back into the requirements.

**Resolution.** The client's vague sentence becomes a set of pass/fail statements before any model is chosen. The hidden latency and cost limits, once surfaced, drive a tiered architecture, caching, streaming, and strict retry rules rather than a single brute-force call. Because prompts, schemas, and settings are versioned and reviewed, the team can improve "smartness" over time without guessing what changed. The decisive insight is that the constraints were present all along; the job was to make them explicit early enough to design for them.

## Common mistakes

- Treating adjectives such as "fast" or "smart" as requirements instead of converting them into thresholds and measurement methods.
- Defining a quality target without a fixed evaluation set, so results depend on whichever examples happen to be used.
- Overlooking non-functional constraints until after launch, when latency and cost have already been baked into the architecture.
- Using a plain POST retry without an idempotency key, allowing duplicate charges or duplicate side effects.
- Retrying permanent 4xx errors or ignoring a retry-after header, which wastes capacity and prolongs failures.
- Choosing synchronous or asynchronous work by habit rather than by the user's latency expectation and the task's duration.
- Letting unvalidated model output flow into downstream systems because the schema was treated as documentation.
- Editing prompts or configuration directly in a production panel, leaving no review trail and no reliable rollback.

## Chapter summary

- A vague request is unfinished until each adjective becomes a measurable threshold with a stated measurement method and conditions.
- Acceptance criteria should be binary, observable, and scoped; given-when-then wording works well for probabilistic outputs.
- Non-functional constraints—latency, throughput, cost, quality, availability, security, and maintainability—often decide the correct architecture for AI features.
- HTTP method and status semantics determine what can be safely cached, retried, and made idempotent.
- JSON schemas turn the request and response contract into something that can validate model output at the boundary.
- Synchronous calls suit interactive, short work; asynchronous jobs suit long or batch work; each has distinct failure handling.
- Idempotency keys and bounded, jittered retries prevent duplicate side effects and tame transient failures.
- The system life cycle produces artifacts at each stage: requirements, design, build, test, release, and monitoring, with findings looping back to requirements.
- Prompts, schemas, and configuration are behavior; keep them versioned, reviewed, tagged, and refactored under evaluation.

## Checkpoint questions

1. A stakeholder says the assistant must be "fast." Which response best converts this into a testable requirement?
   - A. Build it, then ask users whether it feels fast.
   - B. Require p95 time to first token under 2 seconds for prompts up to 500 tokens at 20 concurrent users.
   - C. Use the fastest model available.
   - D. Add a progress spinner so users perceive less waiting.

2. Which change is an example of a non-functional requirement?
   - A. The system assigns each ticket to an intent label.
   - B. The system stores a record of each interaction.
   - C. Average spend per resolved request must not exceed $0.01 at forecast volume.
   - D. The system offers a human handoff button.

3. Why is a POST generation call a concern when combined with retries?
   - A. POST requests cannot carry JSON bodies.
   - B. POST is generally not idempotent, so retrying can create duplicate charges or side effects.
   - C. POST responses cannot be streamed.
   - D. POST is only valid for retrieving data.

4. Which status should generally be retried with backoff?
   - A. 400 Bad Request
   - B. 401 Unauthorized
   - C. 422 Unprocessable Entity
   - D. 503 Service Unavailable

5. Which scenario most strongly calls for an asynchronous design?
   - A. A chat box that must show the first token within two seconds.
   - B. A short question with an answer expected immediately.
   - C. A nightly job that summarizes thousands of transcripts and must survive client restarts.
   - D. A live translation with a streaming response.

6. What is the main purpose of an idempotency key on a generation request?
   - A. To encrypt the request payload.
   - B. To let the server return the stored result when the same request is retried, avoiding duplicate work.
   - C. To increase the model's token limit.
   - D. To change the model's sampling temperature.

7. Which artifact belongs to the design stage of an AI system's life?
   - A. A load test report showing p95 latency.
   - B. A dashboard alert on token spend.
   - C. A document describing data flow, model choice, tool boundaries, and fallback behavior.
   - D. A rollback executed after a bad release.

8. Why should prompts and configuration be stored in version control?
   - A. Because text files are smaller than databases.
   - B. Because they shape behavior, and version control provides review, reproducibility, and rollback.
   - C. Because models refuse to run without it.
   - D. Because it removes the need for evaluation testing.

### Answers and rationale

1. **B.** It states a metric, a threshold, and the conditions of measurement, so a load test can pass or fail it. A defers the decision to subjective opinion, which is not testable. C chooses an implementation without a target and ignores cost. D changes perception but does not make the system faster or measurable.

2. **C.** Cost per resolved request is a quality constraint on how the system behaves, not a behavior itself, so it is non-functional. A and B describe functions the system performs. D is a feature, also functional.

3. **B.** POST is not idempotent by specification, so an identical retry may produce a second charge or second record. A is false because POST bodies are routinely JSON. C is false because POST responses can be streamed. D confuses POST with GET, which is the retrieval method.

4. **D.** A 503 indicates temporary unavailability, which backoff can ride out. A, B, and C are deterministic client errors; repeating them cannot fix the request and only wastes capacity.

5. **C.** Long-running batch work that must survive a client disappearing is the textbook case for queued, asynchronous processing. A, B, and D describe interactive experiences where the caller expects an immediate or streaming response, favoring synchronous transport.

6. **B.** The key lets the server deduplicate repeated attempts and replay the original outcome. It has nothing to do with encryption (A), token limits (C), or sampling settings (D).

7. **C.** Design is where decisions about data flow, model selection, tool boundaries, and fallbacks are recorded. A is a test artifact, B is a monitoring artifact, and D is part of release operations.

8. **B.** Prompts and configuration determine behavior, so they need the same review, reproducibility, and rollback that code receives. A is irrelevant to the reason. C is simply false. D is false because version control complements, never replaces, evaluation testing.

---

*End of chapter 3.*
