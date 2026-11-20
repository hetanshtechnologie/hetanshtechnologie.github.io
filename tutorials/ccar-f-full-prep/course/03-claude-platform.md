# Chapter 3 — The Claude Platform: API, Assistant, and Code Environment

## Learning objectives

- Describe the main surfaces of a modern assistant platform and how they relate to one another.
- Choose an appropriate surface for a task based on control, context, and collaboration needs.
- Explain what a model API provides and what the surrounding application must supply.
- Distinguish hosted chat and project spaces from a repository coding assistant and an agent SDK.
- Explain what a connector does and why the tool-connection protocol is treated as infrastructure.
- Compare individual and team plans at a principle level using permissions, data handling, and collaboration.
- Separate casual conversation from a work product that must be verified before use.

## Key concepts

### The platform as a set of surfaces

A modern assistant platform is not one product with one interface. It is a family of surfaces that share an underlying model but differ in how much control they give you, how much they remember, and who can participate. Thinking in terms of surfaces is more useful than thinking in terms of features, because the surfaces answer different questions. Some are designed for a person working interactively. Some are designed for an application calling a service. Some are designed for code running inside a repository. Confusing them leads to designs that are hard to govern.

Five surfaces matter for this course: the model API, hosted chat and project spaces, a repository coding assistant, an agent SDK, and a tool-connection protocol. They are not competing alternatives in a simple hierarchy. The API is the foundation that the other surfaces build on or complement. The SDK gives a developer structured control over loops and tools. The coding assistant packages that control for repository work. Hosted spaces package it for people. The connection protocol standardizes how tools are exposed to any of them.

| Surface | Primary user | What it supplies | What it leaves to you |
| --- | --- | --- | --- |
| Model API | An application or service | Model access, message handling, generation controls | Conversation state, tools, validation, policy |
| Hosted chat and projects | A person working interactively | Ready interface, shared spaces, file handling | Reproducibility and enforced workflow design |
| Repository coding assistant | A developer in a codebase | File, search, command, and task operations | Review discipline and scope limits |
| Agent SDK | An engineer building a system | Loop, tool, and session abstractions | Tool contracts, stop conditions, governance |
| Tool-connection protocol | An integrator exposing capabilities | A standard way to describe and call tools | Authorization design and operational controls |

> **Exam note:** Questions about platform choice usually turn on who controls the loop and who is accountable for the result. The surface that gives more explicit control is not automatically better; it is better only when the task needs that control.

### The model API

The model API is the most direct surface. An application sends a structured request containing messages, optional tool definitions, and generation controls, and receives generated output. The API does not manage a long-lived relationship with the user by itself. Unless the application sends prior turns back as part of the request, the model has no memory of them. It does not decide when to call a tool on its own either; the application must expose tools in the request and handle the returned call.

This division of responsibility is the central architectural fact about the API surface. The model supplies prediction. The application supplies everything else: session state, retrieved material, tool execution, logging, retry logic, validation, and permission checks. A design that assumes the API will handle these concerns is a design with gaps. In practice, most of the difficulty in a production system sits in the application layer around the model, not in the wording of a single request.

The API surface is the right choice when a system must be embedded in a larger service, when requests need to be reproducible and logged, when tool execution must be tightly controlled, or when an organization needs to apply its own policies consistently. It is a poor choice for a quick exploratory conversation because it requires infrastructure before it produces value.

### Hosted chat and project spaces

Hosted chat gives a person an immediate working interface. Project spaces add shared context, files, and a place for a team to organize related work. These surfaces lower the cost of starting: there is nothing to build, and the assistant can read supplied material and produce drafts quickly. They are well suited to exploration, brainstorming, early analysis, and reviewing a document you already understand.

Their strength is also their limitation. Because the interface is designed for fluid interaction, it is easy to move from exploration to a decision without a deliberate verification step. The record of what happened is a conversation, not a tested artifact. Project context may accumulate material from many sources, and it is not always obvious which source a particular claim came from. For high-consequence work, a hosted conversation is usually the place where a candidate answer is formed, not the place where it is accepted.

