# Chapter 2 — Building the Loop, Delegation, and Guardrails

## Learning objectives

- Implement an agent loop that calls tools, feeds observations back into context, and stops safely.
- Define tools with clear contracts so that arguments, effects, and failure modes are explicit.
- Delegate subtasks to subagents and merge their results without losing provenance or correctness.
- Use lifecycle hooks to enforce protection policies at the moments when actions occur.
- Add guardrails and human approval checkpoints around irreversible or high-impact operations.
- Manage context growth through selection, summarization, and compaction without destroying needed information.
- Judge which safeguard fits a described failure, using exam-style reasoning.

## Key concepts

### From a chosen shape to working code

The previous chapter was about deciding *whether* an agent is the right shape. This chapter is about building one well once that decision has been made. The move from design to implementation is where many projects lose their discipline. A clean mental model of perceive, decide, act, and observe can turn into a sprawling script with hidden state, unchecked tool calls, and no reliable way to explain what happened. The goal here is to keep the loop small, explicit, and observable, and to wrap it with protection that holds even when the model behaves unexpectedly.

Three principles guide the implementation. First, keep the loop visible. A developer should be able to read the control flow and see where every decision and observation goes. Second, push enforcement outside the model. Instructions in a prompt are advice; allowlists, schemas, budgets, hooks, and approval gates are mechanisms that work even when the model is wrong. Third, treat context as a scarce resource. Everything that enters the context window competes for attention and costs tokens, so the loop should add information deliberately and shed it deliberately.

These principles apply whether the developer writes the loop by hand or uses a framework. A framework simply moves some of the code behind an interface. The responsibilities remain the same: dispatch actions safely, record what happened, manage the context, and stop at the right time. An exam question may describe the symptoms of a missing responsibility — duplicated work, runaway cost, an unapproved action, a confused final answer — and ask which piece to add. The ability to map symptoms back to responsibilities is the skill to cultivate.

It is also worth stating what this chapter is not about. It is not about finding the cleverest prompt or the largest model. Those choices matter, but they do not fix a missing stop condition or an uncontrolled tool. A modest model inside a well-guarded loop is often more useful in production than a brilliant model running without boundaries. The exam consistently favors the engineered answer over the aspirational one.

### Implementing the loop with a max-iteration guard

At its core, the loop alternates between asking the model what to do and carrying out the chosen action. A robust implementation does more than that: it validates arguments, enforces budgets, records a trace, checks for repeated behavior, and handles the end states explicitly. The following Python sketch shows a loop with a max-iteration guard and the other controls introduced in the previous chapter. It is written to be read, not pasted directly into a production system; a real version would add retries, structured exceptions, and a richer trace store.

