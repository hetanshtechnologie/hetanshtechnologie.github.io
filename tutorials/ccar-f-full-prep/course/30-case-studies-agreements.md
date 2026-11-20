# Chapter 30 — Case Studies: Agreements, Negotiation, and Capital

## Learning objectives

- Classify legal and financial documents by structure, sensitivity, and consequence of error.
- Match retrieval and context choices to the confidentiality level of each document.
- Define access scope so a task sees only the material it genuinely requires.
- Place human review gates where the cost of a wrong output is highest.
- Analyse trade-offs in agreement drafting, negotiation, and capital validation scenarios.
- Defend a document workflow using evidence from the scenario rather than generic best practice.

## Key concepts

### Documents are workloads, not background

In applied case studies, documents are not scenery. A contract clause, a subscription term, or a capital figure is an object with a structure, an owner, a sensitivity level, and a consequence if it is wrong. An architect who treats a document as "some text to feed the model" will miss the deciding constraints, which almost always concern authority, confidentiality, or review. The first move in a document-heavy case is to classify what is being handled.

Classify along three axes. Structure asks whether the document has a stable, machine-readable shape — a schedule of defined terms — or is mostly prose whose meaning depends on context. Sensitivity asks who may read it and what happens if it leaks. Consequence asks how expensive a mistake is and whether it can be detected automatically. These axes determine the workflow, the retrieval strategy, the access scope, and the placement of review gates.

| Document type | Typical structure | Main sensitivity | Consequence of error | Where review belongs |
| --- | --- | --- | --- | --- |
| Master agreement | Defined terms plus prose clauses | Negotiation-sensitive | Obligations misstated | Before any external circulation |
| Subscription document | Fixed fields and schedules | Investor confidential | Wrong terms or amounts | Before issuance to counterparties |
| Side letter | Short, bespoke prose | Highly confidential | Unequal terms or missed override | Before signature and after negotiation |
| Capital validation memo | Tables, ratios, methodology notes | Regulatory | Misstated capital position | Before submission to a regulator |

> **Exam note:** When a scenario mentions "which version governs" or "who approved this clause," it is pointing at authority and review, not at model capability.

### Prose, structure, and the instruction boundary

A second axis matters alongside classification: legal and financial writing often contains imperative sentences. A policy document may say "report all exceptions immediately," and a subscription form may say "complete this field before signing." Those sentences are directions to a human reader, not to the assistant. When such text enters a context window, an unprepared model can treat it as a command and change its behaviour mid-task. The scenario does not need a hostile actor for this to happen; ordinary contractual language is enough.

The fix is an explicit instruction boundary. Trusted rules come from the brief and the workspace configuration, and they stay in a part of the context that the assistant treats as authoritative. Everything retrieved from a document is data to be examined, quoted, or compared — never a source of new directions. A useful pattern is to label each retrieved passage with its origin and to restate, just before generation, that the task's rules override anything found in the documents.

Structured fields behave differently from prose. A field such as "commitment amount" has a type, a range, and a source system, so deterministic validation can check it without a model. A well-designed workflow pushes as much work as possible into these checks and reserves model judgment for genuine ambiguity — an unusual clause, a conflicting side letter, or a methodology note that changed. This split lowers cost and gives a reviewer something concrete to inspect. An answer that sends every field through a model call, including the ones a rules table could validate, ignores the cost constraint that many capital and operations scenarios contain.

> **Common mistake:** Assuming a document is safe simply because it is internal. Internal text can still contain directions the assistant must not follow.

### Local workflows and context architecture

A document workflow should be local-first when the material is confidential. Local-first means the working copy, the extraction, and the draft stay inside the controlled environment; only narrow, non-sensitive outputs cross a boundary. The orchestration layer coordinates steps: retrieve the governing document, extract relevant clauses, assemble a minimal context bundle, generate a draft or summary, run deterministic checks, and present the result at a review gate.