> **Common mistake:** Treating a confident answer in a chat window as a checked result. A conversation is a working space; a reviewed artifact is a different object with a different status.

### The repository coding assistant

A repository coding assistant operates inside a codebase. It reads files, searches for patterns, makes edits, and may run commands or manage tasks. The important point is not the specific list of operations but the mapping: the same reasoning-and-action pattern that appears in an API tool call appears here as a file read or an edit. The underlying principles are identical. Tools need clear scope, results need to be bounded, and actions with side effects need review.

Because the coding assistant works in a local environment, permission and scope matter more than in a casual chat. An edit to a file is a real change. A command can have effects beyond the repository. Modes that separate planning from execution exist for this reason: in a planning mode the assistant can propose changes without applying them, while an execution mode allows edits and commands. Choosing the mode is a risk decision, not a convenience.

The coding assistant is the right surface when the work is tied to code and the reviewer wants changes in place, with tests and diffs available. It is not the right surface for a decision that belongs in a design document or a policy conversation.

### The agent SDK

The agent SDK is aimed at engineers who want to build a system that acts over multiple steps. It provides abstractions for the orchestration loop, tool definitions, session handling, and sometimes subagents. Instead of writing every step of the loop yourself, you configure a loop that the SDK runs, supplying the tools and the rules that bound it.

What the SDK does not do is decide what is safe. Stop conditions, step budgets, allowed tools, approval gates, and error handling remain design responsibilities. An SDK can make a loop convenient to implement; it cannot tell you that a particular action should require approval in your organization. The exam often tests this distinction by offering an option that says the framework handles governance automatically. That option is wrong.

Choose the SDK when the task genuinely requires multiple dependent steps with tool use and you want a structured way to express them. For a single request and response, or for a deterministic transformation better written as code, the extra machinery adds complexity without benefit.

### The tool-connection protocol and connectors

A tool-connection protocol standardizes how a capability is described and invoked. Instead of writing a separate integration for every combination of assistant surface and external system, an integrator exposes a tool through a common interface. A client can discover available tools, understand their inputs, and call them. This is infrastructure for tool use, not an intelligent component. It carries descriptions and results; it does not decide whether a call is wise.

A connector is a concrete package of this idea. It links an assistant surface to an external system, such as a document store or a ticketing service, so that the assistant can search or act through that system. The connector defines what operations are available and how results are returned. Its governance questions are practical: who may install it, which credentials it uses, what scope those credentials carry, and who may call each operation.

| Governance question | Why it matters | Typical control |
| --- | --- | --- |
| Who may expose a tool | An exposed capability becomes reachable by callers | Review before publishing a tool definition |
| Who may call a tool | Not every user should reach every operation | Role-based permissions at the client or server |
| What scope the call carries | Broad credentials turn a small error into a large one | Least-privilege credentials and narrow operations |
| What happens on failure | Unclear errors cause retries with side effects | Explicit error results and retry budgets |
| How changes are tracked | A description change can reroute tool selection | Versioning and change review |

### Choosing a surface

Surface selection is a constraint-matching exercise. Start with three questions. Who is acting, a person or an application? Does the task require state across multiple steps or a single exchange? What is the consequence of a wrong action? A person exploring an idea in a protected space needs a different surface from a service that must process thousands of requests with auditable decisions.

The table below summarizes common matches. Notice that none of the rows says to pick the most capable surface. Capability that is not needed becomes surface area for mistakes.

| Task characteristic | Suitable surface | Reason |
| --- | --- | --- |
| Quick exploration with a person | Hosted chat | Immediate, no infrastructure needed |
| Shared team workspace with files | Project space | Collaboration and supplied material in one place |
| Application-embedded requests with strict logging | Model API | Application controls state, policy, and records |
| Code changes inside a repository | Coding assistant | Edits and tests live where the work happens |
| Multi-step automated behavior with tools | Agent SDK | Loop and tool abstractions reduce custom code |
| External capability needed by several surfaces | Connection protocol | One integration reused across clients |

