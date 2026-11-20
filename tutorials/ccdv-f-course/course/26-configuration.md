# Chapter 26 — Configuration, Skills, Plugins, Permissions, and CI

## Learning objectives

- Place settings at the correct scope and predict which value wins when scopes conflict.
- Treat project instructions and rules as versioned assets with a predictable hierarchy.
- Distinguish skills, slash commands, subagents, hooks, connectors, and plugins by what each contributes.
- Review a plugin or marketplace entry for capability, scope, and dependencies before enabling it.
- Choose permission modes and allow or deny rules that fit the risk of a task.
- Run an assistant non-interactively, request streamed events, and consume JSON output in CI.
- Explain how sessions, resumption, and headless runs interact in an automated workflow.

## Key concepts

### Settings scopes and precedence

Configuration is layered, so one key — a model, a permission rule, an enabled plugin — can be defined in several places. Conflicts resolve in a fixed order: organisation-managed policy first, then command-line flags, project-local settings, shared project settings committed to the repository, and finally user settings that yield to anything more specific. A headless run can therefore force an output format with a flag regardless of stored files.

| Scope | Where it lives | Shared | Precedence | Use for |
| --- | --- | --- | --- | --- |
| Managed policy | Organisation configuration | Yes | Highest | Non-negotiable security rules |
| Command line | Flags on one invocation | No | High | CI overrides and one-off runs |
| Project local | Settings file on one machine | No | Medium | Personal paths and experiments |
| Project shared | Settings file committed to the repo | Yes | Medium-low | Team tools, hooks, plugin approvals |
| User | Personal settings for all projects | No | Lowest | Individual defaults |

Anything the team relies on belongs in a versioned file; anything personal belongs in a local or user file. A rule confined to one workstation will not reach teammates or CI, while a machine-specific path in a shared file breaks every other checkout.

Versioned prompts extend this discipline to the text that steers the model. Instruction files, rules, skills, and subagent definitions are ordinary repository content: reviewable, diffable, and releasable with code. A change to a verification command or forbidden path should travel through a reviewed pull request, leaving a history that explains later shifts in behaviour.

> **Exam note:** A rule that must apply everywhere and cannot be bypassed belongs in managed policy or in a committed project setting backed by an enforced hook. A local file or an instruction sentence is not enough.

### Project instructions and the rule hierarchy

Instruction files are standing context, and they are not all equal. Managed instructions outrank project text. A project-root file describes repository-wide conventions; in a monorepo, parent and subdirectory files add detail for their own trees; user-level instructions supply personal preferences at the lowest tier. Non-conflicting statements accumulate. When they conflict, the higher-authority or more specific source governs the files at hand.

Keep the root file small and push detail outward. It might name verification commands, while a subdirectory file records a different test runner for a legacy package. Rules can be scoped by path so they load only for matching files. Such text is still guidance: a rule requiring a second reviewer helps a human reading the diff but does not stop a write, so pair critical boundaries with an enforced check. Never place tokens or private endpoints in instruction files; they are versioned and copied into context.

```text
---
paths:
  - "services/legacy/**/*.py"
---

# Legacy package rules

- This package keeps the old error envelope; do not modernise it in passing.
- Run `python -m pytest services/legacy/tests` for changes here.
- Edits to `adapter.py` require a second reviewer.
```

> **Common mistake:** Adding a team convention to a personal configuration and expecting new joiners to inherit it.

Reconcile files that disagree about the test command instead of relying on precedence, or developers will verify with different commands.

### Skills and slash commands

A skill is a packaged procedure loaded when a request matches its purpose. Its short description stays visible to the model, while the body and supporting files are fetched only on selection. This progressive disclosure keeps always-present context small while making specialist knowledge available at the right time. A skill might explain how to prepare a release note, add a migration, or apply a review checklist to a sensitive module.

A slash command is an explicit entry point: the person types a short command to begin a known workflow rather than relying on the model to notice that a skill applies. Some skills are configured for explicit invocation only, which gives the same user-controlled timing. The real distinction is who decides *when*: model-selected skills suit recurring but varied work, while explicit commands suit short, repeatable operations.

