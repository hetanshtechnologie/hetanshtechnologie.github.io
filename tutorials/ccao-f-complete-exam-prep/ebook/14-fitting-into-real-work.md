# Chapter 14 — Fitting the Assistant Into Real Work and Decomposing Tasks

## Learning objectives

- Identify where an assistant adds value in a normal working day and where it cannot.
- Screen a candidate task for timing, authority, and verifiability before committing to it.
- Break a large request into ordered steps with defined inputs, outputs, and checks.
- Decide which material belongs in the conversation and which belongs in an external record.
- Place human checkpoints where a mistake would be expensive to undo.
- Distinguish augmenting a step from removing it entirely.

## Key concepts

### Assistants work on representations, not on the work itself

A useful starting point is to separate an activity from the description of that activity. An assistant can rewrite a customer message, but it does not send the message. It can summarise a set of figures, but it does not update the system that produced them. It can propose a schedule, but it cannot make a colleague available. What it handles is a representation: text, tables, code, or a structured list that stands in for something in the real world.

That distinction explains both the value and the limit. Value appears wherever work is mostly about manipulating representations: drafting, summarising, comparing, classifying, reformatting, translating between technical and everyday language, and generating options for a human to judge. A coordinator who needs five versions of an update, an analyst who needs a first pass at grouping feedback, or a reviewer who needs a checklist before reading a long document can all gain time. The assistant reduces the effort of producing a starting point.

Across a working day, the useful moments are the ones with a clear representation to work on. Early on, an assistant can turn scattered notes into an ordered agenda or reduce a long summary into themes worth reading. Before a meeting, it can draft questions and list assumptions that should be tested. During analysis, it can reformat a table, calculate a derived column, or write a first explanation. At the end of the day, it can turn rough notes into a status update. The common thread is that the input already exists as text or data and a person will judge the output. Tasks that begin with "go and find out" or "make it happen" are different in kind.

Value drops when the task depends on live state, physical action, or accountable judgment. An assistant does not know the current stock level unless someone supplies it. It should not send a payment, change a permission, or promise a delivery date on an organisation's behalf. It cannot be the person who accepts responsibility for a decision. In exam terms, an option that gives the assistant ownership of an action is usually wrong even when the wording sounds efficient.

There is a middle zone worth noticing. An assistant can prepare an action for a human to approve: a draft email, a proposed data change, a script that a reviewer can run after checking it. Preparing is not executing. The safe design keeps the boundary visible by naming the final actor in the output. "Draft for approval by the team lead" is a different artefact from "sent."

### A three-gate screen before adopting a task

Before adding an assistant to a recurring task, run three gates in order. The first is timing: does the task need information that changes faster than the material you can supply? If the answer depends on a live system reading, a cached answer is not just outdated; it can be confidently wrong. The appropriate response is either to connect a controlled source with proper permissions or to leave the task with the existing system.

The second gate is authority. Some actions are valid only when a particular role performs them: approving a credit, releasing a record, signing off a control. An assistant can assemble the evidence and draft the decision note, but the authorised person must act. If a scenario suggests that the assistant should perform the privileged step unattended, reject that option.

The third gate is verifiability. Can the output be checked against a source that the reviewer trusts? A task whose result is a matter of taste may be fine with a light check. A task whose result is a precise figure, a date, or a policy statement needs a source. If no source exists, the output is a proposal, not a fact, and it must be labelled as such.

| Task signal | Concern | Recommended approach |
| --- | --- | --- |
| Needs a live system reading | Supplied context may be stale | Keep the decision in the system; use the assistant to explain the result |
| Requires a privileged action | Authority sits with a named role | Draft the action and route it for approval |
| Depends on a precise external fact | No reliable source in the thread | Supply the source or mark the figure as unverified |
| Output is a first draft | Low cost of error, easy to rewrite | Generate, then edit for audience and accuracy |
| Output feeds a regulated record | High cost of error, needs traceability | Use a fixed template with a documented reviewer |
| Steps can be checked independently | Order is flexible | Run independent steps in parallel and combine results |

The gates are cumulative, and a failure can often be reframed rather than simply accepted. A task that fails timing might become a request to explain how a figure is produced and what could make it change. A task that fails authority can become a draft for approval. A task that fails verifiability can be limited to generating possibilities, each labelled as unconfirmed. Reframing is not a way to bypass a gate; it moves the task into a form that can pass it honestly.

