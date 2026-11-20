# Chapter 6 — Question Design, Testing Process, and Study Strategy

## Learning objectives

- Recognize the parts of a scenario question and locate the constraint that decides it.
- Identify the main families of distractors and name the weakness in each.
- Apply a repeatable triage routine when a question feels difficult or ambiguous.
- Break a tie between two plausible options using scope, verification, and reversibility.
- Plan a two-pass approach with deliberate flagging instead of guessing under pressure.
- Build a preparation prioritizer that gives extra weight to weak layers, and use it to schedule revision.

## Key concepts

### Anatomy of a scenario question

A well-built architect question is a small compressed design review. It contains a setting, a constraint, a task, and four candidate responses. The setting describes a system, an organization, or a problem in enough detail to make the choices meaningful. The constraint is the detail that makes one response better than another: a regulation, a budget, a risk appetite, a skill limitation, or a stated prohibition. The task tells you what kind of judgment is required, such as "recommend the first change" or "identify the weakest assumption." The options are competing design moves, each plausible on its own.

Most of the setting is scene-setting, but not all of it. Exam writers hide the deciding constraint among ordinary details so that reading carefully matters. A sentence such as "reviewers must be able to trace every claim to a source" looks like background, yet it can eliminate three options at once. A sentence such as "the assistant runs overnight" may be irrelevant unless the task concerns timing. Learning to separate load-bearing detail from colour is the single most useful reading skill for this exam.

A practical reading order helps. First read the task sentence to learn what is being asked, then reread the setting looking for the constraint that the task depends on, then evaluate options against that constraint. Many candidates do the reverse: they read a long paragraph, form a favourite answer, and then interpret every option to fit it. That order invites confirmation bias. When you read the task first, you know what to hunt for in the paragraph.

Pay attention to qualifiers inside the task. Words such as "first," "least," "most likely," "before," and "except" change the correct answer without changing any technical fact. "Recommend the first change" asks for the earliest bounded intervention, while "recommend a long-term improvement" may favour a broader redesign. Underline these words. A question answered with the right concept but the wrong qualifier is still wrong.

> **Exam note:** If a scenario contains a prohibition, treat it as load-bearing. A sentence saying that the assistant may not approve, send, or delete anything is rarely decoration; an option that quietly grants that authority is almost always a distractor.

### How distractors are built

Distractors are not random. They are usually designed around a specific mistake a competent candidate might make. Recognizing the family of a distractor lets you discard it quickly and spend more time on the genuine contest.

| Distractor family | Surface signal | Why it attracts | How to defeat it |
| --- | --- | --- | --- |
| Absolute language | "always," "never," "only," "guarantee" | Feels decisive and confident | Look for qualifiers and ask whether reality admits exceptions |
| Wrong layer | Correct vocabulary from a neighbouring concern | Sounds technically sophisticated | Apply the change test and name the layer the option modifies |
| Skipped verification | Removes a check or assumes success | Appears efficient and cheaper | Ask what detects a wrong result before it spreads |
| Over-privileged access | Grants a capability the scenario withheld | Seems to remove a blocker | Compare the option against every stated prohibition |
| Polished-but-wrong output | Focuses on wording, formatting, or tone | Produces a convincing visible artefact | Ask whether the underlying information or authority changed |

Absolute language rarely survives contact with a real system. A claim that a technique ensures correctness in every case, or that a guard removes all risk, deserves suspicion. The exam rewards noticing that systems degrade and meet unanticipated inputs. Qualified wording such as "reduces the chance" fits sound engineering better.

The wrong-layer family is subtler because every option uses real terminology. An option that says "add a validation rule to the tool schema" describes a genuine design move; it may simply answer a question about loop budgets. This is where the layered model from the previous chapter earns its keep. Label each option by layer before comparing content.

Skipped-verification options trade safety for speed. They propose letting a result flow directly into an action, or trusting a draft without a check. They are attractive because the scenario often mentions cost or latency pressure, and the option seems to honour it. The counter-move is to ask where an error would be caught. If the answer is "nowhere," the apparent saving is an unpriced risk.

