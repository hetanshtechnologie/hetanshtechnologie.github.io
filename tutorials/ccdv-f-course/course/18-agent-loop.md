# Chapter 18 — Inside the Agent Loop

## Learning objectives

- Describe the observe–think–act–observe cycle and explain why tool results drive the next iteration.
- Build a loop with explicit stop conditions, step budgets, and an honest status when it cannot finish.
- Separate a model's proposal from the harness that validates, executes, and verifies it.
- Place deterministic hooks around tool calls so policy holds even when the model chooses badly.
- Use a trace to reconstruct what the loop saw, did, and why it stopped.

## Key concepts

### The four beats and the fuel between them

An agent is a repeating cycle with four beats. **Observe** means assemble the current view: the goal, the facts kept so far, the plan if one exists, and the most recent tool results. **Think** means ask the model what to do next, given that view and the available tools. **Act** means execute the chosen action through a controlled interface that checks arguments and permissions. Then **observe** again, because the result becomes new input for the next pass.

The last beat is what separates an agent from a model called in a loop. If a program asks the same question repeatedly and discards each answer, it is only generating text. When the result of an action changes the view, the loop has feedback, and feedback is what makes correction possible. Consider an agent reconciling nightly sales files. It reads a totals report and discovers a mismatch, so it fetches the second file. That file shows a currency conversion note, so it asks for the exchange table. Each observation narrows the next decision.

Tool results are the fuel of the cycle. A successful result supplies data. An empty result says the search found nothing, which often calls for a broader query. A recoverable error says the tool was called badly, so corrected arguments may work. A permanent error says the approach is wrong. A policy denial says a boundary was reached. All of these belong in the view; hiding a failure from the model causes the same call to be repeated.

> **Common mistake:** Treating a tool exception as a reason to abort the whole run. Many exceptions are useful observations. Only security violations, denied approvals, and exhausted budgets should end a run immediately.

### A loop you can read

The pseudocode below keeps the four beats visible and puts every stop decision outside the model. It is a teaching skeleton, not a production implementation.

```text
state = Session(goal, seed_facts, budget, trace)

while True:
    if state.elapsed() > budget.clock:
        return halt("clock expired", state.trace)

    view = state.current_view()        # goal + kept facts + recent observations
    proposal = model.propose(view, state.allowed_tools)
    state.trace.add(iteration, "proposal", proposal)

    if proposal.kind == "answer":
        if state.verifier(proposal.payload):
            return complete(proposal.payload, state.trace)
        state.note("verifier rejected: " + state.last_reason)
        # fall through: the rejection is an observation, not a stop

    state.guard(proposal)              # allowlist, schema, effect class, secrets
    if state.guard.denied:
        state.trace.add(iteration, "policy_block", state.guard.reason)
        return halt("policy", state.trace)

    if state.effect_is_external(proposal) and not state.approve(proposal):
        return halt("approval denied", state.trace)

    result = state.tools.run(proposal.tool, proposal.args)
    state.trace.add(iteration, "observation", compact(result))
    state.observe(result)              # failures and empty results included

    if state.repeating(last=3):
        return halt("no progress", state.trace)

    if state.tokens_spent > budget.tokens or state.calls > budget.calls:
        return halt("budget", state.trace)

    iteration += 1
    if iteration > budget.steps:
        return halt("step cap", state.trace)
```

Several details matter. Budgets are checked inside the loop, because effort accumulates. A rejected answer does not end the run but becomes feedback. Guard denials are recorded before the halt, so the trace explains what was attempted. Every observation is appended in compact form, preserving references while trimming bulk. The final fallback is a `halt` with a reason, never a silent failure or a guessed success.

| Stop condition | Trigger | Enforced by | Returned status | Failure it prevents |
| --- | --- | --- | --- | --- |
| Verified answer | Verifier accepts the proposal | Harness check | `complete` | Declaring success without evidence |
| Clock expiry | Wall-clock limit passed | Harness timer | `halt` | Unbounded user waiting |
| Step cap | Maximum iterations reached | Loop counter | `halt` | Endless deliberation |
| Tool-call budget | Call count exceeds the cap | Harness counter | `halt` | Runaway external requests |
| Token budget | Accumulated tokens exceed the ceiling | Harness meter | `halt` | Uncontrolled spend |
| No progress | Recent observations are identical | Repetition detector | `halt` | Repeating the same failing call |
| Policy denial | Tool is disallowed or arguments are invalid | Hook or guard | `halt` or retry | Unauthorized or malformed action |
| Approval denied | A person refuses a visible action | Approval gate | `halt` | Unauthorized external change |
| Asked for input | The model requests clarification | Harness routing | `needs_input` | Guessing when facts are missing |

A step cap alone is not a safety system. It bounds effort but not harm: a few iterations may still contain a destructive write. The table should be read as a set of complementary limits, each aimed at a different failure.

### What to feed back from a tool result

Not every observation is equally useful. The harness decides how much of a result enters the view, and that decision strongly affects the quality of later thinking. Full tool output is rarely helpful; ten pages of search results push the important excerpt to the edges of attention and cost tokens on every later iteration. A compact rendering with a reference keeps the fact available without carrying the bulk.

