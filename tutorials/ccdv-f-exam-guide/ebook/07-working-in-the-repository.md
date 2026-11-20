# Chapter 7 — Working Inside the Repository with an AI Coding Assistant

## Learning objectives

- Describe the building blocks that make a coding assistant repository-aware and explain how they work together.
- Start an assistant session in a state that is safe to inspect, review, and undo.
- Write project-level instruction files and scoped rules that shape behaviour without relying on memory.
- Choose a permission mode that matches the risk of the task, and recognize when a human must approve.
- Configure lifecycle hooks, including pre-tool-use checks, and interpret their exit codes correctly.
- Distinguish extensions, skills, and plug-ins, and explain the trust boundary each one introduces.
- Debug a failing change with a repeatable narrowing process instead of guessing.
- Run several sessions in one repository without collisions, and use directory-scoped instructions in a monorepo.

## Key concepts

### What makes an assistant repository-aware

A chatbot that answers questions about code is not the same thing as an assistant that can work inside a repository. The second kind is built from several cooperating parts, and the exam expects you to know what each part contributes. Think of it as a loop with gates around it rather than a single clever model call.

At the centre is the model, which decides what to do next based on the conversation and the context it has been given. Around it sits a context builder that gathers relevant material: the current file, nearby files, the project's instruction files, search results, and the output of commands the assistant has run. The model never sees the whole repository at once; it sees a carefully selected window, so the quality of that selection matters as much as the reasoning.

Next comes the tool layer. This is the set of actions the assistant is allowed to take — read a file, edit a file, run a command, search the tree, fetch a web page, or call a connected service. Each tool has a name, a description, and a schema for its inputs. The model chooses a tool by producing a structured request, and the runtime executes that request.

Around the tool layer sits the permission gate. Before a tool runs, the runtime decides whether it should proceed, ask the human, or be blocked outright. This is where permission modes and hooks live. Above that is the extension layer, which adds new tools and packaged instructions. Finally, there is session state: the conversation history, the set of files changed, and the plan the assistant is following.

| Building block | What it contributes | Failure mode when missing or weak |
| --- | --- | --- |
| Model | Chooses the next action from context | Plausible but wrong actions |
| Context builder | Selects files and instructions to include | Decisions made without relevant information |
| Tool layer | Turns decisions into concrete actions | Good ideas that cannot be carried out |
| Permission gate | Controls which actions may run | Unreviewed or destructive changes |
| Hook lifecycle | Runs checks before and after tools | No automated guardrails or audit trail |
| Extension layer | Adds tools and reusable instructions | Repeated manual setup, hidden trust risk |
| Session state | Tracks history, diffs, and plan | Lost context and duplicated work |

> **Exam note:** A frequent question gives you a scenario where the assistant produces sensible code that does not fit the project. The cause is usually context selection, not model intelligence. Look for the missing instruction file or the file that was never included in the window.

The practical takeaway is that "repository-aware" is a property of the whole system, not of the model alone. When you are asked to improve an assistant's behaviour, ask which block is responsible. Bad edits may come from a vague instruction file, an over-broad permission setting, a missing hook, or a context builder that never surfaced the relevant test. Each points to a different fix.

### Starting a session safely

A safe session starts before the first prompt. The goal is to make everything the assistant does observable and reversible. Three habits cover most of the risk: begin from a clean working tree, state the scope in the opening message, and decide up front how changes will be reviewed.

Begin by checking version-control status. If the tree already contains uncommitted edits, the assistant's diff will be mixed with yours, and undoing its work may also undo something you wanted to keep. Commit or stash your own changes, or create a dedicated branch for the session. A clean baseline turns "show me what you changed" into a single command.

Read the project's instruction files before you start, and include them in the session if they are not loaded automatically. These files usually record build commands, conventions, and forbidden paths. Skipping them is how assistants end up reformatting generated code or running the wrong test command.

State the scope in the first message. A good opening names the goal, the boundaries, and the definition of done. For example: "Reduce duplication in the billing module only. Do not touch generated files or the legacy adapter. Add tests for the shared helper and leave the public interface unchanged." That sentence gives the model constraints it can actually follow, and it gives the human reviewer a checklist.

Finally, choose a permission mode that matches the task, as described in the next sections. For exploration, start in a read-only or planning mode and upgrade only when you are ready to edit. For a small, well-understood fix in a disposable branch, a more permissive mode may be reasonable.

