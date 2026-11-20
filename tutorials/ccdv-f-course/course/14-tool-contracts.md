# Chapter 14 — Tool Contracts, Errors, and Approval Patterns

A tool that works during a happy-path demo can still fail badly in production. The difference is usually not the handler code; it is the quality of the contract around it. A contract tells the model what a tool accepts and returns, tells your code what it must enforce, and tells an operator how the tool behaves when something goes wrong. This chapter treats tool design as interface design, then adds the two topics that make interfaces safe in practice: structured failures and deliberate approval for consequential actions.

> **Exam note:** A tool definition is a promise to the model. If it is vague about inputs, outputs, or permissions, the model will fill the gaps with guesses, and your code will inherit the consequences.

## Learning objectives

By the end of this chapter you should be able to:

- Design a narrow tool contract with precise inputs, clear descriptions, and predictable outputs.
- Classify tool failures and return structured error results that help the model recover.
- Explain the difference between client-side and server-side tool execution.
- Choose an approval pattern appropriate to the risk of an action.
- Version a tool contract without breaking existing callers.

## Key concepts

### What makes a contract dependable

A contract is more than an input schema. It includes the name, description, accepted arguments, shape and size of successful output, shape of errors, side effects, and authority under which the call runs. Every element should be small and explicit. Small surfaces are easier for a model to use correctly and easier for a reviewer to audit.

Narrow inputs come first. Prefer a typed field over a string that encodes several meanings, use enumerations for a closed set, give numeric fields ranges, and ask for identifiers rather than display names. Every optional field is another decision the model must make, so make a field optional only when behavior truly differs. Descriptions should state purpose, appropriate use, inappropriate use, and limits. If two tools could both handle a request, their descriptions need a sharper boundary, not a longer feature list.

Predictable outputs matter just as much. A successful result should have a stable shape, consistent key names, and no conversational wrapper. Return five named fields rather than a forty-column database row. Cap collections and say when a result was truncated, so the model does not assume it saw everything.

| Element | Weak version | Dependable version | Why |
| --- | --- | --- | --- |
| Input field | `date` as free text | ISO text with timezone noted | Removes format guesses |
| Value set | `status` as any string | Enumeration of allowed values | Prevents invented values |
| Purpose | "Handles tickets" | "Retrieves one ticket; does not modify it" | Separates neighbors |
| Success output | Raw service response | Five named fields plus a timestamp | Keeps context focused |
| Failure output | Exception text | Structured error with code and hint | Enables recovery |
| Authority | "Uses the service account" | Named scope, read-only by default | Supports least privilege |

Each weak version either pushes a decision onto the model or hides one from the operator. A dependable contract moves those decisions into the definition, where they can be reviewed and tested.

> **Common mistake:** Returning a successful-looking result when nothing was found. An empty object with a success flag invites the model to claim that a record exists.

### Outputs that help the next turn

Tool output becomes model context, so output design is context design. A verbose result consumes tokens that could have held user text, and a messy result distracts the model from the question. Aim for the smallest result that fully answers what was asked.

A useful result is typed, attributable, and bounded. The model should quote values without interpretation, say where they came from and how fresh they are, and never receive a backend response large enough to overflow the conversation. When a call collects several items, include a count and a flag saying whether more exist. Text from outside your system may contain sentences that look like instructions; label it as data and keep it visually separate from your own status fields.

| Output choice | Effect on the next turn | Recommended when |
| --- | --- | --- |
| Minimal object with named fields | Easy to quote | Most lookups |
| Array capped at a stated size | Predictable token use | Search and listing |
| Text passage labeled as data | Preserves source wording | Document retrieval |
| Raw service payload | High noise, possible sensitive fields | Almost never |
| Silent empty result | Model may invent an answer | Never |

In most designs the tool returns facts and the model composes the sentence. That keeps one voice in the answer and simplifies localization. The exception is a tool whose output is itself a document intended for direct display.

### Structured tool errors

Failures are part of the contract. When a call fails, the application should still send a result block tied to the call identifier. It should say what happened in plain language and, where appropriate, suggest a safe next step. The model can then explain the problem instead of continuing as though the operation succeeded.

A structured error uses a small vocabulary: a stable code, a human-readable message, a flag saying whether retrying could help, and a hint that guides the model. A correlation identifier lets an operator find the log entry without exposing internals. Keep the message specific: "order identifier not recognized" beats "bad request".

```json
{
  "status": "error",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "No order exists with the supplied identifier.",
    "retryable": false,
    "hint": "Ask the user to confirm the identifier from their confirmation message.",
    "correlation_id": "req-7c21"
  }
}
```

The example avoids stack traces, hostnames, SQL fragments, and vague advice such as "try again". The hint is safe and actionable. Different failures deserve different treatment: validation errors need new input, timeouts can be retried a few times with backoff, and permission failures need different authority, never a retry.

