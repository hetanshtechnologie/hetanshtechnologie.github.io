# Chapter 27 — Practice Paper One

## Learning objectives

- Simulate a full exam attempt across the five architectural layers and the cross-layer concerns that cut through them.
- Practice finding the deciding constraint in a scenario before comparing answer options.
- Separate a defensible design choice from an answer that is plausible but over-privileged, unverified, or unbounded.
- Apply a two-pass routine that protects time and reduces avoidable errors.
- Use the answer key to turn each miss into a specific revision target.
- Build confidence in explaining why a correct option wins, not just recognising it.

## Key concepts

This paper is a practice instrument, not a prediction of any particular assessment. Every scenario is written for this book. Work through it with notes closed; the learning happens in the review, not in the attempt.

### How to run the attempt

Set aside one uninterrupted block. Read every stem once, mark the option that looks strongest, and flag anything that needs a second look. Do not change an answer unless you can name the constraint that justifies the change. If a scenario mentions an irreversible action, a strict confidentiality rule, or a hard budget, that detail is usually the deciding constraint.

> **Exam note:** A correct answer in this paper is often the option that adds a boundary: a step limit, a narrower permission, a validation check, or a human gate.

### The two-pass routine

On the first pass, answer everything you can decide quickly and flag the rest. On the second pass, spend your remaining effort only on flagged items. When two options both look right, choose the one that addresses the stated risk with the smallest mechanism. Broad redesigns are rarely the first move when a narrow guard would do.

> **Timing cue:** If a single stem takes more than a short pause to parse, write down the constraint you think matters and move on. Returning with a written note is faster than rereading from memory.

### What the options are testing

Distractors in this paper follow familiar families. Some use absolute language, some answer a different layer than the one asked about, some skip verification, some grant more authority than the task needs, and some are polished descriptions of an unsafe flow. Naming the family makes elimination quicker.

> **Try it:** Before opening the answer key, write one sentence for each question that begins with the phrase deciding constraint. If you cannot finish that sentence, flag the question.

### Turning a miss into a study note

A miss is useful only if you can name the rule it violated. After scoring, copy each missed question number into a short note with three fields: the constraint you overlooked, the layer the stem was testing, and the reason the chosen distractor felt attractive. Over several attempts those notes reveal habits, such as trusting fluent language or forgetting to check who holds a permission. Keep each note in your own words, because a memorised rule is rarely recalled under pressure. A note that says only read more carefully teaches nothing for the next paper.

> **Common mistake:** Reviewing just the correct option. The distractor notes explain why the wrong choice was tempting, and that is the part that prevents a repeat miss.

### Scoring guide

| Score out of forty | Interpretation | Suggested next step |
| --- | --- | --- |
| 36 to 40 | Strong command of design judgment | Revisit missed rationales and write one counter-example for each |
| 30 to 35 | Solid foundation with a weak layer | Map misses to the topic table and reread that layer |
| 24 to 29 | Mixed recall and application | Rebuild the decision journal and repeat this paper after a gap |
| Below 24 | Foundations need consolidation | Reread the layer chapters before attempting another full paper |

### Topic-to-question map

| Layer or concern | Question numbers | Core judgment tested |
| --- | --- | --- |
| Agentic design | 1 to 7 | Loop control, stop conditions, bounded autonomy |
| Tool design | 8 to 14 | Descriptions, schemas, output bounds, error contracts |
| Workflow design | 15 to 21 | Decomposition, guardrails, handoffs, escalation |
| Prompt design | 22 to 28 | Instruction structure, examples, untrusted text |
| Context design | 29 to 34 | Budgets, compaction, timelines, provenance |
| Cross-layer concerns | 35 to 40 | Reliability, governance, cost, review, verification |

### Answer-sheet template

