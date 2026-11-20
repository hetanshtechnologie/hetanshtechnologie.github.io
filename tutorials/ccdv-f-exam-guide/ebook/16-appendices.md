# Chapter 16 — Reference Appendices

## Learning objectives

By the end of this chapter you should be able to:

- Recall the exact meaning of the terms that appear most often in exam scenarios
- Apply a short set of decision rules under time pressure
- Recognize the recurring shapes of wrong answer options
- Run pre-deployment, security, and observability checks from memory
- Write a requirement that can be tested rather than merely discussed

## Key concepts

### How to use these appendices

This chapter is built for the last pass, not the first one. Read the glossary to settle a term you keep confusing, use the decision rules when an option feels plausible but wrong, and scan the distractor patterns when you cannot explain why you eliminated an answer. The checklists are deliberately mechanical; they are meant to be run, not admired.

A useful routine is to keep this file open beside a practice paper. When you miss a question, find the term that carried the deciding constraint, then find the decision rule that covers it. Over a few sittings you will notice that a small number of rules account for most of your errors. That is the signal you want, because it turns a large syllabus into a short personal list.

> **Try it:** Before reading the decision-rule table, write down your own five rules from memory. Compare your list with the table and keep the differences. The gaps are your revision targets.

### Glossary

The definitions below are intentionally compact. They describe how each term is used in the situations this book examines, not every possible meaning the term has in the wider field.