| Observation kind | What it tells the loop | Useful reaction | Unhelpful reaction |
| --- | --- | --- | --- |
| Success with data | New facts are available | Update the view and continue | Copy raw output into every later message |
| Empty result | Nothing matched this query | Broaden the query or change source | Repeat the identical query |
| Recoverable error | Arguments or timing were wrong | Correct arguments and retry once | Treat it as final failure |
| Permanent error | The tool or source cannot serve this request | Switch approach or stop honestly | Retry indefinitely |
| Policy denial | A boundary was reached | Record and stop or ask for approval | Try a different tool with the same effect |
| Approval denied | A person refused the action | Stop with a clear reason | Reword the request until approved |
| Oversized output | The source is too large for the view | Keep a summary plus an identifier | Truncate silently and lose the key fact |
| Contradictory data | Sources disagree | Mark uncertainty and seek a tie-breaker | Pick one source arbitrarily |

Preservation matters when the view is condensed. Keep decisions already made, rejected hypotheses with their reasons, identifiers, and constraints from the original request. Drop verbose logs and duplicated text. The trace can hold the full detail for audit while the model sees a curated view.

### The harness is not the model

It helps to name the two participants clearly. The model proposes actions; it does not enforce rules. The **harness** is the surrounding program that calls the model, validates proposals, dispatches tools, shapes the view, runs checks, and decides when the run ends. Everything with teeth lives in the harness.

A minimal harness has five checks. First, a schema check rejects malformed tool arguments before any real system is touched. Second, an allowlist restricts calls to tools registered for this task. Third, an effect class marks each tool as read-only, state-changing, or externally visible, which determines whether approval is required. Fourth, a verifier tests the final answer independently of the model's claim of completion. Fifth, a repetition detector compares recent observations to catch a stuck loop.

The verifier deserves special attention. If the model says "done" and the harness accepts that statement, verification is not happening. A verifier might check that a required schema is satisfied, that a produced file exists, or that every cited identifier resolves. When verification fails, the failure is appended to the view so the next iteration can correct course.

> **Exam note:** When a scenario asks how to stop an agent from announcing success too early, add an independent verifier at the finish boundary, not a stronger instruction in the prompt.

### Hooks as deterministic guards around tool calls

A hook is a callback attached to a specific moment in the run. It is deterministic: given the same proposal and policy state, it makes the same decision every time, without asking a model to judge. That property is why hooks are the right place for enforcement. A prompt can request careful behavior; a hook can refuse the call.

```text
before_tool(proposal, policy):
    if proposal.tool not in policy.allowlist:
        deny("tool not registered for this task")
    if not schema_valid(policy.schema_for(proposal.tool), proposal.args):
        retry("invalid arguments: " + schema_errors)
    if policy.effect(proposal.tool) in ("write", "external"):
        if not approval_from_operator(proposal):
            deny("visible action requires approval")
    if contains_secret_pattern(proposal.args):
        deny("credential-like value in arguments")
    allow(proposal)

after_tool(result, policy):
    log(compact(result))
    if policy.exceeds_size(result): store_artifact(result) and keep_reference()
```

Place hooks where they can actually intercept the action. A check written after execution can report a mistake but cannot prevent it. Denials should fail closed: if the policy service is unavailable, the action is not performed. Approval rules should be expressed by effect class rather than by a single tool name, otherwise a denied tool can be replaced by another tool with the same outward effect.

> **Try it:** List your tools and mark each one read-only, state-changing, or externally visible. Write one hook rule per class. Then check whether any tool can bypass the rule through an alias.

### Tracing a loop

A trace is an ordered record of the run. It turns "the agent behaved strangely" into a sequence that can be inspected. Useful entries include the iteration number, a hash or summary of the view, the proposal, the guard outcome, the executed tool with redacted arguments, a compact observation, token counters, and the final stop reason.

| Trace field | Question it answers |
| --- | --- |
| View summary | What information was available at this step? |
| Proposal and tool arguments | What did the model intend to do? |
| Guard outcome | Was the action allowed, retried, or blocked? |
| Observation | What did the world return? |
| Counters | How close was the run to a budget limit? |
| Stop reason | Why did the run end, and was the status honest? |

A good trace supports replay without exposing secrets. Redaction happens before storage, and identifiers link entries across worker contexts when delegation is used. When a run stops, the trace should make the reason obvious; if the only clue is "maximum steps reached," the team has learned that the loop was bounded but not why it failed to progress.

## Practice lab

**Goal.** Instrument a small agent loop so that a stuck tool call stops the run with a readable trace.

1. Write a loop with one tool that returns the same failing result on every call.
2. Add a proposal log, a guard log, and an observation log with iteration numbers.
3. Add a repetition detector that compares the last three observations.
4. Add a step cap and a tool-call cap with different values.
5. Run the loop and record the final status and stop reason.
6. Change the tool to return an empty result and notice how the loop reacts differently.

**Expected observation.** Without the repetition detector, the run reaches the step cap after wasting its calls. With it, the run stops earlier and names "no progress" as the reason. The trace shows the identical observations that triggered the stop, which is much more useful than a bare iteration count.

