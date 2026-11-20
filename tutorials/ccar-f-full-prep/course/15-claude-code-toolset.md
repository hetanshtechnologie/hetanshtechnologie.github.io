# Chapter 15 — The Claude Code Toolset and Local Workflows

## Learning objectives

- Describe the common tools available in a repository coding assistant and the purpose each serves.
- Map local coding tools back to the same definition, error, and context principles used for API tools.
- Compare permission modes and understand the risk each one accepts.
- Distinguish planning from execution and know when to switch between them.
- Design a local workflow that is repeatable, reviewable, and bounded.
- Decide when a subagent inside a coding session improves the work and when it adds overhead.

## Key concepts

### The coding session as a tool-using loop

A repository coding assistant is not a chat window with file access bolted on. It is an agent operating in a loop: it reads the current state of the workspace, decides on a next action, calls a tool, observes the result, and continues. The repository is the environment, and the tools are the means by which the assistant perceives and changes that environment. Understanding this loop explains why tool design and workflow design matter as much here as in any other agentic system.

The session also has state that is not stored in the model. Files on disk, the current branch, the set of changed files, and the output of commands are all part of the situation the assistant must track. A good local workflow makes that state legible, so that the assistant can orient itself after each step rather than relying on memory. This is the same principle as external memory in a longer agent run: the environment is the source of truth, and the conversation is a working view of it.

> **Exam note:** Questions about a coding assistant often hinge on the same ideas as other tool questions. If a change is risky, look for a narrower tool, an explicit permission gate, or a verification step rather than a better worded prompt.

### Reading, searching, and editing files

The most frequently used tools are the ones that let the assistant see and change files. Reading a file returns its contents, often with line references so that later edits can be precise. Searching locates relevant files or passages without requiring the assistant to open everything, which protects the context budget. Editing applies a targeted change, such as replacing a specific block or inserting text at a located position, rather than rewriting an entire file blindly.

These tools differ in risk. Reading and searching are observational and naturally safe, though their output can be large enough to crowd the context window. Editing is a side effect and deserves the same care as any mutating tool: a clear target, a bounded change, and a way to verify the result. A vague edit instruction can alter the wrong region, and a large edit can hide a mistake that a smaller, staged change would expose.

The assistant's choice among these tools is driven by the definitions it sees. A search tool whose description states which file types it covers and how many matches it returns is easier to route correctly than one called simply "find." An edit tool whose schema requires an exact target and a replacement block makes malformed calls less likely. These are the same routing and schema principles from the tool layer, applied to a local setting.

| Tool family | Purpose | Risk profile | Good design habit |
| --- | --- | --- | --- |
| Read file | Inspect contents of a known file | Low, but output can be large | Bound the returned range |
| Search | Locate files or passages by pattern | Low, with context cost | Return limited, ranked matches |
| Edit file | Apply a targeted change | Medium, side effect | Require exact target and verify |
| Run command | Execute a process or script | High, arbitrary effects | Confirm and scope the command |
| Manage task | Track or hand off work | Low to medium | Keep records short and explicit |

### Running commands and managing tasks

A command tool lets the assistant run processes in the workspace: build scripts, test runners, package installers, version-control operations, and other utilities. This is the highest-leverage tool in the local set and the one with the widest potential impact. A command can read data, write files, contact a network service, or change system state. Because the effect is hard to predict from the command text alone, command execution is where permission modes and confirmation matter most.

A task tool, by contrast, manages the work itself. It may record a list of steps, mark progress, or hand a scoped piece of work to another agent. It does not change the product directly, but it shapes what gets done next. Used well, it makes a long session navigable: the assistant can see what remains, avoid repeating completed steps, and hand off isolated work without losing the thread. Used poorly, it becomes a stale list that drifts away from the actual state of the repository.

Both tools benefit from the same error discipline described earlier. A failed command should return a structured result with an exit status and relevant output, not a silent gap. A handed-off task should return an outcome that says whether it completed, what changed, and what remains. Treating these as ordinary tool results keeps them inside the loop, where the assistant can decide how to proceed.

### Mapping local tools to the same design principles

It is tempting to treat local coding tools as a special category governed by different rules. They are not. The principle that a description is a routing instruction applies directly: the assistant must know when to search rather than read, and when to read rather than edit. The principle that schemas should be strict where mistakes are expensive applies directly: an edit that requires an exact target is safer than one that accepts a loose description. The principle that errors should be actionable applies directly: a test failure with a specific file and message is far more useful than a generic failure flag.

Context principles apply as well. Command output can be enormous, and a tool that returns an entire log to the conversation will crowd out the reasoning it is meant to support. A well-designed local workflow filters or summarizes output before it re-enters the loop, keeping the relevant lines and discarding the rest. This is the raw-versus-distilled choice from the tool layer, now playing out in a terminal session.

The main difference is proximity to the user. In a local coding session, a person is often watching, which allows confirmation to be interactive. That convenience should not be confused with safety. An interactive confirmation is only useful if the question clearly describes the action and its consequences. A prompt that asks whether to "continue" without naming the command transfers risk to a user who may not be paying close attention.

