# Chapter 16 — Layered Configuration with CLAUDE.md

## Learning objectives

- Explain what persistent configuration contributes and why it is not enforcement.
- Describe the configuration hierarchy and predict which instruction wins a conflict.
- Decide what belongs in an instruction file and what belongs in a retrieval source.
- Keep instructions short, testable, and version-controlled.
- Use directory-scoped rules in a large repository without duplicating guidance.
- Validate configuration changes with representative prompts before adoption.
- Recognize scenarios where a rule belongs in configuration, a permission, or a review gate.

## Key concepts

### Why persistent configuration exists

A conversation starts empty. The assistant knows general training and whatever the session has supplied, but not that your team writes migrations in a particular way or that generated SQL must be reviewed. Without standing guidance, every collaborator re-explains the same conventions, and the explanations drift. One person favors short functions; another describes a functional style. The assistant must reconcile them.

A file such as CLAUDE.md supplies a small set of persistent instructions loaded into context at the start of work. It lives in the repository, travels with the code, and changes through the same review process as any artifact. Because it is high-priority context, it shapes decisions throughout the session without repetition.

The key mental model is that configuration is context, not control. A rule in a file is a strong suggestion, not a permission boundary or a runtime check. If it says never to call the deployment tool, the assistant will usually comply, but a confused sequence could still reach that tool by another path. Hard guarantees belong in tooling: permissions, allowlists, validation, and pipeline checks. Configuration describes good behavior; enforcement prevents bad outcomes. Exam questions often turn on this distinction, favoring a mechanical control when a scenario says something must never happen.

> **Exam note:** A choice claiming that an instruction file prevents an action with certainty is an absolute-language trap. Instructions guide; permissions and checks enforce.

### The configuration hierarchy and load order

Most assistants assemble guidance from several places. The names vary, but the shape is stable. At the top sits organization-managed policy that contributors cannot override. Below that are project files committed to version control and shared by the team. Personal files apply to one user across projects; local overrides apply to one user in one project. Directory-scoped files load when work touches a particular subtree and are the most specific layer.

Think of a stack of transparencies: the global sheet sets defaults, the project sheet adds conventions, the directory sheet adds local exceptions, and a personal sheet adds habits. Where sheets overlap, the narrower or more authoritative one wins. Managed policy cannot be undone by a project file; a project convention can be refined by a directory rule; a personal preference should not silently contradict a shared rule.

| Level | Location | Audience | Should contain |
| --- | --- | --- | --- |
| Managed policy | Organization settings | Whole organization | Non-negotiable security rules |
| Project root | Repository root, versioned | Whole team | Conventions, build commands, review bar |
| Directory scoped | Subdirectories | Anyone in that subtree | Local exceptions, module constraints |
| Personal global | User home directory | One person, all projects | Tooling preferences, working style |
| Personal local | Project directory, ignored | One person, one project | Private environment details |

> **Common mistake:** Storing team rules in a personal preference file. If a reviewer cares about the rule, it belongs in the version-controlled project file.

### What belongs at each level

Managed policy holds rules that must survive disagreement: which tools may be called, which networks are reachable, which data may leave the environment. These need settings the assistant cannot ignore; prose alone invites the failure the policy was meant to prevent.

The project root file is the team's working agreement: how to build and test, which commands are safe to run, naming conventions, where key documents live, and the review bar for generated changes. Keep it short enough to remember after one read. A useful test asks whether each line has ever changed a decision. If not, delete it.

Directory-scoped files carry exceptions that would clutter the root. One service may use a different test runner, another may forbid a library, and a third may require generated code to remain untouched. Placing those rules beside the code keeps the root small and loads them only when relevant. The cost is discoverability, so the root file should index the scoped files that exist.

Personal files hold preferences that do not affect the deliverable: diff style, comment habits, a local proxy note. The boundary is simple: if a reviewer would care, it is not personal.

