# Chapter 10 — Workflow Decomposition and Safeguarding

A large goal is rarely achievable in one clean motion. It has prerequisites, dependencies, and points where a wrong result should stop the work rather than flow into the next step. Workflow decomposition is the discipline of turning a goal into ordered subtasks and then deciding, at each moment, which subtask is allowed to run. Safeguarding is the companion discipline: making sure the workflow cannot wander forever, spend without limit, or reach a capability that was never intended for it.

The two belong together. A decomposition without safeguards is a plan with no brakes. Safeguards without a decomposition are fences around nothing in particular. Exam questions in this area usually test whether the candidate can see both halves at once — whether the proposed design says what happens next *and* what stops it.

## Learning objectives

- Break a large goal into subtasks with explicit prerequisites and completion criteria.
- Explain how an orchestration loop chooses the next step from state rather than from hope.
- Recognize when a change in the environment invalidates the current decomposition.
- Compare sequential, parallel, and hierarchical decomposition shapes.
- Name the guardrails that bound a workflow and explain why prose alone is not a guardrail.
- Place checks between steps so that errors are contained rather than propagated.

## Key concepts

### Breaking a Goal into Ordered Subtasks

Decomposition starts by naming the completion criterion for the whole task, then working backward. For each candidate subtask, an architect should be able to answer three questions: what must be true before it starts, what it produces, and how the system will know it finished. A subtask that cannot be described in those terms is not yet a subtask; it is an aspiration. This is why "analyze the documents" is a poor unit of work while "extract all renewal dates from the supplied documents with a quotation for each" is a usable one.

Order comes from dependency, not from habit. If step two needs the output of step one, it must not be scheduled earlier, even when running it earlier appears faster. Dependencies also determine which failures are recoverable. A failure in an early step usually invalidates everything downstream, while a failure in a late, isolated step can often be retried locally. Good decompositions therefore put cheap, decisive checks early, so that an impossible task is discovered before expensive work is done.

Granularity is the hardest judgment call. Subtasks that are too large hide failures inside them; subtasks that are too small produce overhead and make it difficult to see meaningful progress. A practical rule is to split until each unit has a single clear owner and a single clear result, then stop. If two neighboring units always fail or succeed together, they were probably one unit.

A completion criterion should be observable by something other than the agent doing the work. "The summary is complete" invites the model to declare victory; "the summary contains one entry per source document and each entry cites a paragraph" can be tested. Architecting in terms of observable criteria also makes delegation safer, because a worker cannot quietly expand its own definition of done. When a criterion cannot be observed directly, an architect should identify a proxy — a count, a schema, a checksum, or a recorded tool result — and use that proxy as the gate.

> **Exam note:** Scenario questions often include an option that lists activities without dependencies. If the option cannot say what must happen before what, it is not a decomposition.

### Choosing the Next Step

The orchestration loop does not choose the next step by rereading the original request and improvising. It chooses by inspecting state: which subtasks are complete, which are blocked, which have failed, and which have their prerequisites satisfied. The loop is closer to a small scheduler than to a conversation. It compares the current state against the plan, selects an eligible step, runs it, records the result, and repeats.

This view makes two things clear. First, the plan must be represented somewhere the loop can read it — a task list, a state object, or an explicit workflow definition. A plan that exists only as prose in a prompt cannot be inspected and therefore cannot drive scheduling. Second, termination must be represented too. The loop needs to know what "done" looks like, and it needs to know when to stop without declaring success. A workflow that has no explicit completion condition will keep finding plausible-looking next steps.

State also explains the difference between waiting and stuck. A workflow is waiting when it is blocked on an external condition that is expected to resolve, such as an approval. It is stuck when it keeps selecting steps that make no progress, such as retrying the same failing operation. Both look quiet from the outside, but only one is healthy. An architect should make the distinction visible by recording why a step is blocked and setting a deadline for every wait.

