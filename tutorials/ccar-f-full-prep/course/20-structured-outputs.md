# Chapter 20 — Structured Outputs and Deterministic Schemas

A language model is, at heart, a text generator. Yet almost every serious system built around one needs something stricter than text: a record that a program can parse, a decision that a database can store, a classification that a downstream service can route. This chapter is about the bridge between fluent prose and dependable data. You will learn how to describe the shape you want, how to make that shape enforceable rather than merely requested, and how to recover gracefully when the model drifts outside it.

The exam treats structured output as a design decision, not a formatting trick. Questions will ask you which consumer is reading the result, how much strictness that consumer needs, and what should happen when validation fails. The ability to defend those choices matters more than memorising any particular schema syntax.

## Learning objectives

- Explain why machine consumers need predictable output shapes and identify what breaks when a model replies in prose.
- Define a schema using field names, data types, required fields, and constrained enumerations.
- Compare strict and flexible schemas and choose between them based on the needs of the downstream consumer.
- Design a validation and repair loop that corrects malformed output without concealing genuine errors.
- Recognise situations where free-form prose is the correct output rather than structured data.
- Read a JSON response shape and connect each field to the use it serves in a workflow.

## Key concepts

### Why machine consumers need structure

When a person reads an answer, flexibility is a virtue; a paragraph can adapt and highlight what matters. When a program reads it, that flexibility is a liability. A program cannot reliably locate a decision in a paragraph whose wording changes between runs. It needs named slots at known positions with predictable types.

Consider a workflow that triages incoming requests. The assistant decides which team should handle each one and how urgently. If it answers in prose, another component must scrape the sentence for a team name and a priority word. That scrape is fragile: a synonym or a changed sentence order breaks it, and the failure is silent because the program may extract the wrong value and act on it confidently.

A structured output replaces the scrape with a contract. The producer agrees to fill specific fields, and the consumer reads only those fields. The contract does not guarantee the values are correct, but it guarantees they are locatable. That distinction is essential. Structure solves the problem of *where* a value lives and *what type* it is; it does not solve the problem of whether the value is true. Correctness still comes from good instructions, good inputs, and verification elsewhere in the system.

> **Exam note:** When a question describes a downstream program that must parse a model result, treat a structured format as the default answer. Prose is rarely the right choice when a machine is the reader.

### Anatomy of a schema

A schema is a description of an allowed data shape. It names each field, declares its type, states whether it is required, and may constrain the values it can hold. Common scalar types include strings, integers, numbers, booleans, and enumerations. Composite types include arrays and nested objects. A well-designed schema is small enough for a model to satisfy and precise enough for a consumer to trust.

There are three layers to keep straight when you design one. The *semantic layer* is what the field means in the business or technical domain. The *type layer* is the machine representation chosen for that meaning. The *constraint layer* is the set of rules limiting what values are acceptable. Confusing these layers produces schemas that are either ambiguous or impossible to satisfy.

For example, a field named `priority` in a triage system has a clear semantic meaning. Its type might be a string drawn from a fixed set rather than a free integer, because the downstream router expects labels, not numbers. Its constraint layer lists the allowed labels: `low`, `normal`, `high`, `critical`. Each layer answers a different question, and a reviewer should be able to inspect them independently.

A schema also carries a quiet design cost. Every field you add is a promise the model must keep on every call. Fields that no consumer reads are pure overhead and a source of avoidable errors. Before adding a field, ask which component will read it and what it will do with the value. If nobody can answer, the field should not exist.

### Enums, required fields, and constraints

Enumerations, usually called enums, are lists of permitted values for a field. They are the single most useful tool for turning a fuzzy judgement into a routable decision. Instead of asking for "the urgency" and hoping for a consistent word, you offer a closed set and require the model to choose one. Enums reduce the vocabulary the model must invent, which reduces variation and makes the output testable.

Required fields are those a consumer cannot do without. Marking a field required tells the producer and the validator that a missing value is a failure, not an acceptable omission. Optional fields are appropriate when the information may genuinely not exist, such as an `escalation_reason` that only applies when a case is escalated. The key discipline is to align requiredness with the consumer's logic: if a downstream branch reads a field unconditionally, that field is required.

