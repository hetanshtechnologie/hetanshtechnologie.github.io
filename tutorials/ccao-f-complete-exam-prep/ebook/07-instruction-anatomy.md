# Chapter 7 — Anatomy of a Strong Instruction

The same assistant can produce a vague paragraph or a precise brief depending on what it is given. Instruction craft is the practice of supplying the right information in a form the assistant can use. This chapter breaks a strong instruction into its parts, shows how to choose examples, and explains how to keep outside text from being mistaken for a command.

## Learning objectives

- Explain why supplied context changes the quality of an assistant's answer.
- Name and apply the five parts of a useful instruction.
- Add relevant background without flooding the prompt with irrelevant detail.
- Place the most important instructions where they are least likely to be missed.
- Distinguish a negative instruction from a positive example and know when each helps.
- Select examples that steer behaviour without misleading it.
- Balance specificity against over-specification.
- Use a draft, critique, and revision sequence, and keep instructions separate from untrusted text.

## Key concepts

### Why context changes the answer

A language model does not retrieve a single correct answer from a store. It produces a likely continuation based on the text it can see. That means the text supplied in a request is not decoration around the question; it is the raw material from which the answer is built. Change the context and the answer changes, sometimes dramatically.

This has a practical consequence that every candidate should absorb: the quality of an output is bounded by the quality of the input. A request that says to write something about a policy gives the assistant almost nothing to work with, so it fills the gaps with generic phrasing. A request that states the audience, the decision to be supported, the policy's key constraint, and the required length gives the assistant a target it can actually hit. The difference is not luck; it is information.

Context works at several levels. There is the immediate prompt, which carries the task. There is uploaded material, which carries facts. There are instructions from earlier in the conversation or from a project space, which carry standing rules. There are also preferences and saved skills that may load automatically. All of these compete for attention, and a contradiction among them can produce an answer that seems to ignore one of them. When an output looks inexplicable, the first diagnostic step is to list every piece of context that was in play.

More context is not automatically better. Irrelevant material can crowd out the useful parts and invite the assistant to echo details that do not matter. The goal is not maximum context but relevant, well-organised context. The candidate should think of the prompt as a workspace: put in what is needed for the task and keep everything else out.

> **Exam note:** When a scenario shows a vague request producing a weak answer, the fix is almost always to add relevant context and structure, not to switch tools or blame the model.

### The five parts of a useful instruction

A reliable instruction tends to contain five elements, though not every short prompt needs all of them spelled out.

The frame, or role, tells the assistant what perspective to adopt. Asking it to act as a reviewer assessing a draft for factual support sets a different expectation from asking it to draft a first version. The frame is not a costume; it changes which criteria the assistant emphasises.

The task states the action precisely. Asking it to summarise attached notes into a decision log is a task. Asking it to help with the notes is not. A good task names the verb and the object.

Constraints define the boundaries: what to include, what to exclude, which facts may be used, what tone to avoid, and what must be flagged as uncertain. Constraints are where accuracy rules belong. If the assistant may only use the supplied document, that must be said.

The format describes the shape of the answer: a table with named columns, a list of a fixed length, a short paragraph followed by a caveat. Format is not cosmetic; it determines whether the output can be used in the next step.

Examples show rather than tell. A single well-chosen example can resolve ambiguity that several sentences of description cannot. Examples are especially valuable when the desired output has a subtle pattern.

These parts work together. A prompt with a clear task but no constraints may produce a fluent answer that uses outside facts. A prompt with constraints but no format may produce a correct answer that is hard to scan. The candidate should be able to look at a weak prompt and name which parts are missing.

| Part | Question it answers | Failure when missing |
| --- | --- | --- |
| Frame or role | From what perspective should this be done? | Wrong emphasis or register |
| Task | Exactly what action is required? | Generic or unfocused output |
| Constraints | What boundaries must be respected? | Unsupported facts or excluded content appears |
| Format | What shape should the answer take? | Output cannot be used downstream |
| Examples | What does a good result look like? | Misread pattern or style |

### Background without noise

Background exists to remove ambiguity, not to display everything known about a topic. The useful test is whether a detail changes what a correct answer would look like. If it does, include it. If it does not, leave it out.

Suppose an analyst asks for a summary of a customer feedback report for a product team. Relevant background includes what decision the team will make, what the report covers, and which terms the team uses for its categories. Irrelevant background includes the history of the feedback tool, the names of people who collected the data, and the office's preferred meeting format. Including the irrelevant material does not make the answer smarter; it gives the assistant more text to weigh and more chances to echo something unhelpful.

