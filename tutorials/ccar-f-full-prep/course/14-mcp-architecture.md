# Chapter 14 — MCP Architecture, Governance, and the Tool Ecosystem

## Learning objectives

- Explain why a standard connection protocol is useful between an assistant and the systems it can act on.
- Distinguish the three core primitives: tools, resources, and prompts.
- Describe the separate responsibilities of the client and the server in a connected tool ecosystem.
- Compare local and remote transport in terms of setup, scope, and trust.
- Frame governance around who may expose a capability, who may call it, and with what scope.
- Apply versioning and least-privilege thinking to a shared tool ecosystem.
- Recognize when a direct integration is simpler than introducing a protocol layer.

## Key concepts

### Why a connection protocol exists

Every assistant that acts on external systems faces the same integration problem. It needs a way to discover what capabilities exist, understand how to call them, and exchange results in a predictable form. If each application solves that problem independently, every combination of assistant and system requires its own custom bridge. The number of bridges grows quickly, and each one encodes the same ideas slightly differently.

A connection protocol standardizes that boundary. It defines how a capability is described, how a request is framed, how a result or error is returned, and how the two sides discover one another. The assistant side can then be built once, and each system exposes its capabilities through a compatible server. Adding a new capability means adding a new server, not rewriting the assistant. This is the infrastructure benefit: the protocol turns tool usage from a bespoke feature into a plug-in ecosystem.

The protocol does not make design decisions on its own. It provides a common shape for descriptions and exchanges, but the quality of a tool definition, the clarity of an error contract, and the safety of a permission model remain the responsibility of the people building each side. A well-formed connection to a poorly described tool is still a poor tool. The protocol removes integration friction, not architectural judgment.

> **Exam note:** Questions about a connection protocol usually test whether you understand the boundary it standardizes. If an answer claims the protocol guarantees safe or correct tool behavior, treat that as an overstatement.

### Core primitives: tools, resources, and prompts

The protocol organizes what a server offers into three kinds of capability. Tools are callable operations with inputs and outputs: they do something, such as fetching a record or creating a ticket. Resources are readable data addressed by an identifier: they make information available without executing an action. Prompts are reusable instruction templates that a client can surface to a user or an assistant, often with parameters that fill in a particular task.

Keeping these separate matters because they have different risk profiles and different lifecycle needs. A tool may have side effects and needs careful permissions. A resource is usually read-oriented, but it still needs scope control because the data may be sensitive. A prompt shapes behavior rather than accessing data, so its main risks are misleading instructions and stale content. Treating all three as interchangeable blurs the governance model and makes review harder.

| Primitive | What it offers | Typical use | Main concern |
| --- | --- | --- | --- |
| Tool | Callable operation with inputs and result | Fetch, create, update, compute | Side effects and permissions |
| Resource | Addressable readable content | Documents, configuration, records | Data sensitivity and freshness |
| Prompt | Reusable instruction template | Starting a recurring task | Clarity and maintenance |
| Discovery | List of offered capabilities | Client learns what is available | Accurate, complete metadata |

Discovery is the mechanism that ties the primitives together. A client asks a server what it offers, receives metadata describing each tool, resource, and prompt, and uses that metadata to decide what to expose to the model. The descriptions returned by discovery are the same routing text discussed earlier in the tool layer. If discovery metadata is vague or incomplete, the model cannot use the capability well, even though the connection itself works perfectly.

### Server and client responsibilities

The server owns the capability. It decides what to expose, implements the behavior, enforces its own checks, and returns results in the protocol's shape. It is also responsible for describing its capabilities accurately, because the client knows nothing beyond what the server publishes. A server should validate inputs, classify errors, and avoid leaking internal detail into descriptions or messages. In short, the server is accountable for the correctness and safety of the operation itself.

The client owns the interaction. It discovers capabilities, decides which ones to make available to the model in a given session, formats requests, and handles results and errors in the loop. The client is also where user consent and permission presentation typically live. A server may declare that a tool requires elevated scope, but the client is usually the component in a position to ask the user and to remember the decision for the session.

