# Chapter 17 — Workflow or Agent? Choosing the Shape

## Learning objectives

- Explain the difference between a pipeline whose order is written in code and a loop whose order is decided during a run.
- Apply ambiguity, adaptation, cost, latency, auditability, and blast radius to a described requirement.
- Recognize a loop built where a pipeline would have been enough, and a pipeline forced onto work that needs adaptation.
- Place irreversible actions outside an agent's discretion while keeping exploration inside it.
- Defend a shape choice using scenario-style reasoning rather than product preferences.

## Key concepts

### One toolkit, two ways to steer

Before choosing a model or writing a prompt, a developer has to decide what kind of program is being built. Both options available here use the same ingredients: a model, a set of tools, some stored data, and a log. They differ in where the sequence of operations comes from.

In a **deterministic workflow**, the sequence is a property of the source code. Each step calls the next because a developer wrote it that way. A model may extract a value inside a step, but it never decides which step runs next. The same input under the same conditions follows the same path.

In an **autonomous agent**, the sequence is an outcome of the run. The developer supplies a goal, an allowed tool set, a context view, and limits. The model proposes the next move, the program executes it, and the result changes what the model sees next. The word autonomous describes who selects the next step, not whether the system is governed. A well-built agent is autonomous inside a boundary that a developer designed deliberately.

A scanned benefits form turned into a case record is a workflow: extract fields, check a rules table, write the record, send a confirmation. If a field is missing, code branches to a "needs review" path. By contrast, investigating why a shipment stalled is agentic. The system might read tracking events, check carrier notices, then discover a warehouse closure and look up staffing logs. Nobody can list that sequence in advance because each step depends on the previous discovery.

> **Exam note:** A model call inside a fixed sequence does not make the system an agent. The test is whether the model chooses the next step, not whether a model appears somewhere in the design.

Most production systems sit between these extremes. A workflow can contain a small agentic step, and an agent can sit inside a rigid outer frame that requires a signature before publication. Hybrids are normal; the skill is putting agency only where genuine uncertainty lives.

Consider a short case. A helper for internal runbooks always retrieves one document and summarizes it, which works until users ask questions spanning two systems. The team adds retrieval branches until the code is a maze of special cases. The honest diagnosis is not that the pipeline needs another branch; it is that the path now depends on what the first retrieval returned.

### A decision table before any code

Use a handful of questions to test the shape; read the answers together.

| Question to ask | Points to a workflow when | Points to an agent when | Why it matters |
| --- | --- | --- | --- |
| Can every step and branch be listed now? | Yes, the list is short and stable | No, new cases keep appearing | Unwritten branches are where a pipeline breaks |
| Does the next step depend on earlier results? | Rarely; inputs are uniform | Often; discoveries redirect the work | Dependency on findings is the core signal |
| How many steps does a typical request take? | A fixed count | A variable count | Variable length is hard to express as code branches |
| What is the cost and latency contract? | A fixed price and response time are promised | A capped range is acceptable | Agents accumulate tokens across iterations |
| Must an auditor reconstruct the exact path? | Yes, and the same path must repeat | Yes, but decisions must be logged | An agent's path is not visible in source code |
| What does a wrong step cost? | Cheap to undo and invisible | Hard to reverse or externally visible | Blast radius determines where approval belongs |
| Is success machine-checkable? | Yes, through a schema or rule | Only partly; judgment is needed | A verifier gives an agent something to iterate toward |
| How quickly do requirements change? | Rarely | Frequently, with novel cases | Pipelines are cheaper to rewrite when rules are stable |

One agent-leaning answer may be handled by a code branch; a cluster means the uncertainty is structural. Choose the least autonomous shape that handles the real uncertainty. Autonomy has a price, not a sign of sophistication.

> **Common mistake:** Choosing an agent because the requirements feel vague. Vague requirements usually need clearer questions and a better specification, not a loop that guesses.

### Where autonomy pays and where it does not

Ambiguity is the first criterion. If the input is messy but the process is fixed, a strong extraction step in a workflow is enough. If the process is unknown until data is inspected, that is the place for an agent. Adaptation is the second criterion: an agent earns its keep when it can notice a surprising result and change tactics. If every surprise already has an explicit branch, the adaptation is imaginary.

Cost and latency follow the iteration count. A four-step workflow makes four predictable calls. An agent may make four calls on an easy day and twenty on a difficult one, and every iteration resends accumulated context. A step cap bounds this, but a capped agent may stop before finishing. When a product promises a fixed response time and price, predictability wins unless adaptation is essential.

Auditability and blast radius often decide the boundary. A workflow's path is its specification; an agent's path must be reconstructed from a trace. If an auditor needs to know why an action occurred, the agentic portion must be small and well logged. Blast radius determines who gets to act. Reading a record is cheap to reverse; sending a message or committing a payment is not. Such actions belong in a fixed step with an approval gate.

