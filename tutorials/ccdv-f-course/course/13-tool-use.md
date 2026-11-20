# Chapter 13 — Tool Use: From Request to Executed Action

A model can describe an action, but it cannot perform one. The moment an application needs a current balance, a saved record, or a changed file, a second actor has to enter the picture: your code. Tool use is the agreed format that lets the model request such an action and lets your code carry it out and report back. This chapter follows one request through that exchange, from the tool definition to the final answer.

> **Exam note:** The model proposes a tool call; the application disposes of it. Choosing a tool and filling in arguments belong to the model. Validation, authorization, execution, and the returned result belong to your code.

## Learning objectives

By the end of this chapter you should be able to:

- Explain the request/execute split and state which actor owns each step of a tool round.
- Write a tool definition with a distinct name, a purpose-and-boundary description, and a usable input schema.
- Trace one tool call from the model's structured request to the result block your application sends back.
- Implement a small Python loop that handles text responses and repeated tool rounds.
- Distinguish built-in tools from custom tools and choose between them for a given requirement.

## Key concepts

### Two actors, one conversation

Language-model output is a sequence of tokens. Those tokens may look like an instruction, but nothing in the response opens a database connection or edits a file. When tool definitions are present, the model has one additional output option: a structured block naming a tool and supplying input values. That block is a request in the literal sense. Your application owns the credentials, permissions, and connections, so it checks the request, runs the real operation, and writes a result back into the conversation.

Think of the exchange as a requisition. The model fills in the form; your code decides whether the form is valid and the action permitted. This separation is what makes tool use testable, auditable, and safe. A model cannot silently acquire a new permission just because a tool definition exists.

The conversation is the record of the exchange. Each round adds the assistant's request and your result, so the model can explain a failure, correct an argument, or use one result in the next decision. Conversation state still lives in your application, as it did for ordinary requests.

> **Common mistake:** Treating a tool request as evidence that an operation is safe. A request proves only that the model wanted the operation.

### Declaring the tool the model can request

A definition normally has three parts: a name, a natural-language description, and a JSON Schema for input. Names should be short and consistent, often verb plus object, such as `lookup_order`. The description carries most of the selection signal. It should state what the tool does, when it fits, when it does not, and any hard limit. A sentence beginning "Do not use for..." often helps more than another list of features.

The schema should make invalid values difficult to express. Prefer enumerations for a closed set, mark required fields honestly, and state units and formats in property descriptions. A field called `amount` should say whether it means cents or currency units. The schema does not enforce business rules by itself, but it steers the model toward arguments your code can accept.

```json
{
  "name": "lookup_order",
  "description": "Return the status, carrier, and promised delivery date for one order. Use when a user asks where an order is or a delivery date must be verified. Do not use for creating, changing, or cancelling orders, or when no identifier was supplied.",
  "input_schema": {
    "type": "object",
    "properties": {
      "order_id": {
        "type": "string",
        "description": "Identifier from the confirmation, for example ORD-4821"
      },
      "include_history": {
        "type": "boolean",
        "description": "Set true only when earlier status changes are asked about"
      }
    },
    "required": ["order_id"]
  }
}
```

The exclusions prevent the two mistakes the application most wants to avoid. Tool-set size matters too: a long list of similar tools wastes tokens and confuses selection, while one enormous tool with a free-form `operation` string hides every real capability from the model.

> **Try it:** Write two tools with close purposes and give each an explicit "Do not use" boundary. Ask the model to handle ten sample requests; unstable choices mean the boundary is still too vague.

### The sequence of one tool round

A round is the smallest complete exchange: declaration, decision, request, execution, result, and continuation.

| Step | What appears | Owner | Developer check |
| --- | --- | --- | --- |
| Declaration | Tool names, descriptions, schemas | Application | Are only intended tools advertised? |
| Decision | Text or a request for a named tool | Model | Did the right tool win, if any? |
| Request | Tool name, input values, call identifier | Model | Does input satisfy the schema? |
| Stop | Response ends with a tool-related stop reason | Model and API | Did the loop switch modes? |
| Execution | Arguments checked, policy applied, operation run | Application | Is the caller authorized? |
| Result | Result block carrying the matching identifier | Application | Is content compact and safe? |
| Continuation | Text or another tool request | Model | Was the result used? |

Two details cause most bugs. The call identifier is the only reliable link between a request and its answer. The stop reason is the signal that tells your loop to pause answer handling and switch into execution mode; a loop that looks only for text silently discards tool requests. Failures are results too. A timed-out lookup should produce a clear error result so the conversation stays consistent and the model can respond honestly.

### A Python tool loop

The loop keeps the conversation in a list, calls a client with the tool definitions, executes requests through a registry, and returns results. A step cap prevents a stubborn request from running forever.

