# Chapter 28 — Practice Paper Two

## Learning objectives

- Apply design judgment to scenarios with several interacting agents and governed tool connections.
- Trace a case study from a business constraint to a specific architectural decision.
- Detect coordination failures such as duplicate work, conflicting conclusions, and runaway spawning.
- Evaluate a tool-connection architecture against scope, versioning, and least privilege.
- Choose review depth and escalation paths that match the consequence of an error.
- Compare this paper's emphasis with the previous paper and direct revision accordingly.

## Key concepts

This paper keeps the format of the previous one but shifts the weight. More stems involve multiple agents, more involve a shared tool-connection layer, and more are extended case studies. All wording is original to this book. Use the same two-pass routine and the same habit of naming the deciding constraint before reading the options.

### How this paper differs

Paper One spread questions evenly across the five layers. Here, coordination and governance carry more weight because they are the places where an otherwise sound design often fails in practice. A question may describe a perfectly reasonable model and prompt, then ask what happens when two workers disagree or when a tool definition changes without notice. The right answer is usually a mechanism, not a better sentence.

> **Exam note:** When a stem names a protocol or a shared registry, the answer is often about who is allowed to do what, not about how the model reasons.

### Handling longer stems

Read the final sentence first to find what is actually being asked. Then scan the scenario for the constraint that decides it: a regulatory duty, a confidentiality label, a per-call cost, an irreversible effect, or a stated limit on authority. Attractive background detail is often decoration. If two sources disagree, the deciding constraint is usually traceability, not writing quality.

> **Case-study cue:** Treat every number, label, and deadline in a scenario as a candidate constraint. Cross out the ones that do not change the decision.

### Recording a case-study decision

For each case study, keep a small extraction note beside your answer sheet. Write the asked decision in one line, the constraint that controls it in a second line, and the layer that owns the fix in a third. This habit is especially useful when a stem describes both a technical problem and a business rule, because the two can point toward different answers. Choose the one the question actually asks about. A note also makes review faster: you can see at a glance whether a wrong answer came from misreading the question or from forgetting a principle. Do not skip the note just because a stem feels easy; the longest scenarios are often the ones where a single overlooked word redirects the whole decision.

> **Try it:** On the extended stems in this paper, underline the sentence that would change your answer if it were removed. That sentence is usually the deciding constraint.

### Emphasis of the two papers

| Dimension | Paper One | Paper Two |
| --- | --- | --- |
| Layer balance | Even coverage of all five layers | Heavier on agentic and tool layers |
| Scenario length | Mostly short, single-situation stems | Many extended case-study stems |
| Coordination questions | A few isolated subagent items | Dedicated section on multi-agent failure modes |
| Tool-connection questions | General tool design and error contracts | Protocol roles, governance, and versioning |
| Recurring judgment | Add a boundary at the correct layer | Match mechanism to consequence and scope |
| Best use | Broad diagnostic check | Depth check after the first revision cycle |

### Scoring guide

| Score out of forty | Interpretation | Suggested next step |
| --- | --- | --- |
| 36 to 40 | Confident across coordination and governance | Practise explaining each correct choice without notes |
| 30 to 35 | Good grasp with one weak cluster | Revisit the cluster in the emphasis table above |
| 24 to 29 | Case studies are hiding basic gaps | Rebuild the extraction worksheet before another attempt |
| Below 24 | Return to foundations first | Reread the layer chapters, then repeat Paper One |

### Answer-sheet template