| Term | Concise definition |
| --- | --- |
| Acceptance criterion | A testable statement that determines whether a requirement has been met, usually naming a metric, a threshold, and a population. |
| Agent | A system that chooses its own next action at runtime from observations, tools, and a goal, within limits set by the application. |
| Agent loop | The repeated cycle of observing, deciding, acting, and checking whether the goal is satisfied or a stop condition has fired. |
| Allow-list | An explicit set of permitted values, paths, domains, or operations; anything not listed is denied by default. |
| Asynchronous processing | Work submitted for later execution, with completion delivered by polling, callback, or webhook rather than in the original request. |
| Backoff | Increasing the delay between successive retries so that a struggling service is not overwhelmed by repeated attempts. |
| Batch API | An interface optimized for large volumes of non-urgent work, trading immediate latency for throughput and lower unit cost. |
| Bounded loop | An agent loop with explicit limits on steps, tokens, time, or repeated actions so it cannot run indefinitely. |
| Cache key | The value used to identify a reusable cached result; including the wrong scope can expose one tenant's content to another. |
| Canary rollout | Releasing a change to a small traffic slice first, with metrics and a rollback path before wider exposure. |
| Capability tier | A model class chosen for its reasoning strength, latency, and price; higher tiers suit ambiguity and high error cost. |
| Citation | A reference from an answer back to the specific source span that supports a claim, allowing support to be checked. |
| Connector | An adapter that exposes an external system to the assistant through a defined, constrained interface. |
| Context dilution | Quality loss caused by burying relevant information among large amounts of unrelated context. |
| Context engineering | Deliberately selecting, ordering, and compressing the information placed in the model's input for a given task. |
| Dead-letter queue | A destination for items that cannot be processed after validation or repeated failure, keeping them available for inspection. |
| Decision boundary | The region where a classifier's answer changes from one label to another; useful examples for evaluation cluster here. |
| Delegation | Handing a well-scoped subtask to another worker with a clear input, expected output, and limits. |
| Deterministic workflow | A process whose steps are fixed in advance and produce the same structure of execution on every run. |
| Embedding | A numeric representation of text used to compare semantic similarity during retrieval. |
| Evaluation set | A versioned collection of inputs and expected outcomes used to detect regressions before and after changes. |
| Extended thinking | A mode that allocates additional internal reasoning steps before producing an answer, trading latency for accuracy. |
| Fail fast | Stopping immediately with a clear error when configuration or input is invalid, instead of continuing in a broken state. |
| Few-shot examples | A small set of input and output pairs included in a prompt to demonstrate the desired behavior and format. |
| Groundedness check | A verification step that compares claims in an answer against source spans and rejects unsupported statements. |
| Guardrail | A control that constrains behavior or output, ideally enforced outside the model rather than requested in prose. |
| Hook | A callback that runs at a defined point, such as before a tool call or after a response, to validate, log, or transform. |
| Human escalation | Routing uncertain, low-confidence, or high-impact cases to a person for review instead of acting automatically. |
| Idempotency | The property that repeating the same request has the same effect as performing it once, usually via a stable key. |
| Indirect prompt injection | An attack in which instructions are hidden in content the application retrieves, such as a document or web page. |
| Input token | A unit of text supplied to the model, including instructions, history, retrieved content, and tool results. |
| JSON schema | A formal description of the shape and types of a JSON value, used to validate structures at an interface boundary. |
| Latency | Time delay in a request; time to first token measures how quickly output begins, not when it finishes. |
| Least privilege | Granting only the permissions required for the task, for the shortest practical time and scope. |
| Message role | The label attached to a message, such as system, user, assistant, or tool, which tells the model how to treat it. |
| Model identifier | The recorded name and version of the model used for a request, essential for reproducible evaluation and cost tracking. |
| Non-functional requirement | A constraint on how the system operates, such as retention, latency, residency, or availability, rather than what it offers. |
| Observability | The collected traces, metrics, and logs that let an engineer reconstruct what a system did and why. |
| Orchestrator-worker | A pattern in which a coordinator splits work into subtasks, delegates them, and combines the results. |
| Output schema | A declared structure that generated output must satisfy before it is accepted by the application. |
| Output token | A unit of text generated by the model; usually billed at a higher rate than input tokens. |
| Pagination | Returning results in bounded pages rather than all at once, protecting context and memory. |
| Permission scope | The boundary of what a tool or credential may touch, such as a directory, collection, or set of operations. |
| Post-processing | Deterministic work applied after generation, such as appending a notice or removing personal data. |
| Prefix cache | Reusable computation for an unchanged leading portion of a prompt, reducing cost and latency on repeated calls. |
| Prompt injection | An attempt to override intended instructions by supplying conflicting instructions as user input. |
| Rate limit | A cap on request frequency used to protect a service and to enforce fair use across tenants. |
| Redaction | Removing or masking sensitive values before they are stored, logged, or shown. |
| Retrieval | Selecting relevant passages or records and placing them in the context for a specific question. |
| Retrieval-augmented generation | Answering with the aid of retrieved source material rather than relying only on information learned during training. |
| Retry jitter | Random variation added to retry delays so that many clients do not retry at the same instant. |
| Role-based access | Assigning permissions according to a role rather than to each individual request or caller. |
| Sampling temperature | A setting that changes how strongly the model favors high-probability tokens; lower values give more repeatable output. |
| Sandbox | An isolated environment that limits what code or a tool can access, used to contain mistakes and attacks. |
| Secret manager | A service that stores credentials and injects them at runtime, keeping them out of prompts, logs, and source files. |
| Stop condition | An explicit rule that ends an agent loop, such as a step limit, a goal check, or repeated identical actions. |
| Streaming | Delivering generated text incrementally so a client can display partial output and cancel early. |
| System message | A high-authority message that states policy and behavioral rules, kept stable across turns where possible. |
| Tool call | A structured request from the model to execute a named operation with arguments that match a schema. |
| Tool definition | The description of a tool's purpose, parameters, types, and constraints that helps the model call it correctly. |
| Tool result | The structured value returned to the model after a tool executes, including errors that allow recovery. |
| Trace | A record of the steps in one request, including model calls, tool calls, timings, and identifiers. |
| Untrusted input | Any content that may contain adversarial instructions, including user text, documents, tool output, and web pages. |
| Vendor adapter | A thin internal interface that isolates application code from provider-specific details to support later changes. |
| Vision input | Image data supplied to the model for extraction, classification, or description, often paired with a typed output contract. |
| Webhook | An outgoing callback that notifies a client when a background job reaches a defined state. |

### One-page quick-reference of decision rules

Use this table when two options look equally plausible. The rule column is a decision, and the reason column tells you which constraint to look for in the scenario.

| Situation | Rule | Reason |
| --- | --- | --- |
| Steps are fixed and rules are published | Choose a workflow | No runtime discovery means an agent adds cost without benefit |
| The next step depends on a discovery | Choose a bounded agent | Only an agent can choose an unplanned action |
| A rule must never be violated | Enforce with a hook, schema, or permission | Prompt wording is advisory and probabilistic |
| Output must have a fixed shape | Declare a schema and validate | Type correctness cannot be requested reliably in prose |
| Interactive latency is required | Use streaming or a synchronous path | Batch work cannot meet a two-second ceiling |
| Large non-urgent volume | Use batch with a stable prefix | Price and throughput improve when latency is irrelevant |
| The prefix changes on every request | Do not count on caching | A changing leading segment prevents reuse |
| External content may contain instructions | Treat it as untrusted data | Injection succeeds when data is given policy authority |
| A tool can change state | Require scope limits and confirmation | Irreversible actions deserve an extra gate |
| A task is simple and high-volume | Choose the small tier | Capability that is not needed is still paid for |
| A task is ambiguous and expensive to get wrong | Choose a capable tier and add review | Error cost dominates unit price |
| Context has grown very long | Summarize, retrieve, or reorder | Relevant facts in the middle are easily missed |
| A provider may change later | Hide it behind an adapter and log identifiers | Coupling is the cost of convenience |
| Quality is uncertain after a change | Compare against a frozen evaluation set | Measurement separates regressions from impressions |
| Confidence is low or impact is high | Escalate to a person | Some decisions should not be automated |

