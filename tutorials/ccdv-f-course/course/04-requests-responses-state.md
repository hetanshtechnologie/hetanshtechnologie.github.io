# Chapter 4 — Requests, Responses, and Conversation State

## Learning objectives

- Break a model API call into its transport, payload, and conversation layers.
- Assemble a valid message list using the correct roles, turns, and content blocks.
- Explain why JSON is the interchange format and what a client SDK abstracts away.
- Trace a first request from code to response and interpret the returned metadata.
- State where conversation state lives and why the service keeps none of it.
- Place standing instructions and end-user text at the right level of authority.

## Key concepts

### A single call has three layers

An application asking a model a question triggers three things at once. At the **transport layer**, an HTTP request travels to a versioned endpoint with credentials attached. At the **payload layer**, a structured document describes what the model should read and how it should behave. At the **conversation layer**, an ordered list of messages carries the exchange itself. Keeping these layers separate makes bugs easy to localize: a failure can live in any one of them.

Generation calls use `POST`, because producing a reply is an action that creates a new billable result rather than a repeatable lookup. The request carries an `Authorization` header with an API key and a `Content-Type` header declaring JSON. A missing header or outdated endpoint version produces an error before the model is involved, so no prompt edit can fix it. The endpoint is versioned deliberately: a service can add capabilities under a new version without breaking clients that still depend on the old contract, which is why a candidate should check which version a question refers to before assuming a feature exists.

The payload names the model, supplies the messages, and sets controls such as the maximum generated tokens. Each field is a decision affecting cost and behavior, and a developer should be able to justify every one they send. Two calls with identical messages but different token caps or sampling values can produce noticeably different answers, so configuration belongs in the same version-controlled record as the prompt when a team wants reproducible results.

The conversation layer is where meaning lives. The model receives a script of previous lines plus the current one and writes the next line. Students often underestimate this part, focusing on the newest question while ignoring the history that gives it context.

> **Exam note:** A failure before any output — a rejected key, malformed body, or unsupported endpoint — is in the transport or payload layer, not the prompt. Diagnose the envelope first.

### Roles, turns, and content blocks

A conversation is an array of message objects, each with a `role` and `content`. The array is read from first to last, and the model produces the next message. One exchange is a **turn**; a longer conversation repeats the pattern, appending each piece to the end. Roles tell the model which statements are standing rules, which are user input, and which are its own earlier words, and that distinction affects how much weight each receives.

| Role | Supplied by | Carries | Placement rule |
| --- | --- | --- | --- |
| System | The application | Durable rules, tone, scope, output format | First; applies to the whole exchange |
| Developer or instruction tier | The application | Higher-priority operational guidance | Above user content, where supported |
| User | The person or upstream process | Current question, task, or supplied data | After instructions; untrusted input |
| Assistant | The model, replayed by the client | Earlier answers and tool requests | Appended in order to preserve context |
| Tool result | The application after running a function | Value returned by a tool call | Follows the assistant message requesting it |

Two consequences follow. Role accuracy matters: user text relabelled as a system instruction gains unearned authority and invites manipulation. Also, every message is resent each turn, so the array grows; long histories cost more and eventually approach the context limit. Practical systems trim, summarize, or retrieve relevant slices instead of replaying every word.

Content can be a plain string or a list of typed blocks. A text block holds words, an image block carries visual input, and tool-related blocks represent function requests or results. The block structure allows later chapters to mix formats without changing the message model. A user message containing an image and a question would hold two blocks in one array, and an assistant message that requests a tool would hold a tool-use block. When content is a bare string, the SDK usually wraps it in a text block, so the forms are equivalent in simple cases. Because blocks are ordered, an engineer should preserve their sequence when transforming messages; reordering blocks can change which text the model treats as the current question.

> **Common mistake:** Labelling user text as a system message because it seems important. That promotes untrusted input into a standing rule.

### JSON as the shared language

Request and response bodies use JSON because it is neutral and structured. A JavaScript application sees an object, Python sees a dictionary, and other languages map it to their own types. Unlike a plain-text prompt, JSON expresses nested structures, arrays, numbers, and booleans, which a list of typed content blocks requires. It is also schema-checkable, so a team can validate real requests and responses against a formal shape.

| Field | Type | Purpose | Consequence if wrong |
| --- | --- | --- | --- |
| `model` | String | Selects the engine and version | Unexpected quality, cost, or availability |
| `messages` | Array | Supplies the ordered conversation | Missing context or validation error |
| `max_tokens` | Integer | Caps generated output length | Truncation or unnecessary expense |
| `temperature` | Number | Adjusts randomness of token choice | Output too rigid or too variable |
| `system` | String or blocks | Sets instructions outside the message list | Rules ignored or mixed with user content |

