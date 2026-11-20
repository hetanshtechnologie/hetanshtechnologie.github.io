# Chapter 24 — Large Codebases, Human Review, and Data Provenance

The final context layer question is not how much text a model can hold, but how a system stays reliable when the relevant material is vast, distributed, and not entirely consistent. Large repositories and document collections have this character. No single session can contain them, and no single source within them is guaranteed to be current. This chapter connects context management to two practical disciplines: deciding how much human review a use case needs, and tracking where each fact came from.

The exam often combines these ideas in a case question. You may be given a large codebase, a proposed change, and several sources that disagree. The correct answer will usually involve selective context, delegation, review matched to impact, and provenance that makes claims checkable.

## Learning objectives

- Explain why a large repository cannot be handled by loading everything into one context.
- Describe how scratchpads and bounded delegation keep the main thread clean.
- Match the depth of human review to the failure affordance of the use case.
- Record the origin of each claim so it can be verified, updated, or challenged.
- Attach provenance metadata to retrieved material and keep it with the claim it supports.
- Detect conflicts between sources and decide how they should be resolved.

## Key concepts

### Working in a large repository

A large repository is not merely a big text file. It is a structure of modules, dependencies, generated files, historical branches, and indirect relationships. Loading it wholesale is impossible, and even loading a large fraction is wasteful, because most of it is irrelevant to any single task. The assistant must work the way a developer does: form a hypothesis about where the relevant code lives, search for symbols and call sites, read targeted sections, and expand the search when the evidence points elsewhere.

The main thread should hold a *map* of the work, not the entire territory. That map includes the task, the relevant paths, the current hypothesis, the decisions made, and the open questions. Detailed file contents belong in the context only long enough to support a decision, after which they should be distilled into notes. An assistant that keeps rereading the same large files to recover facts it already saw is spending budget on retrieval instead of reasoning.

Partial understanding is the central risk. A change made after reading three files can break a caller in a fourth that was never examined. This is not a context-size problem alone; it is a coverage problem. Good practice pairs selective reading with explicit checks for completeness: search for all references to a changed symbol, list the callers, and state what was not inspected. Honesty about coverage is more useful than an confident claim that the change is safe.

> **Exam note:** When a question describes an edit in a large codebase based on a few files, look for the answer that checks call sites or delegates a broader search, not the one that reads more of the same file.

### Scratchpads and delegation

A scratchpad is an external note space where intermediate findings are recorded. Instead of carrying every discovered detail in the conversation, the assistant writes a compact record: paths examined, symbols found, hypotheses tested, and decisions reached. The main thread then refers to the scratchpad as a stable summary. This keeps the active context small and gives later steps a reliable place to look. It also survives compaction, because it lives outside the conversation.

Delegation is the related practice of assigning a bounded investigation to a separate worker with its own context. A worker might be asked to find every call site of a function, map the responsibilities of a module, or compare two implementations. Its brief should specify the question, the scope, and the form of the answer. It returns a distilled result, not a transcript of its exploration. The main thread receives conclusions and can request elaboration if needed.

The combination is powerful because it separates exploration from decision-making. Workers explore in isolation, where their large intermediate contexts do no harm. The main thread holds only findings, which keeps attention on the overall task. Delegation also allows parallel investigations when questions are independent. Its risks are familiar: a worker may return an incorrect conclusion, may duplicate another worker's effort, or may exceed its scope. Results should therefore be treated as claims to verify, especially when they will drive an edit.

A useful rule is to delegate questions that can be answered with a short response and to keep decisions in the main thread. Searching, counting, and mapping are good delegation tasks. Choosing an architecture or accepting a risky change is not, because those decisions need the broader context the main thread is responsible for.

### Human review points and failure affordance

Not all work should receive the same human attention. The right depth of review depends on the *failure affordance* of the use case: how easily a wrong result can be noticed and undone, and how much harm it can do before anyone sees it. A generated commit message has high affordance; a bad one is obvious and harmless. A change to a permissions check has low affordance; a subtle error may persist unnoticed and cause serious harm. The more severe and less visible the failure, the deeper the review should be.

