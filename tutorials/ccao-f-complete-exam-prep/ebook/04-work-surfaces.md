# Chapter 4 — The Four Work Surfaces: Conversation, Projects, Artifacts, Research

The same assistant can behave like four different tools, depending on where you put the work. A quick question in a conversation is one thing; a recurring analysis inside a project with uploaded knowledge is another. A draft that has been promoted into an artifact can be revised as a document, while a research request can gather material and attach citations to a claim. Candidates who treat these as cosmetic differences lose scenario marks, because the surface often determines what the assistant can see, what it can remember, and what the reader will eventually receive.

This chapter treats the four surfaces as a set of choices with consequences. You will learn what each one is for, how to recognize which one a scenario calls for, and when moving work from one surface to another is the correct next step. Response controls and voice input are covered at the end because they influence any surface rather than defining one.

## Learning objectives

- Explain how turns and attachments make a conversation useful, and why a clean thread matters.
- Describe project spaces as persistent context with uploaded knowledge and standing instructions.
- Recognize artifacts as separately rendered outputs that can be iterated independently of chat.
- Identify research-oriented modes and their role in gathering and citing sources.
- Map task types to the right surface and know when to move work between surfaces.
- Distinguish response controls from the request itself, and state the limits of voice and dictation.

## Key concepts

### Conversation: the default surface

A conversation is where most work begins. You send a turn, the assistant replies, and each subsequent turn can draw on what came before. That accumulation is the surface's great strength. If you ask for a summary, then a shorter version, then a version for a different audience, the assistant can use the earlier draft as context instead of starting from nothing. Iteration feels natural because the history is present.

Attachments extend the conversation. A supplied document, spreadsheet, or image becomes material the assistant can work with in that thread. This is useful for a bounded task with a clear endpoint. The limitation is that the thread is the unit of memory. An attachment in one thread is not automatically an attachment in another, and the context that makes iteration easy can become noise when the thread mixes unrelated topics. A conversation that began as a budget question and drifted into recruiting language can produce a response that blends both concerns.

A clean thread is therefore a practical asset. Keep the goal visible by naming the conversation, avoid pasting long irrelevant extracts, and start a new thread when the audience or purpose changes. If a task depends on a small set of files, attach those files explicitly rather than assuming the assistant remembers an earlier upload. In a scenario, phrases such as "in the same thread," "a new conversation," and "the attached document" are signals about what context is available.

Turns are also useful as a review tool. A request that asks for a draft, then a critique against stated criteria, then a revision creates a visible trail of decisions. A reviewer can see what was asked and why a change was made. By contrast, a single enormous request that mixes background, instructions, format, and verification into one paragraph is hard to audit and easy to misread. When a scenario describes a result that missed a requirement, consider whether the requirement was buried in a crowded turn; the best next step may be to restate it as a separate instruction rather than to ask for a completely different answer.

> **Exam note:** When a stem says a task will repeat next week with the same background material, a conversation is usually the wrong surface. Think about a project instead.

### Projects: persistent context and knowledge

A project space is a container for ongoing work. It can hold uploaded knowledge, standing instructions, and a collection of conversations that share that background. The point is persistence. Instead of restating the role, the format, and the boundaries in every request, you set them once at the project level and let each conversation inherit them. A team can work in the same space without re-uploading the same documents each time.

The value is easy to underestimate. Consider a reviewer who evaluates supplier proposals every month. The criteria are stable, the format of the evaluation is stable, and only the proposals change. A fresh conversation every month would require the reviewer to re-explain the criteria and reattach the rulebook, with ample opportunity for drift. A project with the rulebook uploaded and the evaluation format written as standing instructions keeps the method constant. The reviewer's request can then be short, because the context is already in place.

Persistence also creates duties. Stale documents can sit in a project long after a policy changes, and two files may contradict each other. Standing instructions can quietly shape answers that nobody re-reads. A project needs an owner, a review cadence, and a habit of removing or marking superseded material. In a scenario, if a project contains an old policy and a new one, the correct step is to resolve the conflict before asking for an answer, not to hope the assistant chooses correctly.

Projects are ideal when work recurs, when several people need the same background, and when the context is too large or too stable to repeat in each prompt. They are unnecessary for a one-off question. Creating a project for a single request adds setup without benefit. The exam often tests this distinction by describing either a repeated workflow or a single task and asking where the work belongs.