```text
Practice Paper One — answer sheet

Question:  1  2  3  4  5  6  7  8  9 10
Answer:    _  _  _  _  _  _  _  _  _  _

Question: 11 12 13 14 15 16 17 18 19 20
Answer:    _  _  _  _  _  _  _  _  _  _

Question: 21 22 23 24 25 26 27 28 29 30
Answer:    _  _  _  _  _  _  _  _  _  _

Question: 31 32 33 34 35 36 37 38 39 40
Answer:    _  _  _  _  _  _  _  _  _  _

Flagged for review: ________________________
First-pass score: ______   Second-pass score: ______
```

## Worked scenario

A support assistant can look up account records and issue refunds. A reviewer notices that after a lookup returns a partial record, the assistant sometimes calls the refund tool twice with slightly different amounts before producing an answer. The team lead wants the smallest change that prevents duplicate side effects while keeping the assistant useful for ordinary questions.

**Question.** What should the architect put in place first?

- A. Add a line to the system prompt telling the assistant never to call the refund tool twice.
- B. Move the decision into orchestration code with a single-action limit, an idempotency key, and a human gate for refunds.
- C. Remove the lookup tool so the assistant cannot receive partial records.
- D. Increase the step budget so the assistant has more room to correct itself.

**Reasoning.** The deciding constraint is that a refund is an irreversible side effect, and the observed failure is repeated execution rather than a wording problem. Option B addresses the failure at the layer that owns control: orchestration code can count actions, attach an idempotency key so a retry cannot create a second refund, and require approval before the effect occurs. That is a narrow change that keeps the assistant useful.

**Why the other options fail.** Option A asks a prompt to enforce a policy that needs enforcement in code. Option C removes a useful capability without addressing the underlying control gap. Option D makes the loop more permissive, which would likely increase duplicate calls.

**Resolution.** Choose B. The general lesson is to bind the loop and guard the effect, not to hope that better wording will restrain an autonomous action.

## Common mistakes

- Treating a prompt instruction as if it were an enforced policy.
- Choosing the option that adds capability when the scenario asks for a boundary.
- Ignoring an approval requirement mentioned in passing in the stem.
- Assuming a self-reported confidence score proves correctness.
- Reading the option you expect rather than the option that is written.
- Spending equal time on every question instead of protecting the second pass.

## Chapter summary

- The paper covers all five layers plus cross-layer reliability, governance, and cost concerns.
- The deciding constraint is usually a stated risk, budget, or permission limit.
- Correct answers tend to add a specific, testable boundary at the right layer.
- Distractors often swap layers, skip verification, or over-grant authority.
- Review is where score improves; record the reason for every miss.

## Checkpoint questions

Work through all forty questions before opening the answer key. Each question has one best answer. Role names are used throughout; product names, where they appear, are descriptive identifiers only.

### Section A — Agentic design

**Question 1.** An assistant re-plans after every tool result and never reaches a final answer. The architect concludes the loop needs a stopping rule. Where should that rule live?

- A. In the system prompt as a polite request to finish soon.
- B. In orchestration code as a step budget and termination condition.
- C. In the tool descriptions as a note about response length.
- D. In the model configuration as a higher sampling temperature.

**Question 2.** A workflow agent makes the same search call with identical arguments several times. What is the most likely interpretation?

- A. The loop is productive and gathering more detail each time.
- B. The loop is stuck and should be halted with a diagnostic report.
- C. The tool schema needs more optional parameters.
- D. The context window is too small for the search results.

**Question 3.** An agent may send messages to clients. Which design choice best bounds the risk?

- A. Grant broad access and rely on a final answer check.
- B. Require an approval gate before any outbound message.
- C. Increase the number of planning steps before sending.
- D. Ask the model to describe its confidence before acting.

**Question 4.** A team needs to rename files according to a fixed mapping. What is the better choice?

- A. An autonomous agent with a planning loop.
- B. A deterministic script with checks.
- C. A subagent with its own memory store.
- D. A prompt with several worked examples.