```python
from dataclasses import dataclass, field
from typing import Any, Callable

@dataclass
class Limits:
    max_iterations: int = 8
    max_tool_calls: int = 12
    token_budget: int = 40_000
    deadline_seconds: float = 120.0

@dataclass
class RunResult:
    status: str                      # "success", "stopped", "needs_human"
    value: Any = None
    reason: str = ""
    trace: list = field(default_factory=list)

class AgentLoop:
    def __init__(self, model, registry, hooks, limits: Limits, verifier):
        self.model = model
        self.registry = registry       # allowlisted tools only
        self.hooks = hooks
        self.limits = limits
        self.verifier = verifier

    def run(self, goal: str, seed_context: list[str] | None = None) -> RunResult:
        context = list(seed_context or [])
        context.append(f"Goal: {goal}")
        trace: list[dict] = []
        tool_calls = 0
        started = time.monotonic()

        for iteration in range(1, self.limits.max_iterations + 1):
            # Hard deadline checked at the top of every iteration.
            if time.monotonic() - started > self.limits.deadline_seconds:
                return self._stop(trace, "deadline exceeded")

            decision = self.model.next_action(goal=goal, context=context,
                                              tools=self.registry.describe())
            trace.append({"i": iteration, "kind": "decision", "data": decision})
            self.hooks.emit("after_decision", iteration, decision, context)

            if decision.kind == "finish":
                ok, note = self.verifier(decision.value, goal)
                if ok:
                    self.hooks.emit("before_finish", iteration, decision, context)
                    return RunResult("success", decision.value, note, trace)
                context.append(f"Verification failed: {note}. Continue.")
                continue

            if decision.kind == "ask_user":
                return RunResult("needs_human", None, decision.question, trace)

            if tool_calls >= self.limits.max_tool_calls:
                return self._stop(trace, "tool-call budget exhausted")

            if not self.registry.is_allowed(decision.tool_name):
                self.hooks.emit("policy_block", iteration, decision, context)
                return self._stop(trace, f"tool not allowed: {decision.tool_name}")

            args_error = self.registry.validate(decision.tool_name, decision.args)
            if args_error:
                context.append(f"Invalid arguments: {args_error}. Fix and retry.")
                continue

            if self.registry.needs_approval(decision.tool_name):
                approved = self.hooks.request_approval(iteration, decision)
                if not approved:
                    return self._stop(trace, "approval denied")

            self.hooks.emit("before_tool", iteration, decision, context)
            observation = self.registry.execute(decision.tool_name, decision.args)
            tool_calls += 1
            trace.append({"i": iteration, "kind": "observation", "data": observation})
            context.append(self.registry.render(observation))
            self.hooks.emit("after_tool", iteration, decision, context)

            if self._no_progress(trace, window=3):
                return self._stop(trace, "no progress across recent iterations")

            context = self.hooks.compact_if_needed(context, self.limits.token_budget)

        return self._stop(trace, "max iterations reached")

    def _no_progress(self, trace: list[dict], window: int) -> bool:
        recent = [e for e in trace if e["kind"] == "observation"][-window:]
        return len(recent) == window and len({str(e["data"]) for e in recent}) == 1

    def _stop(self, trace: list[dict], reason: str) -> RunResult:
        self.hooks.emit("on_stop", None, reason, None)
        return RunResult("stopped", None, reason, trace)
```

A few choices in this sketch are worth examining closely, because each one answers a common exam scenario.

The **max-iteration guard** is the `for` loop bound. It guarantees termination no matter what the model decides. Notice that it is a bound on effort, not a guarantee of success: when the loop runs out, the result is explicitly `stopped` with a reason, so callers can distinguish "finished" from "gave up." A system that reports a partial answer as a success is a serious design flaw.

The deadline and tool-call checks sit inside the loop because cost accumulates over iterations. The verifier gates success, so the agent cannot simply announce that it is done. Invalid arguments are fed back as observations, and no tool call is consumed, which lets the agent correct a small mistake without spending its budget. Disallowed tools end the run immediately and fire a `policy_block` event. Approval is requested through the hook layer before execution, not after.

The `_no_progress` helper compares the last few observations; if they are identical, the agent is likely stuck in a repetition loop. This catches a failure that iteration caps alone miss. Finally, compaction is called at the end of each iteration so that context growth is managed continuously rather than as an afterthought.

> **Exam note:** A max-iteration guard is necessary but not sufficient. Exam answers that rely only on "limit the iterations" are usually incomplete; look for the option that also adds verification, budget checks, and a clear stopped status.

### Defining tools with clear contracts

A tool is a function the agent can choose to call. The quality of that choice depends heavily on how well the tool is described. The model sees the description, not the implementation, so the contract must state what the tool does, what arguments it accepts, what it returns, and what side effects it has. A vague tool description is a reliable recipe for wrong arguments and unintended actions.

A good tool contract has several parts. The **name** should say the action plainly. The **description** should state the purpose and, importantly, when *not* to use the tool. The **parameters** should be a schema with types, required fields, and constraints, so invalid calls can be rejected without touching the real system. The **return shape** should be predictable, ideally a structured object with a status, data, and error fields. The **effect class** should mark the tool as read-only, state-changing, or externally visible, which determines whether approval is required. And the **failure behavior** should be documented so the agent knows whether a failed call is worth retrying.

Consider a tool that searches internal documentation. Its contract should say that it accepts a query string and an optional result limit, returns a list of short excerpts with references, and performs no writes. It should also say that an empty result means "nothing matched," which is different from an error. That distinction matters: the agent might choose a broader query after an empty result, but should not keep retrying the same failing call after an error.