A good skill has a narrow trigger, a short procedure with a verification step, and a statement of when to stop and ask. A vague description loads it on unrelated tasks. Rules needed in every session belong in an instruction file, not a skill.

### Subagents and agent memory

A subagent is a separate assistant instance launched for a bounded task. It has its own context window, tools, and instructions, and returns a result instead of sharing the whole conversation. Separation helps when a task generates enough intermediate text to swamp the main session, when independent investigations can run in parallel, or when a specialist needs a different tool set. A review subagent can inspect a diff without inheriting the assumptions that shaped the edits.

The cost is handoff. A subagent sees only what you pass it, so state the goal, the files in scope, the expected output, and its authority. Verify findings before acting; isolation reduces bias but does not guarantee correctness.

Memory covers several stores. Committed project instructions suit durable team facts. User-level instructions follow one person between projects and suit personal preferences. Automatically accumulated memory records patterns observed across sessions, usually outside the repository; it aids continuity but is neither shared nor authoritative. Task-specific knowledge belongs in a skill or in the subagent request.

> **Common mistake:** Recording a critical "never do this" rule only in automatic memory. It may not load for a given task and is invisible to teammates and CI.

### Plugins, marketplaces, scopes, and dependencies

A plugin is an installable bundle that may carry skills, subagent definitions, slash commands, hooks, connector configuration, and settings, all described by a manifest. A marketplace is a catalogue that makes plugins discoverable. Neither term implies review: a listing means a package is reachable, not that its behaviour suits your repository.

Installation scope follows the same logic as settings. A user-scoped plugin follows one person; a project-scoped plugin is recorded so teammates can obtain the same set, though they may still approve what runs; a local-scoped plugin stays on one machine. For team work, favour project scope with a committed record and keep a short inventory of what is enabled and why.

Dependencies matter because bundles rarely stand alone. A manifest may require another plugin, tool, or connector server, making install order and version selection part of reproducibility. Pin versions and treat upgrades as reviewable changes. A plugin that registers tools widens what the assistant can do with your permissions, so inspect its tool list, injected instructions, and network endpoints. Prefer read-only connections during evaluation.

> **Exam note:** Before enabling a bundle across a team, review its contents, dependencies, and scopes, then record the decision in version control. Catalogue prominence is not evidence of safety.

### Choosing an extension type

Several mechanisms can appear to solve the same problem. Ask whether the need is knowledge, action, enforcement, or distribution.

| Need | Mechanism | Why it fits | Watch for |
| --- | --- | --- | --- |
| Always-present convention | Instruction file or scoped rule | Standing context for relevant paths | Bloat as it grows |
| Occasional procedure | Skill | Body loaded on task match | Vague description blocks selection |
| User-triggered workflow | Slash command or explicit skill | Person controls timing | Drift between command and skill text |
| Parallel or unbiased work | Subagent | Separate context and tools | Nuance lost in handoff |
| Deterministic guard | Hook | Runs as code, not model judgment | Wrong exit-code meaning |
| New external capability | Connector server | Typed tools and data | New data-exposure boundary |
| Distribution of several pieces | Plugin | One install, one manifest | Hidden capability and dependencies |
| Machine-specific values | Local settings or environment | Kept off shared config | Teammates do not inherit them |

Choose the smallest mechanism that satisfies the need; a plugin is excessive for one sentence of guidance.

### Sessions, permission modes, and safe autonomy

A session is the live state of an interaction: transcript, plan, tools run, and accumulated edits. Resuming continues that state, which is efficient when a task pauses but can carry stale assumptions forward. A fresh session suits unrelated work. Automation should choose explicitly rather than inherit this by accident.

Permission modes express a broad policy about tool requests. Plan mode allows reading and proposing but blocks mutation, making it a strong default for analysis jobs. Default mode asks before actions considered risky. An edit-accepting mode approves file changes while pausing for other categories. A bypass mode removes prompts entirely and belongs only in disposable environments.

