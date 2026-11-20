# Chapter 8 — Diagnosis, Ground Truth, and Evaluations

## Learning objectives

- Apply a systematic debugging method to an AI application: reproduce, isolate the responsible layer, and inspect traces.
- Distinguish prompt, model, tool, and data as competing causes of a failure.
- Identify the fields that make a trace useful for diagnosis.
- Build an error taxonomy and match each error type to a recovery strategy.
- Create a small golden set and grade outputs against ground truth.
- Read a simple grading script and explain what each part measures.
- Cluster errors from traces to find shared causes instead of fixing symptoms one at a time.
- Design an evaluation loop that catches regressions when prompts or models change.
- Define measurable quality metrics and set thresholds that are strict enough to be useful.

## Key concepts

### A systematic debugging method

A failing AI application is not mysterious once you have a method. The temptation is to change the prompt and hope, but that is guessing. A repeatable process moves from a concrete symptom to a specific layer, and only then to a fix. The process has four moves: reproduce, isolate, inspect, and verify.

Reproduce means capturing the failure so it happens on demand. Record the exact input, the configuration in effect, and the observed output. Configuration includes the model version, the prompt template version, the tool definitions, and the retrieved data. Without those details, a failure that disappears is not fixed — it is simply hidden. If the output varies between runs, note how often the failure occurs and under what conditions, because a probabilistic failure needs a different response from a deterministic one.

Isolate means narrowing the cause to one of four layers: prompt, model, tool, or data. A prompt problem shows up as a misunderstanding of instructions or an inconsistent format. A model problem appears as a broad change in behaviour across many tasks, often after a version change. A tool problem shows up when the model's intent is sensible but the action fails or returns the wrong result. A data problem appears when the retrieved context is missing, stale, or misleading. You isolate by changing one layer at a time while holding the others fixed.

Inspect means reading the trace — the record of what happened during the request. A trace shows the messages sent to the model, the context that was included, the tools that were called, the results that came back, and the final output. Many diagnoses become obvious once the trace is visible: the required document was never retrieved, the tool received a malformed argument, or the system instruction was truncated.

Verify means re-running the failing case after the fix and checking the golden set for collateral damage. A fix that resolves one case while breaking three others is not a fix.

> **Exam note:** When a question asks for the first step in debugging, the answer is almost always to reproduce and capture the failing case with its configuration. Changing a prompt before you can reproduce the failure is a distractor.

### Isolating prompt, model, tool, and data

The four layers are the heart of diagnosis, so it is worth learning their signatures. Each has a typical pattern, a quick test, and a likely fix.

A prompt failure usually looks like an instruction that was stated but not honoured. The output ignores a required field, uses the wrong tone, or answers a question that was not asked. To test it, restate the instruction more explicitly or move it closer to the input and see whether behaviour changes. If a clearer prompt fixes the case without touching anything else, the prompt was the problem. Common causes include ambiguous wording, important instructions buried in a long template, and conflicting rules.

A model failure shows up as a shift across many cases at once, especially after a version change. The same prompt that produced careful answers now produces short ones, or a task that previously worked now triggers refusals. To test it, run the same inputs against the previous model version with everything else held constant. If the behaviour follows the version, the model changed. The fix may be to pin the version, adjust the prompt to the new behaviour, or accept the change if quality is still within thresholds.

A tool failure is visible when the model's plan is right but the result is wrong. The model requests a search, but the search returns nothing; it calls a calculator with a malformed argument; it writes to the wrong endpoint. To test it, call the tool directly with the same arguments and compare the result. If the tool fails on its own, the fault is in the tool definition, its permissions, or the service behind it. If the tool works alone but fails in the application, look at how arguments are constructed from the model's output.

A data failure appears when the information the model needs was absent or wrong. A question about a policy is answered from a stale document; a summary omits a section because retrieval returned only the first page. To test it, inspect the retrieved context in the trace and compare it with the source you expected. If the right document was never included, the problem is retrieval, indexing, or filtering — not reasoning.

