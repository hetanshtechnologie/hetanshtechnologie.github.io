# Chapter 2 — Setting Up: Interface, Accounts, and a First Session

Before you can judge a tool, you have to know where you are standing in it. A first session is easy to waste. A new user types a question, receives an answer, and assumes that the whole product is the text box they just used. In reality that text box sits inside a larger working environment: a place for conversations, a place for reusable knowledge, a place for rendered outputs, and a set of controls that change how the assistant behaves. Understanding the map early saves confusion later, because most exam scenarios are really questions about which part of that map the situation requires.

This chapter tours the environment in generic terms, then turns to accounts and plan tiers at the level of principle rather than price. It closes with a concrete orientation routine you can use in your first working session. The goal is not to memorize a current screen layout. Screens change. The goal is to recognize the function behind any layout, so that a renamed control still makes sense to you.

## Learning objectives

- Identify the typical regions of an assistant interface and explain what each is for.
- Compare individual and team plans in terms of administrative control, data handling, and collaboration, without relying on price.
- Explain why a work product needs different treatment from a casual conversation.
- Carry out a short orientation routine in a first session.
- Keep a clean thread and name conversations so that later work can be found.
- Locate response controls conceptually and know when to change them instead of rewriting the request.

## Key concepts

### A map of the interface

Most assistants share a small set of regions even when the visual design differs. There is a conversation area where turns accumulate, a set of model and feature controls near the point of entry, a navigation panel that lists prior work, spaces for projects and artifacts, and entry points for scheduled work and voice input. You do not need to find these by name; you need to know what problem each one solves.

| Region | What it holds | Why it matters in a scenario |
| --- | --- | --- |
| Conversation area | The running exchange of requests and replies | Context builds here; a muddled thread produces muddled follow-ups |
| Model and feature controls | Choices about which model or mode is active and which tools are available | Determines capability, latency, and cost for the work at hand |
| Navigation panel | Prior conversations, project spaces, and saved work | Lets you return to existing context instead of starting over |
| Project and knowledge spaces | Uploaded material and standing instructions for recurring work | Keeps shared context stable across many conversations |
| Artifact space | Separately rendered drafts, code, visual sketches, and simple views | Gives an output its own life so it can be iterated apart from chat |
| Scheduling and voice entry points | Recurring tasks and spoken or dictated input | Changes when and how a request enters the system |

A useful mental model is that the conversation is where thinking happens, a project is where context lives, and an artifact is where a finished thing is shaped. Confusing those roles causes a surprising number of poor results. If you ask for a revised chart inside a crowded chat, the assistant may lose track of which version you mean. If you upload a policy document into a one-off conversation and then start a new conversation tomorrow, the document is gone from view. None of that is a failure of the model; it is a mismatch between the work and the surface.

The controls deserve a second look because they are easy to overlook after the first minute. Model choice changes how much reasoning is available and how quickly a reply arrives. Feature controls decide whether the assistant can run code, search external material, or work with an uploaded file. Scheduling turns a one-time instruction into a recurring one, which means the instruction must be clear enough to stand alone when nobody is watching. Voice input changes how text enters, not what the assistant is allowed to do. Exam scenarios often mention one of these controls in passing; the correct option is the one that treats the control as a tool with a purpose, not as a decoration on the screen.

> **Exam note:** When a scenario mentions that material must be available again next week, or that several people need the same instructions, think about persistent spaces rather than a single conversation.

### Accounts and plan tiers at a principle level

Plans differ in many details, but the exam cares about three axes: who can administer the account, how data is handled, and how people collaborate. Prices and feature checklists are poor study material because they change. The underlying trade-offs do not.

| Dimension | Individual-oriented plan | Team-oriented plan |
| --- | --- | --- |
| Administrative control | One person manages settings and access | Designated administrators manage members, roles, and shared rules |
| Data handling | Data is associated with one user's workspace | Data may be governed by organizational retention and access policies |
| Collaboration | Work is mostly personal and shared by exporting | Spaces, knowledge, and instructions can be shared inside defined boundaries |
| Permission model | Simple ownership | Roles determine who can read, edit, upload, or connect sources |
| Oversight | The individual decides what is acceptable | Review responsibilities and audit expectations can be assigned |
| Typical risk | Losing track of where sensitive text was pasted | Excess access or unclear ownership of shared material |