| Failure class | Example | Retryable | Best response |
| --- | --- | --- | --- |
| Validation | Missing required field | No | Ask for the missing value |
| Not found | Unknown identifier | No | Confirm the identifier |
| Permission | Caller lacks scope | No | Explain; do not escalate silently |
| Transient dependency | Service timeout | Sometimes | Bounded retry, then report outage |
| Conflict | Record changed since read | After fresh read | Re-read, then ask before overwriting |
| Rate limit | Too many calls | Yes, with backoff | Slow down and cap concurrency |

> **Exam note:** For a flaky dependency, look for a timeout, a clear error result, bounded retries with backoff, and a graceful message. Unlimited retries and raw exceptions are almost always wrong.

### Where the code runs

With client-side execution, your application defines the tool and runs the handler in its own process. With platform-provided server-side execution, the platform declares and runs the operation and your application sees only the result. A connector service places the handler in another process you call over a transport. The location determines trust and observability: client-side handlers see your credentials and can log every step, while server-side tools reduce operational work but hide intermediate details.

| Aspect | Client-side custom | Platform-provided | Separate connector |
| --- | --- | --- | --- |
| Who writes handler | Your team | Platform provider | Service owner |
| Where it runs | Your process | Platform environment | Another host |
| Private data | Direct | Limited | Through service identity |
| Visible log detail | Full | Summary only | Depends on service |
| Operational burden | Highest | Lowest | Moderate |

Choosing a location is governance as much as engineering. If an auditor asks who approved a write, a platform summary may not suffice. If a private credential is required, a platform environment may be wrong. Conversely, a generic capability is cheaper to rent than to operate.

> **Security note:** A tool is a privilege channel. Grant each tool the narrowest identity that lets it do its job, and keep read and write authority separate wherever possible.

### Approval and confirmation patterns

Some actions are cheap to reverse; others are not. Sending a payment or publishing a public message deserves a deliberate checkpoint in the host application, not in the model's wording. Asking the model "are you sure?" produces a confident answer regardless of risk, because the model has no independent understanding of consequences.

A common pattern is two-phase execution. A preview computes what would happen and returns a summary without side effects. The host shows the summary to a person or checks it against a policy rule. Only after approval does the host issue the commit call, carrying a token bound to those exact arguments. An idempotency key makes a repeated commit harmless.

| Risk level | Example action | Suitable pattern |
| --- | --- | --- |
| None | Read a record | Execute automatically with logging |
| Low and reversible | Save a draft | Execute, log, allow quick undo |
| Moderate | Change a schedule | Preview, then interface confirmation |
| High or irreversible | Issue a refund | Preview, scoped approval, idempotency key, audit record |
| Forbidden by policy | Export all customer data | Remove the tool entirely |

An approval flow has explicit states: proposed, awaiting approval, approved or declined, then executed or cancelled. Each transition is recorded with an actor, a timestamp, and the exact arguments. If the conversation continues while approval is pending, that state should be visible; a model that assumes the action happened will mislead the user. Tokens should expire and be bound to reviewed arguments. Where an action is always forbidden, remove the capability rather than gating it.

### Versioning contracts

New fields are added, descriptions refined, and tools retired. Additive changes are usually safe: a new optional input or output field rarely breaks a careful consumer. Removing a field, renaming a tool, or changing a value's meaning is breaking and needs migration. Include a version marker in the tool name or input, advertise both versions during a transition, and log which version was used. Because the model reads descriptions at request time, a renamed field needs a description that states the mapping.

| Change | Compatibility | Rollout approach |
| --- | --- | --- |
| Add optional input | Usually safe | Add, describe, observe |
| Add output field | Usually safe | Add with a stable key |
| Rename input | Breaking | Accept both keys, then retire old |
| Change meaning | Breaking | Introduce a new tool name |
| Tighten validation | Potentially breaking | Measure rejected calls first |

Keep a small evaluation set that asserts which tool is selected and which arguments are produced, and rerun it after every schema or description edit. A change that looks harmless in review can shift selection toward a neighboring tool.

## Practice lab

**Goal.** Turn a loosely specified refund function into a dependable contract with an explicit error shape and an approval gate.

**Steps.**

1. Write an initial input named `details` described as "information about the refund", and note what the model must guess.
2. Replace it with `order_id`, `amount_cents` with a positive range, and `reason` from a short enumeration.
3. Define success output with four keys, including a `status` of `previewed` or `committed`.
4. Add an error object with `code`, `message`, `retryable`, and `hint` covering not-found, permission, and conflict cases.
5. Insert a preview phase that returns a summary and short-lived token; the commit accepts the token and an idempotency key.

**Expected observation.** Typed fields eliminate invented values. An over-limit amount produces a non-retryable validation error and the model asks for a corrected amount. An expired token produces a conflict error and no money moves. A trace shows no commit without a recorded preview and approval step.

## Worked scenario