| Layer | Typical symptom | Quick test | Likely fix |
| --- | --- | --- | --- |
| Prompt | Instruction ignored or format inconsistent | Restate instruction and compare | Clarify wording, reorder, remove conflicts |
| Model | Broad shift after a version change | Re-run same inputs on prior version | Pin version or adapt the prompt |
| Tool | Sensible intent, wrong or failed action | Call the tool directly with same arguments | Fix schema, permissions, or argument mapping |
| Data | Answer based on missing or stale context | Inspect retrieved context in trace | Fix indexing, retrieval, or freshness |

> **Common mistake:** Treating every bad answer as a prompt problem. If the trace shows that the correct document was never retrieved, rewriting the prompt cannot supply information the model never saw.

### Inspecting traces and trace fields

A trace is only useful if it records the right things. Too many teams log the input and final output and then wonder why they cannot explain a failure. A diagnostic trace captures enough state to replay the request and to compare it with a later one. The fields below are the ones that matter most.

An identifier and timestamp let you find and order events. A request or session identifier groups related calls, which matters when a single user action triggers several model calls. The model version and prompt template version are essential for regression work: without them you cannot tell whether a quality change came from a model upgrade or a prompt edit.

The input messages and the system instructions show exactly what the model was told. The retrieved context shows what information was added. Tool calls and tool results show what actions were attempted and what came back. Token counts and latency show cost and performance, which can reveal that a prompt has grown unexpectedly. The final output and any grade or feedback record what happened and how it was judged.

| Field | Why it matters | Diagnostic question it answers |
| --- | --- | --- |
| Trace and request identifiers | Group and order related events | Which calls belong to the same action? |
| Timestamp | Establish sequence and timing | When did the failure start? |
| Model version | Attribute behaviour changes | Did a model upgrade cause this? |
| Prompt template version | Attribute behaviour changes | Did a prompt edit cause this? |
| Input messages | Show the exact request | What was the model actually told? |
| Retrieved context | Show added information | Was the right document included? |
| Tool calls and results | Show attempted actions | Did a tool fail or return wrong data? |
| Token counts and latency | Track cost and performance | Did context or cost grow unexpectedly? |
| Output | Record the result | What did the application produce? |
| Grade or feedback | Record quality judgement | Was this output judged acceptable? |

Instrumentation should be consistent across environments. If development traces contain tool results but production traces do not, production failures become unexplainable. Decide which fields to capture at design time, and make sure privacy rules are respected: traces often contain user input, so they need the same care as any other stored data.

> **Try it:** Take one failing request from your own project and try to explain it using only the fields in a minimal log of input and output. Then add retrieved context and tool results and repeat. The difference shows why those fields belong in a trace.

### Error taxonomies and recovery strategies

An error taxonomy is a shared vocabulary for failures. It turns a pile of anecdotes into counts that can be tracked. The categories should be mutually clear enough that two reviewers classify the same case the same way, and each category should suggest a recovery strategy. Keep the list short; a taxonomy with thirty labels is hard to use.

Instruction-following errors occur when a stated constraint is ignored. Recovery is to clarify the instruction, reduce competing guidance, and validate the output format. Fabrication errors occur when the model states something unsupported. Recovery is to supply grounding context, require citations, and add a check that rejects unsupported claims. Context or retrieval errors occur when relevant information is missing or stale. Recovery is to fix indexing, filters, or freshness. Tool errors occur when an action fails or has the wrong effect. Recovery is to validate arguments, check permissions, and make the tool's contract explicit. Format errors occur when output cannot be parsed. Recovery is to constrain the format and add a repair step. Refusal errors occur when the model declines a safe request. Recovery is to rephrase, provide clearer intent, and adjust an over-cautious instruction. Safety errors occur when the model produces content that should have been blocked. Recovery is to add a guardrail and treat the case as high priority.

| Error type | Example | Recovery strategy |
| --- | --- | --- |
| Instruction-following | Required field omitted from output | Clarify instruction, remove conflicts, validate format |
| Fabrication | Invented figure in a summary | Add grounding context, require citations, check claims |
| Context / retrieval | Answer ignores an available policy document | Fix indexing, filters, or freshness |
| Tool use | Search called with the wrong argument | Validate arguments, check permissions, clarify tool schema |
| Format / parsing | Output is not valid structured data | Constrain format, add a repair or retry step |
| False refusal | Safe request declined | Rephrase, clarify intent, soften over-cautious instruction |
| Safety / policy | Disallowed content produced | Add guardrail, block output, escalate for review |