In practice, the state record should include each step's status, its input references, its result reference, and the reason it was selected. That last field is often overlooked, yet it is what makes a stalled workflow diagnosable. If an auditor can see that a step was chosen because its prerequisites were satisfied at a particular moment, the system is explainable. If the only record is a conversation, the same audit becomes an exercise in interpretation.

### Splitting When the Environment Changes

Some decompositions fail not because the plan was wrong at the start, but because the world moved. A source document is revised, a permission is revoked, a downstream service changes its response shape, or a new requirement arrives mid-run. The orchestrator must decide whether to continue, adapt, or restart.

The decision hinges on whether the change affects completed steps. If a completed step produced a result that depends on the changed thing, that result is now suspect, and any step that consumed it is suspect as well. Continuing in that situation produces a polished output built on stale premises. The correct move is to invalidate the affected results and rerun them, which may mean rolling back several steps. If the change affects only future steps, the plan can be amended from the current point forward.

> **Common mistake:** Treating a mid-run change as a note to include in the final answer. If the change invalidates an earlier result, it must invalidate the work that depended on that result.

This is also where provenance pays off. If each recorded result names the inputs and tool responses it relied on, the orchestrator can identify exactly which steps to invalidate. Without provenance, the only safe response to a significant change is to restart everything, which is expensive and often skipped under time pressure. Recording dependencies during decomposition is therefore a safeguard in its own right.

### Sequential, Parallel, and Hierarchical Shapes

Three shapes cover most practical workflows. A sequential shape runs one step at a time, passing results forward. It is easy to reason about and ideal when each step depends on the last. A parallel shape runs independent steps at the same time and joins their results at a synchronization point. It saves time but requires careful input ownership and a reconciliation step. A hierarchical shape nests decomposition: a parent step delegates a sub-workflow to a child coordinator, which manages its own steps and returns a result. It is useful when a subtask is itself complex enough to need planning.

Each shape has a characteristic failure. Sequential workflows fail through slowness and through error propagation from an early step. Parallel workflows fail through duplicated inputs and premature joining, where results are combined before all contributors finish. Hierarchical workflows fail through loss of visibility: the parent sees a single result and cannot tell how the child reached it. The mitigation in each case is specific to the shape, which is why choosing a shape is a real design decision.

| Shape | Best fit | Main risk | Primary mitigation |
| --- | --- | --- | --- |
| Sequential | Strong dependencies between steps | Errors propagate downstream | Checks after each step |
| Parallel | Independent inputs and outputs | Duplicate work and early joins | Input ownership and sync points |
| Hierarchical | A subtask that needs its own planning | Opaque child decisions | Structured child result with evidence |

Hybrids are common and acceptable. A workflow might run three investigation branches in parallel and then enter a sequential review phase. What matters is that the join is explicit: the workflow must wait for all expected branches, handle a branch that fails, and refuse to proceed with an incomplete set unless a documented partial-result policy allows it.

### Guardrails That Actually Bound the Workflow

Guardrails are constraints enforced by the system, not promises written in the instruction text. The core set includes step limits, spend limits, allowed tools, time or deadline limits, and approval gates. A step limit caps how many loop iterations may occur. A spend limit caps model or tool usage measured in whatever unit the platform tracks. An allowed-tools list restricts the capabilities available to a step. An approval gate requires an external confirmation before a risky action proceeds.

The distinction between a guardrail and a prompt instruction is central to this topic. "Do not use more than ten steps" in a prompt is guidance; the model may forget, misunderstand, or rationalize an exception. A step counter checked by the runtime is a safeguard. Similarly, "ask before sending" is not the same as an approval gate that physically withholds the send capability until a confirmation is recorded. Exam options that rely on careful wording to control behavior are usually distractors.

> **Exam note:** If a proposed control can be ignored by the same reasoning process it is meant to constrain, it is not a safeguard. Look for enforcement outside the model.

Approval gates deserve special attention because they are often placed badly. A gate after an irreversible action is useless; the action has already happened. Gates must sit immediately before the risky step, and the information shown to the approver must be enough to judge the action — what will happen, to what, and with what effect. A gate that asks for approval of a vague description is a formality, not a control.

