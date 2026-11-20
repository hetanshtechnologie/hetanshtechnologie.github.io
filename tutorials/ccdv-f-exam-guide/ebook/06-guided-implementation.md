# Chapter 6 — A Guided Implementation from Script to Service

## Learning objectives

By the end of this chapter you should be able to:

- Lay out a project skeleton that separates prompts, adapters, application logic, and configuration.
- Set up an environment with dependency pinning, secrets handling, and a repeatable run command.
- Accept input in several formats and normalize it into one internal representation.
- Implement streaming output and explain why it changes both the user experience and the error model.
- Abstract over more than one vendor behind a single stable interface.
- Decide when to serve a request in realtime and when to hand it to a batch job.
- Apply caching, extended thinking, and model selection as deliberate tools rather than defaults.
- Promote a working script into a long-running service with health checks and runtime configuration.
- Reason about a document-processing pipeline that must meet a latency budget.

## Key concepts

### The build path for this chapter

This chapter follows one application from a blank directory to a running service. The point is not to memorize a file tree; it is to understand *why each step exists* and what breaks if you skip it. Each stage adds a capability while keeping the earlier boundaries intact from Chapter 5. By the end, the thing you deploy is the same logic you started with, wrapped in an interface that can be tested, observed, and operated.

The sequence is deliberately practical:

1. Create a skeleton and a reproducible environment.
2. Normalize multi-format input at the edge.
3. Stream output so long responses feel responsive.
4. Hide vendor differences behind one adapter interface.
5. Split realtime work from batch work.
6. Add caching, thinking, and model selection for control over cost and quality.
7. Promote the script into a service with health checks and runtime configuration.

Treat this as a layered build. A decision made early, such as keeping prompts in versioned files, is what makes a later decision, such as attaching a prompt version to a trace, trivial. The exam rewards the same habit: recognize which early choice enables the later requirement.

### Step 1: Project skeleton and environment setup

A good skeleton makes the right thing easy and the wrong thing awkward. The layout below separates concerns by directory so that a prompt author, an application developer, and an operator can each work without stepping on the others.

```text
contractlens/
  pyproject.toml
  .env.example
  README.md
  src/
    contractlens/
      __init__.py
      config.py            # typed settings, loaded at startup
      domain.py            # typed requests, results, failures
      orchestration.py     # the use-case sequence
      prompts/
        review_v3.txt      # immutable, versioned prompt templates
        registry.py        # maps version ids to file contents
      adapters/
        __init__.py
        model_base.py      # abstract model interface
        provider_a.py      # concrete adapter for first vendor
        provider_b.py      # concrete adapter for alternate vendor
        cache.py           # response cache with canonical keys
        tools/
          clause_lookup.py # versioned tool adapter
      input/
        normalize.py       # pdf, docx, text, html -> Document
      output/
        stream.py          # streaming writer and event types
      service/
        app.py             # HTTP handlers, thin by design
        health.py          # liveness and readiness checks
        worker.py          # batch queue consumer
      observability/
        trace.py           # trace record creation and storage
  tests/
    test_orchestration.py
    test_validation.py
    fakes.py               # fake model and fake tools
  deploy/
    service-config.json    # runtime configuration example
```

Several choices deserve attention.

- **Prompts live as files, not string literals.** A prompt is content that changes independently of code, so it needs its own file and its own version identifier. The registry maps an identifier such as `review_v3` to the file contents and never mutates them in place.
- **Adapters are grouped under one folder.** Every external dependency, whether a model vendor or a tool, has a place to live. Application code imports from `adapters.model_base`, not from a vendor SDK.
- **The service layer is thin.** Handlers parse requests and delegate. If a handler grows prompt text or retry logic, the boundary is leaking.
- **Fakes live with tests.** A deterministic fake model that returns a fixed typed result is what makes the orchestration layer testable without network calls.