A tool that creates a support ticket has a very different contract. It changes shared state and is externally visible, so it should be marked as requiring approval. Its parameters should include enough information to prevent duplicates — for example, a required idempotency key or a link to the source request. Its return shape should report whether a new record was created or an existing one was matched. When the return shape makes "created" versus "matched" explicit, the agent can reason correctly about what happened.

```json
{
  "name": "find_documentation",
  "description": "Search internal docs for short excerpts and references. Use for factual lookup. Do not use for account-specific billing data. Read-only: no state changes.",
  "effect": "read_only",
  "parameters": {
    "type": "object",
    "required": ["query"],
    "properties": {
      "query": { "type": "string", "minLength": 3, "maxLength": 200 },
      "max_results": { "type": "integer", "minimum": 1, "maximum": 10 }
    }
  },
  "returns": {
    "status": "ok | no_match | error",
    "excerpts": "array of {reference, text, score}",
    "error": "string or null"
  }
}
```

Several design habits follow from this. Prefer a few well-described tools over a large catalogue of overlapping ones; too many similar tools make selection harder. Keep argument types simple and validated. Make side effects visible in the contract rather than hidden in the implementation. And give the agent a way to distinguish "nothing found" from "the tool broke," because those observations lead to different next actions.

A subtle but important point is the boundary between description and enforcement. The description guides the model; the schema and registry enforce behavior. If a tool says "read-only" but the implementation can write, the system is lying to the agent. The registry should check the effect class before execution and route state-changing tools through approval regardless of what the model believes. Never rely on the description to keep an action safe.

> **Common mistake:** Writing tool descriptions that list parameters but not effects or failure modes. The agent then calls a write tool when it meant to inspect, or retries a permanent error because nothing told it the error was permanent.

### Delegating to subagents and merging results

Delegation moves part of the work into a separate agent context. The parent hands a worker a focused goal, a restricted tool set, and a required output format. The worker runs its own loop, bounded by its own limits, and returns a structured summary. The parent then combines the summaries into a decision. This pattern is useful for parallel investigation, for tasks needing different tools, and for work that produces large amounts of intermediate data.

Implementing delegation well is mostly about contracts and boundaries. The task assignment should state the question to answer, the sources the worker may use, the exact output fields required, and the limits on effort. The worker's tool allowlist should be the smallest set that can answer the question. The return format should include provenance — references or artifact identifiers — so the parent can verify claims rather than trusting them blindly. If the parent cannot tell where a finding came from, it cannot audit the final answer.

Merging results is the other half of the problem. Three strategies are common. **Concatenation** simply lists all worker summaries; it is simple but can produce contradictions. **Synthesis** asks a model to combine summaries into a coherent answer, which reads well but can silently drop details. **Selection** chooses one worker's result based on a rule or a verifier, which is appropriate when workers propose competing answers. A robust system often combines them: verify each summary, drop unsupported claims, synthesize the remainder, and keep the provenance alongside the final text.

Conflicts between workers need a deliberate policy. The parent can return to the workers with the conflicting claims and ask for clarification, prefer the result with stronger references, or escalate the conflict to a human. What it should not do is pick one arbitrarily. An unresolved contradiction reported honestly is better than a confident but fabricated resolution.

Parallelism deserves special care. Running several workers at once reduces wall-clock time but increases peak token use and can multiply side effects if the workers share a writable resource. Parallel workers should be read-only or operate on separate partitions of the data. Any shared state should be coordinated by a single writer so that two workers cannot create the same record. This is a frequent exam theme: the fix for duplicate artifacts is not "tell the workers to be careful" but "give write authority to one component and make creation idempotent."

