# Chapter 17 — Skills, Commands, and Reusable Instruction Packages

## Learning objectives

- Define a skill as a packaged capability and explain how on-demand loading protects the context budget.
- Distinguish a user-invoked command from an assistant-selected skill.
- Decide when a repeated task deserves a skill and when a one-off prompt is enough.
- Write a skill with a clear trigger, ordered steps, constraints, and an example.
- Explain how skills and subagents complement each other rather than compete.
- Maintain, version, and test skills so that they stay accurate and discoverable.
- Recognize exam scenarios where a skill, a configuration rule, a subagent, or a plain prompt is the right instrument.

## Key concepts

### What a skill is

A skill is a self-contained package of instructions that gives an assistant a repeatable capability. It is not a single clever sentence. It typically includes a short description used for discovery, a body describing a procedure, guardrails, and optional supporting files such as reference tables, templates, or scripts. The assistant sees the names and descriptions of available skills and loads the full body only when a task matches.

That loading behavior is the central design idea, often called progressive disclosure. Metadata is cheap and stays in context; the detailed procedure is loaded on demand; large reference files are opened only when a step calls for them. A well-designed skill therefore behaves like a well-indexed manual rather than a manual read aloud at the start of every conversation. It preserves the context window for the actual work while still making specialized knowledge available.

A skill also changes who owns a procedure. Instead of relying on each person to type a careful instruction, a team encodes it once, reviews it, and shares it. The result is consistency: the same task follows the same steps and produces the same output shape.

> **Exam note:** A skill is primarily a context and consistency mechanism. If a scenario emphasizes scarce context, repeated work, or inconsistent results, a skill is a strong candidate.

### Commands versus skills

A command is an explicit, user-initiated shortcut. The user types a known name and the assistant performs a defined action or applies a defined instruction. A skill is a capability the assistant chooses to draw on when it recognizes a matching task. The difference is who decides to invoke it: with a command, the user decides; with a skill, the assistant decides based on the trigger description.

Commands are excellent for deterministic operations that should happen exactly when requested: formatting a document, running a standard check, starting a structured review. Because the user names them, they are predictable and easy to audit. Skills are better for procedures that require judgment about applicability. A request to look at a contract might need a risk review, a summary, or a drafting pass; a skill's description helps the assistant select the right capability without the user knowing the catalog.

The two mechanisms are complementary. A command can start a workflow whose steps then cause one or more skills to be loaded. A skill can describe a procedure that includes running a command. The exam rarely asks which one is universally better; it asks which one fits the stated control and discovery needs.

| Aspect | Command | Skill |
| --- | --- | --- |
| Who initiates | The user, explicitly | The assistant, when a task matches |
| Nature | A named shortcut to an action | A packaged procedure with references |
| Scope | Usually one operation | Multi-step work with guardrails |
| Discovery | Visible in a command list | Chosen from name and description |
| Context cost | Text applied on invocation | Metadata first, body loaded on match |
| Best for | Frequent deterministic actions | Repeated judgment-heavy work |

### When a skill beats a one-off prompt

A one-off prompt is the right tool for a unique, short, or exploratory task. If you need a single summary of a single document, writing the instruction directly is faster than maintaining a package. The overhead of a skill is only justified when the same procedure will recur, when the output must be consistent across people, or when the task requires reference material that would otherwise be pasted repeatedly.

A skill earns its place under several conditions. The task repeats across sessions or teams. The procedure has several steps that are easy to forget or reorder. There is house knowledge that is not obvious from the request, such as a review profile or an output convention. The work carries risk if done casually, so constraints must travel with the instructions. Or the output is consumed by another system and must keep a stable shape. In each case, the skill converts tacit practice into an inspectable artifact.

The reverse test is equally useful. If a proposed skill has one step, no references, no constraints, and one user for one afternoon, keep it as a prompt. A package for a single use adds maintenance without reliability, and a catalog crowded with narrow skills is harder to route correctly.

> **Try it:** Look at your last few repeated assistant tasks. For each, ask whether the same procedure ran twice, whether a reviewer could describe the expected output, and whether a mistake would matter. Two yes answers justify drafting a skill.

