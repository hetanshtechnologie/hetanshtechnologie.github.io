# Chapter 1 — Getting Oriented: Scope, Study Method, and Exam Mindset

## Learning objectives

- Identify the audience for this course and the kind of judgment a foundations-level architecture exam is designed to measure.
- Distinguish recalling a technical term from defending a design trade-off under constraints.
- Read a scenario question by locating the constraint that actually decides the answer.
- Explain how this book is sequenced and why that sequence follows learning logic instead of a published syllabus.
- Apply a study cycle of predict, read, apply, verify, and revisit.
- Keep a decision journal that converts each practice question into a reusable design lesson.
- Manage study time and exam time, including a deliberate pass over flagged questions.

## Key concepts

### Who this book is for

This is an independent study aid for people who make decisions about systems that use a language-model assistant. That includes architects, software engineers, product leads, business analysts, and reviewers who must choose an approach rather than simply operate a tool. You do not need to write production code every day. You do need to accept a basic premise: every design choice has consequences. A choice changes what the system can notice, what it is allowed to do, how much it costs to run, how quickly it responds, and how easily a person can check its work.

If your job is to approve designs, this book gives you a vocabulary for asking better questions. If your job is to build them, it gives you a set of patterns to reach for and failure modes to avoid. If your job is to evaluate risk, it gives you a way to separate a plausible demonstration from a system that will behave predictably on a difficult day. The common thread is design judgment, not tool familiarity.

> **Exam note:** This book is independent and unofficial. It is not affiliated with, endorsed by, or authorized by any exam provider. Treat it as a structured way to practice thinking, not as a statement of official requirements.

### What the exam is really measuring

A foundations-level architecture exam is generally built to test design judgment under constraints. The questions tend to describe a situation, place limits around it, and ask which approach best satisfies those limits. The limits might be technical, such as a bounded budget for working context or a tool that can only return a limited result. They might be organizational, such as a rule that a certain class of action always needs approval. They might be operational, such as a requirement that a failed step must not be repeated with a side effect.

Trivia, by contrast, asks whether you can retrieve a label. Knowing that a particular configuration file exists is trivia. Knowing when that file should carry a rule instead of a retrieval-based knowledge source is judgment. The exam is interested in the second kind of knowledge. That is why so many questions are written as short stories rather than definitions: the story supplies the constraints that make one answer defensible and the others merely reasonable.

The practical implication is that you should study decisions, not just terms. For every concept in this book, ask three questions: what problem does it solve, what does it cost, and when would you deliberately not use it. A concept you can only define is fragile. A concept you can place in a trade-off is durable.

### Reading a scenario question

Scenario questions reward a repeatable reading routine. The goal is to find the constraint that decides the answer. Most scenarios contain several details that are true but not decisive, and one or two details that change the correct choice. If you treat every sentence as equally important, you will gravitate toward the most familiar technology rather than the most appropriate design.

Use this routine. First, identify the goal the scenario is trying to achieve. Second, list the constraints explicitly, separating hard constraints from preferences. A hard constraint is phrased as a requirement, a prohibition, a limit, or a condition that cannot be relaxed. Third, notice any asymmetry in risk. If one kind of mistake is far more expensive than another, the correct answer will usually be the one that prevents the expensive mistake. Fourth, only then compare the options.

Consider a scenario in which an assistant may draft a message but must never send it without review. The deciding constraint is not the quality of the draft; it is the prohibition on unreviewed sending. An option that improves wording but removes the review gate fails. An option that adds a check before the send action succeeds, even if the wording is unchanged. Once you see the constraint, the answer becomes obvious. Without it, several options look attractive.

> **Try it:** When you practice, underline or mentally tag the single phrase that makes the answer unique. If you cannot find such a phrase, you may be looking at a question that tests recall rather than judgment, or you may have missed a detail.

### Recall versus a defended trade-off

Recall and defense are different skills. Recall is recognizing a term after reading it. Defense is explaining why a choice is right for this situation and why the plausible alternatives are wrong here. An exam built around judgment will often present options that are all correct in some context. The one that wins is the one that fits the stated constraints.

A useful test is the "because" test. If you can finish the sentence "the right choice is X because the scenario says Y," you are defending a trade-off. If your reasoning stops at "X is a best practice," you are recalling a slogan. Best practices are context-dependent summaries; they are not arguments. In a constrained scenario, a so-called best practice can be the wrong answer precisely because it ignores a limit the scenario made important.

This distinction also changes how you review mistakes. When you miss a question, do not only record the correct letter. Record which constraint you failed to notice and which alternative tempted you. That turns a single miss into a general lesson about your reading habits.

### How this book is organized

The chapters are grouped by learning logic, not by the ordering of any published syllabus. Foundations come first because you cannot evaluate an agent design without a mental model of how a model produces text and what the platform around it provides. The agentic, tool, workflow, prompt, and context concerns follow in that order because each one builds on the previous one: an agent calls tools, tools run inside workflows, workflows are steered by prompts, and all of them compete for context. Later chapters cross the boundaries between these areas and then apply them to case studies and full practice papers.

