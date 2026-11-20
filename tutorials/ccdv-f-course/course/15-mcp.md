# Chapter 15 — MCP: Servers, Resources, Prompts, and Transports

A custom tool solves one application's problem. An organization usually has a different problem: several assistants and host applications all need the same capability, and nobody wants to rebuild the integration for each one. A connector protocol addresses that repetition by defining how a host discovers and uses capabilities offered by a separate server. This chapter examines that architecture, the things a server can expose, the way a session begins and ends, the transports that carry messages, and the checks that make a reusable server trustworthy.

> **Exam note:** The protocol standardizes discovery and message shape. It does not make a server safe or correct. Permissions, validation, and review of exposed content remain with the people deploying the host and the server.

## Learning objectives

By the end of this chapter you should be able to:

- Describe the client, server, and host roles in a connector-server architecture.
- Distinguish tools, resources, prompts, and transports and state what each is for.
- Trace a session, including initialization and capability negotiation.
- Compare local and remote transports and choose one for a given deployment.
- Configure, deploy, and test a small reusable connector server.

## Key concepts

### Why a connector server exists

Imagine three host applications that all need to search the same internal knowledge base. Without a shared protocol, each needs its own adapter, credential handling, and assumptions about results. When the search service changes, three adapters need attention. A connector server turns that many-to-many problem into a two-sided interface: the service owner exposes capabilities once, and each compatible host learns them through discovery.

The host contains a client. It opens a session, asks what capabilities the server offers, forwards tool calls from the model, reads resources when the application needs context, and enforces host policy. The server exposes operations and content, maps them to an underlying system, and returns results in the agreed format. Because the host does not hard-code every tool name, a server can add an operation without a host code change. That flexibility needs governance: a newly discovered capability may require review before the host allows it.

> **Common mistake:** Assuming a registered server is automatically safe. Registration says how to reach it; it says nothing about permissions, handler quality, or returned content.

### The four components

A connector server can expose tools, resources, prompts, and rely on a transport. Tools are callable operations the model may request. Resources are addressable context, usually identified by a URI and read by the application rather than chosen by the model. Prompts are reusable message templates a user or host can invoke. Transports define how messages travel.

| Component | What it is | Who initiates | Example | Test focus |
| --- | --- | --- | --- | --- |
| Tool | Named operation with input schema | Model, through host | Search an index | Arguments, results, errors |
| Resource | Addressable read-only context | Host application | Policy document snapshot | URI validation, freshness |
| Prompt | Reusable template with parameters | User or host | Review against a checklist | Parameter handling |
| Transport | Channel for protocol messages | Client and server | Process pipes or HTTP | Reliability, authentication |

The tools-versus-resources distinction deserves attention. Use a tool when something must happen: a query runs or a record changes. Use a resource when content must be read and attached to a request. A resource is not merely a read-only tool; it has an address, can be listed, and may support change notifications. Prompts are different again. A prompt is not executable business logic. If a capability needs a side effect, it belongs in a tool; if it supplies reusable background text, a resource usually fits better.

> **Try it:** Classify a familiar capability. If it requires an effect, choose a tool. If it is content attached to requests, choose a resource. If it is repeatable wording with slots, choose a prompt.

### Lifecycle and capability negotiation

Both sides begin with no assumptions beyond the protocol. The client opens the transport and sends initialization data containing its protocol version and capabilities; the server replies with its own version and capabilities. Only after that exchange is the connection ready. This is capability negotiation. Servers differ: one may offer tools and resources but no prompts, while another supports change notifications. The client reads the declaration and adapts, hiding unsupported features instead of failing later. A version mismatch should produce a clear error.

After initialization, the client discovers available tools, resources, and prompts by listing them. It caches the lists and may refresh them when the server sends a list-changed notification. During use it calls tools, reads resources, or fetches templates. Shutdown closes the session and releases open handles.

| Phase | Main action | What can go wrong |
| --- | --- | --- |
| Configure | Read registration and environment | Missing command or secret |
| Start | Launch process or connect to endpoint | Crash, unreachable service |
| Initialize | Exchange version and capability sets | Version mismatch |
| Discover | List tools, resources, prompts | New capability appears unreviewed |
| Invoke | Call tools, read resources | Bad arguments, timeout, denial |
| Notify | Receive list-changed messages | Stale cached lists |
| Shut down | Close session | Orphaned process or connection |

A host that skips discovery gives up a main advantage of the protocol. A host that accepts every discovered capability without policy checks gives up control of its attack surface.

Consider a host that can render only tools and resources connecting to a server that also advertises prompts. Negotiation lets the host ignore the prompt capability and still use the other two. Without it, the host might try to fetch a template it cannot render and fail the whole session. The same exchange lets a server reject an outdated protocol version with a clear message instead of replying in a format the client cannot parse.

### Local and remote transports

