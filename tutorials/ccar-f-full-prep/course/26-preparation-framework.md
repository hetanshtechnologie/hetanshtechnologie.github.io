# Chapter 26 — The Preparation Framework and Question Traps

Knowing the material is necessary but not sufficient. A well-designed question is a small argument: it gives a situation, hides a constraint in the detail, and offers four plausible responses. Two candidates can know the same facts and diverge, because one reads the argument and the other reads for familiar words. This chapter turns preparation into a repeatable routine and teaches you to take the question apart.

Consistency, not cleverness, is the aim. A routine applied to every scenario removes guesswork about where to start, leaving attention for the only thing that matters: why one option fits the constraints and the others do not.

## Learning objectives

- Apply a three-part preparation framework built from concept, scenario, and elimination.
- Recognize language traps created by absolute qualifiers, scope shifts, and negative framing.
- Identify content traps such as the wrong layer, skipped verification, over-privileged access, and polished-but-wrong output.
- Extract the deciding constraint from a long case study rather than reacting to the most vivid detail.
- Use a prioritization matrix to direct the remaining study time toward the weakest high-weight areas.
- Follow a pre-answer routine that makes each choice defensible before you commit to it.

## Key concepts

### The preparation triangle: concept, scenario, elimination

Preparation is a triangle; pull one corner down and the shape weakens.

**Concept** means knowing why a technique exists, not merely its name. If you cannot name the failure a step budget prevents, you know a phrase. Ask what breaks when the technique is absent; a technique with no imaginable failure mode is remembered as vocabulary.

**Scenario** practice means meeting the same idea in different clothing. A context budget appears in a question about search results, another about a long session, and a third about a large repository. If those feel like three topics, you are reading surfaces. Rewriting each into its underlying layer fixes this.

**Elimination** treats each option as a claim to test, not a memory to match. The strongest option rarely uses the most familiar words; it survives a check against the constraint the case established. Elimination can rescue a question whose concept you partly recall.

The corners reinforce each other. Concept without scenario fails when the wording is unfamiliar. Scenario without concept fails when a distractor is new but structurally identical to something you have seen. Elimination without either degenerates into guessing which option "sounds right."

> **Exam note:** If a question feels instantly familiar, slow down. Familiarity is often a signal that the question has moved the same concept into a different layer.

### Language traps, group one: absolute qualifiers

Absolute qualifiers include always, never, only, guaranteed, impossible, and must. Some are legitimate: an approval gate really must be enforced outside the model. Most sweeping claims about behavior are not, because agentic systems are probabilistic and outcomes depend on context and tooling.

When you meet one, restate the option with a softer word such as usually. If the softened version is plainly true and the original doubtful, the qualifier is making the option wrong. Then ask whether the question demands an unconditional guarantee.

The claim that a strict schema always prevents invalid output is a typical false absolute. A schema narrows acceptable answers, but validation and repair loops still matter. The careful version says a schema reduces invalid output and should be paired with validation.

The mirror case occurs when a question asks which control is mandatory for an irreversible action; must is then justified. Do not reject absolutes by reflex; test whether the action warrants them.

### Language traps, group two: scope shifts

A scope shift changes the object between stem and options. The stem asks about one tool, an option discusses the platform. The stem asks about a single session, an option describes coordination across agents. The stem asks which layer owns a decision, an option names who should be consulted.

Scope shifts work because every statement in the option may be true. Truth is not the test; relevance is. A reviewer can agree with an option and still be answering a different question.

Underline the noun the stem is about and note its level: a call, a session, a workflow, a system, or an organization. Check each option for the same noun at the same level. An option that changes the noun is almost always a distractor.

A time-scope shift is common: the stem asks what to do first, the option describes an improvement that belongs later. When a stem contains first, next, or immediately, treat order as part of the constraint.

### Language traps, group three: negative framing

Negative framing asks which option is not appropriate, which action is least likely to help, or which statement is incorrect. These questions are not harder conceptually, but they punish automatic reading. A candidate who selects the most attractive statement without noticing the negative instruction gets the question wrong while understanding the material perfectly.

