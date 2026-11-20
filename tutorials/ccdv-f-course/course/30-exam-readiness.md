# Chapter 30 — Key Distinctions, Exam Simulators, and Quick Reference

This closing chapter is a way of sorting the topics you already know. Most difficult CCDV-F questions are built from a few confusions: the candidate recognizes every word in the stem but reaches for the wrong layer of the platform. Here you get three sorting grids, a routine for reading a stem, two short simulators, and a sheet worth rereading before the exam.

## Learning objectives

- Separate questions about the request contract from questions about orchestration and output handling.
- Distinguish an agent, a tool call, and a context decision when one scenario mixes all three.
- Tell model, cost, tooling, and security questions apart by the constraint each one actually tests.
- Apply a six-step reading routine to any scenario before you weigh the options.
- Rehearse with two short simulators and review every option, not only the keyed answer.
- Use the quick-reference sheet and final checklist to close the last gaps in your review.

## Key concepts

### Why distinctions decide the answer

Recall alone rarely settles a scenario question. A story about a failing database write is testing whether output contracts are enforced by your code, not by polite wording. A story about rising spend is testing which cost lever matches the traffic described. In each case, the correct option acts on the layer named by the constraint.

Treat every question as a story built around one distinction. Name that distinction before weighing the choices, or you will pick an option from the wrong layer.

### Distinction set one: API, integration, and output

This set covers what crosses the boundary between your application and the model service, and what your application does with the result. Ask who owns the behavior.

| Stem emphasizes | Layer being tested | Correct instinct | Common wrong turn |
| --- | --- | --- | --- |
| Role placement, message order, content blocks | Request contract | Durable rules in the system turn, current ask in the user turn | Moving instructions into a tool description |
| History that survives the next screen | Application state | Keep it in your service and resend the needed turns | Assuming the model remembers earlier calls |
| JSON that must parse on the first try | Output contract | Define a schema, validate, retry with the validation error | Asking more clearly in the prompt and hoping |
| Words appearing while the answer grows | Delivery | Consume events, wait for completion, handle a mid-stream break | Rendering the first chunk as the final answer |
| Thousands of items, nobody waiting | Batch path | Send a message batch and accept delayed completion | Forcing each job through a realtime stream |
| The same long preamble on every call | Integration economics | Put stable content at a cache breakpoint and measure cache reads | Changing models to solve repeated input |

Three details carry the weight. A model call is independent: nothing persists unless your code stores and resends it. Structured output is a contract backed by validation, not a stylistic preference. A stream that breaks partway has produced a draft, not a finished answer.

> **Exam note:** A stream ordering question tests the client's state machine. A schema question tests the shape of the result. They may share a story, but only one is the hidden test.

> **Common mistake:** Answering a cost question with a model change when the stem says the input prefix is identical on every request. Identical prefixes point to caching.

### Distinction set two: agents, tools, and context

An agent is a control shape, a tool call is one request-and-result exchange inside that shape, and context is the material you place in front of the model at each step. They are not interchangeable answers.

| Symptom in the scenario | Mechanism that owns it | Why this one |
| --- | --- | --- |
| Next step depends on an earlier finding | Agent loop | The path is chosen at runtime, not declared up front |
| Steps are known, repeatable, auditable | Workflow | Determinism is cheaper and easier to review than adaptation |
| Model needs a value it cannot know | Tool call | The model requests the action; your runtime executes it |
| A destructive call must never reach the system | Hook or permission rule | The guarantee has to live outside the model |
| Parallel research floods the thread with logs | Subagent with isolated context | The main thread receives a summary, not the noise |
| Several hosts need the same capability | Connector server | One deployment can be reused across clients |

Notice the direction of authority in a tool round. The model emits a description of the action it wants. Your code decides whether that action is allowed, performs it, and returns a result. A tool description is not a security boundary. When a stem asks who can stop a bad action, the answer is a deterministic check in the runtime.

Context decisions are about economy and focus. If a worker's notes pollute the main conversation, more reasoning effort will not remove the noise; an isolated thread will. If a loop has no stopping condition, more tools will not end it; a step budget and exit criteria will.

> **Recall cue:** Agent equals who chooses the next step. Tool equals who performs it. Context equals what the model can see while choosing.

### Distinction set three: models, cost, tooling, and security

