# Chapter 20 — Redaction, Refusals, and Clarifying Briefs

## Learning objectives

- Apply a repeatable redaction method before pasting text into a tool.
- Decide when a request should be refused outright and when a safe alternative exists.
- Refuse an unsafe data-sharing request while offering a practical alternative.
- Clarify a vague brief with targeted questions before starting work.
- Use the can-versus-should test in routine decisions.
- Explain the ethical themes of fairness, transparency, accountability, and human agency, and know when to escalate and document an incident.

## Key concepts

### A practical redaction method

Redaction is the deliberate removal or masking of identifying details before text is shared. It is a skill because it sits between two mistakes: sharing too much, and stripping so much that the text becomes useless. The goal is to preserve the structure and meaning of the material while removing the parts that could identify a person or expose a secret.

The method has four steps. First, identify direct identifiers. These are the obvious fields: names, account numbers, email addresses, phone numbers, physical addresses, and official identification numbers. Second, remove them from the text. Third, replace each with a neutral token that preserves the role of the value without revealing it, such as a label standing for a customer or a date. Fourth, check the result by reading the text as though you were seeing it for the first time, looking for identifiers that survived in a different form.

The third step is what separates good redaction from simple deletion. If a name is deleted, a sentence may become confusing, and the assistant may fill the gap with an invented value. If the name is replaced with a consistent token, the structure stays intact and the assistant can reason about the role rather than the individual. Consistency matters: the same token should stand for the same entity throughout the passage, so relationships remain readable.

The fourth step catches indirect identifiers. A direct identifier is a name or number; an indirect identifier is a detail that, combined with others, points to a person. A job title combined with a rare location and an exact date can identify someone even without a name. Redaction that removes only the obvious fields can still expose a person through this combination. When a small group is involved, broad bands are safer than precise values.

A second pass is worth the effort because redaction errors are easy to miss when you know what the original said. Reading the cleaned text aloud, or asking a colleague who has not seen the source to review it, catches details that familiarity hides. Automated find-and-replace helps with known patterns but will not recognize a person described indirectly in a narrative comment. Nor does removing a name from the header guarantee that the same name does not appear in a body paragraph. The final check should treat the document as a fresh reader would, scanning every section rather than trusting that the first pass was complete.

| Original element | Neutral replacement | Reason |
|---|---|---|
| A customer name | [CUSTOMER] | Removes direct identification, keeps the role |
| An account number | [ACCOUNT_ID] | Prevents reuse of a sensitive identifier |
| An exact date of birth | [YEAR_ONLY] or an age band | Reduces re-identification risk |
| A street address | [LOCATION] or a region | Keeps geographic context without precision |
| A rare job title plus city | [ROLE] in [REGION] | Breaks an identifying combination |
| A named third party | [PARTY] | Avoids exposing unrelated individuals |

```text
Redaction worksheet:
1. Direct identifiers found: [names / account numbers / emails / phones / addresses / IDs]
2. Replacement tokens used: [CUSTOMER], [ACCOUNT_ID], [DATE], [LOCATION]
3. Indirect combinations to check: [role + location + date], [rare product + city]
4. Removed entirely: [health notes / precise figures for small groups]
5. Final check: re-read as a new reader; any identifiers left? [yes / no]
6. Approval: [role] reviewed the redacted version before use
```

> **Common mistake:** Redacting names but leaving a rare combination of role, location, and date. Indirect identifiers can identify someone just as effectively as a direct one.

### Deciding whether to refuse outright

Not every unsafe request can be rescued with a safe alternative. Refusal outright is appropriate when the core of the request is itself harmful: fabricating evidence, creating deceptive material, impersonating someone, or helping with an action that would violate policy or law. In these cases, offering a modified version does not solve the problem, because the modification would change the request into something the requester did not ask for.

The decision begins by stating the true goal of the request in one sentence. Sometimes the stated goal and the underlying need differ. A stakeholder who asks for "a realistic customer review" may actually need a template for collecting genuine feedback. When the underlying need is legitimate, a safe alternative can be offered. When the underlying need is itself deceptive, the request must be refused.

A second consideration is who would be affected. If the output would mislead a reader, expose a person's information, or remove someone's ability to make an informed choice, the harm is real even when no single rule is broken. This is where principle-level reasoning matters more than a checklist. The exam presents unfamiliar scenarios precisely to test whether the candidate can reason about harm rather than recall a list.

