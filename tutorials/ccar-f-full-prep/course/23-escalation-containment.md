# Chapter 23 — Escalation, Ambiguity, and Error Containment

Most systems fail not because a single step is wrong, but because a wrong step is allowed to become an input to the next one. A guessed classification turns into a wrong route, which produces a wrong action, which is recorded as a fact. Ambiguity and errors are inevitable in language-based systems; the question is whether they are contained or allowed to spread.

This chapter is about the policies that keep small uncertainties from becoming large failures. You will learn how to respond when an instruction is unclear, how to stop errors from propagating between steps, when to recover in place and when to hand off to a person, and how to treat confidence labels with appropriate scepticism.

## Learning objectives

- Compare three responses to ambiguity: asking for clarification, applying a documented safe default, and taking no action.
- Explain how errors propagate between workflow steps and how checkpoints contain them.
- Decide when to recover in place and when to escalate to a human reviewer.
- Define escalation triggers and thresholds tied to reversibility, authority, and impact.
- Describe why self-reported confidence is unreliable on its own and which stronger signals to use.
- Assemble a reliability policy that covers ambiguity, containment, recovery, escalation, and logging.

## Key concepts

### Ambiguity as a design condition

Natural language is full of gaps. An instruction may omit the rule for an edge case, a document may use a term in two senses, or a user may request an action at two possible scopes. Conventional software treats such gaps as specification errors; an assistant-driven system treats them as a normal operating condition, because inputs are messy and situations cannot all be enumerated.

The important shift is to stop treating ambiguity as an interruption and start treating it as a case the design must handle. A workflow should have a defined response when the meaning is unclear, just as it has a defined response when a tool fails. Without such a policy, the model will improvise, and improvisation is unpredictable in exactly the situations where predictability matters most.

Ambiguity is not always resolvable by asking. Sometimes nobody is available to answer, and sometimes the cost of asking exceeds the cost of a small reversible mistake. A good policy distinguishes material ambiguity, which changes the outcome, from incidental ambiguity, which does not. The response should match that distinction rather than treating every unclear detail as a blocker.

> **Exam note:** If a question describes an ambiguous instruction whose interpretation would change an irreversible outcome, the strongest answer is usually to seek clarification or abstain, not to guess.

### Clarify, default, or abstain

There are three defensible responses to an unclear instruction. The first is to *ask a clarifying question*. This is appropriate when the ambiguity materially changes the result and a person can answer quickly. A good clarifying question is narrow: it presents the specific choice and the options rather than asking the person to restate the whole task. Asking is not free, so it should be reserved for cases where the answer changes what the system will do.

The second is to *apply a documented safe default*. Many ambiguities concern low-stakes details where one reasonable interpretation is clearly conservative. If the policy says to treat an unstated priority as normal rather than urgent, the system can proceed without asking. The key word is documented: the default must be chosen deliberately and recorded, not invented at the moment of need. Applying a default should also be visible in the output or log, so a reviewer can see which interpretation was used.

The third is to *abstain*, which means taking no action and explaining why. Abstention is the correct choice when neither asking nor defaulting is safe: the situation is outside the system's authority, the input is contradictory, or the possible action is irreversible. Taking no action is not the same as doing nothing passively; it is a decision with consequences, and it should be explicit, reasoned, and logged. A system that quietly produces nothing is indistinguishable from one that crashed.

These responses form a ladder. Prefer clarification when it is available and material, fall back to a documented default when the stakes are low, and abstain when the risk of acting on a guess is unacceptable. The ladder should be written into the workflow rather than left to the model's momentary judgement.

### Containing errors between steps

A workflow is a chain, and chains transmit failures. If a classifier labels a request as low priority when it is actually urgent, a later routing step will send it down the wrong path, and a final action step will behave accordingly. By the time the error is visible, the original misclassification is far back in the chain and hard to trace. Containment means placing checks between steps so that a wrong output cannot silently become a trusted input.

Containment has four operations. *Detect* means checking an intermediate result against a rule or an independent signal. *Stop* means refusing to advance when the check fails. *Contain* means isolating the bad item so it cannot affect neighbouring work, as a batch quarantine does. *Recover* means taking a defined action, such as retrying the step or routing it for review. These operations are more reliable when the intermediate result is written to an inspectable record instead of being passed directly from one thought to the next.

