# Chapter 8 — Shaping Format, Tone, and Length

An answer can be correct and still unusable. If the format does not fit the next step, a reader must rebuild the work, and rebuilding invites new errors. This chapter treats format, tone, and length as design choices that should be stated in the instruction and checked afterwards. It also warns about a specific trap: mistaking a polished presentation for evidence that the facts are right.

## Learning objectives

- State output structure explicitly rather than assuming the assistant will infer it.
- Match a format to the action the reader will take next.
- Specify schemas and field names when output must be imported or reused.
- Control length with numbers or bounds instead of vague words.
- Adjust tone and register while preserving the meaning of the content.
- Request versions with and without jargon for different audiences.
- Decide when to use response controls and when to restate format in the prompt.
- Recognise that a polished answer can still be factually wrong.

## Key concepts

### Why structure must be stated

An assistant does not know what the reader will do with an answer unless the prompt says so. Left unspecified, it will choose a default shape, often a friendly block of prose with a few emphasised phrases. That default may be pleasant to read and completely unsuitable for the task. A structure stated in the prompt removes the guesswork.

Stating structure means naming the parts of the answer and their order. Asking for a one-sentence conclusion, then three supporting points as bullets, then a caveat at the end, is a structure. It can be checked at a glance. A reviewer can confirm that each part is present without reading closely, which is exactly what makes structured output useful in a busy workflow.

Structure also affects how the assistant allocates effort. When the prompt asks for a table with named columns, the assistant must decide what belongs in each column, which forces a more disciplined treatment of the material. When the prompt asks for prose, the assistant can hide thin content behind smooth sentences. This is not to say prose is inferior; narrative has its place. It is to say that format is a tool for enforcing completeness, not just a way of presenting the result.

The candidate should treat format as part of the instruction, not as a finishing touch. If an answer is hard to scan, the fault often lies in the request, not in the assistant's writing ability. A stated structure also makes delegation easier. A colleague asked to check a three-part answer knows exactly what to look for, whereas a colleague handed an unstructured block must first work out what the answer was trying to do. In a workflow where several people handle the same output, that shared expectation saves more time than any stylistic improvement. Structure is therefore a coordination device as much as a presentation choice.

> **Exam note:** A question that asks how to make an output usable for a specific next step is usually asking for an explicit format instruction, not a different model.

### Matching format to the next step

The right format is the one that makes the reader's next action easy. Different actions favour different shapes.

Scanning favours a table. When a reader needs to compare several items across several attributes, a table puts the comparison in one place. A list would force the reader to hold earlier items in memory. A table is the right choice for comparisons, status updates, and any summary where the same fields repeat.

Action favours bullets. When each item is a task someone must perform, a list is easier to work through and mark off. Bullets also suit short, independent points that do not need a relationship to one another. A paragraph of instructions is harder to follow when acting.

Narrative favours prose. When the goal is to explain a chain of events, build an argument, or convey context that depends on order, connected sentences are better. Breaking a story into fragments can destroy the logic that holds it together.

Import favours structured data. When the output must be read by another system, a schema with named fields and a consistent delimiter is required. Prose is useless here no matter how clear it reads. The format is determined by the receiving system, not by human taste.

Choosing wrongly creates rework. A table handed to someone who must act on each row will be copied into a list. A list handed to a system that expects fields will fail to parse. The user should decide the next step first and let that decide the format.

| Next action | Recommended format | Reason |
| --- | --- | --- |
| Compare several items on the same fields | Table | Repeated fields align for scanning |
| Carry out a set of tasks | Bulleted list | Items can be read and completed independently |
| Follow an argument or sequence | Prose | Order and connection carry meaning |
| Feed another tool or system | Structured data with named fields | Machines require predictable structure |

The audience table below adds a second lens. It connects the reader's role to what should be emphasised and which format usually serves that emphasis. These are defaults, not fixed rules.

| Audience | Emphasis | Recommended format |
| --- | --- | --- |
| Senior decision makers | Conclusion, risk, and the choice required | One-page document with a short table |
| Peer specialists | Method, evidence, and exceptions | Prose with a supporting evidence table |
| Frontline staff | Exact actions and timing | Numbered steps or a checklist |
| External readers | Plain meaning and minimal internal detail | Short prose with a brief summary box |
| A downstream system | Complete, consistent fields | Structured data with fixed key names |

