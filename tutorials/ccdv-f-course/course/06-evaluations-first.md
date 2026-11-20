# Chapter 6 — Evaluations First: Test Sets, Graders, and Baselines

## Learning objectives

- Explain why a fixed evaluation set is the foundation of reliable prompt work.
- Build a small, representative test set with clear expectations and useful tags.
- Compare graders for exact match, schema validity, human review, and model judging.
- Establish a baseline and rerun the same cases after a change.
- Detect regressions using tolerance bands and per-category slices.
- Describe session hygiene: what each recorded conversation should carry.

## Key concepts

### Why evaluation comes before prompting

Prompt work without an evaluation set is guesswork with a vocabulary. An engineer edits a sentence, tries a few inputs that look better, and declares success. A week later a different input fails and nobody knows whether the change helped. The problem is the absence of a stable standard. An evaluation set fixes inputs and expectations, making each change measurable.

"Evaluations first" is a claim about order. Before tuning wording, a team records what good output looks like for a representative sample. Only then does it improve the prompt. This has a useful side effect: many apparent prompt problems are requirements problems. If a team cannot write an expected result for a case, it does not yet know what it wants, and no wording will resolve that.

An evaluation set also makes an argument possible. A stakeholder asking whether a new prompt is better can be shown a comparison on a fixed set with pinned versions rather than an impression. When a model version changes, the set reveals whether quality moved. It need not be large: a few dozen well-chosen cases catch most regressions. Size without representativeness is expensive theater.

> **Exam note:** When someone changes a prompt and checks a couple of favorite examples, the missing foundation is a fixed evaluation set with a baseline. Favor answers that measure before editing.

### Building a small representative set

A useful set is a deliberate sample, not random prompts. Include ordinary cases reflecting common traffic, boundary cases with short, long, or empty inputs, and every failure observed in practice. Past failures encode lessons a random sample may never reproduce. Each case should touch each path the application can take — a different tool, retrieval source, or format — so a change in one path is visible.

Difficulty should vary as much as topic. Easy-only cases report a flattering score while saying nothing about situations that cause complaints. Include ambiguous inputs, cases that should be refused, and not-found cases where the right answer is honest uncertainty rather than a guess. If there is a safety rule, add probes. The goal is a score that would drop if something important broke.

A case should record more than the input: an expectation precise enough to grade, tags for slicing results, and enough context to reproduce the run. The example below shows one classification case with an identifier, input text, a structured expectation, tags, and the configuration assumed.

```json
{
  "id": "case-018",
  "input": "The renewal date moved and the exclusions section is unclear.",
  "expectation": {
    "intent": "billing",
    "needs_human": true,
    "must_mention": ["renewal", "exclusions"]
  },
  "tags": ["billing", "ambiguous", "regression:2026-10"],
  "context": "retrieved:policy_billing_v4",
  "should_refuse": false
}
```

Several choices are visible. The expected intent is a fixed label a machine can compare directly. `must_mention` allows partial checks where one exact string would reject a differently worded but correct answer. Tags separate billing cases from other work and isolate the group that regressed. The context field records the retrieved material the case depends on. A case that cannot be reproduced from its record is only an anecdote.

Keep the set in version control and review changes as carefully as code. If a new prompt makes five cases fail, a human must decide whether the prompt is wrong or expectations are outdated. Silently editing expectations to recover a score destroys the signal. When a requirement changes, update affected cases deliberately and compute a fresh baseline.

| Ingredient | Why include it | Example |
| --- | --- | --- |
| Common traffic | Reflects what users do | Routine classification of a short message |
| Boundary inputs | Exposes extreme handling | Empty text, a very long passage, mixed languages |
| Past failures | Locks in learned lessons | A case that once produced an invented label |
| Every tool or data path | Makes each route observable | One case per retrieval source or tool |
| Refusal and safety probes | Detects over- and under-blocking | A request that must be declined |
| Expected not-found cases | Rewards honesty over guessing | A question absent from the knowledge base |

