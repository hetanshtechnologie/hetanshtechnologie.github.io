# Chapter 3 — The Developer Platform and Reading Its Code

## Learning objectives

- Name the five recurring surfaces and state what each is for.
- Trace a user action from application code to model response and back.
- Explain how a client SDK relates to the REST API without changing the model.
- Read a short Python snippet by recognizing variables, functions, dictionaries, asynchronous calls, and exception handling.
- Describe how labs are structured and which rules keep them reversible.
- Choose a surface for a user-facing feature, a repository refactor, an automated workflow, or a shared service.

## Key concepts

### Five surfaces, one underlying capability

Beginners often imagine one product with several names. It is more accurate to picture one model reached through different doors, each suited to a different job. The doors compose: an SDK call still sends an API request, an agent still calls a model, and a connector does not replace the model but gives it somewhere to reach.

The model API is the wire contract. A caller assembles a structured request, authenticates, sends it over HTTP, and receives a structured response. It offers the most control and the most responsibility: retries, timeouts, streaming, error codes, and usage accounting are yours. For questions about transmitted bytes or status codes, reason here.

Client SDKs are language libraries wrapping that contract. They serialize data, attach credentials, present streams as iterators, and normalize errors. They are a convenience boundary, not a different model. For clean application code the SDK is usually the answer; for what the provider actually received, return to the API.

The repository assistant changes software. It reads files, searches a tree, runs commands, and proposes edits, guided by instruction files, scoped rules, permission modes, and hooks. It is a colleague in your checkout, not a feature you deploy to users.

The agent SDK builds applications that act over multiple steps. It supplies the loop, tool registration, deterministic hooks, subagent support, and service connections. The design unit is a workflow that inspects results, not a single request.

The connector protocol is a standard for exposing capabilities. A server publishes tools, resources, and reusable prompts; a host discovers them and calls only permitted tools. Local servers use standard streams, remote servers use streamable HTTP, and one server can serve several hosts.

| Surface | What it is | Who reaches for it | What it does not do |
| --- | --- | --- | --- |
| Model API | HTTP request and response contract | Engineers debugging the wire or building a wrapper | Hide transport or manage application state |
| Client SDKs | Language libraries over that contract | Application developers | Change the model or define business policy |
| Repository assistant | Tool with file and command access | Developers changing software | Become a shipped runtime feature |
| Agent SDK | Framework for multi-step behavior | Engineers building agents | Replace access control or business goals |
| Connector protocol | Standard for publishing capabilities | Teams exposing a service once | Dictate how a host uses its model |

> **Exam note:** Cleaner calls from application code suggest an SDK. Reaching an external service from several hosts suggests a connector. A loop that calls tools until a goal is reached suggests an agent SDK.

### How the pieces relate in a real request

A user asks an application to summarize a private note and file a ticket. The client sends an HTTP request to the backend, which authenticates the user, loads the note through its data layer, and assembles a prompt. It calls the model through a client SDK, which builds the API request and opens a stream. Content blocks arrive as events. The backend validates the output, writes the ticket through its own code, and returns a compact response.

Nothing in that path lets the model read the database or write the ticket itself. The model produced text proposing an action; the application decided whether to perform it. That split is fundamental: it is what makes authorization, validation, logging, and rollback possible. Handing credentials to the model and letting it call arbitrary endpoints gives up all of those controls.

Now a developer asks a repository assistant to refactor a module. It reads the instruction file, inspects files, proposes edits, and requests permission to run tests. The same model is underneath, but the visible surface is a coding session with a diff and a permission gate.

Consider also an internal research agent built with an agent SDK. It receives a goal, calls a search tool, examines results, calls another tool, and stops when it has enough evidence or reaches a step budget. One tool comes from a connector server maintained by another team: the agent SDK owns the loop, the connector owns the integration, and the model supplies judgments inside the loop.

| Question | Surface that owns the answer |
| --- | --- |
| What bytes were sent and which status came back? | Model API |
| How do I turn a stream into events? | Client SDK |
| How do I stop an assistant editing generated files? | Repository configuration and hooks |
| How do I stop an agent after eight tool calls? | Agent loop and stopping conditions |
| How do I expose internal search to several hosts? | Connector protocol |

### Reading Python without being a developer

You need not write production Python to follow the labs; you need to recognize a few constructs. A variable is a name bound to a value, so `request = {...}` means the name `request` refers to that collection. A function is a named block defined with `def` and invoked later by name. A dictionary is a set of key and value pairs in braces; `reply["content"]` means the value stored under the key `content`. A list is an ordered collection in brackets.

An asynchronous function is declared with `async def` and called with `await`, which marks a point where the program may wait for something slow without blocking other work. `asyncio.run(...)` at the bottom starts the asynchronous runtime. Read `await` as "pause here until this finishes"; scheduling details are unnecessary for following the logic.

A `try` block holds code that might fail. Each `except` clause names a failure type and what to do instead of crashing. When reading a handler, ask which failures are caught and what the user sees when one occurs.

