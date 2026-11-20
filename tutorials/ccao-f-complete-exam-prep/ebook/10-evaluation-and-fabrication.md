# Chapter 10 — Why Evaluation Matters: Detecting Fabrication

An answer can look complete and still be wrong. This chapter is about the habit of treating every response as a draft to be examined before it is reused. It explains what completeness actually means, why confident phrasing is not evidence of truth, how fabricated content appears in recognizable forms, and how a reviewer can catch the common cases quickly. The goal is not suspicion for its own sake. It is a small, repeatable evaluation habit that protects decisions built on assistant output.

## Learning objectives

- Define completeness relative to the request and check that every requested part is present.
- Explain why fluent phrasing is not evidence that a claim is true.
- Recognize categories of fabrication and match each to a detection tactic.
- Spot warning signs that call for a closer check.
- Ground requests in supplied material using references, quotations, and explicit gaps.
- Ask an assistant to mark what it does not know, and understand the limit of that signal.
- Triangulate claims against independent anchors rather than trusting a single generated answer.
- Apply a verification checklist to a bounded answer in a short review window.

## Key concepts

### Evaluation starts with the request

Completeness is not a property of an answer in the abstract. It is a relationship between the answer and what was actually asked. Before reading a response, restate the request as a list of deliverables. If an analyst asked for three options, a risk note for each, and a recommendation, then an answer with two options is incomplete even if those two are perfectly accurate.

Scope matters just as much. Did the response stay within the supplied time period, audience, and units? A comparison requested in monthly terms but delivered in annual figures is incomplete in a subtle way, because the reader cannot use it as asked. A memo requested for a technical team but written for a general audience may be well written and still fail the brief.

This is why evaluation begins with the request rather than the prose. The first pass asks "did it answer the question?" before asking "is it any good?" An answer that fails the first question does not become acceptable because the second question scores well.

> **Exam note:** A response can be accurate, fluent, and still wrong for the task if a requested part is missing or the scope was silently changed.

### Why a fluent answer can be fabricated

A language assistant produces text that is likely to follow from the prompt and its training patterns. It is not looking up a table of verified facts before each sentence. When a prompt asks for a specific figure, date, or reference that the assistant does not actually have, the same generating mechanism still produces something in the right shape. The output has the form of an answer because form is what the mechanism is good at.

Confidence is a stylistic property. Short declarative sentences, precise-sounding numbers, and formal citation markers all signal assurance without carrying evidence. Reviewers are vulnerable here because fluent text is easy to read. Reading smoothly reduces the impulse to stop and check. The more polished the paragraph, the more effort it takes to treat each claim as a separate assertion requiring support.

Fabrication is therefore not a rare glitch. It is a predictable outcome whenever a request leaves a gap that the assistant feels pressure to fill. The practical response is to remove that pressure: supply the evidence, demand references, and make "not stated" an acceptable answer. Even then, the output must be checked, because an assistant can misread a passage or attach a correct quotation to the wrong claim.

> **Common mistake:** Assuming that a specific number or a formal-looking reference is more trustworthy than a vague statement. Specificity is a feature of style, not proof of sourcing.

### A taxonomy of fabricated content

Fabrication is easier to catch when it has a name. The table below groups the common forms and pairs each with a detection tactic. None of these tactics requires specialist knowledge; they require a willingness to open the source rather than read the assertion.

| Fabrication type | What it looks like | Detection tactic |
|---|---|---|
| Invented source | A titled document, report, or page that cannot be located | Search for the exact title; confirm it exists before using it |
| Wrong attribution | A real source credited with a claim it does not make | Open the cited passage and read the surrounding sentences |
| Plausible number | A figure that fits the expected range but has no derivation | Recompute it or trace it to a field in the supplied data |
| Incorrect date or name | A near-correct date, title, or individual that is subtly wrong | Compare against the primary record, not another generated answer |
| Invented quotation | A quoted phrase that reads convincingly but is absent from the source | Match the quotation word for word against the original text |

Invented sources are dangerous because they give a claim a home. A reader who cannot find the title may assume their own search is at fault. Wrong attribution is harder still, because the source itself is real; only the link between source and claim is false. Plausible numbers are the most likely to survive a quick skim, since they match the reviewer's expectation of what the answer should say. Dates and names fail in small ways that matter when an action depends on them. Quotations must be matched literally; a paraphrase presented as a quote is a fabrication of form even when the idea is right.

### Warning signs that should slow a reviewer