Constraints go beyond type and presence. A numeric score may need to fall within a range, a list within a length bound, or a string within a fixed pattern. Each constraint removes a class of invalid outputs. The art is to constrain only what matters, because excessive constraints can push the model into contradictions when the input lacks enough information to satisfy them honestly.

> **Common mistake:** Adding an enum value such as `unknown` to every field defeats the purpose of the enum. If most results are `unknown`, the field carries little information. Use an explicit unknown value only when genuine uncertainty is expected, and pair it with a rule about when to choose it.

### Strictness versus flexibility

Not every structured output needs the same degree of rigidity. A strict schema rejects anything outside the declared shape: no extra fields, no missing required fields, no values outside the enums. A flexible schema tolerates additions and omissions, accepting a superset of the required fields. The right choice depends on how the consumer handles surprises.

A consumer that maps fields directly into a typed database record benefits from strictness. An unexpected field or a wrong type is a genuine problem, and failing fast is healthier than storing a corrupted record. A consumer that displays a summary to a person can tolerate flexibility, because a human reading an extra field is not harmed. Strictness is a form of contract enforcement, and like any contract it is most valuable where the cost of a broken assumption is high.

Strictness also affects reliability. Dense schemas with nested fields and tight constraints are harder to satisfy on unusual inputs, so validation rejects more outputs and repair loops raise latency and cost. A slightly looser schema with a good validator can behave better than a brittle strict one. A useful heuristic is to be strict at system boundaries and flexible in exploratory steps.

| Decision factor | Favour a strict schema | Favour a flexible schema |
| --- | --- | --- |
| Primary reader | A program or database | A person or exploratory step |
| Cost of a bad value | High, with side effects | Low, easily noticed |
| Field stability | Well understood and fixed | Still evolving during design |
| Input predictability | Consistent and complete | Noisy or incomplete |
| Retry budget | Generous enough for repair | Tight, favour first-pass success |
| Validation | Automated and authoritative | Human review or loose checks |

Notice that the table frames strictness as a spectrum rather than a virtue. A candidate who argues that stricter is always better has missed the engineering trade-off. The exam rewards matching the mechanism to the consumer and the failure cost.

### Validation and repair loops

Even with a clear schema, models occasionally return malformed data. A string appears where a number was expected. A required field is missing. A value falls outside the enum. A validation loop is the component that checks output against the schema before it reaches the consumer, and a repair loop is the component that asks the model to try again with feedback about what failed.

A well-designed loop has three properties. First, the validator reports *specific* errors, naming the field and the rule that was violated. A generic "invalid output" message gives the repair step nothing to work with. Second, the number of retries is bounded. An unbounded repair loop can spin indefinitely on an input the model cannot handle, consuming budget without progress. Third, after the budget is exhausted, the failure is surfaced rather than silently patched. Quietly substituting a default value may keep the pipeline moving, but it hides a real problem from the people responsible for it.

Repair prompts should include the original task, the rejected output, and the validation errors, asking for a corrected record. Resending only the error message loses context and often produces a correction that is wrong in a different way. Lowering randomness for the repair attempt can help, because the goal is conformance rather than creativity.

> **Try it:** Take a schema with three fields, one of them an enum. Feed it an input that lacks enough information to choose an enum value confidently. Observe whether the model invents a value, chooses an `unknown` option, or refuses. Each outcome suggests a different design change.

### When prose is the right output

Structured output is powerful but not universal. Some deliverables are inherently narrative: an explanation, a recommendation with reasoning, a draft of a document, or an answer whose value lies in its nuance. Forcing these into a rigid schema strips away exactly what makes them useful. A field called `summary` containing a single paragraph is usually a sign that prose was needed and a schema was added for appearances.

Prose fits when the reader is a person, the reasoning is part of the deliverable, or acceptable answers cannot be enumerated. It also fits early exploration, before you know which fields matter. A common pattern is prose for reasoning plus a small structured block for the final decision, giving both explanation and machine-readable output without pretending the explanation is data.

