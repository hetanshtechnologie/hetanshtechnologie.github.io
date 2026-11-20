# Chapter 4 — Agents, Tools, and the Nature of Autonomous Work

## Learning objectives

- Distinguish a single conversation, a fixed pipeline, and an autonomous agent.
- Explain why a language model without actions is not an agent.
- Describe tools as the bridge between reasoning and effects in the world.
- Trace the observe, decide, act loop at a conceptual level.
- Explain bounded autonomy and the role of stop conditions and budgets.
- Compare the cost of a wrong action with the cost of a wrong answer.
- Recognize situations where a plain script is the better design.

## Key concepts

### Three patterns that look alike

From the outside, several systems appear to be the same thing. A person types a request, text comes back, and a task gets done. Under the surface, however, a single conversation, a fixed pipeline, and an autonomous agent behave very differently. They differ in who decides the next step, how many steps can occur, and whether the system can change the world rather than only describe it.

A single conversation is turn-based. A person supplies a message, the assistant responds, and control returns to the person. The model may reason and may suggest actions, but the human decides what happens next and performs any external step. The system has no independent trajectory. Its boundary is the exchange.

A fixed pipeline is a sequence of operations defined in advance. The designer decides the order: retrieve material, extract fields, produce a draft, run a check, store the result. A model may be one operation inside the pipeline, but the pipeline does not ask the model what to do next. It calls each stage in the prescribed order. Repetition is possible, but repetition follows a rule written by the designer, not a fresh decision by the model.

An autonomous agent is a system in which the model participates in choosing the next action, calls tools that can affect the environment, observes the results, and continues until a goal is reached or a bound is met. Control is shared between orchestration code and the model. The code sets the rules of the loop; the model makes choices inside it. That small difference produces a large change in behavior: the same starting request can lead to different sequences of actions.

| Pattern | Who chooses the next step | Can it act externally | Typical boundary | Main strength |
| --- | --- | --- | --- | --- |
| Single conversation | The person | Only through manual follow-up | One exchange or turn | Exploration and drafting |
| Fixed pipeline | The designer, in code | Yes, at defined stages | Completed sequence of stages | Repeatability and auditability |
| Autonomous agent | The model within code-set bounds | Yes, through tools | Goal reached or budget exhausted | Handling variable, multi-step tasks |

> **Exam note:** When a scenario says the sequence of steps must be identical every time, that is a signal for a pipeline, not an agent. The presence of a model inside the system does not make it an agent.

### Why a model without actions is not an agent

It is tempting to call any sophisticated model interaction an agent. That usage is too broad for design work. A model that only produces text, however insightful, is a generator. It may reason about a plan, describe the steps a team should take, and even write the code that would perform them. Until something executes those steps and returns the result, nothing has been set in motion.

The distinguishing feature of an agent is action grounded in observation. The system selects a tool, invokes it, receives a result, and uses that result in the next decision. This is what closes the loop between thinking and doing. Without a tool call, there is no state change to observe. Without observation, there is no feedback, and without feedback the system cannot adapt to what actually happened.

It is also important to locate control correctly. The model does not own the loop in the way a program owns a loop. Orchestration code presents the model with available tools, receives the requested call, executes it, and decides whether the loop continues. That code enforces step limits, allowed tools, and approval gates. The model proposes; the orchestration layer disposes. A design that assumes the model will police itself has misunderstood where control lives.

> **Common mistake:** Describing a detailed prompt as an agent. A prompt can produce a plan, but it cannot execute a tool, observe a result, or stop itself when a budget is exhausted. Those behaviors belong to the surrounding system.

### Tools as the bridge from reasoning to effect

Tools are the mechanisms through which an agent affects the world and learns about it. A tool might read a record, search a document store, post a message, update a ticket, or run a calculation. From the model's point of view, a tool is a described capability with a defined input shape. From the system's point of view, it is a function call that must be authorized, executed, and reported back.

The description matters as much as the implementation. The model chooses a tool based on the description and the current context, so a vague description is a routing error waiting to happen. Two tools with overlapping descriptions can cause the model to pick the wrong one, and a tool whose description omits a restriction can be called with inputs that violate it. Clear descriptions and typed inputs are therefore part of the safety design, not documentation overhead.

Tool results are equally important. They return into the context and become the evidence for the next decision. If a result is enormous, it consumes the shared budget and may push earlier instructions out of view. If a result is ambiguous, the model may draw the wrong conclusion. Good tool design includes not only what the tool returns but how much it returns and how failures are expressed. Chapter 8 and Chapter 13 treat these questions directly.

A useful classification separates read-only tools from effectful tools. A read-only tool changes nothing in the environment; it supplies information. An effectful tool changes state: it sends, edits, deletes, or commits. The distinction drives governance. Read-only tools can often be granted broadly, while effectful tools usually need narrower permissions and more deliberate review.

### The observe, decide, act loop

An agent's work can be described as a repeating loop with three conceptual stages. Observe means taking in the current goal, the accumulated context, and the most recent tool results. Decide means choosing the next action, which might be a tool call, a request for clarification, or a conclusion that the task is complete. Act means executing that choice through the orchestration layer, which performs the tool call and captures its result.

