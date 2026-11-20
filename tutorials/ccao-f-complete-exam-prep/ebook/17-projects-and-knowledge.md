# Chapter 17 — Project Spaces, Knowledge, and Custom Instructions

## Learning objectives

- Judge when a persistent project space serves better than a single conversation.
- Establish a project around a clear purpose and an explicit boundary.
- Organize uploaded material so retrieval stays predictable as the collection grows.
- Compose project-level instructions covering role, scope, format, and limits.
- Test instructions with representative prompts and articulate how answers change.
- Keep knowledge current, recognize stale or conflicting material, and manage versions and ownership in shared spaces.

## Key concepts

### A project is a place, not a longer chat

A conversation is a moment; a project is a place. In an ordinary chat, everything the assistant needs must appear in the current message or be recovered from the handful of turns above it. That is fine for a question asked once and answered once. It becomes wasteful when the same background, the same vocabulary, and the same house conventions are needed at the start of every new session. A project space exists to hold that stable material so it does not have to be restated repeatedly.

Consider the difference between briefing a colleague who has never seen your team's work and working beside someone who has already studied the team's handbook. The one-off chat is the first briefing; the project is the prepared colleague. Both have value, but they solve different problems. The project cuts repeated setup, steadies answers across sessions, and supplies the assistant with a durable frame of reference that survives closing the window.

The exam treats this as a judgment call rather than a definition to memorize. A scenario describing a single self-contained question with no need for prior context is better served by a normal conversation. A scenario describing recurring work against a fixed set of documents, a controlled vocabulary, and a mandatory response format is better served by a project. The deciding feature is not the difficulty of the question. It is whether the same context will be needed again.

Signals that favor a project space include repeated references to the same source files, an expectation that every answer follow one structure, specialist terms the assistant would otherwise misunderstand, and several people returning to the same material across weeks. Signals that favor a plain chat include a one-time calculation, a quick rewrite, an exploratory question whose goal is still forming, and any task whose context will be irrelevant tomorrow.

> **Exam note:** When an item pits a chat against a project, look for evidence that the same background will be needed in later sessions. Recurrence is the deciding signal, not complexity.

### Setting a purpose and a boundary

A project without a stated purpose becomes a storage drawer. Material is added because it seemed relevant once, and over time the collection loses its shape. The assistant then draws on unrelated files, and answers drift. The remedy is to write a purpose statement before uploading anything and to treat that statement as a filter: if a file does not serve the stated purpose, it does not belong in the project.

A useful purpose statement names three things. First, the decisions or outputs the project supports. Second, the audience those outputs serve. Third, the topics that are explicitly outside scope. That third element matters as much as the first two, because it tells the assistant what to ignore when a question arrives that only partly overlaps the project's subject.

A boundary also protects against scope creep. Once a project is shared, contributors may add files that are convenient for them but irrelevant to the project's goal. A clear statement gives the owner grounds to decline those additions. It turns a subjective judgment into a simple consistency check.

```text
Project purpose sketch:
- Supports: [the decisions or deliverables this space exists for]
- Audience: [who reads the outputs]
- In scope: [topics and source families that belong here]
- Out of scope: [topics that must be answered elsewhere]
- Owner: [role responsible for accepting changes]
- Review date: [when the purpose is rechecked]
```

> **Try it:** Before opening a new project, draft the purpose sketch above in plain language. If you cannot fill in the "out of scope" line, the project's boundary is not yet clear enough to be useful.

### Building a knowledge set that retrieves predictably

Uploaded knowledge is only helpful if the assistant can find the right piece at the right moment. Retrieval is easier when the collection is small, current, and clearly labeled. Three habits make the biggest difference: naming files descriptively, keeping one topic per file, and removing material that is no longer authoritative.

Descriptive names reduce ambiguity. A file called "policy-v3-final-updated" tells the assistant almost nothing, while a name that states the subject, the effective date, and the status gives both people and the system a reliable handle. Where a platform permits folders or tags, group material by subject rather than by the person who supplied it. Subject-based grouping aligns with how questions are asked.

Predictability also depends on how questions are phrased. A query that mirrors the vocabulary used in file names and headings is far more likely to retrieve the intended passage than one built from different synonyms. Teams can help by keeping a short list of preferred terms and using them consistently in both documents and prompts. When a request uses colloquial language, the assistant may need a hint about which formal term to search for. This is why a controlled vocabulary within a project is worth maintaining: it aligns the way people ask with the way material is stored, so retrieval is less dependent on luck.

