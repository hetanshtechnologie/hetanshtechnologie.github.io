# Chapter 20 — Agent SDK, Hooks, Deployment, and Trace Diagnosis

## Learning objectives

- Identify what an agent SDK provides and which responsibilities remain with the application team.
- Implement deterministic hook checks that can deny or retry tool calls.
- Compare self-hosted and vendor-hosted runtime choices against concrete constraints.
- Diagnose a failing agent by matching trace signatures to missing design patterns.
- Apply exam-lens reasoning to agent architecture questions.

## Key concepts

### What an agent SDK actually supplies

An agent SDK is a library and runtime for the loop described in the previous chapters. It usually supplies a loop engine, a tool registry that describes tools to the model, a hook bus, adapters for context and memory, a trace sink, and helpers for subagent coordination. Some offerings also provide deployment templates. What matters is not the branding but the set of responsibilities the SDK takes over.

The application team still owns the parts that encode intent. It writes the goal and instructions, selects tools and their effect classes, defines budgets, decides which actions require approval, chooses what is stored in memory, and interprets traces. An SDK can make these choices configurable; it cannot decide what is correct for a particular business problem.

| SDK surface | What it controls | Question to ask before using it |
| --- | --- | --- |
| Loop engine | How proposals, tool calls, and observations are sequenced | Can we see and bound every iteration? |
| Tool registry | Descriptions, schemas, and available capabilities | Are effect classes enforced or only documented? |
| Hook bus | Callbacks at lifecycle moments | Can a hook deny an action, or only log it? |
| Context adapters | How history is selected, rendered, and compacted | Which decisions and references survive compaction? |
| Memory adapters | What is stored across runs and how it is retrieved | Can writes be reviewed and revoked? |
| Trace sink | How events are recorded and correlated | Are arguments redacted and worker traces linked? |

A useful habit is to keep a written map of these surfaces for any SDK in use. When behavior surprises the team, the map tells them where to look first. Without it, debugging becomes a search through someone else's abstraction.

### Hooks for deterministic checks

A hook is ordinary code attached to a lifecycle moment. Its defining property is determinism: the same proposal and policy state produce the same decision, with no model in the loop. That makes hooks the correct place for checks that must hold when the model makes a poor choice.

A complete policy distinguishes three outcomes. **Allow** passes the call to execution. **Retry** returns a correctable problem to the model without consuming a real action, which is appropriate for malformed arguments. **Deny** blocks the call and records a reason, which is appropriate for a disallowed tool, a missing approval, or a suspicious argument. Denial should fail closed: if the policy service cannot answer, the action does not proceed.

```python
def before_tool(call, policy, approvals, registry):
    tool = registry.get(call.name)
    if tool is None or tool.name not in policy.allowlist:
        return Deny("tool not registered for this run")

    problem = tool.schema.validate(call.args)
    if problem:
        return Retry(f"invalid arguments: {problem}")

    if tool.effect in ("write", "external") and not approvals.has(call.id):
        return Deny("visible action requires approval")

    if secrets.looks_like_credential(call.args):
        return Deny("credential-like value in tool arguments")

    return Allow(call)


def after_tool(result, sink, store):
    sink.record(compact(result), redact=True)
    if result.is_oversized:
        return store.artifact_and_return_reference(result)
    return result
```

Order matters. Cheap structural checks run before checks that require human state, and the approval check runs before any argument reaches a real system. The after-tool hook keeps the trace useful without carrying bulk into context. Notice that the approval rule is expressed by effect class, so a new externally visible tool inherits the same protection automatically.

> **Exam note:** If a question contrasts "make the instruction stricter" with "add a before-tool hook that denies the action," choose the hook. Instructions are guidance; a hook on the execution path is enforcement.

### Self-hosted versus vendor-hosted deployment

Deployment determines who runs the loop, who stores traces, and which constraints can be met. A self-hosted runtime gives the team control over the loop code, hook order, network boundaries, and log storage. A vendor-hosted runtime removes most operational work and may offer managed scaling and built-in observability, at the price of less control over internals and data placement.

| Dimension | Self-hosted runtime | Vendor-hosted runtime | Decision lens |
| --- | --- | --- | --- |
| Control of loop and hooks | Full control over order and code | Limited to exposed configuration | Does a required check need custom code? |
| Data placement | Data can stay inside a chosen boundary | Data passes through a managed service | Must content remain in a region or network? |
| Operations | Team owns scaling, patching, and uptime | Provider owns infrastructure | Does the team have an operations function? |
| Latency | Depends on local design and network | Depends on service routing | Is there a hard response-time contract? |
| Cost shape | Fixed capacity plus usage | Usage-based billing | Is spend predictable or variable? |
| Upgrade cadence | Team chooses when to change versions | Provider controls rollout | Can the team absorb breaking changes? |
| Trace ownership | Stored in team-controlled systems | Stored in provider tooling | Who needs access for audit? |
| Failure domain | Local faults are visible and controllable | Provider incidents are external | Is independent recovery required? |