A second useful distinction separates instructions that change the deliverable from instructions that change the working style. Both belong in configuration, but labeling them helps a reader tell a product requirement from a workflow preference. When a deadline forces a quick edit, that clarity prevents someone from deleting a rule they mistakenly treat as cosmetic.

### Precedence and conflict resolution

Conflicts arise when several layers describe the same decision. A root file may require the full test suite, while a directory file prefers a fast unit target because integration tests need external services. Both are reasonable alone, but the assistant must choose; without an explicit rule it may alternate, producing unreproducible results.

Design for specificity. State the general rule once, then state the narrower exception with its triggering condition: in this module use the fast target, while the full suite runs in the pipeline. Avoid two rules of equal scope that disagree; that is ambiguity, not precedence. If a personal file repeatedly fights a project rule, remove or narrow the personal rule rather than shouting louder in the project file.

Some ordering is settled by the tool. Managed settings typically outrank everything and local overrides may outrank shared files, but you do not need a vendor-specific table. Remember the principles: authority beats preference, narrow scope beats broad scope, explicit conditions beat vague defaults. When a scenario shows contradictory guidance, choose the answer that removes the contradiction and creates a single source of truth.

| Conflict pattern | Why it is risky | Preferred resolution |
| --- | --- | --- |
| Opposite rules at the same scope | Behavior becomes unpredictable | Keep one owner for the decision |
| Broad rule plus narrow exception | The wrong one may be applied | Add a condition to the exception |
| Personal file overrides shared rule | Teammates get divergent results | Keep only preferences locally |
| Obsolete rule survives a code change | Old practice is enforced | Review and remove stale lines |

### Instruction file versus retrieval-based knowledge

A common error is pasting the whole wiki into the instruction file. It loads every session, so each paragraph competes with code, tool results, and history for context space, and it goes stale the moment the architecture changes.

Use the instruction file for stable, decision-changing guidance. Use a retrieval source for large or volatile facts: API references, runbooks, data dictionaries, design records, and regulatory text. Retrieval fetches a relevant slice on demand instead of carrying everything. The instruction file then holds a short pointer: where to look, when, and how much to trust what is found.

The dividing line is change frequency and size at once. Conventions are stable and small; reference material is volatile and large. Ask whether a stale copy would cause a wrong decision. If so, the text belongs in a system with an owner and an update path, not in a file nobody revises.

> **Try it:** Mark each paragraph of a real instruction file as a decision rule or background information. Move the background to a knowledge source; keep only rules that change behavior.

### Keeping instructions short and testable

Short instructions are more reliable. A rule buried at the end of a long file is less likely to influence an early decision, and a large file leaves less room for the task. Aim for a handful of imperative statements. A direct instruction to use the repository layer beats a paragraph on data-access philosophy.

Testability means an observable outcome. Requiring good tests is unverifiable; requiring a unit test for every new public function is checkable. When adding a rule, write one or two prompts that should trigger it and see whether behavior changes. If nothing changes, the rule is too vague or loaded too late.

Treat configuration as code: version it, review shared edits, and roll back regressions. A pull request that changes a standing instruction deserves the scrutiny of one that changes a build script, because both silently shape future results. Record why a rule exists so a later cleanup pass does not delete it.

Deduplication is part of keeping a file short. When two levels state the same rule, keep the version with the clearest scope and remove the other. A duplicated rule will eventually be edited in one place only, leaving the stale copy to mislead both the assistant and the next reviewer.

### Scoped rules for subdirectories

Large repositories are the strongest case for layering. A monorepo may hold a web client, services, generated code, and infrastructure definitions, each with its own conventions. One root file covering all of them becomes wrong everywhere; scoped files let each area speak for itself.

Keep a small root file with universal rules and an index of local files, then place detailed rules in the directory they govern. Keep rules as local as possible: a constraint one module needs should not rise to the project level. This improves relevance and ownership, because the team owning a directory maintains its instructions.

