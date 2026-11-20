# Chapter 21 — Troubleshooting and Optimization

## Learning objectives

- Classify a weak response into a cause category instead of reacting to it as a vague disappointment.
- Apply a compact decision tree to the failures that appear most often in everyday assistant use.
- Decide whether to continue a thread, branch from it, or begin a fresh session.
- Reduce cost and latency without trading away accuracy, completeness, or review quality.
- Make good prompting practice repeatable across a team rather than dependent on one careful analyst.
- Recognize when the real fault lies in the workflow rather than in the wording of a prompt.
- Write a defect-style report that another person can reproduce, and run a short optimization loop that proves an improvement.

## Key concepts

A weak answer is rarely random. It is usually the visible end of a mismatch between what was requested, what the assistant could actually see, and which capability was chosen to do the work. Troubleshooting means working backward from the symptom to that mismatch and then changing one thing at a time until the output improves. Optimization is the same discipline applied earlier: arranging prompts, surfaces, and review steps so that good results arrive cheaply and repeatedly. Both habits matter on the exam, because many scenario items describe a disappointing response and ask what the analyst should do next. The correct choice is almost never "start over with a longer prompt." It is the choice that identifies the true cause and applies the smallest effective fix.

### A working taxonomy of weak output

Before fixing anything, name the category of failure. A category is a hypothesis about cause, not a label of blame. Seven categories cover most situations an analyst will meet.

An **unclear instruction** leaves the goal, audience, or acceptance standard open. The assistant produces something plausible but generic because it had to guess. A **missing context** failure occurs when the necessary source material, definitions, or prior decisions were never supplied; the answer may be well written and still unusable. A **wrong surface** failure means the work happened in the wrong place: a one-off conversation was used for a project that needed persistent knowledge, or a research mode was used for a task that needed only a short rewrite. A **wrong model** failure appears when a compact option was asked for multi-source judgment, or a capable option was used for a high-volume mechanical task, producing either shallow reasoning or unnecessary expense. An **unverifiable claim** is a fluent statement with no traceable basis in the supplied material. A **format mismatch** delivers correct content in a shape the next step cannot consume. Finally, **context overflow** shows up in long threads as forgotten constraints, repeated questions, or contradictions with earlier turns.

| Observed symptom | Most likely category | Diagnostic signal | First corrective move |
| --- | --- | --- | --- |
| Generic answer that could fit any request | Unclear instruction | No audience, length bound, or success test in the prompt | Restate goal, audience, and acceptance criteria |
| Answer ignores an uploaded file | Missing context or wrong surface | File was attached to a different thread or project | Supply the source in the active workspace |
| Confident statement with no citation | Unverifiable claim | Claim cannot be traced to supplied text | Ask for a quotation or remove the claim |
| Correct facts in an unusable layout | Format mismatch | Downstream step needs fields or a table | Specify schema or structure explicitly |
| Late turns contradict early ones | Context overflow | Thread is long and mixed unrelated tasks | Branch a clean thread with a short briefing |
| Simple task is slow and costly | Wrong model | Capable tier used for mechanical work | Route to a compact tier and measure again |
| Strong draft that nobody can reproduce | Team-level repeatability gap | Instructions live only in one chat | Convert the prompt into a shared template |

> **Exam note:** When a scenario names a symptom but not a cause, choose the option that diagnoses before it prescribes. An answer that jumps straight to "use a more capable model" is usually treating a context problem with a compute upgrade.

### A decision tree for the common failures

A decision tree is just a sequence of small questions that eliminates whole families of cause. The first question is always about visibility: could the assistant see everything it needed? If not, fix the surface or supply the source before touching wording. The second question is about clarity: if the material was visible, was the task stated in a way that a careful colleague could not misread? The third question is about trust: if the wording was clear, does any claim need verification before it can be used? Only after those three checks does it make sense to discuss model choice, speed, or style. This order matters because changing a model cannot repair a missing document, and polishing prose cannot repair a fabricated number.

Once the cause is narrowed, change exactly one variable. If you rewrite the prompt, switch the model, and move to a project space simultaneously, you will learn nothing about which change helped. A single-variable test is slower in appearance and faster in practice, because the result is attributable. Record the original request, the changed element, and the observed difference. After two or three cycles, patterns emerge: certain requests repeatedly fail at the same stage, and those patterns are the ones worth designing out rather than patching.