Agent-as-a-design-choice means treating autonomy as something to allocate. Mark the exact spots where the program must decide based on what it finds. Give those spots a loop, tools, and limits. Leave everything else as ordinary code, which is faster, cheaper, and easier to test.

| Anti-pattern | How it appears | Why it fails | Correction |
| --- | --- | --- | --- |
| A loop where a pipeline suffices | An agent chooses between two tools that always run in the same order | Outputs vary, cost rises, and tests become flaky | Replace the loop with two sequential calls and keep the model for judgment inside one step |
| A pipeline where adaptation is needed | A long chain of exception branches for cases discovered in production | Each new case requires another edit and the branches interact | Isolate discovery in a bounded agent and keep the rest of the pipeline fixed |
| An agent with no external limits | No step cap, verifier, or tool allowlist | Repetition and costly side effects go unchecked | Add budgets, effect classes, and a verification gate outside the model |
| An "AI-powered" step everywhere | Models perform simple deterministic conversions in every box | Latency and spend increase without improving quality | Keep models only where a rule cannot be written down |
| Approval left to prompt wording | The instruction says "do not publish before approval" | Instructions are advice, and a model may ignore them | Enforce the gate at the action boundary with a deterministic check |

### Building the hybrid boundary

Draw the boundary between exploration and consequence. Exploration gathers facts; consequence changes the world. Let the model explore, and let code decide what may happen afterward.

The outer program validates the request, starts a trace, sets budgets, and hands the ambiguous middle to an agent. The agent uses read-only tools and returns a structured conclusion. The outer program checks it, asks a person to approve any visible action, and performs it in a fixed step. Durable memory keeps only facts useful later.

```text
workflow_profile:
  intake -> extract -> validate -> store -> respond
  order lives in code; a model may fill in "extract" only

agent_profile:
  goal + allowed_tools + budgets + verifier + trace
  repeat:
    look at the current state
    propose the next action
    pass the proposal through guards
    add the result to the state
  stop when verified, blocked, or a limit is reached
```

The agent profile still has code around the loop: the developer chooses the goal, tools, guards, and stop rules, while the model chooses only what happens inside them. "Agent" is a design decision, not a product feature.

> **Try it:** Take a feature you know well and write its steps in order. At every point where you write "depending on what we find," draw a box around that step. The boxes are the only candidates for agency; everything outside them should stay as ordinary code.

## Practice lab

**Goal.** Audit a proposed feature and produce a one-page shape argument that names the uncertain step and the boundary around it.

1. Choose a small feature such as "check an uploaded transcript against the course rules and produce a summary."
2. Write the steps in order, without mentioning tools or models. Number them.
3. Circle any step whose next action cannot be known until earlier data is inspected.
4. For each circled step, list the tools it would need and one hard limit on calls or tokens.
5. Identify every action in the feature that changes shared state or is visible outside the system, and move it behind a fixed approval step.
6. Write two sentences justifying the final shape using the words ambiguity, cost, and auditability.

**Expected observation.** Most features produce one or two circled steps, not a whole agentic system. The exercise should make the hybrid boundary obvious: a small loop in the middle, ordinary code at both ends, and approval on the way out. If every step was circled, the feature description is probably too vague to implement yet.

## Worked scenario

### The problem

A municipal permits office wants to pre-check building-permit applications before a human reviewer sees them. Each application contains forms, site plans, and sometimes annotated photographs. The office needs a classification, a list of missing items, and a short explanation. The final decision must be explainable, and the system must never mark an application as approved on its own. Throughput is high enough that per-request cost matters.

### Reasoning

The team starts with the decision table. Extracting fields and validating them against the published checklist can be written down in advance; those steps favor a workflow. Deciding which parts of a site plan need closer inspection depends on what the first pass reveals; that step favors an agent. Cost is capped per application, so an unbounded investigation is not acceptable. Because the outcome affects a citizen, every conclusion must be traceable to the documents it used. The blast radius of an incorrect approval is high, so approval must be a human act.

### Resolution

The design has three phases.

| Phase | Shape | Reason |
| --- | --- | --- |
| Intake and field extraction | Workflow | Steps are fixed and the output is schema-checked |
| Document investigation | Bounded agent | The next document to inspect depends on earlier findings |
| Recommendation and record keeping | Workflow plus human gate | Externally visible conclusions require approval and a stable audit record |

The investigation agent receives read-only tools for pages and rules, a call cap, and a token ceiling. It returns a structured result: classification, missing items, page references, and uncertainty. The outer workflow discards unsupported claims and drafts a recommendation. A reviewer approves or edits it; only then does a fixed step write to the case system.

The trace records extraction, each proposal and observation, references, the verifier result, and the approval. Durable memory keeps only stable facts such as the checklist version.

The agent handles discovery, but cannot approve, write to the case system, or exceed its budget. The workflow carries repeatable work, and a reviewer supplies judgment where mistakes are expensive.

> **Exam note:** When a scenario mixes variable investigation with irreversible output, the strongest answer usually puts the agent in the middle and wraps it with fixed steps, not the other way around.

## Common mistakes

