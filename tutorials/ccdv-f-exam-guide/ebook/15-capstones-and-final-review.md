# Chapter 15 — Capstone Projects and Final Review

## Learning objectives

By the end of this chapter you should be able to:

- Translate a broad system brief into goals, hard constraints, and testable acceptance criteria
- Choose between a workflow and an agent for each component of a realistic application
- Defend an architecture against questions about security, cost, and reliability
- Use a rubric to evaluate a design rather than relying on a general impression
- Map a weak topic area to the chapter that repairs it
- Run a focused two-day review and manage ambiguity under exam conditions

## Key concepts

### What the capstones measure

A capstone brief is deliberately under-specified. That is the point. Real requests arrive as a paragraph of intent plus a handful of constraints, and the engineer has to decide which details matter. An exam scenario works the same way: it hides the deciding fact among several harmless ones.

Each brief below follows the same pattern. The goal states what the system should accomplish. The constraints list the boundaries that cannot be traded away. The suggested architecture shows one defensible design, not the only design. The rubric tells you what a strong answer demonstrates.

Do not memorize the architectures. Practice the reasoning that produces them. For every brief, ask three questions before drawing anything: What must be deterministic? What is allowed to vary at runtime? What is the cost of being wrong?

When you evaluate your own answer, read it as an examiner would. Look for components that were named but never justified, constraints that were listed but never enforced, and outcomes that were described but never measured. A design that mentions a schema, a cache, and a hook is not automatically good; it is good only if each of those elements answers a constraint from the brief. If you cannot point to the constraint an element serves, that element is decoration and should be removed.

This habit also helps with multiple-choice questions. Distractors are often built from real techniques attached to the wrong constraint. Prompt caching is a real lever, for example, but it is the wrong answer when the scenario describes a prefix that changes on every request. Recognizing a familiar term is not enough; you have to trace it back to the problem it solves.

> **Exam note:** A capstone-quality answer names a trade-off. Saying "we will use an agent for flexibility" is incomplete; saying "we will use a workflow for routing because the labels are fixed, and a bounded agent only for drafting because that step benefits from context" shows judgment.

### Turning a brief into acceptance criteria

Before you can design anything, you have to convert loose language into statements that can pass or fail. This is the same move you make on an exam question when a distractor uses a word like "fast," "smart," or "secure" without defining it.

Use four passes. First, find the noun that names the outcome: a label, a citation, a diff, a search result. Second, find the qualifier attached to it and replace it with a number: not "mostly correct" but "at least 95 percent correct." Third, name the population the number applies to: a held-out set, a nightly batch, a slice of production traffic. Fourth, name the failure behavior: what happens when the number is not met, such as escalation, rejection, or an alert.

| Vague phrase | Outcome noun | Numeric threshold | Population and failure |
| --- | --- | --- | --- |
| "Route tickets well" | Priority label | 95 percent correct | Held-out 500 cases; below threshold goes to humans |
| "Answer from the document" | Supporting citation | Every claim has one cited span | All answers; unsupported answers are refused |
| "Keep costs down" | Cost per thousand items | Below the agreed ceiling | Each nightly run; breach raises an alert |
| "Do not change the database" | Database write | Zero writes | Every generated diff; a scan blocks the proposal |

Notice that the fourth column is what turns a hope into a control. A threshold without a failure behavior is a dashboard, not a requirement. On the exam, options that mention monitoring without an action are usually weaker than options that block, reject, or escalate.

> **Try it:** Take the line "the assistant should be helpful" and force it through the four passes. If you cannot name a population or a failure behavior, the original line was not a requirement at all.

### Capstone 1: Support triage agent

**Goal.** Build a service that reads incoming support tickets, assigns one of four fixed priority labels, drafts a first response from approved knowledge-base passages, and escalates uncertain cases to a human queue. The service must produce an audit record for every decision.

**Constraints.**

- The four labels and their definitions are published and change rarely
- At least 95 percent correct labels on a held-out set of 500 tickets
- Time to first token under 1.5 seconds at the 95th percentile
- No personal data in application logs
- Any case below a 0.7 confidence threshold goes to a human queue
- Every tool call and model decision is traceable