No single warning sign proves that a response is fabricated. Each one raises the cost of skipping a check. When several appear together, the response should be set aside for a proper pass.

- Unusually precise detail in an answer built on vague source material.
- The same level of precision across items that should vary in certainty.
- References clustered in one paragraph while other claims stand alone.
- Hedging words beside categorical claims in the same sentence.
- Assertions that appear only in the answer and nowhere in the supplied material.
- A complete, confident answer to a brief that was itself underspecified.
- A quotation introduced without a passage location or document name.

The last sign deserves attention. An assistant asked to write from memory rather than from a supplied document is more likely to produce all of the other signs. That does not make memory-based answers useless, but it changes the reviewer's job: every checkable claim must now be traced somewhere outside the response.

It helps to group the signs by what they suggest. Precision without a derivation points to a plausible number. A reference without a locatable passage points to an invented or misattributed source. Smooth confidence in the face of thin evidence points to material added to complete the shape of the answer. Grouping turns a vague feeling that something is off into a specific question the reviewer can put to the document. It also prevents overcorrection: not every confident sentence is fabricated, and a reviewer who rejects everything wastes the assistant's genuine contribution.

### Grounding the request in supplied material

Grounding means making the supplied documents the only permitted evidence for an answer. It is the strongest practical defence against fabrication, though not a complete one. A grounded request names the source, limits what may be used, and requires a reference for each claim.

```text
Using only the two documents supplied below, answer the three questions
in the brief. For each factual claim, give the document name and quote
the exact passage that supports it. If a document does not address a
question, write "not stated in supplied material" for that document.
Do not add facts from general knowledge. Do not infer a date or figure
that is not written in the passages. Present your answer as a table with
columns: question, answer, document, supporting quotation.
```

This prompt works for several reasons. It fixes the evidence set, so the assistant has no reason to reach beyond it. It asks for quotations, which can be checked literally. It provides an acceptable way to report a gap, removing the incentive to fill that gap with a guess. It also fixes the output structure, which makes each claim easy to isolate.

Grounding does not remove the reviewer. The assistant may still misread a passage, quote the right text under the wrong question, or summarize a caveat out of existence. The references are there to be opened, not admired.

Grounding also changes how a reviewer reads. Instead of judging whether a claim sounds reasonable, the reviewer checks whether a passage supports it. That is a faster and more reliable test, because it replaces a subjective impression with a comparison between two pieces of text. When the comparison cannot be made, the claim is not cleared; it is simply waiting for evidence.

### Asking the assistant to mark what it does not know

A useful addition to a grounded prompt is an instruction to list unknowns separately. Ask for a short section headed "Not established by the supplied material" and require that every gap be named there. This gives the assistant explicit permission to decline, which reduces the pressure to produce a complete-looking answer.

Ask for a fixed marker such as "not stated" rather than letting the assistant choose wording. Consistent markers are easy to scan and easy to count. Distinguish two kinds of gap: something absent from the supplied documents, and something the assistant is genuinely unsure about. The first is a fact about the evidence set; the second is a statement about confidence.

The limitation is straightforward. An assistant's declaration that something is unknown is not proof that it is unknown. The relevant document may have been attached but overlooked. A reviewer still has to confirm that the gap is real before accepting it.

| Marker | What it means | Reviewer action |
|---|---|---|
| Not stated | No supplied source addresses the point | Confirm nothing relevant was omitted from the evidence set |
| Uncertain | The assistant cannot commit to an answer | Verify elsewhere or record the point as open |
| Confirmed | A source reference is attached | Open the reference and read the exact passage |

> **Try it:** Take a recent answer that contained a date or figure. Ask for a version that uses only the material you supplied and marks every gap. Compare the two versions claim by claim.

### Triangulation and the limits of one answer

A single generated answer is one sample, not corroboration. Asking the same assistant to "check" its own answer usually reproduces the same assumptions in different words. Even a second assistant with different phrasing is not independent evidence, because both draw on overlapping patterns and the same supplied context.

Triangulation means comparing a claim against anchors outside the generated text. The strongest anchor is the original document or system of record. A second anchor might be a different source that was produced independently. Agreement between two generated answers is weak evidence; agreement between a generated answer and a primary record is much stronger.

| Anchor | What it proves | Limit |
|---|---|---|
| Original document or system of record | The claim matches the authoritative source | Only covers what that record contains |
| Independent second source | The claim is not unique to one document | May repeat the same underlying error |
| A second generated answer | The wording is stable under regeneration | Not independent; shares context and patterns |
| Recalculation from raw data | The figure follows from the inputs | Depends on the inputs being correct |

