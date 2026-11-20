# Chapter 16 — Choosing an Extension: Skills, Built-Ins, and MCP

By this point you have seen several ways to give an assistant more capability. A platform may supply a ready-made tool, your application can define its own function, a repeatable procedure can be packaged as a skill, and a connector server can expose capabilities to many hosts. Each option can be made to work. The exam, and real architecture reviews, care about which option fits the constraints in front of you. This chapter builds a decision habit around reuse, deployment, and governance, then applies it to a worked choice.

> **Exam note:** Extension questions are rarely about what is possible. They are about what is smallest, safest, and most reusable given the stated requirement. Look for clues about who owns the capability, how many hosts need it, and whether the behavior is a procedure or an operation.

## Learning objectives

By the end of this chapter you should be able to:

- Compare built-in tools, custom tools, skills, and connector servers on reuse and deployment.
- Distinguish a repeatable procedure from a callable operation when classifying a requirement.
- Explain the governance implications of each extension type, including credentials and review.
- Apply a text decision flow to a scenario under exam conditions.
- Defend a choice with reasoning rather than product names.

## Key concepts

### Four ways to extend capability

A built-in tool is supplied and executed by the platform. It requires configuration at most and handles generic jobs such as public lookup. A custom tool is written by your team and executed in your process, giving direct access to private systems and full control over validation and logging. A skill is a packaged bundle of instructions and supporting files that teaches a repeatable workflow; its value is consistent procedure. A connector server exposes tools, resources, and prompts through a standard protocol so compatible hosts can discover them.

These options are not stages of maturity. A small custom tool is often the right permanent answer, and a connector server is unnecessary overhead for one private helper. Packaging a workflow as a skill is not a way to avoid writing an operation that must change a system.

| Criterion | Built-in | Custom tool | Skill | Connector server |
| --- | --- | --- | --- | --- |
| Defined by | Platform | Application | Package author | Server owner |
| Runs where | Platform environment | Your process | Host, as guidance and scripts | Separate service |
| Best at | Generic facts and computation | Private data and actions | Repeatable procedures | Shared capabilities |
| Reuse scope | Any compatible app | One application | Projects adopting the package | Any compatible host |
| Deployment effort | Lowest | Low to moderate | Moderate | Highest |
| Observability | Summary only | Full | Depends on host and scripts | Depends on server |

Read the table as trade-offs, not a ranking. The lowest-effort option gives least control; the widest-reuse option adds the most moving parts. The choice becomes clear once you know which property the scenario values.

### Reuse and deployment trade-offs

Reuse has two dimensions: how many applications need the capability, and how independently it changes. A custom tool is cheap when both are small. It ships with the application, is tested with it, and needs no protocol. A skill becomes attractive when the valuable asset is knowledge about how to do something: a review checklist, templates for findings, and reference rules. It does not need a network service because it does not own a system of record. Its cost is review, since instructions and scripts can change behavior.

A connector server fits when the capability has an owner and lifecycle of its own. One server with a remote transport avoids five bespoke adapters. Discovery means new operations become visible without host code changes, useful for the owner and something the host must govern. The cost is a separate deployment, a transport to secure, and a second identity to manage.

| Expected change | Least painful option | Why |
| --- | --- | --- |
| Application rule changes often | Custom tool | Ships with the application |
| Checklist or style guide evolves | Skill | Content updates without a service |
| Backend adds operations | Connector server | Discovery propagates the change |
| Provider improves a generic capability | Built-in | No local work |
| Several teams edit one behavior | Connector server | One owner, one contract |

Failure boundaries differ too. A custom tool that crashes affects its request. A remote server can fail independently, so the host needs timeouts and a degraded-answer plan. A skill has no runtime of its own, but a stale package can quietly give outdated guidance.

> **Common mistake:** Choosing a connector server because a capability might be shared someday. If one host needs it today, build the custom tool and extract a server when a second consumer arrives.

### Governance and trust boundaries

Every extension changes who can do what. Governance asks who owns the code, who holds the credentials, who reviews changes, and what evidence exists after an action. A built-in tool is governed through platform settings and host permissions; you do not review its internals. A custom tool falls under your code review and deployment controls, plus the identity you give the application. A skill needs its files reviewed like any dependency, especially instructions that shape behavior and any executable helper. A connector server has its own identity and deployment, so it needs independent review, scoped grants, and logging tied to the host request.

| Question | Built-in | Custom tool | Skill | Connector server |
| --- | --- | --- | --- | --- |
| Code owner | Provider | Application team | Package maintainer | Server team |
| Credentials | Provider or host config | Application | Host, if scripts need access | Server |
| Reviewed artifact | Settings and scope | Handler and schema | Instructions and scripts | Handlers and discovery list |
| Audit evidence | Provider summary, host logs | Application logs | Host invocation logs | Server plus host logs |

