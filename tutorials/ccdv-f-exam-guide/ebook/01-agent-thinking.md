# Chapter 1 — Deciding Between Fixed Pipelines and Autonomous Agents

## Learning objectives

- Distinguish a deterministic workflow from an autonomous agent, and explain when each shape is the better fit.
- Apply a practical set of decision criteria to a described problem and justify the chosen system shape.
- Trace the perceive–decide–act–observe loop, and explain why explicit stopping conditions keep an agent safe and affordable.
- Separate short-term working context from longer-term memory, and decide what belongs in each.
- Compare manager/worker delegation with a single-agent design, including context isolation and summary returns.
- Recognize when an agentic framework accelerates a build and when it adds needless weight.
- Describe the ingredients of a safe local agent environment: tool allowlists, budgets, and logging.

## Key concepts

### The first decision is about shape, not tools

When a developer sits down to build an application around an AI assistant API, the temptation is to start with the interesting part: picking a model, writing a prompt, wiring up a tool or two. The more important decision comes earlier and is less glamorous. Before writing any code, the developer must decide what *shape* the system will have. Will it be a fixed sequence of steps that always runs in the same order, or will it be a system that looks at the situation and chooses its own next move?

This distinction matters more than most implementation details because it determines almost everything else. It determines how the code is structured, how errors are handled, how cost and latency behave, how easy the system is to test, and what kind of failures are possible. A well-chosen shape makes the rest of the build straightforward. A poorly chosen shape produces a system that is either too rigid to handle real inputs or too unpredictable to trust.

The exam rewards this kind of architectural judgment. A question may describe a product requirement in plain language and ask which design is most appropriate. The correct answer is rarely "use the most capable model" or "add more tools." It is usually the shape that matches the amount of uncertainty in the problem. The central habit to develop is this: find where the uncertainty actually lives, and put the decision-making there — nowhere else.

Consider two systems that both "use AI." The first takes an uploaded invoice, extracts a few fields, validates them against a rules table, and writes a record to a database. The steps are known, the order is fixed, and the same input should always produce the same output. The second takes a vague customer request, searches several knowledge sources, decides which ones are relevant, asks a clarifying question when information is missing, and finally drafts a response. No one can write down the exact sequence of operations in advance because the sequence depends on what the system discovers. These two systems need different shapes, even though both call the same API.

> **Exam note:** When a scenario emphasizes "the same steps every time," "must be reproducible," or "auditable," think workflow. When it emphasizes "depends on what we find," "choose among options," or "variable number of steps," think agent.

### Deterministic workflows and autonomous agents defined

A **deterministic workflow** is a system in which the control flow is written by the developer. The developer decides, in code, which step follows which. Data moves through a pipeline of operations, and the model may be used inside one or more of those operations — for example, to summarize a document or classify a message — but the model does not decide the order of operations. Give the workflow the same input twice under the same conditions and it follows the same path twice. Its behavior is transparent because the path is literally the source code.

An **autonomous agent** is a system in which the model participates in deciding the next action. The developer supplies a goal, a set of available tools, and constraints, but the sequence of tool calls is not fully written in advance. The system observes its current state, reasons about what to do next, takes an action, observes the result, and continues until it decides it is finished or until an external limit stops it. The word "autonomous" does not mean unsupervised or unconstrained. A good agent is autonomous *within* a boundary that the developer deliberately designs.

It is important to understand that these are not two different technologies. They are two ways of organizing the same building blocks. Both can call models, both can use tools, both can read and write data, and both can log their activity. The difference is *who holds the steering wheel*. In a workflow, the code holds it. In an agent, the decision loop holds it, guided by the developer's constraints.

Most real applications are not pure examples of either extreme. A workflow may contain a step that behaves like a tiny agent, such as "research this one question using whatever sources seem useful." An agent may be wrapped in a rigid outer skeleton, such as "always start by validating the request, then run the agent, then always require a human signature before publishing." Hybrid designs are common and often correct. The exam may present a hybrid and ask which part should be agentic; the answer is usually the part with genuine uncertainty.

