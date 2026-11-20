# Chapter 18 — Workflow Design, CI/CD, and Automation

## Learning objectives

- Describe what changes when an assistant becomes a step in a delivery pipeline rather than a conversational helper.
- Treat an automated assistant step as an ordinary operation with defined inputs, outputs, and failure behavior.
- Design changes to be idempotent, small, and reviewable.
- Separate generation of a proposal from approval of the change.
- Handle secrets and permissions in automation with least privilege and short-lived credentials.
- Make acceptance depend on deterministic checks rather than on the assistant's confidence.
- Read a pipeline sketch and identify where human review, retry limits, and logging belong.

## Key concepts

### What changes when an assistant enters a pipeline

In an interactive session, a person is present to notice confusion, correct a wrong turn, and decide whether a result is good enough. In a pipeline, nobody is watching in that way. The step runs because an event occurred, produces an output, and either continues or fails. That difference dominates every design decision. An assistant in automation is not a colleague who happens to run on a schedule; it is a nondeterministic operation embedded in a deterministic system.

The surrounding system must supply the judgment the human no longer supplies in real time. The task must be framed narrowly, the output checked mechanically, and the step bounded so a bad run cannot consume unlimited time or tool calls. Every decision the assistant may not make on its own needs a gate.

This is why automation favors narrow, repeatable tasks. Generating release notes from an approved set of commits is a good fit. Deciding whether a risky architectural change should ship is not. When a scenario asks whether to automate a task, look at the cost of a wrong result and the availability of a mechanical check. Low cost plus a reliable check suggests automation; high cost plus judgment suggests a proposal that a person approves.

> **Exam note:** A pipeline cannot ask a clarifying question and wait indefinitely. If the brief is ambiguous, the step should fail clearly or take a documented safe default, not improvise.

### Treating an automated step like any other operation

A useful discipline is to describe the assistant step in the same terms you would use for a compiler or a test runner. What are its inputs? What artifact does it produce? How does the next step know whether it succeeded? Where are its logs? What happens on a timeout? A step that cannot answer these questions is not ready for automation, regardless of how impressive its interactive behavior looks.

Inputs should be explicit and minimal: a task brief, a pinned repository state, allowed files, and named reference material. Outputs should be concrete artifacts, such as a patch on a temporary branch or a structured report. A response living only in a chat transcript cannot be validated or handed onward.

Success criteria must be mechanical. The step returns a clear status, and downstream checks decide whether its output is acceptable. Logs should record the brief, the tools used, the checks attempted, and the outcome, with secrets masked. Good logs make a failed run diagnosable without re-running it. They also support review, because a reviewer can see what the step was asked to do.

Idempotency is part of being a well-behaved operation. Running the same step twice with the same inputs should produce the same effect, not two competing branches or duplicated entries. Achieve this by writing to deterministic locations, by checking for existing artifacts before creating new ones, and by expressing changes as patches that can be applied once. Where full idempotency is impossible, make duplicate runs harmless and detectable.

| Stage | Trigger | Assistant role | Deterministic gate | Human action |
| --- | --- | --- | --- | --- |
| Intake | Issue or comment | Restate the task and gather context | Brief validation | Confirm scope |
| Generation | After intake | Draft a focused patch or artifact | Format and schema checks | None |
| Verification | After generation | Summarize changes and risks | Tests, lint, path checks | Inspect results |
| Approval | After verification | Present findings | Policy check on scope | Approve or reject |
| Delivery | After approval | Write notes or changelog | Release checks | Merge or deploy |

A compact sketch shows how those stages connect and where authority changes hands.

```text
name: assistant-change

propose:
  - pin the commit and build a short task brief
  - run the assistant with read-only tools plus a patch writer
  - reject briefs that name a protected path
  - write the patch to a temporary branch and stop
verify:
  - run formatting, lint, and unit tests
  - check diff size and the path allowlist
  - scan the diff for secret patterns
  - attach results to the review request
deliver:
  - requires an approval event
  - merge the approved branch and run release checks
  - regenerate notes from the approved commit list
```

