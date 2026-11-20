# Chapter 16 — Measuring Value and Communicating With Stakeholders

## Learning objectives

- Define success metrics and acceptance criteria before a pilot starts.
- Measure cycle time, rework, and quality instead of counting output volume alone.
- Establish a baseline so that improvement can be shown rather than asserted.
- Communicate value in terms of time, quality, and risk.
- State the limits of an assistant honestly, including what it cannot verify.
- Answer questions about accuracy and policy with evidence and clear ownership.
- Build a short pilot readout for a decision-making audience.
- Write a one-page brief covering goal, use case, non-goals, metrics, and review owner.

## Key concepts

### Why measurement comes before adoption

A claim that an assistant "saves time" is an anecdote until someone defines what time was saved, from which starting point, and for whom. Stakeholders who are asked to fund a change need more than enthusiasm. They need a comparison they can inspect. Measurement also protects the team from its own optimism: people remember the smooth runs and forget the ones that needed three rounds of correction.

Measurement is not a tool for policing individuals. If it is presented that way, people will game the numbers and hide the difficulties that the pilot was meant to reveal. Frame it as learning: the purpose is to find out whether the workflow helps, where it fails, and what control is still needed. A result that says "no improvement" is valuable because it prevents a poor rollout. Equally, a result that shows improvement in one part of the process and none in another tells the team where to look next.

The most important discipline is to fix the definition of success before the results are visible. It is tempting to declare victory by choosing whichever number improved after the fact. That is not measurement; it is selection. Write the metric, the threshold, and the guardrail in advance, and state what would count as a failure. A candidate in an exam scenario should be alert to options that change the success criterion once results are known.

Acceptance criteria turn a metric into a decision rule. A complete criterion names the metric, the target, the floor that must not be crossed, and the guardrail that stops the workflow if a risk appears. For example: reduce median cycle time by a stated proportion, keep the rubric score no lower than the baseline, and stop any run containing an unverified external claim. With those parts written down, a reviewer can decide whether the pilot passed without appealing to taste.

### Choosing metrics that reflect value

Three measures carry most of the signal. Cycle time is the elapsed time from a request being made to an output being accepted, including waiting and rework. Rework is the number of correction rounds or the proportion of outputs returned for revision. Quality is a score against agreed criteria such as accuracy, completeness, and audience fit. Together they describe whether work is faster, cleaner, and still good.

Output volume is the common trap. A workflow that generates twice as many drafts is not necessarily more valuable; it may simply be producing more material to discard. Counting documents, prompts, or generated words measures activity, not benefit. Even time saved can mislead if it is measured only at the generation step and ignored at the review step. A draft produced in minutes but checked for an hour may be slower overall than the old method.

Each metric needs a collection method stated in advance. Cycle time needs a start and end event that everyone records the same way. Rework needs a definition of what counts as a round. Quality needs a rubric and a reviewer. Without these definitions, two people can report different numbers for the same pilot and both believe they are right.

| Metric | What it captures | Collection method | Failure mode |
| --- | --- | --- | --- |
| Cycle time | Time from request to accepted output | Timestamp the start and acceptance events | Counting only generation time |
| Rework rate | How often an output returns for correction | Log each revision round with a reason | Treating all revisions as equal |
| Quality score | Accuracy, completeness, and audience fit | Rubric applied to a sample | Scoring by impression |
| Verification coverage | Share of claims checked against a source | Count checked claims in the sample | Counting words instead of claims |
| Adoption | Whether the workflow is used as intended | Short usage log or observation | Equating logins with benefit |
| Risk events | Unverified claims, policy breaches, near misses | Incident note at each gate | Ignoring events that were caught |

> **Exam note:** An option that measures success by the number of outputs generated is almost always a distractor. The exam favours measures tied to accepted work and to the cost of fixing errors.

### Establishing a baseline

A baseline is a measurement of the current method taken before the change is introduced. It gives the improvement a reference point. Without it, a team can only say that the new workflow felt faster, which is exactly the sort of claim a stakeholder should question. The baseline should use the same definitions as the pilot. If cycle time in the pilot runs from request to acceptance, the baseline must use those same events rather than from drafting to sending.

A baseline should also capture variation. An average alone can hide a wide spread: most reports may take a short time while a few take much longer, and those few may be the ones that matter most. Record the range and note the conditions behind the slow cases. This is especially important when the workflow will be used on messy inputs. A pilot that improves the easy cases while making the difficult ones worse has not delivered value.