Review depth is a spectrum. At one end, automated checks alone may suffice. At the other, a formal sign-off by a responsible reviewer is appropriate. Between them are spot checks and targeted reviews of the specific areas most likely to be wrong. The design task is to place review points where they change the outcome, not to add review uniformly. A review that always happens but never influences a decision is ceremony.

A well-placed review point also has a clear object. Reviewers should be asked to examine a specific claim or change, with the evidence attached, rather than to approve an entire process. In code work, that might mean reviewing a diff with the list of call sites checked. In document work, it might mean confirming a conclusion against the source excerpts. Focused review is both faster and more reliable than broad review.

| Review depth | When it fits | Reviewer effort | Typical mechanism |
| --- | --- | --- | --- |
| Automated only | Reversible, low-impact, easily tested | None beyond checks | Validators and test suites |
| Spot check | Routine output with occasional errors | Brief sampling | Reviewer scans a subset |
| Targeted review | Specific high-risk area identified | Focused examination | Review of a diff or claim with evidence |
| Full review | Low failure affordance, meaningful impact | Detailed reading | Line-by-line or claim-by-claim check |
| Formal sign-off | Irreversible or regulated action | Accountable approval | Named approval step with record |

Notice that the table is keyed to consequence and visibility, not to the size of the output. A short change can require deep review, while a long generated summary may need only sampling.

### Tracking where facts came from

A claim without an origin is hard to trust, hard to update, and hard to defend. Provenance is the practice of recording where each fact came from: a file path, a line range, a section of a document, a database record, or a tool result. The record should be specific enough that another person could look up the same source and reach the same conclusion. A vague note such as "from the documentation" is not provenance.

It is also important to distinguish kinds of claims. A *reported* fact copies information from a source. An *inferred* fact is a conclusion drawn from several sources. An *assumed* fact is a working premise that has not been verified. Each kind deserves a label, because the appropriate treatment differs. Reported facts can be checked against the source, inferred facts can be examined for reasoning errors, and assumed facts should be tested or explicitly accepted before they drive an action.

Provenance pays off when things change. If a source file is updated, a system with provenance can identify which conclusions need revisiting. Without it, the team must assume everything might be stale. Provenance also supports disagreement: when two conclusions conflict, their source records reveal whether the inputs differed or the reasoning diverged.

### Provenance for retrieved material

Retrieval systems return chunks of text, and chunks without metadata are dangerous. A passage may come from an outdated version, a draft rather than the approved release, or a section that has since been amended. To use retrieved material responsibly, attach metadata at the moment of retrieval: a stable source identifier, the exact location within the source, a version or commit where available, and the time of retrieval. Relevance or similarity scores can be included but should not be confused with authority.

The metadata should travel with the claim it supports. A provenance log that sits in a separate file and is never updated becomes misleading. When an assistant states that a policy requires a certain step, the accompanying record should name the policy version and section. When a code change relies on an interface definition, the record should name the file and revision. This habit turns a conclusion into an auditable statement.

Not all sources carry equal weight. An approved policy outranks a draft, a release branch outranks a personal branch, and a system of record outranks a copied summary. A source-authority table or rule makes this ordering explicit so that conflicts are resolved by policy rather than by whichever passage was retrieved first.

| Source property | Why it matters | Example value |
| --- | --- | --- |
| Stable identifier | Lets a reviewer find the same material later | A repository path or document identifier |
| Exact location | Narrow the check to the relevant passage | A line range or section heading |
| Version or revision | Detects staleness and change | A commit reference or document version |
| Retrieval time | Shows whether newer material may exist | A phase label or timestamp |
| Authority level | Resolves conflicts by policy | Approved, draft, or superseded |
| Relevance score | Indicates closeness to the query, not truth | A similarity value from retrieval |

### Detecting conflicts between sources

Conflicts arise for ordinary reasons. Two documents describe the same rule at different times. A copied summary diverges from its original. Two modules encode different assumptions about a shared interface. The danger is not that sources disagree but that a system silently blends them into an answer that appears coherent. A claim assembled from incompatible sources can look authoritative while being wrong in a way nobody notices.