The generation stage cannot merge, the verification stage cannot approve, and delivery cannot start without an approval event. Each handoff is visible in logs.

### Idempotency and reviewable changes

Reviewability starts with diff size. A patch that touches forty files cannot be reviewed meaningfully in the time most teams have, even if every change is correct. The assistant should be instructed to keep changes focused, to avoid reformatting unrelated code, and to stop when the task expands beyond the brief. Where a large change is genuinely needed, the pipeline should split it into a sequence of small proposals, each with its own checks and approval.

Produce changes in a form that can be inspected before it is applied. A patch on a temporary branch is easier to review than an in-place rewrite. A dry run that reports what would change is easier to approve than a direct write. When the step must modify files, have it commit to an isolated branch and stop; let a later stage merge after approval. This separation means a bad generation cannot silently become a deployed change.

Idempotency and reviewability reinforce each other. A deterministic patch applied to a pinned commit is easy to compare against a previous run. A step that regenerates notes from an approved commit list will overwrite rather than append, so a retry does not duplicate entries. A step that appends to a shared file without checking will produce a different result each run, making review unreliable. When designing an automated step, ask what a second run would do before asking what the first run does.

> **Common mistake:** Allowing a pipeline step to write directly to a protected branch. Generate on an isolated branch, verify there, and promote only after approval.

### Separating generation from approval

Generation and approval are different activities and should live in different stages. Generation benefits from speed and autonomy; approval benefits from context and caution. Combining them produces either a human rubber-stamping a large diff under time pressure, or an assistant quietly applying changes that nobody examined. Keeping them apart lets each stage have its own checks and its own permissions.

A common pattern is for the assistant to open a proposal in the form of a branch or a draft change request. It attaches a short summary, the checks it ran, and any risks it noticed. Deterministic checks then run against the proposal. A person reviews the diff and the check results, then approves or rejects. Only the approval event authorizes delivery. The assistant never holds the authority to approve its own work, no matter how confident its summary reads.

The level of automation should match the risk class. Documentation fixes or generated files with strong validators may move automatically after checks pass. Changes to authentication, permissions, data migrations, or financial logic should require explicit approval from an owner and a full check run. The table below gives a practical way to think about tiers.

| Change class | Example | Generation | Approval | Automation level |
| --- | --- | --- | --- | --- |
| Low risk | Documentation typo, generated table | Assistant applies on a branch | Light or none | Automatic after checks |
| Medium risk | Refactor with strong tests | Assistant proposes patch | Required review | Semi-automatic |
| High risk | Permissions, migrations, secrets | Assistant drafts only | Owner plus full checks | Manual promotion |

### Secrets and permissions in automation

Automation often runs with stored credentials, which makes it an attractive target and a source of accidental exposure. Apply least privilege: the step receives only the permissions it needs, for only as long as it needs them, on only the resources it may touch. Prefer short-lived tokens issued for a single run over long-lived credentials stored in the repository. Separate the identity that generates a proposal from the identity that merges or deploys; the first should not be able to do the second.

Never place secrets in the task brief, the prompt, or the conversation history. If the assistant can see a secret, it may repeat it in a summary, a log, or a generated file, and once written it is difficult to recall. Pass secrets, when truly necessary, through controlled tool calls or environment variables that the assistant does not echo. Configure log masking, and add a check that fails the run if a known secret pattern appears in the diff or the output.

Permissions should also be expressed at the tool level. An assistant step that only needs to read files and write to a temporary branch should not have a deployment tool available at all. Removing the tool is stronger than instructing the model not to use it, because the prohibition then holds even if the brief is misleading. This is the same context-versus-control principle applied in a different setting: configuration describes intent, but the pipeline enforces the boundary.

### Designing for deterministic checks

The assistant's output is a candidate, not an authority. Acceptance should rest on checks whose result does not depend on language interpretation: a test suite, a linter, a schema validator, a path allowlist, or a diff-size limit. These checks provide a stable signal that a reviewer can trust and that a future run will reproduce. A checklist written in prose and evaluated by the same model that produced the change is not a deterministic check.