The result of the act stage becomes part of the next observation. This is the feedback that distinguishes an agent from a pipeline. If a search returns nothing, the agent can try a different query. If an edit fails because a file is locked, the agent can report the obstacle or choose an alternative path. If a tool confirms that a condition is met, the agent can stop. Each cycle is a small experiment whose outcome informs the next one.

The loop is not infinite. It runs inside orchestration code that checks budgets before each step. A step budget limits how many cycles may occur. A spend budget limits token or tool cost. A tool allowlist limits which capabilities are reachable. An approval gate pauses the loop until a person confirms a risky action. These bounds are what make the loop an engineered component rather than an open-ended process.

The sketch below shows the minimal shape. The names are illustrative; the structure is the point.

```text
MINIMAL AGENT LOOP

goal = request.goal
context = assemble(goal, standing_rules, supplied_material)
steps = 0

while not complete(goal) and steps < step_budget:
    observation = latest_tool_result_or_request(context)
    decision = model.choose(observation, available_tools, context)

    if decision.is_final_answer:
        return decision.answer

    if decision.requires_approval and not approved(decision):
        return pause_for_review(decision)

    result = execute(decision.tool, decision.input)
    context = append_bounded(context, result)
    steps += 1

return stop_with_status("budget exhausted")
```

Notice that the loop always exits. It exits on completion, on a paused approval, or on a budget. A loop with no exit condition is not autonomy; it is a runaway process.

### Bounded autonomy and stop conditions

Autonomy is always bounded in a useful system. The bounds are not a sign of weakness; they are what make autonomy acceptable. An unbounded loop can repeat a failed action indefinitely, accumulate cost without limit, or continue acting long after the goal has been met. Bounded autonomy means the system is free to choose its path inside a space that the designer has made safe.

Stop conditions are the most important bound. A goal-based stop condition ends the loop when the requested outcome is achieved. A budget-based stop condition ends it when steps, tokens, or spend reach a limit. An error-based stop condition ends it when a failure repeats beyond a threshold. An approval-based pause is a special case: the loop does not end, but it cannot proceed until a person acts.

| Bound | What it limits | Failure if omitted |
| --- | --- | --- |
| Step budget | Number of loop cycles | Endless retries and growing cost |
| Tool allowlist | Which capabilities are reachable | Use of an unintended or over-privileged tool |
| Spend limit | Tokens, calls, or monetary cost | Uncontrolled expense on a difficult task |
| Approval gate | Which actions may proceed unsupervised | Irreversible effects without review |
| Error threshold | Repeated failures of the same kind | A stuck loop that mistakes repetition for progress |

Choosing bounds is a risk exercise. A research task with read-only tools can tolerate a generous step budget because the worst outcome is wasted time. A task that can issue refunds should have a small number of automated steps, a narrow tool set, and an approval gate before any money moves. The bounds should reflect the cost of being wrong, not the capability of the model.

> **Try it:** For any agent design you read about, write down the four things that stop it: goal reached, budget spent, error threshold, and approval required. If one is missing, you have found a design question the exam is likely to ask.

### Wrong action versus wrong answer

A wrong answer lives in text. A wrong action changes the world. That difference dominates the ethics and the engineering of agent design. If a conversational assistant gives a poor summary, a reader can ignore it. If an agent sends an incorrect message, edits the wrong file, or issues an unauthorized refund, the effect may be hard to undo. The same model can produce both, and the same fluent confidence accompanies both.

This asymmetry has several design consequences. First, the threshold for reviewing a tool call should be higher than the threshold for reviewing prose. Second, irreversible actions deserve stronger gates than reversible ones. Third, the system should prefer actions that are easy to observe and roll back. An agent that writes a proposed change to a staging area is safer than one that applies the change directly, even though both use the same reasoning.

It follows that model confidence is not a sufficient control. A confident tool call can be wrong for the same reasons a confident answer can be wrong. Authority must be granted by the system, scoped narrowly, and checked at the point of execution. Logging helps after the fact, but a log is not a guard; the guard must run before the effect.

### When a script is the better answer

Not every multi-step task needs an agent. If the sequence of steps is known in advance and does not change with the data, a script is clearer, cheaper, and more reliable. A script has no sampling variability, no tool-selection mistakes, and no surprise paths. It can be tested against expected outputs and reviewed line by line. Adding a model to such a task introduces uncertainty without adding value.

A useful test is to ask whether the number and order of steps depend on information discovered during execution. If they do not, use a pipeline or a script. If they do, consider an agent. Even then, keep the agentic portion as small as possible. A common design pattern is a fixed pipeline with one agentic step where judgment is genuinely required, surrounded by deterministic stages that handle validation, formatting, and storage.

There is also a middle ground. A script can call a model for a narrow decision, such as choosing which of two known routes to take, while retaining control of everything else. This keeps the benefits of judgment without handing over the loop. The exam often rewards this shape because it bounds the model's influence to a place where its flexibility helps and its unreliability can be contained.

## Worked scenario

A support organization wants to reduce the time spent on routine requests. A proposal suggests an agent that reads each incoming request, decides whether a refund is appropriate, issues the refund through a payment tool, and sends a confirmation. The team is excited because the task is multi-step and the decision varies with the request.