This order differs from a syllabus because a syllabus is usually arranged for administrative convenience, while a book can be arranged for understanding. You will occasionally meet a concept before the chapter that treats it in full. That is deliberate. Early mentions give you a working sketch; later chapters replace the sketch with a precise model.

Three concerns run through every layer and deserve attention from the start. Reliability asks what happens when a step fails or returns something unexpected. Governance asks who may authorize an action and how that permission is enforced rather than merely requested. Cost asks what a design consumes in tokens, tool calls, time, and human attention. These concerns rarely appear as a single topic in a question. Instead they appear as a detail inside a scenario that changes which design is acceptable. A strong reader treats them as lenses and checks each one before settling on an answer.

Question types also map to different study responses. The table below is a guide for turning practice into targeted work.

| Question type | What it tests | Study response |
| --- | --- | --- |
| Constraint identification | Finding the requirement that decides the answer | Practice tagging hard limits before reading options |
| Term recognition | Recalling a name or definition | Build short definitions, then place each in a trade-off |
| Trade-off defense | Choosing among plausible options | Explain why each rejected option fails under the stated limits |
| Failure diagnosis | Spotting why a design will break | Trace the failure path and name the missing safeguard |
| Case study | Extracting a deciding detail from noise | Summarize the scenario in one sentence before comparing answers |

### The study cycle

Use a five-step cycle for each chapter: predict, read, apply, verify, revisit. Predict means looking at the objectives and writing down what you already believe. This is not a test of correctness; it is a way of activating what you know and exposing gaps. Read means working through the explanations actively, comparing them with your predictions. Apply means using the idea in a new situation, usually a worked scenario or a checkpoint question. Verify means checking your reasoning against the rationale, not merely checking the letter. Revisit means returning to the idea later, after other chapters have changed your perspective.

The cycle matters because passive recognition is misleading. Reading a clear explanation produces a feeling of understanding that does not survive a scenario question. Prediction and application create the friction that makes the knowledge usable. Revisit is the step most people skip, and it is the step that prevents early chapters from fading.

A first session should establish the habit rather than cover ground quickly. The checklist below is deliberately small.

```text
FIRST-SESSION CHECKLIST

[ ] Read the learning objectives and write one prediction for each.
[ ] Name the hard constraint in the worked scenario before reading the resolution.
[ ] Attempt every checkpoint question without notes.
[ ] Write one decision-journal entry for the question you found hardest.
[ ] Note one concept you can define but cannot yet defend in a trade-off.
[ ] Schedule a brief revisit of that concept after the next chapter.
```

### The decision journal

A decision journal is a short record of the choices you make while practicing. It is not a diary and it does not need prose. For each practice question, record the deciding constraint, your chosen option, the correct option, the reason your chosen option lost, and one general rule you want to remember. Over time, patterns appear. You may notice that you consistently underweight cost constraints, or that you keep choosing options that skip verification because they sound efficient.

> **Common mistake:** Keeping a list of correct letters. A letter tells you what happened; a journal tells you why. The why is what transfers to a new question.

Review the journal weekly. Group entries by failure theme rather than by chapter. A theme such as "ignored an approval requirement" is far more useful than a page of question numbers, because the same theme will appear in many disguises.

### Managing study time and exam time

Study time is best spent in short, focused blocks with a clear output for each block. An output might be a completed journal entry, a rewritten prompt, or a defended answer to a scenario. Blocks with an output are easier to resume than blocks defined only by duration. Protect a small amount of time at the end of each block for the revisit step.

During the exam, use two passes. On the first pass, answer what you can decide quickly and flag anything that requires extended reasoning. Flagging is a decision, not a surrender: it keeps a hard question from consuming the time needed by several easier ones. On the second pass, return to flagged questions with the remaining time. By then, later questions may have reminded you of a relevant idea, and your earlier uncertainty may resolve.

Watch for the point where continued thought stops producing progress. If you have compared the options twice and nothing has changed, mark the question, choose the best remaining candidate, and move on. The goal is not perfect certainty on every item; it is the best total result across the whole paper.

> **Exam note:** Never leave a blank when the format allows an answer. A reasoned elimination is better than an empty response, and flagging does not require you to leave the item unanswered.

## Worked scenario

A practice scenario describes a team that wants an assistant to summarize incoming support requests and propose replies. The team has one firm rule: no reply may reach a customer until a person has approved it. Speed matters, and the team is considering a design that lets the assistant send low-risk replies automatically to save time.

The options are these. One option improves the summary quality and leaves the sending step automatic. A second option adds an approval gate before sending but keeps the current summary quality. A third option automates sending only for requests the assistant classifies as low risk. A fourth option removes the approval gate but adds a log of every sent reply.

The first step is to find the deciding constraint. It is the firm rule about approval, not the goal of speed. Speed is a preference; approval is a prohibition. The moment a design sends without review, it violates a hard limit, regardless of how accurate the classification might be.

