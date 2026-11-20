# Chapter 15 — Designing Repeatable Workflows and Templates

## Learning objectives

- Define a workflow precisely enough that a colleague can follow it without re-deciding the prompt.
- Separate fixed report sections from the variable inputs that fill them.
- Keep stable instructions apart from changing data in a reusable template.
- Version a workflow and record why each change was made.
- Map an existing process before automating any part of it.
- Design a small pilot with a baseline and clear success criteria.
- Recognise when a spreadsheet or rule-based tool is a better answer than an assistant.
- Set a maintenance cadence and an owner for a shared template.

## Key concepts

### What makes a workflow repeatable

A workflow is repeatable when a colleague can run it without re-deciding the prompt. That is a demanding standard. It means the purpose, trigger, inputs, steps, checks, output format, owner, and failure route are all written down before anyone starts. If a person has to guess which instruction to use, where the source data comes from, or how much review is required, the workflow is not yet repeatable. It is a set of hints.

The cost of re-deciding is easy to underestimate. Each person who rewrites the instruction introduces small differences: a different tone, a different set of fields, a different interpretation of "brief." The outputs then look inconsistent, and reviewers cannot tell whether a difference reflects new information or merely a new prompt. Standardising the instruction removes that noise, so changes in the output can be traced to changes in the input.

A repeatable workflow also states what to do when something goes wrong. The happy path is the easy part. A source file may be missing, a figure may conflict with another, or the assistant may produce a claim without a supporting reference. The workflow should say where to stop, who to ask, and how to record the exception. Without that branch, each person improvises a different recovery, and the next audit has no trail to follow.

A prompt is a single instruction; a workflow is a documented sequence. The sequence names the trigger that starts the work, the order of steps, the artefact passed from one step to the next, and the condition that ends the run. Writing it this way exposes gaps that a prompt hides. A prompt can say "write the report" without saying where the figures come from; a workflow cannot, because the first step must name its input. Documenting a workflow often improves it before any assistant is involved.

> **Exam note:** A scenario that asks whether a workflow is ready to share is usually testing whether the instructions are stable and the decision points are explicit, not whether the prompt is clever.

### Fixed sections and variable inputs

A reusable report template has two layers. The first layer is fixed: the headings, the order of information, the required fields, the tone, and the acceptance checks. The second layer is variable: the figures, dates, names of teams, and narrative details that change each time the report is produced. Confusing the two layers is the main reason templates fail. If a user edits a heading to make a figure fit, the structure drifts. If a user leaves a placeholder unfilled, the report looks complete but carries empty content.

Good templates make placeholders obvious and typed. Instead of writing "insert the relevant numbers," write "[METRIC_NAME: number with unit], [PERIOD: date range], [SOURCE: document identifier]." A typed placeholder tells the user what kind of value is expected and gives the assistant a clear slot to fill. It also makes validation possible: a reviewer can scan for brackets left in the final draft.

The fixed layer should encode decisions that were made once and should not be revisited each week. If the team has agreed that every report starts with a decision summary, that is a fixed section. If the team has agreed that figures must carry units and a source reference, that is a fixed check. Recording these decisions in the template is what saves the colleague from re-deciding them.

```text
Reusable weekly report template

Fixed instruction (do not edit per run):
  Produce a weekly service report with these sections, in order:
  1. Decision summary - two sentences, state what needs a decision
  2. Metrics - table with columns: metric, value, unit, period, source
  3. Exceptions - one bullet per exception, each with a case reference
  4. Next actions - action, owner role, due date
  5. Confidence note - what was verified and what remains unchecked
  Rules: keep qualifiers next to the claim they qualify; never invent a case reference.

Variable inputs (replace each run):
  [PERIOD]
  [SOURCE_DOCUMENTS]
  [METRIC_VALUES]
  [EXCEPTION_LIST]
  [OWNER_ROLES]
  [DUE_DATES]

Acceptance check:
  - Every metric has a unit and a source
  - Every exception has a case reference
  - No placeholder text remains
  - Reviewer: ________    Date: ________
```

Notice that the instruction block never contains this week's figures. That is deliberate. A template that mixes the two invites a user to change the wording of the rule when the data changes, which quietly creates a new version that nobody has reviewed.

### Separating the stable instruction from the changing data

