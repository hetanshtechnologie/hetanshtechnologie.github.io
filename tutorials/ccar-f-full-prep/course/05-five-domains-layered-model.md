# Chapter 5 — The Five Domains and the Layered Mental Model

## Learning objectives

- Name the five recurring design concerns that appear in architect-focused scenario questions.
- Recall the layer order under pressure using an original mnemonic built for this book.
- Classify a scenario by identifying which layer owns the decision being tested.
- Explain why working systems cut across layers and why reliability, governance, and cost are threads rather than extra layers.
- Connect each layer to the questions, artifacts, and failure signals that characterize it.
- Apply a short classification routine to a long scenario without being lured by familiar vocabulary.

## Key concepts

### The purpose of a mental model

A foundations exam rarely asks you to recite a definition in isolation. It places you inside a small design situation and asks which choice you would defend. That format rewards a mental model: a compact structure that lets you sort details into buckets and see which bucket carries the decision. Without one, every question feels like a fresh pile of facts. With one, you can recognize the shape of the problem quickly and spend your attention on the constraint that actually matters.

The model developed here treats an agentic system as five stacked concerns. Each layer answers a different question, and each has its own artifacts, its own typical failures, and its own vocabulary. The stack is a study device, not a strict architecture diagram. Real systems routinely touch several layers at once, and the exam is written that way too. Your job is not to force the scenario into one box forever; it is to find the box that owns the decision in front of you.

Think of the layers like trades in a building inspection. A single defect, such as water entering a wall, might involve the roof, the sealant, and the interior panel. The inspector still separates the trades because each has different tools and standards. Separating our layers sharpens diagnosis without claiming the parts never interact.

### The five layers

The first concern is the **agentic layer**: the logic that decides whether a language model should be given autonomy at all, and if so, what it is allowed to do. Questions here revolve around the loop, the authority granted to it, stop conditions, and the boundary between a suggestion and an action. If the scenario asks whether the assistant should call a tool, how much it may attempt before stopping, or what happens when it cannot finish, you are in this layer.

The second is the **tool layer**: the boundary between reasoning and effect. Tools are the named capabilities the assistant can invoke, together with their inputs, their results, and their error behavior. Questions here ask how a tool should be described, how finely it should be split, what a failure result should contain, and who may call it. A tool that can move money is a different design problem from a tool that can read a document, even if both are exposed through the same interface.

The third is the **workflow layer**: the arrangement of steps that turns a goal into a repeatable process. Where the agentic layer concerns the moment-to-moment loop, the workflow layer concerns the map the loop follows. Questions here ask what comes first, which steps may run together, where a checkpoint belongs, and how a long task is divided. A workflow can be mostly deterministic with a small agentic step inside it, or mostly agentic with a few fixed gates.

The fourth is the **prompt layer**: the instructions and examples that shape a single model call. This includes the wording of the task, the role framing, the constraints, the output format, and any few-shot examples. Questions here ask whether an instruction is specific enough, whether examples conflict with the stated rule, or whether a required field has been left unspecified. The prompt layer is sometimes mistaken for the whole system; in a layered model it is only one small, though important, part.

The fifth is the **context layer**: the management of what the model can see at a given moment. Context is a finite working area shared by instructions, conversation history, retrieved material, tool results, and the response being produced. Questions here ask what should be included, what should be trimmed, how stale material is handled, and how separate timelines are kept apart. A correct prompt supplied with the wrong context still produces the wrong answer.

> **Exam note:** When a scenario mentions both a prompt change and a context change, ask which one the proposed option actually modifies. Editing the instruction text is a prompt-layer move; deciding which documents to place in the working area is a context-layer move. Options often blur the two deliberately.

### An original mnemonic for recall

Under time pressure, order matters because the exam sometimes uses the layer sequence to organize answer choices. This book uses a phrase invented for it: **Agents Trigger Workflows; Prompts Carry**. The initial letters give A, T, W, P, C, matched to agentic, tool, workflow, prompt, and context. Read it as a small story: agents trigger workflows, while prompts carry the context forward. The story is not a technical claim; it is a hook that keeps the five terms in a stable order when your memory feels crowded.