**Suggested architecture.** Split the problem at the boundary between classification and drafting. Classification is a deterministic workflow: validate the ticket, call a small model with a typed output schema, check confidence, and route. Drafting is a bounded agent step that retrieves approved passages, composes a response, and submits it for a groundedness check. A post-response step removes personal data from logs and attaches the audit record.

```text
ticket -> validate -> [workflow: label + confidence]
                         |-> low confidence -> human queue
                         |-> high confidence -> [bounded drafting step]
                                                  -> retrieve approved passages
                                                  -> compose with schema
                                                  -> groundedness check
                                                  -> response + audit record
```

**Acceptance criteria.**

- Label accuracy of at least 95 percent on the held-out ticket set, measured weekly
- Every response contains at least one cited knowledge-base passage
- Cases below the confidence threshold appear in the human queue within one second
- No logged field contains an email address, phone number, or ticket body
- A trace identifier links the label, the retrieved passages, and the final response

**Trade-off to name.** The drafting step adds latency and cost that pure routing would avoid. It is justified only because drafting benefits from retrieved context that a fixed template cannot use.

**Grading rubric.**

| Criterion | Full credit | Partial credit | Common failure |
| --- | --- | --- | --- |
| Shape selection | Workflow for labels, bounded agent for drafting | One shape for everything with a justification | Fully autonomous agent for fixed labels |
| Determinism | Schema and confidence gate on routing | Schema only | Free-form label text with no validation |
| Safety | Human escalation and redacted logs | Escalation only | Personal data retained in logs |
| Evaluation | Held-out set with a numeric threshold | A few sample tickets | No measurable acceptance test |
| Observability | Trace identifiers across model and tools | Model logs only | No link between decisions and tickets |

### Capstone 2: Document analysis service with untrusted input

**Goal.** Accept uploaded documents, extract a fixed set of fields, and answer questions using only content found in those documents. Answers must cite the passage that supports each claim, and unsupported questions must be refused.

**Constraints.**

- Documents come from external parties and may contain embedded instructions
- Every answer must include at least one supporting citation
- Extracted fields must match a typed schema
- State-changing tools are not available in this service at all
- Documents are retained for a limited period and then removed

**Suggested architecture.** Pre-process each document into clean text and image crops, then chunk it with stable identifiers. Retrieval selects candidate passages. The system message states that document text is data and that unsupported claims are forbidden. The model receives retrieved passages in a clearly bounded content block and returns typed answers with passage identifiers. A groundedness check verifies that each cited span actually contains the claim before the response is released.

> **Common mistake:** Treating a passage with authoritative wording as more trustworthy because a retriever selected it. Retrieval changes placement, not trust level.

**Acceptance criteria.**

- At least 98 percent of answers on a seeded test set cite a passage that actually supports the claim
- Every extraction field matches its declared type, or the item is marked for review
- An injected instruction embedded in a test document never triggers a tool call
- Unsupported questions receive a refusal rather than a plausible guess
- Retention policy deletes source documents after the defined period

**Trade-off to name.** Verifying every citation adds a step and can reject answers that are probably correct. That loss is acceptable because an unsupported answer in this domain is worse than a refused one.

**Grading rubric.**

| Criterion | Full credit | Partial credit | Common failure |
| --- | --- | --- | --- |
| Input trust | Document text marked as untrusted throughout | Marked in the system message only | Document text concatenated into policy |
| Grounding | Cited spans verified before release | Citations requested in the prompt | Confident answers with no source check |
| Schema | Typed extraction with validation | Prompt asks for a format | Free-form field output |
| Tool surface | No state-changing tools exposed | State-changing tools gated by confirmation | Full tool set available to the model |
| Data lifecycle | Defined retention and deletion | Logging enabled | Documents kept indefinitely |

### Capstone 3: High-volume classification with caching and batch