Two short rules are worth memorizing verbatim. First, when a scenario names a hard boundary, the correct option enforces it rather than asking for it. Second, when a scenario names a deadline, the correct option preserves the deadline even if another option is cheaper.

### Metric definitions that appear in scenarios

Many wrong answers come from reading a metric correctly but applying it to the wrong question. The table below fixes the meaning of the measures that appear most often in acceptance criteria and evaluation questions.

| Metric | What it measures | Common misreading |
| --- | --- | --- |
| Accuracy | Fraction of predictions that are correct across a labeled set | Assuming a high score is acceptable when one class matters far more than the others |
| Precision | Fraction of positive predictions that were actually positive | Confusing it with the fraction of real positives that were found |
| Recall | Fraction of real positives that were found | Confusing it with the share of predictions that were correct |
| Time to first token | Delay until output begins | Treating it as the total time to finish an answer |
| Total latency | Delay until the complete response is available | Using it to describe how quickly a stream starts |
| Task completion rate | Fraction of user goals finished without escalation | Replacing it with a count of tokens generated |
| Escalation rate | Fraction of cases routed to a person | Treating every escalation as a failure |
| Cache hit rate | Fraction of requests that reused a cached prefix | Assuming it is high merely because caching is enabled |
| Cost per unit | Spend divided by a business unit such as a thousand items | Ignoring which token class drove the spend |
| Supported-claim rate | Fraction of claims backed by a cited source span | Counting a citation as proof without checking the span |

Two relationships are worth keeping in view. Precision and recall usually move against each other when you shift a decision threshold, so a question that demands fewer false positives is likely asking you to accept fewer found positives. Likewise, time to first token and total latency can diverge sharply under streaming: a fast start does not promise a fast finish.

> **Exam note:** When a scenario names a class imbalance, look for a metric that reflects the important class. Overall accuracy can look excellent while the rare, expensive case is consistently missed.

### Common distractor patterns in exam options

Wrong options are not random. They tend to follow recognizable patterns, and naming the pattern makes them easier to discard quickly.

| Pattern | How it looks | Why it fails | Counter-move |
| --- | --- | --- | --- |
| The impressive extra | Adds an agent, planner, or memory to a fixed job | Adds cost and variability without benefit | Ask whether any step depends on a discovery |
| The polite instruction | "Ask the model to always include..." | Not a guarantee | Look for a hook, schema, or post-processing step |
| The wrong timescale | Batch for a live chat, streaming for an offline job | Violates the stated deadline | Classify the workload as interactive or offline |
| The oversized tier | Most capable model for a trivial extraction | Ignores volume and error cost | Name ambiguity and error cost before choosing |
| The broken cache | Caching a prefix with a timestamp or user value | No stable leading segment | Find what stays identical across requests |
| The trusting reader | Treats a retrieved page as policy | Enables indirect injection | Label all external content as data |
| The broad grant | Administrator credentials for a read-only tool | Violates least privilege | Rewrite the grant as the narrowest possible scope |
| The invisible system | Logs final text but no model, tool, or token data | Cannot reproduce or compare decisions | Look for trace fields and recorded identifiers |
| The unmeasurable goal | "Fast," "smart," "helpful," "secure" | Cannot pass or fail | Require metric, threshold, and population |
| The contaminated test | Evaluation built from prompt examples | Measures memorization | Demand held-out, versioned examples |
| The silent failure | Returns success when a tool or request fails | Hides the problem from callers | Expect structured errors and clear failure states |
| The missing stop | A loop with no step or repetition limit | Can run indefinitely | Search for an explicit stop condition |
| The afterthought review | Human approval mentioned only after deployment | Too late for high-impact actions | Place review before the consequential step |

> **Exam note:** If an option solves a problem the scenario never mentioned while ignoring a constraint it did mention, discard it. Relevance to the stated problem beats sophistication.

### Pre-deployment checklist

