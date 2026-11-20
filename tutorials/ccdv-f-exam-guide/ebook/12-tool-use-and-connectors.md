# Chapter 12 — Tool Use and Connector Patterns

A language model on its own can only produce text. Tool use is what turns that text into action: reading a file, querying a database, opening a web page, or updating a record. The model does not execute anything itself. Instead, it requests an operation in a structured form, your application executes it, and the result is returned so the model can continue. Understanding that handoff in detail is the difference between an assistant that merely talks about work and one that actually does it.

This chapter follows the request from the first tool definition to the final answer. It explains how to describe tools so the model chooses them correctly, how parallel calls are matched back to their results, and how to decide whether a capability should be a small in-process function, a reusable packaged skill, or a standardized connector. It then looks at the universal connector layer and its client and server roles, shows how to build and register a connector, covers common capabilities such as files, source control, and search, and closes with testing and timeout handling.

> **Exam note:** Tool-use questions often test the boundary between what the model decides and what your application does. The model decides *which* tool to request and *what arguments* to supply. Your application decides whether to run it, how to run it, and what result to return.

## Learning objectives

By the end of this chapter you should be able to:

- Trace the full tool-use round trip, including stop reasons, tool calls, results, and follow-up responses.
- Write tool names, descriptions, and schemas that lead to reliable selection and valid arguments.
- Explain how parallel tool calls are identified and how results are matched back to calls.
- Choose between an in-process tool, a reusable skill, and a standardized connector for a given requirement.
- Describe the client and server roles in a universal connector layer.
- Build and register a simple connector server using a configuration file.
- Recognize how file, source-control, and search capabilities are exposed safely through connectors.
- Test tool selection accuracy and handle timeouts and failures gracefully.

## Key concepts

### The tool-use round trip, step by step

Tool use is a conversation with a structured detour. The application sends a request that includes the conversation so far and a list of available tool definitions. Each definition has a name, a description, and an input schema. The model reads both the conversation and the definitions, then produces one of two outcomes: ordinary text, or a request to call a tool.

When the model wants a tool, it emits a structured block containing the tool's name and an input object that should satisfy the schema. The model does not run the tool. The response ends with a stop reason indicating that a tool is pending. Your application notices this, validates the request, executes the real operation, and appends a result block tied to the same call identifier. Then it sends the conversation back to the model, which reads the result and either produces a final answer or requests another tool. That loop can repeat several times.

The phases are worth memorizing because exam questions frequently ask which component owns which step.

| Phase | What happens | Who owns it |
| --- | --- | --- |
| Declaration | Tool names, descriptions, and schemas are sent with the request | Application |
| Decision | Model chooses whether to respond with text or request a tool | Model |
| Request | Model emits a tool name, arguments, and a unique call identifier | Model |
| Validation and execution | Arguments are checked, policy is applied, and the operation runs | Application |
| Result | A result block is appended with the matching call identifier | Application |
| Continuation | Model reads results and produces text or another tool request | Model |
| Termination | A final answer is returned when no tool is pending | Application and model |

Two details cause most bugs. First, the result must reference the exact call identifier from the request; otherwise the conversation becomes inconsistent and the model may not understand which result belongs to which request. Second, errors are results too. A failed tool call should be returned as a clear error result so the model can explain the failure or try a different approach, rather than leaving a dangling request with no answer.

> **Common mistake:** Treating the model's tool request as proof that the operation is safe or correct. The request is a proposal. Validation, authorization, and execution remain your application's responsibility.

### Writing unambiguous tool descriptions and schemas

A tool definition is an interface contract between your application and the model. If the contract is vague, the model will pick the wrong tool or supply the wrong arguments. Good definitions are specific about purpose, boundaries, and the shape of the input.

The name should be short, descriptive, and use a consistent verb pattern. A name like `read_repository_file` tells the reader both the action and the domain. The description should say what the tool does, when to use it, when *not* to use it, and any important limitation, such as being read-only or requiring an absolute identifier. Descriptions are the main signal the model uses to choose among tools, so distinguishing one tool from another is more valuable than repeating generic praise.

The input schema should use standard JSON Schema structure. Mark required fields, choose types that prevent ambiguity, use enumerations when the value comes from a small set, and describe each property with an example where helpful. A `path` field described as "repository-relative path such as src/app.py" leads to better arguments than one described simply as "file." Avoid overlapping tools whose descriptions could both apply to the same request, because selection accuracy drops when the choice is not clear.

Consider the size of the tool set as well. Presenting dozens of tools at once makes selection harder and increases token cost. Group related capabilities, expose only the tools relevant to the current task when your architecture supports it, and keep descriptions concise but complete.