### Anatomy of a skill

A useful skill has four parts: a trigger, steps, constraints, and an example. The trigger tells the assistant when the skill applies and when it does not. Steps describe the procedure in an order that reflects dependencies, with a verification action at the end. Constraints state what the assistant must not do and what it must do when information is missing. The example shows one input and the expected shape of the output, which removes ambiguity that prose alone cannot settle.

Supporting material belongs in separate files referenced by the steps. A review profile, a schema, a style checklist, or a lookup table should not be pasted into the body unless it is short and used on every run. Keeping it separate means the assistant opens it only when needed, which is the same progressive-disclosure logic that justifies the skill in the first place.

The template below shows the structure in a compact form. It describes a review capability without embedding a full contract or a vendor standard.

```text
name: contract-risk-review
description: Assess an existing agreement for risk when asked for a contract
  review, a risk pass, or a redline. Do not use for drafting a new agreement
  or for a summary only.

trigger
- Use when: an existing document or clause needs a risk assessment.
- Skip when: the user wants a first draft, a translation, or a plain summary.

inputs
- The document or clause text.
- A named review profile, if supplied; otherwise the standard profile.

steps
1. Identify the document type and the roles of the parties at a high level.
2. Check each clause against the review profile and record a finding.
3. Assign a severity to each finding and quote the exact clause text.
4. Propose a concrete replacement for each high-severity finding.
5. Return a structured summary and ask before editing any source file.

constraints
- Never approve a clause or state a legal conclusion.
- Do not invent missing terms; record them as absent.
- Quote only cited clauses, not the whole document.

example
- Input: a clause limiting liability to fees paid.
- Output: one finding with severity, the quoted clause, and a replacement.

verification
- Confirm that every finding has a citation before returning the summary.
```

Notice that the description carries both positive and negative triggers. Without the negative half, the skill would compete with drafting and summarization tasks, producing wrong selections that look confident. Notice also that the final step asks before editing a source file, which keeps a review capability from quietly becoming a modification capability.

### Trigger design and routing quality

The description is routing metadata, and its quality determines whether the skill is ever used correctly. A description that says only the topic, such as handling documents, is too broad: it will attract tasks the skill cannot serve. A description that says only an internal name is too narrow: the assistant will not connect it to ordinary user language. Effective descriptions state the capability, the situations that call for it, and the situations that exclude it, using the words a requester is likely to use.

Routing errors come in two forms. Under-triggering happens when a relevant task is handled without the skill, so the assistant improvises a procedure and misses constraints. Over-triggering happens when an unrelated task pulls in the skill, adding irrelevant steps and possibly changing the output shape. Both are diagnosed by testing with realistic prompts, not by reading the description in isolation. Keep a small set of prompts that should trigger the skill and a similar set that should not, and check both after any edit to the description.

Where several skills address nearby tasks, make their boundaries explicit in each description. Overlapping skills are not inherently wrong, but vague boundaries make selection arbitrary. When two skills regularly compete, either merge them or sharpen the trigger language so that each owns a distinct situation. A catalog with clear boundaries is more valuable than a larger catalog with fuzzy ones.

### Skills and subagents

A skill is a package of knowledge and procedure. A subagent is an isolated worker with its own context, instructions, tools, and authority. They operate on different axes. A skill answers what to do and how to do it; a subagent answers who does it and in what context. Confusing the two leads designs that add isolation when what was needed was guidance, or guidance when what was needed was containment.

The mechanisms combine naturally. A skill can instruct the assistant to delegate a bounded portion of work to a subagent, passing only the material that subagent needs. That keeps a large reference document or a large search result out of the main thread. Conversely, a subagent can be given a skill as part of its brief, so that its isolated work follows the same procedure as the main thread. In both patterns, the skill carries the standard and the subagent supplies the boundary.