> **Common mistake:** Starting in a dirty working tree, then trying to untangle assistant edits from personal edits at review time. The correct first move is always to establish a clean, identifiable baseline.

### Project-level instruction files and scoped rules

Instruction files are plain text files that the context builder injects into the conversation. They are the most reliable way to make behaviour consistent, because they travel with the repository instead of living in one person's memory. A project-level file usually sits at the root and carries a short list of durable facts: how to build and test, which directories are generated, naming conventions, and the review standard that changes must meet.

Good instruction files are short, specific, and verifiable. "Write clear code" is not useful because it cannot be checked. "Run the unit suite before reporting completion" is useful because it is a concrete action. Prefer commands, paths, and prohibitions over aspirations. Keep the file under a few hundred lines; if it grows longer, split the detail into scoped rules placed in the directories that need it.

Rules can be scoped by path so that they apply only to certain files. This matters in mixed projects where different areas follow different conventions. A rule that applies to every file in a directory can say that generated code is read-only, that a particular module uses tabs, or that database migrations require a human review before they are written.

Here is an example of a compact root instruction file in a fenced block:

```text
# Project instructions

## Build and test
- Install dependencies with `npm ci`.
- Run `npm test -- --runInBand` before declaring a task complete.
- Run `npm run lint` and fix warnings introduced by your own changes.

## Boundaries
- Files under `generated/` are machine-produced. Never edit them directly.
- Files matching `*.lock` change only through the package manager.
- Database migrations under `db/migrations/` require human approval before edits.

## Conventions
- Use named exports; avoid default exports in new modules.
- Prefer small functions with a single responsibility.
- Add or update a test whenever behaviour changes.

## Definition of done
- Diff contains only files in the requested scope.
- Tests and lint pass locally.
- Summarize what changed and what was deliberately left alone.
```

> **Try it:** Create a scratch project with a deliberately misleading test command in its instruction file. Ask the assistant what it would run. Then correct the file and repeat. Notice how changing one line of text changes behaviour without changing any code.

Scoped rules are layered. A rule near the root applies broadly; a rule in a subdirectory adds or overrides detail for that subtree. The usual convention is that the most specific rule wins when two rules conflict, while non-conflicting rules accumulate. Because this layering can surprise people, keep overrides rare and explicit, and write them so a reader can tell which rule takes precedence.

Instruction files are not a substitute for permission settings. A line that says "do not edit generated files" is guidance the model can misunderstand or ignore. A hook that blocks writes to that directory is enforcement. Use both: the instruction explains the reason to the model, and the hook guarantees the boundary.

### Permission modes and human approval

Permission modes decide how much a tool request is trusted before it runs. They are a policy choice, not a cleverness setting. The right mode depends on the blast radius of the actions, the maturity of the repository, and how easily a mistake can be undone.

| Mode | What the assistant may do | Human involvement | Typical use |
| --- | --- | --- | --- |
| Plan / read-only | Inspect files and propose a plan; no writes or commands that mutate state | Approve the plan before any change | Exploration and unfamiliar repositories |
| Ask before each action | Read freely; request confirmation for each edit or command | Confirm or reject every action | Shared branches and production-adjacent work |
| Scoped auto-edit | Write inside an allow-listed set of paths; ask outside it | Approve only exceptions | Trusted modules with clear boundaries |
| Full auto | Run tools without prompts | Review the complete diff afterwards | Disposable sandboxes and throwaway experiments |

The exam rewards reasoning about the trade-off. A read-only mode is cheap for exploration because it prevents accidental writes while still letting the assistant learn the codebase. It is not appropriate for delivering a change, because every edit then needs a mode switch. An "ask before each action" mode gives maximum control but creates a lot of interruptions; it is best when actions are risky but infrequent. Scoped auto-edit is often the best balance: you grant autonomy inside a narrow area and keep a prompt for anything outside it. Full auto is acceptable only when the environment can be discarded without consequence.

Decide when a human must approve based on consequence, not on effort. Changes that are hard to reverse, affect many files, touch security-sensitive code, alter data, or involve external side effects should require approval even in an otherwise permissive setup. Examples include database migrations, dependency upgrades that change a lock file, edits to authentication code, and commands that push or deploy.