| Guardrail | What it bounds | Where it is enforced |
| --- | --- | --- |
| Step limit | Number of loop iterations | Runtime counter |
| Spend limit | Cumulative resource usage | Runtime accounting |
| Allowed tools | Capabilities available to a step | Tool configuration |
| Approval gate | Irreversible or high-impact actions | External confirmation before execution |
| Deadline | Time spent waiting or retrying | Runtime clock |

### Checks Between Steps

A check between steps is a small, deliberate evaluation of the previous result before it becomes input to the next step. It is not a full re-run of the work. Typical checks include schema validation, coverage checks, consistency checks against a source, and policy checks that flag restricted content. The check either passes, returns a specific repair instruction, or escalates. Returning a vague "please try again" wastes a retry, so a failed check should name the exact problem.

Checks are most valuable where errors are cheap to catch and expensive to propagate. If a structured result is missing a required field, a schema check catches it instantly. If a summary contradicts its source, a consistency check catches the drift before the summary is quoted downstream. If an action would affect an external system, a policy check can route it to an approval gate. Placing checks at these boundaries turns a fragile chain into a set of contained segments.

The counterweight is cost. Every check consumes resources and adds latency, so architects should not add checks everywhere. The right density follows the failure consequence. Low-impact reversible steps may need only a lightweight validation. High-impact steps may need an independent review. A useful heuristic is to spend roughly as much effort checking a step as the cost of being wrong about it.

A failed check also needs a defined route. Three outcomes are usually enough: repair and retry once, escalate to a human with the evidence attached, or stop and report partial results. What should not happen is an unmanaged loop in which the check fails, the model apologizes, and the workflow tries again unchanged. The check result should therefore include the failing field or rule, not just a verdict, so that the retry has somewhere specific to start.

```text
GUARDED WORKFLOW PLAN
goal: Produce a commitments memo from three supplied reports.
completion: Memo exists and every extracted commitment has a policy rule.
shape: parallel extraction, then sequential review.

steps:
  1. extract_a  inputs: report_a        tools: read, search
  2. extract_b  inputs: report_b        tools: read, search
  3. load_rules inputs: policy_catalog  tools: read
  sync: wait for steps 1-3 before any review step
  4. reconcile  inputs: results 1-3     check: each commitment has a rule
  5. draft_memo inputs: reconciled set  check: no unsupported claims

guardrails:
  max_steps: 20
  max_tool_calls_per_step: 12
  allowed_tools: read, search, draft
  approval_gate: before any external delivery
  deadline: stop and report partial state if wait exceeds limit

on_failure:
  schema error -> return named field, retry once
  missing rule -> flag for human review, do not infer
  branch failure -> mark partial, do not join early
```

> **Design rule:** A guardrail belongs in the configuration or runtime. A sentence asking the model to behave is an instruction, and instructions can be overridden by the next instruction.

## Worked scenario

A team wants to automate a quarterly review that combines contract data, a usage report, and a policy document into a short decision memo. The first proposed design sends all three sources to one agent with a request to "review everything and prepare the memo." That design has no observable steps, no place to check whether the usage report was read completely, and no control over the final delivery.

An architect rewrites it as a guarded workflow. Three extraction steps run in parallel, each with a named input and a fixed output shape. A synchronization point prevents review from starting until all three have returned. The first check validates the shapes; the second compares the extracted contract dates against the usage report and flags mismatches. Only after those checks pass does a drafting step run. The final delivery sits behind an approval gate, and the workflow has a step cap and a deadline recorded in its configuration.

Mid-run, the policy document is updated. Because each result records its input version, the orchestrator can see that only the rule-loading step is affected. It re-runs that step and the reconciliation step, leaves the two extraction results intact, and continues. This is the payoff of recording dependencies at decomposition time. Without them, the team would have faced a choice between restarting everything and knowingly using an old policy.

