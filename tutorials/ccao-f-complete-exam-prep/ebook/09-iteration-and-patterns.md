# Chapter 9 — Iteration and Prompt Patterns for Work

A first response from an assistant is a starting point, not a finished work product. Strong candidates rarely get everything they need in one exchange. They break a mixed task into smaller decisions, inspect the intermediate results, and refine what is weak. This chapter treats iteration as a design discipline: each step has a purpose, a visible output, and a test for whether it succeeded.

## Learning objectives

- Explain why packing every requirement into one large request tends to degrade the result.
- Decompose a mixed task into ordered steps, each with a named output.
- Chain steps so that one step's output becomes the next step's input explicitly.
- Choose a sensible number of steps and place checkpoints where errors would be costly.
- Distinguish work that can run in parallel from work whose order is fixed.
- Give feedback that names the observed defect rather than asking for a vague improvement.
- Keep a change log and measure whether iteration actually improved the result.
- Recognize recurring work-task patterns and match each to a useful prompt shape.

## Key concepts

### Why a single large request fails

When one request asks an assistant to gather facts, make a decision, write a document, format it, and check its own accuracy, those demands compete inside one response. The instruction must carry audience, scope, structure, tone, length, and verification rules at once. Qualifiers end up buried, and conflicts are resolved silently, often in favour of the most prominent phrasing.

A single pass also gives the assistant no chance to discover that an early decision was wrong. If it settles on a comparison criterion in the opening paragraph and finds in the final paragraph that the evidence does not support it, it cannot rebuild the answer. It smooths over the gap with prose that reads confidently.

Verification becomes harder as well. A long answer mixing an invented date, a formatting error, and a tone problem gives a reviewer no clean place to start. Short steps with single deliverables make defects visible in isolation. That is the practical case for decomposition: not that an assistant cannot write long answers, but that long answers are expensive to check and repair.

> **Exam note:** When a scenario describes a polished but internally inconsistent answer to an oversized request, the best response is usually to split the work and validate intermediate outputs, not to rephrase the same request or switch to a different model.

### Decomposing work into ordered steps

Decomposition turns one goal into subgoals, each producing something a reviewer can name and judge. Use the noun test: if you cannot name a step's output in a short phrase, the step is probably still two steps. Typical outputs are an inventory of facts, a list of options, a comparison table, scored criteria, and a draft with caveats.

Order follows dependency. You cannot compare items before extracting them into a common form, or score options before criteria are fixed. Evidence-producing steps come first, interpretive steps later, and presentation last.

Consider a coordinator preparing a briefing on two internal policy proposals. The mixed goal is "tell me which proposal to adopt and why." The decomposed version looks like this:

1. Extract the stated terms of each proposal into the same field set, with a reference for every figure and date.
2. Build a comparison table against criteria agreed in advance.
3. Identify which claims in the comparison are supported and which are inferred.
4. Draft a recommendation that separates supported findings from judgment calls.

The first step is mechanical, the second structured, the third evaluative, and the fourth communicative. The last step cannot invent new evidence; it uses only what survived earlier steps. That is what makes the chain auditable.

Decomposition also shows where the assistant should not be used. A step needing privileged access, a real-time lookup, or a decision only an accountable owner may make belongs with a person. Excluding it is good design, not a failure of the technique.

### Chaining steps together

A chain passes the output of one step into the prompt for the next. An assistant does not automatically treat an earlier answer as verified source material. If the next prompt is vague, it may regenerate that content, reword it, and introduce a new error. Paste the exact intermediate output, label it, and state its status.

A three-step chain for a short research briefing can look like this:

```text
STEP 1 — EXTRACT
Using only the two supplied policy documents, list every stated cost,
deadline, and owner. For each item, give the document name and the
passage it came from. If a document does not state an item, write
"not stated" for that document. Produce a table; do not interpret.

STEP 2 — COMPARE
Treat the table below as the complete evidence set. Using only the
four criteria supplied by the reviewer, build a comparison table.
Mark each cell as "supported", "inferred", or "not stated".
Do not add figures that are absent from the evidence table.

[paste the exact table from Step 1 here]

STEP 3 — DRAFT
Write a recommendation using the comparison table below. Cite the
evidence-table row for every factual claim. Keep judgment calls in a
separate paragraph labelled "Decision requiring human approval".

[paste the exact comparison table from Step 2 here]
```

A single thread preserves context but accumulates noise; the assistant can carry a mistaken claim forward simply because it appeared earlier. Separate threads force a clean handoff but make it easy to forget a constraint. In either case, carry scope, audience, and format rules into each new step.

> **Try it:** Take a task you usually request in one message. Write down its intermediate outputs as nouns, then rebuild the request as a chain with one output per step. Notice which step you had never consciously checked before.