The trade-off can be summarized in one sentence. Workflows buy predictability, testability, and tight cost control by giving up flexibility. Agents buy flexibility and the ability to handle open-ended work by giving up predictability and simple cost forecasting. A developer who chooses an agent for a task that is actually a fixed pipeline has taken on complexity for no benefit. A developer who forces a fixed pipeline onto an open-ended task will produce brittle code full of special cases.

### Workflow versus agent at a glance

The following table collects the dimensions that most often matter when comparing the two shapes. It is worth reading as a whole rather than memorizing individual rows, because exam questions usually test the pattern of reasoning rather than a single fact.

| Dimension | Deterministic workflow | Autonomous agent |
| --- | --- | --- |
| Who chooses the next step | The developer, in code | The decision loop, within constraints |
| Step order | Fixed and known in advance | Emerges at runtime from observations |
| Best fit | Stable, repeatable, well-understood tasks | Open-ended tasks whose path depends on discoveries |
| Handling the unexpected | Explicit branches written ahead of time | Reasoning about the new situation and adapting |
| Output for identical input | Normally identical | May vary between runs |
| Cost and latency | Predictable and easy to budget | Variable; needs caps and monitoring |
| Test strategy | Unit and integration tests with fixed expectations | Scenario tests, simulations, and outcome checks |
| Debugging | Follow the code path | Replay the trace of decisions and tool calls |
| Failure style | Fails at a known step in a known way | Can wander, repeat work, or stop too early |
| Compliance and audit | Straightforward; the path is the specification | Requires detailed decision logging |
| Development effort | Lower for stable requirements | Higher; needs guardrails and observability |
| Change cost | Edit the pipeline | Tune goals, tools, prompts, and constraints |

Notice that neither column is "better" in the abstract. Each row is a consequence of the same underlying difference: certainty about the path. A team that needs a system to behave identically for an auditor should accept the rigidity of a workflow. A team that cannot enumerate the steps in advance should accept the overhead of an agent.

> **Common mistake:** Assuming that adding a model to a pipeline automatically makes it an agent. It does not. If a developer writes the step order in code and the model only fills in a value, the system is still a workflow.

### Decision criteria: choosing the shape

When facing a design question, work through a short series of tests. Each test nudges the answer toward one shape or the other. The goal is not to score points but to understand the problem well enough that the right shape becomes obvious.

**Test one: can the steps be written down in advance?** If a developer can list every step and every branch before seeing real inputs, a workflow is the natural choice. If the list keeps growing with "and then if that happens, we would need to..." clauses, or if the number of steps genuinely varies, that is a signal for agency.

**Test two: where is the uncertainty?** Uncertainty can live in the input, in the environment, or in the goal. If the input format is messy but the process is fixed, a workflow with a good extraction step may be enough. If the environment changes and the system must decide what to inspect next, an agent is more appropriate. If the goal itself is vague and needs clarification, an agent can ask questions and revise its plan.

**Test three: what does a wrong answer cost?** In a high-stakes domain, a system may still be agentic, but it will need approval checkpoints and detailed logs. Some teams respond to high stakes by refusing agency entirely; that is a legitimate choice when the process is knowable. The exam often tests the more nuanced answer: keep the agent, but wrap the risky action in a human confirmation step.

**Test four: how predictable must cost and latency be?** If the product promises a response in a fixed time budget at a fixed per-request cost, a workflow is easier to guarantee. An agent can be given caps, but a capped agent may simply stop before finishing, which is a different kind of failure.

**Test five: can the outcome be verified automatically?** Agents work best when there is a reliable way to check success — a test suite that passes, a schema that validates, a search result that matches. When success is easy to verify, an agent can iterate toward it. When success is subjective and cannot be checked, the agent has no good feedback signal and a workflow with human review may be safer.

**Test six: is there a need to explore?** If the system must look through files, browse documentation, query databases, and follow leads, exploration is inherently agentic. A fixed pipeline would have to anticipate every possible lead, which is exactly what exploration is meant to avoid.

Taken together, these tests form a judgment pattern: choose the least autonomous shape that can handle the real uncertainty. Autonomy is a cost, not a trophy. Add it only where it pays for itself.

> **Try it:** Take a feature request you know well. Write the steps in order. Whenever you find yourself writing "depending on what we find," mark that spot. Those marked spots are the only places where agency might be worth adding.

### The perceive–decide–act–observe loop