Over-privileged options solve a problem by granting more authority than the scenario allows, often phrased as a convenience. Compare prohibitions word for word with the capability added. A tool that "may now finalize the record" differs from one that drafts a record, even if a human usually agrees.

Polished-but-wrong options improve the visible surface: better prose, a tidier template, a friendlier tone. They are dangerous because the output of a language model is easy to judge by appearance. If the underlying facts, provenance, or authority are unchanged, a more elegant draft is not a design fix.

> **Common mistake:** Eliminating an option because it introduces a new component. Novelty is not a flaw. The question is whether the component addresses the deciding constraint with less risk than the alternatives.

### A triage routine for hard questions

When a question feels hard, the problem is usually not missing knowledge; it is an unorganized comparison. Triage converts confusion into a sequence of small checks. The routine below is short enough to remember under pressure.

```text
Hard-question triage

1. Restate the task in your own words, including every qualifier.
2. Write the deciding constraint in the margin as a short phrase.
3. Label each option with its layer and with the change it would make.
4. Cross out any option that contradicts a prohibition or uses absolute language.
5. Cross out any option that removes verification without replacing it.
6. Compare the survivors on the deciding constraint, not on general quality.
7. If still tied, prefer the smaller, reversible, testable change.
8. Commit, mark your confidence, and move on.
```

Step three stops you comparing options as moods; a concrete change can be checked against the constraint directly. Step seven is a last resort. If you reach it often, revisit your reading of the setting rather than your knowledge.

Confidence marking deserves emphasis. After committing, note whether you were certain, uncertain, or guessing. This is not a permanent judgement of the answer; it is routing information for your second pass. A confident answer should rarely be reopened without a specific new reason. An uncertain answer is a candidate for review, and a guess is certain to be reviewed.

### When two answers both look right

Ties happen because both options improve the system. The exam distinguishes them by which improvement the task actually requested. Use a hierarchy of tie-breakers rather than a coin toss.

First, return to the deciding constraint and ask which option affects it directly. An option that improves the general quality of the system but leaves the stated risk untouched is secondary. Second, prefer the smaller scope. A change that fixes the named problem without rewriting unrelated parts is easier to test, review, and reverse. Third, prefer prevention over detection when the task is about risk; a gate that catches an error before an effect is stronger than a report produced after it. Fourth, prefer the option that can be verified with evidence available in the scenario. Fifth, prefer the option that does not depend on the model remembering an instruction under pressure.

If two options remain after all five checks, the scenario may hinge on a word you skimmed. Look again at nouns: "source," "decision," "record," "draft." An option that addresses the wrong noun is a common trap. For example, a proposal to improve the wording of a decision letter does nothing for a problem with the decision itself.

> **Try it:** In revision, find an item where you were torn between two options. Write one sentence explaining what each option would change, then circle the noun from the task that only one of them touches. That noun is usually the deciding constraint in disguise.

### Time management, flagging, and the two-pass approach

A two-pass strategy protects you from spending too long on one item. On the first pass, answer every question, even if the answer is provisional. Mark confidence as you go, and flag any item where you had to guess or where two options survived triage. Do not stop to research a concept from memory; the time is better spent securing questions you can answer.

The second pass has a different purpose. You are not re-reading everything; you are revisiting flagged items with a fresh mind and using the mental warm-up from earlier questions. Occasionally a later scenario reminds you of a principle that unlocks an earlier one. Change an answer only when you can name the new reason. Switching because an option "feels different" on the second look usually replaces a considered choice with a momentary impression.

Time management is about protecting attention as much as clock time. Work in broad blocks and check your position at natural boundaries rather than after every item. If a scenario takes far longer than its neighbours, commit to a provisional answer and move on; sunk time is not a reason to spend more. Leave a final stretch for the second pass and for a mechanical check that no item was left blank.

Anxiety thrives on vague threats. Replace them with a process you can execute: read the task, name the constraint, label the options, choose, mark confidence. When attention drifts, return to the next step rather than to a judgement about your performance. A steady pause before each scenario keeps the body from hijacking the reasoning.

### A preparation prioritizer that weighs weak layers