Ownership is part of the design. A shared project should have someone responsible for deciding which documents belong there, when instructions are revised, and when obsolete files are removed. Without that role, a project slowly accumulates contradictions: a retired policy beside a current one, a draft beside an approved version. A scenario that mentions conflicting guidance is usually testing whether you notice the conflict before generating an answer. The right response is to identify the authoritative source and either remove the stale material or mark it clearly, then proceed. Hoping that the assistant will resolve the contradiction on its own is not a defensible choice.

### Artifacts: outputs with their own life

An artifact is an output rendered separately from the conversation. It might be a document, a block of code, a visual draft, or a simple interactive view. The important feature is separability: once an output becomes an artifact, it can be opened, revised, and shared as a thing in its own right. The conversation remains the record of how it was made, but the artifact is what a reader will actually use.

That separation changes how iteration works. In a conversation, asking to change a paragraph produces a new reply. In an artifact, a reviewer can point at a specific section, ask for a change, and see the revised version in place. This is especially useful for long documents, where tracking the current version in a chat thread becomes difficult. It also supports different output types. A table of numbers may be better as a structured view; a prototype may be better as a simple interactive sketch than as prose describing one.

Artifacts do not make content correct. A polished document artifact can carry the same fabricated figure as a chat reply. The review duty is unchanged, and perhaps increased, because an artifact looks finished and may be shared more widely. A careful workflow moves a draft into an artifact once its substance has been checked, then uses the artifact for format and presentation refinements. Moving too early encourages people to polish content that has not been verified.

The range of artifact types is worth noting because it affects surface choice. A written document suits narrative and explanation. Code suits transformations and calculations that need to be inspected. A visual draft suits layout, diagrams, and early design conversations. A simple interactive view suits cases where a reader needs to explore options rather than read about them. In each case the artifact gives the output a stable identity, so a reviewer can refer to a part of it without ambiguity. That stability is the reason to promote work rather than leaving it as the latest message in a thread.

| Surface | Best for | What it keeps | Main risk |
| --- | --- | --- | --- |
| Conversation | Bounded tasks, iteration, quick questions | The running thread and its attachments | Context drift in a mixed or very long thread |
| Project | Recurring work with shared background | Uploaded knowledge and standing instructions | Stale or conflicting knowledge |
| Artifact | Shaping and iterating a concrete output | A separately rendered draft or view | Polish hiding unverified content |
| Research mode | Questions needing gathered, cited sources | Source discovery and attribution | Unchecked sources or over-reliance on one result |

### Research modes: gathering and citing sources

Research-oriented modes gather material from sources and present answers with references. They are useful when the task depends on information that is not already in the thread or project and when the reader needs to see where a claim came from. A review of current guidance, a comparison of published positions, or a summary of external material all fit this surface. The output is not just an answer but a path back to the sources that support it.

The limits matter as much as the benefit. A source can be found and still be irrelevant, outdated, or misinterpreted. Citations can be attached to the wrong sentence. A single generated synthesis can smooth over a disagreement between sources. Research mode reduces the burden of finding material; it does not transfer the duty of judging it. A reviewer should open the cited sources, confirm that they say what the answer claims, and note where sources conflict.

Attribution also needs a check of proximity. A reference appended to a paragraph may support only the first sentence in it, leaving the rest ungrounded. A careful reader traces each material claim to a specific passage rather than assuming that one citation covers an entire section. When a scenario mentions a sourced answer that still contains one unsupported statement, the correct diagnosis is not that research mode failed completely. The diagnosis is that attribution was treated as a blanket guarantee instead of a claim-by-claim check.

Research mode is also the wrong choice for private material that should not leave its boundary. If the answer depends on an internal document already uploaded to a project, sending a research request across the open web adds no value and may create a disclosure problem. In a scenario, ask whether the needed facts are internal or external. If they are internal, ground the request in the project. If they are external, research mode is appropriate, with verification of the sources it returns.

> **Common mistake:** Treating a citation as proof. A reference tells you where to look; it is not the same as a checked claim.

### Choosing and moving between surfaces

Surface choice follows the work. Start in a conversation for a bounded task. Move into a project when the task recurs, needs shared knowledge, or depends on standing instructions. Promote a stable draft into an artifact when the output will be revised, reviewed, or shared as a document. Switch to a research mode when the evidence must be gathered from outside and attributed.