### Deciding how many steps are enough

Too few steps leave mixed deliverables and hidden errors; too many add overhead and chances for drift. Each handoff can drop a qualifier or change a label. Aim for the smallest chain that makes risky parts checkable.

Three signals justify a split: a reviewer would stop to approve the intermediate result; the next step needs a different capability or source of truth; or an early error would be costly to unwind later. A counter-signal is needing "and" to describe an output: "a list of costs and a comparison and a recommendation" is three steps. A step that merely restates the previous one in a new tone rarely earns its place.

An extra short step is usually cheaper than reworking a long document, but if every step needs a slow manual check the total time may grow. Ask where checking pays for itself.

### Checkpoints between steps

A checkpoint is a deliberate pause in which a person inspects an intermediate output before it is reused. Its purpose is to stop errors from becoming authoritative. A figure guessed in an early extract looks different when it reappears in a comparison table: it now has the appearance of evidence. By the final memo, nobody questions it. Each stage makes the same error harder to correct.

Checkpoints need not be long. For an extract, confirm every requested field is present, each entry has a source reference, figures carry units, and missing values are marked rather than filled. For a comparison, confirm the criteria match what was agreed and units are consistent. For a draft, confirm caveats remain attached to their claims.

The checkpoint owner should be accountable for the final decision. The prompt author may be too close to the wording to notice a misplaced qualifier. On a team, a second reviewer can handle only the high-risk checkpoints.

> **Common mistake:** Running a whole chain and reviewing only the final document. By then the earliest extract has been treated as fact for the entire sequence, so the reviewer is effectively auditing the assistant's assumptions rather than the source material.

### Parallel work and when order is fixed

Parallel work is safe when subproblems are independent and share a fixed specification. If several reports must be summarised into agreed fields, each summary can be produced on its own. The specification comes first; the summaries do not depend on one another.

Order is fixed when one output feeds the next, when a decision must precede its application, or when an assumption must be agreed before individual work begins. You cannot score proposals before deciding what scores mean, or apply a classification scheme before settling its edge cases.

| Situation | Parallel or ordered? | Reason |
|---|---|---|
| Summarising several independent reports with an agreed field list | Parallel | No output depends on another; the schema is fixed |
| Defining scoring criteria, then scoring options | Ordered | Scores have no meaning until the criteria are settled |
| Extracting facts, then comparing them | Ordered | The comparison consumes the extract as evidence |
| Rendering the same finding for two different audiences | Parallel | Both versions draw on the same settled finding |
| Drafting a recommendation, then checking its citations | Ordered within a step | A claim must exist before it can be traced |

Parallelism has a cost: separate requests need more setup, while one combined request can let one item's wording contaminate another. Batch only independent items, give each a labelled slot, and keep a fixed template.

### Refining with specific feedback

"Make it better" gives the assistant no information about the reviewer's standard. It will usually lengthen the answer, add transitions, or adopt a formal tone. None of that fixes an omitted source, a wrong unit, or a broken structure. Specific feedback names the defect and the desired change.

Instead of saying a paragraph is unclear, say it asserts a cost figure without a source reference, and ask either to attach the document reference or remove the claim. Instead of asking for a shorter version, say to keep every caveat attached to its claim while cutting background examples, within a stated bound.

In the critique-then-revision pattern, ask first for an assessment against an explicit rubric, then for a revision addressing only that list. This can surface issues the reviewer missed, but a self-critique is a diagnostic aid, not proof. Each item still needs human judgement.

### Keeping a change log of prompt versions

Iteration without a record circles back. A team may reintroduce a rejected phrasing, or fail to reproduce a good result because nobody remembers which source file was attached. A change log records the history of decisions, not merely the current text.

A compact log has four fields: version label, change made, reason, and observed effect. The reason matters most: similar-looking prompts may serve different purposes. The effect field should describe what changed in the output, not simply whether it was liked.

| Version | Change made | Reason | Observed effect |
|---|---|---|---|
| v1 | Single request for the full briefing | Initial attempt | Mixed facts and judgment; one unsourced date |
| v2 | Extract step added with mandatory references | Unsourced claims reached the draft | Every figure traceable; two missing values exposed |
| v3 | Comparison step limited to agreed criteria | Reviewer could not tell how options were ranked | Ranking logic visible; inferred cells labelled |
| v4 | Critique step inserted before final draft | Caveats were being dropped during polishing | Caveats retained in the final version |

The log also supports handover by showing which experiments were tried. It does not prove accuracy; that still depends on checking sources.

> **Exam note:** A version record is evidence of repeatability and careful process. It is not a substitute for verification of the claims in the output.

### Measuring whether iteration improved the result

