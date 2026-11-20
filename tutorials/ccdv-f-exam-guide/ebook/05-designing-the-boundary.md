# Chapter 5 — Designing Interfaces, Schemas, Sessions, and Configuration

## Learning objectives

By the end of this chapter you should be able to:

- Explain why a clean boundary between application code and the model is the foundation of a testable, replaceable system.
- Describe the layers of a model-backed application and state what each layer is allowed to know.
- Design interface contracts with typed inputs and typed outputs instead of passing loose strings across the boundary.
- Use a JSON schema to describe a structured response and explain how validation turns a model output into a trustworthy value.
- Decide where session state lives and which component owns it.
- Define plugin and extension boundaries so new capabilities can be added without rewriting the core.
- Manage configuration across development, test, and production environments without scattering switches through the code.
- Build traceability into a request so any response can be tied back to the exact prompt, model, and tool versions that produced it.
- Reason through a migration from a local script to a long-running service while preserving auditability.

## Key concepts

### Why the boundary is the whole design problem

A model is an unusual dependency. It is called like a function, but it behaves more like a remote, nondeterministic colleague who reads whatever you send and answers in their own words. If application code talks to that dependency directly from every corner of the program, the result is hard to test, hard to change, and almost impossible to audit. The single most useful design move you can make is to draw an explicit boundary: a narrow, well-defined seam between the code you control and the model you do not.

Think of the boundary as a contract with two jobs. First, it translates the messy outside world into a clean internal representation. Second, it translates the model's free-form output back into a value the rest of the program can trust. Everything on the application side of that seam is deterministic, unit-testable code. Everything on the other side is an untrusted generator whose output must be checked before it is believed.

Three benefits follow from a single well-placed boundary.

- **Replaceability.** If the vendor changes, you rewrite one adapter rather than fifty call sites.
- **Testability.** You can substitute a fake model that returns a fixed value and test the surrounding logic in milliseconds.
- **Auditability.** One choke point is the one place where you can record what version of everything was used for each request.

> **Exam note:** Scenario questions often describe a system with model calls scattered across handlers, then ask what to change first. The expected answer is almost always to introduce a single interface or adapter layer, because that one change makes the other improvements possible.

### A layered architecture to hang your design on

A useful mental model is a set of layers, each with a narrow responsibility and a strict rule about what it may see. The exact names are not important; the separation of concerns is. The table below describes a practical arrangement.

| Layer | Owns | Must not do | Why it matters |
| --- | --- | --- | --- |
| Transport / entry point | HTTP routes, queue consumers, CLI commands; parsing the external request | Contain business rules or model calls | Keeps protocol changes away from logic |
| Application / orchestration | The use case: sequence of steps, retries, decisions | Know the vendor's wire format | This is where behavior lives and is tested |
| Model interface | Typed request in, typed output out; validation, prompt assembly, metadata stamping | Implement domain policy | One stable seam that can be faked or swapped |
| Tool / plugin adapters | Calls to external capabilities with typed arguments and results | Reach into application state directly | Makes capabilities replaceable and auditable |
| State / session store | Conversation history, working memory, idempotency keys | Decide what the model should think | State is data, not behavior |
| Model / provider (external) | The actual generation | Anything inside your trust boundary | Treated as untrusted input source |
| Configuration and observability (cross-cutting) | Settings, versions, logs, traces | Own business logic | Supplies context to every other layer |

Read the "must not do" column carefully, because exam options frequently violate one of these rules while sounding efficient. A handler that formats a prompt is cheating the orchestration layer out of testability. A tool adapter that writes directly to the database breaks the ownership rule for state. A configuration module that decides retry counts based on the content of a response has quietly become business logic wearing a config costume.

The arrows of dependency should point inward toward the stable parts. The orchestration layer depends on the abstract model interface, not on a concrete vendor SDK. The interface depends on schema definitions, not on a database. When a lower, more volatile detail needs to reach an upper layer, it does so through an explicit value passed back through the boundary, never through a hidden global.

