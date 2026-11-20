# Chapter 1 — Reading the Exam: Scope, Judgment, and Scenario Reasoning

A foundations-level exam is not a contest of memory. It asks whether you can use an AI assistant safely, communicate with it clearly, and make sensible choices when a situation is messy. The questions are built around decisions a working professional actually faces: what to put into a request, which work surface to use, when to verify a claim, and when to decline a task. Knowing a product's feature list helps, but it rarely decides an item on its own. What decides most items is a constraint tucked into the story.

This chapter gives you a dependable way to read those stories. You will learn to separate questions that test recall from questions that test judgment, to find the phrase that changes the answer, and to discard options that look attractive but break a rule. The method is deliberately simple. Under pressure, a simple method survives; a clever one tends to collapse.

## Learning objectives

- Distinguish recognition items from judgment items and adapt your reading strategy to each.
- Identify the constraint in a scenario that determines the correct option.
- Apply a four-step routine to any scenario question, including items you find difficult.
- Recognize the common distractor families and explain precisely why each one is wrong.
- Decide when to flag an item and return to it rather than guessing in place.
- Explain why principle-level reasoning is more reliable than recalling product names.

## Key concepts

### What the exam is actually sampling

Think of the exam as a sample of decisions rather than a sample of facts. A foundations assessment typically touches several broad areas: using an assistant responsibly, writing instructions that produce usable work, checking output before it is trusted, fitting the tool into ordinary workflows, working inside shared spaces with knowledge and connections, and communicating limits to other people. Those areas are described here in general terms on purpose. The exact labels a certification body uses are less useful to you than the underlying question they keep asking: *given this situation, what would a careful professional do next?*

The word "foundations" is a clue about depth. You are not being asked to reconstruct a model architecture or to recite a parameter name. You are being asked to notice that a draft contains an unverified number, that a request exposes confidential material, or that a complex comparison needs a different setting than a quick rewrite. These are decisions with consequences, and the exam rewards candidates who can see the consequence before choosing.

A scenario question compresses a workday into a short paragraph. Someone has a goal, some material, an audience, and a deadline. One detail in that paragraph is the pivot: it makes an otherwise reasonable action wrong. Your job is to find that detail. Candidates who read only the first sentence often select an option that would be correct in a different, calmer version of the story.

"Safe use" is broader than avoiding forbidden requests. It includes putting information only where it is allowed to go, keeping a person accountable for a decision, and refusing to let an unverified statement travel further than the evidence supports. It also includes knowing when an assistant is simply the wrong instrument, such as when a fact must be current at this exact moment or when an action requires a human signature. Notice that none of these judgments depends on a particular screen. They depend on the consequences of the choice. This is why studying the reasoning pays off even when a question uses unfamiliar vocabulary: the vocabulary changes faster than the consequences do.

> **Exam note:** If two options both seem helpful, you have probably missed a constraint. Go back to the stem and look for the smallest word that changes the situation — a permission, a deadline, an audience, or a requirement to verify.

### Two families of questions

Not every item requires the same reading strategy. Recognition items ask whether you know a definition, a capability boundary, or a category. They are short, and the correct answer is either in your memory or it is not. Scenario items place the same knowledge inside a situation and ask for an action. The distinction matters because a strategy that works for one can hurt you on the other. A recognition item rewards speed; a scenario item rewards a pause.

| Dimension | Recognition item | Scenario item |
| --- | --- | --- |
| Typical wording | "Which statement is true about…" | "What should the analyst do first?" |
| Main skill | Recalling a definition or boundary | Applying a rule under constraints |
| Reading approach | Read the stem, then scan options | Read the whole stem, mark constraints, then test options |
| Common trap | Plausible-sounding near definition | An option that ignores one detail of the situation |
| Best use of time | Answer quickly or flag a genuine memory gap | Slow down and annotate before choosing |
| Why it is included | To sample breadth across topics | To sample judgment and safe behavior |

Most exams mix the two. A recognition item about verification might sit near a scenario in which a polished answer contains a fabricated citation. The knowledge is the same; only the packaging changes. When you recognize the underlying idea, write it in your own words in the margin before looking at the options. This prevents a familiar phrase in a distractor from pulling you away from your own reasoning.

### Finding the deciding constraint

A constraint is any fixed condition that a correct answer must respect. It is not decoration. Typical constraints include the sensitivity of the data involved, who is allowed to see or change something, the audience that will read the output, a need to confirm a claim before using it, a strict time limit, a requirement that a decision be reviewed by a person, and the fact that a particular workspace does or does not hold the relevant material.