```json
{
  "name": "read_repository_file",
  "description": "Read the text of one file in the connected repository. Use when the user asks to inspect source code, configuration, or documentation from that repository. Do not use for editing, deleting, or for files outside the repository. This tool is read-only and accepts repository-relative paths only.",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Repository-relative path, for example src/app.py"
      },
      "line_range": {
        "type": "string",
        "description": "Optional inclusive line range such as 10-40"
      }
    },
    "required": ["path"]
  }
}
```

Notice that the description includes a negative case. Saying what a tool must not be used for is often more useful than another sentence about what it can do.

> **Try it:** Write two tools with similar purposes and ask the model to choose between them for five sample requests. If the choices are inconsistent, rewrite the descriptions to state a clear boundary, then repeat the test.

### Parallel tool calls and result matching

A single model response can request several tool calls at once. This is useful when the calls are independent, such as reading three unrelated files or looking up two separate terms. The model emits multiple tool blocks in one message, each with its own unique call identifier. Your application can execute them together, then return one result block per call identifier.

Matching is strictly by identifier, not by position or name. Two calls to the same tool with different arguments must produce two distinct results, each carrying the identifier of the call it answers. If your execution layer runs calls concurrently and returns results in a different order than the requests, that is fine as long as each result references the correct identifier. If you accidentally reuse an identifier or omit a result, the conversation becomes invalid and the model may repeat the call or lose track of what happened.

Parallelism introduces ordering and dependency concerns. Only run calls in parallel when they truly are independent. If one call needs the output of another, request them in sequence across two round trips. Running dependent calls at the same time produces guesses rather than results, because the second call cannot know the first call's output.

There is also a cost tradeoff. Parallel calls reduce wall-clock time when operations are slow, but they can multiply load on downstream systems and make rate limits more likely. Many applications cap the number of simultaneous calls and queue the rest, which keeps latency reasonable without overwhelming a service.

A small Python sketch shows how results are collected and attached to their identifiers.

```python
def run_tool_calls(tool_blocks, executor):
    results = []
    for block in tool_blocks:
        try:
            output = executor(block.name, block.input)
            results.append({"call_id": block.id, "content": output})
        except Exception as exc:
            results.append(
                {"call_id": block.id, "is_error": True, "content": str(exc)}
            )
    return results
```

Even in this simple sequential version, each result is paired with its own identifier and failures become results rather than crashes.

### Choosing an implementation: in-process tool, reusable skill, or connector protocol

Not every capability should be built the same way. Three common options are an in-process custom tool, a reusable skill, and a standardized connector. They differ in scope, reuse, and how much plumbing you must write.

An in-process tool is a function in your application that you expose directly to the model. It is the fastest option to build and the easiest to secure, because it runs inside your own process and can inspect its inputs directly. It is a good default for application-specific logic such as formatting a record or calling an internal service.

A reusable skill packages instructions and supporting files so the same capability can be adopted by multiple assistants or projects. Skills are useful when the behavior is defined more by procedure and knowledge than by a single function call, for example a repeatable review workflow with templates and reference material. They trade a little more structure for portability and consistency.

A standardized connector follows an open protocol that lets a host application discover and use tools supplied by a separate server. It is the right choice when a capability should be shared across different hosts, maintained by another team, or exposed to several assistants without rewriting the integration each time. The cost is extra moving parts: a server process, a transport, and a registration step.

| Criterion | In-process custom tool | Reusable skill | Standardized connector |
| --- | --- | --- | --- |
| Best for | One app's specific logic | Repeatable procedures with shared guidance | Capabilities shared across hosts and teams |
| Packaging | Function in your codebase | Folder of instructions and assets | Separate server exposing a protocol |
| Reuse | Within one project | Across projects that adopt the skill | Across any compatible host |
| Setup effort | Lowest | Moderate | Highest |
| Control over execution | Full | Shared with skill contents | Shared with server owner |
| Testing surface | Unit tests on the function | Workflow tests plus content review | Protocol tests plus server tests |
| Security consideration | Validate inputs in your code | Review packaged instructions and scripts | Scope server permissions and transport trust |

Choose based on the change you expect. If the capability is small and unique, keep it in-process. If you find yourself copying the same procedure into several projects, turn it into a skill. If several different hosts need to reach the same system, invest in a connector.

> **Exam note:** A question that emphasizes sharing a capability across different host applications is pointing toward a standardized connector. A question about one application's private helper is pointing toward an in-process tool.

### The universal connector layer: clients and servers