| Task type | Recommended surface | Reason |
| --- | --- | --- |
| Ask a single question about an attached file | Conversation | Bounded context, one clear endpoint |
| Rewrite the same report every month | Project | Stable criteria and knowledge reuse |
| Build a document with several revision rounds | Artifact | Iteration happens on the output itself |
| Compare current external guidance with citations | Research mode | Source gathering and attribution matter |
| Prepare a quick visual sketch of an idea | Artifact | A visual view communicates better than prose |
| Discuss a draft before deciding its structure | Conversation | Dialogue is the point |
| Keep a shared rulebook available to a team | Project | Persistence and shared access |
| Verify an internal figure against a policy file | Conversation or project with the file | Grounding in supplied material, not external search |

Moving surfaces should be deliberate. When you move work into a project, state the purpose and make sure the standing instructions match the new task; otherwise inherited instructions can distort the answer. When you promote a draft into an artifact, carry forward the verified claims and the caveats, not just the pleasant wording. When you return from research to a project, attach the sources you accepted so that the next person can see them. A move that loses evidence is a step backward.

```text
SURFACE SELECTION GUIDE
Will this task repeat with the same background?  yes -> PROJECT
Do several people need the same instructions?    yes -> PROJECT
Is the main work shaping a document or view?     yes -> ARTIFACT
Must evidence be gathered from outside sources?  yes -> RESEARCH MODE
Is it a bounded question with an attachment?     yes -> CONVERSATION
Am I moving work?  Carry: verified claims, caveats, source references.
Am I finishing work?  Check: completeness, meaning, then presentation.
```

### Response controls versus the request

Response controls shape how an answer is delivered. Length, verbosity, tone, and format controls can live in a session, a project, or a user preference. They are useful for stable habits: a reviewer who always wants brief bullet summaries can set that once. The request, by contrast, states what is needed for this particular task. If today's output must be a table with three named columns, that belongs in the request, because it is a condition of this deliverable rather than a lasting preference.

Confusing the two leads to weak instructions. A user may rely on a global "concise" setting and then wonder why a detailed comparison is thin. Another may restate a permanent preference in every request, crowding out the actual task. The exam rarely asks which layer a product stores where. It asks whether you recognize that a task-specific requirement should be made explicit and visible to anyone reviewing the work.

Controls also interact with surface. A tone setting inherited from a project can affect every conversation inside it, which is helpful for consistency and risky if one conversation needs a different register. Format instructions in an artifact request may be better expressed as edits to the artifact than as a long paragraph of description in chat. The principle is the same across cases: put durable preferences in durable places, and put task conditions where the task is described.

### Voice and dictation entry points

Voice and dictation let you speak a request instead of typing it. They are entry points into any of the surfaces; they do not form a surface of their own. Their benefit is clear when typing is slow or impossible, and they can make a brainstorming session more natural. Their limitation is accuracy. Recognition systems can mishear names, acronyms, product terms, dates, and numbers. A dictated instruction to "include the twenty three figure" may arrive as something quite different.

A careful user reviews dictated text before sending it and treats any dictated figure or proper noun as unverified. For a request that will produce a work product, typing the critical terms is safer. In a scenario, if a spoken request produced a wrong date, the correct fix is to correct the input and check the output, not to ask the assistant to sound more certain. Voice input also does not change permissions or verification duties. It is a faster way to reach the same set of responsibilities.

## Worked scenario

A coordinator is preparing a monthly quality review. Each month the same criteria are applied to a small set of reports, the result is circulated as a short document, and a reviewer adds comments before release. The coordinator currently opens a fresh conversation, retypes the criteria, attaches the reports, asks for a summary, and then pastes the reply into a document. Comments arrive in chat, and the current version is hard to identify. Four proposals are on the table.

- Keep everything in one long conversation so that all history remains available.
- Set up a project with the criteria and a sample report uploaded, write the evaluation format as standing instructions, and start a new conversation inside it each month.
- Use a research mode for each review so that sources are gathered automatically.
- Dictate the criteria each month to save typing time.

Restating the goal gives: produce a consistent, reviewable monthly evaluation with a clear current version. The constraints are recurrence, stable criteria, a shared reviewer, and a document that people will comment on. The deciding constraint is recurrence with stable context.