Refusal should be clear and brief. A long lecture is less useful than a short statement of the concern and a concrete next step. The tone matters too: the message should be cooperative, not accusatory. The goal is to keep the work moving in a safe direction, not to shame the requester.

A partial compliance trap appears when a requester accepts a refusal in principle but asks for a slightly softer version of the same harmful thing. A request to invent a testimonial may return as a request for a "typical" customer quote, which is the same deception in different words. The candidate should judge the substance rather than the phrasing. If the revised request still asks the assistant to manufacture something that will be presented as genuine, the answer is still no. Holding the line consistently is easier than negotiating each new variation and clearer for everyone involved.

### Refusing an unsafe request while offering a safe alternative

Many problematic requests have a legitimate core. The most common example in a work setting is a request to paste customer data into a tool for analysis. The underlying need is real, perhaps a summary of complaint themes or a check for recurring issues. The unsafe part is the raw data, which may contain names, contact details, and account identifiers that the tool is not approved to hold.

The right response refuses the unsafe part and offers a path that meets the need. The candidate explains that raw customer records cannot be pasted into the tool, then proposes redacting identifiers, aggregating the content, or using a synthetic sample. If the analysis truly requires the original records, the response points to an approved environment and the appropriate owner. This approach protects the data without abandoning the task.

The alternatives should be concrete enough for the requester to act on. "Use anonymized data" is less helpful than "remove names, account numbers, and contact details, and replace each with a consistent label; then the theme summary can proceed." Concrete guidance reduces the chance that someone tries again with a half-redacted file and assumes it is fine.

| Request | Safe response | Reason |
|---|---|---|
| Paste raw customer emails for a theme summary | Refuse raw paste; offer redacted or aggregated text | Identifiers would enter an unapproved tool |
| Invent testimonials for a landing page | Refuse; offer a template for genuine collection | Fabrication deceives readers |
| Pretend to be a colleague in a message | Refuse; offer a draft in the requester's own voice | Impersonation harms trust and enables fraud |
| Summarize a document with names removed | Proceed after redaction check | Structure survives without identifiers |
| Ask for a decision on a person's benefits | Decline to decide; offer a summary for human review | Accountability must stay with a person |

> **Exam note:** When an option refuses an unsafe action but still helps with the legitimate goal, it is usually the correct answer. An option that refuses without helping, or helps without refusing, is usually incomplete.

### Clarifying a vague brief

A vague brief is a risk in itself. If the goal, audience, format, or constraints are unclear, the assistant will make assumptions, and those assumptions may be wrong. The resulting answer can look polished while answering a different question than the one the stakeholder cared about. Clarification is cheaper than rework, so targeted questions should come before generation.

Targeted questions are specific and few. Instead of asking "what do you need?", ask about the decision the output supports, who will read it, what format would fit the next step, and which constraints matter, such as length, tone, or sources that must be used. Four good questions usually reveal enough to start. More than that can annoy a busy stakeholder and delay work unnecessarily.

A useful technique is to restate what is understood and ask for confirmation. This gives the stakeholder something concrete to correct. It also exposes contradictions early: a request for a "brief but comprehensive" document may actually mean a short executive note with a detailed appendix. Naming the tension lets the stakeholder resolve it before time is spent.

Written confirmation turns clarification into a record. After asking the questions, a short summary of the agreed scope sent back to the stakeholder gives them a chance to correct any misreading before work begins. This is especially useful when several people contributed to the original brief, because it creates a single reference point. If the requirements change later, the written summary shows what was agreed at the time and makes the change explicit. A few sentences of confirmation prevent a long cycle of rebuilding an answer around a moving target.

```text
Clarifying-brief prompt starters:
- What decision will this output support, and who makes that decision?
- Who is the intended reader, and what do they already know?
- What format fits the next step: a table, a list, or a short narrative?
- Which sources must be used, and which are out of bounds?
- Are there fixed constraints on length, tone, or disclosure?
- Is there a deadline or approval step I should plan around?
```

> **Try it:** Take a vague request you have received and rewrite it using the starters above. Notice how many assumptions disappear once the decision, reader, and format are named.

### The can-versus-should test

Capability and judgment are different. The can-versus-should test asks two separate questions. Can the assistant technically do this task, given the tools and data available? Should it, given the sensitivity of the data, the stakes of the decision, the policy in force, and the potential for harm? A positive answer to the first question says nothing about the second.