### Schemas and field names

When output will be reused, a plain instruction like give me the data is not enough. A schema declares the fields, their names, their types, and any rules about allowed values. A request for a list of risks might specify fields named item, severity, evidence, and owner, with severity limited to a small set of labels and evidence required as a short quotation.

Specifying field names matters because downstream steps depend on them. If one output uses risk_level and the next uses severity, a script or a template may break. Consistency across repeated runs is a reason to fix names once and reuse them. The same logic applies to date formats, currency notation, and units. A mixed set of formats makes comparison unreliable.

A schema should also say what to do when a field cannot be filled. Writing not stated if the source does not give a value prevents the assistant from inventing a plausible entry. This is a small instruction with a large effect on trust. It converts a gap into visible information rather than a hidden fabrication.

A schema should also settle units and ordering. A column labelled amount is ambiguous until the instruction says whether the figure is in whole currency units or thousands, and whether a date is written as a full date or a short label. These details look trivial, but they are exactly what a receiving template or script cannot infer. Stating them once avoids a round of silent corrections later, and it makes repeated outputs comparable rather than merely similar.

Schemas need not be complicated. For a human reader, a table with fixed column headings is a simple schema. For a machine, a structured block with explicit keys is better. The candidate should recognise that the level of formality follows the consumer: the more automated the next step, the stricter the schema.

> **Common mistake:** Asking for structured output without saying how missing values should be handled, then discovering that the assistant filled gaps with invented entries.

### Controlling length with bounds

Words like short, brief, and concise are unreliable because they mean different things to different readers and to the assistant. A bound is checkable. No more than a fixed number of words, exactly a set number of bullets, or a given number of sentences per section can be verified without interpretation.

Bounds should be chosen to fit the purpose. A bound that is too tight forces the assistant to drop qualifiers, and a dropped qualifier can change the meaning of a claim. If an answer must preserve caveats, the bound should leave room for them. A useful pattern is to give both a target and a rule for what may be cut: aim for a set length, and if you must trim, shorten examples before removing caveats.

It is worth distinguishing length from completeness. A short answer can be complete if the task is small. A long answer can be incomplete if it repeats itself and omits a required part. The candidate should focus on whether every requested element is present, not on volume. When a scenario complains that an answer is too long, the best fix is usually a bound plus a prioritisation rule, not a vague request to tighten it up.

When a bound is introduced late, it is tempting to ask for a shorter version of an existing answer. That works only if the instruction also says what to preserve. Without a priority rule, the assistant tends to cut the sentences that looked least essential, which are often the caveats. A better approach is to restate the bound in the original request, name what may be trimmed, and ask for a fresh answer. The reviewer then checks both the length and the survival of the required parts.

Bounds also help with consistency across repeated outputs. A note capped at a fixed length is easier for readers to scan than one that expands whenever the assistant has more to say. Predictability is a quiet benefit of explicit length control.

### Tone and register without losing meaning

Tone is how the answer sounds; register is the level of formality. Both should change with the audience while the underlying meaning stays fixed. A finding written for a specialist can use technical terms and compressed reasoning. The same finding written for a general reader must define terms and spell out implications, but it must not soften the finding into something false.

Preserving meaning while changing register is an editing discipline. The editor keeps the claim, the evidence, and the qualifiers, and changes only the packaging. If a caveat says that evidence is limited, the plain-language version must still say that evidence is limited, just in simpler words. A rewrite that drops the caveat to sound more confident has changed meaning, not tone.

The candidate can test this by comparing the key claims before and after. If every claim is still present with the same strength and the same conditions, the rewrite has changed register only. If a claim has become stronger or a condition has disappeared, the rewrite has introduced a factual change.

Register mismatch is easy to spot once you know the signs. A note for frontline staff that opens with a discussion of strategic alignment has the wrong register, because it delays the action the reader needs. A note for senior decision makers that explains every technical term at length has the same problem in reverse. The content may be accurate in both cases, but the answer has failed to adapt to its reader. The fix is to name the audience in the instruction and to say what the reader is expected to do after reading.

Asking for two versions is often the clearest approach. Asking for a version for a technical reviewer and a version for a general reader, plus a list of any meaning that differs between them, turns the preservation test into an explicit step. It also surfaces accidental shifts that a single version would hide.

### Jargon and audience versions