The safest structure is a two-block layout: an instruction block and a data block, clearly labelled and separated. The instruction block says what to produce and how. The data block supplies the material to work on. Keeping them apart serves three purposes. It prevents accidental edits to the rules, it makes the data easy to swap, and it helps the assistant treat the supplied material as content rather than as directions.

The last point matters more than it first appears. Documents, pasted messages, and exported records can contain text that looks like an instruction. If the data block is not clearly bounded, the assistant may follow that embedded text instead of the workflow's rules. Labelling the boundary and stating that content inside the data block is evidence, not instruction, reduces this risk. A reviewer should still check any output that changes the workflow's own rules.

Separation also supports comparison. When the instruction stays constant across runs, differences in output can be attributed to differences in input. That is the basis of a useful pilot: if the same instruction applied to a known sample produces better results than the old method, the improvement is likely due to the workflow. If the instruction changed between runs, no such conclusion is possible.

| Element | Stable layer | Variable layer |
| --- | --- | --- |
| Section headings | Fixed order and wording | Never changed by the user |
| Metrics | Required field names | Values, units, and period |
| Tone and length | Fixed rule | Never negotiated per run |
| Source material | Rules for acceptable sources | The documents supplied this run |
| Acceptance checks | Fixed criteria | Reviewer name and date |
| Exceptions | Rule for escalating | The exceptions actually found |

### Versioning and change records

A workflow that is used more than once will change. The mistake is to change it without leaving a trace. A short version record should capture the version label, the date, the owner, what changed, why it changed, and the expected effect. "Added source column to metrics table because two figures were unverifiable in the last run" is useful. "Updated prompt" is not.

Changes can be semantic or cosmetic. A semantic change alters what the workflow produces: adding a required field, changing the length limit, moving a check earlier. A cosmetic change alters how the output looks without changing its content. Both deserve a record, but semantic changes deserve a re-test. A colleague should be able to reproduce the old output by retrieving the old instruction, which means earlier versions should be retained rather than overwritten.

Versioning also protects against local drift. If one team member keeps a private copy with a small tweak, outputs begin to differ and nobody knows which version is correct. A single shared location for the current version, plus a visible label in every output, solves this. Some teams ask the assistant to include the workflow version in the report footer, which makes traceability automatic.

A simple label with a short description is enough. What matters is that every run can be connected to the instruction that produced it. After a semantic change, re-run at least one known case and compare it with the previous output. If the difference is unexpected, the change was not as small as it seemed. Mark retired versions clearly so that a colleague does not pick up an old copy by mistake.

> **Common mistake:** Treating a prompt change as too small to record. A single removed qualifier can alter every future report produced by the workflow.

### Mapping the process before automating

Automation applied to a poorly understood process usually makes the confusion faster. Before designing a workflow, map what happens today. Start with the trigger that begins the work, then list each action, the role that performs it, the artefacts passed between roles, and the points where work waits. Waiting is often where time goes. A report may take only a short time to write but several days to assemble because two inputs arrive late.

A bottleneck is a step that limits the throughput of the whole process. A handoff delay is a pause between steps, often caused by unclear ownership or missing information. The two need different fixes. A bottleneck may need extra capacity or a simpler method. A handoff delay may need a named owner, a deadline, or a change in the order of work. Replacing a handoff with an assistant does not help if the delay was caused by an approver who is genuinely required.

| Process signal | What it suggests | Recommended action |
| --- | --- | --- |
| Work waits for an input from another role | Handoff delay | Name an owner and a due time before automating |
| One step takes far longer than the rest | Bottleneck | Simplify or split that step first |
| The same figure is checked repeatedly | Missing source of truth | Store the figure once with a reference |
| Outputs vary because each person writes their own instruction | Unstable workflow | Standardise the instruction layer |
| A rule decides the outcome exactly | Deterministic job | Use a rule-based tool |
| Reviewers rework the same section each cycle | Quality gate misplaced | Move the check earlier in the process |

A practical way to build the map is to walk through one recent real case with the people who touched it. Ask each person what they received, what they produced, and where they waited. Timings gathered this way are approximate but useful; the goal is the order of magnitude of the delay, not a precise average. Maps drawn from memory alone tend to omit the informal checks and repeated requests that consume the most time.

The map should include rework loops, not just the forward path. If a report is routinely sent back because the figures lack sources, the real process contains a loop that the official description omits. Adding a source check to the workflow removes the loop. Mapping is therefore not documentation for its own sake; it is how you find the change that will actually help.

### When a deterministic tool is the better answer