The first design question is whether this is genuinely an agentic task. The steps do depend on information discovered during execution: the request text and the account history determine what should happen. A single fixed pipeline would struggle with that variation. So an agent is defensible in principle.

The second question is the cost of a wrong action. An incorrect refund moves money and may be difficult to reverse. An incorrect confirmation message damages trust. These are effects, not prose. The design therefore needs a narrow tool set, a step budget, and an approval gate before the payment tool can be called. The confirmation message can be drafted by the model but should be sent only after the refund step succeeds.

The third question is where boundaries belong. The agent may read the request and account history with read-only tools. It may reason about eligibility and produce a proposed decision. It may then pause. At that pause, a reviewer sees the proposal and the supporting evidence, and either approves the payment call or rejects it. After approval, the loop resumes for a single bounded step that calls the payment tool and records the result. A final check confirms that the confirmation message matches the recorded outcome.

An alternative proposal suggests skipping the pause and relying on a prompt that says the agent must be careful with money. That proposal fails because a prompt is guidance, not enforcement. It also suggests giving the agent access to a general payment tool with broad credentials. That fails the least-privilege principle: a narrow refund operation with a limit is safer than a general capability.

The journal lesson is that agent suitability and action risk are separate decisions. A task can be a good fit for an agent and still require a stop before its most consequential step. Bounded autonomy is not a compromise on the idea; it is the condition that makes the idea usable.

## Common mistakes

- Calling any model interaction an agent simply because the output is detailed.
- Assuming the model controls the loop and will enforce its own limits.
- Granting broad tool access because a tool might be needed later.
- Treating a log of an action as equivalent to a check before the action.
- Using an agent for a fixed sequence of steps that a script could perform reliably.
- Focusing on answer quality while ignoring the cost of an incorrect external effect.

## Chapter summary

- A single conversation, a fixed pipeline, and an agent differ in who chooses the next step and whether actions occur.
- A model that only produces text is a generator; agency requires tools, observations, and effects.
- Tools translate decisions into effects and return results that shape the next decision.
- The observe, decide, act loop runs inside orchestration code, which owns the boundaries.
- Bounded autonomy uses step limits, tool allowlists, spend limits, approval gates, and error thresholds.
- Wrong actions differ from wrong answers in reversibility and consequence, so they need stronger controls.
- When the sequence is known in advance, a script or pipeline is usually the better design.

## Checkpoint questions

1. Which feature makes a system an agent rather than a text generator?

A. Producing a detailed plan
B. Calling tools and using their results in later decisions
C. Using a system message
D. Generating long responses

2. In an agent system, where does control of the loop primarily live?

A. Inside the model's weights
B. In orchestration code
C. In the tool descriptions
D. In the user's wording alone

3. Which task is best suited to a fixed pipeline?

A. A task whose steps depend on what a search discovers
B. A task requiring judgment about ambiguous requests
C. A task with a known order of operations every time
D. A task that must adapt to unexpected tool failures

4. What is the main purpose of a step budget?

A. To improve wording quality
B. To guarantee that the model is correct
C. To end the loop after a bounded number of cycles
D. To expand tool access

5. Which action deserves the strongest approval gate?

A. Reading a public document
B. Summarizing a ticket
C. Issuing a refund through a payment tool
D. Listing available files

6. Why is a prompt saying "be careful with money" not a sufficient control?

A. Because prompts are never read
B. Because guidance is not enforcement at the point of action
C. Because models cannot discuss money
D. Because logs replace prompts

7. When is a script preferable to an agent?

A. When the model needs to choose among unknown paths
B. When the sequence of steps is fixed and predictable
C. When tool results must influence the next step
D. When the task is described vaguely

### Answers and rationale

**1. Correct answer: B.** Agency requires acting through tools and feeding observations back. A is wrong because a plan is still text. C is wrong because a system message is framing. D is wrong because length is not agency.

**2. Correct answer: B.** Orchestration code presents tools, executes calls, and enforces bounds. A is wrong because weights do not enforce budgets. C is wrong because descriptions guide selection rather than control the loop. D is wrong because wording alone cannot stop a process.

**3. Correct answer: C.** A known order of operations is the signature of a pipeline. A and D involve discovered information or failures that call for adaptation. B involves judgment that a fixed order cannot express.

**4. Correct answer: C.** A step budget ends the loop after a set number of cycles. A is wrong because budgets do not shape wording. B is wrong because budgets do not create correctness. D is wrong because budgets restrict rather than expand access.

**5. Correct answer: C.** Moving money is consequential and hard to reverse. A, B, and D are read-only or local operations with much lower risk.

**6. Correct answer: B.** A prompt shapes behavior, but enforcement must occur in code before the effect. A is wrong because prompts are read. C is wrong because the issue is control, not subject matter. D is wrong because logging happens after the fact.

**7. Correct answer: B.** Fixed, predictable sequences are clearer and cheaper as scripts. A and C describe genuine agentic conditions. D is not a reason to prefer a script; vagueness calls for clarification first.

---

*End of chapter 4.*