Where possible, run the old and new methods on comparable work. If the input mix differs, say so in the readout. A claim of improvement across a harder set of cases is stronger than a raw comparison, but it must be explained. Honest comparison builds more trust than a clean-looking number with a hidden difference behind it.

Document who collected the baseline, from which records, and over what period. A number without a collection trail is easy to challenge and hard to defend. The same record should note unusual events during the baseline window, such as a staffing change or a system outage, because those events may explain a spike that would otherwise distort the comparison.

### Measuring quality without pretending it is objective

Quality is partly judgment, so the method matters more than the label. Use a rubric with defined criteria and anchors: what a pass looks like, what a partial score looks like, and what a failure looks like. Apply it to a sample chosen to represent the real mix of work. If two reviewers score the same output differently, that is not a problem to hide; it shows which criterion needs a clearer definition.

Blind review helps where it is practical. A reviewer who knows which outputs came from the new workflow may be more generous, particularly if they were involved in designing it. Removing that information, even for part of the sample, makes the comparison more credible. Where blinding is impossible, acknowledge it as a limitation.

Anchors matter because words such as "good" mean different things to different reviewers. Define a passing answer as one that addresses every requested part, cites a source for each checkable claim, and keeps caveats attached. Define a failing answer as one with an unsupported figure or a missing section. The space between those two definitions can be illustrated with examples from the sample, which makes later scoring faster and more consistent.

Quality measurement should include verification coverage, not just how polished the output reads. A report can be well structured and still contain an unsupported figure. Count the claims in the sample, record which ones were checked against a source, and note which checks found a problem. A workflow that produces more claims but checks fewer of them is increasing risk, even if its quality score rises on presentation.

### Communicating value in time, quality, and risk

Stakeholders rarely want the raw metric table. They want to know what changes for them. Translate the results into three languages: time, quality, and risk. Time means elapsed work and waiting, not the number of generated words. Quality means fewer corrections and more claims that pass a check. Risk means which controls remain with people and which unverified claims were caught before distribution.

Different stakeholders need different evidence. A finance-oriented reader cares about effort and rework. A risk-oriented reader cares about verification coverage and the review gate. An operational reader cares about whether the workflow fits the real sequence of work. Presenting the same table to all three wastes the opportunity to answer their actual question.

| Stakeholder concern | Evidence to present | Claim to avoid |
| --- | --- | --- |
| Does this save effort? | Baseline and pilot cycle times with the same start and end events | "It is much faster" without figures |
| Does it reduce rework? | Revision counts and reasons before and after | "Quality improved" with no rubric |
| Are the facts reliable? | Verification coverage and the checks that found errors | "The assistant checks everything" |
| What is the policy position? | The relevant policy reference and the owner of the decision | A personal assurance about compliance |
| What could go wrong? | Named failure modes and the gate that catches each one | "There is no risk" |
| Who is accountable? | The review owner and the acceptance record | "The tool is responsible" |

Communication should separate observed results from expected ones. "In the sampled cases, cycle time fell" is a claim that can be checked. "Every team will save the same time" is a projection that cannot. Label projections as projections and state the conditions under which they might hold. That habit protects credibility when a later rollout behaves differently.

A short example shows the difference. Instead of saying "the assistant improved reporting," say "in the sampled reports, the time from figures arriving to acceptance fell, revision rounds were fewer, and every metric carried a source; total cycle time was unchanged because the data request still waited on another team." The second version is longer but useful: a reader can see what improved, what did not, and where the next fix belongs.

### Communicating limits honestly

An honest readout names what was not tested and what the assistant cannot verify. If the pilot covered internal drafts only, say that customer-facing use was out of scope. If the source documents were supplied by a reviewer rather than connected live, say that current-state claims were not checked. A limitation stated plainly is a sign of a trustworthy report; a limitation buried in a footnote is a sign of a promotional one.

Questions about accuracy are best answered with method rather than reassurance. If a stakeholder asks whether the figures are correct, the useful answer describes which claims were checked, against which sources, by whom, and what remains uncertain. "The output looked confident" is not an answer. If a specific figure was not checked, say so and offer to check it before anyone relies on it.

Questions about policy should be routed to the policy owner rather than answered from memory. An assistant's generated summary of a policy is a convenience, not an authority. The safe response is to cite the current document, name the owner who interprets it, and record the question so that the answer can be checked. If the policy is unclear, the correct outcome is to pause the affected step rather than to guess.

> **Common mistake:** Presenting a limitation as a footnote while the headline claims a broad benefit. Readers remember the headline, so the limitation belongs beside the claim it qualifies.