| Decision | Delegate to subagents | Keep work in one agent |
| --- | --- | --- |
| Subtask structure | Several independent subtasks with clear boundaries | One connected line of work |
| Intermediate data | Large; only a short conclusion is needed | Small enough to keep in one context |
| Tool needs | Different tool sets per subtask | One consistent tool set |
| Parallelism | Valuable when subtasks are independent | Little to gain; coordination would dominate |
| Context pressure | High; isolation protects the parent | Low; a single context is simpler |
| Cost profile | Higher total tokens, shorter wall clock | Lower overhead, longer sequential run |
| Debugging | Harder; failures live in several contexts | Easier; one trace tells the story |
| Failure isolation | A stuck worker can be abandoned | One bad branch can derail the whole run |
| Best use | Research, comparison, fan-out analysis | Short, sequential, tightly coupled tasks |

The table makes the trade-off clear: delegation buys focus, parallelism, and context isolation at the price of cost and complexity. Use it when the task structure earns those costs.

> **Exam note:** When a scenario mentions many parallel workers plus a shared writable resource, look for the answer that centralizes writes or uses an idempotency key. Distributed caution is not a mechanism.

### Hooking lifecycle events for protection

A hook is a callback that runs at a specific point in the agent's lifecycle. Hooks are the practical answer to the question "where do I put safety checks?" They let the developer enforce policy at the moment an action is about to happen, rather than hoping the model follows instructions. Because they sit on the path of execution, hooks can block, modify, log, or require approval for an action.

Think of the lifecycle as a series of moments: before the run starts, after the model decides, before a tool executes, after a tool returns, when a policy is violated, when approval is needed, before finishing, when the run stops, and when context needs shrinking. Each moment is an opportunity to apply a specific control. A before-tool hook can check an allowlist and request approval. An after-tool hook can redact sensitive output, record a trace entry, or trigger compaction. A policy-block hook can alert an operator and produce a clear stopped status.

Hooks are also the natural home for observability. Because every significant event passes through them, the developer can build a complete trace without scattering logging statements through the loop. Structured events — with a run identifier, iteration number, decision, observation, and policy outcome — can be stored and replayed. When an agent behaves unexpectedly, the trace answers what it saw and why it acted.

The distinction between a hook and a prompt instruction matters. A prompt can say "do not write to production." A before-tool hook can *refuse* a write to production and return a policy block. The second is dependable because it does not rely on the model complying. Exam questions about enforcement almost always want the mechanism at the action boundary, not a stronger instruction.

| Hook or event | When it fires | Typical protection or purpose |
| --- | --- | --- |
| `on_start` | Before the first iteration | Load policy, initialize budgets, open trace, validate permissions |
| `after_decision` | After the model chooses an action | Validate shape, record decision, detect suspicious plans early |
| `before_tool` | Immediately before tool execution | Check allowlist, validate arguments, request approval, enforce quotas |
| `policy_block` | When an action violates policy | Deny the action, alert, and record the reason for audit |
| `after_tool` | After an observation is returned | Redact secrets, truncate oversized output, log result, update counters |
| `on_approval_request` | When a sensitive action is attempted | Pause the run, present context to a human, capture the decision |
| `before_finish` | Before a verified result is accepted | Final policy check, attach provenance, confirm required fields |
| `on_compaction` | When context approaches its limit | Summarize old material, preserve decisions and references |
| `on_stop` | When the loop ends for any reason | Emit final status, close trace, release resources |
| `on_error` | When an internal exception occurs | Contain the failure, record diagnostics, fail closed |

A few design rules make hooks effective. Keep them small and predictable; a hook that does too much becomes hard to reason about. Make denials fail closed — if a policy check cannot run, the action should not proceed. Order hooks deliberately, especially when several apply to the same event. And log both the decision and the policy outcome, because "the model wanted to do X and the policy blocked it" is a different story from "the model never tried."

> **Try it:** Take a loop you have written and list the moments in the table above. For each moment, ask what could go wrong there and which hook would catch it. If a moment has no protection, you have found a gap.

### Guardrails and human approval checkpoints

Guardrails are the rules that keep an agent's behavior inside acceptable bounds. Some guardrails are structural — allowlists, schemas, budgets, sandboxing — and some are procedural — approvals, review, and escalation. The strongest designs layer several kinds, so that a failure in one is caught by another.