| Mode | Allowed without asking | Appropriate use |
| --- | --- | --- |
| Plan | Reads and search | Analysis, unfamiliar repositories |
| Default | Reads and selected safe tools | Interactive development |
| Accept edits | File edits in the working tree | Well-understood local iteration |
| Bypass | All tool requests | Throwaway sandbox only |

Allow lists name tools needing no confirmation; deny rules block a path outright. Deny wins over a permissive mode, and hooks add checks the mode cannot override. This grants autonomy inside a narrow area while keeping deployments behind a human decision.

> **Common mistake:** Disabling prompts on a shared runner because a job kept hanging. If a policy must be bypassed for the job to finish, the allow list or the job's tool set is wrong.

### Headless runs, streaming, and JSON in CI

Headless mode runs without a terminal. One request is sent, the result captured, and the process exits. Flags select the model, limit tools and turns, set a permission mode, and choose an output format. Saving output to a file keeps a transcript without flooding the build log.

```bash
claude -p "Review the current diff for unsafe error handling. Cite file paths." \
  --permission-mode plan \
  --allowedTools "Read,Glob,Grep,Bash(git diff:*)" \
  --max-turns 8 \
  --output-format json > review-result.json
```

Streaming output suits jobs that show progress or react before the run finishes. A stream of JSON events exposes message and content-block activity, so a consumer can forward partial text or inspect a tool result early. Partial-message events increase volume; enable them only when token-level updates are needed.

```bash
claude -p "Summarise the failing test output in three lines." \
  --output-format stream-json --verbose --include-partial-messages \
  < failing-test.txt | jq -c 'select(.type == "content_block_delta")'
```

A JSON result is convenient because pipelines can query fields with a standard tool, but structured is not the same as trustworthy. A representative result carries an event type, a success or error subtype, the assistant's text, a session identifier, token usage, cost, and timing. Treat the text as untrusted data: never evaluate it as code or interpolate it into a shell command. Check the process exit status, check the error indicator, then validate the fields your pipeline needs against a small schema.

Pin the model version so a backend change cannot silently alter results. Set timeouts and turn limits to bound cost. Pass credentials through environment variables, never committed prompt text. Avoid bypassing permissions on shared runners, store the session identifier for resumption, and redact sensitive material from artifacts.

> **Exam note:** A pipeline should fail on either an unsuccessful exit code or an error result. Neither signal alone is complete.

## Practice lab

**Goal:** make interactive work and a headless check follow the same rules, then verify the configuration through structured output.

1. Add a committed project settings file allowing read-only tools and one test command, plus an instruction file naming that command.
2. Add a local settings file with a personal preference and confirm it is not committed.
3. Add a skill with a narrow description for a change summary; confirm it loads only for a matching request.
4. Run a headless request in plan mode with a read-only allow list and `--output-format json`; save the result.
5. Query the file for the success indicator, session identifier, and text. Repeat with a request requiring a write and observe the denial.

**Expected observation:** the first run succeeds with a valid result, while the write request is refused or paused. Removing the committed settings file changes behaviour on the next run, proving where the rule lived.

## Worked scenario

A team relies on verbal conventions for assistant work. Engineers ask for a particular test command in each session, and one person keeps a preferred rule in a personal file. Some pull requests include test evidence; others do not, and the CI job occasionally runs a command that exists only on a laptop.

The team reorganises. Universal rules move into a committed instruction file with the exact verification command. Package-specific guidance goes into scoped rules, so the legacy module keeps its test runner. A short skill covers release notes with a description narrow enough to avoid accidental loading. A hook refuses writes to generated files, and permission rules allow the test command while denying publishing.

For automation, CI invokes the assistant in plan mode with only read tools and the diff command allowed, validates the JSON fields, and posts the text after human confirmation. A candidate plugin lists one subagent, two skills, and an external connector; the team records it at project scope with a pinned version and keeps the connector read-only. When a build agent's local settings allow an extra tool, that override is removed. New joiners now receive the configuration with the clone.

## Common mistakes

