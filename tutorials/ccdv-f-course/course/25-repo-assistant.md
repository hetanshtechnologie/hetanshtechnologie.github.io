# Chapter 25 — Repository-Aware Coding with an Assistant

## Learning objectives

- Name the layers that make an assistant repository-aware and identify which layer caused a failure.
- Describe what the tool can read, what it can change, and where its view of the project ends.
- Start a session from a clean baseline with an explicit scope and a verifiable definition of done.
- Write an instruction file containing commands, boundaries, and conventions a reviewer can check.
- Match the working strategy to the size of the change, from a local fix to a broad migration.
- Use version control, pull requests, and review when producing and when evaluating changes.
- Run a narrowing debug loop that turns a vague failure into a specific cause.
- Explain how one model family appears across the API, libraries, agents, and the repository assistant.

## Key concepts

### Repository awareness is a system property

A model in a chat window knows nothing about the checkout on your disk. It cannot see the helper already written two directories away or the command that runs your tests. A repository assistant fills that gap with a loop. A context builder selects files, instructions, search results, and command output for the current window. The model proposes an action. A permission gate decides whether it runs, pauses for a person, or is refused. A tool carries it out, and the result returns to the window. Session state preserves the plan and the edits so later turns have continuity.

Each layer can produce a bad outcome, and the correction differs by layer. Sensible code that clashes with local conventions points to missing context. Correctly read context used for the wrong purpose points to reasoning. An edit in the wrong file points to tool targeting. Unexpected writes point to a loose gate.

| Layer | Question it answers | Failure when weak |
| --- | --- | --- |
| Context selection | What should the model read? | Existing helpers are reinvented; conventions ignored |
| Reasoning | What action should come next? | Relevant information used toward the wrong goal |
| Tool execution | How does the action happen? | Correct plan applied to the wrong path |
| Permission gate | May this action run? | Unreviewed writes or side effects |
| Session state | What happened earlier? | Repeated work and contradictory edits |

> **Exam note:** Code that compiles but ignores an established project pattern is usually a context or instruction problem. Changing the model does not supply the missing file.

### The view is assembled, not automatic

Nothing is visible to the assistant merely because it is tracked in git. Material enters the window when a tool fetches it: a named file, a listing, a search result, version-control status, an instruction file, or the output of a command that has run. Connected services can add issue text or schema details, each bringing its own trust boundary.

The window is finite, so selection is a trade-off. Too many search hits can crowd out the instruction file; a large log can hide the failing line. Naming only one file may produce a locally correct edit that breaks an unseen caller. Ask the assistant which files it consulted before it edits, and state which areas matter.

Reading and changing are separate capabilities. Navigation tools do not alter anything; writes and commands can. A command that runs tests is harmless, while a script that migrates data or publishes a package is not, yet both pass through the same permission system. Broad command access is effectively broad write access to everything the current account can reach.

> **Common mistake:** Assuming the assistant has read a file because the file exists in the repository.

### Start from a reviewable baseline

Begin with a clean working tree. Mixed personal and assistant edits make undo operations dangerous. Commit or stash your work, then create a branch dedicated to the task so the resulting diff has one obvious purpose. Commit a known-good state after each verified step; resetting to a checkpoint is cleaner than repairing a long trail of overlapping edits.

State the scope in the opening message. Name the target area, the actions that are out of bounds, and the evidence that will count as completion. A request such as "change only the billing service; leave generated clients untouched; add one unit test; report the commands you ran" gives the model usable constraints and the reviewer a checklist.

```bash
git status --short
git switch -c assistant/billing-guard
make check
```

Instruction files turn one-off reminders into durable policy. Keep them short and write commands and paths rather than aspirations. "Write clean code" cannot be checked; "run `make check` before reporting completion" can.

```text
# Working agreement for this repository

## Verify
- Install with `pip install -e .[dev]`.
- `make check` runs formatter, linter, and unit tests; it must pass before handoff.

## Do not edit by hand
- `src/api/schema_pb2.py` and everything under `build/` are generated.
- `poetry.lock` changes only through the package manager.

## House rules
- New public functions need a docstring and a unit test.
- Stay inside the module named in the request; ask before widening scope.

## Handoff
- List files changed, commands run, and anything deliberately left alone.
```

An instruction file is guidance, not enforcement. Pair a forbidden path with a hook that refuses writes there if the boundary truly matters.

> **Try it:** Change the verification command in a scratch project to one that does not exist, then ask which command the assistant plans to run. Correct the line and repeat.

### Match the process to the size of the change

The cost of a plan, a test harness, or a staged rollout should scale with the blast radius. A small edit deserves a small diff that can be read at a glance, with one concern per commit. Revert opportunistic reformatting before review, since unrelated edits hide regressions.

A broad migration deserves a different shape. Inventory affected surfaces, define the behaviour that must stay identical, and introduce a seam such as an adapter that lets old and new implementations coexist. Convert one narrow slice, run the full suite, commit, and repeat. A flag separates deploying code from enabling the new path, making rollback a configuration change. Each assistant request should stay small enough that you can predict the diff before it appears.