A useful way to classify actions is by reversibility and visibility. Reading a document is reversible and invisible; it needs little more than an allowlist. Drafting a reply is reversible and locally visible; it can proceed with normal logging. Sending a reply, deleting records, or creating a customer-facing ticket is hard to reverse and visible to others; it should require explicit human approval. This classification should live in the tool registry as an effect class, so the loop can apply the right policy automatically rather than relying on a per-task decision.

An approval checkpoint is more than a yes-or-no dialog. To be useful, it must present enough context for a person to decide: what action is proposed, with what arguments, on what evidence, and what the alternatives are. The parent's summary, the worker's references, and the reason the action is considered necessary should accompany the request. The approval itself must be recorded — who approved by role, when, and under what run identifier — so that later audits can connect the action to its authorization. A checkpoint that cannot be audited is barely better than no checkpoint.

Approvals should also have a failure path. If no one responds within a deadline, the run should stop with a clear status rather than proceed by default. If approval is denied, the agent should not simply find another tool that achieves the same effect; the policy must cover equivalent actions, not just one tool name. This is why effect classes are more robust than tool-by-tool rules: "any externally visible write" is a stronger boundary than "the send_reply tool."

Guardrails also protect against subtler problems. Input limits prevent a single huge document from consuming the budget. Output validation ensures a final answer conforms to a required schema before it is accepted. Rate limits prevent an agent from overwhelming an external service. Sandboxing confines file and network access to a dedicated workspace. Each addresses a different failure, and exam questions usually describe the failure rather than naming the control, so practice translating symptom into safeguard.

> **Exam note:** When a question contrasts "make the prompt stricter" with "require approval through a hook before execution," choose the hook. Enforcement at the action boundary survives a model mistake; wording does not.

### Managing context growth and compaction

An agent that runs for many iterations accumulates observations. Left unchecked, this growth produces three problems: the context window fills up, cost rises with every token carried forward, and decision quality degrades because relevant facts are buried under stale detail. Managing context is therefore a continuous maintenance task, not a one-time setup step.

The first line of defense is **selection**. Do not add every tool result to context in full. Render observations into a compact form: keep the fields that matter, drop padding, and cap the length of long text. A documentation search that returns ten pages should contribute ten short excerpts with references, not ten pages. The full content can remain in an external store and be fetched again if needed.

The second is **summarization with preservation**. When older material must be condensed, the summary should retain specific items that future reasoning depends on: decisions already made, hypotheses rejected and why, references and artifact identifiers, constraints, and open questions. A summary that keeps only general themes can cause the agent to repeat work it already completed. Compaction should be lossy in the right places — dropping raw logs and verbose tool output — but lossless where it matters.

The third is **offloading**. Durable facts that will be needed in future sessions belong in longer-term memory, with a short pointer left in the current context. Large artifacts belong in a store, referenced by an identifier. This keeps the working set small while preserving access. The discipline from the previous chapter applies: write to memory deliberately, avoid raw transcripts, and never persist secrets.

Compaction should be triggered by a threshold, not by guesswork. A hook can estimate the current token count and, when it approaches the budget, replace older observations with a structured summary. The summary becomes part of the context, and the original detailed entries remain available in the trace for audit. This separation is useful: the model sees a concise view, while humans and debugging tools retain the full history.

A related concern is contamination. Once an incorrect claim enters context, later reasoning may build on it. Verification before accepting intermediate conclusions, clear marking of uncertain findings, and the ability to discard a worker's summary all reduce this risk. When a context has become confused, starting a fresh run with a clean, curated handoff is often better than trying to repair it in place.

> **Common mistake:** Compacting by keeping only the most recent messages. This discards constraints and decisions from earlier in the run, so the agent cheerfully violates an instruction it was given at the start.

## Worked scenario

### The problem

A research team uses an agent to investigate supplier incidents. The agent searches internal reports, reads public notices, and compiles a short findings memo. Each investigation should result in **at most one** ticket in the tracking system, because the team noticed that earlier versions created several tickets for the same incident when a search returned overlapping results. The team also wants each memo to cite the reports it used, and it does not want the investigation tools to be able to change any shared records.