The decision rule depends on the failure you are guarding against. If the risk is inconsistency, use a skill. If the risk is context pollution, conflicting decisions, or excessive authority in one thread, use a subagent. If both risks exist, use both: the skill defines the steps and verification, and the subagent executes them in a scope that cannot touch unrelated parts of the system. Remember that creating a subagent has coordination cost, so it should be justified by isolation or parallelism, not by habit.

| Mechanism | What it carries | Loaded when | Best for |
| --- | --- | --- | --- |
| Configuration file | Standing project rules | Session start or directory entry | Conventions and boundaries |
| Skill | A reusable procedure and references | A task matches its trigger | Repeated specialized work |
| Subagent | An isolated worker and its authority | An orchestrator creates it | Parallel or risky work |
| One-off prompt | Task-specific instructions | Immediately | Unique short tasks |

### Maintenance, versioning, and testing

Skills are software artifacts even when they contain no code. Give each one an owner, a version, and a short record of what changed and why. Store them where reviews can see them, and require review for edits to widely used skills. A change to a skill silently changes future behavior across many sessions, which is exactly the kind of change that should not happen unnoticed.

Testing covers two separate properties. Trigger testing asks whether the right skill loads for a representative prompt and whether unrelated prompts leave it unloaded. Output testing asks whether the skill's steps produce the expected shape and whether its constraints hold under temptation. A negative test should try to make the skill violate its own rule, such as asking a review skill to approve a clause. If the skill complies, the constraints are decorative rather than effective.

Versioning matters when outputs feed other systems. If a validator expects fixed field names, changing them is a breaking change even when the prose improves. Keep the output contract stable, announce intentional changes, and retire obsolete skills explicitly. A smaller catalog with accurate triggers outperforms a large one full of abandoned packages.

> **Common mistake:** Treating a skill as documentation rather than as a behavior change. If editing the skill never changes what the assistant does, the package is not earning its maintenance cost.

## Worked scenario

A risk team uses an assistant to review supplier agreements. Reviews vary widely: one reviewer gets a short list of general comments, another gets a detailed table with clause citations, and a third asks the assistant to rewrite whole sections without being asked. A team lead wants consistent output without typing a long instruction each time.

The team first separates the need into pieces. The standing rule that reviews must not be treated as approvals belongs in configuration, because it applies to every session in the workspace. The repeated review procedure, the severity scale, and the output table belong in a skill, because they are specialized and used often. The task of reading a long annex and extracting every obligation is delegated to a subagent, because that material would otherwise crowd the main thread and risk mixing with other documents.

They draft a review skill with a description that names both the positive and negative cases: use it for a risk pass on an existing agreement, skip it for drafting or plain summarization. The steps require a citation for each finding, a severity label, and a proposed replacement for high-severity items. The constraints forbid legal conclusions and edits to source files without permission. A short example shows the expected table row. The severity scale and the house review profile live in a separate reference file that the steps open only when needed.

They then test routing and output. A prompt asking for a risk pass loads the skill. A prompt asking for a first draft does not. A prompt that says only look at this contract is handled by asking which kind of review is wanted, because the description does not claim drafting work. In the output test, a clause limiting liability produces a finding with the quoted text and a replacement. A direct request to just approve this clause is refused, confirming that the constraint is active. The annex extraction runs in a subagent that receives only the annex and returns a compact obligation list.

After two weeks, the team updates the severity scale. Because the output shape is versioned, they keep the field names unchanged and record the change in a short log. A stale skill for a retired review profile is removed from the catalog so that it cannot compete with the current one. Reviews now arrive in a consistent form, and the team can point to a specific skill version when explaining how a result was produced.

> **Exam note:** When a scenario mixes inconsistent repeated work, a rule that must always hold, and a bulky document, expect an answer that uses configuration for the rule, a skill for the procedure, and a subagent for the bulky material.

## Common mistakes

- Writing a description that names only a topic, causing over-triggering on unrelated tasks.
- Omitting negative triggers so a skill competes with similar capabilities.
- Pasting large reference tables into the skill body instead of linking them.
- Listing steps without a verification action, so omissions pass unnoticed.
- Treating constraints as decorative prose while allowing actions that violate them.
- Creating a skill for a one-off task and adding maintenance without benefit.
- Letting several skills cover the same situation with blurry boundaries.
- Editing a widely used skill without review, versioning, or trigger tests.
- Using a subagent when isolation is unnecessary, adding coordination cost for no gain.