Context architecture decides what enters the model's window. For document work, less is more. A bundle that contains only the clauses relevant to the task, each tagged with its source and version, outperforms a dump of the entire agreement. It is cheaper, easier to check, and less likely to dilute the instruction with irrelevant text. The provenance tag is not decoration: it lets a reviewer trace each statement in the output back to a clause.

Retrieval choices interact directly with risk. Retrieval by exact defined term is precise but misses paraphrases. Retrieval by meaning catches paraphrases but may pull in a superseded version. A robust design combines both and then applies a freshness rule: among matching clauses, prefer the one marked current in the source registry. When two clauses conflict, the workflow should surface the conflict rather than silently picking one.

A baseline is another useful ingredient. When the task is to amend or review a document, the workflow should compare the new version against an agreed baseline and present only the differences. This keeps the reviewer's attention on what changed, and it gives the deterministic check a clear target: any change to a defined term must be flagged. Without a baseline, a reviewer must read everything, which is exactly the cost the scenario often asks you to avoid.

> **Common mistake:** Assuming that a larger retrieved set is safer. More context can hide the governing clause among near-duplicates and make a wrong answer look well-supported.

### Confidentiality and access scope

Access scope is the practical expression of least privilege. In a document workflow it means three things. First, the assistant's identity should be distinct from a general user account, with its own permissions. Second, the tools available to a task should be limited to what that task needs: a drafting task may need read access to a clause library but no ability to send messages. Third, the channels or spaces through which a task receives input should be segmented so that material from one matter cannot drift into another.

Channel segmentation is a form of access control, not merely organisation. If a workspace has separate areas for each matter, and the assistant is granted access only to the area relevant to the current task, then cross-matter leakage becomes structurally difficult rather than a matter of remembering. A scenario that mentions "the team works on many clients in one tool" is usually hinting that segmentation is the fix.

Confidential documents also require careful handling of outputs. A summary that quotes sensitive terms verbatim may itself be sensitive. The design should decide whether outputs stay in the same protected area and whether they may be shared. A review gate that emails a draft outside the boundary defeats the purpose of keeping inputs local.

### Human review gates

A review gate is a point where a person must approve or correct an output before it moves on. Gates are expensive in time and attention, so they should be placed where the cost of error is highest and removed where a deterministic check suffices. In agreement drafting, the highest-risk moment is external circulation. In subscription documents, it is issuance. In side letters, it is signature, because a side letter can override the main agreement. In capital validation, it is submission to the regulator.

Design a gate with three properties: a clear trigger, a complete evidence package, and a recorded outcome. The trigger states what requires review — for example, any draft that changes a defined term or any figure outside an expected range. The evidence package gives the reviewer the draft, the source clauses, and the differences from a baseline. The recorded outcome captures who approved, what was changed, and why. Without the record, the gate cannot be audited later.

Gate design should also respect human attention. A gate that fires on every trivial change trains reviewers to click through it, which is worse than no gate because it creates the appearance of control without the substance. Prefer triggers tied to consequence: a changed defined term, an out-of-range figure, a new obligation. Group related items into one package so a reviewer sees the whole decision at once. Record the outcome in a form that can be searched later, because a dispute or an audit may arise long after the review.

```text
REVIEW-GATE PLAN
Document:            Agreement / subscription / side letter / capital memo
Sensitivity:         Internal / confidential / regulatory
Trigger for review:  Changed defined term, novel clause, out-of-range figure
Evidence package:    Draft, source clauses with versions, diff from baseline
Reviewer role:       Legal lead / compliance lead / capital controller
Deterministic checks: Defined terms present, figures reconcile, citations exist
Escalation:          Conflict between sources goes to a named role, not a guess
Record kept:         Approver role, timestamp, changes, reason
Release condition:   All checks pass and gate approved
```

> **Try it:** For any document scenario, write the trigger and the evidence package before choosing a tool. The right tool becomes obvious once you know what the reviewer must see.

### Trade-off analysis