Keeping one topic per file matters because retrieval often returns whole documents or large chunks. If a single file mixes a policy, a worked example, and a contact list, a question about the policy may drag the other material into context. Separate files let the assistant select precisely. This also makes updates safer: when a policy changes, only one small file needs revision.

Freshness is the quiet risk in every knowledge set. A document that was accurate when uploaded can become misleading after a rule change, a price update, or a reorganization. The risk varies by the type of material, which is why a knowledge-type table is more useful than a blanket warning.

| Knowledge type | Typical half-life | Freshness risk | Practical guard |
|---|---|---|---|
| Mission and values statements | Years | Low | Confirm on major strategy changes |
| Definitions and glossaries | Months to years | Low to medium | Check when terminology is retired |
| Process steps and internal policy | Months | Medium | Tie each file to an owner and review date |
| Price lists, rates, and thresholds | Weeks to months | High | Replace rather than append; mark effective dates |
| Product specifications and compatibility | Weeks | High | Remove superseded versions promptly |
| Regulatory summaries | Variable | High | Link to the issuing source and recheck on notices |

The table shows why "upload once and forget" is unsafe for some categories and tolerable for others. Durable material can be left in place with periodic checks. Volatile material needs a replacement discipline: a new version is uploaded and the old one removed, so the assistant never chooses between two conflicting copies.

> **Common mistake:** Keeping an outdated file "just in case" alongside its replacement. When both versions sit in the same project, the assistant may quote the stale one, and the answer looks authoritative while being wrong.

### Writing project-level instructions

Knowledge supplies facts; instructions supply behavior. Project-level instructions tell the assistant how to operate within the space regardless of the individual question. A good instruction set covers four elements: role, scope, format, and boundaries. Missing any one of them leaves a gap that the assistant will fill with defaults.

Role establishes the viewpoint from which answers should be framed. It is not a costume; it is a shortcut for setting priorities. Telling the assistant to answer as an internal analyst preparing material for a reviewer, for example, nudges it toward precision and caveats rather than marketing language. Scope states which sources and topics the instruction applies to. Format fixes the shape of the answer, such as a short summary followed by a table and a list of open questions. Boundaries state what the assistant must not do, such as inventing figures, quoting from outside the uploaded set without labeling the source, or presenting a draft as an approved decision.

Instructions work best when they are short and positively phrased. A long list of prohibitions is easy to overlook and hard to maintain. Where possible, state the desired behavior instead of the forbidden one. "Attribute each claim to its source file" is more reliable than a long warning against unsupported claims. Exceptions can be added for genuinely special cases.

A role label should shape priorities without implying credentials the assistant does not hold. Framing an answer as a careful internal analyst is useful; claiming that the assistant is a qualified lawyer or clinician is not. The first sets a standard of care, while the second could mislead a reader into trusting an unreviewed response. If a project serves a regulated domain, the instruction should state that the output is a draft for a qualified person. That distinction protects both the reader and the team.

The instruction block below is a template rather than a fixed script. It is organized so the most important constraints appear first, because material near the start of an instruction set is less likely to be crowded out by long source passages during retrieval.

```text
Project instruction template:
ROLE: Answer as [role] preparing work for [audience]. Prioritize accuracy
      and explicit uncertainty over completeness.
SCOPE: Use only material in this project unless a question explicitly
       asks otherwise; name the source file for each substantive claim.
FORMAT: Begin with a three-line summary, then a table of key points,
        then a short list of open questions. Keep the whole answer under
        the length stated in the prompt.
BOUNDARIES: Do not invent figures or dates. Do not treat a draft as an
        approved decision. If sources conflict, say so and pause.
ESCALATION: If the answer would affect [high-stakes area], state that
        human sign-off is required before use.
```

> **Exam note:** A project instruction and a prompt are different tools. The instruction sets a standing default for every session in the space; the prompt handles the immediate question. The exam rewards recognizing which one needs changing.

### Testing instructions and seeing their effect

Instructions are a hypothesis until they are tested. A set that reads well on paper can still produce the wrong shape of answer, omit a required caveat, or over-apply a rule. Testing means asking a small set of representative prompts and comparing the answers against what the instruction intended.

Choose test prompts that cover the range of real work. Include an easy case that should produce a clean answer, an ambiguous case where sources partially conflict, and an out-of-scope case that the assistant should decline or redirect. This trio reveals different weaknesses. The easy case checks format. The ambiguous case checks whether boundaries are respected. The out-of-scope case checks whether scope language actually constrains behavior.