A second hook handles the threads that run through every layer. Think of **reliability, governance, and cost** as the three threads stitched through the stack. Reliability asks whether the system behaves predictably when something fails. Governance asks whether the right people and rules control what may happen. Cost asks whether the design is affordable in latency, tokens, and human attention. None of these is a sixth layer. Each appears inside the others: a tool needs a retry policy, a workflow needs an approval gate, a prompt needs a fallback, and a context window has a token price.

The mnemonic is only a retrieval aid. Once you have recalled the five names, ask which layer's decision would change if an option were adopted. If the answer is "none," treat it as a distractor in correct vocabulary.

### Reading a question by layer

Cue verbs in the task sentence give a useful first guess, as the table shows.

| Cue verbs | Likely layer |
| --- | --- |
| Allow, permit, stop, authorize | Agentic |
| Expose, describe, validate, return | Tool |
| Sequence, parallelize, gate, divide | Workflow |
| Instruct, format, example, specify | Prompt |
| Include, retrieve, trim, summarize | Context |

Verbs are only a first pass. The decisive test is the **change test**: imagine adopting the option and ask what part of the system would be different. If a new stop condition appears, the agentic layer changed. If a schema gained a required field, the tool layer changed. If two steps swapped order, the workflow layer changed. If a sentence was rewritten, the prompt layer changed. If a document was removed from the working area, the context layer changed. The change test cuts through long scenarios because it focuses on the option rather than the setting.

Be careful with questions that describe a failure. A failure symptom often lives in one layer while its cause lives in another. An assistant that keeps repeating the same search is showing an agentic symptom, but the fix may be a tool result that says "no new matches" clearly, which is a tool-layer fix. The exam frequently rewards the layer where the fix belongs, not the layer where the symptom appears. Read the question stem to see whether it asks for a diagnosis or for a remedy.

> **Common mistake:** Choosing the layer that uses the most familiar words. A scenario about a chat assistant will naturally mention prompts, but the decision may be about how much authority the loop has. Familiar vocabulary is not the same as the deciding constraint.

### A layer-to-concern map

The table below compresses the model into something you can review quickly. Use it as a recognition aid, not as a script to recite.

| Layer | Central question | Typical artifact | Characteristic failure | Thread most visible here |
| --- | --- | --- | --- | --- |
| Agentic | Should the system act, and how far? | Loop policy, stop conditions, authority scope | Unbounded retries or actions without approval | Governance |
| Tool | How does reasoning reach an effect safely? | Tool description, input schema, result contract | Ambiguous inputs or unusable error results | Reliability |
| Workflow | In what order do steps run, and where are the gates? | Step plan, checkpoints, branching rules | A gate placed after the risky action | Governance |
| Prompt | What should the model do on this call? | Instruction text, examples, output format | Vague instruction or contradictory examples | Reliability |
| Context | What can the model see right now? | Retrieval set, trimmed history, handoff note | Stale, excessive, or cross-contaminated material | Cost |

The same thread appears with different emphasis in each row, which is why threads are not layers. Notice also that failures are phrased as design defects, not model complaints. In architect questions the model usually behaves as designed; the design needs repair.

### How the layers interact in practice

Consider a document-review assistant. The agentic layer decides that it may read and annotate but not send. The tool layer exposes a search capability and an annotation capability with separate scopes. The workflow layer requires that a draft be assembled before any annotation is written, with a human gate before release. The prompt layer tells the model how to write the draft and which fields to include. The context layer controls which sections of the document are in the working area at each step.

Now change one thing: the search tool starts returning entire documents. The context layer fills up, earlier instructions drift out of view, and the draft becomes inconsistent. The symptom looks contextual, but the root is a tool contract that returns too much. A layered diagnosis follows the chain: tool result shape, context budget, then prompt visibility. A good answer in this scenario usually names the earliest layer where the problem can be bounded, because fixing it there prevents downstream damage.

Options can sound reasonable at more than one layer: a context-trimming rule might help, and so might a shorter prompt. Prefer the fix closest to the source, testable independently, and not dependent on the model remembering a rule under pressure.

