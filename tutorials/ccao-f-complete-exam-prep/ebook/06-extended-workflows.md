# Chapter 6 — Extended Workflows: Deep Chats, Research, Artifacts, Projects, Scheduling, Design

Some tasks outgrow a single exchange. A researcher may need to gather evidence, an author may need to revise a document several times, and a team may need a shared space that remembers its purpose. This chapter follows work as it extends across turns, surfaces, and time. The aim is to match the activity to the right working surface and to keep judgment where it belongs.

## Learning objectives

- Explain how a conversation can be built across turns rather than treated as a single exchange.
- Describe an end-to-end research flow from an initial question to a sourced answer.
- Trace an artifact from first draft through iteration to sharing.
- Set up a project space with a clear purpose, useful knowledge, and questions that draw on it.
- Describe, at a principle level, code-adjacent surfaces and browser extensions.
- Explain how styles and personal preferences shape output without replacing clear instructions.
- Recognise slides, prototypes, and one-page documents as artifact variants.
- State what scheduled or recurring tasks require to work safely.

## Key concepts

### Building on earlier turns

A conversation is more than a queue of independent questions. Each turn can change the context in which the next turn is understood, which means a skilled user can shape a result gradually instead of demanding it all at once. A first turn might establish the audience and goal. A second might narrow the scope after the assistant's first answer reveals an assumption. A third might ask for a specific section to be expanded. By the end, the output reflects a series of decisions rather than one hopeful request.

This approach works because the assistant carries the earlier turns forward. When a user says to make the second paragraph shorter and keep the caveat, the assistant can identify the intended paragraph because it is still in view. The alternative, restating the entire task with one more tweak, wastes effort and often loses earlier agreements. Building on turns is therefore both efficient and more accurate, provided the thread stays clean.

A clean thread is one where each turn adds something and nothing important is buried. When a conversation has wandered, the assistant may give weight to an early idea that has since been discarded. A good habit is to summarise the current state occasionally, telling the assistant that the structure has been agreed and a particular section has been dropped, and asking it to continue from there. This resets the shared understanding without starting over.

There is a limit. Context is finite, and a very long thread can crowd out detail or dilute attention. When a conversation has grown unwieldy, starting a fresh thread with a concise summary and the relevant attachments is often better than continuing. The candidate should be able to recognise both signals: continue when the recent turns are the useful ones, restart when the thread has become a maze.

> **Exam note:** A scenario that asks how to improve an answer after several exchanges is usually testing the ability to refer back to earlier turns precisely, not to rewrite the whole brief.

### A complete research flow

Research-oriented behaviour turns a question into a supported answer. It is not simply a longer chat; it is a sequence with distinct phases. Understanding the phases helps the candidate decide when research mode is appropriate and what to check at the end.

The flow begins with a question framed broadly enough to allow discovery but narrowly enough to be answerable. Asking what should be done about supplier risk is too vague. Asking what the main reported causes of delay among tier-one suppliers are, and what evidence exists for each, gives the assistant a target. The framing step is where the user decides what counts as a satisfactory answer, including the kinds of sources that would be acceptable.

The next phase is gathering. In a research mode, the assistant may look across multiple sources and keep track of which claim came from which place. This is the feature's central promise: sources can be cited so the reader can trace them. The user should still check that the sources are appropriate. A source that is recent but irrelevant is no better than one that is relevant but outdated.

The third phase is synthesis. Here the assistant organises findings into an answer, ideally separating what is well supported from what is uncertain. A good research answer names disagreements between sources rather than smoothing them away. If two credible sources conflict, the conflict is itself a finding that the reader needs to see.

The final phase is verification. The candidate should trace at least the most important citations to their origins, confirm that numbers and dates match, and check that the answer did not quietly drop a qualifier that appeared in the source. Research mode reduces the effort of finding sources; it does not remove the duty to validate them.

> **Common mistake:** Assuming that a cited answer has been fully checked. Citations are leads for verification, not proof that verification already happened.

### From first draft to shared artifact

Artifacts are outputs that live beside the conversation in their own space, so they can be opened, edited, and revisited as objects in their own right. A document artifact is the most familiar, but the same idea applies to a table, a piece of code, or a visual draft. The workflow matters more than the type.

The flow starts with a first draft that is intentionally complete enough to react to. A draft that is only an outline gives the reviewer little to push against. A draft that includes headings, a recommendation, and a caveat gives the reviewer something concrete to accept or change. The goal of the first pass is not perfection; it is to create a shared object.

