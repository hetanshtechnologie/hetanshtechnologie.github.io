# Chapter 8 — Structured Tool Use and Output Boundaries

## Learning objectives

- Explain why tools need machine-readable input and result contracts.
- Identify the fields that make a tool result useful to the next loop decision.
- Bound the amount of tool output that re-enters the working context.
- Decide when a raw result and when a distilled view is appropriate.
- Recognize the side effects of context bloat on accuracy, cost, and traceability.
- Design a result filter that preserves provenance while reducing volume.

## Key concepts

### Why tools need machine-readable contracts

A tool is a capability the assistant can invoke, but the model cannot inspect a system the way an engineer can. It sees a description and a contract. The description says when to use the capability; the contract says what arguments it accepts and what it will return. If either is vague, the model has to guess, and a guess at an interface boundary becomes an invalid call or a misinterpreted result.

Machine-readable contracts solve three problems at once. They give the model a precise target for its arguments, so field names and types are not invented. They give the runtime a basis for validation, so a malformed call can be rejected before it reaches a backend system. And they give the loop a predictable result shape, so the observation stage can extract status and provenance without parsing prose. A tool whose result is an unstructured paragraph may be readable by a person, but it is fragile inside an automated loop.

A contract is also a form of governance. By declaring which fields are required and which values are permitted, the designer limits the space of possible calls. An enum for a "decision" argument is stronger than a free-text instruction to "return one of the usual options." Constraints such as date ranges, maximum page sizes, and allowed identifiers are not incidental details; they are the boundaries within which the tool is safe to use.

Consider a lookup capability described only as "find relevant documents." The model must guess whether relevance means topic, date, or source, whether one result or many are returned, and whether a miss counts as an error. A typed contract removes those guesses by declaring a query string, an optional time window, and a maximum count, then returning an object with an explicit status. The same call made by two different components then means the same thing, which makes traces comparable and tests repeatable. Contracts also enable composition: one tool's result can become another tool's input only when both sides agree on field names and types.

### Structuring inputs

Input design starts with the question of what the tool genuinely needs. Every required field adds a burden to the model and an opportunity for error, so fields should be necessary, clearly named, and typed. Plain language descriptions help, but the type system does the enforcing. A date field should carry a date-like format rather than a note saying "use a date." A count should have a numeric type and an upper bound rather than a request for "a sensible number."

| Input element | Purpose | Weak version | Stronger version |
| --- | --- | --- | --- |
| Field name | Tells the model what to supply | `info` | `policy_area` |
| Type | Constrains the value shape | Free text | Enumerated string or integer |
| Requiredness | States what must be present | All fields optional | Required query, optional filters |
| Constraints | Prevents unsafe calls | No bounds | Maximum result count, valid date window |
| Description | Explains intent and examples | "Search term" | "Area of the policy library to search" |

```text
tool: search_policy
purpose: Find current clauses in the policy library for a named topic.
input:
  topic: string, required, one of [refund, cancellation, documentation, billing]
  effective_after: date, optional, defaults to start of current policy year
  limit: integer, optional, 1..10, defaults to 5
result:
  status: ok | no_match | retryable_error | terminal_error
  items: array of {clause_id, text, effective_date, source_id}
  total_matches: integer
  truncated: boolean
```

Notice that the contract says what a miss means. Without the `no_match` status, the model might treat an empty list as a system failure and retry indefinitely. With it, an empty list becomes a decision point: the loop can broaden the query or ask a reviewer.

Descriptions are routing instructions as much as documentation. If two tools both search something, the model chooses between them by reading their descriptions. Ambiguous wording leads to the wrong tool being called with reasonable-looking arguments. Names should also be distinct enough that a reviewer can tell the capabilities apart in a trace.

Validation belongs at the boundary. When a call arrives, the runtime checks it against the contract and returns a specific error if a field is missing or out of range. That error should be written for the model: it should name the field and suggest a correction. A generic failure message forces the loop to guess again, which wastes cycles and may trigger repeated invalid calls.

