# Chapter 3 — How the Assistant Works: Models, Thinking, and Tiers

Choosing a model is a decision, not a setting to be chosen once and forgotten. A candidate who memorizes which named model is "best" will miss most scenario questions, because those questions are about fit. A quick classification job and a careful multi-source judgment have different requirements, and the right choice can change from one request to the next. This chapter explains what a language model is actually doing, introduces capability tiers in plain language, and gives you a way to reason about cost, delay, and risk without needing a price list.

You do not need to study the internals of a neural network for a foundations exam. You do need a working picture that explains why a fluent answer can be wrong, why a larger option is not always better, and why a careful professional sometimes chooses the smaller tool. That picture is the subject of the first part of this chapter. The second part turns it into a selection method you can apply under exam conditions.

## Learning objectives

- Describe, in plain language, how a language model generates text.
- Explain why fluent output is not evidence that a claim is true.
- Compare compact, balanced, and capable tiers using workload signals rather than product names.
- Decide when extended reasoning is worth its additional delay and cost.
- Use the cost of a wrong answer and the user's waiting time as selection criteria.
- Explain routing between tiers and compute a simple cost per successful task.

## Key concepts

### What a language model is doing

A language model produces text by predicting what comes next, based on patterns learned during training. It has absorbed a great deal of written material and can continue a fragment in a way that resembles the material it learned from. That is a powerful ability, but it is not the same as looking up a record in a database. There is no row in a table that the assistant opens when you ask a question. There is a sequence of likely next pieces, shaped by your words and by the conversation so far.

This distinction explains both the strength and the weakness of the tool. The strength is flexibility: it can rephrase, summarize, compare, and draft in ways that would be laborious to program as fixed rules. The weakness is that a prediction can be well formed without being grounded. If the training patterns suggest a plausible author, date, or figure, the model can produce it with the same confidence it uses for a fact it actually learned. Nothing in the sentence itself signals the difference.

Thinking of the output as a continuation also explains why context matters so much. Your request does not command a search through a store of answers; it steers a generation process. The words you supply, the material you attach, the instructions already in the thread, and the standing instructions in a project all influence which continuations are likely. A vague request leaves the process under-steered, so it falls back on generic patterns. A specific request with supplied evidence narrows the space and produces work that is more useful.

The same picture explains why a very long thread can degrade. Only a bounded amount of prior text can guide any one response, so early turns can be pushed out of view while later noise remains. The assistant does not forget in the human sense; it simply works with the context it can see. This is one reason a clean thread and a well-scoped project are technical necessities rather than tidy habits. It also explains why exam scenarios that mention an enormous attached file or a sprawling conversation often point toward reducing the material or restarting with a focused request.

> **Exam note:** If an item asks why an assistant invented a citation, the answer is not that it deliberately lied. It produced a plausible continuation where a verified source was required.

### Why fluency is not evidence of truth

Human readers use fluency as a shortcut. Well-formed sentences, consistent tone, and tidy structure usually indicate that a writer knew the subject. With generated text, that shortcut fails. The same machinery that makes a sentence grammatical also makes a fabricated sentence read as though it belongs. A footnote list can look complete while every entry is constructed from pattern rather than checked against a document.

This is why verification is a separate activity, not a final polish. Asking for a more confident version of an answer does not make its claims more accurate. Asking for a longer answer can add more unsupported details. Switching to a larger model can reduce the frequency of errors but does not turn generation into lookup. The only reliable checks are external to the generation: tracing a claim to supplied material, consulting a second source, or testing a calculation with a tool that actually computes.

A useful mental test is to ask, "What in this answer could I point to?" If the answer is only the answer itself, the claim is unverified. If you can point to a line in an attached document, a result from a calculation, or an independent source, you have evidence. Exam scenarios often hinge on this test. The option that says to check the statistic against the source is correct even when it takes longer, because the alternative treats the shape of a sentence as proof.

### Three capability tiers

Products name their models in many ways, but the underlying choices usually fall into three broad tiers. Describing them generically keeps your reasoning portable across products.

| Tier | Plain-language description | Strengths | Typical weakness |
| --- | --- | --- | --- |
| Compact | Small, fast, inexpensive generator | High volume, simple classifications, short extractions, predictable formats | Struggles with ambiguity, long chains of reasoning, and conflicting evidence |
| Balanced | Mid-size general-purpose option | Everyday drafting, summaries, moderate analysis, mixed requests | May need checking on subtle or high-stakes judgments |
| Capable | Large option with more room for reasoning | Multi-source synthesis, ambiguous decisions, complex instructions | Slower, costlier, and still not a substitute for verification |