> **Try it:** Take ten real inputs from a feature and write an expectation for each. Any input without a checkable expectation marks a requirement still unfinished.

### Graders: how outputs become numbers

A grader turns an output and an expectation into a score. No single grader suits every task; the wrong one can make a healthy system look broken. Exact match requires the output to equal the expected string. It is deterministic and suits one right answer, such as a fixed label, but is poor for prose where many phrasings are correct. It rewards memorization rather than quality.

A schema check asks a different question: is the output structurally valid? It confirms required fields exist, types are correct, enumerated values are allowed, and unexpected fields are absent. Validity is necessary for any downstream consumer but not sufficient for correctness — a well-formed object can carry the wrong label. Strong designs combine structure and content checks, reporting the two failures separately.

Some qualities resist simple rules. Deciding whether a summary is useful or a claim supported needs judgment. A human reviewer gives the most trusted judgment but is slow, costly, and hard to repeat. A model-based judge — a separate model scoring output against a rubric — scales to large sets and can run on every edit. Its weakness is bias and susceptibility to confident but wrong answers. Calibrate it against human labels and treat its scores as estimates.

| Grader | Best for | Strength | Limitation |
| --- | --- | --- | --- |
| Exact match | Fixed labels, identifiers, short deterministic answers | Deterministic and cheap | Rejects valid variation; useless for prose |
| Schema check | Structured output consumed by code | Verifies shape, types, allowed values | Says nothing about semantic correctness |
| Rule or rubric check | Summaries with required terms or length limits | Transparent and partly automated | Needs care to avoid false failures |
| Human review | Nuanced quality, safety, ground truth | Most trusted judgment | Slow, costly, hard to scale |
| Model as judge | Large sets needing rubric scoring | Scales and runs on every change | Biased; needs calibration against humans |

A grading script should report component checks as well as an aggregate. If a case fails, the engineer should see whether structure, content, or a rule failed. Aggregating early hides the cause. Reports should slice by tag, because a stable average can conceal a collapse in a small critical category. A classifier might hold its average while the subset that must be escalated stops working.

> **Common mistake:** Using exact match as the only grader for open-ended answers, then rewriting the prompt to reproduce one preferred phrasing. That optimizes for the grader, not the user.

### Baselines, reruns, and regression detection

A baseline is the recorded result of running the fixed set against a known-good configuration. It is a snapshot: model version, prompt template version, tool definitions, and retrieval settings must be pinned with the scores. Without those pins, a later comparison cannot say what changed. The baseline holds overall and per-tag scores plus grading definitions, since changing partial-credit rules invalidates the comparison.

The loop has a repeatable shape. Freeze inputs with the fixed set. Pin configuration so nothing floats to a newer model. Run every case and capture outputs with enough detail to explain a failure. Grade with the same rules as the baseline. Compare overall and per-category results, then accept, investigate, or revert. The discipline is repetition: the same cases, graders, and conditions every time.

Regression detection needs tolerance. Output varies, so demanding an identical score creates noisy alarms the team learns to ignore. Define a floor for acceptable quality and a maximum allowed drop from the baseline; treat a change as a regression only when it crosses one. Set thresholds by severity: a small stylistic dip may be tolerable while a new refusal of a safe request is not. Critical categories need their own gates rather than being averaged away.

A rising score is not automatically good. An edit might improve the average while breaking a safety case, or improve one tag by degrading another. Inspect changed slices, not just the headline number. When a regression is confirmed, fix the cause and rerun the whole set — do not patch one failing case. A fix that solves one case while breaking three is not a fix.

| Situation | Action | Reason |
| --- | --- | --- |
| Score drops slightly within tolerance | Accept but record the run | Normal variation should not block edits |
| Score drops past the allowed margin | Investigate failing traces | A meaningful change needs attribution |
| One critical tag collapses while average holds | Block the change | Averages hide small, important categories |
| Safety or refusal cases get worse | Block regardless of average | Severity overrides aggregate quality |
| Score improves but a category declines | Inspect slices before accepting | Improvement does not excuse regression |
| Grading rules changed | Recompute the baseline | Old and new scores are not comparable |