The reliable method is to convert the question into a positive search. Mark the negative word visibly, find the options that satisfy the positive version, and eliminate them. The remainder is your answer. If two options seem to satisfy the positive version, re-read them for a qualifier that makes one false.

Double negatives appear occasionally, often wrapped in polite wording such as "which change would not be unhelpful." Translate before reasoning. Write the plain positive request in the margin of your notes, then work from that.

> **Common mistake:** Reading a negatively framed question twice and then trusting the first impression. Re-reading without translating usually preserves the original error.

### A compact guide to language traps

The three groups are easier to keep separate when their signals and counter-moves are written down.

| Trap group | Typical signal | What it tempts you to do | Counter-move |
| --- | --- | --- | --- |
| Absolute qualifiers | Always, never, only, guaranteed | Accept a sweeping claim because it sounds decisive | Soften the qualifier and see whether the claim survives |
| Scope shifts | Platform for tool, system for session | Agree with a true statement about the wrong object | Underline the stem's noun and match its level in each option |
| Negative framing | Not, except, least, incorrect | Pick the most attractive statement | Translate to a positive request, eliminate the matches |

### Content traps that survive careful reading

Language traps concern phrasing; content traps concern what an option proposes. An option can be phrased perfectly and still be wrong for the case.

The **wrong-layer trap** offers a technique from a different layer. Restricting a tool's permissions is a real improvement, but if the case is about an unbounded loop, it does not answer the question. It is not false; it is aimed at another seam.

The **skipped-verification trap** trusts a result because it looks complete. A fluent summary or a successful-looking tool call is treated as proof that earlier steps succeeded. The right option introduces an explicit check or a typed status.

The **over-privileged-access trap** grants more authority than the case permits. It looks attractive because it removes an obstacle quickly, but the deciding constraint is usually least privilege.

The **polished-but-wrong-output trap** mistakes presentation for correctness. A formatted answer with citations can be built from a superseded source. The repair is provenance or validation, not a rewrite.

| Content trap | How it appears in an option | Diagnostic question |
| --- | --- | --- |
| Wrong layer | A real fix from a different layer | Which seam did the case actually break at? |
| Skipped verification | Output is trusted without a check | What would reveal that the result is wrong? |
| Over-privileged access | Broad credentials solve the task | What is the minimum authority this task needs? |
| Polished-but-wrong output | A fluent answer is accepted as evidence | Where did each claim in the answer come from? |

> **Review heuristic:** When an option feels obviously good, ask which constraint it ignores. Good options in these questions usually satisfy a constraint, not merely describe a best practice.

### Extracting the deciding constraint from a case study

A long scenario is mostly noise by design; one detail makes one answer right. Extraction finds that detail before you read the options, so the options cannot steer your reading.

Work in a fixed order. Write the goal in one sentence with the actor and outcome. List constraints and label each hard or soft. Identify the failure affordance, the harm possible when the system goes wrong. Note who holds authority and what approvals exist. Mark the seam where data or control crosses layers. Restate the stem in your own words, including any sequencing word.

The deciding constraint is usually the hard constraint closest to the failure affordance. In a case about external communications, no sending without approval outranks response quality. With confidential documents, scope outranks convenience. Once identified, most options become easy to classify.

```text
CASE-STUDY EXTRACTION WORKSHEET

Goal: actor + intended outcome, in one sentence
Hard constraints: cannot be traded away
Soft constraints: can be balanced against cost or speed
Failure affordance: the worst plausible harm if this goes wrong
Authority map: who can read, write, send, delete, approve
Seams crossed: where data or control changes layer
Question actually asked: layer, fix, and any sequencing word
Deciding constraint: hard constraint nearest the failure affordance
Option test: does this option satisfy the deciding constraint?
```

> **Try it:** Practice on a case you have already answered. Fill the worksheet before looking at the answer key, then check whether the deciding constraint you wrote matches the one the correct option satisfies.

### A prioritization matrix for remaining study time

Time spent evenly across topics feels fair and produces mediocre results. Weight your effort by two factors: how weak you are in an area and how heavily it tends to appear in questions. The matrix below turns that into an action for each quadrant.