Technical vocabulary is efficient among specialists and excluding elsewhere. Rather than guess what a reader knows, the user can ask for both a version with jargon and a version without it. Seeing them side by side reveals which terms were doing real work and which were decoration.

A useful instruction asks for three things: a plain version, a technical version, and a short glossary mapping the terms between them. The glossary is valuable because it lets a reader move between audiences later without re-requesting the whole answer. It also exposes terms that have no plain equivalent, which may signal an idea the reader genuinely needs to learn.

The no-jargon version should replace terms with explanations, not merely delete them. Removing a technical word without explaining the concept produces a sentence that sounds simpler but carries less information. A good plain version keeps the concept and changes the words used to express it.

For exam purposes, the key point is that jargon level is a controllable dimension of the answer, like length or format. It should be stated in the prompt rather than left to chance, and it should be matched to who will read the result.

### Response controls versus restating format

Many interfaces offer controls for response length, verbosity, or style. These are convenient because they apply across conversations and require no extra typing. They are also blunt compared with an instruction in the prompt. A control for conciseness cannot know that this particular answer needs a table with four named columns and a caveat about missing data.

The principle is straightforward. Use response controls for broad, stable preferences that apply to most work. Use the prompt for task-specific structure, length bounds, schemas, and constraints. When the two disagree, the prompt should govern the current answer, and a careful user will check that the control did not quietly override a needed detail.

This distinction matters in team settings. A shared style may set a default tone for client documents, but a particular client may require a different register. The correct move is to state the exception in the prompt, not to change the shared default for everyone. Similarly, a global preference for shorter answers should not be allowed to strip a caveat from a required report.

The candidate should be wary of any answer that assumes a control replaces a clear instruction. Controls reduce repetition; they do not transfer responsibility. If the output must have a specific shape, say so in the prompt and verify the result.

| Aspect | Response control | Prompt instruction |
| --- | --- | --- |
| Scope | Applies broadly across conversations | Applies to the current task |
| Precision | Coarse, such as more or less detail | Exact, such as named fields and bounds |
| Best use | Stable personal preference | Task-specific structure and constraints |
| When they conflict | Should yield to the in-turn instruction | Should state the requirement explicitly |

The request below combines structure, schema, length, and tone in one place. It shows how a format request can be made checkable rather than impressionistic.

```text
OUTPUT-FORMAT REQUEST

Produce an exceptions summary for a leadership reader.

Structure: one opening conclusion of at most two sentences, then a table,
then a short caveats paragraph. Do not add other sections.

Table columns, in this order: account_ref, issue, evidence, owner, status.
Use exactly these key names. status must be one of: open, in_review, closed.
If a source does not state a value, write "not stated" in that cell.

Length: at most 220 words for the whole answer. If you must cut, shorten
the caveats wording before removing any caveat.

Tone: direct and neutral. Provide a second version without technical terms
and a short glossary of the terms you replaced.
```

### The polish trap

A well-formatted answer feels trustworthy. Clean headings, tidy tables, and confident phrasing create an impression of care, and readers naturally transfer that impression to the facts. This is the polish trap: the form of an answer is mistaken for evidence of its accuracy.

The trap is dangerous because it rewards exactly the wrong thing. An assistant can produce a beautifully structured summary built on a fabricated figure, and the structure makes the error harder to notice. A reviewer who checks only the format will pass it. The candidate should remember that fluency is not evidence of truth; polish is fluency made visual.

The defence is to keep two checks separate. First check structure: are all requested parts present, in the right shape, with the right length? Then check substance: are the claims supported by the supplied material, are numbers and dates correct, and are caveats attached to the claims they qualify? Doing these as distinct passes prevents a tidy layout from short-circuiting factual review.

A practical way to keep the passes separate is to write two short checklists. The first asks whether the named sections, column headings, length bound, and terminology rules are present. The second asks whether each figure, date, and causal claim traces to supplied material, and whether every caveat still sits beside the claim it limits. Answering yes to the first says nothing about the second. Keeping them as separate review lines stops a tidy answer from sailing through.

When a scenario describes an answer that looks excellent but contains a wrong figure, the correct response is not to request more polish or a different format. It is to trace the figure to its source and correct or flag it. Format and accuracy are independent dimensions, and a strong answer must satisfy both.

> **Exam note:** If an option praises an answer's appearance as a reason to accept it, treat that option with suspicion. Appearance is not a validation method.

## Worked scenario