Revision time is scarce, so treat it as an allocation problem. For each layer, record two numbers from recent practice: accuracy and confidence, each on a simple low-to-high scale. Accuracy tells you where answers are wrong; confidence tells you where a right answer was a lucky guess. A layer with low accuracy is an urgent gap. A layer with high accuracy but low confidence is a fragile strength that may collapse under exam pressure. A layer with high accuracy and high confidence needs only light maintenance.

| Layer state | Accuracy | Confidence | Priority | Next action |
| --- | --- | --- | --- | --- |
| Urgent gap | Low | Low | Highest | Rebuild concepts, then work guided scenarios |
| Fragile strength | High | Low | High | Drill timed items and explain each rationale aloud |
| Blind spot | Low | High | High | Compare your reasoning with the expected mechanism |
| Solid | High | High | Low | Short spaced review and a few mixed items |

Confidently wrong answers are the hardest to fix because the mental model is stable but incorrect. The remedy is a deliberate comparison between your reasoning and the mechanism the correct option uses. Record the difference in a decision journal; over time those notes become a catalogue of traps.

Use short, spaced sessions rather than one long crush, each with a prediction, an application, and a verification. Weigh layers by priority but include a few mixed items so you practise switching layers; the exam will not group questions by topic.

### Exam-day checklist

The `text` block below is a compact checklist to keep beside you during preparation and to recall at the start of the exam. It contains no technical content; its job is to protect the process you have practised.

```text
Exam-day process checklist

- Read the task sentence first and underline its qualifier.
- Reread the setting for the deciding constraint, including prohibitions.
- Label each option by layer and by the concrete change it makes.
- Remove absolute claims, permission breaches, and unchecked shortcuts.
- Compare survivors against the constraint; use tie-breakers only if needed.
- Mark confidence on every item and flag genuine guesses.
- Finish the first pass before reopening anything.
- Revisit flagged items with a specific new reason before changing an answer.
- Check the mechanical state: no blanks, all pages seen, time left for review.
- Keep attention on the next step rather than on a running self-judgement.
```

## Worked scenario

Consider a practice item about a procurement team. An assistant reads supplier questionnaires and drafts a risk summary for a reviewer. The team requires that every statement in the summary be traceable to a source document, and the assistant is not permitted to mark a supplier as approved. In trials, reviewers cannot tell which document supports several of the risk statements. The task asks for the most appropriate first change.

Option A proposes rewriting the summary instruction so that every bullet must include a citation. Option B proposes changing the lookup tool so each returned passage carries a source identifier and a version date. Option C proposes raising the loop's step budget so it can search more documents. Option D proposes adding a reviewer sign-off before the summary is published.

Run the triage. The task qualifier is "first," so you want the earliest bounded intervention. The deciding constraint is traceability of every statement. Option A is a prompt-layer change; it asks for a citation but does not supply a source identifier the model can use. It relies on the model remembering a rule and on source information that may not be present. Option C is an agentic-layer change that increases effort without adding provenance; more searching does not create identifiers. Option D is a workflow-layer gate, and it is a reasonable safeguard, but it checks after the summary has been drafted and does not give the reviewer the evidence needed to check efficiently.

Option B is a tool-layer change. It alters the result contract so that provenance arrives with the passage, before any drafting occurs. The change test confirms it: the tool's result shape is different. It satisfies the deciding constraint directly, improves the later review gate, and is small and testable. It also avoids granting any new authority, so the prohibition remains intact. Option B wins.

The distractor families are visible here. Option A is polished-but-wrong, Option C mistakes activity for progress, and Option D is a good safeguard that is not the first change and does not address the source. Familiarity with review gates tempts a quick choice; the layered routine prevents it.

> **Exam note:** A safeguard added later in a workflow is still valuable. It loses a "first change" question when an earlier change would make the safeguard effective. Rank by sequence, not by general merit.

## Common mistakes

- Answering from memory of a term instead of checking it against the deciding constraint.
- Ignoring task qualifiers such as "first," "least," or "before."
- Treating a confident feeling as evidence that an option addresses the constraint.
- Discarding a correct option because it introduces a component you did not expect.
- Changing answers on the second pass without a specific new reason.
- Spending equal revision time on solid layers and urgent gaps.
- Confusing a reviewer gate with prevention when the question asks for the earliest fix.

## Chapter summary