```text
Four-step troubleshooting checklist
1. NAME: state the symptom in one sentence, without proposing a fix.
2. LOCATE: ask what the assistant could see, what it was told, and which surface it used.
3. CHANGE: alter one element only, keeping inputs and acceptance criteria fixed.
4. VERIFY: compare the new answer against the original goal, then record the result.
```

The fourth step is the one most often skipped. An answer can look better and still fail the requirement that mattered. Verification returns the loop to the goal rather than to aesthetics.

### Continue, branch, or restart a thread

Threads accumulate history. That history is useful while a task is coherent and harmful once the conversation changes subject. A clean thread carries the constraints that still apply; a contaminated thread carries old assumptions that quietly leak into new work. The practical question is not whether the thread is long, but whether its history helps or misleads.

Continuing is right when the new request builds directly on the previous answer and depends on decisions already made there. Branching is right when the topic shifts but some context is still valuable; a short briefing that restates the relevant decisions gives the assistant a clean start without losing the thread. Restarting is right when the old thread contains incorrect facts, conflicting instructions, or sensitive material that should not travel into the new task.

| Situation | Recommended action | Reason |
| --- | --- | --- |
| Refining the same draft with specific feedback | Continue | Prior turns hold the accepted wording and constraints |
| New deliverable that reuses one decision from the thread | Branch with a briefing | Keeps the useful decision, drops stale assumptions |
| Earlier turns contain a verified error | Restart | Wrong facts tend to reappear in later summaries |
| Thread mixes unrelated requests and long attachments | Restart | Reduces context overflow and retrieval confusion |
| Task moves from a chat to a shared project space | Branch, then transfer knowledge | Separation preserves ownership and freshness records |

Give every new thread a descriptive label that states the deliverable and its date scope. A label such as "supplier comparison for steering group, third quarter" is far easier to find later than a generic title, and it also signals to colleagues what the thread is allowed to contain. When a briefing is copied into a fresh thread, include the acceptance criteria alongside the decisions; a summary of conclusions without the standard they had to meet invites the same disagreement to return in a different form.

> **Common mistake:** Treating a restart as an admission of failure. A fresh thread with a tightly written briefing is often the most economical fix, especially when the alternative is spending several turns correcting inherited confusion.

### Cost and latency without quality loss

Cost and latency are constraints, not moral categories. The question is whether the chosen capability matches the value of the task. A high-volume classification job with a clear rule set is a poor use of extended reasoning; a ambiguous judgment across several conflicting documents is a poor use of the smallest option. Routing different parts of a workflow to different tiers usually beats one global setting applied to everything.

Latency also has a human dimension. If someone is waiting interactively, a slightly shorter response from a balanced tier may be worth more than a marginally richer answer that arrives late. When nobody is waiting, a scheduled or batched job can use more deliberate processing. The guardrail is always the acceptance standard: never reduce cost by removing a verification step or a required citation, because the saving is erased by rework.

| Lever | Typical effect on cost | Typical effect on latency | Quality guardrail |
| --- | --- | --- | --- |
| Route mechanical tasks to a compact tier | Lower | Lower | Keep the rule set explicit and test a sample |
| Reserve capable tiers for ambiguous judgment | Higher where used | Higher where used | Limit use to items that need it |
| Trim irrelevant attachments | Lower | Lower | Confirm the essential source still travels with the request |
| Batch repetitive work into one structured run | Lower per item | Higher per batch | Validate the schema before scaling |
| Reuse a skill instead of restating a long prompt | Lower | Slightly lower | Version the skill and review its scope |
| Add a two-minute verification check | Slightly higher | Slightly higher | Prevents expensive downstream corrections |

Measure cost per successful task, not cost per response. A cheaper answer that must be redone three times is the expensive one. Hidden cost also accumulates in the review step: a response that saves a few seconds of generation but takes ten minutes to check is not efficient. Track both the generation side and the human side for at least a small sample before claiming a saving. When the numbers disagree, prefer the option that reduces total effort rather than the one that looks faster in isolation. This habit also makes escalation conversations easier, because evidence about time and rework is more useful than a general impression that something feels slow.

### Repeatability across a team

A prompt that lives only in one conversation is a personal habit, not a team capability. Repeatability starts when the stable instruction is separated from the changing data. The stable part states the role, the goal, the required sections, the review owner, and the boundaries. The changing part is the input for this run: the document, the date range, or the customer segment. Keeping them apart means a colleague can reuse the method without inheriting yesterday's numbers.

A shared template should include a short statement of purpose, the acceptance criteria, one worked example, and a note about what must never be included. Versioning matters as soon as a template changes: record what changed and why, so a later reader can tell whether an old output followed an old rule. A light review ladder also helps. Low-risk internal drafts may need a quick completeness check; anything forwarded outside the team needs a named reviewer and a documented check.