There is a cost. Scoped files load when their files are touched, so a cross-area task may assemble several instruction sets. Overlapping files may conflict, and a contributor who edits a file without opening the directory in the assistant may never see the rule. Mitigate with small files, a root index, and automated checks that catch a missed instruction before it becomes a missed requirement.

A practical convention is to treat the root file as a map. It names the areas that exist and points to their local instruction files rather than trying to describe every area in full. That keeps the shared agreement readable while still giving each team a place to record its own constraints.

### Testing instructions with representative prompts

Untested configuration becomes folklore. Build a small prompt set mirroring real work: add an endpoint, fix a failing test, refactor a module, write documentation. For each, note which rules should appear in the response, run it after configuration changes, and compare. This is a smoke test, not a benchmark.

Include a negative case that tempts a rule violation, such as a quick fix bypassing the repository layer. Effective configuration yields a compliant approach or a clear refusal. Include an ambiguous case to see whether the assistant asks a clarifying question or invents an assumption. That reveals whether instructions are specific enough.

Test from a clean session. Rules loaded at startup may behave differently from those added mid-conversation, and a rule that works after a long discussion may be ignored when read cold. A fresh session approximates the experience of a new contributor or a pipeline job.

The template below is deliberately short and uses pointers rather than embedded reference material.

```text
# Project guidance

## Standing rules
- Build: run the project build script before proposing a change.
- Tests: add a unit test for every new public function.
- Data: access the database only through the repository layer.
- Changes: keep diffs focused; do not reformat unrelated files.

## Safety boundaries
- Do not run deployment commands from an interactive session.
- Ask before deleting generated files or rewriting migrations.

## Local rules
- services/billing/: use the billing test target and leave generated code untouched.
- infra/: require a review of any change to permission definitions.

## Reference material
- Architecture notes and runbooks live in the knowledge base.
- Fetch the relevant page when a task touches an unfamiliar module.
```

## Worked scenario

A platform team maintains a repository with a web client and three services. Reviews repeatedly catch the same mistakes: direct database calls in one service, a test runner that does not exist in another, and formatting changes in generated code. The team decides to fix this with configuration rather than more reminders.

They inventory what exists. A root instruction file has grown long, containing build commands, an old architecture diagram, a testing philosophy, and a database rule buried in the middle. An engineer keeps a personal local file with a comment-style preference that accidentally restates the database rule more weakly. A directory file under one service prefers a fast test target but omits that the full suite runs in the pipeline, so contributors treat the suite as optional.

The team makes four changes. They rewrite the root file into testable rules and move the diagram and philosophy to the knowledge base with a pointer. They delete the duplicated database rule from the personal file. They refine the service rule to state both halves of the testing policy. They add a scoped file forbidding reformat of generated code, plus a lint check so a missed instruction still fails a check.

They validate with representative prompts. A feature prompt for the billing service produces the right test target, repository-based data access, and untouched generated files. A prompt asking for a quick direct query gets a refusal and a suggested diagnostic through the approved path. A fresh-session run produces the same conventions. When one rule still fails to appear, they shorten it and move it higher in the file.

Mistakes remain possible; the lint check and pipeline suite are the real safeguards. What changes is that contributors and assistant share a short, visible agreement that is versioned, reviewed, and tested like the rest of the system.

> **Exam note:** When long instructions, a contradictory personal file, and a missing mechanical check appear together, the best answer addresses all three: trim and point, remove the conflict, add enforcement.

## Common mistakes

- Treating a configuration file as a security boundary instead of guidance.
- Pasting large reference documents into an instruction file.
- Duplicating a rule at several levels, guaranteeing that one copy drifts.
- Letting personal preferences override conventions that reviewers depend on.
- Writing vague rules that produce no observable change in behavior.
- Adding scoped rules without an index in the root file.
- Changing shared instructions without review or a smoke test.
- Assuming a rule that worked in a long conversation applies in a clean session.