A recent run produced three tickets for one incident. Logs showed that three parallel research workers each found a different snippet of the same report and each concluded that a new ticket was warranted. The parent merged their summaries and then created a ticket for each one. The developers had told the workers in their instructions to "avoid duplicates," but had given each worker a ticket-creation tool and no shared way to check what already existed.

### Reasoning

The first observation is that the instruction "avoid duplicates" was a preference, not a mechanism. Parallel workers had no visibility into one another's actions, so none could know that another had already created a record. The fix must be structural: remove write capability from the workers and give exclusive creation authority to one component.

The second observation is that the workers' findings were not contradictory; they were complementary fragments of the same source. The merging strategy should therefore combine them and attach provenance, then decide once whether a ticket is needed. Creating a ticket is an externally visible, state-changing action, so it belongs behind an approval checkpoint and an idempotency control.

The third observation is context-related. Each worker returned a long narrative rather than a compact summary, and the parent carried all three narratives forward. That inflated context and made the overlap harder to see. A required summary format with explicit source references would make the duplication obvious before any action was taken.

### Resolution

The team rebuilds the system around four changes.

1. **Workers become read-only.** The research subagents receive only search and read tools. Their contracts are marked `read_only`, and the registry enforces this regardless of what a model requests. Any attempt to call a write tool is blocked by a `policy_block` hook and ends that worker with a clear status.

2. **Summaries get a strict shape.** Each worker must return a structured result: incident identifiers found, source references, a short claim, and a confidence value. Long narratives are no longer accepted. Because references are explicit, the parent can see that all three workers cite the same underlying report.

3. **The parent merges with verification.** The parent concatenates the structured summaries, drops claims without references, and produces one consolidated memo. A verifier checks that every cited reference exists and that the memo contains a single incident identifier. Only then does the parent propose an action.

4. **Creation is centralized and idempotent.** A single writer component is the only one allowed to create tickets. It requires an idempotency key derived from the incident identifier and a required approval. The creation tool returns `created` or `matched_existing`, so a repeated attempt cannot produce a second ticket. The `before_tool` hook checks the approval and the key before execution, and the `after_tool` hook records the outcome.

Budgets and context controls are also tightened. Each worker has a small iteration cap and a token ceiling. The parent receives only compact summaries, and a compaction hook preserves the incident identifier and source references when context approaches its limit. The full worker traces remain in storage for audit but are not carried in the active context.

The result is a system in which duplicates are structurally impossible rather than merely discouraged. Parallelism still speeds up research, read-only tools keep exploration harmless, the consolidated memo is traceable to its sources, and the single irreversible action is approved and idempotent.

> **Exam note:** When a scenario says "the agent must not create duplicates," the strongest answer combines one authorized writer with an idempotency key and an approval gate. Simply instructing agents to check first is weaker because concurrent workers cannot see each other's writes.

## Common mistakes

- Building a loop with no clear stopped status, so a capped run is reported as a success.
- Treating a tool's description as enforcement while the registry does not check effect class or arguments.
- Granting write-capable tools to parallel workers that share a resource, then hoping they coordinate.
- Merging subagent outputs by concatenation without verifying references or resolving overlaps.
- Placing safety instructions only in the prompt instead of in hooks at the action boundary.
- Presenting approval dialogs without enough context for a person to make a real decision.
- Letting a denied approval be bypassed through a different tool with the same effect.
- Compacting context by keeping only recent messages and discarding early constraints and decisions.
- Carrying full tool output into context when a short excerpt plus a reference would do.

## Chapter summary

- A robust loop calls the model, dispatches validated tools, records observations, checks limits, and stops with an explicit status.
- A max-iteration guard bounds effort; deadlines, tool-call caps, verification, and no-progress detection bound other failure modes.
- Tool contracts should state purpose, parameters, return shape, effect class, and failure behavior; the registry enforces what the description promises.
- Delegation isolates messy contexts and parallelizes research, but it needs strict summary formats and deliberate merging.
- Hooks apply policy at lifecycle moments — especially before tool execution — and provide the trace used for audit and debugging.
- Guardrails combine allowlists, effect classes, budgets, sandboxing, and human approval for irreversible actions.
- Context management uses compact rendering, preservation-focused compaction, and offloading to keep the working set small without losing essential facts.
- Structural controls beat instructions: centralize writes, use idempotency keys, and fail closed when policy checks cannot run.