Names and types are part of the contract. A string where an integer belongs, a missing array, or an unknown field may be rejected. Because JSON is text on the wire, a request can be saved and replayed — useful for reproducing bugs — so sensitive data should be redacted before payloads are logged. Contracts also evolve: a provider may add an optional field without breaking existing callers, but renaming a required field is a breaking change. Treating the payload as a versioned interface, rather than an ad hoc bag of keys, makes upgrades predictable and lets a team validate requests before they are sent.

> **Try it:** Save a working request as a file and change one field at a time — model, token cap, then a message's role. Seeing which edits alter behavior and which merely error builds intuition quickly.

### Client SDKs are thin wrappers

An SDK is a library standing between the application and raw HTTP. It builds the URL, attaches the header, serializes objects to JSON, parses the response into language-native objects, and raises typed exceptions. For streaming it also assembles the event sequence. It does not change what the service does; it removes repetitive work.

| Concern | Raw HTTP call | Client SDK |
| --- | --- | --- |
| Authentication | Caller builds the header | Credential loaded from configuration |
| Serialization | Caller writes JSON text | Objects converted internally |
| Response | Caller parses text and checks fields | Typed object with named attributes |
| Errors | Caller inspects status codes | Exception classes per error family |

Knowing the wrapper matters even if raw HTTP is never written. When a bug refers to a field or stop reason, the developer should know whether it belongs to the service contract or a local convenience. SDKs can lag behind API features, so inspect the actual request leaving the client rather than trusting defaults. Typed exceptions are especially useful: they let the application distinguish an authentication failure, which needs a corrected key, from a transient server error, which may be retried, without parsing error strings by hand. A wrapper that hides this distinction would turn a clear operational signal into guesswork.

### A first request, end to end

A minimal classifier makes the flow concrete: one instruction, one user message, and a token cap. The credential lives in a header, not the body.

```json
{
  "model": "general-purpose-latest",
  "max_tokens": 128,
  "messages": [
    {
      "role": "system",
      "content": "Classify each message as billing, technical, or other. Reply with one short label only."
    },
    {
      "role": "user",
      "content": "My invoice shows a charge I do not recognize."
    }
  ]
}
```

A response has the mirror structure:

```json
{
  "id": "msg_01A",
  "type": "message",
  "role": "assistant",
  "model": "general-purpose-latest",
  "stop_reason": "end_turn",
  "content": [{ "type": "text", "text": "billing" }],
  "usage": { "input_tokens": 42, "output_tokens": 3 }
}
```

Content is an array of blocks; here one text block holds the label. The identifier correlates the result with logs. `stop_reason` explains why generation ended, and usage reports token counts. Normal completion means the answer is whole; a token-cap stop means output may be cut off, so half a label must be treated as failure, not guessed at. Ignoring metadata is flying blind: usage feeds cost dashboards, the stop reason decides trustworthiness, and the model field confirms which version answered. A response that reports the assistant role is also a reminder that the application must append this message to its history if the conversation is to continue — the service will not do it.

### Conversation state belongs to the application

The service is stateless: it retains nothing between calls. It does not store the message list or carry context forward. A second turn that refers to the first must resend earlier messages plus the new one, so "continue the conversation" always means "resend the history and append." This one idea explains most context-loss bugs.

The application therefore owns state. A script may keep the array in a variable; a web application stores it in a session record, cache, or database keyed by a conversation identifier. The application decides what to include, trim, and discard, which lets it enforce privacy rules and cap costs. A careless client that drops history produces an assistant that seems forgetful even though the model did exactly as told.

Placement follows the same ownership. Standing rules — purpose, tone, boundaries, output format — go in the system instruction supplied by the application. The current question and user data go in a user message. An instruction tier, where available, carries guidance that is important but not part of user input. Mixing levels promotes untrusted text into a rule and lets a long input bury standing guidance. Keep the levels distinct and treat user content as data, not command.

> **Exam note:** If an assistant "forgot" two turns ago, the likely cause is that the client failed to resend them. State lives in application code.

## Practice lab

**Goal:** Build a two-turn conversation by hand so the stateless model becomes visible.

**Steps:**

1. Write a request with a system instruction, a user message asking for a short definition, and a token cap of one hundred. Send it and save the response.
2. Extract the assistant's reply, then build a new array with the original instruction, original user message, that reply as an assistant message, and a second user message asking for an example.
3. Send the new array and save the answer.
4. Now send only the second user message and compare the two answers.
5. Compare input token counts from both calls.

**Expected observation:** The answer from step three refers correctly to the earlier definition; the answer from step four lacks context, showing the service remembered nothing. Input tokens are higher when history is included, proving every prior message is paid for again.

## Worked scenario

**The problem.** A support assistant answers questions about an account. It handles the first question well but gives confused replies to a follow-up like "what about the other one?" A developer blames the model and proposes switching to a larger one.