> **Try it:** Take a prompt that worked well for you and rewrite it as a team template. Remove all task-specific numbers, add one example, and ask a colleague to run it without explanation. Confusion in that run points directly to missing instructions.

### When the workflow is the problem

Some failures survive every prompt rewrite because the fault sits in the process around the assistant. Signals include repeated handoffs where nobody owns the final answer, a source of truth that two teams define differently, missing acceptance criteria, and a deadline that leaves no time for review. In these cases a better prompt merely produces a better-looking artifact that still fails at the handoff.

Process mapping before automation exposes these issues. Draw the steps as they happen today, mark where information is created, where it is checked, and where it waits. If the wait is the largest segment, the assistant is not the bottleneck. If the same fact is entered twice in different formats, the fix is a shared source rather than a smarter instruction. If a step exists only because a previous review could not be trusted, consider strengthening the review record instead of removing the step. Screening matters too: a task that needs live system state or a privileged action should not be assigned to an assistant that can only draft text.

### Writing a defect-style report

A useful report about a bad output reads like a reproducible defect, not a complaint. It names the surface, the exact input, the expected result, the observed result, and the steps needed to see the problem again. It separates facts from hypotheses, notes how often the issue occurs, and states the business impact. It also lists what was already tried, which prevents a colleague from repeating the same dead ends.

```text
Bad-output report sketch
Title: short neutral description of the symptom
Surface: conversation / project space / research mode / artifact
Input: exact prompt and attached sources, redacted where needed
Expected: the acceptance criterion that was not met
Observed: what appeared instead, quoted briefly
Reproduce: numbered steps another person can follow
Frequency: once / recurring / only with certain inputs
Impact: who is blocked and what decision is at risk
Tried: changes already attempted and their results
```

Keep the tone factual. The goal is a repair that benefits the next person, not a verdict about who made the mistake.

### The optimization loop

Optimization is a loop with a short cycle: baseline, hypothesis, test, compare, decide, record. Start by measuring the current state with a small representative sample, using the same acceptance criteria every time. Choose one hypothesis from the taxonomy and test it on that sample. Compare results against the baseline using a simple scorecard that covers correctness, completeness, format, and effort required for review. If the change helps, promote it into the shared template and note the version. If it does not, revert it and record the negative result, because a rejected hypothesis prevents repeated experiments later.

The loop should include a stopping rule. Once the output meets the acceptance standard consistently, further polishing often adds cost without adding value. At that point the better investment is a broader check: is the same pattern useful for a neighbouring task, and does the review ladder still match the risk?

> **Exam note:** Exam scenarios often present two improvements, one of which makes the answer sound better while the other makes it verifiable. Principle-level reasoning favours the verifiable improvement.

## Worked scenario

A coordinator asks an assistant to produce a short comparison of three supplier proposals for a steering group. The first response reads smoothly, lists three vendors, and includes a price figure that appears nowhere in the attached documents. The coordinator is tempted to ask for a more capable model and a longer, more formal tone.

Working through the taxonomy changes the diagnosis. The tone is acceptable for the audience, so this is not a style problem. The price figure is a fluent claim without a traceable basis, which places the failure in the unverifiable-claim category. The presence of an invented number also suggests that the request did not explicitly require each figure to be quoted from the supplied files. There is no evidence that the surface was wrong, because the attachments were present in the thread.

Applying the decision tree, the coordinator first checks visibility: the three proposals were attached and the assistant acknowledged them. Next, clarity: the prompt asked for a comparison but never said that every number must come from the source and be labelled by file. Third, trust: the suspicious figure must be removed or sourced. The smallest change is therefore a revised instruction, not a model upgrade. The coordinator asks for a table with one row per supplier, a quoted line for each figure, and the phrase "not stated in the supplied material" wherever a value is missing. The thread is continued because the earlier turns contain the working definitions the steering group already accepted.

The new output is checked against the original goal. Every figure now carries a source line, one supplier's delivery term is marked as unstated, and the recommendation stays within the evidence. The coordinator records the before-and-after in a bad-output report, notes the exact redacted input, and adds the source requirement to the team template. A week later a colleague runs the same template on different proposals without extra explanation and gets a comparable result. That is the signal that an individual fix has become a repeatable capability.

## Common mistakes