This test explains many exam items. A model may be able to draft a persuasive message, but should not do so if the message is deceptive. A tool may accept a pasted spreadsheet, but should not hold regulated records. A connector may reach a folder, but should not expose it to people who lack permission. In each case, the technical ability is real and the judgment is negative.

Applying the test consistently prevents a common slide. Once a person sees that something works, it is tempting to treat that as proof that it is acceptable. The test interrupts that slide by making the judgment explicit. If the "should" answer is uncertain, the safe response is to pause and consult the relevant owner rather than proceed on the strength of the "can" answer.

Organizational context can change the "should" answer even when the technical and ethical picture looks fine. A workflow that is acceptable for one team may be prohibited in another because of a stricter policy, a contractual obligation, or a sector rule. The candidate should therefore look for stated constraints in the scenario and give them weight. Past practice is a weak guide here: the fact that something has been done before does not make it correct, and a precedent may simply be an uncorrected mistake that nobody has challenged yet.

### Ethical themes in daily decisions

Four themes recur across responsible-use decisions. Fairness asks whether an output treats people equitably or reflects systematic skew. Transparency asks whether the origin and limits of an output are clear to those who rely on it. Accountability asks whether a person can be identified as responsible for the final decision. Human agency asks whether people retain meaningful control over choices that affect them.

These themes are not abstract decoration. Each maps to a practical check. For fairness, test whether changing irrelevant details changes the answer; if it does, examine the basis. For transparency, state what was generated, what was verified, and what remains uncertain. For accountability, record who reviewed and approved the output. For human agency, ensure that a person, not a tool, makes decisions about individuals and that affected people can understand and respond.

When themes conflict, accountability and human agency usually set the floor. A highly efficient workflow that leaves nobody responsible or removes a person's ability to contest a decision is not acceptable simply because it is fast. The exam rewards answers that preserve a human decision point even when automation would be convenient.

The themes can pull in different directions, and the exam sometimes builds a scenario around that tension. A request might improve efficiency while weakening transparency, or produce a fair-looking average that hides an unfair effect on a small group. In such cases, name the trade-off rather than pretending it does not exist. Explain which theme is compromised, why that matters to the people affected, and what would need to change for the answer to be acceptable. Showing that you see the tension demonstrates better judgment than picking a single rule and applying it mechanically.

### Escalation and incident documentation

Some situations are beyond the candidate's authority to resolve. Suspected data exposure, a request that may violate policy or law, a security concern such as an injection attempt, and any incident involving sensitive or vulnerable people should be escalated to the appropriate owner. Legal, security, privacy, and compliance owners exist for exactly these cases. Escalating is not an admission of failure; it is the correct exercise of judgment.

Escalation should be timely and specific. A useful report states what happened, what data or systems were involved, who was affected, what was done so far, and what decision is needed. Waiting to escalate until the facts are complete can make an incident worse, because containment is time-sensitive. Report what is known and mark what is uncertain.

Documentation completes the response. An incident record should capture the sequence of events, the decisions made, the people or roles consulted, the actions taken to contain the problem, and the follow-up owner. It should be factual and free of blame. Good documentation supports a later review, helps identify a pattern if similar incidents recur, and shows that the organization responded responsibly. It also protects the individuals involved by ensuring that corrective steps are tracked rather than assumed.

Equally important is what not to do after a suspected incident. Do not delete evidence, quietly rewrite the record, or assure stakeholders that the issue is minor before it has been investigated. Preserve what happened, restrict further exposure, and let the designated owner decide how the matter is handled. A calm, factual response protects both the people involved and the organization's ability to learn from the event.

> **Common mistake:** Handling a suspected exposure quietly in the hope that it will not matter. Delayed escalation reduces the chance of containment and removes the record needed for a proper review.

## Worked scenario

A stakeholder sent an analyst a spreadsheet of customer complaints and asked for "a quick summary of what customers are saying, with a few representative quotes for a leadership deck." The file contained names, email addresses, account numbers, and a column of free-text comments. The analyst was about to paste the file into an assistant when the can-versus-should test raised a concern.

The "can" answer was yes: the tool would accept the text and produce a theme summary with quotes. The "should" answer was less comfortable. The data was customer information with direct identifiers, and the tool was not approved for that category. Even the quotes, if copied verbatim, might contain names or distinctive details that could identify a customer. The underlying need, a summary of themes for leadership, was entirely legitimate, so the right move was to refuse the unsafe form and offer a safe path.