> **Exam note:** If a scenario mentions a shared repository, a branch other people depend on, or changes that are difficult to roll back, the correct answer is almost never full auto. Look for scoped autonomy plus a human approval step.

Permission modes interact with hooks. A mode answers "should this be allowed by default?", while a hook answers "does this particular request satisfy our checks?". A request can be allowed by the mode and still be blocked by a hook. Conversely, a permissive mode does not override a hook that rejects a request. Treat the mode as a broad policy and hooks as fine-grained enforcement.

### Lifecycle hooks and exit-code semantics

Hooks are small programs that the runtime invokes at defined points in the assistant's lifecycle. They let you automate guardrails without relying on the model to remember them. The most tested point is the pre-tool-use hook, which runs after the model requests a tool but before the tool executes. Other common points include post-tool-use, session start, session end, and notification events.

A pre-tool-use hook receives information about the requested tool and its inputs. It can inspect the file path, the command string, or the arguments and then decide what to do. Typical checks include blocking writes to generated directories, requiring a specific flag on destructive commands, logging every tool call to an audit file, or appending extra context before a search runs.

The decision is communicated through the process exit code, and this is a favourite exam detail. An exit code of zero means success and lets the action proceed. An exit code of two means the action is blocked; the tool does not run and the model is given the hook's message so it can adjust its plan. An exit code of one means a non-blocking error: the output is shown, but the action is still allowed. Confusing one and two is a classic mistake — one informs, two enforces.

Here is a hook configuration example that blocks direct edits to a generated directory and logs every write attempt:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "edit|write",
        "command": "python tools/check_write.py",
        "description": "Reject edits to generated files and log all write attempts"
      },
      {
        "matcher": "bash",
        "command": "python tools/check_command.py",
        "description": "Require an explicit flag for destructive commands"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "edit|write",
        "command": "python tools/record_diff.py",
        "description": "Append a diff summary to the session audit log"
      }
    ]
  }
}
```

The matcher selects which tool names trigger the command. The command receives the tool input on standard input and returns a decision through its exit status and message. A checker that rejects generated files might look like this in outline:

```python
import json
import sys

payload = json.load(sys.stdin)
path = payload.get("file_path", "")

if path.startswith("generated/"):
    print("Generated directory is read-only. Change the source instead.")
    sys.exit(2)  # block the tool call