The useful habit is to ask which constraint would make two otherwise identical options different. Suppose a request asks for a summary of an internal document. One option suggests pasting the entire document into a general conversation; another suggests placing it in a project space with restricted access. If the stem says the document contains customer identifiers, the data sensitivity is the deciding constraint. If the stem instead says the document is a public brochure, the deciding constraint might be speed, and the first option becomes reasonable. The action did not change; the story did.

Constraints also have a hierarchy. Safety and policy constraints outrank convenience. A verification requirement outrank polish. An access restriction outrank speed. When two constraints point in different directions, the one that protects people or prevents a false claim usually wins. This is why exam answers so often favor a slower, more careful step: the step is not being rewarded for slowness, but for the value it protects.

> **Common mistake:** Treating every detail in a stem as equally important. Most details set the scene; one or two decide the answer. If you try to weigh all of them equally, you will run out of time and still miss the pivot.

Here is a compact annotation template you can reproduce mentally, or on scratch paper if your testing environment allows notes. It is written as plain text so that it works anywhere.

```text
SCENARIO ANNOTATION
Goal:       What is the person trying to produce or decide?
Given:      What material, access, audience, and deadline are fixed?
Pivot:      Which single detail changes the right answer?
Must hold:  List what every acceptable option must satisfy.
Unsafe:     List actions that break policy or skip verification.
Type:       Recognition or judgment?
Test:       For each option, does it satisfy every must-hold item?
```

### A four-step method for any scenario item

When the story is long, work through it in a fixed order so that you never rely on a vague impression. The order below is short enough to use on every scenario item and robust enough to handle unfamiliar situations.

1. **Restate the goal.** Say in one sentence what the person is trying to accomplish. This stops you from answering a question that was not asked, such as improving a document when the real goal was deciding whether to share it.
2. **List the constraints.** Name the fixed conditions, then mark the one that decides between options. If you cannot name a deciding constraint, the item may be a recognition item in disguise.
3. **Eliminate unsafe options.** Remove any option that exposes data, grants excessive access, skips a required check, or presents unverified material as fact. Do this before comparing the survivors; it is faster and safer than ranking all options at once.
4. **Choose the option satisfying every constraint.** Among the remaining options, pick the one that satisfies all of them, not merely most of them. An option that satisfies four constraints out of five still fails.

Notice that step three comes before step four. This is intentional. If you compare all options on elegance first, a polished but careless choice can win your attention. Eliminating unsafe choices first narrows the field to options that are at least permissible, and then you can judge quality.

The routine also protects you from a subtle failure: solving the problem you expected rather than the one described. Writing the goal as a single sentence forces you to use the stem's words. If the stem says the reviewer needs to decide whether to release a document, your goal is a decision, not a better draft. Many attractive distractors are excellent answers to a slightly different question. Once the goal is written, compare the goal with the first clause of each option; if the option begins by doing something else, set it aside.

> **Try it:** Take a scenario you answered confidently and run the four steps on it again. If your original answer fails step three or step four, you found a habit worth correcting before the real assessment.

### The distractor families

Distractors are not random. They are built from mistakes that candidates commonly make, which means you can learn to recognize them by shape. The table below groups the families you will meet most often.

| Family | How it looks | Why it is wrong | Quick counter |
| --- | --- | --- | --- |
| Absolute language | "always," "never," "guaranteed," "without exception" | Real tools have boundaries and exceptions; absolute claims ignore them | Look for the qualifier the option erased |
| Wrong surface | Suggests a chat when the material lives in a project, or a research mode for a private document | The chosen surface cannot see the material or preserve the needed context | Match the surface to where the material and history live |
| Skipped verification | Presents a generated figure or citation as confirmed | Fluency is not evidence; the claim was never checked | Ask what independent check the option performs |
| Over-privileged access | Grants broad read or write rights when a narrow one would do | Excess access creates risk and breaks the principle of least privilege | Choose the smallest permission that completes the task |
| Polished-but-wrong output | A beautifully formatted answer that quietly omits a requested part or changes a caveat | Presentation can hide a substantive defect | Check completeness and meaning before style |

Absolute language is easy to spot once you are looking for it. The harder families are the ones that are almost right. A wrong-surface option may describe a real feature; it simply points at the wrong place. A skipped-verification option may even be helpful in ordinary circumstances; it becomes wrong the moment the output will be published or used for a decision. That is another reason to hunt for the pivot in the stem: the pivot tells you which of these families the item is testing.