**Goal.** Classify roughly two hundred thousand short items each night into eight fixed categories, store the results, and publish a quality summary. The work has no interactive latency requirement but has a strict unit-cost ceiling.

**Constraints.**

- Results available by 06:00 each day
- Unit cost below an agreed threshold per thousand items
- Output must be one of eight known values
- Duplicate items must not be billed repeatedly
- Quality must be sampled and reported daily

**Suggested architecture.** Deduplicate inputs first, then send them through a batch endpoint using a small model tier. Keep the instruction prefix identical across the entire run so prompt caching applies. Constrain output to a typed enumeration and reject anything else. A sampled slice is reviewed daily, and the sample size is recorded with the quality report so drift is visible.

```json
{
  "mode": "batch",
  "model_tier": "small",
  "prefix_cache": true,
  "output": { "type": "enum", "values": 8 },
  "deduplicate_before_send": true,
  "daily_sample_size": 500
}
```

**Acceptance criteria.**

- All results written before the 06:00 deadline, with run duration recorded
- Measured cost per thousand items below the agreed ceiling
- Every returned value belongs to the eight-value enumeration
- Duplicate identifiers appear only once in the billed request set
- Daily quality sample of 500 items reported with accuracy by category

**Trade-off to name.** A smaller tier and batch mode reduce cost but remove interactive feedback. The brief explicitly has no interactive requirement, so the trade is safe here and would not be safe in a chat product.

**Grading rubric.**

| Criterion | Full credit | Partial credit | Common failure |
| --- | --- | --- | --- |
| Cost control | Small tier, stable prefix, deduplication | Caching only | Large tier with unique prefixes |
| API mode | Batch processing with a completion window | Synchronous calls with retries | Streaming for offline work |
| Output contract | Enumeration with rejection of invalid values | Prompt asks for valid labels | Free-form text classification |
| Quality monitoring | Daily sample with recorded size | Occasional spot checks | No measurement after deployment |
| Throughput planning | Completion time checked against the deadline | None | No estimate of run duration |

### Capstone 4: Repository refactoring assistant with strict permissions

**Goal.** Provide an assistant that inspects a codebase, proposes refactors across several files, and opens a change for review. The assistant must never push changes, write outside the workspace, or fetch content from the network.

**Constraints.**

- All edits confined to the repository working tree
- No direct commits, pushes, or dependency downloads
- The full test suite must pass before a proposal is presented
- Every proposal is a diff that a reviewer can read
- Generated code must not write directly to the production database

**Suggested architecture.** Encode persistent expectations in a project rules file, then enforce them with tool permissions and hooks. Read tools have workspace scope. Write tools are limited to file edits in the working tree. Network access is denied by default. A hook runs the test suite and a diff scan before any proposal is returned. The model receives a narrow task packet for each refactor rather than the entire repository.

> **Exam note:** Rules files guide behavior; permissions and hooks enforce it. An exam option that relies only on instructions cannot satisfy a strict boundary.

**Acceptance criteria.**

- No proposal contains a commit, push, or dependency download command
- Every file path in a diff resolves inside the repository working tree
- Test suite passes before a proposal is shown to a reviewer
- A diff scan reports zero direct database writes
- Each proposal includes a short rationale tied to the specific files changed

**Trade-off to name.** Running the full suite on every proposal slows the assistant. The constraint is strict enough that speed must yield, and the check is the only reliable proof that the refactor is safe.

**Grading rubric.**

| Criterion | Full credit | Partial credit | Common failure |
| --- | --- | --- | --- |
| Permission model | Scoped reads, restricted writes, no network | Writes restricted only | Full tool access with a warning |
| Enforcement | Hooks and checks on every proposal | Rules file only | Trust in model memory |
| Verification | Tests and diff scan before proposal | Tests only | No verification step |
| Reviewability | Readable diffs with rationale | List of changed filenames | Direct push to the main branch |
| Scope control | Narrow task packets | Full repository each time | Unbounded recursive exploration |

### Capstone 5: Connector server exposing read-only search

**Goal.** Expose an internal search index to an assistant through a connector that allows lookup only. The assistant should be able to find relevant records but never modify, delete, or reindex them.