print("Write allowed.")
sys.exit(0)  # proceed
```

> **Common mistake:** Returning exit code one when you meant to block a write. The action still happens, and only a message appears. If the requirement says "must not run," the hook must exit with the blocking code.

Hooks should be fast and deterministic. A slow hook makes every action feel sluggish, and a hook that depends on network state will produce inconsistent decisions. Keep the logic local, test the script independently with sample payloads, and log enough information to diagnose a surprise block later. Remember that hooks run on tool requests made by the model, not only on actions you trigger yourself, so a rule you add affects the whole session.

### Extensions, skills, and plug-in behaviour

The base assistant can be extended in three different ways, and the exam likes to test whether you can tell them apart. An extension adds a new capability, usually by connecting an external tool or service through a standard interface. A skill is a packaged set of instructions that the assistant can load on demand when a task calls for it. A plug-in is a bundle that can contain both, along with configuration, and is installed as a unit.

An extension widens what the assistant can do. For example, connecting a documentation service lets the model search current references instead of relying on trained knowledge. Connecting a database tool lets it inspect a schema. Each new connection is also a new trust boundary: the assistant can now cause effects outside the repository, so the same permission thinking applies. Prefer read-only connections during exploration, and require approval for anything that writes.

A skill changes how the assistant approaches a task without necessarily adding a tool. It is like a reusable playbook: when the request matches, the skill's instructions are loaded into context. A skill might describe how to write a migration, how to follow the project's review checklist, or how to convert a design note into tests. Skills are useful because they keep the root instruction file small while still making specialist knowledge available exactly when needed.

A plug-in packages several of these pieces for convenient installation. The convenience comes with a governance cost. A plug-in may introduce tools that run with your permissions, instructions that quietly override your conventions, or network connections you did not expect. Before enabling one, check what tools it registers, what instructions it injects, and what data it can reach. In a team setting, allow-list plug-ins rather than letting each person install anything.

| Mechanism | Adds | Loaded | Main risk |
| --- | --- | --- | --- |
| Extension | New tools or connected services | When the session starts | External side effects and data exposure |
| Skill | Reusable instructions and procedures | On demand when the task matches | Conflicting guidance or stale advice |
| Plug-in | A bundle of tools, skills, and config | At install and session start | Unreviewed capability and hidden overrides |

> **Exam note:** When a scenario says "the assistant needs a new ability," think extension. When it says "the assistant should follow a special procedure for this kind of task," think skill. When it says "a bundle installed across the team," think plug-in, then ask about review and trust.

Skills and instruction files can overlap, and choosing between them is a matter of timing. An instruction file is always present, so it suits universal rules. A skill is loaded only when relevant, so it suits detailed procedures that would otherwise clutter every conversation. If a rule must never be missed, put it in the instruction file and, ideally, back it with a hook. If it is only needed for a specific class of task, make it a skill.

### Debugging a failing change

Even a well-configured session produces bad changes sometimes. The mistake many people make is to ask the assistant to "try again" with no new information, which usually reproduces the same error. A better approach is a narrowing process that separates symptom from cause.

Start by reproducing the failure precisely. Capture the exact command, input, and error output. "The tests fail" is not enough; "the checkout test fails with a null reference in the discount helper after the refactor" gives you something to investigate. If the failure is intermittent, note what differs between the failing and passing runs.

Next, inspect the diff. Read every changed file and ask whether each change is required by the request. Assistants sometimes make unrelated cleanups, and those extras are a common source of regressions. Revert anything outside scope, then re-test. This step alone resolves a surprising number of problems.

Then isolate the layer. Ask whether the failure is in the plan (the assistant misunderstood the goal), the edit (the code is wrong), the environment (a command or dependency is wrong), or the test (the test itself is outdated). You can narrow this by giving the assistant a single file and a single failing test, removing the rest of the repository from the window. If the fix works in isolation, the problem was context or scope; if it still fails, the problem is in the code.

Use version control as a safety net. When a change is clearly wrong, do not stack more edits on top of it. Reset to the last good commit and re-apply a smaller, clearer request. A short history of clean checkpoints is easier to debug than one long session with many overlapping edits.

> **Try it:** Deliberately introduce a failing test, then ask the assistant to fix it in a branch. Before accepting the fix, require it to explain which line caused the failure and why the change addresses it. If it cannot point to the cause, treat the fix as a guess and keep investigating.

When you do ask the assistant to repair something, give it the evidence rather than the conclusion. Include the failing output, the relevant file, and the constraint that must hold. Ask for the smallest change that makes the test pass. A narrow request produces a reviewable diff and reduces the chance of a second regression.

### Running parallel sessions without collisions

Once you trust the assistant, it is tempting to run several sessions at once. This works well until two sessions edit the same file, run commands in the same working directory, or overwrite each other's state. The solution is isolation: give each session its own workspace and its own branch.

The usual technique is a separate worktree or clone per session. Each session then has an independent copy of the files and can edit freely. Assign each one a distinct branch and a distinct set of files in the opening prompt. For example, one session owns the data layer, another owns the user interface, and a third writes tests. Clear ownership prevents the most common collision — two assistants rewriting the same function.

Avoid shared mutable state. A shared build output directory, a shared cache, a shared port, or a shared test database can make two sessions interfere even when they edit different files. If sessions must run commands, give them separate ports and separate temporary directories, or stagger the commands. Configuration that is generated at runtime is another trap: one session may regenerate a file the other is reading.

Keep the main branch as the integration point. When a session finishes, review its diff, run the tests in that worktree, and only then merge. Merging an unreviewed session defeats the purpose of isolation. If two sessions touch related code, merge them one at a time and re-run the tests after each merge so you can attribute any failure.

| Collision source | Symptom | Prevention |
| --- | --- | --- |
| Same file edited twice | One session's work disappears | Assign file ownership in the prompt |
| Shared working directory | Mixed diffs and confusing status | One worktree or clone per session |
| Shared ports or services | Intermittent command failures | Separate ports and temporary paths |
| Generated configuration | Files change under a session | Regenerate per workspace or read-only |
| Unreviewed merges | Regressions with no clear owner | Review and test before each merge |

> **Common mistake:** Running two sessions in the same directory on the assumption that different prompts mean different files. Without a worktree or branch separation, their changes share one working tree and one staging area, and undoing one session's work becomes guesswork.

Parallel sessions are most valuable when tasks are genuinely independent. If two tasks share a design decision, resolve the decision first and write it into an instruction file, then start the sessions. Otherwise you will pay for the merge twice: once in code and once in conversation.

### Directory-specific instructions in a monorepo

A monorepo contains several packages that may follow different rules. A single root instruction file cannot express all of them without becoming vague or enormous. The answer is a hierarchy of instruction files: a short root file for universal rules, and additional files placed in package directories for local detail.

The root file should contain only what is true everywhere: how to install dependencies, the general review standard, and the paths that are always off limits. Each package directory can then add its own build command, test command, naming conventions, and any local prohibitions. A file in a package directory might say that its tests use a different runner, that its schema files are generated, or that its public interface is frozen.

The context builder typically loads the instruction files that apply to the files being touched. That means a session editing two packages may see two sets of local rules at once. Write them so they can coexist: avoid contradictory commands without marking precedence, and state explicitly when a local rule replaces a root rule.

This hierarchy is also a way to control autonomy in a large repository. Combine a scoped auto-edit permission mode with directory rules that name the writable areas. A session working in one package can then be free to edit there while still asking before it crosses into another package. That combination — local instructions for guidance, scoped permissions for enforcement — is a pattern the exam likes to reward.

> **Exam note:** For a monorepo question, the best answer usually layers rules: a minimal root file, specific files per package, and permission settings that match the package boundary. A single giant root file is almost never the right choice.

## Worked scenario

A team is splitting a large application into three packages. The repository contains a `generated/` directory of protocol code, a `db/migrations/` directory that must never be changed without review, and several packages with different test commands. The plan is to use several assistant sessions at the same time to finish the split within a sprint.

The first decision is isolation. Rather than running all sessions in the shared checkout, the engineer creates three branches from a clean main branch and one worktree per branch. Each session receives a written ownership list in its opening message. Session one owns the data package and its tests. Session two owns the interface package. Session three owns documentation and the shared test helpers. No two sessions are allowed to edit the same path.

The second decision is guidance. The root instruction file is trimmed to universal facts: the install command, the rule that generated files are read-only, the rule that migrations need human approval, and the definition of done. Each package gets its own instruction file with its test command and its naming convention. Because the interface package uses a different formatter, its local file states that the local setting takes precedence for that directory.

The third decision is enforcement. A read-only planning mode is used for the first session while the migration strategy is worked out, because that decision affects all three packages and is hard to reverse. Once the plan is agreed, the sessions move to scoped auto-edit, each limited to its own package. A pre-tool-use hook blocks any write under `generated/` and any edit under `db/migrations/`, returning the blocking exit code so such attempts cannot proceed. A second hook logs every write into a per-session audit file, which makes later review straightforward.

During the work, session two tries to reformat a generated protocol file because its formatter reports a warning. The hook blocks the edit and returns a message explaining that the source definition must change instead. The assistant updates the source definition and reruns the generator through the approved command. This is exactly why the instruction file alone was not enough: the model had a plausible reason to edit a forbidden path, and only enforcement stopped it.

A test failure then appears in session one. Instead of asking for a blind retry, the engineer supplies the failing test output and asks for the smallest change in the data package. The assistant identifies that a helper was moved without updating one caller, fixes that caller, and reruns the package test command from the local instruction file. The diff is reviewed before the branch is merged.

Integration happens one branch at a time. Each worktree is tested, reviewed, and merged into main separately, with a test run after each merge. When two branches touch the same helper signature, the second merge produces a small conflict, which is resolved manually because both changes are already understood. By the end, every change has an owner, every blocked action has an audit entry, and the generated directory is untouched.

The exam lesson is that safety here is a stack of small decisions: isolation for parallelism, instruction files for guidance, permission modes for default behaviour, hooks for hard boundaries, and review at each merge. No single setting carries the whole solution.

## Common mistakes

- Starting a session in a dirty working tree, making the assistant's changes impossible to separate from existing edits.
- Treating an instruction file as enforcement, when a hook is required to actually block a forbidden action.
- Confusing the non-blocking and blocking hook exit codes, so a "blocked" write still happens.
- Using a fully automatic mode in a shared or hard-to-reverse environment.
- Giving two parallel sessions the same working directory and no file ownership.
- Writing a single enormous root instruction file for a monorepo instead of layering local rules.
- Asking for another attempt after a failure without providing the failing output or narrowed scope.
- Installing a plug-in without examining which tools and instructions it adds to the session.

## Chapter summary

- A repository-aware assistant is a loop of model, context, tools, permissions, hooks, extensions, and session state.
- Begin sessions from a clean baseline, with a stated scope and a chosen review strategy.
- Instruction files carry durable guidance; scoped rules carry local detail; hooks enforce hard boundaries.
- Choose a permission mode by blast radius, and require human approval for hard-to-reverse or high-impact actions.
- Pre-tool-use hooks decide whether an action runs; the blocking exit code is distinct from the non-blocking one.
- Extensions add abilities, skills add on-demand procedures, and plug-ins bundle both with a trust cost.
- Debug by reproducing, reading the diff, isolating the layer, and requesting the smallest verified fix.
- Parallel sessions need separate worktrees, distinct branches, assigned file ownership, and staged merges.
- In a monorepo, keep the root file minimal and place detailed rules in the directories that need them.

## Checkpoint questions

1. A session produces code that compiles but ignores the project's logging convention. The instruction file is present at the root. Which explanation is most likely?

A. The model lacks reasoning ability.
B. The convention was not included in the context the model received.
C. The permission mode was too restrictive.
D. The hook exit code was set to the blocking value.

2. You need to prevent any write under `generated/` regardless of what the model decides. What is the strongest measure?

A. Add a sentence to the root instruction file.
B. Ask the assistant politely in the opening prompt.
C. Configure a pre-tool-use hook that returns the blocking exit code.
D. Switch to a more capable model.

3. Which exit code from a pre-tool-use hook blocks the tool call?

A. Zero
B. One
C. Two
D. Three

4. An engineer wants the assistant to explore an unfamiliar repository and propose a refactor plan without changing files. Which permission mode fits best?

A. Full auto
B. Scoped auto-edit
C. Ask before each action
D. Plan / read-only

5. Two sessions must work in the same repository at the same time on unrelated packages. What is the safest setup?

A. Run both in the same directory with different prompts.
B. Give each a separate worktree, a distinct branch, and explicit file ownership.
C. Let both write to the same branch and merge at the end.
D. Disable all hooks for the duration of the work.

6. Which statement about skills is most accurate?

A. A skill always adds a new external tool to the session.
B. A skill is a packaged procedure loaded when the task matches.
C. A skill replaces the need for version control.
D. A skill can only be used once per repository.

7. In a monorepo with different test commands per package, how should instructions be organized?

A. One very long root file listing every possible command.
B. No instruction files; rely on the model's memory.
C. A minimal root file plus directory-specific rule files.
D. Only plug-in instructions, with no repository files.

### Answers and rationale

1. **B.** Context selection determines what the model can follow; if the convention never reached the window, it cannot be applied. A is wrong because the code compiling shows reasoning worked; the gap is information. C is wrong because a restrictive mode limits actions, not knowledge of conventions. D is wrong because a blocking exit code would stop an action, not cause a style miss.

2. **C.** A hook enforces the boundary at execution time and can veto the write. A and B are guidance that the model may ignore, so they are weaker. D changes the model, not the policy, and does not guarantee the path is protected.

3. **C.** Exit code two is the blocking decision. Zero means proceed, so A is wrong. One is a non-blocking error that still allows the action, so B is wrong. Three is not a defined decision value here, so D is wrong.

4. **D.** Planning or read-only mode lets the assistant inspect and propose without writing. Full auto (A) permits edits unnecessarily. Scoped auto-edit (B) still allows writes. Ask before each action (C) would produce many prompts while still allowing writes once confirmed, which is more than an exploration task needs.

5. **B.** Isolation with worktrees, branches, and ownership prevents overlapping edits and shared state. Running in one directory (A) mixes diffs. Sharing a branch (C) creates collisions. Disabling hooks (D) removes guardrails without solving the collision problem.

6. **B.** Skills are on-demand procedures injected into context. A confuses a skill with an extension. C is false because version control remains essential. D is false because skills can be used whenever the task matches.

7. **C.** Layering a small root file with local files keeps rules specific and manageable. One giant file (A) becomes vague and hard to maintain. No files (B) loses durable guidance. Plug-in-only instructions (D) are neither repository-owned nor reliable across sessions.

---

*End of chapter 7.*