An agent is best understood as a loop with four phases. The loop is simple, but its discipline is what separates a reliable agent from a chaotic one.

**Perceive.** The system gathers everything relevant to the current moment. That includes the original request, the conversation so far, the results of previous tool calls, any plan it is following, and any durable facts retrieved from memory. Perception is not passive; deciding *what* to include in the current view is a design choice. Too little context and the agent acts on incomplete information. Too much context and the signal is buried in noise, while cost climbs.

**Decide.** The model reasons about the goal and the current state and chooses the next action. That action might be a tool call with specific arguments, a question to the user, an update to the plan, or a decision to finish. The developer shapes this phase through the system instructions, the tool descriptions, and the constraints supplied to the model. Clear tool contracts make this phase much more reliable because the model can see exactly what each tool does and what arguments it expects.

**Act.** The chosen action is executed through a controlled interface. In practice this means calling a tool from an allowlisted set, with arguments validated against a schema. The act phase is where guardrails live: the system can refuse a disallowed tool, require approval for a sensitive operation, or cap the size of an argument before it reaches the real world.

**Observe.** The result of the action is captured and fed back into the next iteration. A successful result supplies new information. A failed result supplies a different kind of information — an error message that may be recoverable. Observations must be recorded faithfully, including failures, because hiding errors from the loop causes the agent to repeat the same mistake.

The loop repeats until a stopping condition is reached. Why iterate at all? Because a single pass rarely gets an open-ended task right. The first tool call may return something unexpected. A plan may turn out to be based on a wrong assumption. Iteration turns the agent into a system that can notice and correct, rather than one that must be perfect on the first attempt. Observation is the feedback signal that makes correction possible; without it, the agent is just guessing repeatedly.

A practical detail: the loop should treat a tool error as an observation, not as an exception that kills the run. The agent can often recover by changing arguments, choosing a different tool, or asking for clarification. Only certain errors — a security violation, an exhausted budget, a failed approval — should end the run immediately.

> **Exam note:** If a question asks what makes an agent different from a single model call, the answer is the loop with feedback. A model call produces one response; an agent uses observations to choose successive actions and knows when to stop.

### Stopping conditions and why they matter

A loop without a stopping condition is a runaway cost meter. It may spin forever, repeat the same failing call, or drift away from the original goal. Stopping conditions are the developer's way of saying "the run ends under these circumstances," and a robust agent defines several kinds at once.

**Goal-based conditions** say the run succeeded. The requested file was produced, the question was answered and verified, the transaction was completed. These are the conditions we hope will trigger. Good goal conditions are specific and checkable, not vague feelings of completion.

**Failure conditions** say the run cannot succeed. A required tool is unavailable, an approval was denied, the input is invalid and cannot be clarified. Ending early here is correct behavior, not a bug.

**Resource limits** are hard caps set by the developer: a maximum number of iterations, a maximum number of tool calls, a token budget, a wall-clock deadline, or a monetary ceiling. These exist because models can be stubborn. An agent that keeps trying a failing approach must be stopped from the outside.

**No-progress detection** catches subtler loops. If several consecutive iterations produce the same observation or the same tool call with the same arguments, the agent is stuck. A sensible response is to force a change of approach, ask for help, or stop.

**Human checkpoints** are stopping conditions with a pause button. Before a high-impact action — publishing, spending, deleting — the run halts and waits for a person. Resuming continues the same loop with the approval recorded in context.

Why do stopping conditions matter so much in an exam context? Because they are the most common answer to questions about safety, cost control, and reliability. A scenario describing an agent that "keeps calling the same API" is asking for no-progress detection plus a call cap. A scenario about "unexpected charges" is asking for a token or monetary budget. A scenario about "the agent acted without permission" is asking for a human checkpoint. The general principle is that autonomy must be bounded from outside the model, because the model cannot be trusted to police its own spending or permissions.

It is also worth noting that a max-iteration guard alone is incomplete. It bounds effort but not necessarily harm: an agent could use its few iterations to do something expensive or destructive. Budget caps, tool allowlists, and approval checkpoints address different risks and should be combined.

### Working context versus longer-term memory

An agent's "memory" is not one thing. Confusing the two main kinds leads to bloated prompts, leaked data, and agents that forget useful facts. The useful distinction is between working context and longer-term memory.