"Individual" does not mean careless, and "team" does not mean automatically safe. An individual still has duties: avoid sensitive data where policy forbids it, check output before relying on it, and keep records of important decisions. A team plan adds structure but also adds obligations. If an administrator grants broad access to a shared knowledge base, a single careless request can expose material to people who did not need it. The principle of least privilege applies here as much as anywhere else: give the smallest access that lets the work proceed.

Data handling deserves special attention. On a personal plan, a user may treat the workspace as a private notebook, but organizational rules can still apply when the material belongs to an employer or a client. On a team plan, retention, deletion, and geographic handling may be governed by policy that the individual cannot override. A scenario will often hint at this with a phrase such as "company policy requires" or "the document is client-owned." That phrase is the deciding constraint.

Roles are the practical expression of these differences. A team space usually distinguishes people who can read shared material from people who can change it, upload new files, or connect an outside source. That separation exists so that a routine contributor cannot accidentally alter a policy document that everyone relies on. When a scenario says a reviewer needs to approve an answer before release, the answer should preserve that gate rather than describe a way around it. When it says a new collaborator needs only to read a summary, granting edit rights solves no problem and creates a new risk. Ask what the smallest sufficient role is, and you will usually find the intended option.

> **Common mistake:** Assuming a paid or team plan makes an action safe. A plan changes who controls the environment; it does not remove the need to classify the data and check the output.

### Casual chat versus work product

Not every exchange deserves the same care. If you are wondering how to phrase a sentence or exploring an idea privately, a quick conversation is fine. The moment the output will be shown to someone else, used for a decision, or stored as a record, it becomes a work product. Work products carry three extra duties: completeness, provenance, and review.

| Aspect | Casual chat | Work product |
| --- | --- | --- |
| Audience | Only you | Colleagues, clients, or a record that outlives the session |
| Accuracy standard | Useful enough to think with | Claims must be traceable to supplied or checked sources |
| Record keeping | Optional | Version, author role, and review status matter |
| Suitable surface | A quick conversation | A named thread, project space, or artifact |
| Verification | Light | Line-by-line where claims carry consequences |

The distinction explains a common exam pattern. A user drafts a note for themselves and later forwards it to a client without changing anything. Nothing about the content changed, but the context did. The correct answer in such a scenario usually involves re-checking claims and possibly reformatting for the new audience, not simply hitting send. Treat the audience change as a new event.

Provenance is the third duty and the one most often skipped. A work product should make it possible to answer, later, where its claims came from and who accepted them. That might be as simple as keeping the source document attached to the project, quoting the passages used, and recording that a reviewer checked the result. It is not bureaucracy for its own sake. When someone challenges a number in a meeting, the person who can point to the line in the source is the person who can settle the question quickly. An assistant's reply, however polished, is not a source in itself.

A related habit is to keep one thought per thread when the thought is complex. Conversations accumulate context, and context is useful until it becomes clutter. If a thread contains three unrelated tasks, a later request may inherit instructions from the first task. Starting a fresh, clearly named conversation for a new task is a small act of hygiene that prevents large misunderstandings.

### Orienting yourself in a first session

A first session should answer practical questions before you ask anything important. Which model is active? Which tools or modes are available? Where do previous conversations appear? Can you attach files, and where do those files remain accessible? What controls change the length or style of a reply? Knowing the answers takes a few minutes and prevents a false start when the stakes are higher.

Orientation is not about clicking every control. It is about forming a reliable picture of where things go. Start by opening a harmless conversation and asking the assistant to explain its own current settings in plain language. Then inspect the navigation to see how conversations are organized. Look at how a project space is created, even if you do not populate it yet. Note where an artifact appears when a document is generated. Finally, check whether voice input and scheduling are visible, so you know they exist when a scenario calls for them.

1. Open a low-stakes conversation and note the active model and any visible mode controls.
2. Inspect the navigation panel and confirm how prior conversations are listed and named.
3. Create or view a project space without adding sensitive material, just to see its structure.
4. Generate a small artifact, such as a one-paragraph draft, and observe where it is rendered.
5. Check where response length, verbosity, tone, or format controls are located.
6. Confirm the presence of voice entry and scheduling, without configuring either yet.
7. Close or rename the practice conversation so it does not clutter later work.

