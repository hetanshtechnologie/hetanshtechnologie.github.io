# Chapter 12 — Judging Quality and the Human Review Line

Some answers fail loudly: a missing section, a wrong figure, a reference that cannot be found. Others fail quietly. A long response can be internally inconsistent, a summary can contradict the document it came from, and a set of judgments can lean in one direction without any single sentence being false. This chapter covers those quieter failures and the review structure that catches them. It ends where every responsible workflow ends: with a clear line marking which decisions a person must sign off.

## Learning objectives

- Detect internal inconsistency across a long answer by comparing claims that should agree.
- Identify contradictions between a summary and its source document.
- Describe bias as systematic skew and distinguish it from an isolated error.
- Recognize common sources of skew, including framing, omitted groups, and loaded wording.
- Design a bias probe that changes surface details while holding substance constant.
- Distinguish a factual error from a value judgment and respond to each appropriately.
- Decide which outputs require human sign-off and explain why.
- Build a review ladder from a light check to a full review, document it, and know when to escalate.

Each objective corresponds to a question an exam scenario can ask about a response that reads well but should not be accepted unexamined. Quality is treated here as a set of observable properties, not an impression of polish, and review as a designed process with named depth, named owner, and recorded outcome.

## Key concepts

### Quality is more than correctness

A response can pass a fact check and still be poor work. It may answer a slightly different question, arrange its points so the main conclusion disappears, or apply a standard unevenly across the options it discusses. Quality in this chapter means four things working together: factual support, internal coherence, fair treatment of the alternatives, and fitness for the decision the reader must make.

These properties interact. A factual error can create an inconsistency elsewhere in the same answer. A biased frame can cause a reviewer to overlook a missing fact. A well-formatted answer can make an uneven comparison look rigorous. For that reason, quality review is not a single final glance; it is a set of distinct checks, each targeted at a different way an answer can mislead.

> **Exam note:** When a scenario describes an answer whose facts are individually sourced but whose conclusion does not follow from them, the problem is coherence, not verification of individual claims.

### Internal inconsistency across a long answer

A short answer is easy to hold in mind. A long one is not. Inconsistency appears when two parts of the same response make claims that cannot both be true: an opening paragraph says a policy applies to all teams and a later paragraph describes an exception; a table totals figures that the prose describes differently; a recommendation assumes a constraint that an earlier section said was removed.

The technique for catching this is cross-reference rather than rereading. Pick the key quantities, dates, definitions, and conditions, and write down every place each appears. Then compare the appearances. If the same term shifts meaning between sections, normalize it. If two numbers claim to describe the same thing, trace both to their origins. If a condition appears in the analysis but not in the recommendation, decide which one the reader should follow.

Inconsistency often arises because the answer was assembled from several prompts or several source documents with different assumptions. That is a strong reason to carry definitions forward explicitly in a chain, as discussed earlier. A reviewer who finds an inconsistency should not simply repair the sentence; they should ask which earlier step introduced the competing assumption.

A useful habit is to write a one-line "facts of this decision" statement before reviewing: the scope, the time frame, the units, and the conditions that apply. Every part of the answer can then be compared against that statement. The line is not a new source of truth; it is a reference point that makes contradictions visible when different sections silently adopt different versions of the same premise.

### Contradictions between a summary and its source

A summary is a compressed representation. Compression can change meaning without changing any individual word, especially when a condition is dropped. A source may say that a measure applies in a specified circumstance; the summary says it applies. A source may present a range; the summary presents the midpoint. A source may describe an intention; the summary describes an outcome.

Checking for contradiction means reading the summary and the source side by side with three questions. Does every qualification in the source survive? Does the summary claim more certainty than the source supports? Does the summary reverse the direction of a relationship, turning an association into a cause or a risk into a certainty? These questions target the transformations that compression produces.

When a contradiction is found, the summary should be rewritten from the source rather than patched. Patching leaves the original structure in place, and that structure is what caused the distortion.

### Bias as systematic skew

An isolated error points in no particular direction. Bias is a pattern: the same kind of error recurring across many claims, consistently favouring one option, group, or interpretation. The distinction matters because a single wrong sentence can be corrected locally, while a skew requires the frame to be rebuilt.

A reviewer looks for pattern by asking what the answer never says as much as what it says. Which option receives the most detail? Which group is named and which is described only in aggregate? Are drawbacks distributed evenly, or concentrated on one alternative? Are the criteria applied with the same strictness throughout? One lopsided paragraph may be a choice of emphasis. Ten lopsided paragraphs are a frame.