### A classification routine you can reuse

The `text` block below is a compact routine for classifying a question. It is deliberately short enough to recall during an exam. Use it after you have read the entire scenario, not while you are still collecting facts.

```text
Question classification routine

1. Underline the task sentence: what are you being asked to choose or change?
2. Apply the verb test to get a first-guess layer.
3. Apply the change test: which layer would look different if this option were adopted?
4. Name the deciding constraint in the scenario (a rule, risk, or limit).
5. Check the remedy layer: if the symptom and the fix differ, choose by the fix.
6. Scan the other options and label each with the layer it belongs to.
7. Reject options that solve a different layer's problem, or that skip verification.
8. Confirm that your choice respects the relevant thread: reliability, governance, or cost.
```

Step six is where candidates gain marks. Labelling each option as a prompt fix, a tool fix, or an agentic fix replaces vague impressions with a comparison of distinct mechanisms against one constraint.

> **Try it:** Take a scenario you answered incorrectly during revision and label every option with a layer. If the correct option and your choice belong to different layers, the missed item was probably a classification error rather than a knowledge gap. Record that in your decision journal.

## Worked scenario

A regional benefits office wants an assistant to help reviewers process applications. The assistant may read an application, look up policy clauses, and produce a draft decision. It may not mark an application as approved. A reviewer sees the draft, checks the cited clauses, and records the final decision. Early trials show two problems: the assistant sometimes cites an outdated clause, and on complex cases it repeats the same lookup many times before producing a draft.

You are asked to recommend the first design change. Four proposals are on the table: rewrite the draft instruction so it says "use only current clauses"; add a step that requires the reviewer to confirm the clause version before the draft is finalized; change the lookup tool so each result includes an effective date and a status flag; and allow the loop ten additional steps so it can search more thoroughly.

Apply the routine. The task sentence asks for the *first* design change, so you need the earliest point where a problem can be bounded. The verb "include" in the third proposal points to the tool layer, and the change test confirms it: the tool result contract would change. The outdated-clause problem originates in the result, which currently gives the model no way to distinguish a current clause from a retired one. Adding that information lets the model select correctly and lets the reviewer verify quickly.

The first proposal is a prompt-layer change. It restates a rule but supplies no means to follow it; the model still cannot tell which clause is current. The second proposal is a workflow-layer change and is useful, but it adds a gate after bad information has entered the draft, detecting rather than preventing the problem. The fourth proposal is an agentic-layer change that increases the step budget. More repetitions of the same lookup amplify a freshness problem and consume time.

The deciding constraint is the reviewer's need to verify cited clauses. The tool-layer change satisfies it at the source and makes the later gate cheaper. Notice that all four proposals use plausible language. None is absurd. The layered routine separates them by mechanism: only one changes the information the model and reviewer actually receive.

> **Exam note:** When a scenario contains two symptoms, look for the change that helps both. Here, effective dates address stale citations and give the loop a clear signal that a search has produced nothing new, which also reduces repetition. A fix with two benefits is more likely to be the intended answer than a fix with one.

## Common mistakes

- Treating the layer names as a sequence to memorize without understanding the question each one answers.
- Choosing the layer where a symptom appears instead of the layer where the fix belongs.
- Assuming that a prompt rewrite can solve a problem caused by missing or stale information.
- Forgetting that reliability, governance, and cost are threads across the stack, not additional domains.
- Letting familiar words in the setting steer you away from the deciding constraint in the task sentence.
- Adding a verification gate after the risky action instead of before it.
- Increasing a step budget for what is really a result-quality problem.

## Chapter summary

- The five layers are agentic, tool, workflow, prompt, and context; each answers a distinct design question.
- The original mnemonic "Agents Trigger Workflows; Prompts Carry" supports recall of the order.
- Reliability, governance, and cost are cross-cutting threads, not extra layers.
- The verb test gives a first guess; the change test tells you which layer an option really modifies.
- When symptom and remedy sit in different layers, choose by the remedy and prefer the earliest bounded fix.
- Labelling every option by layer is a fast way to collapse a confusing scenario into a clear comparison.