### Structuring results

A result is not merely data; it is the next decision's evidence. A useful result contract separates status from payload. Status distinguishes a successful lookup from a retryable problem such as a temporary timeout and a terminal problem such as a forbidden record. Payload carries the substantive content, and provenance records where it came from and when it was current. Without these distinctions, the model may treat an error message as a fact or cite a retired document as current.

Results should also say whether they are complete. A search that returns a capped set of matches must indicate that more exist; otherwise the loop may conclude that it has seen everything. Likewise, a result that has been shortened for context should carry a truncation flag so the model can decide whether to request a narrower query. Silence about limits is a common source of confident but incomplete conclusions.

Partial success needs its own vocabulary. A batch operation may update several records and fail on another; reporting only "failure" hides completed work and invites a retry that duplicates it. A result should say which items succeeded, which did not, and whether a safe retry is possible. This is the same idempotency concern that appears at the act stage of the loop, viewed from the result side.

> **Exam note:** A result field that names a clear next action, such as "no matches in the current index; try the archive," is often more valuable than extra payload. It turns a dead end into a decision.

### Bounding what re-enters the context

The working context is a single finite area shared by instructions, history, documents, tool results, and the response under construction. Tool output is often the largest and fastest-growing part of that area. A single broad search can return more text than the entire rest of the session. When that output is placed verbatim into the next perception, it crowds out the goal, pushes early instructions out of view, and makes the model's task harder.

Bounding can happen at two points. The tool itself can limit its output by returning only the highest-ranked matches, a fixed number of fields, and a count of what was omitted. This is the most efficient point because the excess never enters the session. The observe stage can then apply a second filter, removing duplicates, dropping low-value passages, and compressing what remains into a short structure with sources attached. Good designs do both, because a tool written by another team may not be as disciplined as your own loop.

The risk is not only running out of room. Large volumes of text dilute attention. Relevant clauses sit among irrelevant ones, and the model may weight the most recent or most verbose passage rather than the most authoritative. Cost and latency rise with every extra token, and traces become harder for a reviewer to read. Traceability suffers because the loop's reasoning is spread across material that no human wants to inspect.

The two bounding points serve different purposes. Tool-side limits reduce cost for every caller and keep backend responses predictable. Observe-side filters adapt to the current goal: a passage that is vital for one question is noise for another. A filter that is too aggressive can discard the one clause that decides the case, so it should preserve counts and offer a narrower follow-up rather than silently dropping evidence. Testing a filter means checking both what it keeps and what it removes.

### Raw results versus distilled views

Distillation means reducing a result to the portion that supports the next decision while retaining enough detail to verify it. It is not the same as paraphrasing away evidence. A distilled view should keep identifiers, dates, and status flags even when it drops prose. The question is not whether the raw data is valuable in some abstract sense, but whether this loop at this moment needs it in the working area.

| Dimension | Raw result | Distilled view | When to choose each |
| --- | --- | --- | --- |
| Fidelity | Complete original content | Selected fields with sources | Raw for audit or deep reading; distilled for loop decisions |
| Context cost | High and unpredictable | Bounded and predictable | Distilled when the budget is tight |
| Reasoning quality | Relevant facts may be buried | Relevant facts are foregrounded | Distilled for most next-step choices |
| Verification | Possible but laborious | Fast through retained identifiers | Distilled for review; raw when source text is disputed |
| Risk | Duplicates and stale items slip in | Filter must avoid dropping key evidence | Raw when the filter is untrusted; distilled when it is tested |
| Traceability | Strong if identifiers exist | Strong only if identifiers are preserved | Both require provenance |

A useful rule is to return raw data to the caller outside the loop and distilled data inside it. If a downstream system needs the full record, hand it off separately with a reference. The model needs a compact decision surface, not the entire archive. When the distilled view omits something important, the truncation flag and the count tell the loop that a narrower follow-up is available.