**Reasoning.** The engineer inspects the outgoing request and finds each call contains only the newest user message. The earlier question and answer were never resent. The assistant is not confused; it was given a follow-up with no antecedent. Changing models would spend more on the same broken request.

The fix has three parts. The client keeps a per-conversation array and appends both user and assistant messages after each exchange. A cap limits how many past turns are resent, so a long conversation cannot exceed the context budget; when reached, an older turn is summarized into a short note. The standing instruction stays a system message at the head of every request and is never built from user text.

Role placement is reviewed too. Account data fetched by the backend is placed in the user message as delimited reference material, while the system instruction says to answer only from that material. Data in a record is not a rule. Sensitive fields are removed before the request is built.

**Resolution.** Follow-ups resolve correctly because the prior exchange is present. Input tokens rise, as expected, but stay within the cap thanks to summarization. A regression case for a two-turn follow-up is added so the bug is caught automatically. The decisive move was reading the request before blaming the model.

## Common mistakes

- Sending only the newest message and expecting recall of earlier turns.
- Putting user text into a system instruction, giving it unearned authority.
- Omitting the token cap, then treating a truncated reply as complete.
- Ignoring stop reasons and usage when a result looks odd.
- Letting a conversation array grow until it exceeds the context budget.
- Assuming an SDK changes the contract rather than wrapping it.

## Chapter summary

- A call has three layers: HTTP transport, JSON payload, and ordered conversation.
- Generation uses `POST`; credentials travel in headers, not the body.
- Each message has a role and content; roles determine authority and must be labeled correctly.
- Content may be a string or typed blocks such as text and images.
- JSON is language-neutral, structured, and validatable, suiting nested message lists.
- An SDK handles headers, serialization, parsing, and errors without altering the contract.
- Responses carry content, an identifier, a stop reason, and token usage worth inspecting.
- The API is stateless; the application owns history and decides what to resend.
- Standing rules belong at the system level; user text stays untrusted at the user level.

## Checkpoint questions

1. Why is a generation call normally sent with `POST` rather than `GET`?

   - A. Because `GET` cannot carry a JSON body.
   - B. Because generation creates a new billable result and is not a repeatable lookup.
   - C. Because `POST` responses are always streamed.
   - D. Because `GET` cannot use an authorization header.

2. A follow-up question loses its context. What is the most likely cause?

   - A. The model forgot the earlier turn on its own.
   - B. The system instruction was too short.
   - C. The client did not resend the earlier messages.
   - D. The user message contained a question mark.

3. Which placement handles a rule that should apply to every turn?

   - A. Append it to the last user message.
   - B. Put it in a system-level instruction.
   - C. Encode it in the model name.
   - D. Send it only on the first call.

4. What does a stop reason indicating the token cap was reached tell the caller?

   - A. The answer is guaranteed correct.
   - B. The model refused the question.
   - C. The output may be truncated and should not be parsed hopefully.
   - D. The request was never sent.

5. What does a client SDK primarily provide?

   - A. A new model with different capabilities.
   - B. A wrapper handling headers, serialization, parsing, and common errors.
   - C. A guarantee that outputs are identical every call.
   - D. A replacement for the conversation history.

6. Which statement about conversation state is correct?

   - A. The service stores it between calls for the whole session.
   - B. The SDK stores it on the server automatically.
   - C. The application must keep and resend it on each turn.
   - D. It is derived from the API key.

7. Why should user data not be placed in a system instruction?

   - A. System instructions cannot contain text.
   - B. It gives untrusted input standing authority and weakens guardrails.
   - C. The data would be too long.
   - D. The service rejects all system instructions.

### Answers and rationale

1. **B.** Generating a reply creates a billable result, which `POST` expresses. A is wrong because `GET` bodies are possible but inappropriate. C is wrong because streaming is method-independent. D is wrong because headers work with any method.

2. **C.** The service is stateless, so context exists only if resent. A wrongly attributes memory to the model; B and D are irrelevant.

3. **B.** Standing rules belong at the system level. A mixes rules with untrusted input; C is meaningless; D leaves later turns without the rule.

4. **C.** A token-cap stop means output may be cut off. A is unsafe, B confuses truncation with refusal, and D is impossible because a stop reason comes from a processed request.

5. **B.** SDKs wrap HTTP mechanics without changing the contract. A is false because the SDK does not create models, C because outputs vary, and D because the client owns history.

6. **C.** The application keeps and resends the array. A and B assume nonexistent server memory; D is unrelated.

7. **B.** User data promoted to a rule gains unearned authority and undermines safety. A is false because instructions contain text, C is a practical concern rather than the core reason, and D is false because instructions are supported.

---

*End of chapter 4.*