- Every requirement has a metric, a threshold, and a defined population
- The shape of each component is justified as workflow, agent, or fixed service
- Agent loops have step, token, time, and repetition limits
- All generated structures are validated against declared schemas
- Hooks or permissions enforce every rule described as "must never"
- Model tier is justified by ambiguity, volume, and error cost
- Caching is enabled only where the leading segment is genuinely stable
- Batch is used only where the deadline permits delayed completion
- A frozen evaluation set has been run against the final prompt and configuration
- A rollback path exists for the prompt, the configuration, and the model choice
- Latency has been measured at the stated percentile under representative load
- Cost per unit has been measured and compared with the agreed ceiling
- Logging, tracing, and alerting are active before traffic arrives
- Data retention and deletion behavior has been verified
- Documentation states what the system will refuse to do

The order of this list matters less than the habit of running all of it. Teams usually remember the model and the prompt and forget the failure behavior, the rollback path, and the measurement method. Those omissions are exactly what scenario questions like to expose, because they are properties of the whole system rather than of one component.

Use the list twice: once before a real release and once while answering an exam question about readiness. On the exam, an option that mentions only the happy path is incomplete even when every named technology is correct.

### Security checklist

- System policy is separate from user content and retrieved content
- All external text is labeled as untrusted data at every boundary
- Prompts contain no credentials, keys, or connection strings
- Secrets are injected at runtime from a secret manager
- Tool permissions are scoped to the narrowest path, collection, and operation
- State-changing tools require explicit confirmation and argument validation
- Connectors use read-only credentials where only reading is required
- Domains, collections, and file paths are constrained by allow-lists
- Tool output is validated and size-limited before entering the context
- Redaction removes personal data before logging or display
- Retries use idempotency keys so repeated attempts cannot duplicate effects
- Rate limits and quotas are applied per tenant
- Sandboxing isolates any generated code or untrusted execution
- Audit records capture tool calls, arguments with secrets removed, and outcomes
- Incident notes describe how an injection attempt would be detected and stopped

The security list is organized around a single idea: reduce what an attacker can reach even if the model is fully deceived. That is why placement of content, tool scope, and secret handling appear before detection. An injection that cannot reach a state-changing tool or a stored credential is a nuisance; the same injection with broad permissions is an incident.

When a scenario presents several security options, rank them by what they remove rather than by what they add. Removing write access, removing long-lived credentials, and removing untrusted text from policy positions are stronger than adding another warning sentence.

### Observability field checklist

Each trace should carry enough information to answer what happened, why that model was chosen, and what it cost. Confirm the presence of the following fields.

| Field | Purpose |
| --- | --- |
| Request identifier | Links all steps of one user request |
| Tenant or caller identifier | Supports isolation, quotas, and targeted investigation |
| Model identifier and version | Makes behavior and cost comparable across changes |
| Prompt or configuration version | Connects output quality to a specific instruction set |
| Input and output token counts | Supports cost accounting and context-growth diagnosis |
| Time to first token and total duration | Separates model latency from tool latency |
| Tool name, arguments, and duration | Identifies slow or failing integrations |
| Validation and hook outcomes | Shows which guardrails fired or denied an action |
| Error code and retry count | Distinguishes transient failures from persistent faults |
| Cache hit indicator | Confirms whether prefix reuse actually occurred |
| Escalation flag | Marks cases routed to a person |
| Redaction status | Confirms sensitive values were removed before storage |

A trace that contains these fields can answer most diagnostic questions without a new experiment. You can tell whether a quality drop came from a prompt change, a model change, a tool slowdown, or a cache that stopped hitting. You can also tell whether a cost increase came from more calls, longer inputs, longer outputs, or a different tier. Removing any field does not break the service, but it silently removes a question you will later need to ask.

> **Common mistake:** Recording only the final answer. Without tool durations, validation outcomes, and model identifiers, a quality drop cannot be traced to its cause.

### Template for a measurable requirement

Copy this structure when a brief contains an adjective. Fill every slot; an unfilled slot means the requirement is still a preference.

```text
Given [population and preconditions],
when [trigger or input condition],
the system shall [observable behavior]
with [metric] at least/at most [threshold],
measured by [measurement method],
and on failure it shall [defined failure behavior].
```

A filled example for a document service reads:

```text
Given a seeded set of 300 uploaded contracts with marked source spans,
when a user asks a factual question about one document,
the system shall return an answer with a citation to a supporting span
with supported-claim rate at least 98 percent,
measured by automated span comparison plus a 50-item manual audit,
and on failure it shall return an explicit refusal with no generated answer.
```