The decision is really about the consumer again. If a program must act, give it structure. If a person must understand, give them prose, perhaps accompanied by a structured appendix. A question that asks you to choose between them will usually describe the reader clearly enough to decide.

### A worked response shape

The following response shape illustrates several of the ideas above. It describes a decision record for an incoming request, with a required classification, a bounded priority enum, an optional reason, and a confidence field constrained to a range. Notice that no field exists without a reader.

```text
{
  "request_id": "string, required, stable identifier from the caller",
  "category": "enum: billing | technical | account | other",
  "priority": "enum: low | normal | high | critical",
  "confidence": "number between 0 and 1, required",
  "escalate": "boolean, required, true only when human review is needed",
  "escalation_reason": "string, optional, required when escalate is true",
  "evidence": "array of at most five short strings quoting source text"
}
```

This shape maps cleanly onto a formal definition. `request_id` is copied from the caller rather than invented. `category` and `priority` are routing enums. `confidence` has an explicit range, preventing values like `95` when a fraction is expected. `escalate` is required unconditionally because the router branches on it. `escalation_reason` is conditional, a rule the validator enforces beyond type checking. `evidence` is bounded to discourage large excerpts.

Conditional requirements are worth noting because they illustrate the limits of a basic schema. A plain type declaration cannot express "required when another field is true"; that rule belongs in application validation. Good design places each rule at the layer best able to enforce it: types and enums in the schema, cross-field rules in the validator, and judgements about correctness in review.

## Worked scenario

A compliance team wants an assistant to classify contract clauses in a batch of documents for a register that tracks legal review. The first prototype asks for the clause type and review need in prose, and a script searches for keywords. Testing reveals misreads: one answer uses a synonym the script misses, another lists two types in one sentence. The register fills with inconsistent entries and reviewers lose trust.

An architect is asked to fix the problem. She begins by listing the consumers. The register needs a clause type, a review flag, and a short justification that a lawyer will read. A reporting job needs a risk tier. No other component reads the output. She therefore designs a compact record with exactly four fields: `clause_type` drawn from a fixed enum, `needs_review` as a boolean, `risk_tier` drawn from three ordered labels, and `justification` as a bounded string. She drops a proposed `notes` field because nothing consumes it.

She then adds validation rules. The schema checks types and enums. A validator checks that `needs_review` is true whenever `risk_tier` is `high`, because the register's policy requires review for high-risk clauses. When validation fails, a repair step resends the clause text, the rejected record, and the specific error, asking for a corrected record. Retries are capped, and a fourth failure writes the item to a quarantine list for human handling instead of guessing.

The improvement is not that the model became smarter; the interface between model and consumer became explicit. The keyword scrape disappeared, so wording no longer mattered. Fewer fields meant fewer promises to keep. Conditional rules moved into a layer that could enforce them, and failures became visible instead of silently corrupting the register. When the enum later gains a new clause type, one definition changes and the validator catches items still using the old vocabulary.

> **Exam note:** A scenario about inconsistent downstream parsing is usually testing structured output, not prompt wording. Rewriting the instruction to "be more consistent" is a weaker answer than introducing an enforceable contract.

## Common mistakes

- Asking for a structured format in the prompt but never validating it, then assuming conformance because most responses look correct.
- Designing fields for hypothetical future consumers instead of the components that read the output today.
- Using free strings where an enum would constrain the value and make routing deterministic.
- Treating a schema as a guarantee of correctness, when it only guarantees shape and type.
- Building an unbounded repair loop that retries indefinitely on inputs the model cannot handle.
- Silently substituting defaults on validation failure, which hides problems and erodes trust in the system.
- Forcing a rich explanation into a single prose field inside an otherwise rigid record, blurring the line between data and narrative.
- Omitting cross-field rules from the validator and expecting the schema alone to enforce conditional requirements.

## Chapter summary