- Scenario questions combine a setting, a constraint, a task, and competing design moves; the constraint decides the answer.
- Distractor families include absolute language, wrong layer, skipped verification, over-privileged access, and polished-but-wrong output.
- Triage turns confusion into a sequence: restate, name the constraint, label options, eliminate, compare, commit.
- Ties are broken by direct effect on the constraint, smaller scope, prevention, verifiability, and fewer assumptions.
- A two-pass approach with confidence marks protects both accuracy and time.
- Preparation should weigh accuracy and confidence, with extra effort on urgent gaps and blind spots.

## Checkpoint questions

1. Which part of a scenario question most often decides the correct answer?

- A. The list of tools available in the setting
- B. The constraint embedded in the setting
- C. The length of the answer options
- D. The order in which options are printed

2. An option claims that a design "guarantees" correct results. Which distractor family does this signal most directly?

- A. Absolute language
- B. Wrong layer
- C. Skipped verification
- D. Over-privileged access

3. You are torn between two options and both seem to improve the system. What is the best first tie-breaker?

- A. Choose the option with more technical terms.
- B. Choose the option that changes the most components.
- C. Choose the option that directly affects the deciding constraint.
- D. Choose the option you recall from an earlier chapter.

4. On the first pass, what should you do with a question you cannot resolve?

- A. Leave it blank and return immediately.
- B. Commit to a provisional answer, mark it, and move on.
- C. Read every other question's options before answering it.
- D. Spend as much time as needed until certainty arrives.

5. A layer shows high accuracy but low confidence in practice. How should it be prioritized?

- A. Ignore it because accuracy is already high.
- B. Treat it as a fragile strength and drill timed items.
- C. Treat it as an urgent gap and rebuild every concept.
- D. Remove it from revision because confidence is irrelevant.

6. Which option best illustrates a polished-but-wrong distractor?

- A. A tool result that omits a required field.
- B. A proposal that grants an unstated permission.
- C. A rewritten instruction that sounds precise but supplies no new information.
- D. A step order that places review before publication.

7. During the second pass, what is a valid reason to change an answer?

- A. The option now looks more familiar.
- B. A later item reminded you of a principle that applies to the flagged question.
- C. The answer you chose appears later in the list.
- D. You feel less certain than before.

### Answers and rationale

1. Correct: B. A constraint such as a prohibition or a traceability requirement is what separates the options. A is incorrect because the tool list is usually scene-setting unless the task concerns tool design. C is incorrect because option length carries no signal. D is incorrect because printed order is arbitrary and should never influence a choice.

2. Correct: A. Absolute claims such as "guarantees" signal the absolute-language family. B is incorrect because wrong-layer distractors use plausible neighbouring terminology rather than sweeping claims. C is incorrect because skipped verification removes a check rather than promising certainty. D is incorrect because over-privileged access grants a capability the setting withheld.

3. Correct: C. The tie-breaker hierarchy begins with a direct effect on the deciding constraint. A is incorrect because technical vocabulary is not evidence. B is incorrect because larger scope usually adds risk and review burden. D is incorrect because recall of a chapter does not establish relevance to this scenario.

4. Correct: B. Committing provisionally and marking the item keeps you moving while preserving a route back. A is incorrect because blanks risk being overlooked and give no practice in deciding under uncertainty. C is incorrect because it consumes time and rarely resolves the item. D is incorrect because certainty may never arrive within a sensible time budget.

5. Correct: B. High accuracy with low confidence is a fragile strength that can fail under pressure, so timed drills are appropriate. A is incorrect because fragility still needs attention. C is incorrect because a full rebuild is disproportionate when accuracy is already high. D is incorrect because confidence affects reliability of performance.

6. Correct: C. A rewritten instruction that sounds precise but adds no information improves the surface while leaving the mechanism untouched. A is incorrect because a missing field is a concrete contract defect. B is incorrect because that is over-privileged access. D is incorrect because placing review before publication is a sound ordering, not a distractor.

7. Correct: B. A newly recalled principle that applies to the flagged item is a specific new reason. A is incorrect because familiarity is not evidence. C is incorrect because list position is meaningless. D is incorrect because a change in feeling provides no new information about the scenario.

---

*End of chapter 6.*