Not every step benefits from a language model. If the job is exact arithmetic, a spreadsheet is clearer and more reliable. If the job is applying a fixed threshold, a rule in a form or a query against a database is better. If the job is transforming a file from one defined format to another, a script with validation will beat a generated description. These tools are deterministic: the same input always produces the same output, and the logic can be inspected.

The warning sign is a task where "approximately right" is not acceptable. An assistant may produce a plausible total that is wrong by a small amount, and the error will be invisible in a fluent sentence. A formula can be checked cell by cell. High-volume, low-variation work is another signal: if thousands of identical classifications are needed, a rule or a compact classifier is usually more appropriate than a conversation.

The best designs are often hybrids. A spreadsheet computes the figures, and the assistant writes the explanation of what changed and why. A rule engine decides eligibility, and the assistant drafts the message that explains the decision to an applicant. In each case the deterministic part handles exactness and the assistant handles representation. The workflow document should state which tool owns which step, so nobody tries to use generated prose as a calculation.

### Designing a pilot with a baseline

A pilot is a controlled test of a proposed workflow on a small, representative sample. It starts with a baseline: a measurement of how the current method performs before any change. Useful baseline measures include cycle time, the proportion of outputs needing rework, and a simple quality score against agreed criteria. Without a baseline, a later improvement cannot be demonstrated; a team may feel that things are better without being able to show it.

The sample should reflect the real mix of work, including awkward cases. A pilot that uses only clean examples will flatter the workflow and fail when it meets reality. Include cases with missing fields, conflicting sources, and unusual formats. The sample need not be large, but it should be chosen deliberately rather than taken from whatever is easiest to find.

Success criteria must be written before the pilot begins. If the goal is to reduce rework, state what reduction counts as meaningful. If the goal is to preserve quality while saving time, state the quality floor that must not be crossed. Running the old and new methods in parallel on the same sample gives the cleanest comparison, though it costs more effort. Where that is impossible, use similar batches and record the differences honestly.

Record observations during the pilot, not just final scores. Note which steps people hesitated over, which placeholders were left blank, and which outputs a reviewer would have questioned. These notes explain a result better than a score alone. If the outcome is ambiguous, extend the sample or narrow the claim rather than declaring success. A pilot that ends with "we need more evidence" is still useful; it prevents a weak workflow from being rolled out on enthusiasm.

### Maintenance cadence and ownership

Templates age. A policy changes, a field becomes obsolete, a source document moves, or an example that once clarified a rule now misleads. A maintenance cadence prevents slow decay. A light review at a regular interval, plus an event-driven review whenever a source changes, is usually enough. The review checks whether the fixed layer still reflects current rules and whether the variable layer still has all the inputs it needs.

Every shared workflow needs an owner. The owner is the person who approves changes, keeps the version record, and decides when a template should be retired. Without an owner, updates happen informally and the current version becomes a matter of opinion. Deprecation matters too: an obsolete template should be marked as such rather than left where someone might find and reuse it.

Signals that maintenance is due include a rise in unfilled placeholders, repeated reviewer comments about the same section, and workarounds that people have invented locally. Each signal suggests that the template no longer matches the work. The right response is to investigate and then update the version record, not to tell users to be more careful.

The review itself can be short: check one recent output against the current instruction, confirm the source list is accurate, and look for local copies in use. Record the result in the version log even when no change is needed, because a dated check tells the next owner when the template was last confirmed.

## Worked scenario

A team lead asks an analyst to make the weekly service report less painful. The analyst begins by mapping the current process rather than rewriting the prompt. The map shows that the report itself takes a modest amount of time to draft, but it waits two days for figures from another team. Two of those days are pure handoff delay, caused by an unclear request for data. The report also comes back for revision most weeks because the figures lack source references.

The analyst decides not to automate the waiting step. The data owner is genuinely required, so the fix is a named request with a due time and a clear field list, not an assistant. The part worth standardising is the drafting: once the figures arrive, the instruction and structure are the same every week. The analyst writes a fixed instruction with five sections, typed placeholders for the variable inputs, and an acceptance check that requires a unit and source for every metric.

Before introducing the template, the analyst measures a baseline over several cycles: the time from figures arriving to a report being accepted, the number of revision rounds, and the count of figures without sources. Then the analyst pilots the template on a small sample that includes one week with a missing figure and one with a conflicting source. The pilot shows fewer revision rounds but no improvement in the handoff delay, which confirms the map was right about where the problem sat.