> **Exam note:** A tolerance band is not permission to ignore quality. It filters ordinary variation; safety and critical categories keep hard thresholds.

### Session hygiene in evaluation records

An evaluation run generates a trail of conversations that must stay clean. Session hygiene means deciding what each record carries so it is reproducible, comparable, and respectful of private data. Each run should be tagged with the set version, prompt version, model pin, and configuration values. Those tags turn outputs into evidence: when a score moves, the team can see which combination produced it.

Each case record should also carry its output, individual grader results, and any error or fallback taken. A case that triggered a tool or retrieval step should record what came back, because a wrong result may have originated there rather than in the prompt. Capturing only final text makes a failure impossible to explain later. At the same time, records must respect privacy: inputs often contain personal details, so redaction happens before storage, and retention and access rules apply to evaluation logs as to production data.

Consistency across environments matters. If development captures tool results but evaluation runs do not, a failure appearing only in the full pipeline cannot be diagnosed. Choose a trace shape once and use it everywhere. Resist logging everything — excessive logs are costly, hard to read, and more likely to retain sensitive material. Clean sessions are small enough to inspect and complete enough to replay.

## Practice lab

**Goal:** Establish a baseline and detect a regression with a tiny evaluation set and two graders.

**Steps:**

1. Create eight cases: three routine, two boundary, one past failure, one refusal probe, one expected not-found. Give each an expectation and a tag.
2. Run them against a pinned prompt and model, saving each output with its case identifier and version tags.
3. Grade with a schema check and a content rule. Record overall and per-tag scores as the baseline.
4. Edit one sentence of the prompt, then rerun the identical set with the same model and graders.
5. Compare reports overall and by tag. Identify changes exceeding the chosen tolerance.

**Expected observation:** Reports are comparable because inputs, configuration, and graders were fixed. A harmless wording edit stays within tolerance. A change that breaks the refusal probe or past-failure case shows up in its tag even if the overall score barely moves, proving why per-category slices matter.

## Worked scenario

**The problem.** A document-summary feature passes informal checks but draws complaints that some summaries omit the renewal date. The team has been editing the prompt based on a few examples that look good, and nobody can say whether recent edits helped.

**Reasoning.** The engineer stops editing and builds an evaluation set first. Forty cases are drawn from real requests: common summaries, long documents, several complained about, and three where the information is absent. Each records a length limit, required terms such as the renewal date, and a document-type tag. A rule grader checks length and terms, a schema check confirms structure, and a small sample is reviewed by a human.

The first run establishes a baseline: overall rule score of ninety percent, with the long-document tag at seventy percent — where the complaints live. Changes are tried one at a time, with model pin and prompt version recorded. One rewording raises the overall score by two points but drops the long-document tag further, so it is rejected despite the better headline. Another moves a reminder about the renewal date closer to the input, raising that tag to eighty-eight percent without lowering others. It is accepted and becomes the new baseline.

A model-based judge is added for a quality rules cannot capture, such as faithfulness to the source. The engineer scores twenty cases with both judge and human reviewer. Agreement is good on clear cases but weaker on ambiguous ones, so the judge becomes a signal with disagreements routed for review, and its rubric is written down.

Regression protection follows. The release gate blocks a change if the overall score drops more than two points, any critical tag drops, or any refusal or not-found case changes from correct to incorrect. Each record carries the set version, prompt version, model pin, redacted inputs, outputs, grades, and retrieval results. A future pin shift becomes a routine measurement.

**Resolution.** Complaints stop because the failing category was made visible and improved. The team no longer argues from favorite examples; each edit is compared with a recorded baseline overall and by tag. The judge adds scale without infallibility, and clean records make the next model change routine. The decisive move was building the yardstick before tuning the prompt.