> **Common mistake:** Treating the model SDK client as the interface. The SDK is a transport detail with a changing API. Your interface is the small, stable, typed function that *you* define around it.

### Interface contracts and typed outputs

An interface contract is the agreed shape of the conversation across the boundary. The weakest version is a function that takes a string and returns a string:

```python
def ask(prompt: str) -> str:
    ...
```

This is convenient for a first experiment and dangerous for anything you intend to keep. A string carries no information about what the caller must supply, what the caller will receive, or how failures are reported. Two callers can pass structurally different text and both compile. The model can return prose where a label was expected and nothing in the type system complains.

A stronger contract makes both sides explicit. The request becomes a structured object with named fields; the response becomes a structured result that distinguishes success from failure.

```python
from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class ReviewRequest:
    document_text: str
    focus: str
    language: str = "en"
    max_points: int = 8

@dataclass(frozen=True)
class ReviewResult:
    points: list[str]
    risk_level: str
    summary: str
    prompt_version: str
    model_version: str

@dataclass(frozen=True)
class CallFailure:
    reason: str
    retryable: bool
    trace_id: str
```

The return type can be expressed as `ReviewResult | CallFailure`, which forces every caller to handle the failure branch. This is a real improvement over exceptions alone, because a typed failure can carry structured information such as whether retrying makes sense and which trace to inspect.

A good contract follows a few rules.

1. **Inputs are values, not instructions.** Pass the document and the focus as fields; do not ask the caller to embed them in a sentence.
2. **Outputs are data, not prose.** Even when the underlying model writes sentences, wrap them in named fields before they leave the interface.
3. **Failures are part of the contract.** Nondeterministic dependencies fail in more ways than a database. Rate limits, timeouts, refusals, and malformed outputs all need a representation.
4. **Metadata is part of the contract.** Version identifiers travel with the result so downstream code can attach them to a record without an extra lookup.

> **Try it:** Take one model call in a scratch project and write down the exact fields the caller truly needs. Replace the string-in/string-out function with a typed request and result. Note how many implicit assumptions become explicit.

### Schemas for structured responses and validation

Typed Python objects describe the *internal* contract. A JSON schema describes the *wire* contract you ask the model to satisfy. Many model APIs can be steered to produce output that conforms to a supplied schema, and even when they cannot enforce it, the schema still gives your validator something precise to check against.