| Knowledge state | High question weight | Low question weight |
| --- | --- | --- |
| Weak | Study first; work scenario after scenario until the failure mode is clear | Learn enough to recognize and eliminate distractors, then move on |
| Strong | Maintain with mixed practice that reshuffles the layer and the wording | Skim once, keep a short note, and stop investing there |

Keep an error log that records the deciding constraint you missed, not just the option you chose. Reviewing "I chose the wrong letter" does little. Reviewing "I missed that the action was irreversible, so the approval gate was the deciding constraint" changes future behavior. Revisit logged misses after a delay, because immediate re-reading can create an illusion of mastery.

The matrix also applies to question types. If you consistently miss negatively framed questions despite knowing the content, that is a high-weight weakness in reading, not in architecture. Practice the translation step rather than rereading the same material.

### A pre-answer routine

Use the same short routine on every scenario question:

1. Name the layer the question is testing and write it down.
2. Write the deciding constraint in your own words.
3. Predict the shape of the answer before reading the options.
4. Test each option against the constraint, not against how familiar it sounds.
5. Check for absolute qualifiers, scope shifts, and negative framing.
6. State why the winning option wins and why each other option fails.

Step six is the one most candidates skip. If you cannot finish that sentence, you have not finished the question. It is also the step that makes your study notes useful later, because it records reasoning rather than conclusions.

## Worked scenario

A customer service organization asked for an assistant that reads complaint letters and drafts replies. Letters arrive with unrelated personal details that the reply must not repeat. Drafts are reviewed by a team lead before anything is sent. The mail tool can both prepare and send messages using one service credential. Retrieval draws on a policy library that contains older versions of some policies. The sponsor wants faster turnaround and suggests loading whole letters and policy documents for full context. An architect is asked what to change first.

The worksheet produces a clear picture. The goal is a reviewable reply from a complaint letter. Hard constraints: nothing sent without approval, and no unrelated personal details in the reply. Soft constraints: turnaround speed and draft quality. The failure affordance is an external message going out unseen, or private details leaking. One credential can send, which is broader than the review process allows. The seam that matters runs from the assistant to the mail tool, with a second seam from the policy library into context.

The deciding constraint is the approval requirement at the send seam. Everything else can improve later, but this is the hard constraint closest to the worst harm.

Consider how options would be built. A stronger prompt telling the assistant to wait for review leaves the broad send capability intact: prompt-as-policy and over-privileged access. Loading whole letters and folders is context dumping and worsens stale-policy risk because old and new versions sit side by side. A second pass that polishes the draft skips verification at the send seam. Narrowing the credential to draft-only, requiring an approval token at the send tool, and retrieving only current policy versions with labels satisfies the deciding constraint and several soft constraints.

Language traps can be layered on top. If the stem asks what to change first, an option describing a long-term policy cleanup is a time-scope shift. If an option says the approval token will always prevent unauthorized sends, the absolute qualifier invites a second look, because the control must also be scoped to the correct action.

The architect's answer is not the option that improves the most things. It enforces the hard constraint at the seam where failure becomes an external action. Retrieval hygiene and draft quality come next, and the matrix places them in maintenance rather than emergency work.

> **Exam note:** In a case study, the most vivid detail is often a soft constraint. The deciding constraint is usually quiet: a rule about authority, scope, or irreversibility.

## Common mistakes

- Reading the options before extracting the deciding constraint.
- Treating a familiar phrase as proof that the question is testing a familiar layer.
- Rejecting every option with "must" without checking whether the context justifies it.
- Selecting the most attractive statement in a negatively framed question without translating it.
- Choosing an option that is true but answers a different object or a later step.
- Assuming a fluent, well-formatted answer is a verified answer.
- Spending equal study time on weak high-weight areas and strong low-weight areas.
- Logging wrong letters instead of the constraints that were missed.

## Chapter summary