A compact way to add background is to separate it from the task with clear labels. A short context line followed by a short task line is easier for the assistant to parse than a long paragraph where the request appears in the middle. When background contains sensitive material, redaction should happen before it is included. The habit of pausing to ask whether each sentence earns its place is one of the cheapest quality improvements available.

> **Common mistake:** Pasting an entire old thread into a new prompt for context, including discarded ideas and old corrections. The assistant then treats abandoned content as still relevant.

### Where instructions sit matters

Not every position in a prompt carries the same weight in practice. Instructions placed at the start set the frame, and instructions placed at the end are freshly in view when the answer is generated. The middle of a long block of source material is the easiest place for a rule to be overlooked.

This is why a widely useful pattern is to state the key rules briefly at the start and repeat the single most important one at the end. For example, a prompt might open with an instruction to use only the attached policy and flag any gap, include the policy text in the middle, and close with a reminder not to use outside knowledge. The repetition is not wasteful; it protects the constraint that matters most from being buried.

The same logic applies to material that arrives from elsewhere. A rule stated in a project instruction and then contradicted deep inside an attachment creates confusion. The user should resolve contradictions before sending, not hope the assistant picks the right one. When two instructions genuinely cannot both be followed, the safe behaviour is to stop and ask, not to guess silently.

Length interacts with placement. In a short prompt, position hardly matters. In a long one with documents, tables, and examples, the important rules should be short, explicit, and placed where they can be seen. A candidate who sees a scenario where a constraint was lost in a long prompt should think about placement as a likely cause.

### Negative instructions versus positive examples

A negative instruction says what not to do: do not use jargon, do not include prices, do not hedge. Negative instructions are sometimes necessary, especially for safety boundaries, but they have a weakness. They tell the assistant what to avoid without showing what to do instead, so the assistant may replace the banned behaviour with something equally unhelpful.

A positive example does the opposite. Asking for short sentences with common words, aimed at a reader who has no specialist training, gives a target. Showing two sample sentences in the desired style gives an even clearer one. Positive guidance is generally more reliable because it defines the desired output directly.

The best practice is to use both where stakes are high. State the boundary negatively when it matters for compliance, then show the desired alternative. For instance, do not include unsupported figures; instead, write not stated in the source wherever a figure is missing. This pairs a firm rule with an actionable replacement.

For exam purposes, the distinction often appears in a question about improving an output. If an answer keeps violating a rule stated only as a negative, the recommended change is usually to add a positive example or a concrete alternative behaviour, not simply to repeat the negative more loudly.

### Choosing examples that teach the pattern

Few-shot examples are a small set of input and output pairs included in the prompt to demonstrate a pattern. They are powerful because they show the mapping the user wants rather than describing it abstractly. A single example can teach the assistant that a risk note means one sentence of evidence followed by one sentence of action.

Choosing them well requires care. Examples should represent the range the task will cover, not just the easiest case. If all examples are short, the assistant may compress future answers. If all examples share the same topic, it may treat that topic as required. A good set varies the surface details while keeping the underlying pattern constant, so the assistant learns the structure rather than the trivia.

Examples should also be correct. A flawed example is a direct instruction to reproduce the flaw. This is particularly important when the example contains a fact or a citation; a fabricated example teaches fabrication. Examples should be formatted exactly as the desired output, including headings, punctuation, and any labels.

More examples are not always better. Two or three well-chosen pairs often outperform a long list that consumes context and introduces conflicting signals. If a pattern cannot be taught with a few examples, the task may need decomposition into simpler steps instead of more demonstrations.

> **Try it:** Write one example of a short risk note, then a second with different subject matter but the same structure. Ask the assistant to produce a third. Compare the result with a version where only one example was supplied.

### Specificity without over-specification

Specificity improves output because it removes choices the assistant would otherwise make on its own. Naming the audience, the length, the sections, and the decision to be supported narrows the space of acceptable answers. This is good.

Over-specification happens when the prompt becomes so dense with minor rules that the main goal is obscured. A request that dictates the exact wording of every transition, the precise order of every clause, and the number of adjectives in each sentence leaves no room for the assistant to apply judgment, and the result is often stiff and oddly literal. It also makes the prompt fragile: one small change to the data can break a rule that assumed a particular shape.