Recovery strategy also depends on severity. A format error can often be repaired automatically with a parse-and-retry step. A fabrication in a user-facing answer should be blocked or flagged rather than silently patched. A safety failure should stop the response and trigger review. Matching the response to severity is a judgment the exam frequently tests.

> **Exam note:** A retry loop is appropriate for transient or format errors, not for fabrication or safety failures. Re-asking the same question rarely fixes a missing-grounding problem and can make a safety problem worse.

### Ground truth and the golden set

Ground truth is the standard against which an output is judged. For some tasks it is exact: a correct total, a database value, a specific label. For many AI tasks it is a rubric: a good answer is accurate, complete, correctly formatted, and appropriately concise. Being honest about which kind you have is important, because it determines how you grade.

A golden set is a small, curated collection of inputs paired with expected results or rubrics. It does not need to be large to be useful. Thirty to one hundred well-chosen cases can catch most regressions if they cover the important behaviours. The trick is representativeness: include ordinary cases, boundary cases, cases that previously failed, and cases that cover each tool or data path.

Each golden case should contain the input, any context that must be retrieved, the expected output or rubric, and a set of tags such as task type, language, and difficulty. Tags let you slice results — you may discover that overall accuracy is fine but performance on one tagged group has collapsed. Include a few cases that are expected to be refused or handled carefully, so a change in safety behaviour is visible.

Building the set is a deliberate act. Start by collecting real failures, because they are the most valuable cases. Add examples of each major task type. Write the expected answer at a level of detail that a grader can check; "a good summary" is not checkable, while "mentions the renewal date and the exclusions, under eighty words" is. Review the set periodically, because a golden case that reflects an outdated requirement will start flagging correct behaviour as a failure.

Keep the golden set under version control and review changes to it as carefully as code. If a new prompt makes five cases fail, someone must decide whether the prompt is wrong or the expected answers are outdated. Letting the set change silently destroys its value as a regression signal.

> **Common mistake:** Building a golden set only from easy cases, then celebrating a high score. Easy cases confirm that nothing catastrophic happened; they do not detect subtle regressions on the hard tasks that matter.

### A small grading script

Grading turns outputs and expectations into numbers. A simple script is often enough to start. It loads the golden cases, produces or reads the outputs, scores each case, and aggregates the results. The example below combines exact checks with a rubric function and compares the aggregate to a stored baseline.

```python
import json

RULES = {"max_words": 80, "required_terms": ["renewal", "exclusions"]}

def grade(case, output):
    checks = {}
    expected = case.get("expected")
    checks["exact"] = (output.strip() == expected.strip()) if expected else None

    words = output.split()
    checks["length_ok"] = len(words) <= RULES["max_words"]

    lower = output.lower()
    checks["terms_ok"] = all(t in lower for t in RULES["required_terms"])

    scored = [v for v in checks.values() if v is not None]
    checks["score"] = sum(1 for v in scored if v) / len(scored)
    return checks

def evaluate(cases_path, outputs):
    cases = json.load(open(cases_path, encoding="utf-8"))
    rows = [grade(c, outputs[c["id"]]) for c in cases]
    overall = sum(r["score"] for r in rows) / len(rows)
    by_type = {}
    for case, row in zip(cases, rows):
        by_type.setdefault(case["tag"], []).append(row["score"])
    return {
        "overall": round(overall, 3),
        "by_tag": {t: round(sum(v) / len(v), 3) for t, v in by_type.items()},
    }

baseline = {"overall": 0.91, "by_tag": {"summary": 0.93, "extraction": 0.89}}
result = evaluate("golden_set.json", outputs)
print(result)
if result["overall"] < baseline["overall"] - 0.02:
    print("REGRESSION: overall score dropped more than the allowed margin")
```

Several design choices are worth noting. The grade function returns individual checks as well as an aggregate, so a failure can be traced to a specific rule. The evaluate function groups scores by tag, which is where a hidden regression often appears. The baseline comparison uses a tolerance rather than requiring perfection, because small fluctuations are normal. In a real system, the outputs would be generated by the application under test, and the rubric might include a model-based judge — but that judge should itself be validated against human grades before it is trusted.