### Permission modes and risk

Permission modes express how much a coding assistant may do without asking. At one end, every action requires explicit approval, which maximizes control but interrupts flow constantly. At the other end, the assistant may read, edit, and run commands freely, which is fast but accepts the risk that a mistaken action is applied immediately. Intermediate modes typically allow reads automatically while requiring confirmation for edits or commands, or allow commands from an approved list while blocking others.

The right mode depends on the cost of a wrong action and the quality of the verification available. When tests are comprehensive and version control makes changes easy to reverse, a more permissive mode may be reasonable. When the repository contains sensitive data or the commands can reach production systems, a stricter mode is appropriate. Permission should be treated as a setting tied to a task and an environment, not as a permanent preference.

| Mode | What is allowed without asking | Risk accepted | Suitable context |
| --- | --- | --- | --- |
| Strict | Nothing, or reads only | Very low, with frequent interruptions | Sensitive or unfamiliar work |
| Guided | Reads and scoped edits | Low to medium, edits still reviewable | Routine feature work |
| Delegated | Edits and approved commands | Medium, relies on guardrails | Well-tested local changes |
| Open | Broad command execution | High, mistakes apply immediately | Isolated throwaway environments |

> **Common mistake:** Choosing a permissive mode for convenience and then relying on the assistant to "be careful." Carefulness is not a control; permission scope and verification are.

### Planning versus execution

Many coding assistants support a separation between planning and execution. In planning mode, the assistant investigates the repository, proposes an approach, and lists the changes it intends to make, without applying them. In execution mode, it carries out the plan through tool calls. The value of the separation is that a wrong approach is cheaper to correct before any files change. A reviewer can read a short plan and spot a flawed assumption that would only become visible after a messy series of edits.

Planning is most useful for tasks with several interacting changes, ambiguous requirements, or risk of touching unfamiliar code. It is less useful for small, well-understood edits where the overhead of a plan exceeds the benefit. The decision mirrors the broader principle of matching process weight to the cost of failure. A typo fix does not need a design review; a change to authentication logic does.

A plan is not a contract that must be followed blindly. During execution, the assistant observes new information: a test reveals an assumption was wrong, or a file differs from what was expected. It should be able to revise the plan and say so. What matters is that the revision is visible, not that the original plan is preserved at all costs. A workflow that treats the plan as immutable encourages the assistant to force the repository to fit an outdated idea.

### Designing a repeatable local workflow

A repeatable workflow turns a one-time success into a dependable process. It starts with orientation: confirm the current branch, look at changed files, and read the relevant instructions in the project. It then moves to a bounded investigation, using search and targeted reads to locate the code involved. Next comes a plan for non-trivial work, followed by small edits, each checked by a test or a targeted read. Finally, the assistant reviews the diff and reports what changed and what remains uncertain.

The workflow should be written down in a form the assistant can consult, not carried in the conversation alone. Project guidance files and reusable instruction packages serve this purpose, and the following chapters develop them in detail. A short workflow sketch makes the expected sequence explicit and gives the assistant a way to reorient after an interruption.

```text
LOCAL WORKFLOW: implement a bounded change

1. ORIENT
   - confirm current branch and list changed files
   - read project guidance and scoped rules for the area
2. INVESTIGATE
   - search for the relevant symbols and call sites
   - read only the ranges needed to understand the change
3. PLAN (skip only for trivial edits)
   - state the files to touch and the intended behavior
   - name the check that will verify the result
4. EXECUTE
   - apply one focused edit at a time
   - run the targeted test after each edit
   - if a test fails, return a structured result with file and message
5. VERIFY
   - review the complete diff for unintended changes
   - confirm no unrelated files were modified
6. REPORT
   - summarize changes, checks run, and remaining uncertainty
```

The sketch also illustrates where controls sit. Step limits, allowed commands, and approval gates belong to the environment and the permission configuration, not to a sentence in the prompt. A workflow that says "be careful with commands" is guidance; a configured rule that blocks a category of commands is enforcement. Repeatability comes from the second kind.

> **Try it:** After finishing a coding session, rewrite the sequence you followed as a compact checklist. If the steps are hard to name, the session probably depended on improvisation rather than a repeatable process.

### When to use a subagent inside a coding session

A subagent is a scoped helper launched for a specific piece of work, with its own context and a defined brief. In a coding session it is useful when a task can be isolated: exploring an unfamiliar part of the codebase, reviewing a change from a different angle, or gathering information that would otherwise flood the main conversation. The main thread receives a distilled result, keeping its context clean for the decisions that require the full picture.

Subagents are not free. Each one needs a brief, consumes its own resources, and may duplicate investigation that the main thread has already done. They are a poor fit for tightly coupled edits where two workers would step on one another, or for tasks where the brief cannot be stated clearly. If you cannot describe what the helper should produce in a few sentences, the task is probably not ready to be handed off.