> **Try it:** Use the checklist below as a literal first-session exercise. Rename the practice conversation with the date and a short purpose so that your future self can tell it apart from real work.

```text
FIRST-SESSION CHECKLIST
[ ] Identify the active model or mode and where to change it.
[ ] Confirm where conversations are listed and how to rename them.
[ ] Locate project and knowledge spaces; note how access is set.
[ ] Generate a tiny artifact and note where it is rendered.
[ ] Find controls for length, tone, verbosity, and output format.
[ ] Note whether voice dictation and scheduling are available.
[ ] Decide a naming convention for future conversations.
[ ] Verify where organizational policy says sensitive data may go.
```

### Threads, names, and finding work later

A conversation is the default working surface, but it is easy to lose. Many interfaces show a long scroll of similarly titled entries. A naming convention solves this. Put the purpose first, the date second, and a status marker if useful: for example, "Draft — policy summary — initial review." That title tells you what the thread contains and whether it is finished. A reader scanning a list can skip it or open it deliberately.

Clean threads matter for a second reason. The assistant uses recent turns as context. If you mix unrelated requests, a phrase from an old task can leak into a new answer. Suppose an earlier thread asked for terse bullet points and a later thread asks for a careful narrative. Without a clear reset, the style of the first request may persist. Starting fresh for a genuinely new task is not inefficiency; it is a way of controlling context.

There is a balance, though. Do not start a new conversation for every tiny follow-up on the same topic. Building on earlier turns is one of the assistant's strengths. The rule is simple: continue when the task and its context are the same, restart when the goal or the audience changes. That keeps continuity where it helps and separation where it protects.

### Where response controls live conceptually

Length, verbosity, tone, and format can be influenced in two ways: through settings attached to the session or workspace, and through the request itself. Settings are useful for stable preferences. If you always want concise answers in a particular project, a standing control saves repetition. The request is better for task-specific needs. If today's output must be a table for a steering meeting, say so in the request rather than relying on a general setting.

Control layering also explains why a well-written instruction can be overridden. A global style setting may favor short replies, while your request asks for a detailed comparison. The exam rarely tests which layer wins in a particular product. It tests whether you recognize that both layers exist and that the most specific, task-relevant instruction should be made explicit. If a format matters, state it in the request.

A practical way to think about the two layers is durability. A setting is a preference you expect to hold across many tasks; a request is a condition of this one task. If you find yourself repeating the same phrase in every request, that phrase is a candidate for a setting or a project instruction. If you find a setting producing the wrong shape for a particular deliverable, override it in the request and say exactly what you want. This habit keeps your workspace calm: stable preferences live in one place, and exceptions stay visible where they are needed.

Voice and dictation are entry points, not quality controls. They get words into the conversation faster, but dictated input often contains recognition errors, especially with names, acronyms, and numbers. A careful user reviews dictated text before relying on it and treats any dictated figure as unverified. Scheduling is similar: it automates *when* a task runs, not whether the task is well designed. A recurring task still needs a clear instruction, a defined owner, and a place where its output can be found.

## Worked scenario

A new analyst joins a team and is asked to prepare a short summary of an internal policy for an upcoming review. The analyst opens the assistant and types the request into a fresh conversation. The reply is fluent, but it uses a definition of the policy that sounds outdated, and the analyst cannot tell whether the assistant used the current document at all. A reviewer suggests four possible next steps.

- Continue in the same thread, asking the assistant to sound more confident.
- Start a named conversation inside the team's project space, attach the current policy document, ask for a summary with each claim tied to a quoted line, and verify the quoted lines against the source.
- Paste the policy into a personal conversation because that is faster, then copy the answer into the review notes.
- Ask for a longer answer with more formal wording.

Restating the goal gives: produce a summary that the review can rely on as an accurate statement of current policy. The constraints are that the source must be the current document, that the team needs to find and reuse the work, and that the analyst cannot personally confirm an unfamiliar definition from memory. The deciding constraint is grounding in the current source.

The first option changes presentation without changing grounding, so it fails. The fourth option makes the same mistake in a more elaborate way. The third option gets speed but loses the shared context and may break organizational rules about where internal documents belong. The second option is the only one that satisfies every constraint: the project provides the shared, persistent home; the attachment supplies the right source; the request for quoted lines makes verification possible; and the thread name makes the work findable later.