```python
def answer_with_tools(client, system_prompt, user_text, tool_defs, registry, max_rounds=5):
    messages = [{"role": "user", "content": user_text}]

    for round_number in range(max_rounds):
        response = client.messages.create(
            model="general-frontier",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
            tools=tool_defs,
        )
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            return "".join(
                block.text for block in response.content
                if getattr(block, "type", None) == "text"
            )

        results = []
        for block in response.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            handler = registry.get(block.name)
            try:
                if handler is None:
                    raise ValueError("unknown tool")
                output = handler.run(handler.validate(block.input))
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                })
            except Exception as exc:
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "is_error": True,
                    "content": f"Tool could not complete: {exc}",
                })

        messages.append({"role": "user", "content": results})

    return "I could not finish within the allowed number of steps."
```

The request sends both conversation and tool list. The assistant's full response, including tool blocks, is appended before execution so the model can later see what it asked for; results are appended as a user message, which is the format the API expects. The registry is the control point: a name the model invents will not be found, and validation can check types and authority before side effects. Returning `is_error` results keeps the conversation well formed. In production, replace raw exception text with a sanitized message, a subject of the next chapter. The step cap is a reliability feature: without it, retries can consume unbounded time and tokens.

### Several calls in one response

A response can contain more than one tool request. Each block has its own call identifier, and the application returns one result per identifier; execution order does not matter. Dependencies change the picture. If the second call needs an identifier produced by the first, the model cannot know it yet, so the calls need two rounds.

| Situation | Handling | Reason |
| --- | --- | --- |
| Independent reads | Request together, execute concurrently | Lower latency, no dependency risk |
| Read then write using its output | Separate rounds | Write needs the later value |
| Several writes to one record | Separate rounds with checks | Concurrent writes can overwrite |

Concurrency also has an operational cost. Ten simultaneous calls may trigger rate limits or overload a small service, so many applications cap execution and queue the rest in the execution layer rather than expecting the model to understand this.

### Built-in tools and custom tools

A built-in tool is supplied and executed by the platform, while a custom tool is defined by your application and executed by your code. Many applications use both: a hosted lookup for public facts and a custom lookup for internal records.

| Aspect | Built-in | Custom |
| --- | --- | --- |
| Definition source | Platform | Your application |
| Execution | Platform environment | Your process |
| Private systems | Usually indirect | Direct, with your credentials |
| Observability | Summary only | Full logs and metrics |
| Setup effort | Configuration and permissions | Handler, validation, deployment |

A built-in tool trades visibility for convenience. A custom tool is necessary when the operation touches private data or when policy must be enforced at execution.

> **Exam note:** Private data, custom authorization, or a precise audit trail points toward a custom tool. Low setup effort for a generic capability points toward a built-in tool.

### When a tool is the right mechanism

The deciding question is whether the model must obtain something it cannot already see, or cause an effect outside the response. If not, a simpler mechanism wins. If a number can be calculated exactly in code, calculate it before the request instead of spending a tool round on it.

| Requirement | Better mechanism | Why |
| --- | --- | --- |
| Current order status | Custom tool | Value changes and sits behind credentials |
| Answer as fixed JSON | Structured output | No external state needed |
| Summarize a long policy file | File or retrieval input | Text is large and read-only |
| Rewrite a paragraph's tone | Prompt instruction | Purely textual transform |
| Create a calendar entry | Tool with side effects | Response alone cannot change state |

Consider a reporting assistant asked for total sales by region. The rows may sit in a warehouse, but the total is a deterministic sum. The right design runs the aggregation in the warehouse, or reads a precomputed view, and passes a small result into the request. A tool round that asks the model to add numbers reintroduces arithmetic error and wastes tokens. The same reasoning applies to sorting, deduplication, and unit conversion: do exact work in code and reserve model attention for judgment.

## Practice lab

**Goal.** Build a minimal tool round for an order-status assistant and observe the handoff.

**Steps.**

1. Define the `lookup_order` tool from this chapter with `order_id` required.
2. Write a registry whose validator accepts identifiers shaped like `ORD-` followed by digits and whose runner returns three status fields from a local dictionary.
3. Implement the loop with a step cap of three.
4. Ask for `ORD-4821`, then ask for a status without supplying an identifier.
5. Make the runner reject an unknown identifier with a short error message.

**Expected observation.** The first request produces one tool call and a final answer quoting the returned status. The missing identifier leads to a question or a validation error, never an invented number. The unknown identifier becomes an error result, the conversation stays valid, and a trace shows request, result, and answer as distinct entries.

## Worked scenario

**Problem.** A support assistant is asked, "Where is order ORD-4821, and can we still promise Friday?" A system prompt tells it to answer from general knowledge and say something reasonable when uncertain. It confidently quotes wrong dates and cannot tell whether an order was cancelled.