> **Exam note:** Be skeptical of an option that proposes fixing verbose output by enlarging the working context. More capacity postpones the problem; a bounded result contract removes it.

### A result filter

The `text` block below sketches a filter that runs in the observe stage. It keeps the contract fields intact, ranks content, removes duplicates, and caps the payload.

```text
filter_result(raw, query, budget, previous_fingerprint):
    compact = {
        status: raw.status,
        source: raw.source,
        fetched_at: raw.fetched_at,
        total_matches: raw.total_matches
    }

    if raw.status != "ok":
        compact.next_action = suggested_recovery(raw.error)
        return compact

    candidates = rank(raw.items, by=[relevance(query), current_status, authority])
    seen = empty_set()
    kept = empty_list()

    for item in candidates:
        key = normalize(item.source_id, item.version)
        if key in seen:
            continue
        if item.effective_date is expired:
            continue
        kept.append(shorten(item, fields=["title", "clause", "source_id", "date"]))
        seen.add(key)
        if cost(kept) >= budget:
            break

    compact.items = kept
    compact.returned = length(kept)
    compact.truncated = length(kept) < raw.total_matches
    compact.changed = fingerprint(kept) != previous_fingerprint
    return compact
```

Every field in the compact object has a job. Status and source support verification; counts and truncation flags support honest reasoning about coverage; the changed flag supports stuck detection in the loop. The filter does not decide what the answer is. It decides what evidence the model gets to consider.

> **Common mistake:** Summarizing away identifiers and dates to save space. A short passage without provenance is harder to verify than a longer one with it, and it invites unsupported citations.

## Worked scenario

A compliance assistant helps reviewers answer questions about travel refunds using an internal policy library. A reviewer asks whether documentation is required for a partly used ticket. The assistant calls a search tool with a broad query and receives a result containing hundreds of passages: several copies of the same clause from different folders, older versions with superseded wording, a few passages about hotel bookings, and the two current clauses that actually answer the question.

If the raw result is inserted into the working view, three things happen. The current clauses are surrounded by noise, so the model may quote an outdated version. The transcript grows enough that the goal statement and the permission rules drift toward the edge of the working area. Because the result includes a generic success status with no indication that duplicates were removed, the loop believes it has seen the complete library and repeats the same broad search on the next cycle when it fails to find a clean answer.

The designed path is different. The tool returns status, source collection, a total match count, and a capped set of ranked passages. The observe stage then applies the filter: it drops retired versions, collapses duplicates by source identifier and version, removes passages outside the travel policy area, and keeps the two current clauses with their identifiers and effective dates. The compact result states that three hundred matches were found, four were retained, and the view is truncated.

| Aspect | Raw result entering context | Distilled view entering context |
| --- | --- | --- |
| Size | Hundreds of passages | Four short clauses plus metadata |
| Condition | Mixed current, retired, duplicated | Current, deduplicated, in-scope |
| Provenance | Buried in varied formats | Source identifier and date per clause |
| Next decision | Repeat broad search | Draft answer with citations, or narrow query |
| Reviewer effort | Read the whole transcript | Check four cited clauses |

With the distilled view, the loop reasons that the current clauses are sufficient, drafts an answer that names the documentation requirement, and cites both sources. It also notes that a broader set was available, so the reviewer knows the answer is based on a filtered subset. The reviewer can request the full result separately if the clause wording is disputed.

The loop also gains a progress signal from the filter's changed flag. If a narrower query returns the same clauses on the following cycle, the loop records that no new information was obtained and hands off rather than searching again. Bounding the result makes repetition visible. Nothing about the underlying policy changed; only the boundary around tool output changed the quality of the decision.

> **Try it:** Take a verbose tool result from a project you know and list the fields needed for the next decision. Keep status, provenance, coverage, and the top-ranked content. Everything else is a candidate for the filter.

## Common mistakes