**Problem.** A facilities assistant reserves meeting rooms. Its tool accepts a free-text `request` and a `when` string, then calls a booking service with whatever it can parse. Reservations land in the wrong room, double bookings overwrite one another, and some dates are in the past. The booking credential can also delete reservations, although the assistant never needs that ability.

**Reasoning.** Each failure traces to a weak contract. Free text hides the distinction between room, date, and duration; a `when` string invites relative dates with no timezone; silent overwrites happen because conflicts are not expressed as errors. The team redesigns with typed fields: `room_code` from an enumeration, `start_utc` in a fixed format, `duration_minutes` with a range, and short `title`. Validation rejects past times and unsupported rooms before the service call. The service now returns either a reservation object or a structured `CONFLICT` error naming the overlap. A scoped credential allows creates and reads but not deletes.

**Resolution.** Because a reservation affects other people, a preview checks availability, returns a summary, and issues a token bound to those arguments. The host displays the summary and the commit requires the token plus an idempotency key, so two approvals of nearly the same request cannot overwrite one another. Wrong-room and past-date complaints disappear, conflicts become explainable errors, and an audit record links preview, approval, and commit through one identifier.

> **Exam note:** For a risky but sometimes necessary action, look for preview, approval, and idempotent commit. For an action that is never allowed, remove the capability.

## Common mistakes

- Accepting free-text strings where typed fields would remove ambiguity.
- Returning empty or success-shaped results for not-found conditions.
- Sending raw exceptions or internal paths back as tool results.
- Treating every failure as retryable, turning a permission error into a flood.
- Asking the model to confirm a risky action instead of gating it in the host.
- Reusing an approval token across different arguments or letting it live indefinitely.
- Running a write without an idempotency key, so a retry duplicates the effect.
- Renaming a field without a transition path for existing callers.

## Chapter summary

- A contract covers inputs, outputs, errors, side effects, and authority, not just a schema.
- Narrow inputs and explicit exclusions reduce guesses during selection.
- Predictable outputs are typed, attributable, bounded, and labeled when they contain untrusted text.
- Errors should be structured results with stable codes, plain messages, retryability, and safe hints.
- Execution location determines credential control and how much an operator can observe.
- Approval belongs in the host, with preview, scoped tokens, idempotency, and audit records.
- Additive changes are safe; renames and meaning changes need versions and a migration window.

## Checkpoint questions

1. Which input design best supports reliable execution?

   A. One `details` string in natural language.

   B. Typed fields with enumerations, ranges, and stated formats.

   C. Several optional strings with no descriptions.

   D. A nested object left undefined in the schema.

2. A lookup finds no matching record. What should the tool return?

   A. An empty object with success status.

   B. Nothing at all.

   C. A structured not-found error with a hint to confirm the identifier.

   D. The closest record presented as exact.

3. Which failure should normally be non-retryable?

   A. A brief network timeout.

   B. A rate-limit response with a reset window.

   C. A permission error stating that the caller lacks scope.

   D. A temporary dependency outage.

4. What is the main difference between client-side and platform-provided tools?

   A. Client-side tools cannot use schemas.

   B. Client-side handlers run in your process with your credentials and full logs; server-side tools run in a platform environment with less visible detail.

   C. Only server-side tools can return errors.

   D. There is no practical difference.

5. Which approval design fits a high-value refund?

   A. A sentence in the system prompt asking the model to be careful.

   B. Preview, scoped approval, then commit with an idempotency key and audit record.

   C. A verbal confirmation with nothing recorded.

   D. Run the refund twice and compare results.

6. Which change is most likely backward compatible?

   A. Renaming a required input.

   B. Changing the meaning of a status value.

   C. Adding a new optional input field with a clear description.

   D. Removing a relied-upon output field.

7. How should text from external tickets be framed in a result?

   A. As trusted instructions that override the system prompt.

   B. As data labeled and separated from status fields.

   C. As a success message with no payload.

   D. As raw service logs.

### Answers and rationale

1. **B.** Typed fields remove ambiguity before execution. A compresses decisions into an unstructured value. C offers no guidance. D is not a usable schema.

2. **C.** An explicit error supports an honest response. A implies the record exists. B leaves a pending request unanswered. D misrepresents a different record.

3. **C.** More retries cannot change missing authority. A, B, and D are transient conditions where bounded retries with backoff can succeed.

4. **B.** Location determines credential control and observability. A is false because client-side tools use schemas. C is false because both kinds can report errors. D ignores a real distinction.

5. **B.** Preview, scoped approval, idempotency, and auditing cover correctness and traceability. A is guidance, not enforcement. C leaves no evidence or binding. D duplicates the side effect.

6. **C.** A described optional field does not disturb existing callers. A and B break semantics or names. D removes expected information.

7. **B.** External text may contain hostile instructions and must be treated as data. A invites injection. C discards content. D adds noise and sensitive detail.

---

*End of chapter 14.*