Bias in an assistant response does not require an intent to mislead. It can arise from the material supplied, from the way the request was phrased, or from patterns learned during training. Its effect is the same: the reader receives a distorted picture while every sentence may be defensible on its own. That is why the test is comparative rather than accusatory.

### Common sources of skew

| Source of skew | How it appears in an answer | Useful probe |
|---|---|---|
| Training patterns | Familiar cases described in detail, unusual cases compressed | Ask for an equal treatment of typical and atypical cases |
| Request framing | The prompt praises one option before asking for a comparison | Restate the request neutrally and compare the two answers |
| Omitted groups | An analysis that names some stakeholders and aggregates the rest | Ask which groups are absent from the account |
| Loaded wording | One option called pragmatic, the other called risky | Replace labels with neutral descriptors and reread |
| Unstated baseline | A claim of improvement with no stated starting point | Ask what the comparison is measured against |

Framing deserves particular attention because it is often introduced by the requester without realising it. A prompt that asks why one option is preferable already assumes a preference. A prompt that asks for the risks of a single proposal will produce a different picture from one that asks for the risks of all proposals. The reviewer's job is to notice that the frame came from the question and to restate the question when fairness matters.

Loaded wording works quietly. Describing one option as ambitious and another as reckless conveys a judgment before any evidence is presented. Replacing those words with neutral descriptions does not change the facts, but it often changes how the evidence is read.

Omission is the hardest source of skew to see, because it leaves no visible trace. An answer that names three affected groups and discusses two has simply given less attention to the third. The reviewer has to bring the missing group into view by asking who is absent from the account. This is why a fairness check works better as a set of standing questions than as a careful reading: careful reading follows the text the assistant supplied, while the questions reach beyond it.

### Testing for bias with a probe

The cleanest test changes surface details while holding substance constant. If a conclusion depends on which option is listed first, or on which label is attached to a group, the conclusion is not resting on evidence. A bias probe asks the assistant to produce variants and then to report where its own evaluation shifted.

```text
BIAS PROBE
Take the passage below. Produce two variants.
Variant A: keep every figure, date, and quotation unchanged, but reverse
the order in which the options are presented and replace evaluative labels
with neutral descriptions.
Variant B: keep the order and labels unchanged, but add one sentence for
each option that states a genuine drawback supported by the supplied
material.
After both variants, list any place where the ranking, emphasis, or
recommendation changed even though the underlying substance did not.
```

The probe is a diagnostic, not a verdict. A shift may be legitimate if the added drawback changes the evidence set. The important signal is a shift caused purely by order or wording. That signal tells the reviewer to rebuild the analysis with an explicit, symmetric rubric.

Use role names and neutral descriptors throughout the probe. Naming individuals or groups in a way that invites a stereotype defeats the purpose. The aim is to vary presentation, not to introduce new substantive claims.

### Factual error versus value judgment

A factual error asserts something that the evidence contradicts. It should be corrected, with the source named. A value judgment expresses a preference, priority, or acceptable level of risk. It cannot be corrected by looking up a document; it must be owned by a person and supported by reasons.

Confusing the two produces bad review decisions. A reviewer may argue at length with a judgment as if it were a mistake, or may wave through a factual error as "just an opinion." The practical test is whether a source could settle the matter. If it could, treat the claim as factual. If it could not, ask whose values are being applied and whether that person has agreed.

Many sentences contain both. "Option A is too risky because the estimate excludes maintenance" combines a judgment with a checkable claim. Verify the claim first. Then present the judgment as a judgment, with the verified fact as its stated reason. This separation makes disagreement productive: colleagues can accept the fact and debate the threshold.

Organizations often make this distinction concrete by defining who may set the threshold. A reviewer may be authorized to confirm that a figure is correct but not to decide that a given level of uncertainty is acceptable. When those powers are separated, the review record should show both: the fact was verified by one role, and the tolerance for risk was accepted by another.

### Which decisions need a human sign-off

Human sign-off is required when a decision carries consequence that an assistant cannot own. That includes anything affecting a person's rights or opportunities, financial commitments, legal or regulatory positions, safety, public statements, and the release of personal or confidential information. It also includes any choice that organizational policy reserves for a named role.

The reason is accountability, not distrust of the technology. An assistant has no authority to accept responsibility, no access to the full context that an accountable owner holds, and no standing to explain a decision to the people affected. A person who signs off can be asked why, can revise the decision, and can be held to the organization's standards. A generated answer cannot do any of those things.