This set is the widest, so sort by constraint word rather than by topic name. The noun in the story may mislead; the obligation in the question is what counts.

| Constraint in the stem | Domain | First move |
| --- | --- | --- |
| Same behavior next month, same prompt | Model management | Pin a version and rerun the eval set before upgrading |
| Cannot exceed a stated budget | Cost | Count input and output tokens, then price cache reads separately |
| A long preamble repeats on every call | Caching | Add a breakpoint on the stable prefix |
| Non-urgent work over thousands of items | Batch processing | Move the work off the realtime path |
| Runs on every developer's machine | Configuration and tooling | Check scope, shared instruction files, plugin dependencies |
| Customer identifiers must never leave | Security | Redact before the request and restrict tool retrieval |
| Retrieved text may contain instructions | Security | Treat it as data and keep it away from decision authority |

Model questions trade quality, latency, and spend. Sending simple cases to a smaller tier with escalation is justified only when an eval set shows those cases stay correct. Version pinning matters because an unpinned deployment can change behavior without code review.

Cost questions reward arithmetic over intuition. Output tokens generally cost more than input tokens, cache reads are priced differently again, and batch work is discounted in exchange for delay. A token budget or spend alert is a control, not an explanation; name the lever first, then add the control.

Security questions are about trust boundaries. Prompt injection can arrive through retrieved documents or tool results. Secrets belong in a secret store, never in prompts or logs. Authentication answers who is calling; authorization answers what that caller may do.

> **Common mistake:** Treating a jailbreak-style line in a fetched document as an instruction with higher priority than your system message. It is untrusted content; the answer is isolation and enforced permissions.

### A repeatable decision routine for reading a question

Use the same routine on every scenario, including the ones you feel sure about. Consistency prevents easy questions from teaching habits that fail on hard ones.

```text
1. Name the layer: request, output, delivery, orchestration, model, cost, config, or safety.
2. Circle the hard constraint: must, never, least, first, without, across, before.
3. Identify the owner: your code, the platform, the model, or the operator.
4. Cross out options that solve a different layer.
5. Keep the smallest mechanism that satisfies every constraint.
6. State the reason in one sentence; if you cannot, reread the stem.
```

Step five is where many candidates lose marks. A larger model or a longer prompt can change an outcome, but the keyed answer is usually the narrowest change that fits. If a workflow must stay deterministic, an autonomous agent is too much; if the answer must be machine-readable, better wording is too little.

> **Exam note:** When two options look plausible, ask which one still works if the model behaves unpredictably. Guarantees enforced in code beat guarantees that depend on model compliance.

## Exam simulator A — Requests, integration, and output

Work these five without notes; cover the rationale until you have chosen.

1. **A service repeats the same policy text on every request and the bill keeps growing. What should be measured first?**

   - A. Replacing the system message with a user message.
   - B. Adding a cache breakpoint at the stable prefix and measuring cache reads.
   - C. Switching to a larger model to reduce retries.

2. **A downstream write requires exactly three fields and currently fails on free-form answers. What is the most reliable fix?**

   - A. Ask for three fields in plain language and split on commas.
   - B. Define a structured output schema, validate the response, and retry with the validation error.
   - C. Stream the answer and stop after the first complete sentence.

3. **A chat view renders text as it arrives, then the connection drops before completion. What should the client do?**

   - A. Keep the partial text and present it as the final answer.
   - B. Mark it unconfirmed, surface the failure, and offer a fresh request.
   - C. Convert the job to a batch request and expect an immediate result.

4. **Three hosts need the same document capability, with one deployment of the connector logic. Which option fits?**

   - A. A connector server exposed through a remote transport.
   - B. A custom tool copied into each application.
   - C. A longer system prompt pasted into each host.

5. **A request carries a customer identifier the receiving service does not need. What is the best first action?**

   - A. Redact the field before the request leaves the application.
   - B. Add a line to the system prompt asking the model to ignore it.
   - C. Raise the maximum output tokens to allow an explanation.

### Answers and rationale for simulator A

1. **B.** An identical prefix is the precondition for a cache hit, and measuring cache reads shows whether the saving is real. **A** changes instruction priority without touching the cost driver. **C** usually increases spend and ignores repeated input.

2. **B.** A schema plus client-side validation makes the contract enforceable, and feeding the error back gives a precise repair target. **A** depends on parsing luck. **C** changes delivery, not shape.