Triangulation also has a stopping point. If a claim cannot be anchored outside the answer after a reasonable search, the correct move is to mark it unresolved, not to keep generating new answers in the hope that one will feel right.

### A two-minute verification checklist

A bounded answer can often be screened quickly if the reviewer follows a fixed order. The aim is not to prove everything true in two minutes. It is to catch the common fabrication types and decide whether the answer deserves deeper work.

1. Restate the deliverables from the request and confirm each is present.
2. Scan every claim that carries a name, date, number, or reference.
3. Open each reference and match the supporting passage to the claim.
4. Check that units and time frames match the brief.
5. Compare one or two key summary statements against their source wording.
6. Mark anything unverified as open rather than silently accepting it.
7. Decide whether the answer passes, needs a staged review, or must be rejected.

For a long document, this pass identifies where the risky claims are; it does not clear the whole document. Staged checks then work through each section. The value of the short routine is that it makes the limit explicit: a reader knows what was checked and what was only scanned.

### Completeness, correctness, and usefulness are different

Exam scenarios often turn on which axis failed. An answer can contain every requested section yet recommend an action the evidence does not support. That is a correctness failure, not a completeness failure. Another answer may contain only true statements but omit the comparison the reader asked for. That is a completeness failure, not a correctness failure.

Usefulness is a third axis. A response may be complete and correct but written at the wrong level for the reader, or organized so that the decision is buried. Usefulness matters, but it should not be used to excuse a fabricated claim. Polishing a wrong answer improves one axis while leaving the others broken. Keeping the three axes separate makes feedback precise: name which one failed and what would fix it.

### Evaluation is a habit, not a final step

Checking only at the end means discovering errors after they have been reused in a summary, a slide, or a decision. The previous chapter introduced checkpoints between chained steps. The same idea applies here: place small verification acts where claims are created. When an extract is produced, open the references. When a comparison is built, check that the figures came from the extract. When a draft appears, confirm that no new specifics have entered.

This distribution of effort is cheaper than a single heroic review. Early errors are isolated and easy to remove; late errors are embedded in prose that everyone has already read. The exam rewards the candidate who verifies before reuse, not the candidate who performs one dramatic check at the end.

## Worked scenario

An analyst asks for a short note on an internal policy, using two supplied documents. The requested parts are a summary of the policy, its effective date, a cost figure, a supporting quotation, and a recommendation. The response arrives with all five parts present. A first glance suggests a complete answer.

The reviewer starts with the deliverables. Summary present, date present, figure present, quotation present, recommendation present. On completeness, the answer passes. That result does not settle correctness.

The fabrication scan looks at the checkable items. The effective date is specific but does not appear in either document. The cost figure is plausible but has no derivation. The quotation reads convincingly and is attributed to the first document, yet the passage actually appears in the second. The recommendation goes beyond anything either document states. Four claims now need attention even though the answer looked finished.

The analyst reissues the request in grounded form, with the documents attached, a demand for exact quotations, and a "not stated" instruction. The revised response removes the invented date, marks the cost figure as not stated, attributes the quotation correctly, and separates the recommendation into a paragraph labelled as a judgment. At this point the response is more honest but still incomplete on two points the analyst needs.

Triangulation supplies the missing date. The analyst checks the policy register, which records an effective date different from the one originally asserted. The figure is queried against the finance system, where the only available entry is a target rather than a committed cost. Both findings are written into the note with their sources named.

The reviewer records what remains open: whether a pilot is planned. That item is shown to the reader as "to confirm" rather than quietly omitted. The final note is shorter than the first response and far more useful, because a reader can tell which statements are sourced, which are judgments, and which are still open. The lesson is not that the first answer was worthless. It is that its fluency made the unverified claims hard to see until each was tested.

Notice that the second response did not become trustworthy simply because it was re-prompted. It became trustworthy only after the references were opened, the date was checked against a register, and the figure was queried against a system. The re-prompting made those checks possible by exposing exactly which claims needed them. That is the practical value of asking for quotations and explicit gaps: it converts a smooth block of prose into a list of testable items.

> **Exam note:** When a scenario contrasts a polished answer with a plainer one that cites and marks gaps, the plainer answer is usually the safer work product.

## Common mistakes