- Preparation rests on three corners: knowing why a technique exists, seeing it across scenarios, and testing options against constraints.
- Absolute qualifiers, scope shifts, and negative framing are language traps that can defeat a candidate who knows the content.
- Content traps include the wrong layer, skipped verification, over-privileged access, and polished-but-wrong output.
- Extract the deciding constraint by writing the goal, labeling hard and soft constraints, and locating the failure affordance.
- The hard constraint nearest the failure affordance usually decides the answer.
- Weight study time by personal weakness and question weight, and log missed constraints rather than missed letters.
- A pre-answer routine that ends with a rationale for every option makes choices defensible.

## Checkpoint questions

1. An option says that a validation step will always eliminate incorrect output. What is the best response to this option?

A. Accept it, because validation is a recognized safeguard.

B. Reject it, because no validation step can eliminate every error and the absolute claim is unsupported.

C. Accept it only if the output format is structured.

D. Reject it, because validation is unnecessary when a schema is used.

2. A question asks which change an architect should make first to stop a runaway loop. Which option commits a scope shift?

A. Add a step ceiling with an enforced stop condition.

B. Set a maximum number of tool calls per run.

C. Redesign the organization's approval policy for all projects.

D. Record each halt so the team can inspect the stop condition.

3. Which question is negatively framed?

A. Which control best satisfies the stated constraint?

B. Which action should be taken immediately after the failure?

C. Which layer owns the decision described in the scenario?

D. Which proposed change is least likely to reduce the risk?

4. A case requires that no external message be sent without review. The mail tool can send using a broad credential. Which option is a content trap rather than a valid first fix?

A. Restrict the tool to draft-only and add an approval token for sending.

B. Write a stronger prompt telling the assistant to wait for review.

C. Log the reviewer's decision with the draft and the payload.

D. Check that the recipient list matches the case requirements.

5. When extracting the deciding constraint from a case study, which item should carry the most weight?

A. The most detailed technical description in the scenario.

B. The hard constraint closest to the worst plausible harm.

C. The option that mentions the greatest number of best practices.

D. The sponsor's stated preference for speed.

6. A candidate is weak in tool design, which appears frequently, and strong in prompt fundamentals, which appears rarely. How should study time be allocated?

A. Split time evenly to keep every area fresh.

B. Prioritize tool design and give prompt fundamentals only maintenance review.

C. Focus on prompt fundamentals because it is the foundation of all questions.

D. Skip both and work only on full practice papers.

### Answers and rationale

1. Correct answer: B. Validation reduces errors but cannot guarantee their absence, so the absolute qualifier makes the option unsound. Option A accepts a recognized safeguard without testing the sweeping claim attached to it. Option C introduces a condition that does not rescue an unconditional assertion. Option D overcorrects: schemas and validation are complementary, not substitutes, and validation is not unnecessary.

2. Correct answer: C. The stem asks about a first change to a loop, while a redesign of organization-wide policy shifts the object and the level. Option A acts directly on the loop and answers the sequencing request. Option B is another direct bound and remains within scope. Option D supports diagnosis at the same level as the problem and does not change the object.

3. Correct answer: D. The phrase least likely asks for the exception, so the question is negatively framed. Option A asks for the best control, a positive request. Option B asks which action follows a failure, also positive. Option C asks which layer owns a decision, again positive.

4. Correct answer: B. A stronger prompt leaves the broad send capability intact, so the control is advisory and the content trap remains. Option A removes the capability and enforces approval at the tool boundary, addressing the real risk. Option C adds a useful audit record and does not weaken the gate. Option D checks a detail of the payload but does not replace the need for approval.

5. Correct answer: B. The hard constraint nearest the plausible harm is what makes one option right when several look reasonable. Option A mistakes detail volume for importance; long descriptions are often soft constraints. Option C is an option-counting heuristic, not a method of extraction. Option D treats a sponsor preference, usually soft, as if it were a hard constraint.

6. Correct answer: B. The matrix directs weak high-weight areas to intensive work and strong low-weight areas to maintenance. Option A spreads effort evenly and neglects the largest risk. Option C assumes a topic's foundational status outweighs both weakness and question weight. Option D avoids targeted remediation and leaves the weak area unimproved.

---

*End of chapter 26.*