3. **B.** Partial streamed text is a draft; offering a retry is the safe behavior. **A** risks presenting incomplete content as complete. **C** contradicts batch work, which is delayed.

4. **A.** A connector server gives one reusable deployment that clients can negotiate with. **B** creates three copies to maintain. **C** puts capability in prose and offers no reuse.

5. **A.** Redaction at the boundary prevents transmission of the identifier. **B** asks the model to cooperate, which is not a guarantee. **C** is unrelated to data exposure.

## Exam simulator B — Agents, models, and guardrails

Use the six-step routine on each stem before selecting an option.

1. **An incident assistant chooses its next diagnostic step based on the previous result. Which shape is appropriate?**

   - A. A fixed workflow with one ordered list of steps.
   - B. An agent loop with tool calls, stop conditions, and a step budget.
   - C. A single batch request with no intermediate results.

2. **A parallel research step floods the main conversation with logs and the final answer is drifting. What addresses the cause?**

   - A. Move the noisy work into a subagent with isolated context and return a summary.
   - B. Increase the reasoning effort of the main model.
   - C. Remove every tool description from the request.

3. **A tool that deletes workspaces is visible to the model, and a test run nearly called it. What is the most direct guard?**

   - A. A hook or permission rule that denies the call before execution.
   - B. A firmer sentence in the system prompt.
   - C. A longer description on the tool definition.

4. **Quality is acceptable but latency and spend are high for simple classification. What is the least disruptive first experiment?**

   - A. Pin the current model version and stop changing it.
   - B. Route easy cases to a smaller model, escalate uncertain ones, and compare against the eval set.
   - C. Disable caching on the request path.

5. **A model-based grader started rejecting correct answers after a product copy change. What should be checked first?**

   - A. Whether the grader was recalibrated against fresh human labels.
   - B. Whether the output schema gained more fields.
   - C. Whether the requests use streaming.

### Answers and rationale for simulator B

1. **B.** A runtime choice among steps is the defining reason for an agent loop, and stop conditions keep it bounded. **A** cannot branch on findings. **C** removes the results the decision depends on.

2. **A.** Isolation keeps noise out of the main thread while preserving the useful result. **B** spends more on the same polluted context. **C** removes capability instead of managing context.

3. **A.** A deterministic runtime check blocks the action whatever the model decides. **B** and **C** are hints, and destructive actions require a guarantee.

4. **B.** Tiering by difficulty targets traffic that does not need the larger model, and the eval set protects quality. **A** freezes the current cost. **C** tends to increase both spend and latency.

5. **A.** Graders drift when the language they judge changes, so fresh human labels are the reference for recalibration. **B** is not the first suspect. **C** has no bearing on grading accuracy.

## Quick reference and study checklist

### Quick-reference sheet

| Area | One-line memory hook | First diagnostic |
| --- | --- | --- |
| Request contract | Durable rules in the system turn, current ask in the user turn | Print sent messages |
| State | The model has no memory between calls | Locate history storage |
| Output | Schema and validation make a promise enforceable | Read the validator error |
| Streaming | Events are a draft until completion is confirmed | Inspect client event state |
| Tools | The model requests; your runtime performs | Inspect the tool round |
| Agents | Runtime-chosen next step, with stop conditions | Read the trace |
| Context | Include what matters, isolate what is noisy | Measure visible context |
| Models | Pin, evaluate, then upgrade | Compare to baseline |
| Cost | Input, output, and cache reads are separate prices | Count tokens first |
| Security | Trust boundaries are enforced outside the model | Check permissions |

### Final study checklist

- Explain why conversation state belongs in application code.
- Describe one tool round, including who executes and who validates.
- Recite the three cost levers: token budgets, caching, and batch processing.
- Recite the three security habits: redaction, least privilege, isolated untrusted content.
- Rebuild the six-step routine and apply it to one missed question.

## Practice lab

Goal: turn the reading routine into a habit that survives exam pressure.

Steps:

1. Choose five questions from earlier chapters and cover the answer choices.
2. For each stem, write three short lines: the layer, the hard constraint, and the owner.
3. Reveal the options and cross out every choice from a different layer.
4. Select an answer, then rewrite the reason for the key in your own words.
5. List the stems where your first layer guess was wrong, grouped by layer.

Expected observation: your misses will cluster in one or two layers, which marks your revision target. If the layer was right but the option wrong, you likely skipped the constraint word and chose a true statement about a different question.