Here is a schema for a structured document review. It demonstrates the features that matter in practice: a closed set of allowed values, required fields, additional properties forbidden, and bounds on arrays.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "DocumentReview",
  "type": "object",
  "required": ["points", "risk_level", "summary"],
  "additionalProperties": false,
  "properties": {
    "points": {
      "type": "array",
      "minItems": 1,
      "maxItems": 8,
      "items": { "type": "string", "minLength": 1 }
    },
    "risk_level": {
      "type": "string",
      "enum": ["low", "medium", "high"]
    },
    "summary": {
      "type": "string",
      "minLength": 20,
      "maxLength": 600
    }
  }
}
```

Why each choice matters:

- `additionalProperties: false` stops the model from inventing extra keys that your code would silently ignore, hiding the fact that it misunderstood the task.
- `enum` on `risk_level` converts a free-text judgment into a controlled vocabulary you can index, filter, and test.
- `minItems` and `maxItems` bound the array so one runaway response cannot flood downstream storage.
- Bounds on the summary length catch both empty answers and essays that blow a storage or display limit.

Validation is the act of checking the model's output against this schema and reacting deliberately when it does not fit. Never treat validation as a formality. A production boundary should assume that some fraction of outputs will fail it, because generation is probabilistic and prompts drift.

| Validation outcome | Meaning | Recommended action |
| --- | --- | --- |
| Valid and within bounds | Output conforms to the schema | Accept and stamp with metadata |
| Structurally valid, semantically odd | Types fit but values are implausible | Route to a low-confidence path or human review |
| Schema violation, retryable | Missing field, wrong enum, bad JSON | Retry once with the validation error fed back |
| Schema violation, persistent | Repeated failure after retry | Return typed failure, keep the trace, alert |
| Refusal or safety stop | Model declined the request | Return a specific failure reason, do not retry blindly |

Notice that "retry" is a *bounded* action. Unbounded retry loops against a nondeterministic generator are a classic way to turn a small error rate into a large bill. Cap the attempts, and make each retry smarter by including the validation feedback in the corrected request.

> **Common mistake:** Assuming that because a schema was supplied to the model, the returned text is already validated. Supplying a schema improves the odds; your code still has to parse and check the output before trusting it.

Validation also has a security dimension. A schema prevents unexpected fields, but it does not sanitize the *content* of string fields. If a string will later be rendered in a web page, inserted into a query, or passed to a shell, it still needs the ordinary escaping appropriate to that destination. The schema controls shape, not safety.

### Session design and state ownership

A single request is simple. A conversation, a multi-step task, or an assistant that remembers earlier choices introduces state, and state raises the question nobody can dodge: who owns it?

The tempting answer is "the model," because the conversation appears to flow naturally when you keep resending the whole transcript. But the model owns nothing. It has no memory between calls; it only sees the tokens you send. The transcript is data held by *your* application, and your application decides what to include, how long to keep it, and when to discard it.

A session is a named container for that data. A practical session record holds:

- A session identifier that is opaque to the caller and generated by the server.
- An ordered list of messages with roles and timestamps.
- A compact summary of older turns, if the transcript is long.
- Pointers to external artifacts, such as document identifiers, rather than the artifacts themselves.
- A state status such as active, parked, or expired.
- Version markers for the prompt and configuration under which the session began.

The ownership table below helps when a design question asks where a piece of state belongs.

| Kind of state | Preferred owner | Rationale |
| --- | --- | --- |
| Full message transcript | Server-side session store | Survives client restarts; cannot be tampered with by the caller |
| Short-lived working notes for one task | Application layer | Needed only during the current orchestration |
| User preferences and profile facts | Application database, assembled into context | Authoritative source is your system, not the chat |
| Idempotency keys and retry counters | Request layer or queue | Prevent duplicate work and bound retries |
| Version and trace identifiers | Attached to every message/event | Required for audit and reproduction |
| Cached model responses | Cache keyed on a canonical request | Improves latency; must respect privacy and expiry |

Two principles keep session design sane. First, the client may *reference* a session but should not be trusted to *supply* its contents. A client that sends the entire history back on every request can alter what the model believes happened. Store the transcript server-side and send only an identifier and the new turn. Second, decide a retention policy up front. History that grows without bound increases cost, latency, and the chance that stale instructions influence new answers.

Summarization is the usual tool for long sessions. When the transcript exceeds a threshold, replace older turns with a compact summary plus the most recent messages. Be explicit about what the summary may and may not change: it should preserve decisions and constraints, not introduce new facts. A summary is itself a generated artifact, so it needs a version stamp and, in sensitive systems, a validation step.

> **Exam note:** If an option says the model "remembers" prior turns on its own, reject it. Memory is an application responsibility implemented by storing and replaying context.

#### Session isolation and multi-tenancy

When more than one user or tenant shares the service, the session identifier must be scoped. A lookup that filters only on session ID can let one tenant read another's transcript. Scope every query by tenant, include that scope in cache keys, and never place raw session contents in a URL where they can be logged or shared. This is a design concern, not an afterthought, because the boundary is where the tenant context enters the model call.

### Plugin and extension boundaries

A plugin, tool, or extension is any capability the model can invoke that lives outside the core generation step: a calculator, a search index, a database lookup, a ticket creator. The boundary here is as important as the boundary around the model itself, because a tool is another place where untrusted text meets privileged code.

The core rules are:

1. **Describe capabilities with typed schemas.** Each tool should declare its name, a precise description, and a JSON schema for its arguments. Vague descriptions cause the model to call the wrong tool or fill arguments with guesswork.
2. **Treat tool arguments as untrusted.** Validate them against the schema before use. The fact that the model produced them does not make them safe.
3. **Keep execution in an adapter.** The adapter checks permissions, performs the call, and returns a typed result. Application policy stays out of the adapter; execution mechanics stay out of the orchestration layer.
4. **Return compact, structured results.** Feed back only what the model needs. A tool that dumps an entire database row into the conversation wastes context and leaks fields.
5. **Make tools versioned.** A change in a tool's behavior or output shape is a change that must be recorded, for the same reason a model version must be recorded.

A clean extension boundary also defines *when* the model may call a tool. Some systems allow free choice among a tool registry; others expose only a small allow-list per request. Narrower is safer: the orchestration layer should choose the available tools for this specific task rather than handing the model the entire catalog. A summarization task rarely needs the ticket-creation tool.

> **Common mistake:** Letting a tool adapter perform authorization by trusting a flag in the model's arguments. Authorization belongs to the application using the real caller identity; the model's output is a request, not a permission.

Errors from tools deserve special thought. A failed tool call should return a typed, structured error to the model where appropriate, so it can recover or explain, but the raw exception with stack details should stay in your logs. Feed back the smallest useful fact, such as "the order was not found," not the connection string that failed.

### Configuration management across environments

Configuration is everything that varies without a code change: model names, endpoints, temperature, timeouts, feature switches, prompt identifiers, retry limits, and tool allow-lists. The goal is that the same artifact can move from development to test to production with only configuration changing, and that every value has one authoritative home.

The anti-pattern is scattering literals through the code. When a model name appears in six files, a rollout becomes a scavenger hunt and an audit cannot say which model handled a given request. Instead, gather settings into a typed configuration object loaded at startup, with environment-specific overlays layered on a safe baseline.

```python
from dataclasses import dataclass, asdict
import hashlib, json, os