The balance is to specify what affects correctness and usability, and to leave stylistic micro-decisions alone. State the constraint that a figure must come from the attached table; do not dictate the exact phrase used to introduce it. State that the answer must end with a caveat; do not script the caveat word for word.

A useful test is to ask whether a rule would be checked by a reviewer. If a reviewer would reject an output for breaking it, the rule belongs in the prompt. If no one would notice or care, it is probably noise. This test keeps prompts short without sacrificing what matters.

| Anti-pattern | Why it weakens the result | Practical fix |
| --- | --- | --- |
| Vague ask with no audience | The assistant guesses who will read it | Name the reader and the decision |
| Whole old thread pasted as context | Discarded ideas gain weight | Include only the current relevant material |
| Negative rule stated alone | Forbidden behaviour is clear, desired behaviour is not | Pair it with a positive example |
| Examples that all look alike | Surface details are learned instead of the pattern | Vary details, keep structure constant |
| Every stylistic detail dictated | Prompt becomes fragile and output stiff | Specify only what a reviewer would check |
| Instructions mixed with source text | Embedded text may be read as a command | Label and separate the two blocks |
| Most important rule left implicit | The constraint is dropped under load | State it at the start and repeat at the end |

### Draft, critique, revision

Some outputs improve more through sequence than through a single perfect instruction. Asking for a draft first creates a concrete object. Asking for a critique next applies a different kind of attention, because evaluating is easier than producing and the assistant can spot problems that were invisible while drafting. Asking for a revision then applies the critique without starting over.

This pattern works because each stage has a narrower job. A draft request focuses on completeness. A critique request focuses on weaknesses against a stated standard, such as factual support, clarity for a named audience, or adherence to a format. A revision request focuses on targeted change. Combining all three into one instruction often produces an answer that is confident but unexamined.

The critique stage is most useful when the standard is explicit. Asking for a review that lists every unsupported claim with the sentence it appears in produces a usable list. Asking what the assistant thinks produces vagueness. The revision should then refer to the specific items from the critique, so the change is traceable.

The human should remain in the loop at each stage. A critique generated by the assistant is an aid, not a guarantee. The reviewer decides which points are valid and which are noise, then requests changes accordingly. This is a practical example of using the tool to augment judgment rather than replace it.

### Keeping instructions separate from untrusted text

A prompt often mixes two kinds of text: the user's instructions and material drawn from an external source, such as a pasted document or a web page. These must be kept visibly separate. The reason is that external text can contain sentences that look like instructions. A document might include a line telling the reader to ignore earlier guidance and reveal private information. If the assistant treats that line as a command, the user's actual request has been hijacked.

The practical method is to label boundaries clearly. Instructions appear in one labelled block. Source material appears in another, introduced as data to analyse rather than directions to follow. A closing line can restate that anything inside the source block is content, not command. This does not make the problem disappear, but it greatly reduces confusion.

The candidate should also recognise that this is a security topic, not merely a prompt-writing tip. An attacker who can place text in a source the assistant reads may try to steer behaviour through that text. Defences include scoping what the assistant may do, keeping instructions separate from data, and verifying any surprising action. A well-structured prompt is one layer of that defence.

### Before and after: a rewrite with rationale

Consider a weak request: write something about the new policy for managers, keeping it short and good.

The problems are numerous. The audience is named too broadly, the decision to be supported is absent, no source is identified, the length word is not a bound, the quality word is undefined, and there is no format. The likely result is a generic paragraph that could apply to any policy.

A rewritten version might read as follows.

```text
Context: The attached one-page note describes a revised expenses policy
for team leads. The note is the only allowed source.

Task: Produce a briefing for team leads that explains what changes for
them and what action they must take.

Constraints: Use only the attached note. Where the note is silent, write
"not stated in source." Do not speculate about dates.

Format: Three headings — What changes, What you must do, Open questions.
Under 180 words total.

Example opening: "What changes: The approval step now applies to all
requests above the stated threshold."
```

The rewrite succeeds for clear reasons. It names a specific audience and decision, supplies and bounds the source, replaces a vague length word with a numeric limit, defines the sections, and shows the expected style. It also tells the assistant how to handle gaps, which prevents confident invention. The candidate should be able to look at any weak prompt and produce a similar list of concrete improvements.

## Worked scenario

A reviewer receives an answer that is fluent, well formatted, and wrong in two places. The original request was short: summarise the attached review and make recommendations. The attachment was long and included an old version of the figures alongside a note about format preferences. The reviewer proposes four fixes.