## Checkpoint questions

1. A scenario asks which mechanism should stop an assistant from retrying a failing operation indefinitely. Which layer owns this decision?

- A. Tool layer
- B. Workflow layer
- C. Agentic layer
- D. Context layer

2. Which set contains all five layers in the order used by this book?

- A. Agentic, tool, workflow, prompt, context
- B. Agentic, prompt, tool, context, workflow
- C. Tool, agentic, workflow, context, prompt
- D. Workflow, prompt, context, agentic, tool

3. A tool result includes a clear status field that tells the loop no further matches exist. Which layer's design is being changed?

- A. Prompt layer
- B. Tool layer
- C. Context layer
- D. Workflow layer

4. Which statement about cross-layer threads is most accurate?

- A. Reliability, governance, and cost form a sixth layer that sits above the others.
- B. Threads apply only to the tool layer because tools cause most failures.
- C. Threads appear inside every layer and should be checked when comparing options.
- D. Threads are irrelevant once a design has been decomposed into steps.

5. An assistant produces an inconsistent draft because early instructions have fallen out of the working area. What is the most likely layer of the root cause?

- A. Context layer
- B. Agentic layer
- C. Tool layer
- D. Prompt layer

6. Which routine best distinguishes two attractive options in a long scenario?

- A. Pick the option with the most technical vocabulary.
- B. Apply the change test and identify which layer each option modifies.
- C. Choose the option that appears first in the answer list.
- D. Select the option that requires the largest prompt rewrite.

7. A workflow gate is added after a risky action has already occurred. What is the main weakness of this design?

- A. It belongs to the prompt layer and cannot be tested.
- B. It increases the step budget without improving result quality.
- C. It detects a problem only after the effect has happened.
- D. It removes the need for any tool contract.

### Answers and rationale

1. Correct: C. A stop condition is a decision about how far the loop may proceed, which is the agentic layer. A is incorrect because the tool layer defines a capability and its contract, not the loop's stopping policy. B is incorrect because the workflow layer orders steps and places gates, whereas repeated retries are behaviour of the loop itself. D is incorrect because the context layer governs what the model can see, not how long it may act.

2. Correct: A. The order used in this chapter is agentic, tool, workflow, prompt, context, recalled by the original mnemonic. B is incorrect because it puts prompt before tool and context before workflow. C is incorrect because it begins with the tool layer and separates the agentic layer from the loop it governs. D is incorrect because it starts with workflow and ends with the tool layer, which breaks the mnemonic and the learning sequence.

3. Correct: B. Adding a status field changes the result contract of a tool, so the tool layer is being designed. A is incorrect because no instruction text changes. C is incorrect because the amount of context may shrink as a consequence, but the design change is in the tool result. D is incorrect because no step order or gate is introduced.

4. Correct: C. Threads recur inside every layer and help you compare options on reliability, governance, and cost. A is incorrect because a thread is not a layer and adding a sixth box defeats the model. B is incorrect because threads apply to prompts, workflows, and context as well as tools. D is incorrect because decomposition increases, rather than removes, the need to check cross-layer concerns.

5. Correct: A. When earlier material falls out of the working area, the context layer has failed to preserve what the model needs. B is incorrect because no authority or stop condition is at issue. C is incorrect because the tool result may have been fine when it entered the working area. D is incorrect because the instruction text need not be wrong; it may simply be invisible at the moment of use.

6. Correct: B. Naming the layer each option modifies and testing what would change turns a vague comparison into a mechanism comparison. A is incorrect because vocabulary density is not evidence of correctness. C is incorrect because position in a list carries no meaning. D is incorrect because a larger rewrite may add complexity without addressing the constraint.

7. Correct: C. A gate placed after the risky action can only report the problem afterwards; it does not prevent the effect. A is incorrect because gates belong to workflow design and can be tested. B is incorrect because a gate is not a step-budget change. D is incorrect because a tool contract remains necessary regardless of where the gate sits.

---

*End of chapter 5.*