Applied questions often present two designs that both work technically. The answer depends on the trade-off the scenario privileges. A design that maximises coverage — retrieving every possibly relevant clause — trades precision for completeness and may overwhelm the reviewer. A design that maximises precision may miss an override hidden in a side letter. A capital-constrained design may accept fewer review passes in exchange for faster turnaround, but only if the missed error rate is tolerable.

State the trade-off explicitly in your answer. Say what you are giving up and why the scenario permits it. An answer that claims a design has no downside is usually wrong; every design has one, and the exam rewards candidates who can name it and show that the scenario makes it acceptable.

## Worked scenario

**Scenario A — agreement drafting under deadline.** A legal team wants an assistant to draft a first-pass amendment to a master agreement. The scenario emphasises a short deadline, a large clause library, and a preference for minimal lawyer time. A compliance lead then notes that any change to a defined term must be reviewed before the draft leaves the organisation, and that the library contains several superseded versions. Two designs: a single prompt that feeds the whole agreement and library into the window and asks for a clean draft; or a workflow that retrieves current clauses by defined term, assembles a minimal bundle with version tags, generates a draft that marks changed terms, and gates only those changes for review.

The deciding constraint is the combination of mandatory review for changed defined terms and the presence of superseded versions. The layer is workflow-and-context, with retrieval as the tool concern. The whole-library prompt fails because it cannot guarantee the current version and offers no marked changes for the reviewer. The workflow wins: freshness rules select current clauses, version tags support provenance, and the gate is limited to changed terms, which respects the preference for minimal lawyer time. A stress test that introduces a side letter overriding a defined term shows the need to search side letters as part of the current-version set; without that, the draft would cite a clause that no longer governs.

**Scenario B — subscription document issuance.** A fund operations team wants an assistant to assemble subscription documents for many investors. The scenario stresses high volume, a fixed set of fields, and confidential investor data. An architect proposes generating everything centrally with a hosted model and emailing drafts to investors. Another proposes extracting the fixed fields locally, validating them against a rules table, and routing each completed document through a review gate inside the protected area before a controlled release.

The deciding constraint is confidentiality of investor data plus the fixed-field structure. Central hosted generation with email release violates confidentiality. The local extraction design wins because sensitive fields never leave the controlled environment, deterministic validation catches missing or out-of-range fields cheaply, and the gate sits at the last point before release. The trade-off is slower turnaround than full automation, which the scenario accepts because confidentiality outranks speed. A stress probe that adds an investor with a nonstandard term shows the value of an escalation path rather than a silent substitution.

**Scenario C — side letter negotiation.** A deal team wants an assistant to compare a proposed side letter against the main agreement and flag conflicts. The scenario notes that side letters are highly confidential, that negotiations change language frequently, and that a missed override could create unequal terms. Two designs: a one-off summary prompt, or a workflow that keeps the latest negotiated version in a protected area, extracts obligations from both documents, produces a conflict list with clause references, and requires a legal lead to confirm each flagged conflict before the list is shared.

The deciding constraint is confidentiality plus the consequence of a missed override. The one-off summary fails because it has no version discipline, no structured conflict list, and no controlled sharing. The workflow wins on all three axes. Its trade-off is extra review time, justified here by the severe consequence of error. Stress testing with a side letter that refers to a definition in an external schedule reveals that the retrieval set must include linked schedules, not just the two named documents.

**Scenario D — regulatory capital validation.** A capital controller wants an assistant to help validate a capital calculation before submission. The scenario emphasises that figures must reconcile to source systems, that methodology notes change between quarters, and that the submission deadline is fixed. One design uses several review passes and a large context window to polish the narrative. Another uses a single generation pass, deterministic reconciliation checks against source tables, versioned methodology notes, and one controller gate before submission.

The deciding constraint is reproducibility of figures and version control of methodology under a fixed deadline. Polish is a soft preference. The lean design wins because reconciliation checks catch the errors that matter, versioned notes prevent use of last quarter's methodology, and a single gate fits the deadline. Stress testing with a source table that changes mid-run shows the need to freeze the input bundle at the start of the validation, so the result can be reproduced.