The protocol messages are the same regardless of how they travel. A local transport usually starts the server as a child process and exchanges messages through standard input and output. Setup is simple and data stays on the machine, but the server shares the host's machine and is awkward to share across hosts. A remote transport sends messages over HTTP to an endpoint. The server can be deployed independently, scaled, and reached by many hosts, but authentication, transport security, and network latency become concerns.

| Property | Local process | Remote HTTP |
| --- | --- | --- |
| Setup effort | Low | Moderate |
| Data path | Within one machine | Across a network |
| Authentication | Process boundary | Explicit tokens and identity |
| Multiple hosts | Awkward | Natural |
| Failure mode | Process exit, closed pipe | Timeouts, resets, auth failures |
| Good default for | Personal tooling, prototypes | Shared production services |

Choice follows the requirement. One developer with a repository assistant should start local. A dozen applications needing one capability should use a remote server with a dedicated identity.

> **Exam note:** Several hosts, a shared service, or independent deployment points to a remote transport. One workstation and minimal setup points to a local process transport.

### Building and deploying a reusable server

Begin with a narrow scope. Decide which operations and content to expose rather than mirroring every backend function. Each tool needs a name, a description with boundaries, an input schema, and a handler that validates before acting. Each resource needs a stable URI pattern and a rule about its contents. Handlers should translate backend failures into structured results, cap result sizes, and resolve paths against approved roots. These are the contract principles from the previous chapter applied at a service boundary.

Registration tells the host how to reach the server: a command and arguments locally, or an endpoint and authentication settings remotely. Secrets should be injected at runtime from a secret store, never written into a configuration file that might be committed.

```json
{
  "version": 1,
  "servers": {
    "policy-kb": {
      "transport": "http",
      "endpoint": "https://policy-kb.internal.invalid/rpc",
      "auth": {"token_env": "POLICY_KB_TOKEN"},
      "capabilities": ["tools", "resources", "prompts"],
      "read_only": true,
      "resource_roots": ["kb://policies/", "kb://forms/"],
      "max_result_items": 20
    },
    "local-notes": {
      "transport": "stdio",
      "command": "python",
      "args": ["-m", "notes_connector"],
      "env": {"NOTES_ROOT": "/srv/notes/approved"},
      "capabilities": ["tools", "resources"],
      "read_only": true
    }
  }
}
```

The first entry is a shared read-only service with allowed resource roots and a token supplied through the environment. The second launches a local server with a fixed notes root, so file access is bounded even if a caller asks for an unexpected path. Deployment habits that pay off later include pinning the server version, logging the discovered capability list at startup, separating development from production, and giving the server its own narrowly scoped identity.

### Testing a server

A server has more layers to test than an in-process function. Handlers can be unit tested. Schemas and error shapes need contract tests. Discovery needs its own check, because a server can pass handler tests yet advertise the wrong list. End-to-end tests through a real host verify that both sides agree on message shape and that policy is enforced.

| Test layer | What it checks | Typical failure caught |
| --- | --- | --- |
| Handler unit test | Core logic with fixed inputs | Wrong result, missing validation |
| Contract test | Schemas, errors, output shape | Field renamed without versioning |
| Discovery test | Listed tools and resources | Capability exposed by accident |
| Transport test | Connection, timeout, authentication | Endpoint rejected or unreachable |
| Permission test | Allowed and denied identities | Read outside approved root |
| End-to-end test | Full round through a host | Format disagreement |

Failure injection is valuable: make the backend unavailable, return a malformed record, and send arguments that violate the schema. A good server returns useful errors and stays usable for other calls. Timeouts should be set on both sides so one slow dependency cannot hold a session open indefinitely.

> **Security note:** Treat resource content and tool results as untrusted input to the host. Text returned by a server may contain instructions aimed at the assistant. Label it as data and keep host policy enforcement outside the server.

## Practice lab

**Goal.** Stand up a tiny connector server with one tool and one resource, register it locally, and verify discovery and invocation.

**Steps.**

1. Create a module exposing a `lookup_policy` tool with a `policy_id` from a short enumeration and a resource pattern `policy://{id}` returning the same text.
2. Reject unknown identifiers with a structured not-found error containing a code, message, and hint.
3. During initialization, advertise `tools` and `resources` but not `prompts`.
4. Add a local process registration with an allowed root pointing at a scratch directory.
5. Connect a client, list capabilities, call the tool, and read the resource.
6. Remove `resources` from the advertised capabilities and repeat discovery.

**Expected observation.** Discovery shows exactly one tool and one resource. The tool returns a compact result and the resource returns the same text at its address. An unknown identifier produces a structured error rather than a crash. When the capability is removed, the host hides resource access instead of failing late. The initialization log shows versions and capability sets from both sides.

## Worked scenario

**Problem.** A training organization wants an assistant that answers questions from an approved course catalogue. A support portal and an internal authoring tool both need the same search operation and reference documents. The catalogue changes weekly, and the team maintaining it does not want to change two integrations. An early proposal copies custom tools into each host.