> **Exam note:** A grading script that reports only one aggregate number can hide a regression in a small but important category. Always slice by tag or category when you investigate a quality change.

### Trace analysis and error clustering

Individual traces explain individual failures. To find a systemic problem, group them. Error clustering means collecting traces over a period, assigning each failure a taxonomy label, and looking for patterns across time, task type, model version, or prompt version.

Start by filtering traces to those with a failing or low grade. Then group by the fields most likely to explain the failure: model version, prompt template version, tag, tool name, and error type. A sudden increase in one cell of that table is a strong signal. For example, if format errors jump only in traces from one model version, the upgrade is implicated. If failures cluster around one tool, inspect that tool's schema or service.

Time is a powerful dimension. Plot the failure rate by hour and mark deployments, prompt edits, and model changes on the same axis. A step change immediately after a deployment is far more informative than a gradual drift. Gradual drift often points to data — a source that has slowly become stale — while a step change points to a code, prompt, or model change.

When a cluster is found, read a handful of traces from it in full. Numbers tell you where to look; traces tell you why. Look for shared features in the input, the retrieved context, or the tool arguments. A cluster of fabrication cases may all involve a document type that was recently reindexed. A cluster of refusals may all contain a phrase that a new guardrail treats as risky.

Avoid the trap of counting only what you logged. If false refusals were never labelled in the taxonomy, they cannot appear in a cluster. This is why the error taxonomy and the trace schema must evolve together: when a new failure mode is discovered, add a label and backfill earlier traces where possible.

> **Try it:** Export a week of traces for a small application, label each failing case with one of the taxonomy categories, and group by model version. Write one sentence describing the largest cluster. That sentence is often the root cause statement you need.

### Designing an evaluation loop

An evaluation loop is the routine that checks quality before and after changes. It turns the golden set and the metrics into a gate that protects users from regressions. The loop should run whenever something that can change behaviour is changed: a prompt, a model version, a tool definition, a retrieval setting, or a guardrail.

The loop has a fixed shape. First, freeze the inputs: use the golden set so every run sees the same cases. Second, pin the configuration: record the model version and prompt version being evaluated. Third, run the application and capture full traces, not just outputs. Fourth, grade the outputs using the same rubric every time. Fifth, compare the results with the last accepted baseline, both overall and by category. Sixth, decide whether to accept, investigate, or roll back.

Automation matters, but so does judgment. A score drop beyond the threshold should block a release and require a human to inspect the failing traces. A score increase is not automatically good either: if a change improves the average while quietly breaking a safety case, the guardrail metrics should catch it. Keep separate gates for overall quality, critical categories, and safety cases.

Version everything that affects behaviour. Prompt templates should be versioned like code, with changes reviewed. Model identifiers should be pinned rather than left to float to the newest version, because a silent upgrade is exactly the kind of change that produces a mystery regression. Retrieval configuration and tool schemas deserve the same treatment.

> **Common mistake:** Running evaluations only before major releases. Model and data changes can arrive without a release, so a scheduled evaluation on a fixed cadence is needed to catch drift that nobody deliberately introduced.

A useful loop also includes a canary stage. After a change passes the golden set, expose it to a small share of real traffic and watch the same metrics. The golden set is deliberately finite, so it cannot cover every real input. A canary catches novel failures while limiting the number of affected requests. Combine the two: the golden set for deterministic regression detection, the canary for the long tail.

### Measurable quality metrics and thresholds

Metrics turn quality into something you can set a threshold on. Choose metrics that connect to user impact rather than to internal convenience. A long context is not a quality problem by itself; a slow answer or a wrong answer is. The table below groups the metrics that most often appear in evaluation design.

| Metric | What it measures | Typical threshold approach |
| --- | --- | --- |
| Task success rate | Share of cases judged fully correct | Must stay above a floor, for example 90 percent |
| Exact match / field accuracy | Correct structured fields for deterministic tasks | Near-perfect for critical fields |
| Rubric score | Average quality across graded criteria | Must not drop more than a small margin |
| Hallucination rate | Share of answers with unsupported claims | Must stay below a ceiling, often near zero |
| False refusal rate | Safe requests incorrectly declined | Must stay below a ceiling |
| Tool-call success rate | Calls that complete with correct results | High floor for critical tools |
| Latency | Time to first token or full response | Percentile limits, such as p95 |
| Cost per request | Tokens and external calls per request | Must stay within budget |