Environment setup should be equally deliberate. Pin dependencies in `pyproject.toml`, keep a checked-in `.env.example` that lists required variable names with placeholder values, and never commit real keys. Load secrets from the environment or a secret manager at startup, validate that required values are present, and fail fast if not. Provide one repeatable command for the common flows: run the service, run the tests, and run a single-document smoke test.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env
export APP_ENV=development
python -m contractlens.service.app
python -m pytest tests/
```

> **Common mistake:** Letting a project grow without a pinned dependency set. A foundations exam may not ask about lockfiles directly, but scenario answers that favor reproducibility over convenience are usually the right ones.

### Step 2: Accepting multi-format input

Real documents arrive as plain text, PDF, word-processing files, and web pages. The model consumes text, so the edge of the system must convert each format into a single internal `Document` value with a stable shape. This is a classic adapter problem: many inputs, one internal representation.

Define the internal type once:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Document:
    text: str
    source_format: str
    page_count: int
    character_count: int
    truncated: bool = False
```

Then give each format a small converter that produces this type. The orchestration layer only ever sees `Document`, so adding a new format never touches the model code.

| Input format | Conversion approach | Typical pitfall |
| --- | --- | --- |
| Plain text | Read as UTF-8 with explicit error handling | Wrong encoding silently corrupts characters |
| PDF | Extract text per page and preserve page markers | Reading order can scramble columns and tables |
| Word document | Read the document body's text nodes | Headers, footers, and comments may be missed or included wrongly |
| HTML or web page | Strip markup and scripts, keep readable text | Navigation text drowns out the article |
| Image of text | Optical character recognition, then treat as text | Low confidence output needs a quality flag |

Two concerns dominate this step: fidelity and size. Fidelity means the extracted text actually represents what the document says. A PDF with two columns can produce interleaved text if extraction ignores layout, and the model will reason about nonsense. Size matters because context is finite and billed. A hundred-page document cannot be sent in one request, so the normalizer should report a `truncated` flag or hand off to a chunking strategy that the orchestration layer controls.

Carry provenance through normalization. Record the source format, the page or section boundaries, and any extraction warnings. When a later answer cites a clause, that citation should point back to a real location in the original document. This is the input-side counterpart of the traceability work from the previous chapter.

> **Exam note:** If a scenario mentions garbled answers for a particular file type, suspect the extraction step, not the prompt. The model can only reason about the text it receives.

Normalization is also where you decide what *not* to send. Remove repeated headers, hidden metadata, and boilerplate that consumes tokens without adding meaning. But be conservative: aggressive cleaning can delete a clause that matters. A good rule is to remove only content you can identify confidently as non-substantive, and to keep a record of what was removed.

### Step 3: Implementing streaming output

For a short answer, waiting for the whole response is fine. For a long document review, a user staring at a blank screen for several seconds assumes the system is broken. Streaming sends tokens as they are produced, so the interface shows progress immediately and feels responsive even when total time is unchanged.

At the boundary, streaming changes the shape of the result. Instead of returning one value, the adapter returns an iterator of events:

```python
from dataclasses import dataclass
from typing import Iterator

@dataclass(frozen=True)
class TextDelta:
    text: str

@dataclass(frozen=True)
class StreamDone:
    trace_id: str
    total_tokens: int

@dataclass(frozen=True)
class StreamError:
    reason: str
    retryable: bool
    trace_id: str

StreamEvent = TextDelta | StreamDone | StreamError

def stream_review(request) -> Iterator[StreamEvent]:
    ...
```

The consumer writes each `TextDelta` to the response as it arrives and stops cleanly on `StreamDone` or `StreamError`. Keeping the event types typed means the caller does not parse a proprietary streaming protocol; it just switches on three known cases.

Streaming introduces obligations that a single-response call does not.