> **Exam note:** A scenario that mentions "right now," "current," or "latest" is usually testing the timing gate. The correct choice often reframes the task rather than generating a better-sounding answer.

### Decomposing a large request

A single large request fails for predictable reasons. It mixes activities that need different treatment, such as research, calculation, and drafting. It gives the assistant no point at which a human can inspect progress. It also hides the success criterion: with four goals in one instruction, it is unclear which one matters if they conflict. Decomposition solves all three problems by giving each step one verb, one input, one output, and one check.

The steps should be ordered by dependency. If step two needs the output of step one, it must follow it. If two steps draw on the same source but do not depend on each other, they can run in parallel and be combined later. Parallel work is safe when the steps are independent and the combination rule is explicit. Order matters when one step's assumptions are the other step's input. A candidate who tries to draft a recommendation before verifying the figures has the order wrong, because the recommendation will inherit any error.

Granularity is a judgment. Too few steps and the checks are too broad to be useful. Too many steps and the overhead of managing them exceeds the benefit. A practical test is to imagine the point at which you would want to stop and look. Each of those points becomes a boundary. For most business requests, three to five steps are enough.

Each step should also carry its own definition of done. Extracting is finished when every field has a source reference, not when the table looks tidy. Verifying is finished when the sampled rows have been compared, not when the assistant says they match. Writing these definitions before starting prevents the common habit of treating a plausible output as a completed check. If you cannot say how you would know that a step is finished, the step is still too vague to hand over.

```text
Four-step decomposition

Request: "Prepare a monthly vendor performance brief from three internal reports."

Step 1 - Extract
  Input: the three source reports
  Output: one table of agreed fields with units
  Check: every field has a source reference

Step 2 - Verify
  Input: the table from step 1
  Output: confirmed figures plus a list of discrepancies
  Check: a human compares a sample against originals

Step 3 - Interpret
  Input: confirmed figures
  Output: classified exceptions and short findings
  Check: each finding links to at least one confirmed figure

Step 4 - Draft
  Input: findings and the house template
  Output: the brief with a recommendation
  Check: reviewer sign-off before distribution
```

The four verbs are deliberately different. Extracting is mechanical. Verifying is evidential. Interpreting is judgment. Drafting is composition. Mixing them into one instruction would blur the checks, because a human cannot verify a sentence and a calculation in the same glance.

### Conversation versus external record

A conversation is a good place to think. It holds the evolving context, the interim versions, and the reasoning that led to a choice. It is poor at being a system of record. Conversation history is easy to lose, hard to search consistently, and has no owner who guarantees retention. If a fact will need to be found again by someone who was not in the thread, it belongs outside the conversation.

External records include shared documents, structured tables, approved templates, and the organisation's own systems. These have names, owners, versions, and access rules. The assistant can help produce them, but once produced they should live in the place where the team expects to find them. A useful rule is that the conversation holds working material while the record holds accepted material.

| Material | Keep in conversation when | Store externally when |
| --- | --- | --- |
| Draft wording | You are still comparing alternatives | A version has been approved for use |
| Source figures | You are testing how to combine them | They must be traceable later |
| Prompt versions | You are learning what works | A workflow is shared with colleagues |
| Decisions | You are exploring options | Someone must be held accountable |
| Checklists | You are shaping a one-off review | The review will be repeated |

Project spaces and persistent knowledge features sit between these two categories. They keep context available across sessions, but they still need ownership and a maintenance cadence. Treat them as convenient working memory, not as the authoritative copy of a policy or a figure.

> **Common mistake:** Leaving the only copy of an agreed figure inside a long conversation. When the thread is archived, the team loses both the figure and the reasoning behind it.

### Human checkpoints between steps

A checkpoint is a gate with a criterion, not a polite pause. The criterion should be answerable with yes or no: do all fields have units, do the sampled figures match the originals, does each finding cite a confirmed number? Vague instructions such as "review the output" invite a reader to skim. Specific gates make it clear what a reviewer is accepting.

Placement follows the cost of error. Check early when errors propagate: a wrong extraction in the first step will contaminate every later step. Check late when the risk is in presentation: a correct analysis can still be misstated in a customer-facing draft. Check immediately before any irreversible action, such as sending a message or updating a record. The more expensive the mistake, the more formal the gate.