The first proposal keeps history but not structure. A single growing thread makes it harder, not easier, to find the current version and risks mixing months. The third proposal pulls in external sources when the evidence is internal, which adds no value and may blur the boundary. The fourth proposal changes input speed without addressing the actual problem. The second proposal is the only one that satisfies every constraint: the project holds the criteria and instructions, each month's conversation stays focused, and the output can be promoted to an artifact for review.

The reviewer then promotes the checked draft into an artifact, where comments attach to specific parts of the document. Small changes are made there, while the conversation remains the record of the reasoning. Before release, the reviewer confirms that every criterion appears in the final document and that the numeric findings match the attached reports. The surface changed twice — conversation to artifact — and each move preserved the evidence. That is the pattern the exam is looking for: the right surface at each stage, with nothing lost in transit.

## Common mistakes

- Continuing a mixed-purpose thread instead of starting a focused conversation for a new goal.
- Creating a project for a single one-off question, adding setup without benefit.
- Leaving old and new policy documents side by side in a project without marking which applies.
- Promoting a draft to an artifact before its claims have been checked.
- Using research mode for material that already exists inside a private project.
- Treating a citation as proof rather than as a pointer to a source that must be read.
- Assuming a global tone or length setting can replace a task-specific format request.
- Trusting dictated names, dates, and figures without reviewing them.

## Chapter summary

- The conversation is the default surface: turns and attachments support iteration, but context can drift.
- Projects hold persistent knowledge and standing instructions, which suit recurring and shared work.
- Artifacts render outputs separately so that documents, code, visual drafts, and simple views can be iterated.
- Research modes gather external material and cite it, but the sources still need human judgment.
- Surface choice follows the work, and moving between surfaces must preserve claims, caveats, and evidence.
- Response controls express durable preferences; task-specific format and length belong in the request.
- Voice and dictation speed up entry but can distort exact terms and numbers.

## Checkpoint questions

1. A team applies the same evaluation criteria every month and wants new contributors to follow them. Which surface fits best?

   - A. A fresh conversation each month with no shared material.
   - B. A project with uploaded criteria and standing instructions.
   - C. A research mode search each month.
   - D. A dictated request each month.

2. What mainly distinguishes an artifact from a reply in a conversation?

   - A. An artifact is always shorter.
   - B. An artifact is separately rendered and can be iterated as its own output.
   - C. An artifact cannot contain code.
   - D. An artifact never needs review.

3. A request depends on a confidential internal policy already stored in a project. What is the appropriate source strategy?

   - A. Use research mode to find the policy on the open web.
   - B. Ground the request in the supplied project material.
   - C. Ask for a more confident answer.
   - D. Delete the project and start a new conversation.

4. Which item belongs in the request rather than in a durable response control?

   - A. A general preference for brief answers.
   - B. A standing tone used across all reports.
   - C. A one-time requirement for a table with three named columns.
   - D. A habit of using bullet points in personal notes.

5. What is the main accuracy limitation of dictation?

   - A. It cannot create conversations.
   - B. It may mishear names, acronyms, dates, and numbers.
   - C. It only works inside artifacts.
   - D. It automatically verifies sources.

6. When promoting a checked draft into an artifact, what should be carried forward?

   - A. Only the most polished sentences.
   - B. Verified claims, caveats, and source references.
   - C. The entire mixed conversation, unedited.
   - D. Nothing; artifacts start fresh by design.

### Answers and rationale

1. **B.** A project keeps criteria and instructions stable and shared across recurring work. **A** repeats setup and invites drift. **C** seeks external sources that are not needed. **D** changes input method, not context.

2. **B.** An artifact has a separate rendering and its own iteration path. **A** is irrelevant to the definition. **C** is false because code is a common artifact type. **D** is false; review duties remain.

3. **B.** Internal material already in the project should be used as the ground for the request. **A** adds disclosure risk and unnecessary searching. **C** changes confidence, not evidence. **D** discards the useful context.

4. **C.** A one-time structural requirement is a condition of this task and should be explicit in the request. **A**, **B**, and **D** describe durable preferences, which are better placed in settings or standing instructions.

5. **B.** Recognition errors affect exact terms and figures, so dictated content needs review. **A** is false. **C** is false; dictation is an entry point to any surface. **D** confuses transcription with verification.

6. **B.** Preserving verified claims, caveats, and sources keeps the artifact trustworthy and reviewable. **A** drops substance. **C** carries clutter that can confuse reviewers. **D** discards the work that was already checked.

---

*End of chapter 4.*