## Worked scenario

### The problem

A finance team uses an agent to reconcile nightly sales files. The agent reads a totals report, fetches the detail file, checks for mismatches, and produces a short exception memo. Recently a run spent its entire budget calling the detail file tool with the same date, produced no memo, and reported success. The team needs to know whether the fault is in the model, the tool, or the loop.

### Reasoning

The trace shows the first observation contained a currency mismatch. The next three proposals were identical calls with the same date argument, and each observation repeated the same error text. No repetition detector fired, so the loop consumed its full call budget. The final proposal was an answer written from incomplete data, and the harness accepted it because there was no verifier. Two patterns are missing: a no-progress check and an independent completion check.

### Resolution

The team adds a repetition detector over compacted observations and a verifier that requires the memo to name at least one resolved exception or explicitly state that none could be resolved with references. The detail tool's contract is updated so the error distinguishes "file not ready" from "wrong date," giving the loop a useful choice between waiting and changing arguments. A hook redacts the credential-like parameter that appeared in the tool arguments before the trace is stored.

The loop now stops with `halt("no progress")` when three observations match, and the status is distinct from `complete`. On a different night, when the file is genuinely late, the agent reads the recoverable error, waits, and retries with a bounded backoff. The trace records every proposal and guard decision, so the next incident can be diagnosed in minutes rather than reconstructed from guesses.

> **Exam note:** A run that "finished successfully" with incomplete work points to a missing verifier; a run that repeated the same call points to a missing no-progress check. These are different fixes.

## Common mistakes

- Believing that more iterations automatically improve an agent's answer.
- Reporting a capped run as a success instead of an explicit stopped status.
- Checking budgets only once before the loop begins.
- Hiding tool errors from the model so identical calls are repeated.
- Letting the model verify its own completion claim.
- Putting policy checks in prompts rather than in hooks on the action path.
- Writing full tool output into the view instead of a compact form with references.
- Storing traces that include secrets or unbounded raw artifacts.

## Chapter summary

- The cycle is observe, think, act, observe; tool results are the feedback that enables correction.
- A harness owns validation, execution, context shaping, verification, and stopping; the model only proposes.
- Stop conditions cover success, time, steps, calls, tokens, repetition, policy, approval, and clarification.
- A verifier must be independent of the model's claim of completion.
- Hooks are deterministic guards placed on the action path, and denials should fail closed.
- Compact observations preserve decisions and references while shedding bulk.
- A structured trace with redacted arguments turns a strange run into a diagnosable one.

## Checkpoint questions

1. What makes an agent different from a model called repeatedly in a loop?

A. The agent uses a larger model
B. The agent feeds action results back into the next decision
C. The agent has no tool definitions
D. The agent writes a longer system prompt

2. A loop reaches its step cap while mid-task. What should it return?

A. Its best guess, marked as success
B. A stopped status with the reason and the trace
C. A new loop with the same view
D. Nothing, so the caller retries blindly

3. Which pair of checks addresses both repeated failing calls and premature success?

A. Longer prompt and a bigger model
B. No-progress detection and an independent verifier
C. More tools and a wider context window
D. Fewer iterations and no trace

4. Where should a check for a disallowed tool be enforced?

A. In the final answer text
B. In a before-tool hook that denies execution
C. In the memory store
D. In a compaction summary

5. A search tool returns an empty result. What is the most useful reaction?

A. Stop the run as a permanent failure
B. Repeat the same query until it succeeds
C. Broaden the query or try another source
D. Report the empty result as a verified answer

6. Why should approval rules use effect classes instead of tool names?

A. Effect classes are shorter to write
B. Effect classes cover equivalent outward actions as well
C. Tool names cannot be logged
D. Approval is unnecessary for read-only tools

7. Which trace field best answers "what did the model intend to do at step five?"

A. Token counter
B. Proposal and tool arguments
C. Stop reason
D. View summary

### Answers and rationale

1. **Correct: B.** Feedback from observations changes later decisions, which is the defining property. A is wrong because model size is irrelevant. C is wrong because agents normally need tools. D is wrong because prompt length does not create a loop.

2. **Correct: B.** An honest stopped status separates incomplete work from success. A hides failure. C would likely repeat the same problem. D leaves the caller with no explanation.

3. **Correct: B.** Repetition detection catches stuck calls; a verifier blocks unchecked completion. A offers heuristic changes, not guarantees. C may worsen cost and confusion. D removes evidence and makes diagnosis harder.

4. **Correct: B.** A hook on the action path can prevent the call and record the denial. A is too late. C concerns storage, not control. D concerns context size, not policy.

5. **Correct: C.** An empty result is a signal to change the search, not a terminal error. A confuses "nothing found" with failure. B wastes the budget. D presents missing evidence as an answer.

6. **Correct: B.** A class such as "externally visible write" covers every alias with the same effect. A is not a reason. C is false; tool names are routinely logged. D is true but irrelevant to the question of coverage.

7. **Correct: B.** The proposal entry records the intended action and its arguments. A records cost only. C explains the ending, not a mid-run intention. D shows available information, not the choice made.

---
*End of chapter 18.*