Judge improvement against criteria fixed before iterating, or the reviewer drifts toward whatever feels familiar. A simple rubric covers task completion, factual support, format compliance, clarity, and time to approve. Score each criterion on the same small scale for every version.

Scoring reveals trade-offs. A revision may become more readable while dropping a qualifier, or more complete while taking longer to check. Recording both makes the trade visible. Time to approval is a legitimate quality measure: an answer that takes a specialist a long time to verify may be worse than a shorter one that is easy to confirm.

Test a reusable pattern against a small fixed set of representative requests. Tuning to one example produces prompts that fail elsewhere. Keep subjective preference separate from measurable change; a warmer tone is not evidence of greater accuracy.

### Recurring work-task patterns

Most assistant work falls into a small set of shapes. Recognising the shape tells you what the prompt must specify and what the reviewer must watch.

| Pattern | Cue in the request | Essential prompt content | Main risk to check |
|---|---|---|---|
| Summarise | "Give me the gist", "condense this" | Audience, length bound, what to preserve | Qualifiers removed with the detail |
| Extract | "List every...", "pull out the fields" | Field definitions, rule for missing values | Invented values filling gaps |
| Compare | "Which is better", "contrast these" | Fixed criteria, common units, evidence labels | Criteria changed mid-comparison |
| Classify | "Sort these into categories" | Category definitions and edge-case rules | Inconsistent labels across items |
| Draft | "Write the email or memo" | Purpose, audience, constraints, source material | Unsupported claims added for flow |
| Critique | "Check this against our rubric" | The rubric itself and the scope of review | Self-critique treated as verification |

Extraction needs field definitions and a rule for missing values, or the assistant may invent an entry where the source is silent. Classification needs category definitions and boundary rules, since inconsistent labelling is the common failure. Summarising needs a length bound and a statement of what must survive the cut. Comparing needs fixed criteria and evidence labels. Drafting needs constraints and sources; critiquing needs a rubric and separation from revision.

These patterns are skeletons, not scripts. One piece of work may combine several, and the same task may arrive under different labels. The useful questions are: what must the output be, what evidence may it use, and where must a human stop the sequence?

## Worked scenario

A coordinator must prepare a short briefing comparing two internal policy proposals. The first attempt is a single request for a recommendation with reasons. The answer is fluent, but it includes an implementation date found in neither document, calls one proposal "clearly cheaper" without a calculation, and mixes stated priorities with invented assumptions. Because it reads well, forwarding it is tempting. The coordinator does not.

Which parts could have come from the supplied documents? That cannot be judged from the final memo, so the work is decomposed. Step one extracts only stated costs, deadlines, and owners, each with a passage reference and an explicit "not stated" entry where a document is silent. The two documents are independent and the field list is fixed, so extraction runs in parallel.

At the checkpoint, the reviewer finds that the implementation date was never in either document; it was produced to make the table look complete. It is removed, and extraction is repeated with a ban on added values. The corrected extract shows one proposal giving a cost range and the other only a target, so a direct cost comparison is not possible.

Step two builds a comparison on four criteria agreed before scoring, labelling each cell supported, inferred, or not stated. It follows extraction because it consumes the extract as evidence. The gap is now visible in writing rather than hidden in a phrase such as "clearly cheaper."

Step three critiques the comparison against the team's rubric. The critique flags two places where a criterion was applied differently; the reviewer agrees with one flag and rejects the other. Step four drafts the recommendation, citing the evidence-table row for every factual claim and placing the decision requiring human approval in a separate paragraph.

The change log records each version and its reason. When a colleague asks why the briefing claims no cost saving, the log and comparison table together explain it. Measured against the same rubric, the first version failed on factual support and format compliance, while the final version met them and took less reviewer time to approve. The chain moved effort from late repair to early checking.

> **Exam note:** A chain is successful when its intermediate outputs let a reviewer locate and correct a specific defect. Fluency of the final paragraph is not the measure.

## Common mistakes

- Polishing the first answer instead of testing it.
- Asking for a general improvement without naming the defect.
- Chaining without restating the earlier output as the next input.
- Skipping checkpoints because the chain reads smoothly.
- Running steps in parallel when order matters.
- Editing prompts without recording what changed and why.
- Judging iteration by length or tone rather than a rubric.
- Reusing a pattern without adjusting it for the new domain.
- Treating a self-critique as verification against the source.

## Chapter summary