Detection starts with comparing claims about the same entity. If two passages give different values for the same limit, they conflict. Version metadata often explains the conflict: the older passage was superseded. When versions do not explain it, authority rules decide which source governs. If neither version nor authority resolves the disagreement, the correct response is escalation with both sources presented, not an averaging of the two.

Conflicts should be recorded, not just resolved. A provenance record that lists conflicting sources and the reason for the chosen resolution gives future reviewers the context they need. It also reveals recurring problems: if the same two sources regularly disagree, one of them may need to be corrected or retired.

> **Try it:** Take a conclusion your workflow recently produced and list every source behind it. Check the versions. If two sources disagree, notice whether the disagreement was detected automatically or only by chance.

### A provenance record format

A compact, consistent record is more useful than a long narrative. The format below is deliberately simple so it can be attached to claims in many contexts.

```text
CLAIM: "Approvals above the stated limit require a second reviewer."
SOURCE_ID: policy/approvals.md
LOCATION: section "Exceptions", paragraph 3
VERSION: document version 4, approved
RETRIEVED: during phase 2, tool = document_search
STATUS: reported
CONFLICTS: [policy/legacy-limits.md version 2, superseded]
VERIFICATION: matched against the approved version by section heading
NOTES: legacy source gives a different limit; ignored by authority rule
```

Each field has a purpose. `CLAIM` states exactly what is being asserted, which prevents a reviewer from checking a nearby but different statement. `SOURCE_ID` and `LOCATION` make the source findable. `VERSION` and `RETRIEVED` expose staleness. `STATUS` distinguishes reported, inferred, and assumed content. `CONFLICTS` records disagreements, and `VERIFICATION` says what was actually checked. `NOTES` captures the reasoning behind a resolution that might otherwise look arbitrary.

The discipline of filling these fields has a side benefit: writing a record often reveals that a claim is less well supported than it appeared. An assistant that cannot name a source for a statement should not present that statement as established fact.

## Worked scenario

A maintenance team asks an assistant to update a function in a large repository and to adjust the related documentation. The assistant searches for the function, reads the file containing it, and makes a plausible edit. Tests pass in the local module, but a downstream service that calls the function through a wrapper breaks in production. A reviewer asks what went wrong.

The investigation shows that the assistant read only the defining file. It never searched for call sites, and the wrapper lived in a different package with a name that did not match the function. The scratchpad for the task contained the edit but no map of dependencies. The assistant had also read a documentation file from a personal branch, which described the old interface, and used it to update the docs. No provenance was recorded, so nobody noticed the source was outdated until the documentation conflicted with the code.

An architect redesigns the workflow. The main thread now holds a task brief, a map of paths considered, and a decision log. Before any edit, two workers are delegated bounded questions: one lists every call site and wrapper, and one identifies the authoritative documentation source and its version. Each returns a short report with source identifiers. The main thread records these findings in a scratchpad and uses them to plan the change.

Provenance records are attached to each significant claim. The call-site list cites files and line ranges. The documentation source cites an approved location and version. When a legacy document disagrees with the approved one, the conflict is recorded and resolved by an authority rule that prefers approved material. The review point is set to targeted review because an error in this function has low failure affordance: it can pass local tests and break a dependent service later. The reviewer receives the diff, the call-site list, and the provenance records, and asks to see the one wrapper that looked unusual.

The revised change passes because the wrapper is updated as well. The documentation matches the approved source. When a later task touches the same function, the scratchpad and provenance records make the earlier investigation reusable rather than forcing a fresh exploration. The team also adds a check that flags any edit where the call-site list is missing, turning a lesson into a gate.

## Common mistakes