- Structured output turns a fluent answer into a locatable, typed record that a program can consume reliably.
- A schema defines field names, types, requiredness, and constraints; each decision should be tied to a real reader.
- Enums reduce vocabulary drift and make decisions routable, while conditional rules belong in validation rather than the basic type declaration.
- Strict schemas fit stable, high-stakes boundaries; flexible schemas fit exploration and human readers.
- Validation should report specific errors, bound retries, and surface persistent failures instead of hiding them.
- Prose remains the right choice when the reader is a person or the reasoning is part of the deliverable; combining prose reasoning with a compact decision record often works best.

## Checkpoint questions

1. A workflow sends a model's result directly into a typed database column. The result currently arrives as prose. What is the strongest reason to introduce a structured schema?

A. Prose is always longer and therefore more expensive to generate.
B. A program needs named fields at predictable positions and known types to store the value safely.
C. A schema guarantees that the model's judgement is correct.
D. Databases cannot store plain text under any circumstances.

2. Which pair of fields is best expressed with enums rather than free strings?

A. A free-text summary and a justification paragraph.
B. A document identifier and a timestamp.
C. A routing category and a priority level drawn from a fixed set of labels.
D. A confidence score and a word count.

3. A schema declares `escalation_reason` as a string but does not say when it is needed. The business rule is that it must be present whenever `escalate` is true. Where should this rule be enforced?

A. In the schema's string type declaration alone.
B. In application validation that checks the relationship between fields.
C. By asking the model to remember the rule and hope it complies.
D. By removing the field entirely to avoid complexity.

4. Which situation most strongly favours a flexible schema over a strict one?

A. The output feeds a payment execution service with severe side effects.
B. The output is stored in a rigid relational schema with no optional columns.
C. The output is read by an engineer exploring a new problem where the fields are still changing.
D. The output must be parsed by a downstream service that rejects unknown fields.

5. After a validation failure, what should a well-designed repair loop do?

A. Retry without limit until the output happens to validate.
B. Replace the invalid field with a default value and continue silently.
C. Resend the task, the rejected output, and the specific validation error, with a bounded retry budget.
D. Discard the schema and accept the malformed output.

6. A reviewer proposes forcing a nuanced legal recommendation into a record with ten short fields. What is the most likely problem with this design?

A. Structured records cannot contain boolean values.
B. The reasoning is part of the deliverable, so compression into rigid fields strips away what makes the answer useful.
C. Models are incapable of producing more than five fields.
D. Enums cannot be used in legal domains.

### Answers and rationale

1. **B** is correct because the defining benefit of structure is a predictable contract between producer and consumer; a typed store needs named fields with known types. **A** is wrong because length is not the core issue and prose is not always longer. **C** is wrong because a schema enforces shape, not truth. **D** is wrong because databases can store text; the problem is reliable extraction, not storage capability.

2. **C** is correct because a routing category and a fixed set of priority labels are exactly the kind of closed vocabulary enums constrain. **A** is wrong because summaries and justifications are narrative and benefit from free text. **B** is wrong because identifiers and timestamps are typed values, not choices from a set. **D** is wrong because a score and a count are numeric values where ranges, not enums, are the right constraint.

3. **B** is correct because cross-field conditions are application rules that a basic type declaration cannot express. **A** is wrong because a string type says nothing about presence conditions. **C** is wrong because relying on the model to remember a rule is exactly what validation exists to replace. **D** is wrong because removing a needed field loses information the business rule requires.

4. **C** is correct because exploration with evolving fields tolerates additions and changes, making flexibility useful. **A** is wrong because severe side effects call for strict validation. **B** is wrong because a rigid store rejects unexpected shapes. **D** is wrong because a service that rejects unknown fields demands strictness.

5. **C** is correct because specific feedback with a bounded budget gives the model a fair chance to correct itself without risking an endless loop. **A** is wrong because unbounded retries waste budget and may never succeed. **B** is wrong because silent defaults hide real failures. **D** is wrong because accepting malformed output defeats the purpose of the contract.

6. **B** is correct because when reasoning is the value of the deliverable, rigid compression destroys it. **A** is wrong because booleans are perfectly valid in structured records. **C** is wrong because there is no such fixed limit on field count. **D** is wrong because enums are domain-neutral and can be used in legal contexts.

---

*End of chapter 20.*