**Working context** is everything the agent needs for the run in progress. It includes the current request, the conversation so far, the active plan, recent tool results, and any scratch notes the agent has made. It lives inside the model's context window, which is finite and costly. Working context is volatile: when the run ends, most of it disappears. It can be large during a run, but it must be actively managed so that old, irrelevant material does not crowd out current information.

**Longer-term memory** is durable information that should survive across runs. It might include user preferences, stable facts about the environment, successful procedures, and concise summaries of past work. It is stored outside the context window — in a file, a database, or a dedicated memory store — and is retrieved selectively when relevant. Longer-term memory should be small, curated, and deliberately written. It is not a dump of every transcript.

Deciding what belongs in each follows a few rules. Information needed *right now* belongs in working context. Information needed *next week* belongs in longer-term memory. Raw tool output, however large, usually belongs in working context only until it has been distilled; the distilled conclusion may be worth keeping. Transient secrets, one-time tokens, and sensitive data that the user did not ask to retain should never be written to longer-term memory. A useful question to ask is: "If this fact appeared in a future session, would it help or confuse?" Confusing facts should not be stored.

Another rule concerns trust. Longer-term memory is an input to future reasoning, so stale or incorrect memory can poison many later runs. Memory writes should be deliberate and, where possible, reviewed. Some designs keep memory append-only with timestamps so that old entries can be ignored or corrected. Others use a "memory editor" step that periodically consolidates and prunes. Both approaches treat memory as a curated resource rather than a trash bin.

The practical consequence for the exam is that questions about "the agent forgot what the user prefers" point to missing longer-term memory, while questions about "the prompt got too long after many tool calls" point to poor working-context management. They are different problems with different fixes.

> **Common mistake:** Storing every tool result in persistent memory "in case it is needed later." This bloats storage, risks retaining sensitive data, and makes retrieval worse because useful facts are buried among noise.

### Memory types at a glance

The table below maps the main memory categories to their lifetime, contents, storage location, and a representative example. Use it to practice classifying a described piece of information.

| Memory type | Lifetime | Typical contents | Where it lives | Example |
| --- | --- | --- | --- | --- |
| Working context | Single run | Current request, plan, recent tool results, scratch notes | Model context window | The last three search results and the current to-do list |
| Conversation history | One session | Messages exchanged with the user in this session | Session store or context window | The clarification the user gave two turns ago |
| Task scratchpad | Single run or task | Intermediate calculations, partial conclusions, flags | Context window or temporary store | "Candidate A rejected because the date does not match" |
| Episodic memory | Across sessions | Summaries of what happened in past tasks | External memory store | "Last month this report needed a manual currency conversion" |
| Semantic memory | Across sessions | Durable facts and user preferences | External memory store or knowledge base | "This team prefers metric units" |
| Procedural memory | Across sessions | Reusable procedures and tool recipes | Documentation or memory store | The step sequence that reliably validates an upload |
| External knowledge | Managed separately | Documents, databases, knowledge bases | Search index or data source | Product documentation retrieved on demand |

Notice that "memory" in an agent system is often just a carefully managed retrieval step. The agent does not carry a giant store in its head; it keeps a small working set and fetches durable facts when needed. That design keeps context focused and makes updates easier.

### Manager/worker and subagent delegation

A single agent can handle many tasks, but some tasks benefit from splitting the work. The most common pattern is a manager–worker (or orchestrator–subagent) arrangement. The **manager** receives the overall goal, breaks it into subtasks, assigns each subtask to a worker, and combines the results into a final answer. Each **worker** is itself a small agent focused on one subtask, with its own tools and its own context.

Delegation is worth considering when subtasks can run in parallel, when they require different tool sets, when they produce large amounts of intermediate data, or when focused attention improves quality. Imagine a request to compare several candidate suppliers. One worker can research each supplier using the same tool set, and the manager can then compare the short summaries. Each worker explores deeply without forcing all that raw exploration into the manager's context.

The mechanism that makes this work is **context isolation**. A worker's messy intermediate state stays inside the worker. The manager never sees the dozens of search calls, failed queries, or long documents the worker chewed through. This containment keeps the manager's context small and its reasoning clear. Without isolation, a multi-branch investigation would flood the manager with data and defeat the purpose of splitting the work.