- **Validation moves earlier or becomes two-phase.** You cannot validate a complete JSON object until it is complete. For structured output, either accumulate the stream and validate at the end, or use a format that is valid incrementally and still run a final check. Never hand partial JSON to downstream code as if it were final.
- **The error model changes.** A failure can happen after some text has already been sent. You cannot retract those tokens, so the client needs a clear terminal event indicating the stream ended incomplete. Designing for this avoids a UI that looks successful but quietly lost the ending.
- **Cancellation matters.** If the client disconnects, the server should stop generating rather than continue paying for tokens nobody will read. Wire the client's disconnect signal into the adapter's cancellation path.
- **Tracing still applies.** The trace is created before streaming starts, and the terminal event carries the same `trace_id`, so a partial stream is auditable too.

> **Common mistake:** Treating streaming as only a presentation trick and bolting it onto handlers. Because it changes validation and error handling, it belongs in the interface and orchestration layers, not just the UI.

Decide deliberately whether a given endpoint streams. Interactive requests usually benefit. Batch jobs usually do not, because there is no viewer to reassure and streaming adds complexity to retry logic. The choice is part of the contract, not an implementation detail.

### Step 4: Abstracting over more than one vendor

Vendor dependence is a business risk and a design smell. Models differ in price, speed, output style, tool-calling conventions, and availability. A system that can address more than one vendor through a single interface can route traffic, survive an outage, and compare quality on the same task.

The abstraction is an interface with a narrow set of operations, plus one adapter per vendor. Application code imports only the interface.

| Concern | What the shared interface exposes | What each adapter hides |
| --- | --- | --- |
| Request shape | Typed request with text and options | Vendor-specific message and parameter formats |
| Output | Typed result or typed failure | Vendor response envelopes and status conventions |
| Streaming | Iterator of typed events | Vendor streaming protocol and chunk format |
| Structured output | Schema reference and validation handoff | How the vendor expresses a schema constraint |
| Tool calls | Typed tool declarations and results | Vendor function-calling syntax |
| Authentication | Credentials injected at construction | Header names and token exchange details |
| Errors | Normalized retryable / non-retryable failure | Vendor error codes and rate-limit semantics |

A few rules keep the abstraction honest.

1. **Design the interface around your needs, not around any vendor's SDK.** If you copy a vendor's terminology into your interface, you have not abstracted anything; you have merely renamed a dependency.
2. **Normalize errors.** One vendor's rate limit and another's timeout should both become `retryable=True` failures your orchestration layer understands. Otherwise every retry decision needs vendor-specific branches.
3. **Keep differences as data.** If a vendor has a genuinely unique capability, represent it as an optional capability flag or a named option, not as a special method that leaks into every caller.
4. **Test all adapters against the same contract suite.** Run the same set of tests against each adapter's fake to prove they honor the interface.

Model selection builds naturally on this abstraction. Because the caller names a *capability*, not a product, the routing logic can map capabilities to concrete models per environment.

> **Exam note:** When an option proposes calling two vendor SDKs from different handlers and comparing strings, reject it. The correct design is one interface with adapters, so routing and comparison happen behind a stable seam.

### Step 5: Combining realtime requests with batch jobs

Not every request deserves the same treatment. A user waiting on an answer needs a fast, interactive path. A nightly run over ten thousand documents cares about throughput and cost, not immediate response. Treating both as the same kind of work produces a service that is slow under load and expensive to operate.

| Dimension | Realtime path | Batch path |
| --- | --- | --- |
| Trigger | A user action or API call | Schedule, queue message, or file arrival |
| Latency target | Seconds | Minutes to hours |
| Success signal | Response returned to caller | Job marked complete with results stored |
| Model choice | Faster, smaller model where acceptable | Higher-quality or cheaper-per-token model as appropriate |
| Streaming | Usually yes | Usually no |
| Retry strategy | Bounded, inline, with fallback | Queued with backoff, resumed from checkpoints |
| Failure visibility | Immediate error to caller | Alert, dead-letter queue, and operator dashboard |
| State | Short-lived session | Durable job record with progress |
| Cost control | Per-request limits | Budget caps and concurrency limits |