Trust boundaries matter as much as permissions. Output from a search may contain text written by someone else, and a skill's instructions enter the same context as your own guidance. Least privilege applies to instructions as well as credentials.

> **Security note:** An extension is a dependency. Pin its version, review what it can execute, and keep the approval gate for consequential actions in the host where the user interaction happens.

### Exam-lens reasoning from question cues

Scenario questions usually contain one sentence that decides the answer. Reading for that sentence improves with practice. The table maps common cues to the extension they point toward. Treat them as signals, not mechanical rules, and check every constraint.

| Scenario cue | Likely answer | Reasoning |
| --- | --- | --- |
| One application needs a private helper | Custom tool | Lowest overhead, full control |
| Generic capability, no code to write | Built-in tool | Platform already provides it |
| Templates and checklists across projects | Skill | Asset is procedure and guidance |
| Several hosts need one shared service | Connector server | One implementation, many hosts |
| Capability must never perform an action | Remove it | No extension makes it safe |
| Irreversible action with approval | Tool with host gate | Execution must be observable |
| Content with a stable address | Connector resource | Resources are addressable context |
| Similar tools chosen inconsistently | Sharper descriptions | The contract is at fault |

Two rows are not extension choices at all. They test whether you recognize a problem that lies elsewhere. A vague description will not be fixed by switching protocols, and a forbidden action is not made acceptable by an approval screen. Formatting requirements call for structured output, not a tool.

> **Exam note:** When two options both work, prefer the one adding fewer new components while meeting every requirement. Extra infrastructure is a cost, not a sign of seniority.

### A decision flow in text

Work through these steps in order, stop at the first clear match, then run the safety check.

1. Could a platform tool do the job with no code from you? If the capability is generic and needs no private data or custom policy, choose a built-in tool.
2. Is the valuable asset a procedure, checklist, or template rather than a live operation? If several projects need the same way of working, choose a skill.
3. Do several hosts, possibly owned by different teams, need the same capability from a service with its own lifecycle? Choose a connector server and decide on the transport.
4. Otherwise, if the capability is private to one application and tied to its deployment, choose a custom tool.
5. Apply the safety check regardless: remove forbidden actions, gate risky ones, scope credentials, pin versions, and label untrusted content as data.
6. Ask what evidence a reviewer would need. If the option cannot produce it, revisit the decision.

```text
Generic capability, no custom code?      -> built-in tool
Reusable procedure or templates?        -> skill
Shared service, several hosts?          -> connector server
Private to one application?             -> custom tool
Then always: scope, approval, version, audit
```

The flow is short on purpose. Complexity enters when you justify each branch against the scenario, not when you add more branches.

### When two answers both seem right

Ties usually come from a missed constraint. Look for "must never", "across teams", "existing workflow", "no new infrastructure", and "audit". A frequent tie is custom tool versus connector server: both call the same backend. The deciding questions are whether another host needs the capability now and whether the backend has an owner independent of your application. If neither is true, the server is premature.

Another tie is skill versus custom tool. A skill can contain a script that calls a service, so it can appear to do the same thing. Decide where the value lives: in procedure and wording, or in a typed operation with strict validation and side effects. A third tie concerns approval. A gated and ungated tool both "work", but if the action changes money, access, or public state, the gate is part of correctness. Finally, a built-in lookup may be simpler, but sensitive internal data in the query may violate a privacy constraint. Principle-level reasoning beats familiarity with a product name.

## Practice lab

**Goal.** Classify four extension requests using the decision flow and defend each answer in one sentence.

**Steps.**

1. An internal helper reads a setting from this service's own database. Apply the flow.
2. Every project should review changes using the same checklist and example findings. Apply it again.
3. Two host applications must query one shared registry maintained by another team. Choose an extension and a transport.
4. The assistant should look up a public dictionary definition. Choose an extension.
5. For each, write the deciding constraint and one risk to manage. Then revisit request three assuming only one host needs the service today.

**Expected observation.** The first resolves to a custom tool because it is private. The second resolves to a skill because the asset is procedural. The third resolves to a remote connector server because of shared ownership; with one host, a custom tool becomes reasonable. The fourth resolves to a built-in tool because the capability is generic. Each answer is justified by a constraint, not by preference.

## Worked scenario

**Problem.** A training company is building three features. One checks whether a learner completed a course's prerequisites, using its own enrollment database. One produces lesson plans in a house format with an accessibility checklist and reference tables. One lets support staff in two host applications look up schedules in a registry maintained by a separate team. A proposal implements all three as custom tools in one application so the team can reuse one code pattern.