@dataclass(frozen=True)
class ServiceConfig:
    environment: str
    model_name: str
    prompt_version: str
    max_output_tokens: int
    temperature: float
    request_timeout_s: float
    max_attempts: int
    enabled_tools: tuple[str, ...]
    cache_ttl_s: int

    @classmethod
    def from_environment(cls) -> "ServiceConfig":
        return cls(
            environment=os.environ["APP_ENV"],
            model_name=os.environ["MODEL_NAME"],
            prompt_version=os.environ["PROMPT_VERSION"],
            max_output_tokens=int(os.getenv("MAX_OUTPUT_TOKENS", "800")),
            temperature=float(os.getenv("TEMPERATURE", "0.2")),
            request_timeout_s=float(os.getenv("REQUEST_TIMEOUT_S", "20")),
            max_attempts=int(os.getenv("MAX_ATTEMPTS", "2")),
            enabled_tools=tuple(
                t for t in os.getenv("ENABLED_TOOLS", "").split(",") if t
            ),
            cache_ttl_s=int(os.getenv("CACHE_TTL_S", "120")),
        )

    def fingerprint(self) -> str:
        payload = json.dumps(asdict(self), sort_keys=True).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()[:16]
```

A few design choices are worth naming. Required settings use `os.environ[...]` and fail fast at startup if missing; optional settings use `os.getenv` with a documented default. The object is frozen, so no handler can quietly mutate the effective configuration mid-process. The `fingerprint` method reduces the whole configuration to a short hash, which can be attached to every trace. That single string lets you answer "did this run use the production settings?" without storing a full config blob per request.

| Environment | Typical model setting | Prompt version | Retry limit | Tool allow-list |
| --- | --- | --- | --- | --- |
| Development | Cheap, fast model | Latest draft | 1 | All tools including debug tools |
| Test / staging | Same model as production | Candidate version | 2 | Production tools plus test fixtures |
| Production | Pinned, validated model | Approved version | 2–3 | Approved tools only |

The important discipline is that production values are *pinned*, not floating. "Latest model" is acceptable in development and unacceptable where reproducibility matters. Pin the model version and the prompt version together, because a behavior change can come from either.

Configuration also has a lifecycle. Settings should be validated at startup, changed through a controlled process, and recorded when they change. A runtime switch that flips a prompt version without leaving a trace breaks auditability. If you need dynamic behavior, make the switch itself a versioned value and stamp requests with the value actually used.

> **Exam note:** When a scenario mentions inconsistent behavior between environments, look for an unpinned model or prompt version before blaming the code. Configuration drift is a frequent root cause.

### Traceability: tying a response back to its inputs

Traceability is the property that lets you take any stored response and answer: which prompt produced it, which model and version generated it, which tools were available, which configuration was active, and which request triggered it. Without it, debugging a foundations-level system is guesswork, and an audit request is unanswerable.

A trace record is assembled at the boundary, where all the relevant values are in hand. It should be created *before* the call so that failures are traceable too, not only successes.

| Trace field | Captures | Why you need it |
| --- | --- | --- |
| `trace_id` | Unique identifier for this one call | Correlates logs, metrics, and stored output |
| `request_id` | Identifier from the caller | Links the call to the external transaction |
| `prompt_version` | Immutable identifier of the prompt template | Explains wording and instruction changes |
| `model_name` and `model_version` | Exact model and snapshot | Explains behavior changes from upgrades |
| `tool_versions` | Map of tool name to version | Explains changes in external capabilities |
| `config_fingerprint` | Hash of effective configuration | Captures temperature, limits, switches |
| `session_id` | Owning session, if any | Reconstructs the context window |
| `input_hash` | Hash of the canonical input | Detects duplicate or changed inputs |
| `timestamps` and latency | Start, end, duration | Supports latency-budget analysis |
| `outcome` | Success, validation failure, refusal, timeout | Groups failures without reading prose logs |

Two habits make this practical. First, store the prompt text referenced by `prompt_version` in an immutable location, so the identifier resolves to real content later. Second, record the *effective* values, not the intended ones. If a fallback model was used because the primary timed out, the trace must say the fallback was used. A trace that describes what was configured rather than what happened is worse than no trace, because it is confidently wrong.

Traceability is also what makes evaluation meaningful. When a quality metric drops on Tuesday, the trace fields let you divide results by prompt version, model version, and tool version to find the single change responsible. Without those dimensions, all you can say is that quality dropped.

> **Common mistake:** Logging the model's raw request and response but omitting version metadata. The text is bulky, often contains sensitive data, and still cannot tell you which prompt or tool version was in play.

### Putting the pieces together

The layers, contracts, schemas, sessions, plugins, configuration, and traces are not separate topics; they interlock. The interface layer uses schemas to validate output and stamps results with version metadata. The configuration layer supplies the pinned versions. The session layer supplies prior context and receives the updated context. The tool adapters report their own versions. The orchestration layer coordinates all of it and owns the use-case behavior. When you design one piece, ask what it must hand to the others. That question is the essence of boundary design, and it is exactly the kind of reasoning the exam rewards.

## Worked scenario

### The situation

A developer has a local script that reviews contract documents. It builds a prompt by string concatenation, calls the model SDK directly, prints the response to the terminal, and calls a helper that looks up clauses in a local file. The script works well enough that a team wants to offer it as an internal HTTP service. The requirement is explicit: after the move, every stored review must be auditable, meaning a reviewer must be able to reconstruct the prompt, model, tools, and settings that produced it. The current script cannot do this, because nothing is recorded and the values are hardcoded.

### Analyzing the gaps

Walking through the current script against the layer table exposes five problems.

1. The prompt is assembled inside the script body, so there is no prompt version to reference.
2. The model name is a literal in one place, and nothing records which snapshot actually answered.
3. The response is printed as prose, so there is no typed, validated result to store.
4. The clause helper is imported directly and has no version, so a change to it would silently change past interpretations.
5. There is no request or trace identifier, so logs cannot be correlated with stored output.

### The resolution

The developer does not rewrite the logic; they wrap it in boundaries.

Step one is to extract the prompt into a versioned template with an identifier such as `contract-review-v3`. The template lives in an immutable store, and the code references it by identifier. The script no longer builds instructions from scattered strings.

Step two is to introduce the model interface. A `review_document(request: ReviewRequest) -> ReviewResult | CallFailure` function becomes the only path to the model. Inside it, the SDK call is wrapped, the JSON output is parsed and checked against the `DocumentReview` schema, and the typed result is returned. The orchestration code never sees the SDK again.

Step three is to turn the clause helper into a tool adapter with a declared version, say `clause-lookup-v1.2`. Its arguments are validated before use, and it returns only the matching clauses with their identifiers. Its version is added to the tool version map on every trace.

Step four is to gather settings into the typed `ServiceConfig` and pin them per environment. Production uses an approved model snapshot, `contract-review-v3`, and a two-attempt retry limit. The config fingerprint is computed once at startup.

Step five is to create a trace record at the start of every call. It carries a fresh `trace_id`, the incoming `request_id`, the prompt identifier, model name and version, the tool version map, the config fingerprint, and timestamps. On success it also carries `input_hash` and the outcome; on validation failure it carries the failed attempt count. The stored review and the trace share the same `trace_id`.

The HTTP handler is now thin. It parses the external request, obtains a session identifier, calls the orchestration function, and maps the typed result or failure to a response. It contains no prompt text and no model name.

### Why this satisfies the requirement

Auditability falls out of the boundaries rather than being bolted on. Because there is one model interface, there is exactly one place where version metadata is attached, and no call can bypass it. Because the configuration is pinned and fingerprinted, the settings for a run are known. Because the tool is versioned, a later change to clause lookup cannot rewrite history. Because prompts are immutable and referenced by identifier, "which prompt produced this?" has a concrete answer. A reviewer can now take any stored review, read its `trace_id`, and reconstruct the full context of the generation.

If the team later switches vendors, they write a new implementation of the model interface, keep the same schemas and prompt identifier where possible, and re-run a small comparison set. The rest of the service is untouched, and the trace format continues to work. That is the payoff of designing the boundary first.

> **Exam note:** The exam often frames a migration as a choice between "add logging everywhere" and "introduce a boundary that emits structured metadata." The boundary answer is correct because it scales and cannot be forgotten at a call site.

## Common mistakes

- Letting handlers or routes assemble prompts and call the model SDK directly, which destroys the single choke point.
- Treating the SDK client as your interface, leaving you exposed to vendor API changes at many call sites.
- Returning raw strings from the model layer and relying on callers to parse them.
- Supplying a response schema but never validating the returned output against it.
- Retrying schema violations indefinitely instead of a bounded number of times with feedback.
- Assuming the model remembers prior turns; the application must store and replay context.
- Allowing the client to send the full conversation history, which lets it alter what the model believes.
- Giving the model every available tool on every request instead of a task-specific allow-list.
- Trusting authorization decisions embedded in model-generated tool arguments.
- Using "latest" model or prompt values in production, making behavior impossible to reproduce.
- Logging prompt and response text but omitting version and configuration metadata.
- Recording intended configuration rather than the effective values actually used, including fallbacks.

## Chapter summary

- A clean boundary between application code and the model gives you replaceability, testability, and auditability.
- Layer the system so the orchestration logic depends on an abstract model interface, never on a concrete SDK.
- Interfaces should carry typed requests, typed results, and typed failures, with metadata included in the result.
- JSON schemas describe the wire contract; validation turns untrusted generation into trustworthy data.
- Validation outcomes range from accept to bounded retry to typed failure, each with a defined action.
- Sessions are application-owned data; the model has no memory of its own.
- Tools and plugins need typed schemas, validated arguments, narrow allow-lists, and version identifiers.
- Configuration belongs in one typed object with pinned production values and an environment overlay.
- A configuration fingerprint and a rich trace record let any response be tied to its prompt, model, tools, and settings.
- Moving a script into a service preserves auditability when the migration is organized around these boundaries.

## Checkpoint questions

1. A team has model calls in five different route handlers and wants to add version tracking with the least risk. What should they do first?

   - A. Add a log statement to each handler recording the model name.
   - B. Introduce a single typed model interface and move all calls behind it.
   - C. Pin the model version in a configuration file.
   - D. Increase the retry count on each call.

2. Which of the following is the strongest reason to avoid a string-in/string-out model function?

   - A. Strings are slower to serialize than objects.
   - B. Strings cannot be logged.
   - C. It hides the required inputs, expected output shape, and failure modes from the type system.
   - D. Models do not accept strings as input.

3. In a JSON schema for a structured response, what does `additionalProperties: false` accomplish?

   - A. It allows the model to add any extra field it likes.
   - B. It rejects unexpected extra keys that would otherwise be silently ignored.
   - C. It makes all fields optional.
   - D. It limits the length of string values.

4. A model returns valid JSON but the `risk_level` value is `"severe"`, which is not in the schema's enum. What is the best response?

   - A. Store it as-is because the JSON parsed successfully.
   - B. Rename it silently to `"high"` in the database.
   - C. Treat it as a schema violation, retry once with validation feedback, then return a typed failure if it persists.
   - D. Increase the temperature and retry without limit.

5. Who owns conversation state in a well-designed system?

   - A. The model, which remembers prior turns between calls.
   - B. The client, which should resend the full history every time.
   - C. The application, which stores and replays context under a scoped session identifier.
   - D. The vendor's API, which caches conversations automatically.

6. Which configuration practice best supports reproducibility in production?

   - A. Using the newest model available at request time.
   - B. Pinning the model and prompt versions and recording a configuration fingerprint on each trace.
   - C. Reading settings directly from each handler at call time.
   - D. Changing prompt text without a version identifier.

7. When a tool call fails, what should be fed back to the model?

   - A. The full stack trace and connection details.
   - B. Nothing; the model should never see errors.
   - C. A compact structured error with the smallest useful fact, while detailed diagnostics stay in logs.
   - D. The entire database contents so the model can find the answer itself.

8. Which trace field specifically lets you detect behavior changes caused by a configuration shift?

   - A. `summary`
   - B. `config_fingerprint`
   - C. `points`
   - D. `language`

### Answers and rationale

1. **B is correct.** A single typed interface creates the choke point where version metadata can be attached once and enforced for every call. A is weaker because scattered log statements are easy to forget and do not change the architecture. C is useful but pins only the model, not prompts or tools, and does not by itself capture per-request metadata. D is unrelated and can make the problem worse by amplifying calls.

2. **C is correct.** Loose strings hide the contract: what fields are required, what shape comes back, and how failure is signalled. A is irrelevant to correctness. B is false because strings are easy to log. D is false because models do accept strings; the issue is not acceptance but the loss of structure.

3. **B is correct.** Forbidding additional properties makes unexpected keys visible instead of silently discarding them. A is the opposite of the setting's effect. C confuses this with required fields, which are controlled by the `required` keyword. D is controlled by string length keywords such as `maxLength`.

4. **C is correct.** A value outside the enum is a schema violation even though the JSON parsed. A bounded retry with validation feedback is the standard recovery, followed by a typed failure. A ignores the violation. B invents data and corrupts meaning. D removes the bound that keeps cost predictable.

5. **C is correct.** The application stores history, scopes it by tenant, and decides what context to replay; the model is stateless between calls. A is a common misconception about model memory. B is unsafe because a client can alter the transcript. D is false; vendor APIs do not manage your conversational memory for you.

6. **B is correct.** Pinning versions prevents silent drift, and a fingerprint records the effective settings on each request. A introduces exactly the drift reproducibility requires avoiding. C scatters configuration and loses a single authoritative source. D removes the identifier needed to resolve a prompt later.

7. **C is correct.** A compact error lets the model recover without leaking internals, while full diagnostics belong in access-controlled logs. A leaks sensitive implementation detail into the conversation. B throws away useful recovery information. D wastes context and exposes data far beyond the task.

8. **B is correct.** A hash of the effective configuration captures temperature, limits, and switches in one comparable value. A and C are content fields of the review result. D is an input field describing language, not configuration state.

---

*End of chapter 5.*