The two paths should share the same domain types, the same adapters, and the same validation. What differs is the orchestration around them. The realtime handler calls the model interface directly and returns a typed result or failure. The batch worker pulls a job, iterates over documents, writes results to storage, and updates progress. Reusing the core logic is what guarantees that a nightly review and an interactive review produce the same kind of answer.

A queue is the usual bridge. The realtime path can enqueue work when a request is too large for the latency budget, returning a job identifier immediately. This is a common and correct pattern: accept the request, do the work asynchronously, and let the caller poll or subscribe for completion. The key is that the job record carries the same trace metadata as an inline call, so auditability survives the handoff.

Idempotency matters more in batch. A worker that crashes halfway through must be able to restart without duplicating results. Give each job and each document within it a stable key, record completed items, and make writes idempotent. Combine this with bounded retries so a poison document cannot consume the queue forever; route repeated failures to a dead-letter path for inspection.

> **Common mistake:** Running batch workloads directly inside HTTP handlers to reuse code. This ties up request threads, makes latency unpredictable, and loses the durability that batch jobs need.

### Step 6: Adding caching, thinking, and model selection

The previous steps produce a correct system. These three additions make it efficient and controllable. Each is a lever with a cost, and the exam likes to test whether you know when *not* to use one.

#### Caching

Many requests repeat. The same document may be reviewed twice, or the same question asked with different wording. A cache stores a computed result under a key derived from the request so identical work is not repeated.

The hard part is the key. A cache key must include everything that can change the answer: the canonical input, the prompt version, the model version, the effective configuration such as temperature, and the enabled tools. Omit any of these and a configuration change can silently serve stale answers. A key built from a raw prompt string combined through string concatenation is fragile; build it from a canonical object and hash it.

Caching rules worth remembering:

- Cache only when the call is deterministic enough for reuse. A low-temperature, well-structured extraction is a good candidate; an open-ended creative answer is not.
- Attach an expiry and invalidate on prompt or model version changes. Including versions in the key already handles the common case.
- Respect privacy. Do not cache content belonging to one tenant under a key another tenant can reach, and include tenant scope in the key.
- Record cache hits in traces. A quality analysis that ignores cache hits can misattribute results to the wrong model version.

#### Extended thinking

Some models can spend extra computation before answering, often exposed as a "thinking" or reasoning budget. This helps on tasks with multi-step inference, tricky constraints, or careful arithmetic, at the cost of latency and token spend.

Treat thinking as a per-task setting, not a global default. A classification task with a controlled vocabulary rarely benefits. A review that must reconcile conflicting clauses across twenty pages may. Set the budget through configuration so it can be tuned per environment, and record the value in the trace, because changing it can change answers just as surely as changing the model.

> **Exam note:** If a scenario stresses a strict latency budget, increasing the thinking budget is usually the wrong move. Reach for a faster model, caching, or streaming first.

#### Model selection

Model selection means mapping a task to an appropriate model rather than using one model for everything. The mapping should be explicit, versioned, and observable.

A simple routing policy might look like this:

- Use a small, fast model for formatting, classification, and simple extraction.
- Use a larger model for judgments that require synthesis across a document.
- Use a fallback model only when the primary is unavailable, and record that it was used.
- Route batch work to a model optimized for cost per token when quality comparisons show it is adequate.

The route decision belongs in configuration or a small policy component, not scattered through handlers. Every trace must name the model actually used, because a fallback makes the configured primary misleading. Model selection and the abstraction from Step 4 fit together: the orchestration asks for a capability, the policy resolves it to a concrete model, and the adapter handles the specifics.

### Step 7: Promoting the script into a long-running service

A script runs once and exits. A service stays up, serves many callers, and must be operable by people who did not write it. Promotion is mostly about adding the operational shell around logic you already have: configuration at startup, health checks, graceful shutdown, concurrency limits, and structured logging.

A service configuration file gathers the runtime settings in one reviewable place. It mirrors the typed configuration object from the previous chapter but is supplied by the deployment environment rather than baked into code.