| Size | Example | Working approach | Main risk |
| --- | --- | --- | --- |
| Cosmetic | Rename a local variable | Direct edit in one file | Noise in the commit |
| Small behavioural | Guard a null case | Edit plus a focused test | Side effect outside the function |
| Medium | Replace a helper used by several modules | List callers, add characterization tests, update together | A caller never searched for |
| Large migration | Swap a persistence library | Adapter seam, staged conversion, verification each stage | Unreviewable diff and mixed semantics |
| Cross-cutting | Add a header to every endpoint | Enforce in middleware; prove coverage with tests | Inconsistent application |

> **Exam note:** When a question contrasts one enormous generated patch with staged conversion plus tests at each stage, choose the staged approach. Reviewability is part of correctness.

### Pull requests and two-way review

Version control supplies the memory and the safety net. The assistant can read history to understand odd-looking code, use the diff to see its own footprint, and keep experiments on separate branches. Commit messages should explain *why*; a pull request is where intent, evidence, and risk meet.

When the assistant drafts a description, treat it as a skeleton. Ask for purpose, files touched, commands executed with results, known limitations, and deliberate non-changes. Then verify each claim against the diff and a fresh test run. "All tests pass" is worthless if no test ran; naming the command and its exit status is evidence.

The assistant is also useful as a reviewer of work produced by someone else, or by itself in an earlier pass. Ask for findings tied to locations and reasons. "Review this diff" invites vague reassurance; "check every caller of `calculate_discount` for the new return type and list the files inspected" produces something actionable. A review is a set of checked claims, not a tone of confidence.

| Review activity | Productive instruction | Your decision |
| --- | --- | --- |
| Requirement coverage | Map each requirement to the change satisfying it | Was the requirement understood? |
| Interface check | List call sites and verify each | Is the interface change acceptable? |
| Error handling | Trace failure paths in the new code | Which failures matter in production? |
| Test adequacy | Identify newly untested branches | Do assertions match desired behaviour? |

> **Common mistake:** Treating an assistant's "looks good" as approval, or letting the pass that wrote the code be the only pass that judges it.

### A narrowing debug loop

Asking for another attempt without new information usually reproduces the same error. Reproduce the failure exactly first: command, input, complete error text. "Tests fail" gives nothing to investigate; "the checkout test raises a type error in the discount helper after the refactor but passes on the base commit" identifies a layer and a boundary.

Next inspect the diff and remove out-of-scope changes. Assistants sometimes add cleanups, and those extras are frequent sources of regressions. Re-run the check after reverting them. Then isolate the layer: was the plan wrong, the edit wrong, the environment wrong, or the test wrong? Shrink the window deliberately by handing over one file and one failing case. If the fix works in isolation, the original problem was scope; if it still fails, the code needs attention. Change one thing and rerun the identical check.

Set a limit on blind attempts. After two unchanged retries, gather new evidence: a smaller reproduction, a fresh search, or the exact failing output. The assistant is most useful when you feed it observations it did not have before.

> **Common mistake:** Stacking repairs on a change already known to be wrong. Reset to the last verified checkpoint and reissue a smaller request.

### One model, different surfaces

The same model family can be reached through an API, client libraries, an agent SDK, the repository assistant, and connectors. The concepts transfer: a finite window, instructions at different authority levels, typed tool contracts, output that needs validation, and cost that grows with tokens and steps. Authority does not transfer. An API application executes every side effect; a repository assistant can change your working tree under permission rules; an agent loop may call tools on its own.

| Surface | Who executes tools | Standing instructions live in | Inspect |
| --- | --- | --- | --- |
| Model API | Your application | Request system or developer fields | Captured request and response |
| Client library | Application through wrappers | Same fields, set by SDK code | Serialized outbound request |
| Agent SDK | A runtime loop you register | Prompt, tool definitions, harness | Trace and tool results |
| Repository assistant | Assistant runtime, gated | Project instructions, rules, skills | Diff and session transcript |

> **Exam note:** Cross-surface questions test transfer of principles. Identify changes in authority, context size, or validation needs before worrying about which product implements the feature.

## Practice lab

**Goal:** obtain a small, reviewable change from an assistant in an unfamiliar repository, then diagnose a failure with a narrowing loop.

1. Create a project with a `calc.py` module, one unit test, and a working agreement naming the test command and marking `generated/` read-only.
2. Commit, create a branch, and ask for a zero-divisor guard in one function plus one test. Include scope and definition of done.
3. Ask which files were read and which command was run; compare with the working agreement.
4. Break the expected value in the test and ask for a diagnosis. Require the exact command and error before any edit.
5. Inspect the diff, revert edits outside the requested files, and rerun the named command.