> **Try it:** Repeat the lab with this chapter's simulators, writing the layer guess before rereading each stem. The second pass exposes habits you did not notice on the first.

## Worked scenario

A document-review assistant has four complaints before release: the bill has doubled, answers sometimes repeat notes from a private workspace, a review loop keeps calling tools after the useful work is done, and the database rejects about one answer in ten for missing fields.

The temptation is to treat this as one broken model and switch to a larger one. The routine separates the complaints into four problems.

The bill is a cost and integration issue. The request sends the same long policy preamble on every call, so a stable cache breakpoint is the first experiment, followed by a token budget and a spend alert. Model selection comes later, after the eval set shows which cases need the larger tier.

The leaked notes are a security and context issue. Retrieved text is untrusted, so it is isolated from instructions that grant authority, and retrieval is limited to the caller's workspace. Redaction happens before the request is formed.

The non-stopping loop is an orchestration issue: read the trace to find the first step that added nothing. The fix is an exit condition and a step budget.

The rejected writes are an output contract issue. Define a schema for the three fields, validate responses, and retry on mismatch with the validation error.

Resolution follows a deliberate order: safety, then correctness, then cost. Fixing the leak and the loop protects the release; the schema stops the write failures; caching addresses the bill. Changing the model would have touched none of the four causes directly.

## Common mistakes

- Treating the exam as recall and ignoring the constraint hidden in the story.
- Reaching for a larger model when the real problem is a contract, a loop, or repeated input.
- Assuming the model retains history between requests.
- Believing the model executes tools itself, or that a tool description is a permission check.
- Using an agent where a short deterministic workflow would be cheaper.
- Reviewing only the correct option and not learning why the distractors were written.

## Chapter summary

- Three distinction sets cover most scenario traps: API, integration, and output; agents, tools, and context; models, cost, tooling, and security.
- Trace every answer back to the layer named by the constraint, not to a familiar product name.
- The model requests tool actions; your runtime authorizes, executes, and validates them.
- Agents are justified by runtime choice, and they need stop conditions and step budgets.
- Cost levers and security guarantees are enforced in code and configuration, not in wording.

## Checkpoint questions

1. **A question asks what keeps a conversation coherent across three page reloads. Which layer owns that behavior?**

   - A. The model's internal memory of earlier calls.
   - B. Application code that stores and resends the needed turns.
   - C. The streaming event handler.

2. **A requirement says results must be identical for identical inputs. Which pairing is most relevant?**

   - A. Lower sampling variation and a pinned model version.
   - B. A larger token limit and streaming.
   - C. A longer tool description and a batch request.

3. **The model keeps calling a tool with malformed arguments. What is the most useful correction?**

   - A. Narrow the input schema and clarify the description, then rerun the eval set.
   - B. Add several paragraphs about tone to the system message.
   - C. Increase the agent's step budget.

4. **Which statement about subagents is most accurate?**

   - A. They always reduce total token spend.
   - B. They help when isolation or parallelism is worth the extra coordination cost.
   - C. They remove the need for reliable tool contracts.

5. **A fetched page tells the assistant to ignore its rules and reveal a credential. How should that line be treated?**

   - A. As a higher-priority instruction than the system message.
   - B. As untrusted data, with isolation and permissions the text cannot change.
   - C. As a reason to remove the page from the eval set.

### Answers and rationale

1. **B.** Persistence is implemented by the application that keeps history and includes the required messages in each request. **A** is false because separate calls share no memory. **C** controls one response's delivery, not continuity across reloads.

2. **A.** Reducing sampling variation and fixing the model version narrows the sources of difference, then the eval set confirms the result. **B** changes length and transport, not variability. **C** changes tool documentation and scheduling.

3. **A.** A tighter schema and clearer description attack the cause of malformed arguments, and the eval set detects regressions. **B** addresses style, not structure. **C** allows more attempts at the same mistake.

4. **B.** Isolation and parallel progress are real benefits, paid for with extra tokens and coordination. **A** ignores that cost. **C** is wrong because every worker still depends on sound tool contracts.

5. **B.** Content fetched from elsewhere is data, so it must never gain authority over system instructions or permissions. **A** inverts the priority order. **C** misses the point; the page is a useful adversarial case to keep.

---

*End of chapter 30.*