- Loading large files into the main context when a targeted search and a short excerpt would answer the question.
- Making an edit based on one file without searching for callers or dependants.
- Recording exploration detail in the conversation instead of in an external scratchpad, which bloats context and disappears on compaction.
- Delegating a decision rather than a bounded question, so the worker returns a choice the main thread cannot defend.
- Treating delegated findings as verified facts without checking the ones that drive risky actions.
- Applying the same review depth to every change regardless of failure affordance or impact.
- Writing provenance as vague references that a reviewer cannot locate or verify.
- Silently blending conflicting sources instead of resolving them by version, authority, or escalation.

## Chapter summary

- Large repositories require selective reading, a maintained map, and explicit checks for coverage; the main thread should hold conclusions rather than raw files.
- Scratchpads preserve findings outside the conversation, while bounded delegation isolates exploration and returns distilled results.
- Human review depth should follow failure affordance: how visible and reversible an error is, and how much harm it can do.
- Provenance records the origin of each claim, distinguishes reported from inferred and assumed content, and supports updates when sources change.
- Retrieved material should carry a stable identifier, location, version, retrieval context, authority level, and relevance signal.
- Conflicts are detected by comparing claims about the same entity and resolved by version, authority, or escalation, with the resolution recorded.
- A compact provenance format turns conclusions into auditable statements and often exposes weak support before it matters.

## Checkpoint questions

1. What should the main thread of a large-repository task primarily hold?

A. The full text of every file that might be relevant.
B. A task brief, a map of paths considered, decisions, and open questions.
C. A complete transcript of every delegated investigation.
D. Only the final diff, with no supporting context.

2. Which task is best suited to delegation?

A. Deciding whether a risky architectural change should be accepted.
B. Choosing which of two strategies the team should follow.
C. Listing every call site of a named function and returning file locations.
D. Approving a change without further review.

3. A change is easily reversible and its errors are obvious in routine output. Which review depth is most appropriate?

A. Formal sign-off with an accountable approver.
B. Full line-by-line review by a specialist.
C. Automated checks or a light spot check.
D. No checks of any kind.

4. Which provenance record is strongest?

A. "Based on the documentation."
B. "From an internal source, probably current."
C. "policy/approvals.md, version 4 approved, section 'Exceptions', paragraph 3, verified by heading."
D. "The assistant was confident about this."

5. Two sources give different values for the same limit, and version metadata does not explain the difference. What should happen?

A. Average the two values and proceed.
B. Use whichever passage was retrieved first.
C. Resolve by an authority rule if one applies, otherwise escalate with both sources presented.
D. Ignore the conflict because retrieved material is usually consistent.

6. Why distinguish reported, inferred, and assumed facts in a provenance record?

A. Because inferred facts never need checking.
B. Because each kind requires a different treatment: checking a source, examining reasoning, or testing a premise.
C. Because reported facts are always true.
D. Because the labels make records longer and therefore more authoritative.

### Answers and rationale

1. **B** is correct because the main thread needs a map and decisions, not raw material. **A** is wrong because loading everything defeats selective reading and overflows context. **C** is wrong because full transcripts reintroduce the exploration cost delegation was meant to remove. **D** is wrong because a diff without context cannot be evaluated.

2. **C** is correct because enumerating call sites is a bounded question with a short answer. **A** and **B** are wrong because architectural choices and strategy decisions need the broader responsibility of the main thread. **D** is wrong because delegation does not confer approval authority.

3. **C** is correct because high failure affordance and reversibility justify light review. **A** and **B** are wrong because they over-invest in a low-impact case. **D** is wrong because automated checks still have value.

4. **C** is correct because it names a stable source, version, exact location, and verification step. **A** is too vague to locate. **B** is uncertain about currency and therefore unverifiable. **D** confuses confidence with evidence.

5. **C** is correct because authority resolves disagreements when versions do not, and unresolved conflicts should be escalated. **A** is wrong because averaging incompatible claims invents a value. **B** is wrong because retrieval order carries no authority. **D** is wrong because conflicts are common and must be handled deliberately.

6. **B** is correct because the labels tell a reviewer what kind of checking a claim needs. **A** is wrong because inferred facts can contain reasoning errors. **C** is wrong because reported facts can be copied from a stale or wrong source. **D** is wrong because length does not create authority.

---

*End of chapter 24.*
