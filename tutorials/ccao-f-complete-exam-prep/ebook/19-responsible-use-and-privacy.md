# Chapter 19 — Responsible Use, Transparency, and Data Privacy

## Learning objectives

- Separate appropriate from inappropriate uses of an assistant in a work setting.
- Identify requests that must be refused, including fabricated reviews, deceptive content, and impersonation.
- Classify data from public through regulated, and recognize personal and special-category information.
- State what an assistant may and may not do with sensitive data under organizational rules.
- Apply transparency, disclosure, and policy requirements to real scenarios.
- Describe generic regulatory concerns and the special duties owed to children and vulnerable users.

## Key concepts

### Choosing appropriate and inappropriate uses

An assistant is good at some jobs and wrong for others. The appropriate uses share a pattern: the output can be checked, the stakes of a mistake are manageable, and a person remains accountable. Drafting an internal summary, exploring wording, comparing options, and producing a first pass at structured material all fit. So does work where the assistant handles volume under human supervision, such as sorting a large set of items into categories that a reviewer then confirms.

Inappropriate uses break one of those conditions. If a decision cannot be verified before it takes effect, if an error would cause serious harm, or if the task requires authority the assistant does not have, the use is unsuitable. Letting a generated answer set a price for a customer, decide a hiring outcome, or approve a medical claim without review are examples. The issue is not that the assistant is never accurate; it is that accuracy cannot be guaranteed and accountability cannot be assigned to a tool.

A useful screening question is whether a person could explain and defend the final decision to someone affected by it. If the answer depends on "the assistant said so," the workflow needs redesign. The goal in responsible use is augmentation: the assistant speeds up preparation, while people retain judgment and sign-off.

Consider two contrasting requests. Asking the assistant to propose several ways to phrase a difficult internal announcement is appropriate, because a person will choose and edit the wording before it is sent. Asking it to decide which employees should be let go based on a spreadsheet is not, because the decision affects people, requires context the tool cannot weigh, and needs an accountable human. Comparing the two shows that the boundary is not about how complex the task feels. It is about whether verification and accountability survive the workflow.

> **Exam note:** Foundations exam items rarely ask whether a model can perform a technical action. They ask whether the use is appropriate given verification, stakes, and accountability. Those three criteria decide most answers.

### Requests that must be refused

Some requests are wrong regardless of how they are phrased. Producing fabricated reviews, inventing testimonials, creating deceptive content, and impersonating a real person are all refusals. The common thread is deception: the output is designed to mislead someone about its origin, its honesty, or the identity behind it.

Fabricated reviews deserve attention because they seem harmless at first. A small business might ask for glowing customer comments to fill out a profile. The output is not merely inaccurate; it defrauds readers who rely on reviews to make choices. The same logic applies to invented testimonials, fake endorsements, and synthetic quotes attributed to people who never said them. Even when no law is broken in a particular setting, the practice violates the duty of honesty that underpins trust.

Impersonation is another firm boundary. Writing a message that pretends to come from a colleague, a customer, or a public figure is deceptive, and it can also be a step toward fraud. A related case is generating content that falsely presents itself as human-created when the context makes that fact material. Transparency about machine involvement is treated later in this chapter, but the principle appears here too: outputs should not be designed to hide their origin when that origin matters.

Deceptive content extends beyond reviews. Fabricated metrics in a report, invented case studies presented as real customer outcomes, and synthetic screenshots offered as evidence all fall into the same category. The defining feature is that the audience is being asked to treat something as genuine when it is not. Even a request to make an argument "look more credible" can cross the line if it involves inventing sources or implying endorsements that do not exist. When the credibility comes from a false claim about origin or evidence, the request should be refused.

Refusal does not have to be abrupt or unhelpful. For each unsafe request, there is often a legitimate alternative that meets the underlying need. Someone asking for fabricated reviews may actually need help soliciting genuine ones. Someone asking for an impersonating message may need a clear draft written in their own voice. Offering the safe alternative demonstrates that the boundary is about deception, not about refusing to help.