Confusing these roles creates gaps. If the server assumes the client will enforce a restriction that the client does not know about, the restriction disappears. If the client assumes the server will reject an out-of-scope call but the server trusts incoming requests, the same gap appears. A reliable design states explicitly which side enforces each rule and treats the other side's checks as defense in depth rather than as the primary control.

> **Common mistake:** Assuming that because a capability is published through a standard protocol, it has been reviewed for safety. Publication is a technical act; approval is a governance act.

### Local and remote transport

Transport is the channel over which client and server exchange messages. A local transport runs the server on the same machine as the client, typically as a child process communicating through standard streams. It is straightforward to set up, inherits the user's local environment, and suits tools that operate on local files, commands, or development resources. Its trust boundary is relatively simple because both sides are on the same host and under the same operating-system account.

A remote transport places the server elsewhere, accessed over a network. This allows an organization to host shared capabilities centrally, apply consistent controls, and serve many clients. It also introduces network concerns: authentication, encryption in transit, availability, and latency. A remote server may have access to systems that a local process should never see, which makes scope control and auditing more important.

| Aspect | Local transport | Remote transport |
| --- | --- | --- |
| Location | Same machine as client | Separate host or service |
| Setup effort | Usually small | Requires hosting and identity |
| Trust boundary | Operating-system account | Network identity and policy |
| Typical use | Files, commands, development tools | Shared enterprise capabilities |
| Failure modes | Process exit, local permissions | Network errors, auth expiry, outage |

The choice is architectural, not merely technical. A local server is easy to experiment with but harder to govern centrally. A remote server is easier to control and audit but adds operational dependencies. Many ecosystems use both: local servers for personal or development work, and remote servers for capabilities that many people share. The important thing is to match the transport to the sensitivity and reach of the capability.

### Governance of exposure, access, and scope

A tool ecosystem raises three governance questions that must be answered explicitly. Who may expose a capability? Who may call it? With what scope may it be called? The first question is about publishing rights: not every team should be able to add a tool to a shared catalog, because every addition changes what the model can see and choose. Publishing should require review of the description, the schema, the error contract, and the permissions the tool requests.

The second question is about consumption. A capability may be available in a catalog but restricted to certain roles, projects, or environments. The client should only surface tools that the current user is entitled to use, and a server should still enforce its own checks on every call. This dual enforcement is deliberate: the client limits what the model can select, while the server prevents a direct call from bypassing that selection.

The third question is about scope, which is where many designs become too generous. A tool that can read a whole data store when the task needs one table is over-scoped. Scope should be the minimum that supports the legitimate use case, expressed through narrow operations, constrained parameters, and credentials with limited reach. Broad scope is convenient during development and dangerous in production, because a mistaken call then has a wide blast radius.

### Versioning and change control

Capabilities change. A parameter is added, an enumeration gains a value, a result field is renamed, or a resource moves. The protocol can carry version information, but the important work is deciding whether a change is compatible. Adding an optional parameter or a new enumeration value is usually compatible, because existing calls still make sense. Renaming a required field, removing a value, or changing what a result means is breaking, because a model that learned the old contract will produce calls that fail or misread results.

Breaking changes need a plan. The old behavior should remain available for a transition period where practical, with a documented date for removal. Clients and tool definitions should be updated before the old behavior disappears, and telemetry should show that calls have moved to the new form. A change that seems harmless in isolation can break a workflow that depends on the exact shape of a result, so review should consider consumers, not just the server code.

Version information should be visible in discovery metadata so a client can make informed choices. Hiding versions behind a stable name is convenient for the model, which should not have to reason about version numbers, but the underlying system still needs to negotiate the correct contract. The right pattern is a stable public name paired with explicit version negotiation in the connection layer, so that model-facing definitions stay clean while operators retain control.

### Security boundaries and least privilege

A connected tool ecosystem creates new paths from a model to real systems, and each path is a potential boundary to defend. The first principle is least privilege: a server should operate with only the credentials and permissions it needs, and each tool should request the smallest scope that supports its purpose. A single powerful credential shared across many tools turns every tool into a high-value target and makes it impossible to grant access to one capability without granting access to all.