**Constraints.**

- Only approved collections are searchable
- Credentials are read-only and scoped to those collections
- Per-tenant quotas and rate limits apply
- Results are paginated and field-limited
- Every request is logged with a tenant identifier and a request identifier

**Suggested architecture.** Define a small tool schema with a query, a collection identifier restricted by enumeration, and a page size. The connector validates the collection against an allow-list before issuing any backend call. It uses a dedicated read-only service account and strips fields that are not required for the task. Logs record identifiers and timings but never the full result payload.

**Acceptance criteria.**

- Any request for a collection outside the allow-list is rejected before a backend call
- The service account cannot issue write, delete, or reindex operations
- Responses are paginated, and each item contains only the approved fields
- Per-tenant quotas are enforced and exceeded requests return a clear error
- Logs contain a tenant identifier and request identifier but no full result bodies

**Trade-off to name.** Field stripping and pagination reduce the information available to the model and may require follow-up calls. That cost is preferable to flooding the context or exposing fields the brief never authorized.

**Grading rubric.**

| Criterion | Full credit | Partial credit | Common failure |
| --- | --- | --- | --- |
| Least privilege | Scoped read-only account | Read-only account with broad scope | Administrator credentials |
| Allow-listing | Collection identifiers constrained | Filtering after the query | Arbitrary collection strings |
| Payload control | Field limits and pagination | Pagination only | Whole documents returned |
| Multi-tenancy | Quotas, limits, tenant-scoped logs | Quotas only | Shared state across tenants |
| Interface design | Small typed schema with clear purpose | Typed schema only | Free-form request construction |

### Revision matrix: weak area to chapter

Use this table after scoring the practice papers. Match the symptom you observed, not the topic name you wish you knew better.

| Symptom in practice | Likely weak area | Revisit | Focused drill |
| --- | --- | --- | --- |
| Kept choosing agents for fixed jobs | Shape judgment | Chapter 1 | Mark each scenario as fixed or discovery-driven before reading options |
| Could not spot runaway loops | Loops and delegation | Chapter 2 | Identify the missing stop condition in five scenarios |
| Trusted prompt wording as enforcement | Hooks and guardrails | Chapter 2 and Chapter 11 | Replace each "please" instruction with a hook or schema |
| Wrote vague requirements | Requirements | Chapter 3 | Rewrite three adjectives as metric plus threshold plus condition |
| Confused streaming with batch | API behavior | Chapter 5 and Chapter 6 | Sort ten workloads into interactive and offline columns |
| Missed untrusted-input questions | Security | Chapter 11 | Label every external content source as data in a diagram |
| Overestimated small-tier capability | Model selection | Chapter 9 | State the ambiguity and error cost before picking a tier |
| Miscounted cost drivers | Tokens and cost | Chapter 9 | Separate input growth, output growth, and cache stability |
| Chose the wrong metric for an eval | Debugging and evaluations | Chapter 8 | Pair each system goal with one user-facing metric |
| Allowed excessive tool permissions | Tool use and connectors | Chapter 12 | Rewrite each tool grant as the narrowest possible scope |

### A two-day final-review schedule

Two focused days are more useful than a week of unfocused rereading. Keep the blocks short and force recall before looking anything up. The schedule deliberately puts retrieval first in each block, because recognizing a page you have read is a weaker signal than producing the answer without it. If a block feels difficult, that is the useful part.

Day 1 is diagnostic: find out what is actually weak, then repair two areas. Day 2 is generative: rebuild artifacts from memory and simulate the pressure of the real paper. Do not add new topics on Day 2. A final review is for consolidation, not for first exposure.

| Block | Day 1 | Day 2 |
| --- | --- | --- |
| Morning 1 | Re-read Chapter 14 rationales for missed questions only | Re-attempt the questions you missed twice |
| Morning 2 | Work the revision matrix and revisit two weak chapters | Rebuild one capstone architecture from memory |
| Midday | Short break away from screens | Short break away from screens |
| Afternoon 1 | Sketch all five capstone architectures without notes | Write four measurable requirements from vague briefs |
| Afternoon 2 | Practice the ambiguous-question strategy on ten items | Timed mini-paper of twenty mixed questions |
| Evening | Read Chapter 16 quick-reference once | Read exam-day checklist and stop studying |