| Scenario | Decision | Reason |
|---|---|---|
| Write fake reviews for a product | Refuse | Deceives readers and distorts fair comparison |
| Draft an honest reply to a real review | Proceed | Supports genuine communication |
| Invent a quote from a public figure | Refuse | Misattributes words and misleads readers |
| Summarize a published speech with citations | Proceed | Grounded in verifiable source material |
| Compose a message pretending to be a colleague | Refuse | Impersonation enables fraud and harms trust |
| Write a draft for the requester to send in their own name | Proceed, with disclosure where needed | Authorship stays with the person responsible |
| Produce deceptive advertising claims | Refuse | Misrepresents facts to customers |
| Compare two products using supplied specifications | Proceed | Testable against provided data |

> **Common mistake:** Treating refusal as a flat "no." The better response explains the concern briefly and offers a legitimate path to the same goal.

### Classifying data sensitivity

Not all data deserves the same care. Classification assigns information to categories that determine how it may be handled. Four categories cover most organizational settings: public, internal, confidential, and regulated. The category depends on the harm that would follow from disclosure, not on where the data happens to be stored.

Public data is intended for anyone, such as published marketing material. Internal data is meant for people within the organization, such as routine process notes. Confidential data would cause meaningful harm if exposed, such as commercial plans or personal performance information. Regulated data is subject to legal or sector-specific rules, such as health records, financial identifiers, or certain categories of personal information.

The practical value of classification is that it turns a vague feeling of caution into a concrete rule. Once a document is labeled, the question "can I paste this into a tool?" has a defined answer based on policy. It also prevents two opposite errors: treating everything as sensitive, which blocks useful work, and treating everything as ordinary, which leaks valuable information.

| Category | Examples | Handling stance for an assistant |
|---|---|---|
| Public | Published articles, marketing pages | Generally safe to use, with attribution |
| Internal | Process notes, meeting summaries | Use within approved tools and work accounts |
| Confidential | Strategy documents, salary data | Avoid pasting into shared tools; seek approval |
| Regulated | Health records, financial identifiers, student records | Do not enter general tools; follow sector rules |

The exam may present a scenario where data is moved from one context to another. Note that classification follows the data. Copying a confidential figure into a casual note does not make it public, and summarizing a regulated record does not remove its status. Generated answers inherit the sensitivity of their inputs.

Reclassification can also flow in the other direction. Data that seems harmless in isolation may become sensitive when combined with other fields, such as a postcode joined to a date of birth and a job title. A responsible workflow checks the combined dataset, not just each column on its own. It also treats derived outputs as carrying the category of their inputs: a chart built from confidential records is itself confidential, and a summary that repeats a regulated figure does not become public because it is shorter. Classification follows the information through every transformation.

### Personal and special-category data

Personal data is any information that relates to an identifiable person. It includes obvious identifiers such as names and contact details, but also less obvious items such as an employee number, a device identifier, or a detailed description of someone's circumstances. Special-category information is a subset that receives extra protection because of its nature, including health information, biometric data, and details about beliefs or characteristics that could expose someone to discrimination.

Student and patient information are high-sensitivity categories in most settings. Records about a student's performance or a patient's condition can affect real decisions about the individual, and the people who hold them owe duties of care and confidentiality. An assistant should not be used to process such records through general tools, and even in approved environments the data should be minimized: include only what the task truly needs.

Minimization is a habit worth practicing. Before sharing any record, ask what the smallest sufficient version looks like. A question about aggregate trends rarely needs individual names. A formatting task rarely needs real identifiers. Where synthetic or anonymized examples will serve, use them. Each removed field is a reduction in risk that costs little and protects the people involved.

> **Exam note:** When a scenario mentions student records or patient details, treat the data as high-sensitivity by default. The safe answer limits access, minimizes the data, and follows organizational rules rather than assuming general tools are acceptable.

### What the assistant may and may not do

Organizational rules set the boundary for how an assistant may handle sensitive information. Even where a tool technically accepts pasted text, policy may forbid entering regulated or confidential material into it. The exam rewards recognizing that capability and permission are different things. Just because an assistant can summarize a record does not mean the organization allows that record to be placed in the tool.

Under typical rules, an assistant may work with non-sensitive material in approved workspaces, may process confidential material only in specifically authorized environments, and may not be used at all for regulated data unless the system meets defined requirements and the workflow has been reviewed. These are principles rather than universal clauses; the candidate should reason from the scenario's stated policy.

What the assistant may not do includes retaining data beyond an approved period, sharing it across accounts, or presenting it to people who lack a need to know. It also includes making decisions about individuals without human review. In every case, the responsible pattern is the same: minimize the input, constrain the environment, keep a person accountable, and record what was done.