Lightweight review is a scan against a short list. Full review means comparing against original sources and recording the result. Between them sits a sampled check, where a reviewer inspects a subset and escalates if errors appear. Most routine work needs a sampled check plus a careful final read. Regulated or customer-visible work usually needs a full review with a record of who accepted it.

The record itself can be small. A few lines noting the step, the reviewer, the date, and the decision are enough to support an audit. Without that note, a team may know that someone looked at the output but not what they looked for. This matters when a later reader must decide whether to trust the result.

Escalation should be part of the gate design. A reviewer who finds one mismatch in a sample should not simply correct it and continue; the gate needs a rule for when to stop and inspect the whole batch. Common triggers include a mismatch in a high-impact field, a repeated error of the same kind, or a source document that contradicts the others. Writing those triggers in advance removes the pressure to decide in the moment whether a problem is serious enough to pursue.

### Augmentation is not removal

Augmentation leaves the step in place and changes who does the first pass. An analyst still checks the figures; the assistant produces a structured draft for them to check. Removal deletes the step because the assistant is assumed to handle it. Removal is appropriate only when the step's purpose was effort rather than control.

To decide, ask who notices if the assistant is wrong at that step. If the answer is nobody, the step should stay. Proofreading a customer letter may feel mechanical, but it is the point at which a wrong tone or an unsupported promise is caught. Manually copying numbers into a report may be pure effort, and a validated extraction plus a sampled check may safely replace it. The same superficial similarity hides two different risk profiles.

Removal also changes accountability. A step performed by a person carries an implicit owner. When it disappears, the owner disappears with it. Good workflow design names the owner of each remaining gate and states what the assistant contributes. That is why a workflow document should list both the automated action and the human acceptance point.

Removal tends to happen gradually. A check is skipped once because the output looked clean, then again because a deadline was tight, and eventually the step exists only on paper. Guarding against this drift means reviewing the workflow itself from time to time, not just its outputs. Ask whether each gate is still performed and whether the person named as owner would notice a wrong result. If the answer is uncertain, restore the step before it is needed.

> **Try it:** Choose a recurring task you perform weekly. Write each step as a single verb, then mark which steps create a record, which need a source, and which have a human owner. Keep only the steps where removing the human check would leave nobody to notice an error.

## Worked scenario

A coordinator asks an analyst to "take care of the customer escalation report." The phrase is ambiguous, and the analyst's first move is to restate it as a testable deliverable: a short internal brief summarising escalations from the past month, with three findings and a recommendation, due before a team meeting. The coordinator confirms that description and adds that the brief must not go to customers yet.

The analyst applies the three gates. Timing is acceptable because the source is a closed monthly record, not a live queue. Authority is fine because the analyst is preparing a brief, not acting on any account. Verifiability is good because the record is available and can be quoted. The task passes, with one boundary: nothing in the brief may claim a current account state, because the record is historical.

The analyst then decomposes the work. Step one extracts case IDs, categories, resolution status, and elapsed time into a table. Step two checks a sample of rows against the original records and flags disputes. Step three groups the disputes into themes and drafts findings, each tied to a sampled case. Step four writes the brief using the team's fixed headings and adds a recommendation. The analyst places a check after step two, because a wrong extraction would poison the findings, and another check after step four, because the brief will be read by people who may act on it.

A tempting shortcut appears at step two. The assistant offers to mark the whole table as verified because the extraction looked tidy. The analyst declines. Confidence in the presentation is not evidence that the figures match the source. Instead, the assistant is asked to produce a discrepant-row list, which a reviewer checks against the originals. That is augmentation: the human still owns verification.

The analyst also decides what not to keep. The interim prompt versions and the discarded wording stay in the conversation, where they help if a revision is needed. The confirmed table, the discrepancy list, and the final brief are saved in the shared workspace with an owner and a date. The recommendation remains labelled as a proposal until the team lead accepts it, because the analyst is not authorised to commit the team to a change.

The outcome is not merely a finished brief. It is a task shape that can be repeated next month with less re-deciding. Each step has a verb, an input, an output, and a gate. The assistant does the representation work; the people keep the authority and the record. That division is what makes the workflow safe to repeat.