Iteration then proceeds through specific requests. Moving the recommendation to the top, replacing jargon in a named section, or adding a row for an alternative option are all actionable. Each change should be followed by a quick check that earlier content was not disturbed. Artifacts make this easy because the reviewer can compare versions rather than trusting a verbal claim that the edit was made.

Sharing is the final phase and the one most often rushed. Before an artifact leaves the immediate team, the user should confirm three things: the content is accurate, the format suits the recipient, and the access level is correct. A shared link that is broader than intended is a common and avoidable error. If the artifact contains internal figures, the sharing decision is a data-handling decision.

The artifact flow differs from the research flow in its centre of gravity. Research is about evidence; artifacts are about a usable object. Both end in verification, but what is verified differs: sources in one case, structure and readiness in the other.

### Project walkthrough: purpose, knowledge, questions

A project space combines ongoing conversation with uploaded knowledge and standing instructions. A realistic walkthrough shows why the setup matters.

Imagine a team that advises on community grants. It sets up a project space with a plain purpose statement: to answer questions about eligibility using the current grant handbook and the current frequently asked questions. It uploads only those documents, removes copies from the previous cycle, and writes a short instruction saying that answers must cite the handbook section and must flag when the questions document is silent. It then asks a representative question and checks that the answer behaves as intended before inviting others to use the space.

The purpose statement is not decoration. It tells the assistant what the space is for and, just as usefully, what it is not for. A project meant to answer eligibility questions should not drift into drafting promotional copy. Scope statements reduce that drift.

Knowledge organisation determines whether retrieval is predictable. Documents should be current, clearly named, and free of contradictions. If two versions of a policy are present, the assistant may draw from the wrong one. The team should keep a single source of truth and remove superseded files. Freshness matters: a policy document from a prior cycle is a liability, not an asset.

Asking across the project means posing questions that require the uploaded material rather than general knowledge. Asking which applicants are ineligible according to the handbook is a project question. Asking what a grant is in general does not test the knowledge base. Testing with representative questions before wide release is the practical way to confirm the setup works.

> **Try it:** Set up a small project with two short documents, one current and one marked obsolete. Ask the same question twice, once with both documents present and once after removing the obsolete one. Note how conflicting knowledge changes the answer.

### Code-adjacent and browser surfaces

Some assistants extend beyond the chat window into surfaces where work already happens. At a principle level, these fall into two groups. The first is code-adjacent: an assistant that can read a repository, suggest edits to files, and help reason about a change. The second is browser-based: an extension or companion that can read the page a user is viewing and answer questions in that context.

The value of a code-adjacent surface is that it meets the developer where the work is. Instead of copying a function into a chat, the assistant can be pointed at the file, and a suggested change can be reviewed as a difference between versions. The principle to remember is that review still belongs to a human. A suggested edit is a proposal, and the developer remains accountable for what is committed. Access should be scoped to the smallest useful set of files, and generated code should be tested.

A browser companion works similarly for web content. It can read the page in context, summarise it, or compare it with another page the user has open. The convenience is real, but so is the trust question. A page is untrusted content. If the page contains text that looks like an instruction to the assistant, that text should be treated as content to analyse, not as a command to follow. This connects directly to the principles of handling untrusted source text.

Both surfaces illustrate a broader point for the exam: capability is not the same as authority. A tool can be able to read a page or edit a file and still be subject to rules about what it should do. The candidate should look for answers that pair capability with appropriate limits.

### Styles and personal preferences

Customization lets users shape how an assistant responds without restating the same choices each time. Styles are usually named configurations that adjust tone, format tendencies, or level of detail. Personal preferences work more quietly, accumulating from settings and from what the assistant has learned about the user.

The important principle is that customization is a default, not an override of an explicit request. If a user has set a concise style but then asks for a detailed explanation, the detailed request should win. Layered guidance works from general to specific: broad preferences fill gaps, and the instruction in the current turn governs the immediate answer. When the two appear to conflict, the candidate should suspect that the in-turn instruction was not clear enough.

Styles are useful because they reduce repeated typing and make output more consistent. They are also easy to misuse. A style that pushes every answer toward a breezy tone may be wrong for a formal report. A style that always adds headings may clutter a short reply. The remedy is to choose a style that matches the dominant kind of work and to override it deliberately when the task changes.

