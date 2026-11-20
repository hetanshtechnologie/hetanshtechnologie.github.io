# Chapter 28 — Failure Modes, Model-as-Judge, and Evaluation Decisions

## Learning objectives

- Turn a vague symptom from a trace into a precise, actionable failure label.
- Explain what a model-based grader does and where it adds value over a deterministic check.
- Calibrate a grader against human labels and read a confusion matrix to measure agreement.
- Recognize bias and drift in graders, and describe how each can mislead a quality report.
- Decide when a grade is trustworthy enough to act on and when a human must decide.
- Apply exam-style reasoning to evaluation and debugging choices under stated constraints.

## Key concepts

### Naming the failure: from symptom to label

A symptom is what you observe; a failure mode is what is wrong. "The answer was bad" is a symptom. "The answer asserted a renewal date absent from the supplied policy" is a failure mode. A label points toward a fix; a symptom only prompts more digging.

Attach the label to the earliest wrong step, not the final output. Work through the trace: did a document fail to arrive, did a tool receive a bad argument, did the model ignore a clear rule, state something unsupported, or decline a safe task? Each answer maps to a different remedy and lets you count occurrences.

Counting is why labels matter. Consistent names reveal that ten unrelated complaints are one retrieval defect. A short taxonomy that two reviewers apply the same way beats an elaborate scheme nobody uses.

| Observed symptom | Failure label | Discriminating question |
| --- | --- | --- |
| Required field missing from output | Instruction-following failure | Was the rule stated clearly and near the request? |
| Confident claim with no source support | Fabrication | Does the supplied context contain the asserted fact? |
| Answer based on an obsolete document | Grounding or freshness failure | Which document version entered the context? |
| Correct content wrapped in unparsable text | Format failure | Did the validator reject structure or substance? |
| Safe request declined | False refusal | Did an instruction or guardrail over-classify the topic? |
| Tool action fails with sensible intent | Tool-contract failure | Did the arguments match the tool's declared schema? |
| Disallowed content produced | Safety failure | Did an output guardrail fail to stop the response? |

Several labels can share a symptom. A wrong date is fabrication if no source contained it, but a grounding failure if an old source did. The trace decides, so name from evidence rather than the shape of the answer.

> **Exam note:** When a question asks you to classify a failure, look for the phrase that reveals the first wrong step. A claim with no supporting text is fabrication; a claim supported by an outdated text is a data problem. The same final answer gets two different labels.

### When a model grades another model

A grader assigns a quality score. Deterministic graders — exact match, a schema validator, a regex — are fast and repeatable but only work when correctness is mechanical. Summarization quality, tone, and helpfulness resist such rules.

A model-based grader, or judge, is a second model invocation that scores an output against a rubric. It handles open-ended judgments, partial credit, and criteria like completeness, and it can explain its score when a team is diagnosing a regression rather than merely detecting one.

The cost is that the grader is itself a model, with the same variability and biases as the system under test. A grade is not ground truth but an approximate measurement with error, to be calibrated and interpreted within known limits.

Use judges as one signal among several. A schema check confirms structure, a judge assesses quality, and a human handles difficult or high-stakes cases. For example, reject structurally invalid outputs before judging, then sample judged cases for human review to confirm the judge is still aligned.

> **Common mistake:** Assuming that a grader built from a capable model is automatically correct. Capability does not remove bias, and a grader that has never been compared with human labels has no demonstrated accuracy on your task.

### Calibrating a grader against human labels

Calibration measures how closely a grader's decisions match trusted human decisions on the same cases. With it, you can say that on a held-out sample the grader agreed with reviewers on a known share and that its errors leaned in a known direction.

Start with outputs already labeled by people, including ordinary, borderline, and failing cases; easy positives alone reveal nothing about the hard boundary. The sample must be held out from examples used to write the rubric, or agreement will look excellent and then collapse on new data.