Design the checks before designing the prompt. Decide what a valid output looks like, how it will be validated, and what happens on failure. Then write the brief so the assistant has the information needed to pass those checks. This ordering prevents a common failure where a beautifully phrased instruction produces output that the pipeline cannot consume because nobody agreed on the shape first. Where output must be machine-readable, specify a schema and validate it before any downstream step runs.

Checks should also cover the boundaries that matter: which paths may be touched, which commands may run, which files must never change, and which patterns indicate a leaked secret. A path allowlist turns a vague restriction into a failing check. A schema turns a preferred format into a hard requirement. Each check you convert from prose to code removes a decision the assistant must make correctly and replaces it with a guarantee.

> **Try it:** Take an instruction from an automated step, such as keep changes small. Replace it with a check that fails when the diff exceeds an agreed size or touches a protected path.

### Failure handling and observability

Nondeterministic steps fail in more ways than ordinary operations. They may time out, exceed a spend limit, call a tool that returns an unexpected shape, or produce output that fails validation. Each failure needs a defined response. Retry a transient tool failure with a small budget and backoff; do not retry a validation failure that will repeat identically. Cap the number of steps and the spend for a run so that a loop cannot exhaust resources. Treat a cap reached as a visible failure with a clear reason, not a silent partial success.

Observability makes those failures manageable. Record the brief, commit, tools invoked, checks attempted, and final status, and keep that record with the proposal. Alert on repeated failures of the same kind, since these usually signal a stale skill, a changed tool contract, or a brief that no longer fits the repository.

Finally, design for recovery. A failed run should leave no ambiguous state: either no artifact exists, or one exists marked unverified. Never let a partial change appear ready for delivery. An extra clean-up step costs far less than a reviewer assuming that an unverified artifact passed checks.

## Worked scenario

A product team wants an assistant to handle routine documentation changes triggered by comments on issues. The first attempt lets the step edit the main branch directly and post a cheerful summary. It works until a run reformats a configuration file and another run appends the same changelog entry twice. The team pauses the automation and redesigns it around separate stages.

They begin with the brief. The step receives the issue text, a pinned commit, and a short project rule set drawn from configuration. It is told to change only files under the documentation directory and to produce a patch, never a commit on the mainline. The tool set available to the generation step is read-only plus a patch writer; no deployment or messaging tool is exposed. A spend limit and a step limit bound the run.

Generation writes a patch to a temporary branch. A verification stage then runs formatting, a link checker, a path allowlist, and a check that the diff stays below an agreed size. The assistant writes a short summary of what changed and which checks ran. It does not decide whether the change is acceptable. A review stage presents the diff and the check results to a team member, who approves or rejects. Only after approval does a delivery stage merge the branch and regenerate the changelog from the approved commit list.

They add failure handling next. A transient tool error retries once with a short delay. A validation failure does not retry, because repeating the same generation against the same brief would produce the same result. The run logs record the brief, the commit, the tools used, and the outcome, with secret patterns masked. When a run hits the step limit, the proposal is marked unverified and no review is requested.

A test case catches the earlier duplication problem. Running the same brief twice now overwrites the generated notes file rather than appending, so the second run produces no additional change. A test that tries to touch a protected path fails the path check before review. A third test asks for a documentation edit that requires a configuration change; the assistant reports that the brief is out of scope instead of expanding the diff. The team restores the automation with confidence that generation cannot become delivery on its own.

> **Exam note:** When a pipeline scenario shows direct writes, unlimited retries, and a model-written yes or no, the corrective design is isolation, deterministic gates, bounded retries, and a separate approval stage.

## Common mistakes

- Letting a generation step write directly to a protected or deployed branch.
- Using the model's own assurance as the acceptance check.
- Omitting a step limit or spend limit from an automated run.
- Retrying validation failures as though they were transient tool errors.
- Placing credentials in a prompt or leaving them visible in logs.
- Giving the generation step tools it does not need, then relying on prose to restrict them.
- Allowing a run to append to shared files without a strategy for duplicate runs.
- Judging a proposal by its summary instead of by the diff and check results.
- Automating a high-risk decision simply because the task repeats often.