## Checkpoint questions

1. An agent reaches its max-iteration limit while still working. What is the correct behavior?

A. Return its best guess as a successful result
B. Return a stopped status with the reason and the trace
C. Silently extend the limit by a few iterations
D. Restart the run with the same context

2. Which set of checks most improves a loop beyond a simple iteration cap?

A. Deadline, tool-call budget, verification, and no-progress detection
B. A longer system prompt and a larger model
C. More tool descriptions and a longer conversation history
D. Removing all limits so the agent can finish naturally

3. A tool description says "read-only," but the implementation can write to a shared database. What is the main problem?

A. The description is too short
B. The registry does not enforce the declared effect class, so the model's belief does not constrain behavior
C. The model needs a higher temperature setting
D. The tool needs a longer name

4. Several parallel research workers are creating tickets for the same incident. Which fix is most reliable?

A. Tell each worker in its instructions to check for existing tickets first
B. Give each worker a different search query so they cannot overlap
C. Remove write tools from workers, centralize creation in one writer, and require an idempotency key with approval
D. Increase the workers' iteration limits so they can investigate more thoroughly

5. Where should a check that blocks a disallowed tool go?

A. In a before-tool hook that denies execution and records a policy-block event
B. In the final answer text
C. In longer-term memory
D. In a compaction summary

6. A parent agent receives three long worker narratives and starts repeating early constraints. Which combination of changes best addresses this?

A. Add more workers and increase the token budget
B. Require compact structured summaries, compact with preservation of decisions and references, and offload large artifacts
C. Delete the trace so the context is smaller
D. Ask the model to remember harder

7. An approval request is denied, but the agent calls a different tool that achieves the same outward effect. What does this reveal?

A. The model is working correctly
B. The policy was tied to one tool name instead of an effect class, and equivalent actions were not covered
C. The iteration cap was too high
D. Compaction removed the denial from memory

8. Which checkpoint question topic is best answered by "write durable user preferences to a memory store, but keep the current plan and recent tool results in working context"?

A. Read-only agents
B. Parallel tool calls
C. Memory hygiene
D. Excessive context compaction only

### Answers and rationale

1. **Correct: B.** A capped run must report that it stopped and why, so callers can distinguish incomplete work from success. A is wrong because presenting a guess as success hides failure. C is wrong because silently extending the limit defeats the guard. D is wrong because restarting with the same context is likely to repeat the same problem.

2. **Correct: A.** Each check addresses a distinct failure: time, call volume, false completion, and repetition. B changes model behavior heuristically without guaranteeing a stop. C adds information, not enforcement. D removes the safety boundary entirely.

3. **Correct: B.** A contract is only as good as the enforcement behind it; the registry must reject writes declared as read-only. A is wrong because length is not the issue. C is irrelevant to permission enforcement. D would not change the underlying mismatch.

4. **Correct: C.** Removing write access, using one authorized writer, and making creation idempotent makes duplicates structurally impossible. A is wrong because concurrent workers cannot see one another's state. B reduces but does not eliminate overlap. D would likely create more tickets, not fewer.

5. **Correct: A.** A before-tool hook sits on the execution path and can deny the action while recording the reason. B is too late to prevent anything. C is unrelated to action control. D is about context management, not policy enforcement.

6. **Correct: B.** Compact structured summaries reduce input size, preservation-focused compaction keeps essential decisions and references, and offloading moves large artifacts out of the working set. A adds more input and cost. C destroys the audit trail without fixing reasoning. D is not a mechanism.

7. **Correct: B.** A boundary defined by effect class covers all equivalent outward actions; a tool-name rule can be routed around. A ignores a real policy failure. C is unrelated to the bypass. D may contribute to confusion but the root problem is the narrow rule.

8. **Correct: C.** The statement is about what belongs in durable storage versus the volatile working set, which is memory hygiene. A concerns tool permissions, B concerns concurrency, and D concerns shrinking context, none of which is the central idea in the statement.

---
*End of chapter 2.*