There is also a subtle family worth naming: the option that answers a different question. It may be a perfectly good statement about accuracy, while the stem asked about privacy. Candidates who recognize a true statement and select it without re-reading the goal fall into this trap. Always check that the option resolves the goal you wrote in step one.

### Flagging difficult items and returning

A difficult item is not automatically a wrong answer, and spending three minutes on it does not guarantee a correct one. If you have applied the four steps and still cannot name the deciding constraint, mark the item and move on. A fresh reading later often reveals a word you skimmed the first time, and another item in the assessment may remind you of the principle you needed.

Flagging works best when it is selective. If you flag most of the assessment, returning will not help because nothing will have changed. Reserve it for items where you are genuinely torn between two options after eliminating unsafe ones. When you return, start over from the goal rather than from the answer you were leaning toward; otherwise you will simply confirm your first impulse.

Time discipline is part of judgment. A candidate who rushes through easy recognition items and then has time to think carefully about the hard ones is using the assessment well. The exam is not measuring how long you stare at a question.

### Why principles outlast product recall

Product interfaces change. Names, buttons, and plan labels shift. The reasoning that makes an answer correct does not. If you understand *why* a project space is preferable to a fresh conversation for recurring work with shared knowledge, you can answer correctly whether the item describes that space by its current name or by a generic description. If you have memorized a screen layout, a slightly different wording can leave you guessing.

This is also why the exam avoids requiring trivia. A question that turned on the exact wording of a menu label would age badly and would not test anything a careful professional needs. A question that turns on data sensitivity, verification, or access scope stays meaningful. When you study, spend your effort on the principle and let the vocabulary attach itself to it.

> **Exam note:** If an item seems to demand a brand name, look again. Usually it is testing a capability boundary that several products share, and the generic description in the options is the real subject.

## Worked scenario

An analyst is asked to prepare a short briefing for a leadership meeting. The analyst asks an assistant to summarize a set of internal planning notes and to add three supporting statistics. The assistant produces a clean, confident briefing with three precise figures and a footnote list. The analyst recognizes one figure from the notes but cannot place the other two. The meeting begins in twenty minutes. Four options are under consideration.

- Option A: Send the briefing as written, because the formatting and footnotes make it look reliable.
- Option B: Ask the assistant to regenerate the briefing with a more formal tone, then send it.
- Option C: Check each statistic against the supplied notes, remove or mark anything that cannot be confirmed, and send the reduced briefing with a note about what remains unverified.
- Option D: Paste the entire notes folder into a public conversation to get a second opinion before the meeting.

Restating the goal gives: produce a briefing that leadership can rely on in twenty minutes. The constraints are the short deadline, the internal nature of the notes, and the presence of two statistics that cannot be traced. The deciding constraint is reliability under time pressure, not presentation.

Step three eliminates Option A and Option B immediately. Both rely on polish as evidence, which is exactly the polished-but-wrong family. Option B also changes tone without addressing the substance, so it wastes the one resource the analyst has. Option D is eliminated for a different reason: it moves confidential material into a less controlled setting, trading a content problem for a privacy problem. That is an over-privileged-access error in a different costume.

Option C is the only survivor. It satisfies the deadline by reducing scope instead of extending the work, it satisfies the reliability requirement by checking each claim, and it respects transparency by telling the reader what was not confirmed. Notice that the correct option does not produce the most impressive document. It produces the most trustworthy one. A reviewer would rather receive three verified figures and an honest note than five confident figures of unknown origin.

The lesson generalizes. When time is short, reduce the claim rather than the check. When material is sensitive, keep it inside the boundary it already occupies. And when a generated answer includes specifics, treat those specifics as questions until someone has traced them.

A reviewer documenting this decision would record what was checked, what was removed, and who accepted the remaining uncertainty. That record matters as much as the briefing itself. It lets a later reader understand why two figures are missing instead of assuming an editing error, and it shows that the analyst did not treat the assistant's confidence as a substitute for evidence. If the leadership meeting later hinges on one of the unverified figures, the note tells everyone where the gap is. In an exam scenario, the equivalent of that note is your reasoning: the option that names the check and the limitation is usually the one a careful professional would choose.

## Common mistakes