### Exam-day checklist

- Confirm the exam window, identity requirements, and allowed environment well before the start time
- Prepare a quiet space, a stable connection, and a charged device if the exam is remote
- Keep a blank sheet nearby for a quick coverage map when a question feels unclear
- Read the scenario twice before reading the options
- Underline mentally the constraints about safety, cost, latency, and reliability
- Eliminate options that contradict a stated constraint before comparing the survivors
- Watch the clock at regular intervals and avoid spending disproportionate time on one item
- Flag uncertain items and return to them after completing the paper
- Never change an answer without a specific reason drawn from the question text
- After the exam, record confusing topics for future study rather than replaying the experience

The checklist works because it removes decisions that do not matter on the day. Logistics, timing, and method should be settled in advance so that your attention is available for the scenarios themselves. The two items that matter most are reading the scenario twice and eliminating options against a stated constraint before comparing the survivors. Everything else supports those two habits.

### Answering ambiguous scenario questions

Ambiguity is intentional. The exam is testing whether you can find the deciding constraint rather than react to a familiar phrase. Use a consistent sequence.

1. Restate the goal in one sentence using only the scenario's words.
2. List the explicit constraints, separating safety, cost, latency, and reliability.
3. Identify which constraint is binding, meaning the one that eliminates the most options.
4. Classify the work as fixed-sequence or discovery-driven.
5. Predict the answer in your own words before looking at the options.
6. Eliminate any option that violates the binding constraint.
7. Among the survivors, prefer the option that enforces behavior deterministically over one that requests it politely.
8. If two options remain, choose the one that is narrower, cheaper to reverse, and easier to observe.

> **Try it:** Take a question you answered correctly for the wrong reason and rewrite the scenario so a different option becomes correct. This forces you to notice which detail was doing the work.

Here is a second, shorter example. A scenario describes a service that must answer within two seconds, has a system prompt of four thousand tokens that never changes, and processes a modest number of requests. Two options remain after elimination: enable batch processing, or cache the stable prefix. Restating the goal gives an interactive service with a firm latency ceiling. Batch violates that ceiling immediately, so it is gone. The unchanged prefix is the qualifying detail that makes caching effective. The answer follows from constraints, not from which technique sounds more advanced.

Now change one detail. Suppose the four-thousand-token prefix is rebuilt with a fresh timestamp on every request. Caching no longer applies because the leading segment never matches, and the correct option becomes something else, such as shortening the prompt or moving the timestamp after the stable portion. Notice that a single phrase reversed the answer. This is why the second reading of the scenario is worth the time it costs.

A practical tip: write the binding constraint in three or four words in the margin of your scratch sheet. Phrases such as "fixed step order," "read-only," "two seconds," or "untrusted input" act as anchors. When you drift toward an attractive but wrong option, the anchor brings you back to what the question actually asked.

## Worked scenario

A scenario describes a service that must answer questions from uploaded contracts, cite supporting text, and avoid executing any action suggested inside a document. Two options look plausible: one adds a long system instruction warning about malicious documents, and one marks document text as untrusted data, verifies citations, and removes state-changing tools from the service.

Restating the goal gives: answer from documents only. The explicit constraints are citation, no state changes, and resistance to embedded instructions. The binding constraint is safety, because a successful injection could cause an irreversible action. Classifying the work does not require an agent loop; retrieval and composition are fixed steps. Predicting an answer in your own words yields "constrain the surface and verify support." The long-instruction option fails because it relies on probabilistic compliance. The second option enforces the boundary structurally and is therefore correct.

Note how the sequence prevented a common error. The word "malicious" in the scenario pushes many candidates toward a larger prompt. The framework redirects attention to the constraint that can actually be enforced.