**Reasoning.** Copying tools creates two implementations that drift. The requirement emphasizes several hosts, shared content, and independent maintenance, which is the pattern a connector server addresses. Search becomes a tool because it runs a query. Individual documents become resources with stable URIs because they are content the host attaches. A standard "summarize this course" template becomes a prompt because it is reusable wording with a parameter. The server uses a read-only identity scoped to the catalogue store, validates query length, caps results, and resolves URIs against an allowlist of prefixes.

**Resolution.** When documents are added, both hosts see them through the existing resource list. The server version is pinned in both hosts and the discovered list is logged, so a future new tool triggers review. A remote transport with a short-lived read-only token replaces the earlier local experiment. Tests cover discovery, URI validation, and a simulated catalogue outage. Duplication disappears because there is one implementation and one place to review changes.

> **Exam note:** Reuse across hosts and independent ownership points to a connector server. One private helper still points to a custom tool.

## Common mistakes

- Exposing a write-capable server where the requirement only calls for reading.
- Treating a resource as a tool, or a prompt as a side-effecting operation.
- Skipping capability negotiation and assuming all servers support the same features.
- Handing every discovered capability to the model without a host allowlist.
- Embedding service tokens in configuration files kept in source control.
- Leaving tool and resource lists uncached and unrefreshed.
- Testing handlers only, without checking discovery or the transport.
- Trusting server-returned text as instructions rather than labeling it as data.

## Chapter summary

- A connector server lets several hosts discover one implementation of a capability.
- The host contains the client, the server exposes capabilities, and the transport carries messages.
- Tools perform operations, resources provide addressable context, prompts are reusable templates, and transports define the channel.
- A session moves through configuration, startup, initialization, discovery, invocation, and shutdown.
- Capability negotiation tells the client which features exist so it can adapt gracefully.
- Local process transports minimize setup; remote HTTP transports support sharing and scaling.
- Registration should pin versions, inject secrets at runtime, and scope the server identity.
- Testing must cover handlers, contracts, discovery, transports, permissions, and full round trips.

## Checkpoint questions

1. Which component fits a stable document the host attaches to a request?

   A. A tool

   B. A resource

   C. A transport

   D. Capability negotiation

2. What is the purpose of the initialization exchange?

   A. Execute the first tool call.

   B. Agree on protocol version and supported capabilities.

   C. Cache resource content permanently.

   D. Replace host-side policy checks.

3. A capability must be shared by several hosts and maintained by a separate team. Which design fits?

   A. A custom tool copied into each host.

   B. A connector server with a remote transport.

   C. A prompt template stored in one host.

   D. A local process launched separately by each user.

4. Which statement about transports is accurate?

   A. Protocol messages differ completely between local and remote.

   B. A local transport requires a token for every call.

   C. The message format is the same; the channel and operations differ.

   D. Remote transports cannot expose tools.

5. A server's discovery list suddenly includes an unreviewed operation. What should the host do?

   A. Use it immediately because discovery implies approval.

   B. Ignore all future discovery updates.

   C. Log the change and allow only capabilities on an approved list.

   D. Delete the registration permanently.

6. Which test layer catches a server advertising a prompt it does not implement?

   A. Handler unit test

   B. Contract test

   C. Discovery test

   D. Token rotation test

7. How should a configuration supply a remote endpoint credential?

   A. Paste the token into the configuration file.

   B. Reference an environment variable populated from a secret store at runtime.

   C. Put the token inside a prompt template.

   D. Ask the model to supply the token during a call.

8. A host can render tools and resources, while a server also advertises prompts. What should happen?

   A. Reject the entire server.

   B. Use the supported capabilities and hide prompts.

   C. Treat prompts as tools.

   D. Rewrite the server's code to remove prompts.

### Answers and rationale

1. **B.** Resources are addressable context for reading. A is an operation. C is the message channel. D is a handshake phase.

2. **B.** Initialization exchanges versions and capability sets. A happens after discovery. C is not part of the handshake. D is wrong because host policy stays with the host.

3. **B.** A shared remote server gives multiple hosts one implementation. A creates drift. C cannot execute the capability. D repeats setup per user.

4. **C.** The protocol defines messages independently of the channel. A is false because semantics carry over. B is false because local processes rely on the process boundary. D is false because any capability can use either transport.

5. **C.** Logging and allowlisting keep discovery useful while controlling the attack surface. A trusts unreviewed code. B gives up updates. D is an overreaction.

6. **C.** Discovery tests compare advertised capabilities with what the server implements. A checks logic in isolation. B checks shapes but not the advertised list. D concerns credential hygiene.

7. **B.** Runtime injection keeps secrets out of version-controlled files. A leaks secrets. C exposes them to the model and logs. D cannot treat the model as a credential source.

8. **B.** Negotiation allows graceful degradation: use what both sides support and hide the rest. A discards a usable server. C confuses a template with an operation. D is unnecessary and outside the host's control.

---

*End of chapter 15.*