A universal connector layer defines a common way for a host application to discover and use external capabilities. Instead of writing a custom integration for every assistant and every service, you implement a small protocol once on each side. The host acts as a client; the capability provider acts as a server. The client opens a session, learns what the server offers, and invokes tools or reads resources through a consistent interface.

The client lives inside the host application. It manages the connection, forwards tool calls from the model to the server, returns results to the application, and enforces the host's policies. The server exposes a set of tools, resources, and sometimes reusable prompt templates. It decides what operations are available and how they map to the underlying system, such as a filesystem, a repository, or a search index.

Discovery is a key part of the design. When the client connects, it asks the server what capabilities it supports. The server returns its tool definitions and descriptors, which the client can then include in model requests. This means you do not hard-code every tool in the host; the tool set can grow as the server grows, subject to the host's approval.

Transports describe how the two sides talk. A local server can communicate over standard input and output, which is simple and keeps data on the machine. A remote server can communicate over HTTP, which supports distributed deployments but requires attention to authentication and transport security. Many hosts support both, and the exam may ask you to recognize which transport fits a scenario.

| Role | Responsibility | Typical concern |
| --- | --- | --- |
| Client | Opens connection, discovers capabilities, forwards calls, applies host policy | Untrusted server content, permission prompts, tool selection |
| Server | Declares tools and resources, executes operations, returns results | Scope of credentials, path validation, safe error messages |
| Transport | Carries messages between client and server | Local isolation versus remote authentication |
| Host application | Owns the user experience and final enforcement | Approval flows, audit logging, rate limits |

The word "universal" refers to the goal: one protocol that any compliant host and any compliant server can speak. It does not mean every server should be trusted. Capabilities from a server are still code and still need scoping, review, and monitoring, just like any other dependency.

### Building and registering a connector server

Building a connector server means listing the operations you want to expose, defining their schemas, and implementing the handlers that perform them. Keep the tool set focused and give each tool the narrowest permission it needs. A server that offers one read operation over a single directory is far easier to reason about than one that accepts arbitrary paths and commands.

Registration tells the host how to start or reach the server. For a local server you typically specify a command and arguments, plus any environment variables it needs. For a remote server you specify an endpoint and authentication settings. The host reads this configuration when it starts and connects as needed. Secrets required by the server should be injected at runtime rather than stored in the configuration file.

```json
{
  "version": 1,
  "connectors": {
    "repo": {
      "transport": "stdio",
      "command": "python",
      "args": ["-m", "repo_connector"],
      "capabilities": ["tools", "resources"],
      "readOnly": true,
      "allowedRoots": ["/srv/project/repository"]
    },
    "search": {
      "transport": "http",
      "endpoint": "https://search.internal.example.invalid/connector",
      "capabilities": ["tools"],
      "readOnly": true
    }
  }
}
```

The example uses a placeholder address that cannot route on the public internet, which is a common convention in documentation samples. In a real deployment, the endpoint would be an internal address and the authentication settings would reference a secret source rather than embedding a value.

A few registration habits prevent trouble later. Use fixed versions for server packages so an update cannot silently change tool behavior. Record which host is allowed to use which connector, and separate development and production servers. Log the discovered tool list at startup so you can see when a server begins advertising a new capability that needs review.

> **Security note:** A connector server runs with its own permissions. Give it a dedicated identity scoped to the data it must expose, and never reuse a broad administrative credential just to get an integration working quickly.

### Connecting file, source-control, and search capabilities

Three capability families appear constantly in assistant applications: files, source control, and search. Each can be offered through a connector, and each needs a different safety posture.

File connectors expose reading, listing, or writing files. The safest pattern for an assistant that only needs context is a read-only server rooted at a fixed directory. Path validation should resolve the requested path and confirm that it remains inside the approved root before opening anything. Be alert for paths that escape through relative segments or symbolic links, and treat file content as untrusted text because it may contain injected instructions.

Source-control connectors expose operations such as listing files, reading a revision, viewing a diff, or describing a commit. Read-only views are usually safe to offer broadly. Any operation that changes branches, commits, or remote state deserves an approval gate and a narrow credential. Because repository content includes configuration and scripts, assume that anything read from it could carry hostile text aimed at the assistant.

Search connectors expose queries over a document index. They are powerful because they help the model find relevant context, and risky because the retrieved snippets become part of the model's context. Validate query parameters, limit result size, and consider filtering which indexes a connector may access. Retrieved results should be labeled as data, not instructions, in the surrounding request.

| Capability | Typical read operation | Risky extension | Recommended default |
| --- | --- | --- | --- |
| Files | Read or list within a fixed root | Arbitrary path writes, deletions | Read-only, root-constrained, path-validated |
| Source control | View files, diffs, commit metadata | Commits, pushes, branch changes | Read-only views, approval for any mutation |
| Search | Query an approved index with limited results | Querying all indexes, unbounded results | Allowlisted indexes, size limits, result labeling |