### Individual and team plans

Plans differ in principles that matter to architecture, even though the details vary by provider and change over time. At an individual level, the dominant concerns are personal workspace, personal data, and personal accountability. At a team level, the concerns expand to shared permissions, data handling agreements, administrative control, and collaboration records. The exam does not require price knowledge; it requires recognizing which concern is being tested.

Permissions are the first principle. A team plan can usually express roles and restrict capabilities so that a reviewer sees a draft but cannot approve it, or so that a connector with broad access is available only to a specific group. An individual plan typically has a simpler permission model. Data handling is the second principle. Teams need clarity about whether supplied material is retained, where it is processed, and who can see it. Collaboration is the third. Shared spaces, comments, and a durable record of decisions help a team review work, but they also require discipline about what is placed in the shared record.

> **Exam note:** If a scenario emphasizes confidential material, shared access, or an auditable approval step, the correct answer usually involves team-level controls and explicit permissions, not a more capable model.

### Casual chat versus checked work product

A casual conversation and a work product differ in status. In a casual conversation, the cost of a wrong statement is low and the goal is useful exploration. In a work product, the output will be relied on by someone else, stored, or used as the basis for an action. The moment an answer crosses that boundary, a verification obligation appears.

The practical test is simple. Ask whether anyone will make a decision from this text without re-deriving it. If the answer is yes, the text needs provenance, a check against the source, and a clear owner. Provenance means knowing which document or tool result supported each claim. A check means comparing claims to that material rather than reading the output for fluency. An owner means a person who accepts the result and is accountable for it.

This distinction also explains why a hosted conversation can be a legitimate part of a professional workflow. It is a good place to form candidates. It is not the place where candidates become accepted facts. A system design should make the transition explicit: draft in conversation, validate with appropriate checks, then record the accepted artifact separately.

### First-session orientation

A first session on any surface should establish a few habits before real work begins. The goal is not to memorize interface details. It is to learn where control lives, what the surface remembers, and how a result can be checked. The checklist below works across the main surfaces.

```text
FIRST-SESSION ORIENTATION CHECKLIST

[ ] Identify which surface you are using and who controls the loop.
[ ] Confirm what context is carried forward between requests.
[ ] Confirm whether tools are available and what scope they have.
[ ] State one constraint in writing before asking for a draft.
[ ] Ask for the source of each important claim.
[ ] Decide how the result will be checked before accepting it.
[ ] Record where the accepted result will be stored and who owns it.
```

## Worked scenario

A team needs to review a set of internal agreements and produce a short memo for a reviewer. The team has three needs: the source documents are confidential, the memo must cite which clause supports each statement, and a second person must approve the memo before it is shared. Two proposals are on the table. The first proposal uses a hosted chat space where everyone pastes relevant clauses and asks for a memo. The second uses an application built on the model API, with retrieval from a controlled document store, a fixed response format, and an approval step that runs in the application.

The deciding constraint is not the quality of the writing. Both surfaces can produce a readable memo. The deciding constraints are confidentiality, provenance, and approval. The hosted space leaves provenance dependent on whoever pasted the clauses and leaves approval as a social step outside the tool. If the space is shared, access to the material also becomes broader than intended.

The application built on the API wins. Retrieval from a controlled store means the material stays within an access boundary. A fixed response format can require a clause reference beside each claim, and code can check that the references are present before the memo is marked complete. The approval step can be enforced by the application so that a memo cannot move forward until a second account confirms it.

A third suggestion proposes using the repository coding assistant because it can read local files and edit a memo file. That surface is reasonable for formatting the final document, but it does not solve the access and approval requirements by itself. A coding assistant is a place where work happens, not a policy engine. The correct design uses it, if at all, after the controlled generation and approval flow has produced an accepted draft.