Sign-off is meaningful only when the reviewer has the competence and the access to judge. A light acknowledgement from someone who has not opened the evidence is not a review. The depth of review must match the consequence of the decision, which is the purpose of a review ladder.

> **Common mistake:** Treating the assistant's own confidence statement as a form of approval. A phrase such as "this recommendation is sound" carries no authority and transfers no responsibility.

### A review ladder from light check to full review

A review ladder assigns depth to risk. Low-risk output gets a quick check; high-risk output gets a full review with documented evidence. The ladder prevents two failure modes: spending expert time on trivial text, and giving a cursory glance to a decision that matters.

| Output risk | Review depth | Who signs off | Evidence retained |
|---|---|---|---|
| Internal note with no external use | Light check of requested parts and obvious claims | Author | None beyond the draft |
| Summary shared within a team | Claim-level check against named sources | Author or peer | Source names and open items |
| Comparison used in a decision | Staged check, consistency pass, bias probe | Decision owner | Worksheet and review record |
| External or regulated communication | Full review against primary sources and policy | Named accountable owner | Full log, approval, and version |
| Action affecting an individual | Full review plus policy and privacy checks | Authorized role | Decision record and rationale |

The ladder is a starting point, not a substitute for judgement. An internal note that will be quoted in a public document is higher risk than its label suggests. A reviewer should raise the level when the audience, consequence, or irreversibility of the decision grows.

### Documentation and escalation triggers

Documentation answers four questions: who reviewed, what depth was applied, what was found, and what happened next. A brief record with those fields is enough for most work. It should name the sources opened, the issues found, and the disposition of each open item.

Escalation triggers are conditions that move an item to a higher level. Common triggers include a contradiction between authoritative sources, a claim that cannot be traced, a material change in wording for an external audience, a request that touches personal or regulated data, and a decision the reviewer is not authorized to make. Escalation should happen before the output is reused, not after a reader has acted on it.

Documentation and escalation work together. A record that shows an unresolved item was escalated protects both the reviewer and the reader. Without it, the next person assumes the item was checked and cleared.

The record should also state the review depth chosen and why. "Staged check because the comparison informs a resource commitment" tells a future reader more than a signature alone. If a decision is later questioned, the record shows not only who approved it but what the approval was based on and which questions remained open at the time.

## Worked scenario

A team lead asks for a comparison of two internal process options to support a decision. The generated answer is long, well organized, and fully sourced at the claim level. The first review passes the factual checks; every figure has a reference and every date matches a record. The answer still should not be signed off.

The reviewer begins with internal consistency. The opening says both options are available to every team, while a later paragraph assumes one is restricted to a pilot group. The summary table uses annual costs; the recommendation discusses monthly savings. Two incompatible pictures of the same decision are present in one document. Both are traced to different source documents that were combined without reconciling their assumptions.

Next comes a source-contradiction check. The summary says one option was approved, while the source describes approval as conditional on a review. A single qualifier was lost in compression. The summary is rewritten from the source rather than patched.

The reviewer then runs a bias probe. In the first variant, the order of the options is reversed and the evaluative labels are replaced with neutral descriptions. The answer's preferred option changes when it is listed second. In the second variant, a supported drawback is added for each option; the drawback for the previously preferred option is given less weight in the revised reasoning. The probe does not prove bad intent, but it shows that the recommendation was sensitive to presentation. The comparison is rebuilt against a symmetric rubric with the same criteria applied to both options.

A factual-versus-judgment split follows. The claim that one option excludes maintenance costs is verified against the document. The conclusion that this makes the option unacceptable is a value judgment. Both stay in the final note, but in different paragraphs, and the judgment names the person whose risk threshold it reflects.

Because the comparison will inform a commitment of resources, the review ladder places it at the staged-check level. The decision owner signs off, not the author. The review record names the sources opened, the inconsistency found, the probe results, and the one item still open: whether the pilot restriction has been lifted. That item is escalated to the process owner before the meeting.

The team lead then checks the review ladder. Because the comparison informs a commitment of resources but stays inside the organization, a staged check with the decision owner's approval is sufficient; a full external-communication review would be unnecessary. That judgement about depth is recorded alongside the findings.

The final document is longer and less polished than the first answer. It is also safe to use. A reader can see where the numbers came from, which parts are judgments, what the bias probe revealed, and who approved the result. The review did not make the assistant's output attractive. It made the output accountable.