Customization should be documented in team settings where relevant. If a shared workspace relies on a particular style for client-facing drafts, new members should know that it exists and why. Otherwise, output quality depends on invisible defaults that no one can explain.

### Artifact variants: slides, prototypes, and one-page documents

The artifact idea extends to several useful shapes. Slides turn an outline into a sequence of visual frames, each with a headline and a small amount of text. A prototype offers a rough interactive view of an interface or a report, good for testing an idea before investing in a full build. A one-page document compresses a topic into a single scanning surface, often combining a summary, a few key points, and a recommendation.

Each variant has a matching use. Slides suit a live presentation where the speaker carries the detail. Prototypes suit a discussion about how something should work, where seeing a rough version prompts better feedback than reading a description. One-page documents suit a busy reader who needs a decision, not a treatise. Choosing the variant is a decision about the audience's next action.

The trap is to generate a variant before deciding what it is for. A slide deck requested with no audience in mind tends to become paragraphs pasted onto rectangles. A prototype with no question to answer becomes a toy. The user should state the decision the artifact should support, then choose the shape.

All variants need the same verification as any other output. A slide with a wrong number is still wrong, and its visual polish can make the error harder to notice. A prototype that implies a feature the system does not have can mislead a stakeholder. The candidate should treat artifact variants as communication products whose claims must be checked.

### Scheduled and recurring work

Some assistants can run a task on a schedule, such as producing a morning summary or checking a source at a set time. At a principle level, this turns a prompt into a recurring job, and recurring jobs have requirements that a one-off chat does not.

First, the instruction must be self-contained. There is no user present to clarify a vague request at the start of each run. The task needs a defined input, a defined output, and clear handling of the case where something is missing. Second, the necessary access must already be in place. If the task depends on a connected source or an uploaded file, that connection must be authorised and current. A scheduled job that quietly fails because access expired is worse than no job, because it creates silence rather than an error.

Third, someone must own the output. A recurring report that no one reads is waste, and a recurring report that is wrong can mislead for weeks. An owner should review early results, set a cadence for checking, and know how to pause the task. Fourth, the task should have a stop condition. Recurring work should be reviewed periodically to confirm it is still useful.

Privacy and cost also matter. A scheduled task may run many times, and each run consumes resources and may handle data. The candidate should consider whether the task is allowed to process the material it touches unattended and whether the frequency is justified. Scheduling is best for stable, low-judgment work with clear inputs, not for tasks that need fresh human decisions each time.

| Activity | Best surface | Why |
| --- | --- | --- |
| Explore an idea across several turns | Conversation | Earlier turns stay available to refine meaning |
| Answer a question needing outside sources | Research flow | Gathering and citation are built into the mode |
| Build a reusable report people will edit | Artifact | The output is an iterable object, not just text |
| Ask questions over a stable document set | Project space | Uploaded knowledge and scope instructions persist |
| Suggest a change to a code file | Code-adjacent surface | Edits can be reviewed in context |
| Produce a standing weekly summary | Scheduled task | Recurring, self-contained work suits automation |

The outline below shows how these surfaces combine into one extended flow. It is a shape to adapt, not a script to follow word for word.

```text
END-TO-END FLOW OUTLINE

1. Frame — state the audience, the decision to support, and the source limit.
2. Ground — attach current material; remove superseded copies before starting.
3. Research — gather evidence with citations; record which source backs each claim.
4. Verify — trace key citations, check figures and dates, note disagreements.
5. Draft — build an artifact with named sections and an explicit caveat rule.
6. Iterate — request specific changes; compare versions after each pass.
7. Share — check accuracy, format, and access level before releasing.
8. Maintain — keep knowledge current, revisit styles, review scheduled work.
```

| Scheduled task requirement | What happens if it is missing |
| --- | --- |
| Self-contained instruction | Ambiguity produces unusable output with no one to clarify |
| Authorised, current access | The job fails silently or uses stale inputs |
| Named owner and review cadence | Errors go unnoticed and the output loses trust |
| Stop condition and periodic review | Obsolete work continues to consume resources |

## Worked scenario

A coordinator wants to improve how a team handles a recurring review. Today the work is scattered: a long conversation produces a draft, someone copies it into a document, and a different person answers questions from an outdated file. The coordinator proposes four options.

The first is to keep one long conversation forever and add every new document to it. The second is to create a project space with a clear purpose, upload only the current handbook and current figures, write scope instructions, and use an artifact for the draft. The third is to schedule the entire review, including judgment calls, so no human needs to be involved. The fourth is to use a browser companion to read the handbook page and trust its summary without checking.