```json
{
  "service": {
    "name": "contractlens",
    "environment": "production",
    "request_timeout_s": 20,
    "max_concurrent_requests": 32,
    "max_attempts": 2
  },
  "model": {
    "default_capability": "document-review",
    "capabilities": {
      "document-review": { "provider": "provider-a", "snapshot": "2026-06-14" },
      "fast-extract": { "provider": "provider-b", "snapshot": "2026-05-30" }
    },
    "fallback": { "provider": "provider-b", "snapshot": "2026-06-02" },
    "thinking_budget_tokens": 0,
    "max_output_tokens": 800
  },
  "prompt": { "active_version": "review_v3" },
  "cache": { "enabled": true, "ttl_s": 120, "scope": "tenant" },
  "tools": { "enabled": ["clause_lookup@1.2"] },
  "queue": { "enabled": true, "max_batch_items": 500, "visibility_timeout_s": 120 },
  "observability": { "trace_sample_rate": 1.0, "log_level": "info" }
}
```

Notice what is present: pinned snapshots, an active prompt version, a versioned tool identifier, a thinking budget set to zero for a latency-sensitive path, and a tenant-scoped cache. Every one of these values can change an answer, so every one belongs in the fingerprint attached to traces.

Health checks let an operator or platform decide whether the service is working.

- **Liveness** answers "is the process alive and responsive?" It should be cheap and must not depend on external systems, or a vendor outage will cause needless restarts.
- **Readiness** answers "can this instance accept traffic?" It may check that configuration loaded, required secrets are present, and the queue connection is healthy.
- **Dependency checks** for the model vendor and tools should be reported separately, not folded into liveness. A degraded external dependency is a signal for routing or alerting, not for killing the process.

Graceful shutdown matters too. On a stop signal, the service should stop accepting new requests, finish in-flight work where possible, flush traces and logs, and release worker connections. A service that drops traces on shutdown breaks the audit story you built in the previous chapter.

Runtime configuration should be reloadable where safe, but changes must be recorded. Switching the active prompt version without a stamp makes past and future requests indistinguishable. Prefer a controlled reload that logs the old and new fingerprints and annotates subsequent traces.

> **Try it:** Add a readiness endpoint to a scratch service that verifies configuration loaded and secrets are present, then deliberately remove a required variable and watch the endpoint fail while liveness stays green. That distinction is the whole point.

## Worked scenario

### The situation

A document-processing pipeline reviews incoming contracts and returns a risk summary. The team has a hard latency budget: the median response must be under four seconds and the ninety-fifth percentile under eight seconds. Volume is uneven, with quiet mornings and sudden bursts after a batch upload. Initial measurements show a median of roughly nine seconds and frequent timeouts during bursts. The task is to bring the pipeline within budget without dropping the auditability or output quality the team relies on.

### Breaking down the latency

The first move is measurement, not guessing. Instrumented traces show three contributors:

1. Extraction of text from large PDFs takes about one second on average and much longer on scanned files.
2. Generation dominates: eight seconds for a full review with a large model and a generous thinking budget.
3. Queueing during bursts adds several seconds because requests share a small pool of model calls.

The traces also reveal that roughly forty percent of incoming documents are exact repeats of ones reviewed earlier in the day.

### Applying the levers in order

The team works through a deliberate sequence, choosing changes that attack the largest contributor first.

**Reframe the request path.** Very large documents are no longer reviewed inline. The handler extracts text, checks a size threshold, and if the document is too large, enqueues a batch job and returns a job identifier immediately. The caller polls for the result. This removes the worst extraction and generation cases from the latency distribution entirely, because they are no longer on the measured interactive path. The job record carries the same prompt, model, tool, and config identifiers as an inline call, so auditability is preserved.