- A single oversized request mixes evidence, judgment, and presentation in one pass, which makes errors hard to isolate and expensive to repair.
- Decomposition produces named outputs such as extracts, comparisons, and drafts, ordered by dependency.
- Chaining works when the previous output is pasted back explicitly and labelled as the evidence set.
- Split the work at natural approval boundaries, costly error points, or changes in capability; avoid arbitrary extra steps.
- Checkpoints stop early errors from gaining authority as they move downstream.
- Parallel work needs independent subproblems and a fixed specification; ordering is required whenever one step consumes another's output.
- Specific feedback names the defect and the change; critique is useful but still requires verification.
- A change log and a fixed rubric turn iteration from guesswork into a repeatable process.
- Summarise, extract, compare, classify, draft, and critique are reusable patterns with distinct risks.

## Checkpoint questions

1. An analyst sends one long request asking an assistant to research a topic, decide on a position, and write a client memo. The memo is fluent but contains an unsupported figure. What is the best next move?

- A. Ask the assistant to rewrite the memo in a more cautious tone.
- B. Switch to a more capable model and repeat the same request.
- C. Split the task so facts are extracted and verified before any drafting begins.
- D. Add an instruction at the end of the same prompt saying that all figures must be accurate.

2. Which pair of activities is safe to run in parallel?

- A. Extracting fields from two independent reports, with the field list already agreed.
- B. Defining scoring criteria and then applying those criteria to the same options.
- C. Producing an evidence table and then writing a conclusion based on it.
- D. Drafting a recommendation and then checking that its claims are supported.

3. A reviewer wants to improve a draft where a date has been asserted without any source reference. Which feedback is most useful?

- A. "Make this better."
- B. "The second paragraph is unclear; please rewrite it."
- C. "Remove the date in the second paragraph unless you can attach the reference from the supplied documents; otherwise mark it as not stated."
- D. "Please make the whole answer shorter and more professional."

4. What is the main reason to keep a change log of prompt versions?

- A. It proves that every claim in the final answer has been verified.
- B. It records what changed and why, so results can be reproduced and rejected approaches are not repeated.
- C. It removes the need for a reviewer to inspect intermediate outputs.
- D. It allows the assistant to remember earlier instructions without restating them.

5. Which is the strongest sign that a task has been decomposed well?

- A. Each step has a single, nameable output that can be judged on its own.
- B. The prompt for each step is as long as the original request.
- C. The steps are arranged alphabetically so they are easy to find later.
- D. The final step produces the longest document.

6. In a chained workflow, why should the exact previous output be pasted into the next prompt?

- A. It makes the request look more formal to a reviewer.
- B. It prevents the assistant from regenerating or quietly altering earlier evidence.
- C. It guarantees that the next answer will be factually correct.
- D. It means the original sources no longer need to be checked.

7. A team needs to sort incoming requests into fixed categories with clear boundary rules. Which task pattern fits best?

- A. Summarise, because the aim is to condense each request.
- B. Compare, because the requests must be ranked against one another.
- C. Classify, because category definitions and edge-case rules are the core need.
- D. Draft, because the final output is a written response.

### Answers and rationale

1. Correct answer: C. An unsupported figure inside a blended answer calls for separating evidence production from presentation and verifying facts before drafting. Option A addresses tone, not the defect; a cautious phrase does not support a wrong figure. Option B blames model capability, but any model can invent a figure in a combined request. Option D buries a reminder in an already crowded prompt, the classic lost constraint.

2. Correct answer: A. Independent reports with a fixed field list have no dependency between outputs. Option B is ordered because scores need criteria. Option C is ordered because the conclusion consumes the evidence table. Option D is ordered because a claim must exist before it can be traced.

3. Correct answer: C. It names the exact defect, states two acceptable resolutions, and points to the supplied documents as the authority. Option A provides no standard, so the assistant will guess at what "better" means. Option B identifies a paragraph but not the problem within it, inviting a stylistic rewrite that leaves the unsourced date in place. Option D changes length and tone while ignoring the missing reference, and shorter prose can hide the defect rather than fix it.

4. Correct answer: B. A log preserves the reasoning behind each edit, supporting reproducibility and preventing circular revisions. Option A overstates it: a log documents process, not truth. Option C is wrong because past checks do not check the current output. Option D describes memory, not a log; constraints must still be restated.

5. Correct answer: A. A nameable output gives a step a clear boundary that can be inspected in isolation. Option B confuses length with structure. Option C imposes irrelevant ordering. Option D measures volume, not quality; a long document may simply contain padding.

6. Correct answer: B. Pasting the exact output anchors the next step to what was actually produced. Option A mistakes appearance for function. Option C is too strong: an explicit handoff reduces drift but cannot guarantee correctness. Option D is dangerous because earlier output is not automatically trustworthy.

7. Correct answer: C. Classification depends on category definitions and consistent boundary handling. Option A would compress the requests and lose the labels. Option B introduces ranking the team never requested. Option D focuses on prose style, but the difficulty is consistent labelling.

---

*End of chapter 9.*