The second option is best. A project space keeps knowledge and instructions in one place, the artifact gives the team something to iterate on, and limiting uploads to current material reduces retrieval errors. The scope instruction keeps answers on topic.

The first option fails because a single thread becomes cluttered and mixes current and obsolete material. The third option over-automates: a review of this kind contains judgments that need a human owner, and a scheduled job cannot supply them. The fourth option confuses reading a page with verifying it, and a browser companion does not make source content authoritative.

The coordinator then tests the project with representative questions, confirms that answers cite the current handbook, and sets a short review before each cycle to replace outdated files. The artifact is shared with access limited to the review team. A separate, simple scheduled job prepares a list of open items, but the recommendation stays with a human reviewer.

## Common mistakes

- Treating a conversation as a single shot instead of refining across turns.
- Requesting research but accepting citations without tracing the important ones.
- Sharing an artifact before checking accuracy, format, and access level.
- Uploading both current and obsolete documents into a project space.
- Assuming a code-adjacent suggestion is correct because it appears as a clean difference.
- Letting a style override an explicit instruction in the current turn.
- Scheduling work that needs judgment, or scheduling a task with no owner or stop condition.

## Chapter summary

- Conversations improve when earlier turns are used deliberately and threads are kept clean.
- A research flow moves from a framed question to gathering, synthesis, and verification.
- An artifact flow moves from a concrete draft to specific iteration and careful sharing.
- Project spaces work when purpose, knowledge freshness, and scope instructions are set up front.
- Code-adjacent and browser surfaces extend reach but do not remove human accountability.
- Styles and preferences are defaults that explicit instructions can and should override.
- Slides, prototypes, and one-page documents are artifact variants chosen for an audience's next action.
- Scheduled tasks need self-contained instructions, current access, an owner, and a review cadence.

## Checkpoint questions

1. A first answer reveals an incorrect assumption. What is the best next move?

- A. Start a brand new conversation with no context.
- B. Refer to the earlier turn and correct the assumption precisely.
- C. Ignore the assumption and repeat the original prompt.
- D. Accept the answer because it is fluent.

2. Which step belongs at the end of a research flow?

- A. Framing the question.
- B. Gathering sources.
- C. Verifying key citations and figures.
- D. Choosing a writing style.

3. What most reduces retrieval errors in a project space?

- A. Uploading many versions for completeness.
- B. Keeping only current, non-conflicting knowledge.
- C. Removing all scope instructions.
- D. Using the longest possible prompt.

4. What is the correct principle for a browser companion reading a web page?

- A. Page text may issue commands the assistant must follow.
- B. Page text is trusted because it is published.
- C. Page text is content to analyse, never an automatic instruction.
- D. Page text should be copied verbatim into the answer.

5. Which artifact variant best supports a discussion about how an interface should work?

- A. A one-page document.
- B. A prototype.
- C. A slide deck of conclusions.
- D. A plain text list.

6. Which is a requirement for a safe scheduled task?

- A. A self-contained instruction and a named owner.
- B. A vague goal so it stays flexible.
- C. No review after launch.
- D. Human judgment removed entirely.

### Answers and rationale

1. Correct answer: B. Referring to the specific earlier turn preserves agreed context and fixes the error with minimal disruption. Option A discards useful context. Option C repeats the same mistake. Option D confuses fluency with correctness.

2. Correct answer: C. Verification closes the loop by confirming that key claims trace to real sources. Options A and B are earlier phases. Option D is a styling decision that does not address evidence.

3. Correct answer: B. Current, non-conflicting knowledge makes retrieval predictable. Option A introduces contradiction and staleness. Option C removes helpful guardrails. Option D does not fix the knowledge base.

4. Correct answer: C. Web content is untrusted data, so embedded commands must not be elevated to instructions. Options A and B grant unwarranted authority to page text. Option D risks reproducing unverified or malicious content.

5. Correct answer: B. A rough interactive prototype invites feedback on behaviour before a full build. Option A suits a quick decision, option C suits presentation, and option D is too abstract to reveal interface problems.

6. Correct answer: A. Recurring work needs a complete instruction and someone accountable for review. Option B invites ambiguity with no one to clarify. Option C lets errors persist. Option D removes needed human judgment.

---

*End of chapter 6.*