To demonstrate that instructions change an answer, run the same prompt twice: once in a plain conversation with no special instructions and once inside the configured project. Compare the two on specific dimensions rather than by impression. Did one cite source files and the other not? Did one flag uncertainty while the other sounded certain? Did one follow the required format? Keeping this comparison short and factual turns a vague sense of "better" into evidence.

| Test prompt type | What it reveals | Typical fix if it fails |
|---|---|---|
| Straightforward in-scope question | Format and source attribution | Tighten format wording; move it earlier |
| Ambiguous or conflicting-source question | Boundary and escalation behavior | Add an explicit "pause and say so" rule |
| Out-of-scope question | Scope discipline | Strengthen the source restriction |
| Length-sensitive question | Respect for output bounds | State the bound in both instruction and prompt |

> **Try it:** Keep a small comparison log with three columns: prompt, answer in a plain chat, answer in the project. After each instruction edit, rerun the same prompts and note only observable differences.

### Keeping knowledge current and recognizing conflict

Maintenance is the price of a useful project. Without it, a knowledge set decays quietly: policies change, files are superseded, and links stop reflecting reality. A simple cadence prevents most problems. Assign an owner, set a review interval appropriate to the material's half-life, and record the last review date where contributors can see it. Volatile material deserves frequent checks; durable material can be reviewed less often.

Conflicts deserve special attention because they produce confident but unusable answers. Two documents may disagree about a threshold, a process step, or a definition. When the assistant draws on both without noticing, the answer may present one figure in the summary and a different one in the table. Training reviewers to spot this pattern is worth the effort, because the error looks like ordinary inconsistency until someone checks the sources.

Recognition starts with suspicious signals: two files with similar names and different dates, a summary that hedges where the source is definite, or an answer that cites both an old and a new version. When a conflict is found, the right response is not to ask the assistant to pick one. The right response is to resolve the source of truth, remove or clearly mark the superseded file, and then regenerate the answer.

### Versioning and ownership in shared projects

Shared projects fail for social reasons more often than technical ones. Contributors upload without telling anyone, edit instructions to suit a single task, and leave no record of why a change was made. The result is a space nobody fully trusts. Two practices counter this: versioning and ownership.

Versioning means keeping a trace of what changed and why. A short log entry stating the date, the file or instruction affected, the reason for the change, and the role that approved it is usually enough. When an answer later looks wrong, the log lets the team see which change preceded the problem. It also lets a contributor revert confidently instead of guessing.

Ownership means one role is accountable for accepting changes to the knowledge set and instructions. This does not mean one person does all the work; it means one role has the final say when a contribution conflicts with the project's purpose. The owner also owns the review cadence and the decision to retire material. Without an owner, maintenance is everyone's job and therefore nobody's.

> **Common mistake:** Treating a shared project as a free-for-all where any contributor can change the standing instructions for a one-off task. Standing instructions affect every future session, so changes need the same care as a policy edit.

Ownership also smooths onboarding. When a new contributor joins a shared project, the owner can point to the purpose sketch, the instruction set, and the change log as one orientation package. Without those artifacts, each newcomer learns by trial and error and may repeat an earlier mistake. A short note explaining why a rule exists is often more valuable than the rule itself, because it helps a contributor judge an unfamiliar case. That shared memory is what turns a folder of files into a dependable asset.

## Worked scenario

A regional operations team created a project to answer questions about its expense policy. The project held three files: a policy document, a quick-reference sheet, and a set of examples. The stated purpose was narrow: help reviewers answer employee questions about allowable expenses using the current policy. Within a few weeks, answers began to disagree with one another. Some quoted a receipt threshold from the policy document; others quoted a different figure from the quick-reference sheet.

An analyst was asked to diagnose the problem. The first step was to separate the two possible causes: bad instructions or bad knowledge. The instruction set was inspected first. It stated a role and a format but said nothing about which file was authoritative when sources disagreed. That was a gap, but it did not explain the conflicting figures by itself, because the two files genuinely disagreed.

The second step was to examine the knowledge set. The quick-reference sheet had been uploaded a year after the policy document, at a time when a temporary threshold was in force. When the temporary rule expired, the sheet was never removed. Both files remained, so retrieval had no way to know which was current. The freshness table would have flagged this immediately: a threshold belongs in the high-risk category and should be replaced, not left alongside its predecessor.