A particularly dangerous pattern is treating a model's guess as a verified fact in a later step. If the first step says a number came from a source document, the second step should verify that the number actually appears there before using it. Without this check, a single hallucination can be amplified through several stages and emerge as a confident final answer with a false provenance attached. Containment turns each step's output into a claim that must be validated before promotion.

The cost of containment is extra checks and occasional delays. The benefit is that failures stay local. A design rule of thumb is to place a check wherever the cost of passing an error forward exceeds the cost of checking it. That condition is common near actions with side effects and rare in purely exploratory steps.

### Staying to recover or escalating

When something goes wrong, the system has two broad choices. It can *recover in place*, using its own tools and bounded retries, or it can *escalate*, handing the problem to a person with enough context to decide. The choice depends on reversibility, authority, and the likelihood that another attempt will help.

Recovery is appropriate for transient failures and low-impact errors. A tool call that timed out can be retried. A malformed result can be regenerated with a corrected prompt. A missing optional field can be filled with a documented default. These situations have a clear path to success that does not require human judgement. Recovery should still be bounded: repeated identical attempts usually indicate a structural problem rather than bad luck.

Escalation is appropriate when the system lacks authority, when the action is irreversible or costly, when sources conflict in a way the system cannot resolve, or when repeated attempts have failed. Escalation is not an admission of failure; it is a correct routing decision. What makes escalation useful is the quality of the handoff. A reviewer should receive the original task, what was attempted, what failed, the evidence gathered, and the specific decision required. A handoff that says only "please review this" shifts the entire investigation onto the person and defeats the purpose.

There is also a middle path: narrow the task and continue under reduced scope. If a large action is beyond authority but a smaller reversible version is permitted, the system may perform the smaller action and flag the rest. This preserves progress without exceeding the boundary. The policy must define such partial actions explicitly, because an improvised partial action can be just as risky as a full one.

### Escalation triggers and thresholds

Escalation works best when triggers are defined in advance rather than invented under pressure. A trigger is an observable condition: a confidence label below a threshold, two sources that disagree, a tool that has failed several times, a requested action that exceeds a spend limit, or an input that matches a protected category. When a trigger fires, the defined response follows without debate.

Thresholds require tuning. Set them too aggressively and reviewers are flooded with trivial cases, which leads to fatigue and ignored escalations. Set them too loosely and harmful actions proceed unchecked. Good thresholds are chosen by examining historical cases: how often did the signal appear, and how often did it correspond to a real problem? A threshold that cannot be measured is a guess, and a guess disguised as policy is worse than an honest uncertainty.

The table below gives common triggers and the reasoning behind them. It is a design aid, not a universal rule set; each system must adapt it to its own failure costs.

| Trigger | Example threshold | Defined response | Why it matters |
| --- | --- | --- | --- |
| Low confidence label | Below an agreed score | Flag for review before acting | Self-assessment is weak but useful as a coarse filter |
| Conflicting sources | Two authoritative sources disagree | Escalate with both excerpts | The system cannot choose between claims |
| Repeated tool failure | Same call fails several times | Stop and hand off the failing step | Retrying further wastes budget |
| Authority exceeded | Action above an approved limit | Request explicit authorisation | The system lacks permission for the action |
| Irreversible action | Any destructive or external effect | Require human confirmation | The cost of a wrong action is high |
| Novel or out-of-scope input | Input outside documented cases | Abstain and explain | No reliable policy exists for the case |

Notice that several triggers do not depend on confidence at all. Authority and reversibility are properties of the action, not of the model's certainty. A highly confident system must still stop before an action it is not permitted to take.

### Confidence labels and their limits

Many systems ask the model to report a confidence score alongside its answer. Such a score can be useful as a coarse sorting signal, but it is not a measurement in the statistical sense. Models can be confidently wrong, especially in unfamiliar domains, on adversarial input, or after a long context has degraded their attention. A label that says `0.95` does not mean the claim has a ninety-five percent chance of being true.