The same sequence works when the subject is cost. Imagine a scenario with a shared prefix, a two-second deadline, and a small model tier. Restating the goal produces an interactive service. The binding constraint is the deadline, which removes batch processing. The shared prefix then makes caching the remaining cost lever. If the prefix changed on every call, caching would drop out and the answer would shift again. In both cases the reasoning is mechanical: name the goal, name the binding constraint, eliminate, then choose the narrowest survivor.

This mechanical quality is what makes the framework reliable under pressure. You do not need to recall a perfect answer from memory; you need to apply the same eight steps to unfamiliar wording. The more scenarios you practice this way, the less the wording sways you.

## Common mistakes

- Treating a capstone brief as a request to list technologies instead of decisions
- Offering a single architecture for every component when fixed and variable work differ
- Confusing a rules file with an enforcement mechanism
- Forgetting to name a metric and a threshold in a goal
- Reviewing only topics you already understand
- Changing an exam answer because a distractor sounds more sophisticated
- Running out of time on one scenario and rushing the remaining items

## Chapter summary

- Capstones test the ability to extract constraints, choose shapes, and defend trade-offs.
- Fixed-step work belongs in workflows; discovery-driven work belongs in bounded agents.
- Safety and correctness come from schemas, hooks, allow-lists, and verification steps.
- The revision matrix turns a score pattern into a short list of chapters and drills.
- A two-day schedule works because it forces recall and keeps review targeted.
- Ambiguous questions are solved by finding the binding constraint, not by picking the most elaborate option.

## Checkpoint questions

**1.** A brief says a job has a fixed order, published rules, and identical behavior on every run. Which question most usefully comes next?

- A. Which model tier is most expensive?
- B. Does any step depend on a discovery made at runtime?
- C. How long is the system prompt?
- D. Does the service use JSON?

**2.** Which capstone most strongly requires that external content be treated as untrusted data?

- A. High-volume classification with caching and batch
- B. Connector server exposing read-only search
- C. Document analysis service with untrusted input
- D. Repository refactoring assistant with strict permissions

**3.** In the refactoring capstone, which control actually enforces the "no network" constraint?

- A. A sentence in the project rules file
- B. A tool permission configuration that denies network access
- C. A longer system prompt
- D. A suggestion in the README

**4.** Which grading criterion for the batch classifier best addresses cost control?

- A. Stable prefix, small tier, and deduplication
- B. Streaming output with cancellation
- C. Extended thinking with a large budget
- D. A connector with read-only credentials

**5.** A question offers one option that asks the model to be careful and another that validates arguments before execution. Which should you prefer, and why?

- A. The first, because prompts are easier to write
- B. The first, because models always follow system rules
- C. The second, because validation enforces the boundary regardless of model output
- D. The second, because validation removes the need for any other control

**6.** What is the main purpose of a revision matrix after a practice paper?

- A. To replace further study entirely
- B. To turn observed symptoms into targeted chapters and drills
- C. To rank topics by how interesting they are
- D. To prove that no further practice is needed

### Answers and rationale

**1. B.** The deciding question is whether runtime discovery exists. Option A concerns price, which is not relevant to shape; option C concerns length, which does not determine determinism; option D concerns format, which is independent of sequence.

**2. C.** That brief explicitly names external documents with embedded instructions. Option B handles untrusted tool output but is primarily about scoped access; option A deals with stable inputs; option D focuses on workspace permissions.

**3. B.** Permissions deny the capability before the model can attempt it. Option A only guides behavior, option C is advisory, and option D is documentation with no enforcement.

**4. A.** A stable prefix, a small tier, and deduplication each reduce billed units. Streaming and extended thinking increase cost, and connector credentials belong to a different capstone.

**5. C.** Validation is deterministic and does not depend on compliance. Option A optimizes for effort rather than safety; option B is factually wrong; option D overclaims because validation is one layer among several.

**6. B.** It converts a score pattern into a short, actionable plan. The other options either deny the need for targeted work or misstate what the matrix measures.

---

*End of chapter 15.*