**Question 5.** What does control of the observe, decide, act loop primarily depend on?

- A. The model's willingness to follow instructions.
- B. Orchestration code that calls tools and applies stop rules.
- C. The number of examples in the system prompt.
- D. The length of the conversation history.

**Question 6.** A subagent is spawned to review a long document. What should its brief contain?

- A. The entire main conversation verbatim.
- B. A scoped goal, constraints, and a reference to the artifact.
- C. The credentials of the parent process.
- D. No constraints, so it can explore freely.

**Question 7.** A tool returns a structured failure. How should the loop make use of it?

- A. Ignore it and retry with the same arguments.
- B. Feed it back as a structured result with a clear next action.
- C. Convert it into praise to keep the model confident.
- D. Treat it as a final answer and stop immediately.

### Section B — Tool design

**Question 8.** Two tools have nearly identical descriptions and the model selects the wrong one. What is the first fix?

- A. Add more optional parameters to both tools.
- B. Sharpen the descriptions and state the boundary conditions.
- C. Remove all schemas so the model can choose freely.
- D. Increase the tool call timeout.

**Question 9.** A tool accepts a status field with arbitrary text and calls fail validation. What helps most?

- A. An enumerated set of allowed values and required fields.
- B. A longer prose explanation of the tool's purpose.
- C. A larger context window.
- D. Fewer examples in the documentation.

**Question 10.** One tool bundles searching, editing, and publishing. What is the main problem?

- A. It is too fine-grained to be useful.
- B. It gives one call too much authority and blurs selection.
- C. It cannot be called by a model.
- D. It no longer needs a schema.

**Question 11.** A search tool returns thousands of lines into the conversation. What is the better design?

- A. Return everything so the model has full information.
- B. Return a distilled view with counts and the most relevant items.
- C. Return nothing and ask the model to guess.
- D. Store the result in the prompt as an example.

**Question 12.** A call times out after a side effect may already have happened. What protects against duplication?

- A. An idempotency key tied to the request.
- B. A longer prompt.
- C. A higher temperature.
- D. Removing error logging.

**Question 13.** Which error result is most useful to a model deciding what to do next?

- A. A generic failure message with no detail.
- B. A classified error with a retryable flag and next action.
- C. A stack trace with no summary.
- D. Silence followed by a new conversation.

**Question 14.** A read-only report task uses a tool with administrative scope. What should change?

- A. Keep the scope so future tasks are easier.
- B. Narrow the tool to the minimum scope the task needs.
- C. Add a prompt line promising careful use.
- D. Log the calls and leave permissions unchanged.

### Section C — Workflow design

**Question 15.** A large review task is split into extraction, checking, and drafting. What belongs between steps?

- A. A longer instruction each time.
- B. Explicit validation checks and clear handoff payloads.
- C. A single monolithic prompt.
- D. More parallel workers for dependent steps.

**Question 16.** Which set of subtasks is a good candidate for parallel execution?

- A. Drafting a summary after the source is validated.
- B. Checking several independent documents with no shared state.
- C. Approving a payment after the amount is confirmed.
- D. Any task that uses a model.

**Question 17.** Where should spend limits and allowed-tool lists be enforced?

- A. In the workflow orchestration and tool permissions.
- B. In the closing sentence of the prompt.
- C. In the model's confidence score.
- D. In the answer format.

**Question 18.** A source document changes halfway through a long workflow. What is the right response?

- A. Continue with the original snapshot without comment.
- B. Detect the change, split the workflow, and restart affected steps.
- C. Double the step budget.
- D. Ask the model to remember both versions.

**Question 19.** When is a human approval gate most valuable?

- A. After every read operation.
- B. Immediately before an irreversible or high-impact action.
- C. Only at the end of a long report.
- D. Never, because agents should be autonomous.

**Question 20.** What should a handoff payload include for a worker agent?