**Turn on caching with a correct key.** The cache key includes a hash of the normalized document, the active prompt version, the model snapshot, the temperature, and the enabled tool versions, scoped by tenant. The forty percent repeat rate now returns in milliseconds. Cache hits are recorded in traces, so quality monitoring can still segment them correctly.

**Reduce the thinking budget on the interactive route.** The traces showed that the large thinking budget was spent on tasks that a controlled-vocabulary schema already constrained. Setting the interactive budget to zero and reserving thinking for the batch route cuts generation time substantially. The batch path keeps the higher budget because it has no interactive deadline.

**Route by capability.** Simple fields, such as document type and language, move to a fast small model through the capability router. Only the risk-summary step uses the larger model. Because both vendors sit behind the same interface, this is a configuration change to the capability map rather than a rewrite.

**Add streaming for the remaining interactive reviews.** The total generation time does not fall much for the summary step, but the user sees text immediately rather than after a long blank wait. Perceived responsiveness improves, and the terminal stream event carries the trace identifier so partial streams remain auditable.

**Bound concurrency and retries.** The service sets a maximum number of concurrent model calls and a two-attempt retry limit. Excess requests are queued rather than all competing at once, which removes the burst-driven queueing spikes. Fallback to the alternate vendor is recorded explicitly in each trace.

### Result and reasoning

After the changes, the measured median falls to about two seconds and the ninety-fifth percentile to just over six seconds, inside the budget. Quality checks on a held-out set show no meaningful regression for the interactive summary, because the schema still constrains output and the harder cases moved to the more thorough batch route rather than being weakened.

The lesson is the order of operations. The team did not begin by swapping in a different model or shortening the prompt. They measured, then attacked the largest contributors with structural changes: moving unsuited work off the interactive path, avoiding repeated work, matching the thinking budget to the task, and controlling concurrency. Each change was chosen because the trace data pointed at it, and each preserved the version stamping that makes answers auditable.

> **Exam note:** A latency question with several plausible options usually rewards the structural answer: move work off the critical path, avoid duplicate work, or match the model to the task. "Add more compute" is rarely correct when a deadline is the constraint.

## Common mistakes

- Beginning implementation before defining the internal document type and versioned prompt identifiers.
- Scattering vendor SDK calls through handlers instead of hiding them behind one adapter interface.
- Building cache keys from raw prompt text while omitting model version, configuration, or tenant scope.
- Letting a cache serve answers from an old prompt or model version after a rollout.
- Treating streaming as a UI-only feature and ignoring its effect on validation, errors, and cancellation.
- Handing partial streamed JSON to downstream code as if it were a validated result.
- Running large batch workloads inside request handlers.
- Sending every available tool to the model on every request.
- Applying a large thinking budget globally, even on latency-sensitive or simple classification tasks.
- Folding vendor health into liveness checks, causing restarts during an external outage.
- Changing active prompt or model versions at runtime without recording the change in traces.
- Dropping traces and logs during shutdown, breaking the audit trail at the worst moment.

## Chapter summary

- Start with a skeleton that separates prompts, adapters, domain logic, service code, and tests, backed by a pinned, reproducible environment.
- Normalize every input format into one typed `Document`, carrying provenance and watching for fidelity and size limits.
- Streaming improves perceived responsiveness but requires typed events, careful validation, clear terminal errors, cancellation, and tracing.
- A single vendor-neutral interface with one adapter per vendor enables routing, fallback, and comparison without leaking SDK details.
- Realtime and batch paths should share core logic while differing in trigger, latency target, retry strategy, and state handling.
- Caching, thinking budgets, and model selection are levers with costs; apply them per task and record their values in traces.
- Promotion to a service adds startup configuration, liveness and readiness checks, graceful shutdown, and controlled runtime changes.
- For latency budgets, measure first, then move unsuited work off the critical path, avoid duplicates, and match models to tasks.

## Checkpoint questions

1. Why should prompt templates live in versioned files rather than inline string literals?

   - A. Files are easier to print.
   - B. Prompts change independently of code and need a stable identifier for tracing and audit.
   - C. Inline strings cannot be sent to a model.
   - D. Files reduce the number of tokens in a prompt.