Thresholds need tolerance bands. Outputs vary between runs, so requiring an exact score every time creates noisy alarms. Define a floor for the score and a maximum allowed drop from the baseline; a change is a regression only if it crosses either. Set different thresholds by severity: a tiny drop in a nice-to-have style metric is tolerable, while any increase in safety failures is not.

Be careful with aggregate scores. A single average can hide a serious problem in a small category, which is why thresholds should also apply per tag. If the "billing" tag has only five cases, a two-point drop there is one case, but it may be the most important case in the set. Weight critical categories explicitly rather than assuming volume reflects importance.

Finally, record the metric definitions alongside the results. A number without its definition cannot be compared reliably across time. If you change how a rubric scores partial credit, note it and recompute the baseline; otherwise a real improvement may look like a regression or the reverse.

## Worked scenario

A support application answers questions from a policy knowledge base. It has a golden set of sixty cases, a grading script that scores accuracy, completeness, and format, and traces that record model version, prompt version, retrieved context, and tool calls. Overall rubric score has been stable around 0.90 for several weeks.

On a Monday morning, the score drops to 0.78. The engineer does not start by rewriting the prompt. She checks the trace metadata and sees that every failing case from Monday carries a new model version; the prompt version is unchanged. That is the first clue, but not the conclusion. She runs ten of the failing cases against the previous model with the same prompt and same retrieved context. The score returns to 0.90, confirming that the behaviour follows the model version.

Next she clusters the failures by error type and tag. Two categories dominate. First, a group of false refusals on cases that mention account verification — the new model treats a phrase in those questions as sensitive. Second, a group of format errors where the answer is correct but wrapped in introductory text that the parser rejects. Fabrication and retrieval errors are unchanged, which rules out a data problem.

She reads several full traces from each cluster. The refusals all contain the same phrase, and the retrieved policy document is present in every trace, so the information was available. The format errors all occur on a template that relied on an implicit instruction; the previous model happened to follow it, while the new one needs it stated explicitly. This is not evidence that the new model is worse in general — it is evidence that the prompt depended on behaviour that was never specified.

The immediate response is a controlled rollback: the application is pinned back to the previous model version while the fix is prepared. Then two changes are made. The verification phrase is clarified in the system instruction with an explicit statement that answering general policy questions about it is allowed. The output format instruction is rewritten as an explicit rule with an example. Both changes are treated as prompt edits, so their version numbers advance.

The evaluation loop is rerun. Overall score returns to 0.91, the false refusal cluster disappears, and the format cluster falls to zero. Crucially, she inspects the per-tag results rather than only the average, and confirms that no previously strong category declined. A canary release to a small share of traffic runs for a day with no new failure clusters, after which the new model version is fully enabled.

Finally, she adds the twenty failing cases from Monday to the golden set as permanent regression cases, and adds a check to the release gate that compares refusal rate against a ceiling. The incident becomes a stronger evaluation rather than a forgotten outage.

The exam lesson is the sequence: reproduce with configuration, attribute the change to a layer using pinned comparisons, cluster by error type, fix the specification that was too implicit, verify against the golden set, and harden the evaluation so the same class of failure cannot slip through again. A model upgrade is a normal event; a silent quality drop is a failure of evaluation design.

## Common mistakes

- Changing the prompt before reproducing the failure and recording the configuration.
- Assuming a bad answer is a model problem when the trace shows the correct context was never retrieved.
- Judging a fix by one passing case instead of re-running the whole golden set.
- Grading only an aggregate score and missing a regression in a small but critical category.
- Using exact match as the only grading method for open-ended tasks that need a rubric.
- Building a golden set exclusively from easy, representative-happy cases.
- Retrying fabrication or safety failures as if they were transient errors.
- Letting a model version float to the newest release without pinning it.
- Treating a metric improvement as good news without checking safety and per-category thresholds.

## Chapter summary