A short decision checklist makes this concrete before any data is shared.

```text
Data-sharing decision checklist:
- What is the data category? (public / internal / confidential / regulated)
- Does it identify, or could it re-identify, a person?
- Is it special-category, student, patient, or children's data?
- Is the tool approved for this category under current policy?
- What is the minimum data needed for the task?
- Who will see the answer, and could it expose the source?
- Is a human owner identified for the decision?
- If any answer is uncertain, has the privacy owner been asked?
```

> **Try it:** Apply the checklist to a real work request before pasting anything. If the tool is not approved for the category, stop and seek an approved path rather than proceeding with a reduced excerpt.

### Transparency and disclosure

Responsible use includes being honest about how an assistant contributed to a work product. Transparency means that people who are affected by, or rely on, a document know when machine-generated content played a material role. Disclosure is the act of communicating that fact in a way the audience can understand.

The level of disclosure depends on context. An internal draft that will be heavily edited by a person may need no special note. A document that will be published, used in a decision about someone, or relied on as evidence of facts usually does. Organizational policies often state exactly when a disclosure is required and what it should say. Following those policies is not optional, and the candidate should defer to the stated rule in an exam scenario.

Transparency also runs the other way. People should not be misled into thinking a human wrote something when that claim matters, and they should not be misled about the reliability of an answer. Attaching caveats to claims, naming sources, and marking items that need verification are all forms of honesty about the limits of the work. A polished answer that hides its uncertainty is less transparent than a rougher one that states what is known and what is not.

A disclosure does not need to be elaborate to be honest. A short line stating that a section was drafted with an assistant and checked by a named role can be enough, provided it matches the policy in force. What matters is that the statement is accurate and placed where the reader will see it. Hiding a note in fine print, or using vague language that obscures how much of a document was generated, defeats the purpose. Transparency is a property of the finished work, not a box to tick at the start of a project.

### Regulatory considerations in general terms

Rules governing data and automated tools vary by sector and region, and this guide does not give legal advice. What the exam expects is familiarity with the broad themes. Sector rules may impose special duties on health, finance, education, or government information. Retention rules may require that data be kept for a defined period or deleted after use. Disclosure rules may require notice when automated tools contribute to decisions about people. Cross-border transfer rules may restrict sending data to systems hosted in other jurisdictions.

Each theme maps to a practical question. Sector rules ask whether the data belongs to a protected class. Retention asks how long copies may exist, including copies inside a conversation history. Disclosure asks whether affected people must be told. Cross-border transfer asks where the tool stores and processes information. A responsible workflow records answers to these questions before data is shared, not after an incident.

The general lesson is that policy and law set boundaries that technical capability does not override. When rules and convenience conflict, rules win. When the candidate is unsure which rule applies, the safe answer is to pause and consult the designated owner rather than proceed.

### Protecting children and vulnerable users

Some groups need extra protection because they are less able to understand or challenge how their information is used. Children's data receives heightened protection in many frameworks, and organizations that serve young people typically impose stricter controls on collection, retention, and sharing. The same caution applies to people who may be dependent on a service, such as patients, students, or residents in care settings, where an imbalance of power makes genuine consent harder.

Practical protections include minimizing collection, avoiding the use of identifying details in examples, limiting who can see generated material, and never using an assistant to produce content that manipulates or targets a vulnerable person. Where consent or notice is required, it should be given in language the person can actually understand. If a scenario involves a young person's or patient's information, the safest response restricts access and escalates to the appropriate owner.

Design choices matter as much as policies here. A tool used with young people should avoid collecting more information than the activity requires, should present any notice in plain language, and should never be used to profile a child or predict sensitive characteristics. Where a service supports people who depend on it, the organization should assume an imbalance of power and make it easy for a person to decline or correct an outcome. If a feature cannot be explained to the person it affects, it is a poor candidate for use with a vulnerable group.

> **Exam note:** The exam frames these issues as judgment, not as legal detail. Extra protection, minimization, and escalation are almost always the correct direction.

## Worked scenario

A community education program asked an analyst to prepare a short briefing on student performance trends using a spreadsheet of records. The spreadsheet contained names, student identification numbers, and notes about individual circumstances, including health-related absences. The request was to "summarize what the assistant sees and draft a note for the teaching team."