- Exposing tools with free-form inputs and relying on the model to behave consistently.
- Returning prose-only results that the loop must parse heuristically.
- Treating a truncated result as if it were the complete set.
- Summarizing evidence without preserving source identifiers or dates.
- Placing entire tool outputs into the working context because the data might be useful later.
- Assuming that a larger context improves accuracy rather than diluting attention.
- Forgetting to distinguish retryable failures from terminal ones in the result contract.

## Chapter summary

- Machine-readable contracts make tool calls validatable and tool results predictable.
- Inputs should be typed, constrained, and described with routing intent.
- Results should separate status, payload, provenance, completeness, and recovery hints.
- Tool output can be bounded at the tool boundary and again in the observe stage.
- Distilled views suit in-loop decisions; raw data suits audits and separate handoffs.
- Context bloat reduces accuracy, raises cost, and weakens traceability.

## Checkpoint questions

1. What is the main reason to give a tool a typed input schema?

- A. It makes the tool description longer.
- B. It constrains calls so the model supplies valid, safe arguments.
- C. It removes the need to test the tool.
- D. It guarantees the model will choose that tool.

2. Which set of fields best supports a tool result used by a loop?

- A. A paragraph, a title, and a timestamp
- B. Status, payload, provenance, and a truncation flag
- C. A colour, an owner, and a priority label
- D. Only the raw text returned by the backend

3. A search returns a capped number of matches out of a much larger set. What must the result state?

- A. That the tool succeeded, without qualification
- B. That the result is complete
- C. That more matches exist and the view is truncated
- D. That the model should stop searching

4. Where is the most efficient point to prevent excessive tool output from entering a session?

- A. In the tool's own output design, before it enters context
- B. In the final answer only
- C. In the model's mood at the time of the call
- D. In the user's permission set

5. Which distilled-view choice best preserves traceability?

- A. Removing all metadata to shorten the passage
- B. Keeping source identifiers and effective dates
- C. Replacing citations with a general summary
- D. Keeping only the first match found

6. What is a likely consequence of inserting a very large raw result into the working context?

- A. Instructions and goals receive less effective attention.
- B. The model automatically ignores all earlier history.
- C. Tool contracts become unnecessary.
- D. The loop gains a reliable progress signal.

7. When is returning the raw data most appropriate?

- A. When an audit or separate downstream consumer needs full fidelity
- B. When the context budget is nearly exhausted
- C. When the loop needs a quick next-step decision
- D. When the result contains duplicates and retired versions

### Answers and rationale

1. Correct: B. A schema constrains the shape and values of arguments so calls can be validated. A is incorrect because length is not a goal. C is incorrect because testing remains necessary. D is incorrect because a schema does not force tool selection.

2. Correct: B. Status, payload, provenance, and completeness information give the loop evidence it can act on and verify. A is incorrect because a paragraph is hard to parse reliably. C is incorrect because those fields do not describe the result. D is incorrect because raw text alone lacks structure.

3. Correct: C. Honest reporting of coverage prevents the loop from treating a subset as the whole. A is incorrect because an unqualified success claim hides the limit. B is incorrect because it is false. D is incorrect because the loop may need a narrower follow-up rather than stopping.

4. Correct: A. Limiting output at the source avoids putting excess text into the session at all. B is incorrect because damage to reasoning happens before the final answer. C is incorrect because mood is not a control. D is incorrect because permissions govern authority, not volume.

5. Correct: B. Identifiers and dates let a reviewer verify the distilled claim against its source. A is incorrect because removing metadata destroys traceability. C is incorrect because general summaries cannot be checked. D is incorrect because the first match may be irrelevant.

6. Correct: A. Large results crowd the working area and dilute attention to instructions and goals. B is incorrect because earlier history is not automatically ignored. C is incorrect because contracts remain essential. D is incorrect because volume alone provides no progress signal.

7. Correct: A. Full fidelity matters when an audit or downstream system needs the original content. B is incorrect because raw data worsens a tight budget. C is incorrect because loops benefit from distilled views. D is incorrect because duplicates and stale items argue for filtering.

---

*End of chapter 8.*