The tier names are not ratings of quality in the abstract. A compact option is the correct choice for a task it can handle well, because it is faster and cheaper to run. A capable option used for a trivial task is not more responsible; it is wasteful, and its extra capacity can even introduce unnecessary elaboration. Fit is the whole game.

A model family often carries small, medium, and large variants that share a design but differ in capability and cost. The variants are useful because they let a team match the tool to the workload instead of forcing every task through one setting. Exam questions rarely ask you to name a specific variant. They describe a workload and expect you to infer which tier fits, then to reject an option that ignores a constraint such as latency or accuracy.

### Workload signals that pick the tier

Use the work itself to choose. High-volume classification is the clearest compact-tier case: the labels are defined, examples can be supplied, and errors are usually detectable by sampling. Extraction of fields from well-structured text is similar. If the input is short and the rule is clear, the compact tier can process a large batch quickly, and a reviewer can spot-check a fraction of the results.

Balanced tiers suit the ordinary middle of knowledge work. A first draft of a memo, a summary of a document that has been supplied, or a comparison across a few known options usually needs more nuance than classification but not the deepest reasoning available. The balanced tier is often the default for a mixed working day because it handles variety well.

Capable tiers earn their place when evidence conflicts, when several sources must be reconciled, or when the decision is genuinely ambiguous. A reviewer asked to weigh a policy against an exception, or an analyst asked to combine several reports with different assumptions, benefits from the extra room to hold ideas together. The payoff is not that the answer becomes automatically correct; it is that the reasoning is more likely to surface the tension instead of smoothing it over.

| Workload signal | Suggested tier | Why |
| --- | --- | --- |
| Many short items with fixed labels | Compact | Speed and unit cost dominate; errors are easy to sample |
| Field extraction from structured text | Compact | The rule is explicit and output format is predictable |
| Routine drafting and summarising from supplied text | Balanced | Needs coherence and some judgment, but not deep reconciliation |
| Comparison across several supplied documents | Balanced or capable | Depends on how much the documents disagree |
| Ambiguous judgment with conflicting evidence | Capable | Needs sustained reasoning and explicit treatment of trade-offs |
| High-stakes claim that will be published | Capable, with verification | Accuracy matters more than speed, but checking remains mandatory |
| Live interaction where a person is waiting | Compact or balanced | Latency dominates; deep reasoning may be unacceptable |

Notice that the last row is about the reader, not the content. A capable tier may reason better, but if the user is waiting in a live session, the delay can make the answer useless. Constraints such as waiting time are legitimate reasons to pick a smaller option, provided the task is one that option can handle. The exam rewards candidates who balance these pressures rather than always reaching for the strongest tool.

> **Common mistake:** Assuming the largest tier is always the most responsible choice. Responsibility means matching capability, cost, and delay to the task, then verifying the result.

### Extended reasoning and its trade-off

Some settings allow the assistant to spend more effort before answering, often by working through intermediate steps internally. The benefit is measurable on tasks with several dependencies: a calculation with conditional branches, a comparison requiring several constraints to be held at once, or a plan whose later steps depend on earlier decisions. The extra work can reduce contradictions and help the assistant notice that an obvious first answer fails a later requirement.

The cost is twofold. First, the response takes longer, which matters in a live conversation or a time-bound workflow. Second, the run consumes more resources, which matters at volume. Extended reasoning is therefore a targeted option, not a permanent setting. Use it when the task contains a dependency chain that a shorter pass is likely to break. Do not use it to make a simple rewrite feel more thorough.

There is a subtle limit worth stating clearly: longer reasoning is not the same as verification. The assistant is still generating text. It can reason carefully from a false premise and produce a coherent, wrong conclusion. If the premise depends on an external fact, that fact still needs a check. Exam scenarios that mention a fabricated source are testing this distinction; the correct option keeps the verification step even when extended reasoning is enabled.

```text
TIER ROUTING WORKSHEET
Task:__________________________________________
Output will be used for:  private / shared / published
Evidence available:       supplied / external / none
Ambiguity:                low / medium / high
Waiting user:             yes / no
Cost of a wrong answer:   low / medium / high
Default tier:             compact / balanced / capable
Override needed because:  ______________________
Verification step:        ______________________
```

### The cost of being wrong, the cost of waiting