Have people label first and hide those labels. Then classify each case into one of four cells: both pass, human pass but grader fail, human fail but grader pass, or both fail. This confusion matrix is far more informative than one agreement percentage because it separates the two error kinds.

| | Grader: pass | Grader: fail |
| --- | --- | --- |
| Human: pass | 42 correct accepts | 6 wrongly rejected |
| Human: fail | 3 wrongly accepted | 49 correct rejects |

Several measures follow. Agreement is the share in the two diagonal cells: 91 of 100 here. Precision asks how many accepted cases people also accepted: 42 of 45. Recall asks how many people-approved cases the grader accepted: 42 of 48. The three wrongly accepted cases matter most when safety is sensitive.

A compact way to compute these from recorded labels looks like this:

```python
def grader_report(rows):
    tp = sum(r["human"] and r["grade"] for r in rows)
    fp = sum((not r["human"]) and r["grade"] for r in rows)
    fn = sum(r["human"] and (not r["grade"]) for r in rows)
    tn = sum((not r["human"]) and (not r["grade"]) for r in rows)
    total = tp + fp + fn + tn
    return {
        "agreement": round((tp + tn) / total, 3),
        "precision": round(tp / (tp + fp), 3) if tp + fp else None,
        "recall": round(tp / (tp + fn), 3) if tp + fn else None,
        "false_accepts": fp,
    }
```

Which measure matters depends on the cost of each error. A false accept that lets a bad answer reach users puts the focus on precision; a false reject that discards good work puts it on recall. A single headline average can hide precisely the error you care about.

Calibration is not one-time. Re-run it when the rubric or grader version changes and periodically as inputs shift; store results with both versions so later scores are interpretable.

> **Try it:** Take twenty outputs from your own application and label them yourself as pass or fail without looking at any automated score. Run a simple grader over the same twenty, build the four-cell table, and compute agreement. Look specifically at the cases where you and the grader disagreed; the reason usually suggests a rubric clarification.

### Bias and drift in graders

A calibrated grader still misleads if its errors are systematic. Bias means consistently favoring or penalizing a certain kind of output; drift means behavior changes over time, so last month's score means something else. Both corrupt trends and hide in an aggregate.

Common biases recur. Length bias favors elaborate answers; style bias rewards confident phrasing, letting fluent unsupported text outscore plain accurate text; self-preference favors output resembling the grader's own style; position bias privileges a candidate shown first. Rubric ambiguity is a design flaw, not a model quirk, because vague criteria invite fresh interpretations.

| Threat | How it distorts a score | Practical countermeasure |
| --- | --- | --- |
| Length bias | Verbose answers score above concise correct ones | State a length expectation; include short correct examples in calibration |
| Style bias | Fluent unsupported answers outscore plain accurate ones | Separate accuracy from presentation into different criteria |
| Self-preference | Output resembling the grader's style is favored | Calibrate on outputs from varied producers; compare against human labels |
| Position bias | The first or last candidate wins comparisons unfairly | Randomize or swap order and average both presentations |
| Rubric ambiguity | Inconsistent interpretation across runs | Define observable conditions for each score level with examples |
| Version drift | A grader upgrade shifts scores without an app change | Pin the grader version and recalibrate after any upgrade |
| Population drift | New input types fall outside the calibrated range | Refresh the calibration sample as traffic evolves |

A rubric is the main defense. Define observable conditions for each score, avoid vague adjectives, and keep independent criteria separate so one strength cannot offset a fatal weakness. The fragment below judges a single criterion concretely.

```json
{
  "criterion": "Grounded accuracy",
  "question": "Does every factual claim in the answer follow from the supplied source text?",
  "score_2": "All material claims are supported; no invented detail appears.",
  "score_1": "All material claims are supported, but one minor detail is unsupported.",
  "score_0": "A material claim is unsupported or contradicts the supplied source.",
  "guard": "Use only the supplied source. Ignore outside knowledge. Return one integer.",
  "fatal": true
}
```