The analyst began with classification. Student performance records were high-sensitivity, and the health-related notes were special-category information. The intended tool was a general assistant not approved for regulated or confidential data. That combination ended the discussion about pasting the raw file. The fact that the task was internal did not lower the category: classification follows the data, not the audience.

Instead of refusing outright, the analyst looked for a safe path. The underlying need was a briefing on trends, not a list of individuals. The analyst produced an aggregated table with no names or identifiers, using broad bands rather than precise figures where small groups could be re-identified. The health notes were removed entirely, since a trend briefing did not require them. This applied minimization and avoided re-identification.

Before sharing, the analyst checked the disclosure question. The teaching team would receive an internal summary derived from sensitive records, so the note included a line stating that the figures were aggregated and that individual details had been excluded. The program's policy required privacy review for any output derived from student records, so the analyst routed the draft to the privacy owner rather than sending it directly.

The review found one remaining issue: the briefing would be attached to a wider staff mailing that included volunteers outside the teaching team. The privacy owner adjusted the distribution so the note reached only staff with a legitimate need. The final outcome met the original goal without exposing identifiable information, and the decision was recorded in the project log with the classification and the owner's approval.

> **Exam note:** This scenario combines several themes. Correct handling means recognizing the data category, refusing to paste raw records, minimizing, disclosing appropriately, and escalating under policy.

## Common mistakes

- Assuming that internal use makes sensitive data safe to paste anywhere.
- Treating generated summaries as less sensitive than their source records.
- Fabricating reviews or testimonials because they seem like harmless filler.
- Impersonating a colleague or customer to make a message sound more persuasive.
- Ignoring disclosure requirements when an output will be published or used in a decision.
- Collecting or pasting more personal data than the task requires.
- Overlooking special-category details buried in otherwise ordinary notes.
- Proceeding without consulting the policy owner when the rules are unclear.

## Chapter summary

- Appropriate uses keep a person accountable and allow verification; inappropriate uses remove both.
- Refuse deceptive work such as fabricated reviews, invented testimonials, deceptive claims, and impersonation, while offering legitimate alternatives.
- Classify data as public, internal, confidential, or regulated, and remember that generated answers inherit the category.
- Treat personal, special-category, student, patient, and children's data as high-sensitivity, and minimize what is shared.
- Capability is not permission: use only approved tools and follow organizational rules for each category.
- Be transparent about machine involvement and follow disclosure policies when outputs affect people.
- Reason generically about sector rules, retention, disclosure, cross-border transfer, and extra protection for vulnerable users.

## Checkpoint questions

1. Give three criteria that make an assistant use appropriate in a work setting.

2. Why must a request to fabricate reviews be refused even if no law is broken locally?

   - A. It is difficult to write convincing reviews.
   - B. It deceives readers and distorts fair comparison, undermining trust.
   - C. Reviews are always short.
   - D. The assistant cannot write in a casual tone.

3. What sensitivity category usually covers patient records and student records?

4. What does data minimization require before sharing a record with an assistant?

   - A. Including every available field for context
   - B. Including only the smallest amount of data needed for the task
   - C. Removing only the document title
   - D. Converting the data into a screenshot

5. When does transparency about machine involvement usually matter most?

6. Which of the following is a generic regulatory theme the exam may test?

   - A. Cross-border transfer of data
   - B. Choosing a pleasant color scheme
   - C. Increasing output length
   - D. Avoiding all tables

7. Why do children's data and vulnerable users' data require extra protection?

8. What is the correct response when the candidate is unsure which policy applies to a data-sharing request?

### Answers and rationale

1. The output can be checked, the stakes of an error are manageable, and a person remains accountable for the final decision.

2. B is correct because deception is the core harm, regardless of local legal details. A, C, and D do not address the ethical problem.

3. They are high-sensitivity, typically confidential or regulated depending on the setting and applicable rules.

4. B is correct. Minimization means using the smallest sufficient dataset. A increases risk, C is superficial, and D changes format without reducing exposure.

5. It matters most when a document will be published, relied on as evidence, or used in a decision about a person, and whenever policy requires disclosure.

6. A is correct. Cross-border transfer, along with sector rules, retention, and disclosure, is a recognized theme. The other options are unrelated to governance.

7. These groups may be less able to understand or challenge how their information is used, and there is often an imbalance of power, so extra care and clearer communication are required.

8. Pause and consult the designated privacy, security, or policy owner before sharing. Proceeding under uncertainty is the unsafe choice.

---

*End of chapter 19.*