**Expected observation:** changes stay in `calc.py` and its test, and the debug turn cites a concrete error. If a generated file is touched, the rule was suggested but not enforced; add a blocking check and repeat.

## Worked scenario

A team needs to replace a home-grown date parser with a maintained library across roughly forty call sites. The first request produces a patch touching sixty files, reformats a dozen, and misses two callers that a search pattern overlooked. Tests pass locally because neither caller is covered.

The engineer resets and restarts with an inventory request that produces no edits. Two callers live in a legacy module the team has agreed not to touch yet. A thin adapter exposed under the old function name is introduced, delegating internally to the new library. Callers are converted in three batches, each with its own test run and commit; the legacy module keeps the adapter behind a flag.

When a batch fails, the engineer supplies the exact failing case and asks whether plan, edit, or test is at fault. The assertion was written against the old error message, so the test is updated deliberately rather than distorting the code to satisfy it. The result is more pull requests, but each is small enough to explain, and the flag enables gradual exposure.

## Common mistakes

- Starting in a dirty tree and untangling personal and assistant edits during review.
- Writing instruction files full of advice that cannot be verified.
- Assuming a file is known merely because it is tracked in git.
- Requesting one giant migration patch instead of staged conversion with checkpoints.
- Treating a confident review summary as independent evidence of correctness.
- Retrying a failure without adding a reproduction or narrowing the scope.
- Allowing write and command tools in an exploration session where reads would suffice.

## Chapter summary

- Repository awareness comes from context selection, reasoning, tools, gates, and session state together.
- The assistant sees material fetched into its window, not everything stored in the project.
- A clean branch, explicit scope, and checkable definition of done make changes easier to judge.
- Choose process size by blast radius; staged conversion with seams and flags supports large migrations.
- Version control provides checkpoints, and pull requests verify intent and evidence.
- Debugging works as a narrowing loop with exact reproductions and one change at a time.
- Model concepts transfer across surfaces, but tool authority differs sharply.

## Checkpoint questions

1. An assistant produces compiling code that reimplements an existing helper. What is the most likely cause?

   - A. The maximum token setting is too low.
   - B. The relevant file was never selected into its context.
   - C. The permission mode was too restrictive.
   - D. The project uses the wrong programming language.

2. Which statement best describes a useful project instruction file?

   - A. It lists aspirations such as clarity and elegance.
   - B. It stays private so no one else can see the conventions.
   - C. It states exact commands, forbidden paths, and a definition of done.
   - D. It replaces tests and code review.

3. A change must update dozens of callers. Which approach best supports safe review?

   - A. Generate one very large patch so everything changes at once.
   - B. Edit only callers covered by tests and ignore the rest.
   - C. Add a compatibility seam, convert in small batches, verify each batch.
   - D. Rename the function so everything fails to compile, then fix all errors.

4. What should happen first when a test fails after an assistant edit?

   - A. Ask the assistant to try again with different wording.
   - B. Record the command and error, then inspect the diff for out-of-scope changes.
   - C. Switch the whole project to a larger model.
   - D. Delete the failing test.

5. When the assistant drafts a pull request description, what is the appropriate response?

   - A. Publish it unchanged.
   - B. Remove all mention of tests.
   - C. Verify each claim against the diff and a fresh test run.
   - D. Ask a second assistant to approve the first one's text.

6. Which capability differs most between an API call and a repository assistant?

   - A. The need to supply instructions.
   - B. The size of the context window.
   - C. Who may execute tools that modify local files.
   - D. The existence of tool contracts.

7. An instruction says "never edit `generated/`," but the assistant edits a file there. What is the strongest correction?

   - A. Add a blocking rule that refuses writes to that directory.
   - B. Repeat the sentence twice in the instruction file.
   - C. Ask the assistant to promise to remember.
   - D. Rename the directory without protecting the new path.

### Answers and rationale

1. **B.** A duplicate helper means the existing one was not in the window. **A** affects output length, not selection. **C** would prevent edits rather than cause duplication. **D** is unrelated to the symptom.

2. **C.** Checkable commands and boundaries serve both model and reviewer. **A** cannot be verified. **B** mistakes conventions for secrets. **D** overstates the role of documentation.

3. **C.** A seam and batches keep diffs reviewable and catch missed callers early. **A** is unreviewable. **B** knowingly leaves broken callers. **D** trades one large patch for one large compile failure.

4. **B.** Reproduction and diff inspection identify the layer before editing. **A** adds no information. **C** changes tools rather than diagnosis. **D** hides the failure.

5. **C.** Descriptions are claims requiring evidence. **A** trusts unverified text. **B** removes the most useful part. **D** adds another opinion instead of facts.

6. **C.** An API application owns execution; the assistant can change the working tree under gates. **A**, **B**, and **D** are shared concerns across both surfaces.

7. **A.** Enforcement removes reliance on interpretation. **B** is still guidance. **C** creates no durable guarantee. **D** changes the path but not the policy.

---

*End of chapter 25.*