```python
import asyncio

# A dictionary groups labelled values; keys are the quoted strings.
request = {
    "model": "example-small",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Summarize this note."}],
}

# 'async def' defines an awaitable function; callers use 'await'.
async def ask(client, payload):
    try:
        reply = await client.send(payload)   # wait for the network call
        return reply["content"]              # dictionary lookup by key
    except TimeoutError:
        return "retry later"                 # degraded but safe result
    except KeyError as missing:
        return f"missing field: {missing}"   # unexpected response shape

async def main():
    result = await ask(client, request)      # 'client' supplied by the lab
    print(result)

asyncio.run(main())                          # start the async runtime
```

Read it as a story: a request is assembled as labelled data, a function sends it and waits, failures produce controlled fallbacks, a second function prints the outcome, and the last line starts everything. None of it concerns model intelligence; it is about moving data across a boundary safely.

Three habits help with unfamiliar code: start at the entry point near the last lines, follow names into their definitions, and read comments and exception messages before implementation detail. An unknown name can be treated as a black box until its context explains it.

> **Common mistake:** Reading `await` as a speed boost. It marks a wait point that lets other work proceed; neither the remote call nor the model output changes.

### How labs are structured and kept safe

Every lab has three parts: a goal stating one observable behavior, ordered steps in a scratch directory, and an expected observation so you can check yourself. Labs are deliberately narrow — one idea, one change, one observation. If one feels easy, the value is in explaining why the observation happened.

Safety comes from isolation rather than caution. Work in a scratch repository with sample files and placeholder credentials. Create a branch and commit a baseline so one command restores it. Never aim a lab at a production endpoint, a real customer record, or a shared token. When a call is needed, use a stub returning a canned response until the request shape is confirmed; a stub makes the boundary visible and costs nothing.

For a live call, keep input short, set a small output limit, and record the model version and settings. That metadata makes a surprising result explainable. If a tool can write files or call services, begin read-only or confirmation-required and widen permission only for a specific step. Review the full change set before accepting it and discard anything outside the lab's scope.

| Lab element | Purpose | Safety rule |
| --- | --- | --- |
| Scratch directory | Separates experiments from real projects | No production paths or shared state |
| Baseline commit | Makes the start explicit | Commit before the first change |
| Stub response | Reveals request and response structure | Use before any live credential |
| Small limits | Bounds cost and waiting | Short prompts, modest output caps |
| Observation note | Turns experiment into evidence | Record input, settings, output, reason |
| Review and reset | Prevents accumulation | Inspect the diff, then keep or discard |

When a result is confusing, change one thing at a time. Reproduce the observation, inspect the difference from baseline, adjust one variable, repeat. That sequence is both sound engineering and the reasoning pattern behind diagnosis questions.

### Choosing a surface for the task

The surfaces are interchangeable in theory and distinct in practice. A user-facing feature belongs in application code calling an API through an SDK, with validation and logging. A one-off refactor belongs in a repository assistant session with a clean branch and explicit scope. A background process that decides what to do from changing evidence is an agent, with a loop and stopping conditions. A service several teams want their assistants to query should be published once as a connector.

Ask three questions. Who uses the result: an end customer, a developer, or another program? How much state and control must the surrounding system keep? How often will the capability be reused, and by how many hosts? The answers usually point to one surface; cost and latency refine but rarely overturn the choice.

> **Try it:** Write four one-sentence tasks: a user-facing feature, a repository cleanup, an automated investigation, and a shared knowledge service. Name the surface and reason for each, then revisit after the tool and agent chapters.

### Reading a failure by layer

When something goes wrong, the first job is to name the layer, because each surface offers a different fix. A malformed request or unexpected status code is an API issue: inspect the payload and credentials. A stream arriving as raw text instead of structured events suggests the SDK method is wrong or unused. A coding assistant that edits a file it should have left alone points to context selection or permission configuration, not model quality. An agent repeating the same tool call points to a missing stopping condition or an unhelpful tool result. A connector that appears in the host but cannot be called usually has a permission or transport mismatch.

| Symptom | Likely layer | First check |
| --- | --- | --- |
| Authentication or validation error returned | Model API | Request shape and credentials |
| Events arrive as one undifferentiated blob | Client SDK | Which method opened the stream |
| Forbidden path was modified | Repository assistant | Instruction file, permission mode, hooks |
| Identical tool call repeated many times | Agent loop | Stop condition and tool result content |
| Tool listed but not executable | Connector protocol | Permission grant and transport type |

Naming the layer prevents the most expensive mistake: changing the model when the fault is in the integration. A stronger model will not fix a missing header, and a longer prompt will not enforce a boundary that only a hook can enforce. Reproduce the symptom, locate the layer, change one thing there, and observe again — the loop used in the labs and rewarded in diagnosis scenarios.

> **Common mistake:** Treating every odd output as a model failure. Many symptoms originate in the wrapper, the tool contract, or the data handed to the model.

## Practice lab

**Goal:** Read an asynchronous snippet, run it with a stub, and change one thing safely.

**Steps:**