**Reasoning.** The proposal optimizes for implementation convenience and ignores the differences. The prerequisite check is private and coupled to one database, so a custom tool with a narrow read-only query fits. The lesson-plan feature is not primarily an operation; its value is a repeatable procedure and content, so packaging it as a skill lets several projects adopt the same guidance. A small formatting script inside the skill does not require a service. The schedule lookup needs two hosts, an independent owner, and its own release cycle, so a connector server with a remote transport gives one implementation and one contract. Published schedules can also be exposed as resources with stable addresses.

**Resolution.** The prerequisite tool uses a read-only identity. The skill's instructions and script are reviewed like code. The server pins its version in both hosts and logs discovered capabilities so a new tool triggers review. For a fourth request, "cancel an enrollment", the team adds a tool with preview and host-side approval rather than allowing cancellation through the prerequisite tool. Each capability now sits at the boundary matching its ownership, and an audit record exists wherever state can change.

> **Exam note:** A question mixing several needs is testing whether you give different answers to different parts. Resist the single mechanism that makes a proposal look uniform.

## Common mistakes

- Reaching for a connector server when one application and one owner would do.
- Treating a skill as a service, or a tool as a collection of reusable prose.
- Assuming a capability is safe because a platform provider supplies it.
- Ignoring who owns credentials when comparing options.
- Forgetting to pin package or server versions, so behavior changes silently.
- Choosing an extension before checking whether the requirement forbids the action.
- Adding approval instructions to a prompt instead of a gate in the host.

## Chapter summary

- Built-in tools minimize work but offer limited control and visibility.
- Custom tools fit private operations and give full control over validation and logs.
- Skills package repeatable procedures; they need review like any dependency.
- Connector servers fit capabilities shared across hosts with independent owners.
- Reuse depends on both the number of consumers and the rate of independent change.
- Governance differs in code ownership, credentials, review, and audit evidence.
- A short flow starts with built-ins, then procedures, then shared services, then private tools.

## Checkpoint questions

1. One application needs a helper that reads a value from its own database. Which extension fits?

   A. A remote connector server.

   B. A custom tool.

   C. A skill package.

   D. A prompt template.

2. Which scenario most strongly calls for a skill?

   A. A private lookup against one database.

   B. A public dictionary definition.

   C. A checklist and templates that several projects must apply consistently.

   D. A shared service consumed by three hosts.

3. What is the strongest reason to choose a connector server over a custom tool?

   A. The tool needs a JSON schema.

   B. The backend is private to one application.

   C. Several hosts need one implementation owned by a separate team.

   D. The team prefers a longer implementation.

4. Which governance concern is most associated with skills?

   A. Platform release notes.

   B. Reviewing packaged instructions and scripts before adoption.

   C. Choosing a remote transport.

   D. Returning structured tool errors.

5. A capability must never modify customer records. What is the strongest response?

   A. A system prompt sentence forbidding modification.

   B. Expose no modification capability and use a read-only identity.

   C. Add an approval screen before every modification.

   D. Log modifications and review them monthly.

6. Which observation breaks a tie in favor of a connector server?

   A. The tool needs a JSON schema.

   B. The backend is private to one application.

   C. Another host must consume the capability now and the backend has an independent owner.

   D. The team prefers more infrastructure.

7. Which statement about built-in tools is most accurate?

   A. They can never return errors.

   B. They eliminate the need for host policy.

   C. They reduce setup effort but limit control and visibility.

   D. They are the only option supporting shared ownership.

### Answers and rationale

1. **B.** A private helper tied to one deployment is clearest as a custom tool. A adds a service without a second consumer. C packages procedure, not a live lookup. D cannot read a database.

2. **C.** Skills shine when the asset is a procedure with supporting content. A is a private operation. B suits a built-in. D points to a connector server.

3. **C.** Multiple hosts plus separate ownership justify the overhead. A applies to both options. B argues for a custom tool. D is not an architectural reason.

4. **B.** Skill packages can contain instructions and helper scripts, so they need review like a dependency. A concerns built-ins. C is a deployment detail. D is a tool contract practice.

5. **B.** Removing the capability makes the restriction structural. A can fail under pressure or injection. C still permits the action. D detects damage afterward.

6. **C.** A second consumer and independent ownership define the connector case. A applies to both options. B favors the custom tool. D is not a valid reason.

7. **C.** Built-ins trade control and visibility for low setup. A is false because built-ins can fail. B is false because host policy remains. D is false because connector servers support shared ownership.

---

*End of chapter 16.*