Hybrid designs are common. A team may run the loop and hooks on its own infrastructure while calling a hosted model endpoint, keeping sensitive tool execution local. Another team may host the runtime but send traces to its own logging system. The exam tends to test the constraint, not the product: if data cannot leave a network, the loop and tool execution must respect that; if there is no operations capacity, a managed runtime is more realistic.

> **Common mistake:** Assuming a hosted runtime removes the need for hooks or budgets. Deployment changes where checks run; it does not remove the need for them.

### Diagnosing an agent from its trace

Trace diagnosis is a reasoning skill. Start at the stop reason, then walk backward to the first step where the run diverged from the goal. A late symptom, such as a wrong final answer, is often caused by an earlier missing signal: an unverified observation, a lost constraint, or a policy that never fired.

The following table maps common signatures to the pattern that is usually absent. It is a diagnostic aid, not a substitute for reading the actual events.

| Trace signature | Likely missing pattern | Check to add | Weak response |
| --- | --- | --- | --- |
| Same proposal and same observation repeated many times | No-progress detection | Compare recent observations and halt on repetition | Increase the step cap |
| `complete` status with an empty or invalid artifact | Independent verifier at the finish boundary | Validate schema or artifact before accepting | Ask the model to be more careful |
| Disallowed tool executed successfully | Allowlist enforced in the registry or hook | Deny unregistered tools before execution | Add the tool name to the prompt |
| Denied approval followed by an equivalent tool call | Policy expressed by effect class | Cover all externally visible effects | Rename the blocked tool |
| Early constraints ignored in late steps | Preservation-focused compaction | Keep constraints and decisions in the summary | Keep only the most recent messages |
| Worker result has claims but no identifiers | Evidence requirement in the summary contract | Reject summaries without references | Trust the worker's confidence value |
| Trace ends with no status entry | Explicit stop handling and trace close | Emit a stop reason for every terminal path | Infer the outcome from the last call |
| Costs spike while the answer stays the same | Context offloading or reuse of prior results | Render compact observations and cache stable reads | Remove all budgets |
| Long worker traces cannot be correlated | Shared run identifier across branches | Tag every event with run and worker identifiers | Delete worker traces to simplify storage |

Correlation matters when delegation is involved. Each worker's trace should carry the parent run identifier so that a manager's decision can be traced back to the evidence that produced it. Redaction belongs at recording time: secrets in tool arguments should never reach the trace store, even temporarily.

> **Try it:** Take a failed run and write a one-sentence story from its trace: what the agent saw, what it chose, what stopped it. If the story contains a gap, that gap is the missing pattern.

### Exam-lens architecture decisions

Agent architecture questions usually hide a constraint in plain language. A short routine helps. Name the constraint first: fixed path, variable path, sensitive data, irreversible action, tight latency, or limited operations capacity. Choose the smallest shape that handles it. Put enforcement at the moment where the risky action occurs. Require evidence that the result is real. Leave a trace that explains the ending.

Four habits cover most correct answers. Prefer a mechanism to a stronger instruction. Prefer an effect class to a tool-name rule. Prefer a bounded agent in the middle of a workflow to an unbounded agent with good intentions. Prefer an explicit stopped status to a guessed success. When two options both sound reasonable, the one that still works after the model makes a bad choice is usually right.

## Practice lab

**Goal.** Add a deterministic hook to a small agent and diagnose its behavior from the resulting trace.

1. Register two tools: one read-only lookup and one that sends a message.
2. Add a before-tool hook that denies the send tool unless an approval record exists.
3. Run the agent and ask it to send a message without granting approval.
4. Inspect the trace entry for the denial and confirm the tool did not execute.
5. Grant approval for a second run and compare the trace entries.
6. Introduce a malformed argument on the lookup tool and confirm the hook returns a retry rather than a denial.

**Expected observation.** The first run stops or reports the blocked action with a recorded reason, and no message leaves the system. The second run shows an approval event followed by execution. The malformed lookup produces a retry instruction in the view but no real tool call, illustrating the difference between correctable and blocking failures.

## Worked scenario

### The problem

A team uses an agent to prepare release notes and email them to subscribers. A recent run sent an unfinished summary: the trace showed that the agent had read only the first half of the change log. The email tool had been described as requiring review in the system prompt, but no code checked for approval. The final step accepted the model's own statement that the notes were complete.

### Reasoning

Three patterns are missing. There is no verifier at the finish boundary, so completeness is asserted rather than checked. There is no effect-class hook, so an externally visible action can run without approval. The trace does not record a constraint check, so nobody can see which source material was considered complete. The system prompt's warning is not a mechanism.

### Resolution

The team marks the email tool as externally visible and adds a before-tool hook that denies it unless an approval record exists for that run. The approval view shows the draft, the change-log entries it used, and the entries not yet reviewed. A verifier checks that the draft references every merged change and that each reference resolves before the draft can be presented for approval. The trace records the read operations, the verifier result, the approval, and the send outcome with redacted addresses.

A follow-up review finds that compaction had dropped the "use the full change log" constraint late in the run. The context adapter is changed to preserve the goal and constraints verbatim when summarizing older steps. The final design still allows the agent to assemble the notes, but it cannot declare completion unchecked or send anything unapproved.