The analyst replied that raw customer records could not be pasted into the tool. Instead, the analyst proposed to redact the file first: replace names and account numbers with consistent neutral labels, remove contact details, and scan the free-text comments for identifying details that had been typed into the narrative. Then the assistant could summarize themes using the redacted text, and any illustrative quotes would be paraphrased or checked for re-identification before inclusion.

Before starting, the analyst clarified the brief. The leadership deck needed three themes, a short explanation of each, and no individual-level detail. The reader was an executive audience with no need for case specifics. That answer shaped the redaction: broad bands were sufficient, and precise figures were unnecessary.

During the redaction check, the analyst noticed a comment that combined a rare product, a city, and an exact date. Even without a name, that combination could identify a customer. The analyst generalized the location and removed the exact date. The final summary contained no identifiers, and the executive deck used paraphrased examples. The analyst recorded the decision in the project log, noting the data category, the redaction steps, and the refusal of the raw paste. Because no policy was broken and the exposure risk was contained, formal incident escalation was not required; the log provided the needed record.

> **Exam note:** Notice the order of decisions: judge the request, refuse the unsafe form, clarify the real need, then redact and proceed. Clarification before redaction saves work by defining how much detail is actually needed.

## Common mistakes

- Redacting only obvious identifiers and leaving identifying combinations intact.
- Using inconsistent tokens so the meaning of the remaining text becomes unclear.
- Pasting raw sensitive data because the tool technically accepts it.
- Refusing a request without offering a legitimate path to the underlying goal.
- Starting work before clarifying the decision, audience, and format.
- Assuming that "can" implies "should."
- Delaying escalation of a suspected exposure until every fact is known.
- Documenting an incident vaguely, without recording decisions and owners.

## Chapter summary

- Redact in four steps: identify direct identifiers, remove them, replace with neutral tokens, and check the result for indirect identifiers.
- Refuse outright when the core request is deceptive or harmful, and offer a safe alternative when the underlying need is legitimate.
- A raw customer-data paste should be refused in form while the legitimate analysis need is met through redaction, aggregation, or an approved environment.
- Clarify vague briefs with targeted questions about the decision, reader, format, and constraints before generating.
- Apply the can-versus-should test: technical ability never settles the question of appropriateness.
- Keep fairness, transparency, accountability, and human agency visible in routine decisions.
- Escalate suspected exposures and policy concerns promptly, and document what happened, what was decided, and who owns follow-up.

## Checkpoint questions

1. What are the four steps of the redaction method?

2. Why is a neutral token preferable to deleting an identifier entirely?

   - A. It makes the text shorter.
   - B. It preserves the structure and role of the value without revealing it.
   - C. It hides the fact that redaction occurred.
   - D. It removes the need for a second check.

3. What is an indirect identifier?

4. A stakeholder asks to paste raw customer records into an unapproved tool. What is the best response?

   - A. Paste the records but delete the names only.
   - B. Refuse the raw paste and offer redacted, aggregated, or approved-environment alternatives.
   - C. Refuse all analysis of customer data permanently.
   - D. Proceed because the tool accepts the file.

5. Name two targeted questions for clarifying a vague brief.

6. What does the can-versus-should test separate?

   - A. Speed from cost
   - B. Technical capability from judgment about appropriateness
   - C. Format from tone
   - D. Drafting from editing

7. Which ethical themes should remain visible in routine decisions?

8. What should an incident record include?

### Answers and rationale

1. Identify direct identifiers, remove them, replace them with consistent neutral tokens, and check the result for indirect identifiers.

2. B is correct. A token keeps the passage readable and lets the assistant reason about roles. A is incidental, C is not the goal, and D is false because a final check is still required.

3. It is a detail or combination of details that can point to a person without using a direct identifier, such as a rare role combined with a location and an exact date.

4. B is correct because it protects the data while meeting the legitimate need. A leaves sensitive fields, C abandons a valid task, and D confuses technical ability with permission.

5. Any two of: what decision the output supports, who the reader is, what format fits the next step, which sources are in or out of bounds, and what constraints apply.

6. B is correct. The test distinguishes what is technically possible from what is appropriate. The other options describe unrelated distinctions.

7. Fairness, transparency, accountability, and human agency.

8. It should record the sequence of events, the data or systems involved, who was affected, the decisions made, the roles consulted, the containment actions, and the follow-up owner.

---

*End of chapter 20.*