Two choices matter. The levels describe observable conditions a reviewer can check. Marking the criterion fatal means a zero on grounded accuracy cannot be offset by style or completeness, preventing a fluent fabrication from earning a respectable average.

Detect drift by tracking the grader's own agreement with human labels, not app quality alone. If human labels stay flat while grader scores climb, the instrument changed. Recalibrate after every grader upgrade and keep a small ongoing human sample.

> **Common mistake:** Changing the application's prompt because its judged score fell, without checking whether the grader or its rubric was updated at the same time. Fixing the wrong component leaves the real problem in place and adds another change to disentangle.

### Deciding what to trust and what to do next

Trust a grade in proportion to its evidence. Before acting, ask: was the grader calibrated on held-out human labels for this task, is agreement acceptable given the costlier error direction, are the inputs within the calibrated range, and has the version stayed unchanged?

With reassuring answers, grades guide routine comparisons and regression watches. When any answer is doubtful, treat the grade as a hint: read traces, sample human reviews, or use deterministic checks where possible.

Stakes change the standard. Choosing between wording variants tolerates measurement error; deciding whether a safety filter works does not. High-stakes choices need deterministic gates, human approval, and explicit escalation, never an uncalibrated grade alone.

Exam questions test a few distinctions: a judge suits open-ended criteria, not schema validity; calibration needs held-out human labels; a shift after a grader upgrade is a measurement problem; a falling score with flat human labels is drift; critical safety criteria need a guard, not an average.

> **Exam note:** When a scenario asks which evaluation method to use, match the method to the criterion. Deterministic checks belong on structure and exact values. Model judges belong on subjective quality, after calibration. Human review belongs on high-stakes or borderline cases.

## Practice lab

**Goal:** Calibrate a simple pass/fail grader and observe how a biased rubric changes the result.

**Steps:**

1. Collect twenty short answers from an application on a single task, including at least five known weak ones.
2. Label each answer yourself as pass or fail, and keep these labels hidden from the grader.
3. Write a rubric with one concrete criterion and two score levels, then run a model-based grader over the same twenty answers.
4. Build the four-cell table and compute agreement, precision, recall, and the false-accept count.
5. Rewrite the rubric so that it rewards brevity, rerun it, and compare the new table with the first.

**Expected observation:** The first rubric shows a measurable agreement level with specific disagreements you can explain. The brevity-biased rubric shifts scores toward short answers, changing the cells and demonstrating that a grader measures what its rubric asks for rather than an abstract notion of quality.

## Worked scenario

A team grades a report-writing assistant weekly with a model judge. The score holds steady for weeks. After the judge's provider releases an update, the team pins the new version, reruns the same set, and sees the score jump; one engineer proposes announcing an improvement.

A second engineer notices nothing in the application changed: same prompt, model, and index. The human-labeled subset reviewed each week is essentially unchanged. The instrument moved, not the thing measured.

The original judge had been calibrated against eighty human labels just above the team's threshold; the new one never was. Repeating calibration on held-out verbose, terse, and borderline cases reveals a systematic preference for long answers: terse reports people passed are now called incomplete.

The fix belongs in the rubric. An explicit statement that conciseness is acceptable when all points are present, a short correct example, and a fatal rule for unsupported claims restore agreement and keep false accepts within limits. Only now are the scores comparable.

Old scores came from a differently calibrated instrument, so they do not join one trend line. The engineer records the judge version beside future scores and starts a fresh baseline. The apparent improvement vanishes: quality never changed.

The lesson is procedural: question a score move with no matching cause, compare against human labels, diagnose the bias, repair the rubric, recalibrate, and record versions. The engineer who announced a win would have reported an artifact.

## Common mistakes