> **Exam note:** In every scenario, the correct design keeps sensitive material local, tags provenance, gates the highest-risk moment, and names its trade-off.

## Common mistakes

- Treating all documents as interchangeable text instead of classifying structure, sensitivity, and consequence.
- Assuming more retrieved material is safer when it actually obscures the governing clause.
- Ignoring superseded versions when a scenario mentions a clause library or changing methodology.
- Placing review gates uniformly instead of at the highest-risk moments.
- Letting a draft leave the protected area through a notification or email step.
- Forgetting that channel separation is an access control, not just a naming convention.
- Claiming a design has no trade-off rather than naming what it gives up.

## Chapter summary

- Classify documents by structure, sensitivity, and consequence before designing the workflow.
- Keep confidential material local and let only narrow outputs cross boundaries.
- Assemble minimal, version-tagged context bundles rather than dumping whole libraries.
- Use access scope and channel segmentation to prevent cross-matter leakage.
- Gate the moment of highest error cost, with a trigger, evidence package, and recorded outcome.
- Name the trade-off in every answer; the scenario decides which downside is acceptable.

## Checkpoint questions

1. A clause library contains superseded versions, and a defined-term change requires review before external circulation. Which design is strongest?

A. Feed the entire library into one prompt and ask for a clean draft.

B. Retrieve current, version-tagged clauses, mark changed terms, and gate only those changes.

C. Remove all defined terms from the draft to avoid review.

D. Review every clause in the library before drafting anything.

2. Which axis is least relevant when classifying a document for an agent workflow?

A. Structure of the document.

B. Sensitivity of its contents.

C. Consequence of an error.

D. Popularity of the document format in trade publications.

3. Why is channel segmentation considered an access control?

A. It makes messages look more organised to readers.

B. It structurally limits which matter's material a task can reach.

C. It increases the size of the context window.

D. It removes the need for any review gate.

4. Where should a review gate sit for a subscription document workflow?

A. Immediately after the assistant starts, before any extraction.

B. After every model call, regardless of risk.

C. At the last point before controlled release of the completed document.

D. Never, because fixed fields cannot be wrong.

5. A side letter refers to a definition in an external schedule. What does this reveal about retrieval?

A. That retrieval should include linked schedules, not only the two named documents.

B. That retrieval is unnecessary for short documents.

C. That the schedule should be deleted to simplify the task.

D. That the model should guess the missing definition.

6. In a capital validation case with a fixed deadline and reconciliation requirements, which element matters most?

A. Maximising the polish of the narrative prose.

B. Deterministic reconciliation to source tables and versioned methodology notes.

C. Adding as many review passes as the window allows.

D. Using the longest possible context window.

### Answers and rationale

1. Correct answer: B. It selects current versions, preserves provenance with version tags, and focuses the gate on the exact change the scenario requires, respecting the preference for minimal review. A fails because it cannot guarantee currency and provides no marked changes. C fails because removing defined terms destroys the agreement's meaning. D fails because reviewing every clause ignores the minimising preference and is not required.

2. Correct answer: D. Popularity in publications has no bearing on workflow design. Structure, sensitivity, and consequence directly determine retrieval, access scope, and gate placement.

3. Correct answer: B. Segmenting channels restricts which matter's material is reachable, which is a structural access control. A is cosmetic. C is false; segmentation does not enlarge a window. D is false; gates are still needed.

4. Correct answer: C. The highest-risk moment is release of a completed subscription document, so the gate belongs there. A is too early to be useful. B is wasteful and ignores risk-based placement. D is wrong because fixed fields can still be wrong.

5. Correct answer: A. An external reference means the retrieval set must include linked schedules to find the governing definition. B is wrong because short documents can still hide overrides. C and D are wrong because deleting material or guessing destroys correctness.

6. Correct answer: B. Reconciliation and version discipline address the deciding constraints of accuracy and reproducibility under a deadline. A is a soft preference. C and D add cost without improving the required evidence.

---
*End of chapter 30.*