Distrust self-reported confidence most when the evidence is weak or conflicting, when the task is outside familiar patterns, when the context is long, or when the wording of the input is unusual. These are precisely the situations in which the model's internal signal is least calibrated. Treating a high score as proof in those cases converts a warning sign into a false guarantee.

Stronger signals come from outside the model. Agreement between independent reviews is meaningful because errors are less likely to coincide. A deterministic check that confirms a claim against a source is stronger than an assertion about certainty. Consistency across paraphrases of the question can reveal instability. The best use of a confidence label is as one input among several: a trigger for review, never an override of a hard rule.

Calibration improves with measurement. Recording confidence scores alongside eventual outcomes lets a team learn which scores predict errors and set thresholds accordingly. Without that feedback loop a threshold is arbitrary. A number is only as good as the calibration behind it.

> **Common mistake:** Allowing a high confidence score to bypass an authority check. Confidence describes belief, not permission; an action beyond scope remains beyond scope regardless of certainty.

### A reliability policy

The various decisions in this chapter become useful when written as one coherent policy. A reliability policy states what the system does under ambiguity, how it contains errors, how it recovers, when it escalates, and what it records. Keeping these rules in one place makes them testable and prevents contradictions between components.

```text
RELIABILITY POLICY

1. AMBIGUITY
   - If interpretation changes an irreversible outcome: ask for clarification.
   - Else if a documented safe default exists: apply it and record which was used.
   - Else: abstain, state the ambiguity, and take no action.

2. CONTAINMENT
   - Validate each step's output before it becomes the next step's input.
   - Never promote a guessed fact to a verified fact without a check.
   - Quarantine failed items so neighbours continue unaffected.

3. RECOVERY
   - Retry a transient failure a bounded number of times.
   - Try one alternate route before escalating.
   - Stop repeating identical attempts after the bound is reached.

4. ESCALATION
   - Escalate when confidence is below threshold, sources conflict,
     authority is exceeded, or the action is irreversible.
   - Handoff must include the task, attempts, evidence, and decision needed.

5. LOGGING
   - Record every abstention, default applied, and escalation.
   - Review the log periodically to retune thresholds.
```

A policy like this is more than documentation. It is a specification for tests. Each line can be exercised with a representative case, and failures can be traced to a particular rule. When the system behaves badly, the team can ask which rule governed the decision and whether the rule or its application was at fault.

## Worked scenario

An assistant processes vendor invoices and recommends approval. The workflow reads an invoice, matches it to a purchase record, checks the amount against an approval limit, and produces a recommendation. A reviewer notices two problems. First, when a vendor name is slightly misspelled, the matching step guesses a record and the recommendation proceeds on the wrong vendor. Second, an invoice just above the approval limit is approved because the amount extraction step reported a lower figure with high confidence, and no later step verified it.

An architect traces both problems to missing containment. The matching guess was passed forward as a confirmed match, and the extracted amount was never checked against the source image. Confidence labels existed but were treated as proof. There was no rule for what to do when a match was uncertain or when an amount exceeded the limit.

She introduces a reliability policy. The matching step now returns a set of candidates with similarity scores rather than a single answer. If the best candidate is below a defined threshold, the item is flagged as ambiguous and routed for human matching instead of being guessed. The amount extraction step returns the figure together with a short excerpt from the source; a deterministic check confirms that the figure appears in that excerpt. If the check fails, the item is quarantined.

She also adds an authority gate that is independent of confidence: any amount above the approval limit requires explicit authorisation, regardless of how certain the extraction appears. Escalations carry the invoice image, the candidate matches, the extracted figure, the verification result, and a single question for the reviewer. Every abstention, default, and escalation is logged.

After the change, the misspelled vendor produces a request for a matching decision instead of a confident recommendation. The over-limit invoice is blocked by the authority gate despite the wrong extraction. Reviewers get compact handoffs. The team then uses the log to retune the matching threshold, which had escalated more cases than necessary.

## Common mistakes