1. Create a scratch directory, initialize version control, and commit an empty `lab.py` as baseline.
2. Copy the annotated snippet into `lab.py`.
3. Replace the undefined `client` with a stub whose `send` method is asynchronous and returns a dictionary with a `"content"` key and fixed string.
4. Run the script and record the printed text.
5. Make the stub omit `"content"`, run again, and record the fallback.
6. Reset to baseline, then reapply only the change you want to keep.

**Expected observation:** The first run prints the canned summary; the second prints the missing-field message because the handler catches the failed lookup. Resetting restores the original file exactly, showing why a baseline matters more than careful clicking.

## Worked scenario

A team has three requests: a user-facing note summarizer, help splitting a large module, and internal policy documents available to several assistant tools without each team writing its own integration.

The engineer separates them by surface. The summarizer is application code: a backend validates the upload, calls the model through an SDK, checks output against a schema, and stores the result under the user's identity. The model is a dependency, not the system. The module split is a repository task: an assistant works in a dedicated branch, reads the instruction file, proposes a diff, and runs the local test command after each step. The documents are a shared capability: a connector server publishes them as resources and a small search tool, with read-only annotations and per-user permissions enforced by the host.

A fourth need appears: the summarizer must log the prompt and model version behind each result so a complaint can be traced. That adds no surface, only metadata on the existing path, and recording it at one API boundary is simpler than reconstructing it later.

**Resolution:** Match each request to the surface whose responsibilities fit, then add cross-cutting concerns at the boundary where the call is made. One surface for all three would overexpose the model or underuse purpose-built tools.

## Common mistakes

- Assuming an SDK changes the model instead of wrapping the contract.
- Letting the model call external systems directly instead of having application code act.
- Confusing a repository session with a feature that ships to users.
- Treating an agent SDK as a replacement for access control.
- Reading `await` as a performance boost.
- Assuming a generic handler catches every exception.
- Running a lab with a shared token because the example is small.
- Changing several variables after a surprise instead of isolating one.

## Chapter summary

- Five surfaces recur: API, SDKs, repository assistant, agent SDK, connector protocol.
- They compose; an SDK call reaches the API, and an agent still calls a model.
- The application, not the model, owns authorization, validation, and side effects.
- Reading Python means recognizing variables, functions, dictionaries, lists, `await`, and handlers.
- Labs use a goal, steps, and an expected observation in an isolated workspace.
- A baseline, a stub, small limits, and a note make experiments safe and explainable.
- Surface selection follows the result's user, the control required, and expected reuse.

## Checkpoint questions

1. How does a client SDK relate to the model API?

A. It replaces the API with a different model.
B. It wraps the API, handling serialization and common errors while the model stays the same.
C. It only works inside a repository assistant.
D. It removes the need to validate output.

2. Which surface owns the decision to stop an investigation after a fixed number of tool calls?

A. Connector transports.
B. The API token limit.
C. The agent loop and its stopping conditions.
D. SDK authentication.

3. Which construct lets a program wait for a slow call without blocking other work?

A. A dictionary lookup.
B. `await` in an asynchronous function.
C. A `try` block alone.
D. An import statement.

4. In the snippet, what happens when the response has no `"content"` key?

A. The program crashes silently.
B. The `KeyError` handler returns a missing-field message.
C. The `TimeoutError` handler returns a retry message.
D. The request is retried automatically.

5. Why start labs with a baseline commit?

A. It improves accuracy.
B. It makes the start explicit and restores it with one command.
C. The connector protocol requires it.
D. It removes the need for notes.

6. A model returns text requesting deletion of a record. What should the application do?

A. Delete it, because the model asked.
B. Treat it as a proposal and act only after validation and authorization.
C. Ignore all model output thereafter.
D. Forward it to the connector protocol for execution.

7. A coding assistant changes a file that project rules mark as generated. What is the most likely cause?

A. The model is too small for the task.
B. The rule was not in the context the assistant received, or no hook enforced it.
C. The connector transport is misconfigured.
D. The API request used the wrong SDK method.

### Answers and rationale

1. **B.** An SDK is a convenience layer over the same contract. A is wrong because the model is unchanged. C is false because SDKs are general libraries. D is wrong because validation stays with the application.

2. **C.** Step budgets and stopping conditions belong to the agent loop. A governs communication, B concerns output length, and D concerns credentials.

3. **B.** `await` marks a suspension point. A is a data lookup, C only defines a guarded region, and D loads a library.

4. **B.** A missing key raises `KeyError`, which the matching handler converts to a message. A is false because the crash is caught. C handles a different failure. D is false because no retry appears.

5. **B.** A baseline makes changes visible and reversible. A is unrelated, C is false, and D is wrong because notes carry the learning.

6. **B.** Model output is a proposal; the application owns side effects. A skips controls. C is an overreaction. D misassigns execution to a protocol that only describes capabilities.

7. **B.** Behavior that ignores a project rule points to missing context or weak enforcement. A changes the wrong component. C concerns connectors, not repository files. D concerns request mechanics, not file boundaries.

---

*End of chapter 3.*