A coordinator requests a short update on a programme for a leadership audience. The returned answer is a tidy paragraph with confident claims and one figure that no one recognises. Four responses are proposed.

The first is to ask for an even tighter version, on the theory that brevity will fix it. The second is to request a reformat into bullets. The third is to specify an output structure with a named source, a table with fixed columns, a length bound that leaves room for caveats, and a rule that missing values are marked rather than filled. The fourth is to accept the answer because it reads well.

The third response is best. The original request failed to state the source, the structure, the handling of gaps, or a checkable length. The figure likely came from the assistant filling a silence with a plausible number. An explicit schema and a mark-missing-values rule address that failure directly.

Tighter length could remove the caveat and make the answer more misleading. Reformating into bullets changes the packaging, not the facts. Accepting on the basis of readability is exactly the polish trap.

The coordinator reissues the request with a clear frame, a bounded source, a table with columns for status, evidence, and open item, a bound on total words, and a closing rule that any figure absent from the source must be written as not in source. The new answer is easier to scan, and more importantly the suspect figure is now visibly flagged, prompting a quick check with the programme owner.

## Common mistakes

- Asking for a format without saying what the reader will do with the answer next.
- Using short or concise where a number or a bound would be checkable.
- Forgetting to say how missing fields should be represented in structured output.
- Letting a default response control override a task-specific requirement.
- Rewriting for a general audience by deleting technical terms without explaining the concepts.
- Treating a clean table or confident tone as proof that the underlying claims are correct.
- Checking only whether the format looks right and never checking the facts separately.

## Chapter summary

- State structure explicitly, because the assistant cannot infer the reader's next step.
- Match format to action: tables for scanning, bullets for action, prose for narrative, structured data for import.
- Use schemas and fixed field names when output will be reused or imported.
- Replace vague length words with numbers or bounds that can be verified.
- Change tone and register while keeping claims, evidence, and qualifiers intact.
- Request versions with and without jargon, plus a glossary, when audiences differ.
- Use response controls for stable defaults and the prompt for task-specific requirements.
- Keep structural review separate from factual review to avoid the polish trap.

## Checkpoint questions

1. What is the main reason to state format in the prompt?

- A. It makes the answer longer.
- B. It removes guesswork and makes the output usable for the next step.
- C. It guarantees factual accuracy.
- D. It replaces the need for a source.

2. Which format best supports comparing several items on the same fields?

- A. A narrative paragraph.
- B. A bulleted action list.
- C. A table.
- D. A short slogan.

3. What should a schema specify for fields the source does not provide?

- A. That the assistant should invent a plausible value.
- B. That the field should be marked as not stated.
- C. That the field should be deleted from every row.
- D. That the whole answer should be shortened.

4. Which length instruction is most checkable?

- A. Keep it short.
- B. Make it brief but complete.
- C. No more than a stated number of words, trimming examples before caveats.
- D. Use your judgement.

5. What preserves meaning when rewriting for a general audience?

- A. Removing all caveats.
- B. Keeping claims, evidence, and qualifiers while simplifying language.
- C. Making every claim sound certain.
- D. Replacing evidence with opinion.

6. Why is a polished answer a verification risk?

- A. Because tables are always wrong.
- B. Because appearance can be mistaken for evidence of accuracy.
- C. Because formatting takes time.
- D. Because structured output cannot be checked.

### Answers and rationale

1. Correct answer: B. Explicit format makes the result fit the next action and be checked easily. Option A is incidental. Option C overstates what format can do. Option D confuses presentation with sourcing.

2. Correct answer: C. A table aligns repeated fields for scanning. Option A suits narrative, option B suits independent tasks, and option D is not a work format.

3. Correct answer: B. Marking missing values keeps gaps visible and prevents invention. Option A creates fabrication. Option C can hide inconsistency. Option D does not address the field.

4. Correct answer: C. A numeric bound plus a trimming priority can be verified and preserves caveats. Options A and B are subjective. Option D provides no checkable standard.

5. Correct answer: B. Meaning is preserved when claims, evidence, and conditions survive the change in language. Options A and C strengthen the answer beyond the evidence. Option D replaces support with opinion.

6. Correct answer: B. Tidy presentation can cause reviewers to skip factual checking. Option A is false. Option C is irrelevant. Option D is false because structured output can and should be checked.

---

*End of chapter 8.*