**Reasoning.** Two facts are needed: the order's current state in the order system and the carrier's latest scan. Neither is stable or visible to the model in advance. A prompt cannot create information; it can only bias how missing information is handled. The team exposes `lookup_order` for state and `get_carrier_status` for the scan, with descriptions that forbid mutation and require an identifier. Both return small typed results with timestamps. Because they are independent once the identifier is known, they can be requested together and executed in parallel, each with its own call identifier.

**Resolution.** The assistant reports the packed status and the timestamped carrier scan, then either confirms the date or explains that it cannot be verified. If the carrier service is down, an error result lets the model answer the first half honestly. Logs capture tool names, arguments, and results, so a disputed answer can be reconstructed. Three evaluation requests cover an existing order, a cancelled order, and an unknown identifier; one description rewrite fixes a selection error, and the wrong-date failure disappears.

> **Exam note:** If a requirement depends on changing or private information, obtain it through a tool. A prompt asking the model to be careful is not a substitute.

## Common mistakes

- Returning a result without the call identifier it answers.
- Assuming a tool request is authorized merely because the model produced it.
- Writing overlapping descriptions that leave no principled way to choose.
- Running a dependent call in parallel and expecting it to see the first result.
- Letting a failed call go unanswered instead of returning an error result.
- Exposing one broad tool whose `operation` string hides real capabilities.
- Omitting a step cap, so retries consume unbounded time and tokens.

## Chapter summary

- Tool use splits work between a model that requests an action and an application that executes it.
- A definition needs a distinct name, a boundary-aware description, and a precise input schema.
- A round proceeds through declaration, decision, request, execution, result, and continuation.
- Results must carry the originating call identifier, and failures should be returned as results.
- A Python loop appends the assistant response, executes handlers, and appends results before calling again.
- Multiple calls may be parallelized only when they are independent.
- Built-ins trade control for convenience; custom tools reach private systems and provide full observability.
- Tools serve external state and side effects; prompts, files, and structured output serve other needs.

## Checkpoint questions

1. A response contains two tool requests and a tool-related stop reason. What should the application do?

   A. Return the text portion and ignore the requests.

   B. Execute each registered request and return one result per call identifier.

   C. Merge both outputs into one message with no identifiers.

   D. Start a new conversation to forget the requests.

2. Which part of a definition most influences correct tool selection?

   A. The maximum token setting.

   B. The order of earlier messages.

   C. A specific description stating purpose, boundaries, and exclusions.

   D. The temperature setting.

3. A second call needs an identifier only the first can produce. How should they be handled?

   A. Issue both together and let the model guess.

   B. Issue both together and sort results by name.

   C. Execute the first, return its result, then allow a second round.

   D. Remove the identifier requirement from the second tool.

4. Which requirement best justifies a custom tool?

   A. Looking up a public encyclopedia entry.

   B. Running a generic calculation with no private inputs.

   C. Reading a customer record behind organization-specific access rules.

   D. Formatting an answer as JSON.

5. What is the main purpose of the call identifier?

   A. It tells the model which tool to use next.

   B. It links each result to the request it answers.

   C. It replaces argument validation.

   D. It determines request pricing.

6. A tool keeps timing out. Which response fits a reliable design?

   A. Return a short error result and bound retries.

   B. Let the call run until it succeeds.

   C. Return the full internal stack trace.

   D. Delete the tool definition entirely.

7. Which is the weakest candidate for a tool?

   A. Checking seat availability.

   B. Reading a shared configuration flag.

   C. Rewriting a sentence into a formal tone with no external data.

   D. Writing a ticket into a shared queue.

8. Two tools say "handles customer data" and "gets customer data", and selection is inconsistent. What is the best first fix?

   A. Add a third overlapping tool.

   B. Sharpen both descriptions with distinct purposes and negative cases.

   C. Remove all descriptions and let the model infer behavior.

   D. Raise the token limit on the request.

### Answers and rationale

1. **B.** Pending requests must be executed and matched by identifier. A leaves the user's question unanswered. C loses the association. D discards context and guarantees a worse answer.

2. **C.** Selection is driven by semantic signal in names and descriptions. A changes response length. B affects context but not tool meaning. D changes randomness, not meaning.

3. **C.** The dependent value exists only after the first round. A fabricates an identifier. B does not supply the missing value. D weakens the contract.

4. **C.** Private systems and custom rules require your code and credentials. A and B are generic. D is an output-format problem needing no executable tool.

5. **B.** The identifier is the correlation key. A is decided during selection. C is wrong because validation remains mandatory. D confuses metadata with billing.

6. **A.** A concise error keeps the conversation valid and bounded retries prevent a loop. B risks hanging. C leaks internals. D removes a possibly needed capability.

7. **C.** A pure text transform needs no external state. A and B require live data. D causes an effect outside the response.

8. **B.** Clear purposes and exclusions give the model a basis for choosing. A adds more ambiguity. C discards the only useful signal. D changes response length, not the decision.

---

*End of chapter 13.*