The second principle is explicit trust boundaries. Local servers inherit the privileges of the user who starts them, so a tool that runs commands can do anything that user can do. Remote servers present a different boundary, where identity is established by tokens or certificates and must be checked on every call. In both cases, the model's request should never be treated as proof of authorization; authorization comes from the client's policy and the server's checks, not from the fact that a call was well formed.

The third principle is containment of untrusted input. Tool results, resource content, and prompt parameters may originate outside the system and should not be treated as instructions. A server can reduce risk by returning data in clearly typed fields and by avoiding text that looks like directives. The client and model should maintain the separation between instructions and source material, so that content retrieved through a connection cannot redirect the workflow.

> **Exam note:** If a scenario involves a tool that can do far more than its stated purpose, the recommended change is usually to narrow its scope or split it into smaller tools, not to add a warning in its description.

### When a direct integration is simpler

A connection protocol is valuable when there are many capabilities, many consumers, or a need for shared governance. It is not automatically the right choice. A single application that needs three tightly controlled operations from one internal service may be better served by a direct integration with a small, purpose-built interface. Direct integrations can be simpler to reason about, easier to test, and cheaper to operate when the ecosystem is small and stable.

The trade-off is reuse. A direct integration encodes assumptions in one place and cannot be shared with other assistants without additional work. If the organization expects to add more consumers or more capabilities, the up-front cost of a protocol may pay for itself. If the integration is genuinely one-off, that cost is unlikely to be recovered. The decision should be driven by the number of independent sides that need to agree on the boundary.

A useful test is to ask whether the capability will be discovered dynamically at runtime or is fixed at build time. Dynamic discovery across many tools favors a protocol. A fixed set of known operations favors direct integration. Hybrid approaches are common: a protocol handles the broad catalog while a few high-volume operations use optimized direct paths. What matters is that the choice is deliberate and that the governance model remains clear either way.

### Worked minimal server skeleton

The block below sketches the shape of a small server. It is illustrative rather than executable, but it shows the responsibilities described in this chapter: declaring capabilities, validating inputs, mapping failures to categories, and returning results in a predictable form. Notice that the descriptions are part of what the server publishes, so they are treated as a first-class part of the interface.

```text
SERVER: incident_lookup
declare:
  tool: get_incident
    description: "Returns the current status of one incident by identifier.
      Use for status checks. Do not use for creating or editing incidents."
    input:
      incident_id: string, required, pattern: inc-number
    result:
      ok: boolean
      status: enum [open, in_progress, resolved]
      updated_on: date
    errors:
      NOT_FOUND -> terminal, suggest verify identifier
      ACCESS_DENIED -> terminal, suggest request scope
      SOURCE_UNAVAILABLE -> retryable, suggest bounded retry

on discovery_request:
  return declared capabilities with names, descriptions, and schemas

on call_request:
  verify caller scope for the requested operation
  validate input against the declared schema
  if invalid: return structured error with offending field
  attempt the underlying lookup
  if failure: return classified error with request identifier
  else: return result with only the declared fields
```

This skeleton also shows where governance lives. Scope is verified before validation, errors carry a category and a suggestion, and results contain only declared fields. These habits scale from one small server to a large shared ecosystem.

## Worked scenario

An organization wanted an assistant to help reviewers triage support cases across two internal systems. One team proposed publishing every operation from both systems through a shared connection server, including administrative actions that could reassign or close cases. Another team proposed a small set of read-oriented capabilities with a separate, tightly gated action for closing a case.

A reviewer compared the proposals against the governance questions. Publishing every operation would make the catalog large and would expose administrative scope to any client that connected. Even if the client hid those tools from most users, the server would still accept calls from any correctly authenticated session, so the effective permission was broad. The description burden would also be high, because each administrative operation needs careful routing text to prevent accidental use.

The team chose the smaller catalog. The read capabilities used credentials limited to the two systems' query interfaces. The close action was published separately with an explicit approval field, a narrow enumeration of valid reasons, and server-side verification that the caller held a defined role. Version metadata was added to discovery so that clients could be updated before an old field was retired. A local server was used for development work on sample data, while the shared production server ran remotely with central logging.