- Treating the presence of a model inside a pipeline as proof that the system is an agent.
- Choosing an agent because a requirement is poorly understood instead of clarifying the requirement.
- Ignoring the cost of repeated context when estimating an agent's price per request.
- Forcing every possible discovery into an explicit branch until the pipeline becomes unmaintainable.
- Leaving externally visible actions inside the loop without an approval gate.
- Assuming a step cap alone makes an agent safe, when it only bounds effort.
- Skipping a trace because the code path "is obvious," even though an agent's path is not.
- Forgetting that a hybrid design is often the correct answer rather than a compromise.

## Chapter summary

- A workflow fixes the order in code; an agent fixes the goal and boundaries and decides the order at runtime.
- Both use models and tools; the distinction is who chooses the next step.
- Ambiguity, adaptation, cost, latency, auditability, and blast radius are the practical decision criteria.
- Choose the least autonomous shape that handles the real uncertainty; autonomy has a price.
- The two common mismatches are a loop where a pipeline suffices and a pipeline where adaptation is needed.
- Exploration belongs inside the agent; irreversible action belongs in a fixed, approved step.
- Prompts are guidance, while allowlists, budgets, and approval gates are enforcement.

## Checkpoint questions

1. A service reads a form, validates ten fields against a rules table, writes a record, and sends a receipt. The sequence never changes. Which shape is most suitable?

A. A supervisor agent with read-only workers
B. A deterministic workflow with a validation step
C. An uncapped agent that selects tools at runtime
D. A fan-out of specialist subagents

2. Which observation is the strongest evidence that a task needs an agent rather than a workflow?

A. The team prefers a newer framework
B. The output should look different on each run
C. The next operation depends on what earlier operations discovered
D. The requirements document is two pages long

3. An agent investigates faults well, but it can also close customer tickets by itself. What is the best boundary for the closing action?

A. Allow it inside the loop because the agent has the most context
B. Describe "do not close tickets" in the system prompt and keep the tool available
C. Move ticket closing to a fixed step with an approval gate and effect-class check
D. Remove all logging from that step to reduce cost

4. A small pipeline has begun producing different answers for identical inputs and needing more retries. The two tools always run in the same order. What is the likely problem?

A. A loop was used where a pipeline was sufficient
B. The pipeline needs a third agent for coordination
C. The model needs a larger context window
D. The approval step should be removed

5. A product promises a response within two seconds at a fixed cost per request. Which design concern most favors a workflow?

A. The ability to explore many sources
B. Predictable latency and spend
C. The need for a human signature
D. Variable numbers of steps

6. A pipeline has grown a long chain of special-case branches for document types discovered after launch. What is the most durable fix?

A. Add another branch for the newest document type
B. Give the pipeline a longer system prompt
C. Isolate the discovery step in a bounded agent and keep the rest fixed
D. Remove the rules table and let one model call handle everything

7. Which statement best expresses "agent as a design choice"?

A. An agent should be used wherever a model is available
B. Autonomy should be allocated only to steps whose path cannot be known in advance
C. An agent is always more accurate than a workflow
D. A workflow cannot use a model at all

### Answers and rationale

1. **Correct: B.** Fixed steps and a stable rules table are the textbook case for a workflow. A is wrong because there is nothing to investigate or delegate. C is wrong because runtime tool selection adds uncertainty with no benefit. D is wrong because parallel specialists would duplicate work on identical inputs.

2. **Correct: C.** Discovery-dependent sequencing is the defining reason to add agency. A is wrong because tooling preference is not a design justification. B is wrong because variation is a side effect, not a goal, and is often undesirable. D is wrong because document length says nothing about the shape of the work.

3. **Correct: C.** An externally visible action should be reachable only through a fixed, approved step whose policy is enforced by an effect-class check. A is wrong because context richness does not authorize an action. B is wrong because a prompt instruction is advice rather than enforcement. D is wrong because removing the log would destroy the audit trail.

4. **Correct: A.** Unwanted variation and retries in a fixed two-step sequence suggest that a loop was added without a reason. B would add more overhead without addressing the mismatch. C addresses a different problem; context size is not the cause of nondeterministic ordering. D would remove protection and make the system less safe.

5. **Correct: B.** Predictable latency and spend are workflow strengths; an agent's iteration count is inherently variable. A is wrong because exploration is an agent strength, not a reason to prefer a workflow here. C is neutral; approval can be added to either shape. D is wrong because variable steps work against a fixed contract.

6. **Correct: C.** A bounded agent owns the part that discovers structure, while the stable remainder stays readable code. A is wrong because it continues the cycle of special cases. B is wrong because wording cannot replace structure. D is wrong because it discards reliable rules and gives up auditability.

7. **Correct: B.** Autonomy is a resource to spend where the path is unknowable in advance. A is wrong because availability of a model is not a requirement. C is wrong because accuracy depends on the task and the guardrails. D is wrong because workflows routinely use models inside fixed steps.

---
*End of chapter 17.*