The counterpart to isolation is the **summary return**. A worker finishes by producing a concise, structured result: key findings, confidence, sources or artifact references, and any open issues. The manager decides what to include in this contract, and workers are instructed to return the summary rather than a transcript. A well-designed summary format is one of the highest-leverage pieces of an agent system because it defines the information boundary between workers and manager.

Delegation is not free. The manager must decompose the goal well; a vague subtask produces a vague result. Workers may duplicate effort if they do not know what others are doing. Combining results can introduce contradictions that need resolving. Each worker consumes tokens, so parallelism can increase total cost. And debugging becomes harder because a failure may live in any of several contexts. A developer should delegate because the task structure calls for it, not because it looks sophisticated.

A related pattern is the read-only scout: a worker given only tools that cannot change state. It investigates and reports, while only the manager (or a human) is allowed to act on the findings. This is a simple and powerful safety boundary, especially in research and analysis tasks.

> **Exam note:** If a scenario describes a task that produces huge intermediate output and only a short conclusion matters, the expected design is a subagent with an isolated context that returns a summary — not a single agent that keeps everything in one context.

### When agentic frameworks help — and when they hurt

An agentic framework is a library that supplies common pieces of an agent: the loop, tool registration, a way to describe tools to the model, memory hooks, event hooks, logging, and multi-agent orchestration. Used well, it removes boilerplate and encodes patterns that are easy to get wrong. Used poorly, it hides important behavior behind abstraction and adds weight to a problem that did not need it.

Frameworks help when the problem genuinely needs their patterns. If an application requires several tools, a persistent loop, event hooks for safety, and multiple subagents, building all of that from scratch is repetitive and error-prone. A framework gives the developer a tested structure and a common vocabulary. It also makes observability easier, because framework event hooks provide a natural place to log decisions and enforce policies. For a team that needs to ship a real agent quickly, that scaffolding is valuable.

Frameworks hurt when the task is simple or when the framework's assumptions fight the requirements. A fixed three-step pipeline does not need a loop engine; three functions and a clear order are easier to read and test. A framework may also impose its own idea of memory, tool calling, or agent roles, which can be difficult to override. Abstraction has a cost during debugging: when the agent behaves strangely, the developer must understand both their own code and the framework's internal behavior. Rapid release cycles can add another burden if APIs change.

The exam-friendly way to phrase the judgment is this: reach for a framework when the complexity it manages is complexity you actually have. If you do not have multiple agents, dynamic tool selection, and lifecycle concerns, the framework is managing imaginary complexity and becomes a liability. Conversely, if you do have that complexity, reimplementing the loop by hand is a distraction from the product logic.

There is also a middle path. A developer can build a minimal loop directly — a few dozen lines that call the model, dispatch tools, and check limits — and add a framework only when the direct version becomes limiting. This keeps the early system transparent and gives the team a clear baseline for comparing frameworks. It is a good strategy when learning, because the direct version teaches exactly what the framework is doing on your behalf.

> **Common mistake:** Choosing a framework before deciding whether the problem needs agency. A framework cannot turn a badly chosen shape into a good one; it only implements the shape you picked.

### Setting up a safe local agent environment

Before an agent is allowed to touch real systems, the developer should build a safe environment for it. This is especially true during local development, when experiments can have surprising side effects. Three ingredients are non-negotiable: tool allowlists, budgets, and logging.

**Tool allowlists** implement the principle of least privilege. Instead of handing the agent every capability the machine offers, the developer exposes only the tools the task requires, and only with the narrowest useful permissions. A tool that reads files should not also delete them. A tool that queries a database should be read-only unless the task requires writes. Network access, shell commands, and file writes are higher risk and should be separated from read-only inspection tools. Deny by default; add capabilities deliberately. Where a capability is necessary but sensitive, place it behind an approval checkpoint rather than granting it silently.

**Budgets** bound the cost of a run. Set a maximum number of iterations, a maximum number of tool calls, a token budget, and a wall-clock deadline. If the platform supports a monetary ceiling, use that too. Budgets should be set per task, not just globally, so that one runaway request cannot consume the entire allowance. The developer should also decide in advance what happens when a budget is hit: the run should stop with a clear status and a partial result, not fail silently or pretend success.