### The one-page brief

A one-page brief is the document that authorises a pilot or a rollout. It is short because a busy reader must be able to decide from it. It states the goal in a sentence, describes the use case, lists non-goals, defines the metrics and acceptance criteria, names the review owner, and records the decision requested. Non-goals are the most commonly omitted and the most useful: they stop the scope from expanding quietly during the pilot.

The brief should also state the boundaries of the data and the sources. If the workflow will not access customer records, say so. If it will not send messages, say so. These statements make the risk discussion concrete and prevent a reader from assuming capabilities that were never intended. A brief that names what the assistant will not do is often more reassuring than one that lists features.

```text
One-page brief outline

Goal:
  One sentence describing the problem being addressed.

Use case:
  Trigger, input, steps, output, and the person who accepts it.

Non-goals:
  - What the workflow will not do
  - Which systems and data are out of scope

Metrics and acceptance criteria:
  - Cycle time: baseline ___, target ___
  - Rework: baseline ___, target ___
  - Quality: rubric score floor ___
  - Guardrail: no unverified external claim may be distributed

Review owner:
  Role responsible for each gate and for the final acceptance.

Decision requested:
  Approve pilot / extend pilot / stop / roll out with conditions.
```

### The pilot readout and follow-up

The readout is shorter than the analysis behind it. It answers the question the briefing asked, shows the comparison, states the limits, and recommends a decision. A useful structure is question, method, result, limits, recommendation. Adding a short "what we changed during the pilot" note helps a reader interpret the version that was tested. If the workflow was revised midway, the readout should say which version produced which results.

The recommendation should match the evidence. If quality held but time did not improve, recommend against rollout for now and identify the bottleneck to investigate. If time improved but verification coverage fell, recommend keeping the human gate and re-testing. A recommendation that ignores an unfavourable result damages trust more than a plain statement that the pilot was inconclusive.

Follow-up means recording the decision and assigning the next action. A readout that ends with general agreement but no owner tends to be forgotten. Record who accepted the result, what will happen next, and when the workflow will be reviewed again. If the decision is to stop, record why; a future proposal should not have to rediscover the same finding.

The decision record should also note which audience received which version of the readout. A steering group may have seen the recommendation first, while peer reviewers saw the method in full. Keeping that map prevents a later reader from assuming that everyone saw the same evidence. It also supports the editing rule that adaptation may change emphasis but not numbers or caveats.

```text
Pilot readout outline

1. Question: what decision was the pilot meant to inform?
2. Method: sample, baseline, metrics, reviewers, workflow version.
3. Result: time, rework, quality, verification coverage, with the baseline beside each.
4. Limits: what was not tested, what could not be verified, what changed midway.
5. Recommendation: proceed, extend, stop, or proceed with conditions.
6. Decision record: owner, date, next action, and review date.
```

The same readout can be adapted for different audiences using the editing skills developed earlier. A decision maker receives the recommendation and the trade-off first. A peer receives the method and the sample details. A customer-facing summary states what will change for them and what will not. Across all versions, the numbers and the caveats must remain the same.

## Worked scenario

An analyst runs a pilot of an assistant-supported draft for a weekly internal report. Before starting, the analyst writes a one-page brief with a clear goal: reduce the time from figures arriving to an accepted report. The non-goals are explicit: no customer-facing use, no access to live account systems, and no authority to update records. The metrics are cycle time, revision rounds, a rubric quality score, and verification coverage. The review owner is named as the team lead.

The baseline is collected over several weeks using the same start and end events that will be used in the pilot. It shows that drafting is quick but that reports often return for correction because figures lack source references. The analyst therefore sets a guardrail: no unverified external claim may be distributed, and every metric in the final report must carry a source. Quality must not fall below the baseline score.

The pilot uses a small sample that includes a week with a missing input and a week with conflicting figures. Results show shorter drafting time, a modest reduction in revision rounds, and a quality score within the floor. Verification coverage improves because the template requires a source column. However, total cycle time barely changes, because the handoff delay identified in an earlier process map remains.

At the readout, a stakeholder asks whether the figures in the report are definitely correct. The analyst does not answer with reassurance. They explain that every metric in the sampled reports was traced to a source, that one conflict was escalated to the data owner, and that current account state was never claimed because live systems were out of scope. When asked about the organisation's policy on generated content, the analyst cites the current policy document and names the owner who interprets it, rather than offering a personal view.