- A. Goal, constraints, artifact references, and completion criteria.
- B. Only the last sentence of the conversation.
- C. All credentials held by the orchestrator.
- D. An unstructured request to do something helpful.

**Question 21.** A transient outage causes repeated failures. What is a sound policy?

- A. Retry forever until success.
- B. Bounded retries with backoff, then escalate with a record.
- C. Fail the entire system on the first error.
- D. Hide the failures from the reviewer.

### Section D — Prompt design

**Question 22.** Which list names the five useful parts of an instruction in this book?

- A. Frame, task, constraints, format, examples.
- B. Greeting, body, signature, footnote, appendix.
- C. Model, token, temperature, budget, history.
- D. Input, output, cache, log, retry.

**Question 23.** Where is the most important output requirement least likely to be missed?

- A. Only in the first line of a long document.
- B. In the middle of a paragraph of background.
- C. Restated near the requested output.
- D. In a file that is never loaded.

**Question 24.** What makes a set of few-shot examples more robust?

- A. All examples share the same trivial shape.
- B. Examples cover edge cases and varied phrasing.
- C. Examples are longer than the task description.
- D. Examples include the answer key.

**Question 25.** For a strict output format, what tends to work better than a list of prohibitions?

- A. A positive example of the desired output.
- B. A longer list of things not to do.
- C. Randomised instruction order.
- D. Removing all examples.

**Question 26.** Retrieved pages may contain instructions aimed at the reader. How should the prompt treat them?

- A. As trusted commands with equal weight to the system message.
- B. As data inside clear delimiters, with a rule to ignore embedded commands.
- C. As examples of the desired output format.
- D. As content to be summarised without any delimiter.

**Question 27.** A machine consumer rejects malformed answers. What is the best pairing?

- A. A schema with required fields plus a validation and repair loop.
- B. A prose request plus a confidence score.
- C. A longer context window plus more examples.
- D. A higher sampling temperature plus a retry.

**Question 28.** What is a sign of over-specification?

- A. Instructions are short and testable.
- B. The prompt contains many rigid rules that break on new inputs.
- C. Examples cover more than one case.
- D. The output format is declared explicitly.

### Section E — Context design

**Question 29.** What shares the single context budget?

- A. Instructions, history, documents, tool output, and planned output.
- B. Only the user's latest message.
- C. Only the model's weights.
- D. Only stored files on disk.

**Question 30.** What does a middle-saving compaction strategy do?

- A. Deletes the beginning and the end of the history.
- B. Keeps early and late material while compressing the middle.
- C. Removes all tool results permanently.
- D. Doubles the size of every message.

**Question 31.** Early decisions in a long session have disappeared from view. What is the best recovery?

- A. Continue and hope later steps are unaffected.
- B. Restart with a distilled brief that carries decisions and constraints.
- C. Add more raw documents to the same thread.
- D. Lower the importance of the original goal.

**Question 32.** Large tool results keep crowding out instructions. What should the loop do first?

- A. Summarise or filter results before they re-enter the loop.
- B. Remove the system message.
- C. Request even larger results.
- D. Stop using structured schemas.

**Question 33.** Two unrelated tasks share one conversation. What risk increases most?

- A. Cross-task contamination of decisions and facts.
- B. Faster response times.
- C. Smaller answer sets.
- D. Stronger schema validation.

**Question 34.** Why record a source for every retrieved fact?

- A. To make answers longer.
- B. To detect conflicts and trace claims back to their origin.
- C. To remove the need for human review.
- D. To increase sampling randomness.

### Section F — Cross-layer judgment

**Question 35.** A step fails quietly and the next step uses a stale value. What is the primary fix?

- A. Longer prompts at each step.
- B. Visible failure handling with validation between steps.
- C. More parallel workers.
- D. A higher confidence threshold in the answer.

**Question 36.** Which governance question belongs in a tool catalog review?