- Treating fluency as evidence that the cause was understood; a smooth rewrite can hide an unchanged factual error.
- Changing several variables at once, which makes the successful element impossible to identify.
- Upgrading the model to repair a missing source or an ambiguous brief.
- Continuing a long thread after incorrect facts have entered it, allowing those facts to reappear later.
- Measuring output volume instead of successful tasks that passed review.
- Removing a verification step to save time, then paying for the error during rework.
- Writing a vague defect note such as "the answer was bad" with no reproducible input.
- Assuming a prompt problem when the delay sits in a handoff or an unclear ownership rule.

## Chapter summary

- Diagnose by category first: instruction, context, surface, model, verification, format, or overflow.
- Ask what the assistant could see, what it was told, and where it worked before changing anything.
- Change one variable, then verify against the original acceptance criterion.
- Continue a coherent thread, branch when only part of the history is useful, and restart when wrong facts persist.
- Route work by task value, and measure cost per successful reviewed task.
- Convert personal successes into versioned team templates with stable instructions and changing inputs.
- Look beyond the prompt when handoffs, ownership, or sources of truth are the real constraint.
- Close every fix with a reproducible report and a short optimization loop that records what worked.

## Checkpoint questions

1. An analyst receives a confident answer containing a statistic that is absent from the attached report. Which first move is most defensible?

A. Switch to a more capable model and ask for a longer answer.

B. Ask the assistant to quote the source line for the statistic or mark it as unstated.

C. Rewrite the request in a more formal tone.

D. Move the task to a project space without changing the wording.

2. A thread has grown long and now mixes a budget draft, a hiring note, and a product brief. Late answers repeat a budget constraint in the product brief. What should the analyst do?

A. Continue and add another reminder about the budget.

B. Ask for a shorter response.

C. Branch a clean thread with a short briefing containing only the relevant decisions.

D. Increase the response length control.

3. A team repeats the same monthly report prompt in separate chats, and results vary widely. What is the best structural fix?

A. Ask each analyst to write a more detailed prompt every month.

B. Create a versioned shared template with fixed sections, acceptance criteria, and one example.

C. Use the most capable tier for every run.

D. Disable all response controls.

4. A coordinator wants to cut latency for a high-volume classification job with a clear rule set. Which option protects quality best?

A. Remove the sample check to save time.

B. Route the job to a compact tier and validate a sample against the rule set.

C. Add extended reasoning to every item.

D. Ask for prose explanations instead of structured labels.

5. Which item belongs in a defect-style report about a weak output?

A. A subjective verdict about the assistant's usefulness.

B. The exact input, expected result, observed result, and reproduction steps.

C. A list of unrelated improvements the team might consider someday.

D. A decision to abandon the task without recording the reason.

6. A workflow still fails after several prompt rewrites. The same fact is entered twice in different formats, and nobody owns the final check. What is the most likely cause?

A. The model is too small.

B. The response tone is too informal.

C. The process lacks a shared source and a clear review owner.

D. The prompt needs more examples.

### Answers and rationale

1. **B.** The statistic is a claim with no traceable source, so the first move is to require a quotation or an explicit "unstated" marker. A is wrong because a more capable model can still fabricate when the source requirement is missing. C is wrong because tone does not affect grounding. D is wrong because changing surfaces without adding a sourcing rule leaves the same ambiguity in a new place.

2. **C.** A clean thread with a short briefing preserves useful decisions and removes the stale constraint that was leaking across topics. A is wrong because another reminder competes with accumulated history. B is wrong because response length does not address contamination. D is wrong because a longer answer gives the wrong constraint more room to appear.

3. **B.** A shared, versioned template separates the stable instruction from the changing data and gives everyone the same acceptance standard. A is wrong because individually rewritten prompts reproduce the variation. C is wrong because tier choice does not create consistency. D is wrong because response controls are not a substitute for a common method.

4. **B.** A compact tier suits mechanical work with a clear rule set, and a sample check protects against silent drift. A is wrong because removing validation turns speed into unreviewed risk. C is wrong because extended reasoning adds cost without improving a rule-based label. D is wrong because prose explanations are harder to score than structured labels.

5. **B.** Reproduction details let another person confirm and repair the problem. A is wrong because a verdict is not actionable evidence. C is wrong because unrelated ideas dilute the report. D is wrong because an unrecorded decision prevents learning.

6. **C.** Duplicated facts and absent ownership are process faults that no prompt can repair. A is wrong because model size is unrelated to the duplicated input. B is wrong because tone is not the constraint described. D is wrong because more examples cannot assign an owner or create a shared source.

---

*End of chapter 21.*