The recommendation matches the evidence. The analyst proposes extending the pilot with a change to the data request, because the remaining delay is a handoff issue rather than a drafting issue. The readout states that customer-facing use was not tested and should not be inferred from the result. The decision record names the owner of the data-request change and sets a review date.

The outcome is a credible proposal rather than a triumphant announcement. The team can show where time was saved, where it was not, which checks worked, and what remains untested. Because the limitations sit beside the claims, stakeholders can judge the recommendation on its merits.

> **Try it:** Write a short readout for a task you have tried with an assistant. Use the question, method, result, limits, recommendation structure, and include one baseline figure beside each result.

## Common mistakes

- Announcing a benefit before defining what would count as improvement.
- Measuring generated output rather than accepted work.
- Comparing a pilot against a baseline collected with different definitions.
- Reporting an average without noting a wide spread or difficult cases.
- Scoring quality by impression instead of a stated rubric.
- Hiding a limitation in a footnote while the headline makes a broad claim.
- Answering an accuracy question with confidence instead of a description of the checks performed.
- Treating a generated summary of a policy as an authoritative interpretation.
- Recommending a rollout when the pilot only supports a limited extension.
- Ending a readout without a decision record and a review date.

## Chapter summary

- Define metrics, thresholds, and guardrails before seeing pilot results.
- Cycle time, rework, and rubric-based quality are more useful than output volume.
- A baseline with matching definitions makes improvement demonstrable.
- Quality measurement should include verification coverage, not just presentation.
- Translate results into time, quality, and risk for decision makers.
- State limits beside claims, and answer accuracy questions with method.
- Route policy questions to the policy owner and record the answer.
- A one-page brief and a short readout turn a pilot into a decision with an owner.

## Checkpoint questions

1. Which set of measures best reflects the value of an assistant-supported workflow?

- A. Number of prompts, words generated, and documents produced.
- B. Cycle time, rework rate, and rubric quality with verification coverage.
- C. The length of the final report and the number of headings.
- D. The stated confidence of the assistant after each run.

2. Why must a baseline be collected before the pilot?

- A. It gives the improvement a reference point using the same definitions.
- B. It removes the need for a review owner.
- C. It guarantees that the pilot will succeed.
- D. It replaces the acceptance criteria.

3. A pilot improves drafting time but leaves total cycle time unchanged. What is the best interpretation?

- A. The workflow is useless and should be abandoned.
- B. The extra time is likely elsewhere, such as a handoff, so investigate it.
- C. The results must be incorrect.
- D. The quality score should be ignored.

4. How should a stakeholder's question about whether the figures are correct be answered?

- A. By saying the output looked confident.
- B. By describing which claims were checked, against which sources, and what remains uncertain.
- C. By promising that the assistant never makes mistakes.
- D. By referring to the number of words in the report.

5. What is the main purpose of listing non-goals in a one-page brief?

- A. To make the brief longer.
- B. To prevent scope from expanding quietly during the pilot.
- C. To remove the need for metrics.
- D. To transfer accountability to the assistant.

6. Which conclusion is supported by a pilot that held quality steady but reduced verification coverage?

- A. Roll out immediately without changes.
- B. Keep the human verification gate and re-test.
- C. Stop measuring quality in future pilots.
- D. Treat the output as self-verifying.

### Answers and rationale

1. Correct answer: B. These measures describe accepted work, the cost of correction, and whether claims were checked. Option A counts activity rather than benefit. Option C measures presentation. Option D treats fluency as evidence.

2. Correct answer: A. The baseline supplies the comparison point and should use the same definitions as the pilot. Option B is unrelated to measurement. Option C is not guaranteed. Option D confuses a reference point with the criteria themselves.

3. Correct answer: B. An unchanged total suggests time is spent elsewhere, such as waiting for an input, which the map may already have indicated. Option A overreacts to a partial improvement. Option C assumes error without evidence. Option D discards a relevant measure.

4. Correct answer: B. A method-based answer describes the checks and the remaining uncertainty, which the stakeholder can evaluate. Option A confuses confidence with accuracy. Option C makes an unsupported promise. Option D is irrelevant to correctness.

5. Correct answer: B. Non-goals keep the pilot bounded and prevent untested uses from being assumed. Option A is not a purpose. Option C removes a necessary part of the brief. Option D misplaces accountability.

6. Correct answer: B. Lower verification coverage with steady quality indicates that the control needs to remain and the workflow re-tested. Option A ignores a risk increase. Option C removes a useful measure. Option D mistakes generation for verification.

---

*End of chapter 16.*