Notice that the failure behavior is part of the requirement. Without it, a team can meet the threshold on average while leaving the remaining cases unhandled. The exam applies the same standard: an option that improves the average but ignores the tail is weaker than one that defines what happens in the tail.

## Worked scenario

A scenario describes an application with a three-thousand-token system prompt that never changes, a two-second response deadline, a tool that sometimes fails, and a need to keep vendor options open. Four options are offered: batch processing, a larger model, a stable-prefix cache with an adapter layer, and extended thinking.

Apply the quick-reference. The deadline eliminates batch immediately because batch work is delayed by design. A larger model is not justified because the scenario contains no ambiguity or high error cost. Extended thinking adds latency before output, which works against the deadline. The remaining option addresses two stated facts at once: the stable prompt makes prefix caching effective, and the adapter layer supports a future provider change. It is the only option that maps to explicit constraints rather than general goodness.

Now check it against the distractor table. Batch is the wrong timescale, the larger model is the oversized tier, and extended thinking is the impressive extra. Naming the patterns makes the elimination faster and more reliable than evaluating each option from scratch.

## Common mistakes

- Treating the glossary as vocabulary to memorize rather than a set of distinctions to apply
- Choosing a control because it is familiar instead of because the scenario requires it
- Assuming caching works whenever a prompt is long rather than checking stability
- Forgetting that observability fields are part of a design, not an afterthought
- Writing requirements with thresholds but no population or failure behavior
- Ignoring quiet constraints about residency, retention, or read-only access
- Skipping the security checklist because the scenario mentions no attacker

## Chapter summary

- The glossary fixes the meaning of the terms that carry the most exam weight.
- The decision-rule table converts a situation into a choice and names the reason.
- Distractor patterns repeat; recognizing one shortens the elimination process.
- Pre-deployment, security, and observability checks catch omissions that scenarios often test.
- A measurable requirement always includes a population, a metric, a threshold, and a failure behavior.
- The worked scenario shows how constraints, not impressions, decide between plausible options.

## Checkpoint questions

**1.** Which single change would make prompt caching least effective?

- A. Keeping the system prompt identical across requests
- B. Placing a unique timestamp at the start of the prompt
- C. Using a small model tier
- D. Recording cache hit indicators in traces

**2.** A tool must search a knowledge base but never modify it. Which grant is correct?

- A. Administrator credentials with all operations allowed
- B. Read-only credentials scoped to approved collections
- C. Read-only credentials with no allow-list
- D. Credentials that are rotated daily but remain broad

**3.** Which observability field is most useful for diagnosing a sudden cost increase?

- A. Final answer text
- B. Input and output token counts with model identifiers
- C. Client screen resolution
- D. Number of words in the system message

**4.** A requirement says answers should be fast. What is missing?

- A. A metric, a threshold, a population, and a failure behavior
- B. A description of the model provider
- C. A list of tool names
- D. A statement that the answer should also be accurate

**5.** Which option is a clear distractor pattern rather than a valid technique?

- A. A bounded loop with a stop condition
- B. A schema that validates tool arguments
- C. An agent added to a fixed-sequence job with no runtime discovery
- D. A canary rollout with a rollback switch

**6.** Retrieved text contains a line that tells the assistant to ignore its rules. How should the message structure treat it?

- A. As a system message, because retrieval gives it authority
- B. As untrusted content in a bounded block, with policy kept separately
- C. As an assistant message, because it reads like a statement
- D. As the only source of policy for that request

### Answers and rationale

**1. B.** A unique leading value prevents any prefix from matching across calls. Option A helps caching, option C concerns price rather than reuse, and option D only measures whether caching occurred.

**2. B.** It matches both halves of the brief: reading only, and only in approved collections. Option A exceeds the need, option C leaves the collection scope unbounded, and option D changes credential lifetime without narrowing scope.

**3. B.** Token counts and model identifiers show whether volume, output length, or tier selection drove the increase. Answer text, screen resolution, and prompt word count do not explain billed units.

**4. A.** Without those elements the statement cannot be tested. Provider, tool list, and general accuracy claims do not make the speed requirement measurable.

**5. C.** An agent solves a problem the scenario does not have and introduces needless variability. The other options are legitimate techniques when their conditions are met.

**6. B.** Bounded placement as data preserves the policy hierarchy and supports injection resistance. Giving retrieved text system authority, assistant authority, or sole policy authority each hand control to untrusted content.

---

*End of chapter 16.*