- Equating a complete list of parts with a correct answer.
- Treating a specific figure or formal reference as self-verifying.
- Accepting a quotation without matching it to the original passage.
- Asking the same assistant to confirm its own answer and calling that triangulation.
- Leaving "not stated" out of the permitted responses, which invites guesses.
- Reporting that an answer was checked when only its tone was scanned.
- Hiding unresolved items rather than showing them to the reader.
- Polishing an answer before its factual claims have been tested.

## Chapter summary

- Completeness is judged against the request, including scope, units, and deliverables.
- Fluency is a style property; it carries no information about whether a claim is true.
- Fabrication appears as invented sources, wrong attribution, plausible numbers, wrong dates or names, and invented quotations.
- Warning signs such as unexplained precision or isolated claims justify a closer pass.
- Grounding in supplied material, with quotations and explicit gaps, reduces fabrication but does not remove the need to check.
- Triangulation requires anchors outside the generated answer; a second generated answer is weak evidence.
- A short checklist can screen a bounded answer, while longer work needs staged review.
- Completeness, correctness, and usefulness are separate axes and should be diagnosed separately.

## Checkpoint questions

1. An analyst asks for three options, a risk note for each, and a recommendation. The answer gives three options and a recommendation but no risk notes. How should this be classified?

- A. Correct but incomplete.
- B. Complete but incorrect.
- C. Both complete and correct.
- D. A bias problem rather than a completeness problem.

2. Which observation best supports a suspicion of fabrication?

- A. The answer uses short sentences.
- B. The answer is longer than the request.
- C. A figure appears with no derivation and no source reference.
- D. The answer includes a recommendation.

3. A response quotes a passage and attributes it to a named internal document. What is the most direct check?

- A. Read the quotation again and judge whether it sounds authentic.
- B. Ask the same assistant whether the attribution is correct.
- C. Open the named document and match the quotation word for word.
- D. Compare the quotation with another generated answer.

4. Which prompt is most likely to reduce invented figures?

- A. "Write a thorough answer using your general knowledge."
- B. "Use only the supplied documents, quote the supporting passage for each claim, and write 'not stated' where a document is silent."
- C. "Give a confident answer with as much specific detail as possible."
- D. "Avoid cautious language so the answer reads well."

5. Which of these is the weakest form of triangulation?

- A. Checking a date against the system of record.
- B. Recomputing a figure from the raw data.
- C. Asking the same assistant to produce the answer again.
- D. Comparing a claim with an independently produced second source.

6. In a two-minute screening pass, what should happen to a claim that cannot be verified in the time available?

- A. It should be treated as true because the rest of the answer passed.
- B. It should be deleted without comment.
- C. It should be marked as open and passed to a deeper review if needed.
- D. It should be rewritten in more confident language.

7. A memo contains every requested section, but its key recommendation is not supported by the cited evidence. Which diagnosis is accurate?

- A. Completeness failure only.
- B. Correctness failure, not completeness failure.
- C. Usefulness failure only.
- D. No failure, because the structure is correct.

### Answers and rationale

1. Correct answer: A. All the required content is not present, so the answer is incomplete; nothing in the scenario shows the content is wrong. Option B reverses the finding. Option C ignores the missing risk notes. Option D introduces bias, which the scenario does not mention.

2. Correct answer: C. A figure without derivation or reference is a classic plausible-number fabrication. Option A describes a harmless style choice. Option B says nothing about accuracy. Option D is expected in many briefs and is not itself a warning sign.

3. Correct answer: C. Only the original document can confirm the literal wording and the attribution. Option A relies on the same fluency that created the risk. Option B asks the source of the claim to validate itself. Option D compares one generated answer with another, which is not independent evidence.

4. Correct answer: B. A fixed evidence set, literal quotations, and an accepted gap marker remove the incentive to invent. Option A invites unsupported detail. Option C rewards precision regardless of support. Option D suppresses the very uncertainty the reviewer needs.

5. Correct answer: C. Regenerating with the same assistant and context is not independent; it shares the same patterns. Options A, B, and D all anchor the claim outside the single generated answer, which is what triangulation requires.

6. Correct answer: C. An unresolved claim should be visible as open, with deeper review if the decision warrants it. Option A assumes untested claims are true. Option B hides the gap. Option D makes the answer sound better without adding evidence.

7. Correct answer: B. The requested structure is present, so completeness is satisfied, but the recommendation lacks support, which is a correctness problem. Option A misses that distinction. Option C ignores the unsupported claim. Option D treats structure as a substitute for evidence.

---

*End of chapter 10.*