A useful selection criterion is the cost of an incorrect answer, not just the cost of running the model. If a mislabeled support ticket costs a few minutes of rework, a compact tier with spot checks may be ideal. If a wrong figure appears in a published report, the rework includes correction, explanation, and lost trust. In that case a more capable option plus a full verification pass is justified, even though it costs more per request.

Waiting time is a second cost. In an interactive session, a person is looking at the screen. A response that arrives after the meeting has started is useless regardless of its quality. In a background batch, nobody is waiting, and a slower, more careful pass may be free from the user's perspective. The same task can therefore justify different tiers in an interactive and a batch setting. Scenario questions often include a phrase such as "while the client is on the call" or "overnight." Those phrases are not filler; they set the latency constraint.

Costs also interact. A cheaper run that fails often and requires rewriting can be more expensive than a costlier run that succeeds once. This leads to the most practical metric for a working team: cost per successful task. It combines unit price, success rate, and the rework needed when the result is unacceptable. A team that tracks only the price of a request will systematically underestimate the cost of its workflow.

### Cost per successful task

Consider an illustrative comparison for one repeatable task, such as producing a checked summary of a supplied document. The numbers below are relative units, not prices, and they exist to show the shape of the calculation.

| Approach | Unit cost (relative) | Share acceptable on first pass | Typical rework | Cost per successful task (relative) |
| --- | --- | --- | --- | --- |
| Compact tier, no sampling check | 1 | 60 percent | Several corrections or full redo | About 1.7 |
| Compact tier with spot checks | 1 | 75 percent | Targeted correction | About 1.3 |
| Balanced tier with standard check | 3 | 90 percent | Light edit | About 3.3 |
| Capable tier with full check | 10 | 97 percent | Rare | About 10.3 |

The table makes two points at once. The smallest tier is cheapest per request, but adding a cheap check can improve its economics more than upgrading the tier. The largest tier produces the most reliable first pass, but its unit cost dominates for a task that does not need its reasoning. The best choice depends on the value of a successful outcome and the cost of a failure. In a high-volume workflow, a modest increase in first-pass success can matter more than raw speed. In a one-off, high-stakes decision, the extra unit cost is trivial compared with a wrong conclusion.

This is also why teams route work instead of setting one global model. A single setting forces every task to pay for the needs of the hardest task. Routing sends classification to the compact tier, everyday drafting to the balanced tier, and ambiguous synthesis to the capable tier. It measures the result at each route and adjusts when a tier starts producing rework. The exam tends to reward the routing idea because it shows both technical judgment and cost awareness.

### Families, variants, and scenario reasoning

A family of models can offer small, medium, and large variants with different strengths. The variants share an approach but differ in how much they can handle at once and how reliably they follow complex instructions. In a real product, a family might be exposed through several selectable options, and the interface might hide some details behind a mode control. None of that changes your method. Read the workload, identify the deciding constraint, and choose the smallest tier that satisfies it.

Exam items sometimes mention a product name simply to make the story concrete. That name is not the test. Strip it out and ask what capability the situation demands. If the item describes a batch of thousands of short classifications with a fixed label set, the answer is the compact tier even if the prose praises a larger model elsewhere. If it describes a reviewer reconciling contradictory reports under a publication deadline, the answer is the capable tier plus verification. Reasoning from the scenario beats recall every time.

> **Try it:** Take a task from your own week and write the routing worksheet for it. If you cannot name the cost of a wrong answer, you have not yet thought through the choice.

## Worked scenario

A team processes incoming requests and assigns each one to a category. There are many requests each day, the categories are defined in a short guide, and a coordinator reviews a sample of assignments at the end of the day. A separate task asks the same team to prepare a quarterly interpretation of conflicting policy updates for a leadership audience. An analyst proposes using one capable model for everything so that nobody has to think about selection. A reviewer objects and outlines a different plan.

Restating the goal gives: categorize a high volume of routine requests accurately, and separately produce a reliable interpretation of conflicting material. These are two workloads with different constraints. The categorization work has fixed labels, high volume, and a sampled human check. The interpretation has ambiguity, conflicting sources, and a reader who will rely on the conclusion. The deciding constraint is the shape of the work, not a preference for one model.

The reviewer's plan routes categorization to the compact tier with a clear label guide and a sampling check, because the task is well defined and errors are detectable. It routes the quarterly interpretation to the capable tier with extended reasoning, because the material conflicts and the reasoning must hold several constraints at once. Both outputs receive verification appropriate to their audience: sampled checks for the routine work, line-by-line source tracing for the leadership piece.