The review board asks whether the same outcome could have been achieved by adding more instructions to the original prompt. The architect's answer is that instructions cannot create a synchronization point, cannot count steps, and cannot withhold a delivery capability. Those are properties of the system around the model, not properties of the text given to it.

## Common mistakes

- Listing activities without stating prerequisites or completion criteria.
- Letting the loop infer the next step from the original request instead of from recorded state.
- Continuing after a source change because the change "only affects the final wording."
- Joining parallel branches before all expected results have arrived.
- Treating a carefully worded instruction as an enforced limit.
- Placing an approval gate after the irreversible action it was meant to control.

## Chapter summary

- Decomposition turns a goal into units with prerequisites, outputs, and completion criteria.
- The loop selects the next step by inspecting recorded state, not by improvising from the request.
- Environment changes invalidate any result that depended on the changed input.
- Sequential, parallel, and hierarchical shapes each have a distinct failure and mitigation.
- Step limits, spend limits, tool allowlists, deadlines, and approval gates are enforced outside the model.
- Checks between steps should be specific, placed by failure consequence, and return actionable repair information.

## Checkpoint questions

1. Which option is the strongest unit of decomposition?

   - A. "Review the reports."
   - B. "Extract renewal dates from the supplied reports with one quotation each, using only the read tool."
   - C. "Do whatever seems necessary to finish the memo."
   - D. "Think carefully about the reports before continuing."

2. A workflow keeps selecting a failing step and never finishes. What is the most likely missing element?

   - A. A more detailed system prompt.
   - B. A recorded state with eligibility rules and a stop condition checked by the runtime.
   - C. A longer context window.
   - D. An additional parallel branch.

3. A source document changes after two steps have completed. What should the orchestrator check first?

   - A. Whether the completed results depended on that document.
   - B. Whether the final memo can mention the change in a footnote.
   - C. Whether the model still remembers the original document.
   - D. Whether a new worker can be added without a brief.

4. Which shape best fits three independent data extracts followed by a combined review?

   - A. Purely sequential.
   - B. Parallel extraction with an explicit synchronization point, then sequential review.
   - C. Hierarchical with no child result contract.
   - D. A single unstructured loop.

5. Which of these is a genuine safeguard?

   - A. The instruction "do not exceed ten steps."
   - B. A reminder to ask before sending anything.
   - C. A runtime step counter and an approval gate that withholds delivery.
   - D. A polite warning about being careful.

6. Where should an approval gate for an irreversible action be placed?

   - A. After the action, so the record is complete.
   - B. At the end of the workflow, alongside final formatting.
   - C. Immediately before the action, with enough detail for a judgment.
   - D. Only when the model expresses low confidence.

### Answers and rationale

1. **B.** It names an input, a concrete result, a verification handle, and a tool boundary. **A** is too vague to verify completion. **C** delegates planning back to the model without a unit of work. **D** describes an internal mental state, not an observable output.

2. **B.** Scheduling requires inspectable state and an explicit termination rule enforced by the runtime. **A** cannot stop a loop that has already begun repeating. **C** adds capacity without adding control. **D** increases work while leaving the underlying problem untouched.

3. **A.** The first question is which results relied on the changed input, because those results and their dependents become suspect. **B** treats a validity problem as a presentation problem. **C** is irrelevant because correctness does not depend on memory. **D** addresses staffing, not invalidation.

4. **B.** Independent extracts benefit from parallel execution, and the combined review must wait for all of them. **A** forfeits the available parallelism. **C** adds opacity without a result contract. **D** provides no structure at all.

5. **C.** Both controls are enforced outside the reasoning process. **A** is guidance that can be ignored. **B** describes an intention without a mechanism. **D** has no effect on behavior.

6. **C.** A gate must precede the action and show enough information to judge it. **A** is too late to prevent anything. **B** places the gate far from the risk and may bury it in formatting work. **D** makes safety depend on a confidence signal that can be wrong.

---

*End of chapter 10.*