- Treating a model grader's output as ground truth without calibration against human labels.
- Calibrating on the same examples used to write the rubric.
- Reporting only overall agreement while ignoring false accepts and false rejects.
- Averaging a fatal safety criterion together with style criteria.
- Using a model judge to validate a JSON schema when a parser would be exact.
- Assuming a score change reflects the application when the grader version also changed.
- Ignoring length and style bias because the grader is a capable model.
- Stitching scores from different grader versions into one trend line.

## Chapter summary

- Separate symptoms from failure modes by naming the earliest wrong step from trace evidence.
- A short, consistently applied failure taxonomy turns anecdotes into countable patterns.
- Model graders add judgment on open-ended criteria but are measurement instruments with error.
- Calibration compares grader decisions with held-out human labels using a four-cell table.
- Precision, recall, and false-accept counts matter differently depending on the cost of each error.
- Bias favors certain outputs; drift changes grader behavior over time; both corrupt trends.
- Concrete rubrics with observable levels and fatal criteria reduce ambiguity and style bias.
- Trust a grade in proportion to calibration evidence, input coverage, and decision stakes.

## Checkpoint questions

1. An answer contains a date that is absent from the supplied context. Which failure label fits best?

A. Format failure, because the answer is poorly structured.

B. Fabrication, because the claim has no source support.

C. False refusal, because the model avoided the question.

D. Tool-contract failure, because a tool was called incorrectly.

2. What is the purpose of holding out calibration examples from rubric writing?

A. To make the evaluation run faster.

B. To ensure the grader is tested on cases it has not been tuned to fit.

C. To increase the number of criteria in the rubric.

D. To remove the need for human labels.

3. In a confusion matrix, a case where people say fail and the grader says pass is a:

A. True accept.

B. False reject.

C. False accept.

D. True reject.

4. A grader's scores rise after its model version changes, while human labels stay flat. What is the most likely explanation?

A. The application genuinely improved.

B. The grader drifted and needs recalibration.

C. The rubric gained more criteria.

D. The retrieval index became stale.

5. Which criterion is the best candidate for a deterministic check rather than a model judge?

A. Whether a summary captures the author's tone.

B. Whether the answer is appropriately concise.

C. Whether the output is valid JSON with required fields.

D. Whether the explanation sounds persuasive.

6. Marking a criterion as fatal in a rubric means:

A. It is ignored when calculating a score.

B. It is averaged with all other criteria.

C. A failing score cannot be compensated for by strengths elsewhere.

D. It applies only to human reviewers.

7. Which situation calls for human review rather than relying on a model grade?

A. Choosing between two harmless wording variants.

B. Deciding whether a safety filter is working before a release.

C. Ranking two drafts of a routine internal note.

D. Measuring average answer length for a report.

### Answers and rationale

1. **B.** An unsupported factual claim is fabrication. A is wrong because structure is not the issue described. C is wrong because the model answered rather than declined. D is unsupported; no tool behavior is mentioned in the scenario.

2. **B.** Held-out cases prevent a rubric that was fitted to its own examples from overstating accuracy. A is unrelated to speed. C mistakes a sampling rule for a rubric-design rule. D is false because human labels are exactly what calibration requires.

3. **C.** The grader accepted an output that people rejected, which is a false accept. A requires human agreement. B reverses the direction, describing a good output the grader rejected. D requires both to reject.

4. **B.** A measurement instrument changed while the thing measured did not, which is drift. A contradicts the flat human labels. C is speculation not supported by the scenario. D would affect application output, which the scenario says stayed constant.

5. **C.** Structural validity is exactly checkable, so a parser is preferable. A, B, and D are subjective qualities that resist deterministic rules and are appropriate for a calibrated judge.

6. **C.** A fatal criterion blocks compensation by other strengths. A is the opposite of fatal. B describes ordinary averaging, which a fatal rule prevents. D is false because the rule applies to whichever grader uses the rubric.

7. **B.** A safety decision before release is high-stakes and needs human or deterministic gates. A, C, and D are low-stakes or mechanical decisions where a calibrated grade or a simple measurement is sufficient.

---

*End of chapter 28.*