## Chapter summary

- Automation removes the live reviewer, so the pipeline must supply framing, bounds, and checks.
- An assistant step should have explicit inputs, a concrete artifact, a clear status, and useful logs.
- Small deterministic patches on isolated branches are easier to review and safer to retry.
- Generation produces a proposal; approval is a separate event with separate authority.
- Least privilege, short-lived credentials, and tool-level restrictions protect automation.
- Acceptance should rest on tests, linters, schemas, and path checks rather than on model confidence.
- Failures need defined responses, bounded retries, and an unambiguous artifact status.

## Checkpoint questions

1. Why does an assistant in a pipeline need stronger framing than one in a conversation?

A. Pipeline steps have no live person to correct a wrong turn or resolve ambiguity.

B. Models change behavior when they run on a schedule.

C. Pipelines cannot store logs.

D. Conversation steps never need constraints.

2. Which output is most suitable for an automated generation step?

A. A confident message in a chat transcript.

B. A patch on a temporary branch with a status and logs.

C. A verbal assurance that tests passed.

D. A direct commit to the deployed branch.

3. A validation check fails on every retry of the same brief. What is the best response?

A. Retry with a longer delay until it passes.

B. Fail clearly and treat the failure as needing a changed brief or output.

C. Disable the check.

D. Ask the assistant to declare the result valid.

4. What is the strongest way to stop an automated step from calling a deployment tool?

A. Add a rule to the brief saying not to call it.

B. Mention the restriction in the project knowledge base.

C. Omit the tool from the step's available tool set.

D. Add a longer summary requirement.

5. Which change class is most appropriate for full automation after checks?

A. A change to authentication rules.

B. A data migration with irreversible effects.

C. A documented generated table with a strong validator.

D. A revision to permission scopes.

6. What makes a check deterministic in this context?

A. It is written in careful prose.

B. The model rates the output as correct.

C. It produces the same pass or fail result for the same artifact.

D. It runs only once.

7. Why should generation and approval be separate stages?

A. It lets generation be fast while approval carries caution and authority.

B. It removes the need for any checks.

C. It guarantees the assistant will never make a mistake.

D. It makes logs unnecessary.

### Answers and rationale

**1. Correct answer: A.** With no person present to notice confusion, the brief and surrounding checks must supply that judgment. B is wrong because scheduling does not change model behavior. C is wrong because pipelines can and should store logs. D is wrong because conversational work also benefits from constraints; the difference is who can recover from an error.

**2. Correct answer: B.** A patch on a branch with status and logs is an artifact the pipeline can validate and hand onward. A is wrong because a transcript cannot be checked reliably. C is wrong because assurance is not evidence. D is wrong because a direct commit bypasses review and verification.

**3. Correct answer: B.** A repeatable validation failure will not be fixed by retrying the same inputs, so the run should fail clearly and prompt a change. A wastes budget and time. C removes the signal that caught the problem. D replaces a mechanical check with an unverifiable claim.

**4. Correct answer: C.** Removing the tool from the available set makes the boundary mechanical rather than advisory. A is wrong because a brief is only guidance. B is even weaker, since the text must first be retrieved. D changes reporting, not capability.

**5. Correct answer: C.** A generated artifact with a strong validator and low failure cost is a good automation candidate. A, B, and D involve high-impact changes where a wrong result is expensive or hard to reverse, so they call for explicit human approval.

**6. Correct answer: C.** Determinism means the same artifact yields the same pass or fail result every time. A is wrong because prose interpretation varies. B is wrong because a model rating is not a stable mechanical signal. D is wrong because a check can run repeatedly and still be deterministic.

**7. Correct answer: A.** Separation lets generation optimize for speed while approval retains deliberate review and its own authority. B is wrong because checks remain necessary. C is wrong because no separation eliminates mistakes. D is wrong because logs are still valuable for review and diagnosis.

---

*End of chapter 18.*