**Logging** makes the agent inspectable. Record the goal, the decisions made at each iteration, the tool calls with their arguments, the observations returned, errors, approvals, and the final outcome. Logs should be structured so they can be filtered and replayed. They should also redact secrets and sensitive values, because tool arguments often contain them. Good logs turn "the agent did something weird" into a concrete trace that can be examined and fixed. They also support auditing, which is often a requirement in regulated settings.

A few supporting habits strengthen these three ingredients. Run the agent in a sandbox or container so that a mistake cannot reach the wider machine. Give it a dedicated workspace with only the files it needs. Separate configuration from code so that permissions and budgets can be reviewed without reading the loop. And test with deliberately awkward inputs — huge documents, missing fields, contradictory instructions — to see how the guardrails behave under stress.

The exam often presents a local-development scenario and asks what should be added before letting the agent run. The expected answers are usually the same three: restrict the tool set, set hard limits, and capture a trace. If a scenario mentions an agent deleting the wrong file or sending an unintended message, the missing control is an allowlist or an approval step, not a better prompt.

> **Exam note:** Prompts are guidance; allowlists, budgets, and logs are enforcement. When safety is the topic, prefer mechanisms that hold even when the model makes a bad choice.

### A minimal agent loop in pseudocode

The following pseudocode makes the four-phase loop and its stopping conditions concrete. It is deliberately short; real implementations add validation, structured logging, and retry logic, but the skeleton is the same.

```text
function run_agent(goal, tools, limits, memory):
    context = build_context(goal, memory.recall(goal))
    trace = new_trace()

    for iteration in 1..limits.max_iterations:
        if elapsed_time() > limits.deadline:
            return stop("deadline exceeded", trace, context)

        decision = model.choose_next_action(context, tools, goal)
        trace.record(iteration, "decision", decision)

        if decision.type == "finish":
            if verify(decision.result):
                memory.consolidate(context, decision.result)
                return success(decision.result, trace)
            else:
                context.add("Verification failed; keep working")

        if decision.type == "ask_user":
            return wait_for_human(decision.question, trace)

        if tool_calls_remaining >= limits.max_tool_calls:
            return stop("tool budget exhausted", trace, context)

        if not tools.is_allowed(decision.tool):
            return stop("disallowed tool", trace, context)

        if tools.requires_approval(decision.tool):
            approval = request_human_approval(decision)
            if not approval.granted:
                return stop("approval denied", trace, context)

        observation = tools.execute(decision.tool, decision.args)
        trace.record(iteration, "observation", observation)
        context.add(observation)

        if no_progress(context, window=3):
            return stop("no progress detected", trace, context)

    return stop("iteration limit reached", trace, context)
```

Several details deserve attention. The time and tool budgets are checked inside the loop, not once at the start, because a run can grow over time. Verification gates success so that the agent cannot declare victory on an unchecked result. Disallowed tools and denied approvals end the run rather than being silently skipped. Observations are always added to context, including failures. And the final fallback is a clear "stopped" status with a trace, not an exception with no explanation.

This skeleton is also a useful mental model for exam questions. When a scenario describes a missing safeguard, locate the corresponding line in this pseudocode. "The agent never stops" points to the loop bounds and no-progress check. "It used a tool it shouldn't have" points to the allowlist and approval lines. "Nobody knows what happened" points to the trace.

## Worked scenario

### The problem

A support organization wants to handle incoming tickets automatically. Each ticket arrives as free text with an optional attachment. The desired behavior is to decide whether the ticket is a routine question, a billing dispute, or a security concern; find relevant internal documentation; draft a response for routine cases; and escalate the others. The team is considering a single agent with a large set of tools: read ticket, search documentation, read account data, draft reply, send reply, and create escalation record.

Two constraints shape the decision. First, tickets vary widely: some are one-line questions, others are multi-paragraph descriptions with attachments, and a few are actually security reports disguised as billing questions. Second, sending a reply or creating an escalation is visible to customers and auditors, so an incorrect action is expensive and must be explainable.

### Reasoning