Note what the correct option does not do. It does not switch to a more capable model automatically, and it does not add a long list of stylistic demands. It fixes the surface and the evidence. That is the pattern to remember: when an answer is wrong about the world, changing how it sounds will not help. Change what it can see and how it is checked.

After the summary is verified, the analyst can still use response controls to shape the final version. A shorter version for a busy reviewer and a fuller version for the record are both reasonable outputs, provided both preserve the same caveats. That is the difference between shaping an answer and repairing one.

## Common mistakes

- Assuming the conversation area is the whole product and ignoring projects, artifacts, and navigation.
- Choosing a plan by feature list or price rather than by administrative control and data handling rules.
- Treating a private draft as a work product only after it is too late to verify its claims.
- Letting a thread accumulate unrelated tasks and then wondering why the style drifts.
- Using voice or scheduling as if speed or automation improved accuracy.
- Relying on a global style setting for a format that matters for one specific deliverable.
- Leaving practice conversations with vague titles, making real work hard to find.

## Chapter summary

- The interface has recognizable functions: conversation, controls, navigation, project spaces, artifacts, scheduling, and voice entry.
- The conversation is where context builds; projects hold shared, persistent context; artifacts hold shaped outputs.
- Plan comparisons should be made on administration, data handling, and collaboration, not on price.
- Casual chat and work products differ in audience, accuracy standard, and record-keeping duty.
- A first session should orient you to the active model, navigation, spaces, artifacts, controls, and entry points.
- Name conversations by purpose and status, and start fresh when the goal or audience changes.
- Response controls set general preferences; task-specific format and length belong in the request.

## Checkpoint questions

1. Which region of the interface is most important when several people need the same standing instructions next month?

   - A. The conversation area.
   - B. The model control.
   - C. A project and knowledge space.
   - D. The voice entry point.

2. A colleague claims that a team plan is automatically safe because it costs more. What is the best correction?

   - A. Plans differ in administration, data handling, and collaboration; safety still depends on rules and access scope.
   - B. Team plans never store data, so there is nothing to protect.
   - C. Price determines how accurate the assistant is.
   - D. Only individual plans have verification requirements.

3. A draft written for personal use will now be sent to a client. What changes first?

   - A. The font should be changed.
   - B. The claims need checking and the audience needs to be considered.
   - C. The model must be switched to the largest one available.
   - D. Nothing, because the words are already written.

4. Which naming convention makes a conversation easiest to find later?

   - A. "New chat"
   - B. "Question"
   - C. "Draft — policy summary — initial review"
   - D. "Test test test"

5. Where should a one-time requirement for a table in a steering meeting be expressed?

   - A. Only in a global style setting.
   - B. In the request itself, so the format is explicit for that task.
   - C. In the conversation title.
   - D. In the voice input settings.

6. What is the main limitation of dictation as an entry point?

   - A. It cannot put text into a conversation.
   - B. It is only available on team plans.
   - C. Recognition errors can affect names, acronyms, and numbers, so dictated content needs review.
   - D. It automatically verifies every claim.

### Answers and rationale

1. **C.** A project and knowledge space persists and can be shared with standing instructions. **A** is a single thread and does not reliably serve a group over time. **B** changes capability, not context. **D** changes input speed, not persistence.

2. **A.** The meaningful differences are administrative control, data handling, and collaboration; no plan removes the need for classification and careful access. **B** is factually wrong. **C** confuses price with accuracy. **D** is wrong because verification duties apply wherever output is relied upon.

3. **B.** A change of audience creates a new accuracy and presentation obligation, so claims should be checked before sending. **A** addresses appearance only. **C** assumes a larger model fixes grounding, which it does not. **D** ignores the new context entirely.

4. **C.** It states purpose and status, which makes the thread findable and its state clear. **A**, **B**, and **D** are vague or noisy and give a future reader no useful signal.

5. **B.** Task-specific format belongs in the request, where it is visible and tied to that deliverable. **A** applies a general preference that may not match this task. **C** does not affect the response. **D** concerns input rather than output.

6. **C.** Dictation improves speed of entry but can mishear exact terms and figures. **A** is false. **B** is an unsupported claim about plans. **D** confuses transcription with verification.

---

*End of chapter 2.*