- Guessing an interpretation when the choice would change an irreversible outcome, instead of asking or abstaining.
- Inventing defaults at runtime rather than documenting them in advance.
- Passing a model's guess from one step to the next without verification, allowing it to harden into a fact.
- Escalating every uncertain case, which floods reviewers and trains them to ignore alerts.
- Treating a high confidence label as permission to skip a hard rule or authority check.
- Handing off a problem with no record of what was attempted or what decision is needed.
- Retrying a failing operation without a bound or an alternate route.
- Setting thresholds once and never reviewing them against real outcomes.

## Chapter summary

- Ambiguity is a normal condition in language-based systems and needs a defined response like any other failure mode.
- The response ladder is clarify when material and answerable, apply a documented safe default when low-stakes, and abstain when acting would be unsafe.
- Errors propagate through workflow chains; checkpoints detect, stop, contain, and recover before a wrong output becomes a trusted input.
- Escalation is appropriate when authority is lacking, actions are irreversible, sources conflict, or bounded recovery has failed.
- Triggers and thresholds should be defined in advance and tuned from logged outcomes rather than guessed.
- Self-reported confidence is a coarse signal at best; independent agreement and deterministic checks are stronger.
- A single written reliability policy makes the rules testable and keeps components consistent with one another.

## Checkpoint questions

1. An instruction is unclear, but both interpretations lead to the same reversible outcome. What is the best response?

A. Always ask a clarifying question, regardless of impact.
B. Apply a documented safe default and record which interpretation was used.
C. Abstain even though the stakes are low.
D. Choose the more aggressive interpretation and proceed silently.

2. What is the main purpose of a checkpoint between two workflow steps?

A. To make the second step run faster.
B. To increase the model's confidence in its earlier answer.
C. To prevent a wrong intermediate result from becoming a trusted input to the next step.
D. To remove the need for any final review.

3. An amount extraction is reported with high confidence but exceeds the approval limit. What should happen?

A. Approve it because the confidence label is high.
B. Re-extract it once and then approve automatically.
C. Require explicit authorisation because authority is independent of confidence.
D. Discard the invoice without recording the decision.

4. Which escalation handoff is most useful to a reviewer?

A. A short note asking the reviewer to investigate from the beginning.
B. The original task, attempts made, evidence gathered, and the specific decision required.
C. Only the model's final answer.
D. A list of every tool the system has available.

5. Why should confidence labels be treated cautiously?

A. They are always formatted incorrectly.
B. Models cannot produce numbers.
C. Models can be confidently wrong, so labels need calibration and supporting signals.
D. They are only useful for batch processing.

6. A matching threshold escalates far more cases than the team can review. What is the appropriate response?

A. Ignore the escalations until the backlog clears.
B. Remove the threshold entirely.
C. Review logged outcomes and retune the threshold using evidence.
D. Lower the confidence of every result artificially.

### Answers and rationale

1. **B** is correct because a low-stakes ambiguity with a documented conservative interpretation can proceed safely and transparently. **A** is wrong because asking when the outcome is unchanged wastes attention. **C** is wrong because abstaining from a reversible, equivalent choice adds no value. **D** is wrong because silent guessing hides which interpretation was used.

2. **C** is correct because containment is about stopping error propagation between steps. **A** is wrong because speed is not the purpose of a checkpoint. **B** is wrong because a checkpoint tests a result rather than boosting confidence in it. **D** is wrong because intermediate checks do not remove the need for final review.

3. **C** is correct because authority limits apply regardless of confidence. **A** is wrong because confidence is not permission. **B** is wrong because a re-extraction does not grant authority. **D** is wrong because recording decisions is essential for traceability.

4. **B** is correct because a focused handoff lets the reviewer decide without repeating the investigation. **A** is wrong because it shifts all work to the reviewer. **C** is wrong because the final answer alone lacks context. **D** is wrong because a tool list does not describe the problem.

5. **C** is correct because confidence must be calibrated and supported by stronger signals. **A** is wrong because formatting is not the issue. **B** is wrong because models can produce numbers. **D** is wrong because confidence is relevant well beyond batch processing.

6. **C** is correct because thresholds should be tuned from evidence about real outcomes. **A** is wrong because ignoring alerts defeats the control. **B** is wrong because removing the threshold reintroduces the original risk. **D** is wrong because altering reported scores fabricates data rather than fixing policy.

---

*End of chapter 23.*