- Debugging follows reproduce, isolate, inspect, and verify; never skip to a fix.
- The four candidate layers are prompt, model, tool, and data, each with a distinct signature and test.
- A useful trace records identifiers, versions, inputs, context, tool calls, results, output, and grade.
- An error taxonomy turns anecdotes into countable categories with matching recovery strategies.
- A small, well-tagged golden set with real failure cases is enough to catch most regressions.
- Grading should report individual checks and per-category scores, not just one average.
- Cluster traces by version, tag, and error type; read full traces from the largest cluster.
- An evaluation loop pins inputs and configuration, compares with a baseline, and gates releases.
- Metrics need definitions, tolerance bands, and separate thresholds for critical and safety cases.

## Checkpoint questions

1. A quality drop appears immediately after a deployment, and traces show the same prompt version but a new model version. What is the best next step?

A. Rewrite the prompt from scratch.
B. Re-run the failing cases on the previous model with everything else held constant.
C. Increase the retry count for failed requests.
D. Ignore the drop because model upgrades always change output.

2. Which trace fields are most important for attributing a regression to a prompt edit versus a model upgrade?

A. Output text and word count only.
B. Model version and prompt template version.
C. Timestamp and request identifier only.
D. Token counts and latency only.

3. A summary is factually correct but wrapped in text that the parser rejects. Which error type and recovery fit best?

A. Fabrication; add grounding context.
B. Context error; fix retrieval.
C. Format error; constrain output and add a repair step.
D. Safety error; block and escalate.

4. What makes a golden set useful for regression detection?

A. It contains only the easiest cases to keep scores high.
B. It is changed silently whenever a score drops.
C. It covers task types, boundaries, past failures, and safety cases with clear expectations.
D. It reports one average score without categories.

5. Which is an appropriate use of an automatic retry loop?

A. A safety policy violation.
B. A fabricated statistic with no supporting context.
C. A transient tool timeout or a parseable format glitch.
D. A missing document in retrieval.

6. Why should evaluation thresholds include a tolerance band?

A. Because all output is random and nothing can be measured.
B. Because small run-to-run variation is normal, so only meaningful drops should alarm.
C. Because thresholds are decorative and not enforced.
D. Because averages hide categories.

7. A grading report shows a stable overall score but a sharp drop in one small, critical tag. What does this illustrate?

A. That the evaluation is working perfectly and needs no change.
B. That aggregate scores can hide category regressions, so per-tag thresholds are needed.
C. That the golden set should be deleted.
D. That latency is the real problem.

### Answers and rationale

1. **B.** A pinned comparison changes one variable at a time and attributes the behaviour to the model. A rewrites the prompt without evidence and may not address the cause. C addresses retries, which do not explain a systematic quality change. D accepts a regression that should be investigated.

2. **B.** Version fields let you tell which change accompanied the behaviour shift. Output and word count (A) describe symptoms but not causes. Timestamp and request id (C) help order events but do not identify the changed component. Token counts and latency (D) speak to cost and speed, not attribution.

3. **C.** The content is correct; only the structure fails, so it is a format error with a parsing repair. Fabrication (A) would require an unsupported claim, which is absent. A context error (B) would mean information was missing. A safety error (D) would involve disallowed content, not extra wording.

4. **C.** Coverage of varied cases with checkable expectations makes a set detect regressions. Easy-only cases (A) miss hard failures. Silent changes (B) destroy the baseline. A single average with no categories (D) hides localized problems.

5. **C.** Transient and parse-level failures can succeed on a new attempt. Safety violations (A) must be blocked, not retried. Fabrication (B) needs grounding, not repetition. Missing retrieval (D) needs an indexing or retrieval fix, not another attempt at the same request.

6. **B.** Tolerance bands account for normal variation so that only meaningful changes trigger alarms. A is false because quality is measurable. C is false because thresholds are enforced gates. D describes a real problem but is not the reason for a tolerance band; per-category thresholds solve that issue.

7. **B.** A flat average with a failing critical slice shows why per-tag thresholds matter. A is wrong because the report has revealed a gap that needs attention. C would remove the detection tool. D assumes a latency problem that the scenario does not mention.

---

*End of chapter 8.*