The handoff should specify the goal, the allowed tools, the scope of files or directories, and the exact shape of the expected result. It should also state what the helper must not do, such as committing changes or editing outside its scope. That boundary is the coding-session version of the isolation and authority separation discussed in the multi-agent chapter. A well-briefed helper returns a concise finding; a vague brief returns a wall of exploration that defeats the purpose.

## Worked scenario

A team asked an assistant to add input validation to a form used in a customer portal. The first attempt went badly: the assistant edited three files, ran a broad test command that produced a huge log, and introduced a change in an unrelated module because a search result looked similar. A reviewer had to unwind part of the work before trying again.

The diagnosis identified three problems. The session began with execution instead of orientation, so the assistant never checked which files were already modified. The edit tool was used with a loose target, allowing an over-broad replacement. The command tool returned the full test log into the conversation, which consumed context and buried the single failing case.

The team restructured the session. They set a guided permission mode so edits required confirmation, wrote a brief plan naming the two files that legitimately needed changes, and used targeted reads before each edit. They configured the test command to return only failures and a short summary. A subagent was launched with a narrow brief to review the modified files for unintended changes, with no permission to edit anything.

The second attempt stayed within the planned scope, the failing check was visible immediately, and the review subagent returned a short finding about one unnecessary import. The change was not more sophisticated, but the workflow constrained where mistakes could occur and made each one visible early.

## Common mistakes

- Treating a coding assistant as a chat feature rather than a tool-using agent with an observable loop.
- Letting command output flood the conversation instead of filtering it before it re-enters context.
- Choosing a permissive permission mode and relying on the assistant to be careful.
- Skipping planning for changes that touch several interacting files.
- Treating a plan as immutable when execution reveals new information.
- Launching a subagent with a vague brief or overlapping scope.
- Reporting a task as complete without reviewing the diff for unintended changes.

## Chapter summary

- A coding assistant operates in the same observe, decide, act loop as any other agent, with the repository as its environment.
- Reading, searching, editing, running commands, and managing tasks are tools with distinct purposes and risk profiles.
- Local tools follow the same description, schema, error, and context principles as API tools.
- Permission modes trade interruption for risk and should be chosen per task and environment.
- Planning separates cheap correction from expensive rework, and plans should be revisable.
- Repeatable workflows put orientation, bounded investigation, small edits, and verification in a visible sequence.
- Subagents help when work is isolatable and the brief is crisp; they add cost when tasks are coupled.

## Checkpoint questions

1. A test command returns thousands of lines into the conversation, and the assistant loses track of the actual failure. Which change best addresses the problem?

- A. Ask the assistant to read more carefully.
- B. Filter or summarize command output so only relevant failures re-enter the loop.
- C. Switch to a stricter permission mode.
- D. Remove the test command from the available tools.

2. Which tool is most appropriate for locating the definition of a symbol without opening every file?

- A. Read file.
- B. Search.
- C. Edit file.
- D. Manage task.

3. What is the main benefit of planning mode for a multi-file change?

- A. It removes the need to run tests.
- B. It lets a reviewer catch a wrong approach before files change.
- C. It guarantees the plan will be correct.
- D. It hides the changes from other tools.

4. A repository contains sensitive records and unfamiliar scripts. Which permission mode is most defensible?

- A. Open execution, for speed.
- B. Delegated execution, because tests exist.
- C. Strict approval, because the cost of a wrong action is high.
- D. No permissions at all, because the assistant cannot be trusted.

5. When is a subagent most useful in a coding session?

- A. When the task can be isolated and the expected result can be stated precisely.
- B. When two workers need to edit the same file at the same time.
- C. When the brief cannot be written clearly.
- D. When the goal is to avoid describing any constraints.

6. Which step best makes a local workflow repeatable?

- A. Relying on the assistant to remember the sequence each time.
- B. Writing the sequence down as a short checklist the assistant can consult.
- C. Using the longest possible prompts.
- D. Skipping verification to save steps.

### Answers and rationale

1. Correct: B. Bounding output keeps the relevant failure visible and protects context. A is wrong because attention is not a control. C is wrong because permission mode does not change output size. D is wrong because removing tests eliminates valuable feedback.

2. Correct: B. Search is designed to locate passages without reading everything. A is wrong because reading requires knowing the file first. C is wrong because editing does not locate definitions. D is wrong because task management tracks work, not code.

3. Correct: B. A plan exposes assumptions before changes are applied. A is wrong because tests are still needed. C is wrong because a plan can be flawed. D is wrong because hiding changes is not a benefit.

4. Correct: C. High consequence and low familiarity justify strict approval. A is wrong because speed does not reduce risk. B is wrong because existing tests do not cover unfamiliar scripts. D is wrong because some permission is needed for useful work.

5. Correct: A. Isolation and a precise brief are the conditions under which delegation pays off. B is wrong because overlapping edits cause conflicts. C and D are wrong because a vague brief produces unfocused exploration.

6. Correct: B. An external checklist survives interruptions and makes the sequence consistent. A is wrong because model memory is unreliable across sessions. C is wrong because prompt length is not structure. D is wrong because verification is central to reliability.

---

*End of chapter 15.*