- A. Whether the tool name is short.
- B. Who may expose the tool, who may call it, and with what scope.
- C. Whether the model likes the description.
- D. Whether the answer sounds confident.

**Question 37.** A batch of independent classifications must be processed. What is the strongest reason to batch them?

- A. It isolates context per item and reduces repeated overhead.
- B. It makes each answer longer.
- C. It removes the need for validation.
- D. It guarantees identical wording.

**Question 38.** An assistant can publish a draft to a public site. What review depth fits the risk?

- A. No review, because the draft was generated by a model.
- B. A lightweight spelling check only.
- C. A human gate that verifies content and permissions before publishing.
- D. A review after publication.

**Question 39.** A model labels its own answer highly confident, but the source was never checked. What should a reviewer do?

- A. Accept the label as evidence.
- B. Treat the label as a claim and verify against the source.
- C. Increase the label threshold.
- D. Remove the source document.

**Question 40.** Errors are expensive in a legal drafting flow. What quality approach is most defensible?

- A. A single fast pass with no checks.
- B. Two independent passes with a critique and revision step.
- C. Removing all constraints from the prompt.
- D. Trusting the first answer whenever it is fluent.

### Answers and rationale

**Question 1 — B.** Orchestration code owns the loop, so termination belongs there. **A** is wrong because a polite request is not enforced. **C** misplaces control in tool text. **D** changes sampling, which affects variety, not stopping.

**Question 2 — B.** Repeated identical calls signal a stuck loop; halt and report. **A** mistakes repetition for progress. **C** changes schema unnecessarily. **D** confuses result size with loop behaviour.

**Question 3 — B.** Approval before an outbound message bounds the highest-risk effect. **A** grants broad authority prematurely. **C** adds planning without control. **D** confuses confidence with permission.

**Question 4 — B.** A deterministic script is cheaper and verifiable for a fixed mapping. **A** adds needless autonomy. **C** isolates context without benefit. **D** does not guarantee correctness.

**Question 5 — B.** Control lives in orchestration code that calls tools and applies stop rules. **A** relies on compliance. **C** affects instruction following, not control. **D** is data, not control.

**Question 6 — B.** A scoped brief with artifact references keeps the worker focused and isolated. **A** floods the worker. **C** leaks authority. **D** removes the boundaries the worker needs.

**Question 7 — B.** A structured failure with a next action lets the loop recover deliberately. **A** wastes calls. **C** distorts feedback. **D** abandons a recoverable task.

**Question 8 — B.** Overlapping descriptions confuse routing; state boundaries explicitly. **A** adds fields without clarifying choice. **C** removes useful structure. **D** changes transport timing, not selection.

**Question 9 — A.** Enums and required fields make invalid calls impossible to express. **B** adds prose without enforcement. **C** changes capacity, not validity. **D** would reduce useful guidance.

**Question 10 — B.** Bundling unrelated actions gives one call too much authority and blurs routing. **A** reverses the actual problem. **C** is false. **D** is still needed for every tool.

**Question 11 — B.** A distilled view preserves signal while protecting the budget. **A** floods context. **C** deprives the model of evidence. **D** confuses storage with delivery.

**Question 12 — A.** An idempotency key makes a repeated request safe after a timeout. **B** changes nothing about duplication. **C** affects variety. **D** removes diagnostic evidence.

**Question 13 — B.** A classified error with a retry flag and next action supports recovery. **A** gives no guidance. **C** is hard to act on. **D** abandons the loop.

**Question 14 — B.** Least privilege narrows the tool to what the report needs. **A** accumulates unnecessary risk. **C** relies on a promise, not enforcement. **D** logs without preventing misuse.

**Question 15 — B.** Checks and explicit payloads make each handoff verifiable. **A** adds words, not control. **C** defeats decomposition. **D** runs dependent work prematurely.

**Question 16 — B.** Independent documents with no shared state can safely run in parallel. **A** depends on validation. **C** depends on approval. **D** is not a criterion for parallelism.