The journal lesson is that surface choice follows governance constraints first. Capability comes second. When a scenario names confidentiality, traceability, or enforced approval, look for the surface that lets those constraints live in code rather than in a conversation.

## Common mistakes

- Assuming the model API manages conversation state, tool execution, and validation on its own.
- Choosing the most capable surface when a simpler one satisfies the constraints.
- Treating a project space as an access-control system rather than a collaboration space.
- Believing that an SDK or framework automatically supplies governance and stop conditions.
- Letting a connector carry broader credentials than the operation it exposes requires.
- Moving from a chat draft to an accepted decision without a check or a named owner.

## Chapter summary

- The platform is a set of surfaces: the model API, hosted spaces, a coding assistant, an agent SDK, and a connection protocol.
- The API supplies generation; the application supplies state, tools, validation, logging, and policy.
- Hosted chat is strong for exploration and weak as a source of checked, reproducible results.
- The coding assistant maps familiar tool ideas onto repository operations and needs explicit scope and review.
- The SDK structures multi-step behavior but does not decide what is safe.
- Connectors expose external capabilities; their governance questions concern exposure, callers, scope, and change control.
- Team plans introduce permissions, data handling, and collaboration concerns that individual plans do not emphasize.
- A chat draft becomes a work product only after provenance, verification, and ownership are added.

## Checkpoint questions

1. Which component is most responsible for session state in an application built on the model API?

A. The model
B. The application
C. The connection protocol
D. The generation controls

2. Which surface best fits a quick exploratory conversation with a person?

A. Hosted chat
B. Agent SDK
C. Model API
D. Tool-connection protocol

3. What does the tool-connection protocol primarily provide?

A. Guaranteed tool correctness
B. A standard way to describe and invoke tools
C. Automatic approval of actions
D. A replacement for validation

4. Which concern belongs to a team plan more than an individual plan?

A. Personal note taking
B. Role-based permissions and shared data handling
C. Response formatting
D. Sampling settings

5. What changes when a chat answer becomes a work product?

A. It becomes shorter
B. It no longer needs provenance
C. It acquires verification and ownership obligations
D. It cannot be stored

6. Why is a planning mode useful in a repository coding assistant?

A. It removes all need for review
B. It lets the assistant propose changes without applying them
C. It increases model knowledge
D. It disables file access permanently

7. A scenario emphasizes confidential documents and enforced approval. Which design is strongest?

A. A shared chat space with a polite instruction to keep material private
B. A controlled retrieval flow with fixed output fields and an application-level gate
C. A more capable model with no additional controls
D. A connector with broad credentials shared by everyone

### Answers and rationale

**1. Correct answer: B.** The application sends prior turns back and therefore owns state. A is wrong because the model has no memory unless context is supplied. C is wrong because the protocol standardizes tool access, not sessions. D is wrong because generation controls shape output, not state.

**2. Correct answer: A.** Hosted chat starts immediately with no infrastructure. B is wrong because an SDK is for building systems. C is wrong because an API requires an application. D is wrong because a protocol is not a conversation surface.

**3. Correct answer: B.** The protocol standardizes tool description and invocation. A is wrong because correctness is not guaranteed. C is wrong because approval is a policy decision. D is wrong because validation remains necessary.

**4. Correct answer: B.** Teams need roles and agreed data handling. A is a personal activity. C and D are technical settings that do not depend on plan type.

**5. Correct answer: C.** Reliance by others creates obligations to check and to assign ownership. A is wrong because length is irrelevant. B is wrong because provenance becomes more important, not less. D is wrong because work products are normally stored.

**6. Correct answer: B.** Planning mode separates proposals from changes. A is wrong because review is still required. C is wrong because modes do not add knowledge. D is wrong because access is restricted during planning, not permanently removed.

**7. Correct answer: B.** Controlled retrieval, fixed fields, and an application gate address confidentiality, provenance, and approval. A relies on politeness rather than control. C changes capability, not governance. D increases exposure instead of reducing it.

---

*End of chapter 3.*