## Common mistakes

- Editing prompts and judging results from a couple of memorable examples.
- Building a set only from easy inputs, producing a flattering but blind score.
- Using exact match for open-ended answers and rewarding one phrasing.
- Grading only structure, then assuming a well-formed output is correct.
- Treating a model-based judge as ground truth without human calibration.
- Recomputing the baseline silently by editing expectations after a score drop.
- Reporting only an average and missing a collapse in a small critical tag.
- Running evaluations only once, so model or data drift goes unnoticed.

## Chapter summary

- An evaluation set is the stable standard that makes prompt changes measurable.
- A small representative set covers common traffic, boundaries, past failures, all paths, refusals, and not-found cases.
- Each case records an input, a checkable expectation, tags, and the context needed to reproduce it.
- Exact match suits fixed answers; schema checks verify structure; humans and calibrated judges handle nuance.
- A baseline pins the set and configuration and records overall and per-tag scores with grading definitions.
- Reruns freeze inputs, configuration, and graders so comparisons remain valid.
- Tolerance bands filter ordinary variation, while critical and safety categories keep hard thresholds.
- Session hygiene records versions, outputs, grades, and tool results while redacting private data.

## Checkpoint questions

1. Why should a team build an evaluation set before tuning a prompt?

   - A. Because prompts cannot be written without code.
   - B. Because a fixed standard makes changes measurable and exposes unclear requirements.
   - C. Because graders replace the need for a model.
   - D. Because larger sets are always slower to run.

2. Which case is most valuable to include in a small test set?

   - A. Only the easiest examples showing the feature working.
   - B. A past failure that caused a real complaint.
   - C. Random inputs with no recorded expectation.
   - D. Cases all using the same tool and topic.

3. Which grader best verifies that required fields and allowed values are present?

   - A. Exact match
   - B. Schema check
   - C. Human review alone
   - D. Token counting

4. What is the main risk of a model-based judge?

   - A. It cannot process text.
   - B. It has biases and needs calibration against human labels.
   - C. It always agrees with exact match.
   - D. It removes the need for version tags.

5. What must be pinned alongside a baseline score?

   - A. Only the output text.
   - B. The set version, prompt version, model pin, and grading rules.
   - C. The browser color scheme.
   - D. The number of users online.

6. An overall score rises but a small critical tag declines. What is the right response?

   - A. Accept because the average improved.
   - B. Delete the tag to simplify the report.
   - C. Inspect the slice and block the change if the critical category regressed.
   - D. Increase the tolerance band to hide the drop.

7. Why include refusal and not-found cases in an evaluation set?

   - A. To make the set larger.
   - B. To detect over-blocking and reward honest uncertainty over guessing.
   - C. To avoid schema checks.
   - D. To replace human review entirely.

### Answers and rationale

1. **B.** A fixed set turns edits into comparisons and reveals undefined requirements. A, C, and D are unrelated or false; a set does not enable coding, replace the model, or slow work by existing first.

2. **B.** A recorded past failure locks in a real lesson likely to recur. Easy-only sets miss problems (A), cases without expectations cannot be graded (C), and uniform cases hide path-specific regressions (D).

3. **B.** Schema checks verify structure, required fields, types, and allowed values. Exact match compares whole strings, human review is broader and slower, and token counting measures size, not validity.

4. **B.** Judges carry biases and should be calibrated against human labels. A is false because judges process text, C because they differ from exact match, and D because version tags remain essential.

5. **B.** Comparable results require fixed inputs, configuration, and grading definitions. Output text alone (A) is a symptom; styling (C) and user counts (D) do not define tested behavior.

6. **C.** Averages hide localized failures, so the slice must be inspected and critical regressions blocked. A accepts a hidden problem, B removes the signal, and D disguises a real regression.

7. **B.** These cases reveal whether the system declines safe requests or invents answers when information is absent. A is a non-reason; C and D misunderstand their role in a broader design.

---

*End of chapter 6.*