The common thread is that reading is cheaper to secure than writing. When a task only requires understanding information, expose read operations and stop there. Add write capability later, deliberately, with approval and logging.

### Testing tool selection accuracy and handling timeouts

A tool-use application has a new kind of test surface: did the model choose the right tool and supply usable arguments? Selection accuracy is measured with an evaluation set. Build a collection of representative user requests, label the expected tool and key arguments for each, run them through the application, and compare. Track failures by category, such as choosing the wrong tool, omitting a required argument, inventing a value, or calling a tool that was not needed.

When accuracy is poor, the usual fixes are better descriptions, fewer overlapping tools, and clearer examples inside descriptions. If the model invents values, make the schema stricter and tell the tool to ask for missing information rather than guessing. If it picks a near-neighbor tool, sharpen the difference in the negative cases of both descriptions. Re-run the evaluation set after every change so improvements are measured, not assumed.

Timeouts and failures are inevitable. A tool that queries an external service may hang, a connector server may be unavailable, and a rate limit may reject a call. The application should impose a timeout on every execution, catch failures, and return a concise error result to the model. A good error result says what failed in plain terms and suggests a safe alternative, such as trying a different tool or asking the user for clarification. Avoid returning raw stack traces or internal paths, which can leak information and confuse the model.

Retries need care. Retrying a read-only operation is usually harmless. Retrying a write can duplicate a side effect, so make such operations idempotent where possible or require a fresh approval. Cap the number of retries and use backoff so a temporary outage does not turn into a flood of calls. If the same tool keeps failing, the better behavior is often to stop and report the problem to the user.

> **Exam note:** When a scenario describes a slow or flaky tool, the exam-correct answer usually combines a timeout, a clear error result, bounded retries, and a graceful message to the user. Silently waiting forever or retrying a mutation without limits is rarely right.

## Worked scenario

**Problem.** A team wants an assistant that answers questions about a code repository. It must read any file in the repository, explain code, and trace references. It must never modify, create, or delete anything, and it must not be able to read secrets that live outside the repository. The team initially exposes one general tool named `filesystem` with create, read, update, and delete operations, guarded only by a sentence in the system prompt that says the assistant is read-only.

**Reasoning.** A prompt-level restriction is not an enforcement point. If the model misreads an instruction embedded in a README, or if a user asks insistently, the write operations are still available and the running identity may still have permission. The correct approach is to remove the capability rather than describe it as forbidden. That means a read-only connector, a fixed root, path validation on the server, and a dedicated identity with no write grants. The file content also needs to be treated as untrusted data, because a repository can contain text designed to steer the assistant.

The team also needs to verify that selection works. With a single broad tool, there is nothing to select, but there is too much authority. With several narrow read tools, selection matters and must be tested. They choose three narrow operations: read a file, list a directory, and search text within the repository. Each has a distinct description with a negative case, and each is backed by path validation that resolves the target and confirms it stays under the repository root.

**Resolution.** They replace the general tool with a read-only connector server configured with a fixed root and a dedicated identity that has read access to the repository and nothing else. The server exposes the three read operations. Its handlers resolve every requested path, reject relative segments that escape the root, and refuse symbolic links that point outside it. The configuration marks the connector as read-only, and the client enforces this by not registering any mutation tool at all.

They add a pre-tool-use hook that double-checks the resolved path on the client side, so even a flaw in the server cannot write or escape. Retrieved file text is wrapped and labeled as data in the request, and an output check flags any attempt to include credential-looking strings in an answer. The audit log records the tool name, resolved path, and decision for each call.

Finally, they build an evaluation set of twenty requests: "show the configuration for logging," "which modules import the parser," "list files in the scripts folder," and similar tasks. They label the expected tool for each and measure selection accuracy. Two requests initially choose the search tool when listing was expected, so they sharpen the descriptions to say that listing returns names only while search returns matching lines. Accuracy improves, and the suite becomes a regression check for future description changes.

The result is an assistant that can read everything it needs and nothing it should not. Even if hostile text in a file tells it to write a backdoor, the write operation does not exist, the path check would reject an escape attempt, and the hook would block anything suspicious. The guarantee comes from the structure of the system, not from the model's good intentions.

> **Exam note:** When a requirement says "must never" perform an action, the strongest design removes the capability. Approval gates and prompts are useful for risky-but-sometimes-needed actions, not for actions that are always forbidden.

## Common mistakes