> **Exam note:** When a scenario asks what the analyst should do first, look for the option that clarifies the deliverable and checks constraints before generating content. Producing an answer early is often the wrong sequence.

## Common mistakes

- Giving the assistant a task that depends on a live system reading without supplying that reading.
- Letting the assistant perform a privileged action because the draft looked routine.
- Mixing extraction, verification, interpretation, and drafting into a single instruction.
- Placing the only human check after the final draft, when an early error has already spread.
- Treating a confident presentation as evidence that the underlying figures were verified.
- Deleting a step whose real purpose was control rather than effort.
- Keeping the authoritative copy of a result inside a conversation thread.
- Running steps in parallel when one step's assumptions are the other step's input.
- Using a vague "please review" gate with no acceptance criterion.
- Assuming that a project space replaces an owned, versioned record.

## Chapter summary

- An assistant manipulates representations of work; it does not own actions or accountability.
- Screen tasks with three gates: timing, authority, and verifiability.
- Decompose large requests into single-verb steps with inputs, outputs, and checks.
- Order steps by dependency and use parallel work only when steps are independent.
- Keep working material in the conversation and accepted material in an owned external record.
- Place human checkpoints where errors propagate, where presentation matters, and before irreversible action.
- Augmentation keeps a human owner; removal is safe only when the step existed for effort, not control.

## Checkpoint questions

1. Which task is the weakest candidate for assistant support as currently described?

- A. Drafting five versions of a status update from a supplied note.
- B. Grouping a batch of feedback themes from pasted comments.
- C. Confirming the current stock level and promising a delivery date to a customer.
- D. Producing a checklist for reviewing a long contract.

2. What is the main purpose of the timing gate in the screening test?

- A. To check whether the task needs information that may be stale.
- B. To decide how formal the final document should be.
- C. To count how many steps the task will need.
- D. To choose which model tier sounds most capable.

3. Which decomposition is best for a request to produce a monthly performance brief?

- A. One instruction asking for the complete brief.
- B. Extract fields, verify against originals, interpret confirmed figures, then draft.
- C. Draft the recommendation first, then look for figures that support it.
- D. Ask for the final brief and a summary at the same time in one step.

4. When is parallel work safe?

- A. When the steps use the same source and do not depend on each other.
- B. When one step supplies the assumptions for the other.
- C. When a reviewer will check only the final output.
- D. When the task involves a privileged action.

5. Which item should be stored outside the conversation?

- A. A discarded prompt variant you may want to tweak later.
- B. The confirmed figures that a colleague will need next month.
- C. A temporary phrase you are considering for a heading.
- D. A draft you have not yet shown anyone.

6. A step exists mainly so that a person catches errors before a message is sent. What should happen when an assistant is introduced?

- A. Remove the step because the assistant writes fluently.
- B. Keep the step with a named human owner who accepts the output.
- C. Move the step after the message is sent.
- D. Replace the owner with an automated confirmation.

### Answers and rationale

1. Correct answer: C. It requires a live system reading and a commitment that only an authorised person or system should make. Option A is suitable because it is drafting from supplied material. Option B is suitable because grouping supplied comments is representation work. Option D is suitable because a checklist is a low-risk preparatory artefact.

2. Correct answer: A. The timing gate asks whether the task depends on information that changes faster than the material available. Option B concerns format, not timing. Option C concerns granularity. Option D concerns model choice, which is not what the gate tests.

3. Correct answer: B. It orders mechanical extraction before verification, verification before interpretation, and interpretation before drafting. Option A hides all checks. Option C reverses the order and invites a conclusion in search of evidence. Option D mixes two outputs into one step.

4. Correct answer: A. Independent steps can run in parallel if the rule for combining them is clear. Option B describes a dependency, so order matters. Option C removes intermediate checks. Option D introduces authority concerns that are unrelated to parallelism.

5. Correct answer: B. Accepted figures that others will reuse need an owned external record. Option A is working material. Option C is a transient idea. Option D is an unapproved draft, which can stay in the conversation until it is accepted.

6. Correct answer: B. The step exists for control, so a human must keep ownership of the check. Option A confuses fluency with accuracy. Option C places the check too late to prevent an error. Option D removes the accountability the step was designed to provide.

---

*End of chapter 14.*