- Defining team rules only in local or user settings, so teammates and CI never see them.
- Placing a machine-specific path in a committed settings file.
- Writing skills with vague descriptions that load on nearly every request.
- Using a plugin where a two-line instruction would suffice.
- Enabling a bundle without inspecting its tools, injected instructions, dependencies, or network access.
- Depending on automatic memory for safety-critical prohibitions.
- Choosing bypass permissions on a shared runner to avoid approval prompts.
- Assuming a JSON result is valid merely because the process exited successfully.
- Omitting model pinning in automation, so behaviour drifts without a code change.

## Chapter summary

- Settings are layered; managed policy and flags outrank project and user files, and local overrides stay local.
- Team rules belong in committed files so they are reviewed, inherited, and reproducible in CI.
- Instructions and path-scoped rules form a hierarchy; conflicts should be removed, not relied upon.
- Skills provide on-demand procedures; slash commands give the person control over timing.
- Subagents buy context isolation and parallelism at the cost of an explicit handoff.
- Plugins package several capabilities and add dependency, scope, and trust questions.
- Permissions combine modes, allow and deny rules, and hooks; deny rules are not overridden by a relaxed mode.
- Headless runs with JSON or streamed output enable automation, but results need status checks and validation.

## Checkpoint questions

1. A rule must apply to every project in an organisation and cannot be overridden. Where should it live?

   - A. In each developer's user settings.
   - B. In managed policy at the highest scope.
   - C. In a project-local settings file.
   - D. In a skill description.

2. Which change is most likely to be inherited by teammates and a CI runner?

   - A. A sentence in a personal instruction file.
   - B. A local settings edit on one workstation.
   - C. A committed project settings file and scoped rule.
   - D. A plugin enabled for one user account.

3. When should a procedure become a skill rather than a root instruction?

   - A. When it must appear in every session.
   - B. When it is needed only for a recognisable class of task.
   - C. When it contains a secret credential.
   - D. When it replaces permission checks.

4. What is the main benefit of assigning a task to a subagent?

   - A. It removes the need to describe the task.
   - B. It guarantees a correct result without review.
   - C. It isolates context and tools for focused or parallel work.
   - D. It automatically enforces repository permissions.

5. Before enabling a plugin across a team, what should be checked first?

   - A. Whether the marketplace lists it prominently.
   - B. Whether its tools, injected instructions, dependencies, and access are understood.
   - C. Whether its name resembles an existing tool.
   - D. Whether it installs without configuration.

6. A job must analyse a diff without changing files. Which permission mode fits?

   - A. Bypass.
   - B. Accept edits.
   - C. Plan.
   - D. Default with no allow list.

7. A pipeline parses JSON from a headless run. What additional check is essential?

   - A. Confirm exit status and error status, then validate required fields.
   - B. Assume valid JSON means an accurate result.
   - C. Execute the returned text to verify it is meaningful.
   - D. Disable tool restrictions for a more detailed result.

### Answers and rationale

1. **B.** Managed policy is built for centrally enforced rules. **A** is personal. **C** applies to one machine and is easily removed. **D** is model guidance, not a policy scope.

2. **C.** Committed files travel with the repository and reach automation. **A** and **B** are machine-specific. **D** leaves everyone else unchanged.

3. **B.** On-demand loading is the purpose of a skill. **A** describes an instruction file. **C** is unsafe in any mechanism. **D** confuses guidance with enforcement.

4. **C.** A separate context and tool set supports isolation and parallel work. **A** is false because handoffs need clear descriptions. **B** overstates reliability. **D** belongs to permissions and hooks.

5. **B.** Reviewing contents and dependencies is the responsible step. **A** and **C** are superficial signals. **D** mistakes ease of installation for safety.

6. **C.** Plan mode allows reading and analysis while preventing mutation. **A** and **B** permit changes. **D** may prompt or grant more authority than needed.

7. **A.** Structured output still needs status checks and field validation. **B** trusts format over content. **C** creates a code-execution risk from model text. **D** weakens the security boundary for no gain.

---

*End of chapter 26.*