- Returning a tool result without the call identifier it answers.
- Running dependent calls in parallel and expecting one call to use another's output.
- Writing descriptions that overlap so the model cannot tell which tool fits.
- Exposing a broad tool and relying on prompt wording to restrict it.
- Embedding connector credentials in a configuration file that can be committed.
- Treating discovered tools as automatically trusted because they came from a registered server.
- Returning raw exceptions as tool results, which can leak internals and derail the conversation.
- Retrying a write operation without idempotency, which can duplicate side effects.

## Chapter summary

- Tool use is a round trip: the application declares tools, the model requests one, the application validates and executes it, and the result is returned for continuation.
- Results must be matched to calls by unique identifiers, and failures should be returned as clear error results.
- Good tool definitions use distinct names, purpose-and-boundary descriptions, and precise schemas with required fields and enumerations.
- Parallel calls are appropriate only when operations are independent; ordering does not matter if identifiers are correct.
- Choose an in-process tool for one app's logic, a skill for a reusable procedure, and a connector for capabilities shared across hosts.
- A universal connector layer has a client inside the host and a server exposing tools and resources, connected over a local or remote transport.
- Building a connector means defining narrow tools, implementing safe handlers, and registering the server with a configuration that injects secrets at runtime.
- File, source-control, and search connectors default to read-only views, fixed roots, allowlists, and size limits.
- Selection accuracy is measured with a labeled evaluation set, and timeouts need bounded retries and graceful error results.

## Checkpoint questions

1. After a model requests two tool calls in one response, how should the application return the results?

   A. Combine both outputs into one text block with no identifiers.

   B. Return one result per call, each referencing that call's unique identifier.

   C. Return results in the order the calls were declared, ignoring identifiers.

   D. Return only the result of the first call and discard the other.

2. Which change most improves tool selection accuracy when the model often chooses the wrong tool?

   A. Add more tools with similar descriptions so it has more options.

   B. Shorten every description to a single word.

   C. Clarify each description with a distinct purpose and explicit negative cases.

   D. Increase the maximum response length.

3. When should tool calls be run in parallel?

   A. Always, because it reduces latency in every case.

   B. Only when the calls are independent of one another.

   C. Only when they all write to the same resource.

   D. Never, because the protocol forbids it.

4. A capability must be available to several different host applications maintained by different teams. Which implementation fits best?

   A. An in-process custom tool in one host.

   B. A standardized connector server.

   C. A hard-coded function in the model request.

   D. A prompt template with no executable component.

5. In a universal connector layer, what is the server responsible for?

   A. Deciding which model the host uses.

   B. Rendering the user interface for the assistant.

   C. Declaring tools and resources and executing the requested operations.

   D. Replacing the host's approval and logging rules.

6. An assistant must never modify repository files. What is the strongest design?

   A. Tell the model in the system prompt not to write files.

   B. Expose only read operations through a read-only server with a fixed root and validated paths.

   C. Expose write tools but require the model to ask before using them.

   D. Log write attempts and review them each week.

7. A slow external tool times out repeatedly. What is the best handling?

   A. Let the call run indefinitely so no information is lost.

   B. Return a raw stack trace as the result.

   C. Apply a timeout, return a concise error result, bound retries, and inform the user if it keeps failing.

   D. Remove all error handling so the failure is obvious.

### Answers and rationale

1. **B.** Each result must carry the identifier of the call it answers, regardless of execution order. A loses the association entirely. C works only by coincidence and breaks when calls complete out of order. D leaves a pending request unanswered and may cause the model to repeat it.

2. **C.** Distinct purposes and explicit negative cases give the model a clear basis for choosing. A adds confusion and more overlap. B removes useful signal. D changes nothing about the decision being made.

3. **B.** Parallelism helps when calls do not depend on each other. A ignores dependencies and downstream load. C describes a case that could cause conflicts. D is simply false; the protocol supports multiple calls in one response.

4. **B.** A standardized connector lets multiple hosts discover and use the same capability through one protocol. A and C are confined to a single application. D cannot perform the operation at all.

5. **C.** The server declares what it offers and carries out operations against its underlying system. A is a host or platform choice. B belongs to the host application. D is wrong because host policy and logging remain with the host and are not replaced by the server.

6. **B.** Removing write capability and constraining reads makes the restriction structural rather than behavioral. A is only guidance and can be overridden. C still leaves the capability available. D detects problems after the fact rather than preventing them.

7. **C.** A timeout prevents indefinite waiting, a concise result lets the model continue sensibly, bounded retries avoid a flood, and a user message closes the loop. A risks hanging the whole request. B leaks internals and confuses the model. D turns a recoverable condition into a crash.

---

*End of chapter 12.*