The team first asks whether the steps can be written down in advance. Classification and document lookup feel predictable, but investigation is not. A ticket that mentions "charged twice" might be a simple billing question or might reveal a broader problem; the system needs to look, decide, and possibly look again. That is genuine uncertainty about the path, which points toward an agent for the investigation phase.

Next, the team separates the phases by risk. Reading and searching are low-risk and reversible. Sending a reply and creating an escalation are high-impact and irreversible from the customer's point of view. Rather than giving one agent uniform access to everything, the design should split the low-risk research from the high-impact actions.

The team also notices that documentation searches can return long documents. If a single agent kept every search result in its working context, the context would grow quickly and the final decision quality would suffer. That suggests isolating the research into a worker that returns a short structured summary.

Finally, the compliance requirement means every decision must be traceable, and customer-visible actions must be approved. Logging and a human checkpoint are therefore part of the design, not optional extras.

### Resolution

The team adopts a hybrid shape. An outer workflow receives the ticket, normalizes it, runs the agentic triage step, and then enforces a fixed policy for outward actions.

1. **Intake step (workflow).** Validate the ticket, extract text, and store it. No model-driven choice of order here.

2. **Research subagent (agent, context-isolated).** Given the ticket text, the worker can search documentation and read account facts. It has only read-only tools. It returns a compact result: category, confidence, the two or three documentation references it relied on, missing information, and a suggested next step. Its long search transcripts stay inside its own context and are not passed upward.

3. **Decision step (manager).** The manager reviews the summary. It can ask the worker to dig further if confidence is low, which is a small loop with its own iteration cap. It then chooses one of three outcomes: draft a routine reply, request clarification, or escalate.

4. **Approval checkpoint (workflow).** No reply is sent and no escalation is created until a person approves the draft and the category. The approval, including the reviewer's identity by role and timestamp, is recorded.

5. **Action step (workflow).** Only after approval does the system call the sending or escalation tool. The tool is allowlisted and available only in this final step; the research worker never had access to it.

6. **Logging and memory.** The trace records the ticket identifier, the worker's summary, the manager's decision, the approval, and the action taken. Longer-term memory stores only durable, non-sensitive facts — for example, that this team's billing policy requires a specific reference format — not the full ticket text or account details.

Budgets are set for the triage step: a small maximum number of worker iterations, a cap on tool calls, and a token ceiling per ticket. If the worker hits a limit, the ticket is routed to a human with a "needs manual triage" status instead of being guessed.

Why does this design fit? The uncertainty — what the ticket is really about and which documents matter — is handled by an agent where it belongs. The repeatable, auditable parts — intake, approval, and outward action — stay in a fixed workflow. Read-only tools keep exploration harmless, context isolation keeps the manager's view small, and the approval checkpoint makes the irreversible step a human decision supported by the system.

> **Exam note:** A hybrid of workflow and agent is often the strongest answer. Look for the boundary where exploration ends and irreversible action begins; that is usually where agency should stop and policy should take over.

## Common mistakes

- Choosing an agent for a task whose steps are fully known, then fighting the unpredictability with more prompts.
- Treating a max-iteration guard as sufficient safety while leaving powerful tools unrestricted.
- Keeping every tool result in working context and wondering why the agent's decisions degrade late in a run.
- Writing raw transcripts into long-term memory, which wastes storage, slows retrieval, and can retain sensitive data.
- Letting a worker return a full log instead of a structured summary, which defeats context isolation.
- Reaching for a framework before deciding whether the problem has framework-level complexity.
- Assuming an autonomous agent needs no human involvement; high-impact actions still benefit from approval.
- Confusing a model call inside a pipeline with an agent making its own sequencing decisions.

## Chapter summary

- System shape is the first design decision; choose the least autonomous shape that handles the real uncertainty.
- Workflows are predictable, testable, and cheap; agents handle variable paths at the cost of predictability and tighter budget control.
- An agent loops through perceive, decide, act, and observe; observations are the feedback that enables correction.
- Stopping conditions — goal, failure, resource caps, no-progress detection, and human checkpoints — keep a loop safe and bounded.
- Working context is the volatile here-and-now; longer-term memory is curated, durable knowledge retrieved on demand.
- Manager/worker delegation isolates messy contexts and returns concise summaries, at the price of coordination overhead.
- Frameworks help when their complexity matches the problem and hurt when they obscure a simple design.
- A safe local environment combines tool allowlists, hard budgets, and structured logging, with approvals for sensitive actions.