The resolution had three parts. First, the analyst removed the outdated sheet and uploaded a corrected reference marked with an effective date. Second, the instruction set was amended with a boundary: if two files appear to conflict, name the conflict and pause rather than choosing one. Third, the purpose sketch gained an owner and a review interval, so the volatile material would be checked on a schedule.

Finally, the analyst tested the fix with three prompts: a straightforward allowance question, a question about the old threshold, and a question about a category the policy did not cover. The first produced a clean cited answer. The second produced a note that the cited threshold was the current one and that an older figure existed in a retired document. The third produced a clear statement that the sources did not cover the case. The test confirmed that both knowledge and instructions needed attention; fixing either alone would have left a weakness.

> **Exam note:** In scenario items about wrong project answers, check both the knowledge set and the instructions. A conflict between files and a gap in the boundaries are separate faults that often appear together.

## Common mistakes

- Opening a project when a single conversation would have been enough, adding setup cost without benefit.
- Omitting an out-of-scope statement, leaving the project's boundary undefined.
- Uploading files with vague names that make correct retrieval unlikely.
- Mixing several topics in one file, so a narrow question pulls in unrelated text.
- Keeping superseded documents alongside current ones instead of replacing them.
- Writing instructions as a long list of prohibitions rather than clear desired behaviors.
- Changing standing instructions for a one-off task without recording the reason.
- Assuming that a well-formatted answer is a correct answer.

## Chapter summary

- Use a project when the same context will be needed again; use a chat for one-off work.
- Start with a purpose statement that names what is in scope, what is out of scope, and who owns the space.
- Organize knowledge with descriptive names, one topic per file, and a replacement discipline for volatile material.
- Write instructions that cover role, scope, format, and boundaries, with the most important rules placed early.
- Test instructions with easy, ambiguous, and out-of-scope prompts, and compare against a plain chat.
- Treat freshness as a category problem: some material can be reviewed rarely, while rates and thresholds need frequent checks.
- Version changes and assign ownership so shared projects stay trustworthy.

## Checkpoint questions

1. A colleague needs a single translation of a short announcement and will never revisit it. Which surface is most appropriate, and why?

2. Which of the following best states the purpose of a project-level instruction?

   - A. It replaces the need to check any answer.
   - B. It sets standing behavior for every session in the space.
   - C. It stores the facts that the assistant will quote.
   - D. It limits the number of files that can be uploaded.

3. A project contains both a current rate card and an older card with different figures. What is the safest immediate response?

4. Which knowledge type generally carries the highest freshness risk?

   - A. Mission statement
   - B. Glossary of terms
   - C. Published rate card
   - D. Values statement

5. What does an out-of-scope statement accomplish in a project purpose?

6. A reviewer changes the standing instructions to suit one unusual request. What is the main problem with this action?

7. When demonstrating that instructions changed an answer, what comparison is most useful?

   - A. Asking whether the answer "feels better"
   - B. Running the same prompt in a plain chat and in the project, then noting observable differences
   - C. Counting the words in the two answers
   - D. Asking the assistant which answer it prefers

8. Why should volatile material be replaced rather than supplemented?

### Answers and rationale

1. A plain conversation is most appropriate. The task is self-contained and the context has no future use, so a persistent project would add setup without return. The deciding factor is recurrence, not difficulty.

2. B is correct. Project instructions define how the assistant behaves across sessions in that space. A is wrong because instructions never remove the need to verify. C describes the knowledge set, not the instructions. D confuses instructions with a storage limit.

3. The safest response is to stop relying on the conflicting figures, identify which card is authoritative, remove or clearly mark the older one, and then regenerate the answer. Asking the assistant to choose between two conflicting sources would produce a guess presented as a fact.

4. C is correct. Rate cards and thresholds change often, so they decay quickly. Mission and values statements, glossaries, and values statements are comparatively durable and carry lower freshness risk.

5. It tells the assistant and contributors which material is irrelevant to the project, reducing the chance that outside topics are pulled into answers. It also gives the owner a clear basis for declining unsuitable additions.

6. Standing instructions affect every future session, so a change made for one unusual request can quietly degrade all later work. The change should either be avoided or recorded with a reason and reviewed by the owner.

7. B is correct because it produces observable, comparable evidence. A relies on impression. C measures length rather than behavior. D asks a system to judge its own output, which is not independent evidence.

8. Supplementing leaves two versions in the collection, and retrieval may select the stale one. Replacement keeps a single source of truth, so answers stay consistent.

---

*End of chapter 17.*