> **Exam note:** A scenario that emphasises a decision affecting people or resources almost always calls for a named human owner, not a stronger prompt or a second generated review.

## Common mistakes

- Treating polish and structure as evidence of quality.
- Checking individual facts but never comparing claims across the answer.
- Patching a contradictory summary instead of rewriting it from the source.
- Assuming bias must be intentional to matter.
- Changing substantive facts during a bias probe and mistaking the result for a clean test.
- Arguing with a value judgment as if it were a factual error.
- Allowing an assistant's confidence language to stand in for approval.
- Applying the same review depth to a draft note and a decision that affects people.
- Recording that a review happened without recording what was found.

## Chapter summary

- Quality combines factual support, internal coherence, fair treatment of alternatives, and fitness for the decision.
- Long answers hide inconsistencies; cross-referencing key terms and quantities exposes them.
- Summaries can contradict sources by dropping conditions or increasing certainty.
- Bias is a systematic skew visible in patterns of emphasis and wording, not a single slip.
- Framing, omitted groups, loaded labels, and unstated baselines are common sources of skew.
- A bias probe varies presentation while holding substance constant to test whether conclusions are evidence-based.
- Factual errors are corrected from sources; value judgments are identified and owned by people.
- A review ladder matches review depth to risk, with documented sign-off and clear escalation triggers.

## Checkpoint questions

1. Which finding is an internal inconsistency rather than a factual error?

- A. A date that does not match the register.
- B. A reference to a document that does not exist.
- C. An opening that says a policy applies everywhere and a later paragraph that assumes an exception.
- D. A figure reported in the wrong currency.

2. A source describes approval as conditional, while a summary says approval was granted. What is the best correction?

- A. Add a hedging word to the summary.
- B. Rewrite the summary from the source so the condition survives.
- C. Keep the summary because the difference is stylistic.
- D. Ask the assistant whether the summary is accurate.

3. Which observation suggests systematic bias rather than an isolated mistake?

- A. One figure is mistyped in a table.
- B. One reference is missing a page number.
- C. Drawbacks are consistently concentrated on one option across the whole answer.
- D. A paragraph is longer than necessary.

4. What does a good bias probe hold constant?

- A. The order of options and the labels used.
- B. The figures, dates, and quoted material.
- C. The reviewer's preferred conclusion.
- D. The length of each section.

5. A sentence says an option is unacceptable because it excludes maintenance costs, and the exclusion is confirmed. How should the review treat the sentence?

- A. Correct the factual part and leave the value judgment labelled as a judgment.
- B. Reject the entire sentence as a factual error.
- C. Accept the entire sentence as fact because its premise is true.
- D. Rewrite the sentence without giving reasons.

6. Why does a decision affecting an individual require human sign-off?

- A. An assistant cannot produce a fluent explanation.
- B. A person must hold authority, accept accountability, and apply organizational policy.
- C. Generated answers are always longer than needed.
- D. Sign-off replaces the need to check sources.

7. Which condition should trigger escalation during a review?

- A. The draft uses formal language.
- B. Two authoritative sources contradict each other on a material point.
- C. The reviewer dislikes the recommendation.
- D. The answer contains a table.

### Answers and rationale

1. Correct answer: C. Two statements inside the same answer cannot both hold, which is an internal inconsistency. Options A, B, and D are claims that fail against an outside source, so they are factual errors.

2. Correct answer: B. Rewriting from the source restores the lost condition; adding a hedge still overstates what the source says. Option C treats a material change as style. Option D asks the generating source to validate itself.

3. Correct answer: C. A repeated pattern of concentrated drawbacks is a skew, not a slip. Options A and B are isolated defects. Option D concerns length, which says nothing about bias.

4. Correct answer: B. Substance must stay fixed while presentation varies; otherwise the probe tests new evidence rather than sensitivity to surface details. Option A describes what is deliberately changed. Options C and D are irrelevant to a valid comparison.

5. Correct answer: A. The exclusion is checkable and confirmed; the judgment about acceptability must be presented as a judgment with an owner. Option B discards a valid fact. Option C lets a preference masquerade as fact. Option D removes the reasoning a reader needs.

6. Correct answer: B. Accountability, authority, and policy application sit with a person. Option A is untrue and irrelevant. Option C mistakes length for authority. Option D is wrong because sign-off adds to verification rather than replacing it.

7. Correct answer: B. A material contradiction between authoritative sources cannot be settled at the reviewer's level. Options A, C, and D are matters of style or preference and do not require escalation.

---

*End of chapter 12.*