## Checkpoint questions

1. A system reads a form, validates fields against a fixed set of rules, writes a record, and sends a confirmation. The steps never vary. Which shape is most appropriate?

A. A fully autonomous agent with many tools
B. A deterministic workflow
C. A manager with several research subagents
D. An agent with no stopping conditions

2. Which of the following is the strongest reason to introduce an agent rather than a workflow?

A. The team wants the output to vary between runs
B. The number and order of steps depend on what the system discovers at runtime
C. The company prefers using the newest framework
D. The developers want to avoid writing tests

3. An agent keeps issuing the same failing search call with identical arguments for many iterations. Which pair of controls best addresses this?

A. A longer system prompt and a better model
B. No-progress detection and a tool-call cap
C. Longer-term memory and a summary return
D. A workflow with no model calls at all

4. Which item most clearly belongs in longer-term memory rather than working context?

A. The raw text of the last tool result
B. The current to-do list for this run
C. A stable user preference that should apply in future sessions
D. A temporary token used once during this run

5. What is the main purpose of context isolation in a manager/worker design?

A. To make every worker share one giant context
B. To keep a worker's messy intermediate data out of the manager's context and return only a summary
C. To eliminate the need for tool allowlists
D. To guarantee that workers never consume tokens

6. When does an agentic framework most likely hurt a project?

A. When the project needs multiple agents and lifecycle hooks
B. When the project needs structured logging and tool registration
C. When the task is a simple fixed pipeline that the framework's abstraction only obscures
D. When the team needs event hooks for safety policies

7. A local agent has accidentally modified production files during testing. Which safeguard was most likely missing?

A. A tool allowlist with least-privilege, read-only defaults and an approval step for writes
B. A longer conversation history
C. More detailed tool descriptions
D. A larger context window

8. In the support-triage scenario, why are the "send reply" and "create escalation" tools restricted to the final step?

A. Because search tools cannot run after approval
B. Because irreversible, customer-visible actions should be allowlisted and gated by human approval
C. Because the manager is not allowed to use tools
D. Because logging is only needed during research

### Answers and rationale

1. **Correct: B.** A fixed sequence with no need for runtime choice is exactly what a deterministic workflow is for. A is wrong because it adds unpredictability and cost with no benefit. C is wrong because there is nothing to research or parallelize. D is wrong because removing stopping conditions makes a run dangerous and is never appropriate.

2. **Correct: B.** Variable, discovery-dependent sequencing is the defining reason to add agency. A is wrong because output variation is a side effect, not a goal. C is wrong because tooling preference is not a design justification. D is wrong because agents are harder to test, not easier, and avoiding tests is never a valid reason.

3. **Correct: B.** No-progress detection notices repeated identical observations, and a tool-call cap bounds the damage. A may change behavior by luck but does not guarantee a stop. C addresses memory and delegation, not repetition within one loop. D abandons the task rather than fixing the control problem, and it is not always an available option.

4. **Correct: C.** A durable preference is useful across sessions and is exactly what semantic long-term memory stores. A is wrong because raw tool output is volatile working material. B is wrong because the current to-do list exists only for this run. D is wrong because one-time secrets should not be persisted at all.

5. **Correct: B.** Isolation keeps each worker's raw exploration local and passes only a concise result upward, protecting the manager's context. A describes the opposite of isolation. C is wrong because allowlists are still required inside each worker. D is wrong because workers absolutely consume tokens; isolation manages context, not cost to zero.

6. **Correct: C.** A framework adds abstraction, so it hurts when the underlying complexity is not there. A, B, and D all describe situations where framework support for agents, logging, registration, or hooks is genuinely useful.

7. **Correct: A.** Production writes should not be reachable from a test agent; least-privilege allowlists plus approval for writes are the missing control. B, C, and D improve reasoning or context but do not prevent an unauthorized action.

8. **Correct: B.** Customer-visible, irreversible actions are the natural place for an allowlist and a human approval gate. A is factually wrong; search and action steps can coexist in a pipeline. C is wrong because the manager can use tools but should use only safe ones. D is wrong because logging is required across the entire run, not just research.

---
*End of chapter 1.*