The result was a catalog that reviewers could understand and that supported the actual workflow. Capabilities that were not needed were never exposed, which reduced both selection ambiguity and the blast radius of a mistaken call. The protocol still provided the integration benefit: adding a third source later meant adding another server, not rewriting the assistant.

## Common mistakes

- Assuming the protocol guarantees that a tool is well described or safely permissioned.
- Treating tools, resources, and prompts as interchangeable instead of governing them differently.
- Leaving enforcement ambiguous between client and server, so neither side checks a rule.
- Publishing broad credentials because they are convenient during development.
- Ignoring version compatibility and changing a result shape without a transition plan.
- Choosing remote transport for a small local capability, adding needless operational dependency.
- Allowing content retrieved through a connection to be treated as instructions.

## Chapter summary

- A connection protocol standardizes the boundary between an assistant and external capabilities.
- The core primitives are tools, resources, and prompts, supported by discovery metadata.
- Servers own capability behavior; clients own discovery, presentation, and user consent.
- Local transport suits development and personal tools; remote transport suits shared capabilities.
- Governance answers who may expose a capability, who may call it, and with what scope.
- Compatible changes are safe to roll out; breaking changes need versions and a transition plan.
- Least privilege, dual enforcement, and separation of untrusted content are the core security habits.
- Direct integration is simpler when the set of capabilities and consumers is small and fixed.

## Checkpoint questions

1. Which statement best describes the value of a standard tool-connection protocol?

- A. It guarantees that every published tool is safe to use.
- B. It standardizes discovery, requests, results, and errors so one assistant can work with many servers.
- C. It removes the need to write tool descriptions.
- D. It replaces the need for permission checks.

2. A server offers read-only case documents addressed by an identifier. Which primitive is this?

- A. A tool.
- B. A resource.
- C. A prompt.
- D. A transport.

3. A client hides an administrative tool from most users, but the server accepts the call from any authenticated session. What is the main problem?

- A. The description is too long.
- B. The transport is local.
- C. Enforcement is inconsistent, leaving broad effective access.
- D. The tool needs an enumeration.

4. Which change is most likely to be compatible with existing callers?

- A. Renaming a required parameter.
- B. Removing an enumeration value that callers use.
- C. Adding an optional parameter with a safe default.
- D. Changing the meaning of a result field.

5. When is a direct integration most defensible?

- A. When many assistants must discover capabilities at runtime.
- B. When the capability set and consumer set are small and fixed.
- C. When a shared catalog is a strategic goal.
- D. When capabilities change every day.

6. Which security habit best limits the damage from a mistaken tool call?

- A. Granting each tool the smallest scope that supports its purpose.
- B. Sharing one powerful credential across all tools.
- C. Trusting any well-formed request as authorized.
- D. Hiding descriptions from the client.

### Answers and rationale

1. Correct: B. The protocol's benefit is a common boundary for discovery and exchange. A is wrong because the protocol does not certify safety. C is wrong because descriptions remain essential routing text. D is wrong because permission checks are still required on both sides.

2. Correct: B. Addressable readable content is the defining shape of a resource. A is wrong because a tool is a callable operation, not passive content. C is wrong because a prompt is an instruction template. D is wrong because transport is the channel, not the capability.

3. Correct: C. The server becomes the real enforcement point, so hiding the tool in the client does not restrict access. A is irrelevant to authorization. B is wrong because transport location does not fix the gap. D is wrong because an enumeration would not address scope.

4. Correct: C. An optional parameter with a default preserves existing call behavior. A and B are wrong because renaming or removing values breaks callers. D is wrong because changing a field's meaning silently corrupts downstream reasoning.

5. Correct: B. A small, fixed set of capabilities and consumers does not repay the cost of a protocol layer. A and C are wrong because many consumers or a shared catalog favor standardization. D is wrong because frequent change favors a managed catalog.

6. Correct: A. Least privilege reduces the blast radius of a mistake. B is wrong because a shared powerful credential maximizes it. C is wrong because well-formed requests are not authorization. D is wrong because hiding descriptions harms selection without improving security.

---

*End of chapter 14.*