The analyst's single-model plan fails on cost and delay. It pays capable-tier rates for work that does not need that reasoning, and it slows a high-volume queue. It also creates a false impression that one setting is universally safer. The reviewer's plan is not more complicated for its own sake; it matches each tier to the workload and keeps verification where it belongs.

A final detail completes the resolution. The team tracks how often each route needs rework. After several cycles, the sampling check reveals that one category is frequently confused with another. Rather than upgrading the whole queue, the team clarifies the label guide and adds two examples. That is the practical payoff of measuring cost per successful task: it points to the real source of the problem, which is often the instruction rather than the model.

## Common mistakes

- Choosing a tier by product name or reputation instead of by workload signals.
- Assuming that more reasoning capacity removes the need to verify claims.
- Using extended reasoning for simple tasks because it feels more careful.
- Ignoring the fact that a person is waiting when selecting a tier for an interactive task.
- Comparing only unit cost and forgetting rework and failure rates.
- Applying one model choice to every task in a workflow to avoid making decisions.
- Treating a fluent, well-structured answer as evidence that its figures are real.

## Chapter summary

- A language model predicts likely continuations from training patterns; it does not look up verified records.
- Fluency reflects language quality, not truth, so claims need checks outside the generated text.
- Compact tiers suit high-volume classification and structured extraction; balanced tiers suit routine drafting; capable tiers suit ambiguity and multi-source synthesis.
- Extended reasoning helps dependency-heavy tasks but adds delay and cost, and does not replace verification.
- The cost of a wrong answer and the user's waiting time are legitimate selection criteria.
- Routing sends each task to the smallest tier that satisfies its constraints.
- Cost per successful task combines unit cost, first-pass success, and rework.

## Checkpoint questions

1. Why can an assistant produce a citation that looks real but does not exist?

   - A. It deliberately invents sources when asked for footnotes.
   - B. It generates a plausible continuation rather than retrieving a verified record.
   - C. It only uses sources supplied by the user, so the citation must be real.
   - D. A larger model would make this impossible.

2. Which workload is the clearest candidate for a compact tier?

   - A. Reconciling three conflicting policy reports under a publication deadline.
   - B. Writing a nuanced recommendation for a leadership audience.
   - C. Labeling a large batch of short requests using a fixed guide.
   - D. Evaluating an ambiguous ethical trade-off.

3. A client is waiting on a live call. Which constraint is most likely to decide the tier?

   - A. Latency, provided the task is simple enough for a faster tier.
   - B. The number of footnotes in the final answer.
   - C. The desire to use the largest available model.
   - D. The color scheme of the interface.

4. What does extended reasoning primarily add?

   - A. Guaranteed correctness on factual questions.
   - B. More internal work on dependency-heavy tasks, at the price of delay and cost.
   - C. Access to private databases.
   - D. Automatic verification of every citation.

5. A cheap tier produces many results that need rework. Which metric best captures the problem?

   - A. Cost per request alone.
   - B. Cost per successful task.
   - C. Number of requests processed.
   - D. Length of the generated answers.

6. What is the best reason to route work between tiers instead of choosing one global model?

   - A. It makes the interface look more complex.
   - B. Different workloads have different capability, latency, and accuracy needs.
   - C. Larger models cannot produce short answers.
   - D. Compact models cannot follow any instructions.

### Answers and rationale

1. **B.** Generation predicts plausible text; there is no database lookup that guarantees a source exists. **A** assigns intent that the mechanism does not have. **C** is false when no sources were supplied. **D** is false because even capable models can fabricate.

2. **C.** A fixed label set, high volume, and easy sampling make classification a compact-tier task. **A** and **B** require synthesis and nuance, favoring a capable tier. **D** is an ambiguous judgment, also favoring a capable tier.

3. **A.** A waiting user makes delay decisive, as long as the task remains within the faster tier's ability. **B** concerns appearance, not fit. **C** ignores the waiting constraint. **D** is irrelevant to the decision.

4. **B.** Extended reasoning gives more internal steps for complex dependencies and costs time and resources. **A** overstates it; correctness is never guaranteed. **C** confuses reasoning with data access. **D** confuses reasoning with verification.

5. **B.** Cost per successful task includes failures and rework, which unit price alone misses. **A** hides the rework cost. **C** measures volume, not value. **D** is unrelated to usability or cost.

6. **B.** Routing matches the tool to each workload's constraints instead of overpaying or under-serving. **A** is not a benefit. **C** and **D** are false extremes; tier choice is about fit, not absolute inability.

---

*End of chapter 3.*