During the pilot, a reviewer points out that the confidence note is too easy to skip. The analyst adds a rule that the note must name at least one checked item and one unchecked item, records the change as a semantic revision with a reason, and re-runs the sample. The version label appears in the report footer, so a later reader can tell which instruction produced it. The old version is retained rather than overwritten.

Finally, the analyst sets a maintenance cadence and names an owner. The template will be reviewed at a regular interval and whenever the source report format changes. The data request is given its own owner and deadline. The result is a workflow a colleague can follow without re-deciding anything: the instruction is fixed, the inputs are labelled, the checks are explicit, and the failure route is written down.

> **Try it:** Take a report you produce more than once. Write the fixed sections, list the variable fields with their types, and add one acceptance check that can be answered with yes or no. Give the result to a colleague and ask them to run it without further explanation.

## Common mistakes

- Automating a process before mapping where the work actually waits.
- Treating a handoff delay as a prompting problem.
- Embedding this week's figures inside the instruction that will be reused next week.
- Leaving placeholders vague, so users supply values in inconsistent formats.
- Overwriting an old workflow version instead of retaining it for comparison.
- Recording a version change without saying why it was made.
- Piloting only on clean examples and then wondering why the workflow fails in real use.
- Measuring output volume instead of rework and quality.
- Using generated prose to perform exact arithmetic or apply a fixed rule.
- Letting a shared template have no named owner.

## Chapter summary

- A repeatable workflow lets a colleague run the task without re-deciding the prompt.
- Report templates separate fixed sections and rules from variable inputs.
- Two-block layouts keep the stable instruction apart from changing data and reduce confusion about authority.
- Version records capture what changed, why, and what should be re-tested.
- Process mapping reveals bottlenecks and handoff delays before automation begins.
- Deterministic tools should own exact calculations and fixed rules; assistants handle representation.
- Pilots need a baseline, a representative sample, and success criteria agreed in advance.
- Shared templates need an owner, a maintenance cadence, and a clear deprecation path.

## Checkpoint questions

1. Which sign best indicates that a workflow is not yet repeatable?

- A. It has a fixed output format.
- B. Each colleague writes a slightly different instruction before starting.
- C. It lists an acceptance check.
- D. It names an owner.

2. What belongs in the variable layer of a report template?

- A. Section order and tone rules
- B. Acceptance criteria
- C. This period's metric values and source documents
- D. The rule that every figure needs a unit

3. Why should stable instructions be kept apart from changing data?

- A. So the data can be swapped without editing the rules.
- B. So the output can be made longer.
- C. So the reviewer does not need to read the report.
- D. So the workflow has no version record.

4. A process waits two days for figures from another team. What is the best first response?

- A. Ask the assistant to estimate the missing figures.
- B. Name a data owner and a due time for the request.
- C. Remove the metrics section from the report.
- D. Rewrite the prompt to sound more urgent.

5. Which task is the strongest candidate for a deterministic tool rather than an assistant?

- A. Explaining why a metric changed in plain language.
- B. Drafting a customer-facing summary.
- C. Applying a fixed eligibility threshold to a large batch.
- D. Proposing headings for a report.

6. What must be established before a pilot begins?

- A. A baseline and success criteria.
- B. A final decision to roll out everywhere.
- C. A version label for every participant.
- D. A replacement for the current process owner.

### Answers and rationale

1. Correct answer: B. Different instructions mean people are re-deciding the prompt, which produces inconsistent outputs. Option A supports repeatability. Option C supports repeatability. Option D supports repeatability.

2. Correct answer: C. Values and source documents change each run, so they belong in the variable layer. Options A, B, and D are fixed rules that should remain stable.

3. Correct answer: A. Separation allows the data to change without accidental edits to the rules, and it helps keep source text in its place. Option B is not a goal. Option C removes a necessary check. Option D is the opposite of good practice.

4. Correct answer: B. The delay is a handoff problem with a genuine data owner, so ownership and timing are the fix. Option A invents figures. Option C removes needed content. Option D treats a process issue as a wording issue.

5. Correct answer: C. A fixed rule applied at volume is deterministic and should be handled by a rule-based tool. Options A, B, and D are representation tasks suited to an assistant.

6. Correct answer: A. A baseline shows the starting point and success criteria define what improvement means. Option B prejudges the pilot. Option C is administrative rather than methodological. Option D confuses ownership with measurement.

---

*End of chapter 15.*