2. A PDF review produces garbled answers while plain-text reviews are fine. What is the most likely cause?

   - A. The model version is wrong.
   - B. The prompt needs more examples.
   - C. Text extraction from the PDF is preserving poor reading order or layout.
   - D. The cache is enabled.

3. Which statement about streaming is correct?

   - A. Streaming shortens total generation time.
   - B. Streaming removes the need for validation.
   - C. Streaming changes validation, error handling, cancellation, and tracing, not just presentation.
   - D. Streaming is only useful in batch jobs.

4. What is the main benefit of a single vendor-neutral model interface with per-vendor adapters?

   - A. It makes every vendor produce identical text.
   - B. It lets routing, fallback, and testing happen behind one stable seam.
   - C. It eliminates the need for a schema.
   - D. It guarantees lower cost.

5. Which cache key is most defensible for a model response?

   - A. The raw prompt string only.
   - B. The document text only.
   - C. A hash of the canonical input plus prompt version, model snapshot, configuration, enabled tools, and tenant scope.
   - D. The current timestamp.

6. For a request with a strict eight-second latency budget, which change is most appropriate first?

   - A. Increase the thinking budget to improve quality.
   - B. Move oversized documents to an asynchronous batch path and cache repeated inputs.
   - C. Send every available tool so the model can answer in one step.
   - D. Remove all tracing to reduce overhead.

7. What distinguishes a liveness check from a readiness check?

   - A. Liveness checks the vendor API; readiness checks the database.
   - B. There is no difference; they are synonyms.
   - C. Liveness shows the process is responsive without external dependencies; readiness shows the instance can accept traffic.
   - D. Readiness restarts the process; liveness does not.

8. A fallback model handled a request during an outage. What must the trace record?

   - A. Only the primary model that was configured.
   - B. The model actually used, with its snapshot, so the record reflects what happened.
   - C. Nothing, because fallback is invisible to callers.
   - D. Only the response text.

### Answers and rationale

1. **B is correct.** Prompts are content that evolves separately from code; a file with an immutable identifier supports version stamping, rollback, and audit. A is irrelevant. C is false because inline strings work perfectly well with models. D is false because file storage does not change token count.

2. **C is correct.** When one format fails and others succeed, the format-specific conversion step is the prime suspect; poor reading order feeds nonsense to the model. A would affect all formats. B might change answers but would not explain the format-specific pattern. D is not indicated by the symptom.

3. **C is correct.** Streaming alters where validation happens, how partial failures are signalled, how cancellation works, and how traces are closed. A is false because total generation time is roughly unchanged. B is false because final validation is still required. D is backwards; batch jobs rarely benefit from streaming.

4. **B is correct.** The interface is the seam that makes routing, fallback, and fake-based testing possible without touching callers. A is false because models keep their distinct behavior. C is false because schemas are still needed. D overpromises; an interface enables cost decisions but does not guarantee savings.

5. **C is correct.** Every input that can change the answer must be part of the key, plus tenant scope for isolation. A and B omit versions and configuration, risking stale or cross-tenant results. D produces a key that never repeats, defeating caching.

6. **B is correct.** Moving unsuited work off the critical path and avoiding duplicate work attack latency structurally while preserving quality and audit. A increases latency. C adds cost and distraction without addressing the budget. D removes the evidence needed to diagnose and would harm auditability.

7. **C is correct.** Liveness must avoid external dependencies so an outage does not trigger pointless restarts; readiness may check that configuration and connections are usable. A is wrong because liveness should not call the vendor. B is false; the two serve different purposes. D is false; neither check necessarily restarts a process.

8. **B is correct.** Traces must record effective values, including the fallback actually used, or the record is confidently wrong. A describes intent rather than reality. C ignores an audit requirement. D lacks the version metadata needed for reproduction.

---

*End of chapter 6.*