**Question 17 — A.** Orchestration and permissions enforce limits; prompts merely request them. **B** cannot be relied on. **C** is a signal, not a control. **D** describes presentation.

**Question 18 — B.** Detecting the change and restarting affected steps keeps results consistent. **A** uses stale input. **C** adds capacity without correctness. **D** burdens the model.

**Question 19 — B.** A gate before an irreversible action prevents the costly outcome. **A** adds friction without risk reduction. **C** is too late. **D** ignores the need for oversight.

**Question 20 — A.** Goal, constraints, artifacts, and completion criteria make a handoff actionable. **B** loses context. **C** leaks credentials. **D** invites misinterpretation.

**Question 21 — B.** Bounded retries with backoff and escalation handle outages without infinite loops. **A** never terminates. **C** is brittle. **D** hides evidence from reviewers.

**Question 22 — A.** Frame, task, constraints, format, and examples are the five parts used here. **B** describes a letter. **C** lists model settings. **D** lists infrastructure concerns.

**Question 23 — C.** Restating the requirement near the output keeps it salient at generation time. **A** may be forgotten. **B** buries it. **D** never reaches the model.

**Question 24 — B.** Varied cases and edge conditions teach the boundary of the task. **A** teaches one narrow shape. **C** wastes budget. **D** leaks evaluation material.

**Question 25 — A.** A positive example shows the target directly. **B** emphasises failures instead of success. **C** reduces consistency. **D** removes useful guidance.

**Question 26 — B.** Delimiters plus an ignore-embedded-commands rule keep retrieved text as data. **A** invites injection. **C** confuses data with examples. **D** leaves the boundary unclear.

**Question 27 — A.** A schema plus validation and repair turns format into a testable contract. **B** adds subjective evidence. **C** adds capacity, not enforcement. **D** increases variance.

**Question 28 — B.** Rigid rules that break on new inputs signal over-specification. **A** is a healthy property. **C** is good practice. **D** is normal for machine output.

**Question 29 — A.** All those elements draw from one shared budget. **B** ignores history and documents. **C** is fixed storage. **D** is external, not in-context.

**Question 30 — B.** Keeping the ends and compressing the middle preserves goals and recent state. **A** discards what matters most. **C** loses evidence. **D** worsens the problem.

**Question 31 — B.** A distilled brief carries decisions forward without stale clutter. **A** compounds loss. **C** adds noise. **D** weakens the objective.

**Question 32 — A.** Filtering before re-entry protects the budget and keeps instructions visible. **B** removes guidance. **C** increases bloat. **D** is unrelated to result size.

**Question 33 — A.** Mixed timelines allow facts and decisions to leak between tasks. **B** is a performance claim. **C** is not a known effect. **D** is unaffected.

**Question 34 — B.** Provenance enables conflict detection and traceability. **A** is cosmetic. **C** would remove needed oversight. **D** is a sampling setting.

**Question 35 — B.** Visible failures and step validation stop stale values propagating. **A** adds prose without detection. **C** raises throughput, not correctness. **D** is self-reported.

**Question 36 — B.** Exposure rights, call rights, and scope are the governance core. **A** is cosmetic. **C** is subjective. **D** is an answer property.

**Question 37 — A.** Batching isolates each item's context and amortises overhead. **B** is irrelevant. **C** still requires validation. **D** is not guaranteed.

**Question 38 — C.** A pre-publication human gate matches the visibility and permanence of the action. **A** ignores risk. **B** misses factual and permission checks. **D** is reactive.

**Question 39 — B.** Self-reported confidence is a claim; verify against the source. **A** trusts unverified evidence. **C** changes a number, not validity. **D** destroys evidence.

**Question 40 — B.** Independent critique and revision catch errors a single fluent pass misses. **A** is risky. **C** removes guidance. **D** equates fluency with correctness.

---
*End of chapter 27.*