The second option wins. It preserves the approval gate, so it satisfies the constraint, even though it does not improve the summary. The first option improves a nice-to-have while breaking the rule. The third option is tempting because "low risk" sounds careful, but the scenario gives no authority to replace human approval with model classification; that is a scope shift from a rule to a guess. The fourth option confuses logging with approval: a record of what happened is not a check that happened before the action.

The lesson to journal is general: when a scenario states a prohibition, any option that removes it fails before its other merits are considered. A separate lesson is that classification confidence is not the same as permission.

## Common mistakes

- Treating the first plausible option as correct without searching the scenario for a deciding constraint.
- Confusing a preference, such as speed, with a hard requirement, such as a prohibition on unreviewed actions.
- Studying terms in isolation instead of attaching each term to a problem, a cost, and a situation where it should not be used.
- Reviewing only the correct answer and skipping a careful explanation of why each distractor failed.
- Letting one difficult question consume time needed elsewhere instead of flagging and moving on.
- Ignoring the revisit step, so early learning fades before later chapters reinforce it.

## Chapter summary

- This book is independent and unofficial, and it teaches design judgment rather than official exam content.
- The exam is best approached as a set of constrained design decisions, not a set of definitions to memorize.
- Scenario questions are solved by locating the hard constraint and checking which option preserves it.
- Defending a trade-off means naming why the winner fits and why each alternative fails under the stated limits.
- The chapters follow learning logic, building from foundations through agents, tools, workflows, prompts, and context.
- The study cycle is predict, read, apply, verify, revisit, supported by a decision journal organized around failure themes.
- Use two exam passes, flag rather than struggle, and make a reasoned choice before moving on.

## Checkpoint questions

1. Which approach best prepares for a foundations-level architecture exam?

A. Memorizing every term in the syllabus
B. Practicing decisions under stated constraints
C. Reading only worked solutions
D. Focusing on product names rather than design limits

2. In a scenario question, which detail should be identified first?

A. The most familiar technology mentioned
B. The option with the longest description
C. The hard constraint that makes one answer unique
D. The desired performance improvement

3. What does the "because" test check?

A. Whether you can attach your choice to a specific scenario detail
B. Whether you can spell a technical term
C. Whether you have read every chapter
D. Whether an option sounds like a best practice

4. Why does this book reorder topics compared with a syllabus?

A. Because syllabi are always incorrect
B. Because learning logic builds understanding across dependencies
C. Because product names change frequently
D. Because case studies must appear first

5. What belongs in a decision journal entry?

A. Only the correct answer letter
B. The deciding constraint, the reason the chosen option lost, and a general rule
C. A transcript of the whole scenario
D. A list of chapters still to read

6. What is the purpose of flagging a question during the exam?

A. To mark it for a later pass without spending excessive time now
B. To indicate that the question should be skipped entirely
C. To request additional time from the supervisor
D. To record that the question was answered incorrectly

7. A scenario says a design must not produce unreviewed external actions, but speed is described as important. Which reading is correct?

A. Speed is the hard constraint, so review may be dropped
B. Both statements are preferences and either can be traded away
C. The prohibition is the hard constraint, so review must remain
D. Logging the action afterwards satisfies the prohibition

### Answers and rationale

**1. Correct answer: B.** Design judgment under constraints is the target, so practicing decisions transfers directly. A is weak because term recall alone does not resolve a constrained scenario. C is weak because reading solutions without producing your own reasoning creates false confidence. D is weak because product names are identifiers, not the limits that decide a design.

**2. Correct answer: C.** The deciding constraint is what makes one option uniquely correct. A is wrong because familiarity is a bias, not evidence. B is wrong because length says nothing about correctness. D is wrong because a performance goal is usually a preference that yields to a hard limit.

**3. Correct answer: A.** The test asks you to connect a choice to a specific detail, which is the essence of defense. B is wrong because spelling is not reasoning. C is wrong because coverage is not the same as understanding. D is wrong because an unexamined best practice is exactly what the test is designed to challenge.

**4. Correct answer: B.** The sequence follows dependencies so that later ideas rest on earlier ones. A is wrong because the claim is about purpose, not correctness. C is wrong because naming stability is not the reason given. D is wrong because case studies appear later, once the concepts they combine are in place.

**5. Correct answer: B.** A useful entry captures the constraint, the failure in reasoning, and a portable lesson. A is wrong because a letter carries no explanation. C is wrong because copying the scenario does not analyze it. D is wrong because a reading list is planning, not reflection.

**6. Correct answer: A.** Flagging defers a hard item so it can receive attention on a second pass. B is wrong because flagging is not abandonment. C is wrong because no arrangement is implied. D is wrong because you flag before knowing the outcome.

**7. Correct answer: C.** A prohibition is a hard limit, so review cannot be removed to serve speed. A is wrong because it reverses the priority stated in the scenario. B is wrong because a prohibition is not a preference. D is wrong because a log records an action after the fact and cannot substitute for a check before it.

---

*End of chapter 1.*