| Symptom in original trace | Missing pattern | Remedy |
| --- | --- | --- |
| Send happened without approval | Effect-class hook | Deny visible actions until approved |
| `complete` despite missing entries | Independent verifier | Check references to all merged changes |
| Late steps ignored the full-log constraint | Preservation-focused compaction | Retain constraints in summaries |
| No record of the decision to send | Stop and approval trace events | Emit correlated events for every terminal path |

> **Exam note:** A wrong outward action is rarely fixed by a better prompt. Look for the control that can prevent the action and the trace that can prove what happened.

## Common mistakes

- Assuming an SDK supplies the business rules that decide which actions are safe.
- Treating hook observability as equivalent to hook enforcement.
- Expressing approval policy by tool name instead of by effect class.
- Deploying a hosted runtime without budgets or traces because the provider "handles it."
- Reading only the final answer in a trace instead of finding the first wrong step.
- Increasing step caps to fix repetition instead of adding no-progress detection.
- Accepting a worker summary without evidence identifiers.
- Choosing a deployment model before checking data-placement and operations constraints.

## Chapter summary

- An agent SDK supplies runtime pieces; the team owns goals, effect classes, budgets, approvals, and interpretation.
- Hooks are deterministic checks on the action path, with distinct allow, retry, and deny outcomes.
- Approval policy should follow effect classes so equivalent actions cannot bypass it.
- Self-hosted runtimes buy control; vendor-hosted runtimes buy operational simplicity; hybrids are common.
- Trace diagnosis matches a signature to a missing pattern and fixes the first wrong step.
- Correlated, redacted traces make delegated runs explainable.
- Exam-lens reasoning prefers mechanisms over instructions and explicit stopped statuses over guesses.

## Checkpoint questions

1. Which responsibility typically remains with the application team when using an agent SDK?

A. Running the model call loop
B. Registering tool schemas
C. Deciding which tool effects require approval
D. Storing the trace events emitted by hooks

2. A tool call has malformed arguments. What is the most appropriate hook outcome?

A. Deny, because any bad call should stop the run
B. Retry, so the model can correct the arguments without a real action
C. Allow, because schemas are advisory
D. Ignore the call and continue without recording it

3. A denied send is followed by a different tool that sends the same message. What is the root problem?

A. The step cap is too high
B. The policy was tied to a tool name rather than an effect class
C. The model is too capable
D. The trace was redacted

4. Which constraint most strongly favors a self-hosted runtime?

A. The team has no operations staff
B. Data must remain inside a specific network boundary
C. The workload is small and variable
D. The team wants managed scaling

5. A trace shows `complete` with an empty output file. Which pattern is missing?

A. No-progress detection
B. An independent verifier at the finish boundary
C. A tool registry
D. Parallel workers

6. What is the best first move when diagnosing a failed run?

A. Replace the model
B. Read the stop reason and walk back to the first wrong step
C. Delete the trace and rerun with more tools
D. Increase all budgets

7. Which trace practice supports delegated debugging?

A. Giving each event a run and worker identifier
B. Storing only the manager's final answer
C. Removing worker traces to save space
D. Recording arguments without redaction

8. A team runs its loop and tool execution locally but calls a hosted model endpoint. Which statement is accurate?

A. Hooks are unnecessary because the model is hosted
B. Local execution can still enforce tool policy and keep tool data inside the boundary
C. Deployment choice determines whether the task needs an agent
D. Trace events must be discarded when any hosted service is involved

### Answers and rationale

1. **Correct: C.** Approval policy encodes business judgment and stays with the team. A, B, and D are runtime services an SDK commonly provides, though configurations vary.

2. **Correct: B.** Malformed arguments are correctable, so a retry that returns the schema error is appropriate. A is wrong because it treats a fixable mistake as a policy violation. C is wrong because schemas should be enforced. D is wrong because all attempts belong in the trace.

3. **Correct: B.** An effect-class rule covers every tool with the same outward effect; a name-based rule can be routed around. A is unrelated to bypass. C is not a design diagnosis. D concerns privacy, not authorization.

4. **Correct: B.** A hard data-placement constraint favors running the loop and tools where that boundary can be enforced. A, C, and D favor a managed option instead.

5. **Correct: B.** Completion must be checked against an artifact or schema. A addresses repetition, not false completion. C addresses tool description, not verification. D adds workers without fixing the finish gate.

6. **Correct: B.** The stop reason and the first divergence give a targeted fix. A is a guess. C destroys evidence. D may increase cost without addressing the cause.

7. **Correct: A.** Shared identifiers let a manager decision be traced to worker evidence. B loses the evidence chain. C loses branch detail. D risks storing secrets.

8. **Correct: B.** A hybrid design keeps control of tool execution and policy locally even when inference is remote. A is wrong because model hosting does not remove the need for enforcement. C is wrong because shape follows the task, not the deployment. D is wrong because traces can and should be kept with redaction.

---
*End of chapter 20.*