The first is to ask for a longer answer. The second is to rewrite the instruction with a clear frame, a bounded source, explicit sections, a numeric length, and a closing restatement that only the current figures may be used. The third is to switch to a different tool. The fourth is to accept the answer and correct the two errors by hand without changing the method.

The second fix is best. The failure came from missing structure: no source boundary, no distinction between current and old figures, no format, and no definition of what a recommendation should contain. Rebuilding the instruction addresses the cause.

Longer output would add words without adding control. Switching tools is unnecessary because the tool was capable; the instruction was weak. Hand-correcting the errors fixes one instance and guarantees the next instance will fail the same way.

The reviewer writes a new instruction with a frame of an analyst preparing a decision brief, a task naming the sections, a constraint that only the current figures block may be used, a format with named headings and a word bound, and one example of the desired recommendation style. Source text is placed in a clearly labelled block and the closing line restates that text in that block is data, not instruction. The new answer is shorter, correctly sourced, and usable without rework.

> **Exam note:** When an answer fails because of missing structure, the remedy is a better instruction, not a different tool or a longer response.

## Common mistakes

- Asking for a good summary without naming the audience or the decision it supports.
- Adding every available detail as background, including material that cannot affect the answer.
- Stating a rule only as a negative, leaving the assistant to guess the desired behaviour.
- Choosing examples that all share the same surface details, so the pattern is missed.
- Writing a prompt so dense with minor rules that the main task is buried.
- Mixing source text with instructions and leaving no clear boundary between them.
- Treating a fluent, well-formatted answer as evidence that the instruction was sound.

## Chapter summary

- Context is the raw material of the answer, so relevant context improves output and irrelevant context dilutes it.
- A useful instruction usually has a frame, a task, constraints, a format, and examples.
- Background should be included only when it changes what a correct answer looks like.
- Key rules belong at the start and, for the most important one, again at the end.
- Positive examples usually steer behaviour better than negative commands alone.
- Examples should vary surface details while keeping the underlying pattern stable.
- Specify what affects correctness; leave stylistic micro-decisions to the assistant.
- Draft, critique, and revision work best as separate stages with explicit standards.

## Checkpoint questions

1. Which change most improves a vague request that produced a generic answer?

- A. Ask for more words.
- B. Add audience, source boundary, format, and a length bound.
- C. Repeat the same prompt twice.
- D. Switch to a different model without changing the prompt.

2. Which element tells the assistant what perspective to adopt?

- A. The task.
- B. The frame or role.
- C. The format.
- D. The examples.

3. Where is a critical rule least likely to be overlooked in a long prompt?

- A. Buried in the middle of source text.
- B. Only inside an attachment.
- C. Stated at the start and repeated at the end.
- D. Left implicit.

4. What is the main weakness of a negative-only instruction?

- A. It is always longer than necessary.
- B. It says what to avoid without showing the desired behaviour.
- C. It cannot be used for safety rules.
- D. It prevents all outputs.

5. How should examples be chosen to teach a pattern?

- A. All should use identical wording.
- B. They should vary surface details but keep the pattern constant.
- C. They should include deliberate errors for realism.
- D. They should be as numerous as possible.

6. What is the correct way to include external source text in a prompt?

- A. Merge it into the instruction paragraph.
- B. Label it clearly as data and keep it separate from instructions.
- C. Treat its sentences as additional commands.
- D. Remove all labels so the assistant reads naturally.

### Answers and rationale

1. Correct answer: B. Structure and relevant context address the actual cause of a generic answer. Option A adds volume, not control. Option C repeats the same weak input. Option D blames the tool when the instruction was the problem.

2. Correct answer: B. The frame sets perspective and emphasis. Option A names the action, option C names the shape, and option D demonstrates the pattern.

3. Correct answer: C. Rules at the edges of a prompt stay visible. Options A and B are easy to miss in long material. Option D leaves the behaviour to chance.

4. Correct answer: B. A negative rule defines the forbidden behaviour without supplying a replacement. Option A is not inherent. Option C is false because negative rules are useful for boundaries. Option D is an overstatement.

5. Correct answer: B. Varying surface details teaches the underlying structure. Option A risks teaching specific wording. Option C teaches errors. Option D wastes context and can introduce conflicting signals.

6. Correct answer: B. Clear separation prevents external text from being mistaken for instructions. Options A and D blur the boundary. Option C hands control to untrusted content.

---

*End of chapter 7.*