```text
Practice Paper Two — answer sheet

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

A review workflow uses one orchestrator and three workers. Each worker can call a shared document service through a tool connection. The orchestrator notices that two workers return near-identical findings, a third reports a conclusion that contradicts them, and a fourth-level subagent appears even though no one authorised one. A platform engineer needs the smallest set of controls that restores reliable coordination without removing the parallel work.

**Question.** What should the architect introduce first?

- A. Give every worker the same broad credentials so results can be compared quickly.
- B. Add a shared task ledger, a defined conflict rule, and a cap on spawning depth.
- C. Ask the orchestrator to write a longer instruction encouraging teamwork.
- D. Replace all workers with a single long conversation.

**Reasoning.** The deciding constraint is that three distinct coordination failures are visible at once: duplicate work, conflicting decisions, and runaway spawning. Option B answers each with a small, testable mechanism. A ledger lets workers claim separate tasks, a conflict rule decides how disagreements surface or escalate, and a spawn cap bounds depth. Parallel work is preserved, which matters because the investigation genuinely benefits from separate contexts. Notice also that none of these controls depends on the workers understanding them perfectly; each one holds even when a worker misreads its instructions.

**Why the other options fail.** Option A makes authority broader at exactly the moment it should be narrowed. Option C relies on tone where a rule is required. Option D removes a useful capability and still leaves no guarantee that conflicts would be handled well.

**Resolution.** Choose B. When a case study lists several symptoms, look for the option that maps one control to each symptom instead of attacking only the most visible one.

## Common mistakes

- Assuming that more agents automatically produce better coverage.
- Treating access to a tool connection as permission to use every operation it exposes.
- Skipping the final sentence of a long stem and answering the background instead.
- Allowing workers to inherit credentials that are far broader than their tasks.
- Rewarding a fluent case-study answer without checking where its facts came from.
- Restarting a paused thread without inspecting its state and pending approvals.

## Chapter summary

- This paper emphasises coordination, tool governance, and case-study judgment.
- Long stems should be read from the question backwards to the constraint.
- Multi-agent failures usually need ledgers, conflict rules, and spawn caps.
- Protocol connections require decisions about exposure, call rights, and versioning.
- Review depth should follow the consequence and reversibility of the action.

## Checkpoint questions

Work through all forty questions before opening the answer key. Each has one best answer. Some stems are deliberately longer than those in the previous paper; role names are used throughout, and product names are descriptive identifiers only.

### Section A — Multi-agent systems

**Question 1.** A review task is split across four agents, but two produce near-identical findings. What mechanism best addresses this?

- A. Increase the number of agents.
- B. Maintain a shared task ledger so each agent claims distinct work.
- C. Remove all tool access from the agents.
- D. Ask each agent to repeat its answer more clearly.

**Question 2.** Which condition most justifies adding agents to a workflow?

- A. The task has independent investigations that benefit from parallel context.
- B. Every task is faster with more agents.
- C. The system prompt is short.
- D. The model has a large context window.

**Question 3.** An agent keeps spawning subagents without completing work. What is the first safeguard?

- A. A cap on spawn depth and count with a completion requirement.
- B. A longer system prompt about teamwork.
- C. More tool permissions for the parent.
- D. Removing the step budget.

**Question 4.** Two workers return conflicting conclusions. What is a sound resolution path?

- A. Choose the more confident one.
- B. Apply a defined tie-break rule or escalate with both results.
- C. Delete both and start over.
- D. Let the workers negotiate without any rule.

**Question 5.** What belongs in a subagent brief?

- A. The full parent history and all credentials.
- B. A scoped goal, constraints, allowed tools, and done criteria.
- C. Nothing, to encourage creativity.
- D. Only the final answer expected.

**Question 6.** What does isolating a subagent's context primarily protect?

- A. The parent thread from noise and unrelated facts.
- B. The model's weights from being updated.
- C. The tool server from being called at all.
- D. The answer from having any format.

**Question 7.** A worker inherits administrative credentials from its orchestrator. What is the main issue?

- A. It will be too slow.
- B. Authority is broader than the task requires.
- C. It cannot read documents.
- D. It must produce a longer answer.

**Question 8.** In an orchestrator and worker pattern, what should the orchestrator retain?

- A. All document text at every step.
- B. Goals, task assignment, and final synthesis.
- C. Every worker's raw scratch output.
- D. The credentials of every worker.

### Section B — Tool connections and governance

**Question 9.** Which pairing matches the core primitives of a tool-connection protocol?

- A. Tools for actions, resources for data, prompts for reusable instruction templates.
- B. Tools for storage, resources for billing, prompts for logs.
- C. Tools for users, resources for models, prompts for tokens.
- D. Tools for caching, resources for sampling, prompts for parsing.

**Question 10.** When is a remote tool connection most useful?

- A. When several clients need shared, governed access to a capability.
- B. When a single script runs once locally.
- C. When no schema is needed.
- D. When the tool has no side effects.

**Question 11.** What is a server's responsibility in a tool-connection setup?

- A. Expose typed definitions, enforce scope, and return actionable errors.
- B. Write the client's system prompt.
- C. Decide the model's sampling temperature.
- D. Hide all failures from callers.

**Question 12.** What is a client's responsibility?

- A. Discover tools, request permission, and filter results before they flood context.
- B. Store all credentials inside the prompt.
- C. Ignore tool schemas.
- D. Publish new tools to every user.

**Question 13.** Which question is a governance question for a tool registry?

- A. Who may expose a tool and who may call it with what scope.
- B. Which font the documentation uses.
- C. How long the answer should be.
- D. Whether the model is fluent.

**Question 14.** A tool schema changes incompatibly. What should change control require?

- A. Silent replacement of the old definition.
- B. A version bump, notice, and updated consumers.
- C. Removal of all validation.
- D. A longer prompt.

**Question 15.** When is a direct integration simpler than a protocol connection?

- A. When one consumer uses one stable capability and governance needs are minimal.
- B. When many teams need discovery and shared policy.
- C. When tools change frequently across clients.
- D. When access must be audited centrally.

**Question 16.** What does least privilege mean for a tool connection?

- A. Every caller receives full access for convenience.
- B. Each caller receives only the operations and data scope its task needs.
- C. Access is decided by answer length.
- D. Permissions are never reviewed.

### Section C — Case-study practice

**Question 17.** A compliance team wants an assistant to summarise confidential agreements. Documents carry different access labels, and auditors require a record of which source supported each statement. What should the architecture prioritise?

- A. A single shared context containing all documents.
- B. Scoped retrieval by access label plus provenance for every claim.
- C. A longer system prompt describing confidentiality.
- D. Removing human review to speed up the work.

**Question 18.** Two retrieved sources disagree on a figure in a capital report. What is the best next step?

- A. Average the two figures.
- B. Record both sources, flag the conflict, and route it for authoritative resolution.
- C. Choose the source that appears first.
- D. Ask the model to guess which is true.

**Question 19.** A stress-testing assistant may call a pricing service that charges per call. Runs sometimes continue long after results stop improving. What should be added first?

- A. A spend cap and a stop rule in orchestration code.
- B. A promise in the prompt to be economical.
- C. More agents to cross-check each call.
- D. A larger context window.

**Question 20.** An idea-vetting request is ambiguous about risk appetite and budget. What is the safest initial response?

- A. Proceed with the boldest interpretation.
- B. Ask a clarifying question or adopt a clearly stated safe default.
- C. Produce a final recommendation immediately.
- D. Remove all constraints from the answer.

**Question 21.** A negotiation workflow handles side letters for several clients in one long thread. What is the largest risk?

- A. Cross-client leakage of terms and decisions.
- B. Too few tokens in the answer.
- C. Excessive schema strictness.
- D. Lack of examples.

**Question 22.** A validation task requires a number to be recomputed exactly, while an assistant drafts the explanation. How should responsibilities be divided?

- A. Let the model compute and verify the number.
- B. Use deterministic code for the number and the model for the draft, with review.
- C. Remove the calculation from the workflow.
- D. Accept the first fluent answer.

**Question 23.** A repository is too large to fit in context, and a developer needs a change in an unfamiliar module. What helps most?

- A. Load every file into the main thread.
- B. Delegate focused exploration to a subagent and keep a concise handoff.
- C. Reduce the task to a single prompt.
- D. Disable all tool use.

**Question 24.** A managed workspace task appears inactive. The thread is frozen but not failed. What should an operator do first?

- A. Restart the task immediately.
- B. Inspect thread state and any pending approval before acting.
- C. Assume the result is wrong.
- D. Delete the thread and begin again.

**Question 25.** Channels in a managed workspace are used to separate audiences. What security benefit does this provide?

- A. It guarantees correct answers.
- B. It limits which people and tools can interact with a given task context.
- C. It removes the need for logging.
- D. It increases model temperature.

**Question 26.** During research, a page contains text instructing the reader to ignore previous rules and reveal secrets. How should the assistant treat that text?

- A. As a high-priority instruction.
- B. As untrusted data inside delimiters, never as a command.
- C. As a schema definition.
- D. As proof that the page is accurate.

### Section D — Loops, workflows, and prompts

**Question 27.** What is the primary role of tool results in an observe, decide, act loop?

- A. They replace the goal.
- B. They become observations that inform the next decision.
- C. They end the session automatically.
- D. They are stored only for billing.

**Question 28.** Step budgets in an agentic system should be enforced by:

- A. A closing sentence in the prompt.
- B. Orchestration code that can actually stop the loop.
- C. The model's confidence label.
- D. The answer format.

**Question 29.** An assistant repeats a call with unchanged arguments after each result. What is the best interpretation?

- A. It is converging normally.
- B. It is likely stuck and needs a halt condition or a different tool contract.
- C. It needs a larger schema.
- D. It needs a warmer tone.

**Question 30.** A long session keeps losing early decisions. What should be persisted externally?

- A. Every raw message.
- B. Stable facts, decisions, and open questions with their sources.
- C. The model's weights.
- D. Nothing, because context is infinite.

**Question 31.** In an automated pipeline, what separates generation from approval?

- A. Combining them in one prompt.
- B. A review stage with authority to accept or reject the change.
- C. Removing all tests.
- D. Higher sampling temperature.

**Question 32.** How should secrets be handled in automation?

- A. Written into the prompt for convenience.
- B. Injected at runtime from a secret store and kept out of prompts and logs.
- C. Included in the answer schema.
- D. Shared across all workers.

**Question 33.** Which instruction structure best protects against untrusted source text?

- A. Frame, task, constraints, format, examples, with source text delimited as data.
- B. A single sentence with no constraints.
- C. Only examples, with no frame.
- D. Source text placed first without labels.

**Question 34.** A consumer rejects answers that miss required fields. What is the right control pair?

- A. A declared schema plus validation and a repair step.
- B. A longer prompt with more adjectives.
- C. Fewer fields and no validation.
- D. Random sampling until one answer looks right.

**Question 35.** Which situation best justifies a second independent review pass?

- A. A low-stakes label with trivial errors.
- B. A high-stakes draft where missed errors are expensive.
- C. Any task, without exception.
- D. Only when the first pass is slow.

**Question 36.** Why batch independent items in a prompt workflow?

- A. To isolate each item's context and reduce repeated setup cost.
- B. To make the answer less structured.
- C. To remove the need for validation.
- D. To guarantee agreement between items.

### Section E — Context and assurance

**Question 37.** Which items consume the context budget during a long run?

- A. Instructions, history, retrieved documents, tool output, and reserved output space.
- B. Only the final answer.
- C. Only the system message.
- D. Only cached model weights.

**Question 38.** A thread has grown large and early goals are fading. What compression approach preserves the most decision-relevant material?

- A. Keep the opening goals and recent state, compress the middle.
- B. Delete the first and last quarters.
- C. Keep only the longest messages.
- D. Replace everything with a greeting.

**Question 39.** What should a provenance record include?

- A. Source identity, scope or access label, and when the fact was retrieved.
- B. Only the final answer text.
- C. The model's confidence score alone.
- D. Nothing, because provenance is unnecessary.

**Question 40.** What determines how deep human review should be?

- A. The length of the answer.
- B. The consequence of a wrong action and how reversible it is.
- C. The number of examples in the prompt.
- D. The tool server's location.

### Answers and rationale

**Question 1 — B.** A shared ledger assigns ownership so findings stop overlapping. **A** adds more agents without addressing duplication. **C** removes useful capability. **D** changes phrasing, not task allocation.

**Question 2 — A.** Parallel contexts help when investigations are genuinely independent. **B** is an absolute claim that ignores coordination cost. **C** and **D** describe prompt size and model capacity, not a reason to add agents.

**Question 3 — A.** A spawn cap plus a completion rule bounds runaway delegation. **B** relies on tone. **C** increases authority at the wrong moment. **D** removes a safety limit.

**Question 4 — B.** A defined tie-break or escalation keeps the disagreement visible and resolvable. **A** confuses confidence with correctness. **C** discards valid work. **D** leaves the conflict unresolved.

**Question 5 — B.** Scope, constraints, allowed tools, and done criteria make a brief actionable. **A** leaks history and authority. **C** removes guidance. **D** gives no working context.

**Question 6 — A.** Isolation keeps the main thread clean and prevents unrelated facts spreading. **B** confuses context with weights. **C** misstates the purpose of isolation. **D** is unrelated to output format.

**Question 7 — B.** Administrative credentials exceed what a scoped worker needs. **A** is a performance claim. **C** is false. **D** addresses length, not authority.

**Question 8 — B.** The orchestrator should hold goals, assignments, and synthesis. **A** and **C** flood it with raw material. **D** concentrates credentials unnecessarily.

**Question 9 — A.** Actions, data, and reusable instruction templates are the three primitive kinds. **B**, **C**, and **D** assign unrelated business or runtime functions to the primitives.

**Question 10 — A.** Shared, governed access is the reason to place a connection remotely. **B** favours a local integration. **C** and **D** do not determine transport choice.

**Question 11 — A.** The server exposes typed definitions, enforces scope, and returns usable errors. **B** and **C** belong to the client and configuration. **D** would hide failures from callers.

**Question 12 — A.** Clients discover, seek permission, and bound returned data. **B** is a credential leak. **C** ignores the contract. **D** is a publishing decision, not a client duty.

**Question 13 — A.** Exposure rights, call rights, and scope are the governance core. **B** is cosmetic. **C** concerns presentation. **D** is a subjective impression.

**Question 14 — B.** A version bump, notice, and consumer update make a breaking change manageable. **A** creates silent breakage. **C** removes a safeguard. **D** cannot fix an incompatible contract.

**Question 15 — A.** One stable consumer with minimal governance does not need protocol overhead. **B**, **C**, and **D** all describe conditions that favour a shared connection.

**Question 16 — B.** Least privilege grants only the operations and scope the task needs. **A** is the opposite. **C** uses an irrelevant criterion. **D** removes ongoing accountability.

**Question 17 — B.** Access-scoped retrieval plus provenance satisfies both confidentiality and audit needs. **A** exposes everything. **C** relies on prose, not enforcement. **D** removes a required safeguard.

**Question 18 — B.** Recording both sources and flagging the conflict preserves evidence for resolution. **A** invents a number. **C** is arbitrary. **D** replaces evidence with guessing.

**Question 19 — A.** A spend cap and stop rule act in the layer that controls calls. **B** is a request, not a control. **C** increases cost. **D** changes capacity, not stopping.

**Question 20 — B.** Clarification or a stated safe default handles ambiguity without guessing. **A** takes an unauthorised risk. **C** hides the ambiguity. **D** removes useful constraints.

**Question 21 — A.** A shared long thread lets terms and decisions leak across clients. **B** is cosmetic. **C** and **D** would not cause client-to-client disclosure.

**Question 22 — B.** Deterministic code owns exact arithmetic; the model drafts, and review checks the result. **A** misuses the model as a calculator. **C** drops a requirement. **D** skips verification.

**Question 23 — B.** A focused subagent explores the module while the main thread stays clean. **A** overflows context. **C** lacks the needed detail. **D** removes the means to inspect code.

**Question 24 — B.** A frozen thread may be waiting for approval; inspect state first. **A** may duplicate work. **C** assumes failure without evidence. **D** destroys useful progress.

**Question 25 — B.** Channel separation limits which audiences and tools reach a context. **A** is a quality claim. **C** removes needed logging. **D** is a sampling setting.

**Question 26 — B.** Embedded directives in source text are untrusted data, never commands. **A** invites injection. **C** mistakes text for a contract. **D** mistakes presence for accuracy.

**Question 27 — B.** Tool results are observations that feed the next decision. **A** replaces the goal incorrectly. **C** is automatic only if a stop rule says so. **D** reduces them to billing data.

**Question 28 — B.** Only orchestration code can reliably halt a loop. **A** is a request. **C** is a signal. **D** describes presentation, not enforcement.

**Question 29 — B.** Unchanged arguments suggest a stuck loop or an unclear tool contract. **A** mistakes repetition for progress. **C** changes structure unnecessarily. **D** changes tone, not behaviour.

**Question 30 — B.** Persist stable facts, decisions, open questions, and their sources. **A** stores noise. **C** is not session state. **D** ignores a hard budget.

**Question 31 — B.** A review stage with real authority separates drafting from acceptance. **A** merges them. **C** removes checks. **D** increases randomness without adding control.

**Question 32 — B.** Runtime injection from a secret store keeps credentials out of prompts and logs. **A** leaks them. **C** exposes them to consumers. **D** widens access.

**Question 33 — A.** A full frame with delimited source data keeps roles distinct. **B**, **C**, and **D** each remove structure or put untrusted text in a privileged position.

**Question 34 — A.** A declared schema plus validation and repair gives format a testable contract. **B** adds fluff. **C** removes enforcement. **D** relies on chance.

**Question 35 — B.** Expensive misses justify the cost of a second pass. **A** does not. **C** is an absolute rule. **D** uses speed, not risk, as the criterion.

**Question 36 — A.** Batching isolates context and amortises setup for independent items. **B** is not a goal. **C** still requires validation. **D** is not guaranteed.

**Question 37 — A.** All of those elements draw on one shared budget. **B**, **C**, and **D** each ignore major consumers or confuse context with storage.

**Question 38 — A.** Keeping opening goals and recent state preserves direction and current decisions. **B** discards both. **C** uses length as a proxy for value. **D** destroys the thread.

**Question 39 — A.** Source identity, access scope, and retrieval time make a claim traceable. **B** and **C** omit the evidence needed to audit. **D** ignores an audit requirement.

**Question 40 — B.** Consequence and reversibility set the right review depth. **A**, **C**, and **D** use incidental properties that do not reflect risk.

---
*End of chapter 28.*