## Chapter summary

- Persistent configuration supplies standing guidance so conventions need not be restated.
- Instructions shape behavior but do not enforce it; permissions and checks provide guarantees.
- Hierarchy runs from managed policy to scoped and personal layers; authority and specificity decide conflicts.
- Stable rules belong in the instruction file; volatile reference material belongs in retrieval.
- Short, observable rules outperform long explanations.
- Scoped files keep monorepo guidance local but need an index and automated backstops.
- Validate changes with representative prompts, including negative cases, in a clean session.

## Checkpoint questions

1. A team must guarantee that an assistant can never call a production deployment tool. Which approach is strongest?

A. Add a clearly worded rule to the project instruction file.

B. Configure a permission that blocks the call.

C. Put the restriction in the knowledge base for retrieval.

D. Ask the assistant each session to avoid deployment commands.

2. Which item best belongs in a project instruction file?

A. The full architecture diagram.

B. A copy of the vendor API reference.

C. A rule that database access uses the repository layer.

D. A record of every past design decision.

3. A root file requires the full test suite; a directory file prefers a fast unit target. What is the best correction?

A. Delete the directory file.

B. Add a stronger third rule at the project level.

C. State the condition in the directory rule and note that the full suite runs in the pipeline.

D. Let the assistant choose whichever rule it finds first.

4. What is the main risk of team-wide rules in a personal local file?

A. Such files load too late in a session.

B. Teammates cannot see them, so results diverge.

C. Such files cannot contain rules at all.

D. They are promoted automatically to managed policy.

5. Which statement about directory-scoped configuration is most accurate?

A. It removes the need for project-level rules.

B. It suits local exceptions but needs an index and automated checks.

C. It applies to every file in the repository.

D. It cannot conflict with other levels.

6. A rule does not change behavior in a representative prompt. What should be done first?

A. Add more rules until one works.

B. Abandon configuration entirely.

C. Check whether it is vague, duplicated, or unloaded, then rewrite it.

D. Move it to the knowledge base and stop testing.

7. Why test configuration in a clean session?

A. It proves managed policy can be overridden.

B. It shows whether rules load at startup rather than arise from conversation.

C. It removes the need for review.

D. It guarantees no clarifying questions will be asked.

### Answers and rationale

**1. Correct answer: B.** A permission is mechanical and blocks the call regardless of intent. A is wrong because an instruction is persuasive context, not enforcement. C is wrong because a retrieved rule must first be fetched and still only advises. D is wrong because a per-session request remains a prompt-level measure.

**2. Correct answer: C.** A stable convention that changes decisions is ideal instruction-file content. A and B are large, change independently, and belong in retrieval. D is a historical record, not standing guidance, and would make the file stale.

**3. Correct answer: C.** Adding the condition and naming the pipeline suite keeps both policies and removes ambiguity. A discards a genuine local constraint. B creates another conflict at the same scope. D leaves behavior inconsistent and unreviewable.

**4. Correct answer: B.** A local personal file is not shared, so identical repositories yield different results. A is wrong because timing is not the core problem. C is wrong because personal files can hold personal preferences. D is wrong because promotion is an administrative act.

**5. Correct answer: B.** Scoped files handle local exceptions best when indexed and backed by checks. A is wrong because they complement project rules. C is wrong because narrow scope defines them. D is wrong because levels do conflict, which is why precedence matters.

**6. Correct answer: C.** Diagnose first: check vagueness, duplication, or load context, then rewrite for an observable outcome. A compounds ambiguity. B overreacts to one failure. D makes the rule less consistently present.

**7. Correct answer: B.** A fresh session reveals whether rules load at startup, as they do for new contributors and automation. A is wrong because managed policy should not be overridden. C is wrong because testing supplements review. D is wrong because no test removes ambiguity handling.

---

*End of chapter 16.*