- Reading the first sentence and choosing before the constraints are identified.
- Treating confident wording, footnotes, or formatting as proof that a claim was checked.
- Selecting an option that is true in general but does not answer the specific goal in the stem.
- Choosing the most feature-rich or impressive-sounding action instead of the safest useful one.
- Assuming a familiar surface is correct even when the needed material lives somewhere else.
- Spending too long on one item and then rushing through items you could have answered quickly.
- Flagging nearly every difficult item, which makes the return pass useless.

## Chapter summary

- A foundations exam samples judgment about safe, clear, and verifiable use more than recall of trivia.
- Recognition items test definitions; scenario items test decisions under constraints.
- One or two details in a scenario usually decide the answer; the rest set the scene.
- The four-step method is: restate the goal, list constraints, eliminate unsafe options, then choose the option satisfying every constraint.
- Distractor families include absolute language, wrong surface, skipped verification, over-privileged access, and polished-but-wrong output.
- Flag selectively, return with a fresh reading, and keep time for the items you can settle quickly.
- Principle-level reasoning survives wording changes that defeat memorized product details.

## Checkpoint questions

1. A question asks which statement about a tool's memory feature is correct. What type of item is this, and what reading strategy suits it best?

   - A. A scenario item; annotate every constraint before answering.
   - B. A recognition item; answer directly, or flag a genuine memory gap.
   - C. A scenario item; eliminate unsafe options first.
   - D. A recognition item; always choose the most detailed statement.

2. A scenario says a draft will be published under the team's name and contains a statistic the assistant invented. Which step of the four-step method removes the tempting option that says to publish anyway?

   - A. Restating the goal.
   - B. Listing the constraints.
   - C. Eliminating unsafe options.
   - D. Choosing the option satisfying every constraint.

3. Which option is the clearest example of the wrong-surface distractor family?

   - A. "Always verify numbers before publishing."
   - B. "Use a fresh conversation for material that lives in a restricted project space."
   - C. "Share the document with everyone so nobody is blocked."
   - D. "Rewrite the answer in a more professional style."

4. Two options remain after unsafe choices are removed. One satisfies every constraint; the other satisfies all but one. What should you do?

   - A. Choose the one satisfying every constraint.
   - B. Choose the one that sounds more thorough.
   - C. Choose the one with more detail, since detail implies care.
   - D. Flag both and leave the item unanswered.

5. Why does the exam tend to reward principle-level reasoning over brand recall?

   - A. Product names are never mentioned in questions.
   - B. Interfaces and labels change, while the underlying reasons for a decision remain stable.
   - C. Memorizing a screen layout is faster than reasoning.
   - D. Recognition items do not appear on a foundations exam.

6. After applying the four steps, you are still torn between two answers. What is the best use of your remaining time?

   - A. Stay on the item until certainty arrives.
   - B. Pick the longer option and move on.
   - C. Flag the item, continue, and return with a fresh reading later.
   - D. Flag every later item as well, in case the pattern changes.

### Answers and rationale

1. **B.** A question asking which statement is correct is a recognition item: it samples knowledge of a definition or boundary. Answer directly when you know it, or flag a real gap. **A** and **C** wrongly treat it as a scenario, which wastes time on annotation. **D** is unsafe because detail is not the same as accuracy; longer statements can include a single wrong qualifier.

2. **C.** The step that removes "publish anyway" is the elimination of unsafe options, because presenting an unverified invented figure as fact breaks a verification requirement. **A** clarifies the goal but does not itself discard the option. **B** identifies the constraint but still leaves the choice open. **D** happens after elimination and cannot rescue an option that already failed.

3. **B.** It points at a surface that cannot hold the needed material or permissions, which is the wrong-surface family. **A** is an absolute statement, so it belongs to the absolute-language family. **C** grants excessive access and matches the over-privileged-access family. **D** changes presentation without addressing substance, which is closer to the polished-but-wrong family.

4. **A.** A correct option must satisfy every constraint; one missed condition means the option fails. **B** and **C** substitute impression for the constraint test, which is exactly how polished distractors win. **D** gives up an item you can actually settle; flag only when genuine uncertainty remains after the steps.

5. **B.** Principles such as verification and least privilege stay valid when a product renames a feature or rearranges a screen. **A** overstates the point; product names may appear descriptively, but they are rarely what the item tests. **C** is false as a strategy, because layouts change. **D** is false because recognition items are a normal part of a broad assessment.

6. **C.** A selective flag plus a fresh reading later often reveals a missed word, without sacrificing time on other items. **A** can consume the whole assessment. **B** uses length as a proxy for correctness. **D** floods the return pass with items whose first reading was probably fine.

---

*End of chapter 1.*