## Chapter summary

- A skill packages a repeatable capability and loads its detail on demand, preserving context.
- Commands are user-invoked shortcuts; skills are assistant-selected capabilities chosen from their descriptions.
- Skills are justified by repetition, required consistency, specialized references, or meaningful risk.
- A complete skill has a trigger, ordered steps, constraints, and an example, with bulky references kept separate.
- Trigger quality is tested with both matching and non-matching prompts.
- Skills carry procedure; subagents carry isolation and authority; the two combine cleanly.
- Skills need owners, versions, reviews, and periodic pruning like any other software artifact.

## Checkpoint questions

1. What mainly distinguishes a command from a skill?

A. Commands are written in code; skills are written in prose.

B. The user explicitly invokes a command, while the assistant selects a skill by its trigger.

C. Skills can run tools; commands cannot.

D. Commands are stored in a repository; skills are stored in a conversation.

2. Which task best justifies creating a skill?

A. Summarizing one document once.

B. A repeated multi-step review with a house profile and required output shape.

C. A single question about a term.

D. A short translation of one paragraph.

3. Which part of a skill tells the assistant when not to use it?

A. The example.

B. The steps.

C. The description or trigger.

D. The verification action.

4. A skill keeps loading for drafting tasks it should ignore. What is the best fix?

A. Add more steps to the procedure.

B. Add negative trigger language and sharpen the boundary against drafting.

C. Remove the example.

D. Delegate every task to a subagent.

5. What does a subagent provide that a skill does not?

A. A repeatable procedure.

B. A structured output shape.

C. Isolated context and bounded authority.

D. A description used for discovery.

6. A team must keep a large annex out of the main conversation while reviewing it. Which combination fits best?

A. A skill for the procedure and a subagent for the annex extraction.

B. A longer one-off prompt.

C. A command with no skill.

D. A second configuration file for the annex.

7. Why should skill outputs keep stable field names across versions?

A. Stable names make the trigger more accurate.

B. Downstream validators may depend on the shape, so a rename is a breaking change.

C. Stable names remove the need for examples.

D. Stable names prevent over-triggering.

### Answers and rationale

**1. Correct answer: B.** The defining difference is who initiates the mechanism. A is wrong because both can be authored as text or code depending on the tool. C is wrong because both may use tools. D is wrong because storage location is an implementation detail, not a conceptual distinction.

**2. Correct answer: B.** Repetition, a house profile, and a required output shape are the classic signals that a skill will pay for itself. A, C, and D are one-off or trivial tasks where a direct prompt is faster and a package would add maintenance with no consistency benefit.

**3. Correct answer: C.** The description and trigger carry both positive and negative applicability conditions. A is wrong because an example shows shape, not scope. B is wrong because steps run after selection. D is wrong because verification checks the result, not the choice to load the skill.

**4. Correct answer: B.** Over-triggering is a routing problem, so the boundary in the description is the instrument to correct. A adds work after the wrong selection has already happened. C removes a useful disambiguator. D adds coordination cost without addressing why the skill was chosen.

**5. Correct answer: C.** A subagent is an isolated worker with its own context and authority, which a skill does not supply. A and B are properties of skills. D is also a property of skills, since discovery depends on descriptions.

**6. Correct answer: A.** The skill carries the review procedure and constraints, while the subagent handles the bulky material in a separate context. B keeps the annex in the main thread. C provides no repeatable procedure. D confuses configuration, which holds standing rules, with a mechanism for handling a large document.

**7. Correct answer: B.** Field names form an output contract that downstream validators may rely on, so changing them is a breaking change. A is wrong because trigger accuracy depends on the description, not field names. C is wrong because examples still clarify intent. D is wrong because over-triggering is controlled by trigger language.

---

*End of chapter 17.*
