# Chapter 22 — Choosing a Model Under Constraints

## Learning objectives

- Explain how quality, latency, and cost interact when selecting a model for a workload.
- Convert a requirement into selection criteria: error cost, deadline, volume, context size, and feature needs.
- Use a decision matrix to compare candidate configurations instead of relying on impressions.
- Design an escalation path that starts with a small model and promotes only the requests that need more.
- Distinguish a moving model alias from a pinned snapshot and state the risk of each.
- Recognize common breaking changes and describe a rollout that limits their damage.
- Decide when an upgrade is justified and what evidence should accompany it.

## Key concepts

### The selection triangle

Model choice is a negotiation among three goals. A more capable model usually improves accuracy on difficult inputs, but it tends to cost more per token and take longer, especially at the slow tail. A faster model shortens the wait and lowers the unit price, but it may miss a constraint that a stronger model would catch. Lowering cost by trimming context or output can help, yet removing the wrong material damages quality.

You cannot maximize all three at once, so the useful question is not "which model is best" but "which constraint binds here." A nightly backfill has no user waiting, so latency barely matters and cost dominates. A checkout assistant has a hard two-second budget, so a cheaper model that sometimes takes four seconds is disqualified regardless of its average. A medical or financial decision may have a high error cost, so a small saving per call is irrelevant beside the risk of one wrong answer.

| Constraint | Question to ask | Effect on selection |
| --- | --- | --- |
| Error cost | What happens when the answer is wrong? | High cost favors a capable tier and a review step |
| Deadline | Is a person waiting on each result? | Tight deadlines favor fast serving and shorter output |
| Volume | How many calls per day or month? | High volume magnifies small per-call differences |
| Context size | How much material must be in the window? | Long, noisy context favors a model that tracks distant details |
| Feature needs | Thinking, tools, structured output, images? | A cheaper tier may not support the required feature |
| Detectability | Can a downstream check catch errors cheaply? | Detectable errors justify a cheaper first pass |

> **Exam note:** When two options both look reasonable, find the explicit constraint in the scenario. A deadline eliminates slow options; an expensive mistake eliminates cheap ones. The answer usually follows from one stated fact, not from a general preference.

### A decision matrix you can actually use

A matrix turns vague preference into a repeatable routine. Write the candidate configurations as rows and the constraints as columns, then mark each cell as a pass, a risk, or a failure. A failure on a hard constraint removes the option regardless of how well it scores elsewhere.

| Situation | Binding constraint | First choice | Fallback | Why |
| --- | --- | --- | --- | --- |
| Short label on high-volume stream | Cost and throughput | Fast tier, no thinking | Balanced tier if accuracy slips | Errors are visible and cheap to fix |
| Customer-facing answer with a two-second target | First-token latency | Balanced tier, fast serving, streaming | Capable tier for flagged cases | A cheap model that misses the deadline fails the requirement |
| Reconciliation of conflicting records | Error cost | Capable tier with bounded reasoning | Human review of low-confidence results | Intermediate checks matter more than unit price |
| Long-document question answering | Context handling | Capable tier with retrieved passages | Balanced tier after compression | Details buried in the middle are easily lost |
| Nightly bulk enrichment | Cost per item | Small or balanced tier in a batch job | Capable tier for a failed subset | Nobody waits, so time is exchangeable for price |
| Ambiguous request with tool use | Adaptation and safety | Capable tier with a bounded loop | Escalate to a person | The next step cannot be predicted in advance |

Notice that the matrix names a *configuration*, not just a model. Serving mode, thinking settings, output limits, and routing rules are part of the choice. Two teams can use the same model and get very different results because one adds a cached prefix and an output cap while the other sends unbounded history.

> **Common mistake:** Comparing models on a leaderboard score instead of on your own test set. A model that wins a general benchmark can still be the wrong choice for a narrow task with a strict deadline.

### Escalation: start small and promote selectively

A single global choice forces you to buy the capability of the hardest request for every easy one. Escalation inverts that. Send each request to a small, inexpensive model first, then promote only the cases that the first pass cannot handle. Promotion can be triggered by an explicit signal from the caller, a cheap rule over structured fields, a schema validation failure, a confidence estimate, or a review flag.

The design works best when the first pass produces something useful even if it is not final. A small model might extract the fields, propose a label, and set a flag when the source text contains conflicting numbers. Those fields let your code decide whether to answer or escalate. Escalation then becomes a normal control flow step rather than an admission of failure.

The pattern has costs. A promoted request pays for two calls, so savings depend on a small promotion rate. A confidence score is not proof; a confidently wrong first answer fires no trigger. Deterministic checks — schema validation, business rules, sampled review — must sit alongside it, and the promotion rate deserves its own metric because drift can erase the saving.

```python
def handle(question, metadata):
    draft = small_model.answer(question, schema="policy_answer")
    if not draft.valid or metadata.get("has_exception"):
        return capable_model.answer(question, schema="policy_answer")
    if draft.low_confidence:
        return review_queue.submit(question, draft)
    return draft
```

The snippet shows three distinct exits: accept, escalate to a stronger model, or escalate to a person. Conflating the last two is a common design error. A stronger model reduces model error; it does not grant authority to make a consequential decision.

> **Try it:** On a sample of real requests, count how often your escalation rule fires and how many of those cases the small model actually got wrong. If the rule promotes many correct answers, tighten it; if it misses wrong ones, add a deterministic check.

### Version identifiers and pinning

The string you pass as a model identifier is not always the same thing. Some identifiers are aliases that move as a provider improves a model or releases a new default. Others name a dated snapshot that stays fixed for the lifetime of the product. A third category is an internal alias in your own configuration that resolves to a chosen snapshot per environment, giving you one name in code and controlled movement behind it.

| Identifier style | What it resolves to | Behaviour over time | Advantage | Risk | Use when |
| --- | --- | --- | --- | --- | --- |
| Moving alias | Provider's current recommended version | Can change without your deploy | Automatic improvements and fixes | Output or limits may shift under you | Early prototypes and low-stakes tools |
| Dated snapshot | A fixed model release | Stable until you edit configuration | Reproducible tests and audit trails | Misses improvements and security fixes | Production systems with regression tests |
| Internal logical name | Your mapping to a snapshot | Changes only when you change configuration | One code path across environments | Requires discipline to keep mappings aligned | Teams with staging and production separation |
| Per-environment override | Different snapshot per environment | Canary in staging, stable in production | Safe evaluation of new releases | Drift if environments are not compared | Controlled upgrades |

Pinning does not forbid upgrades; it makes them deliberate events with test results attached rather than invisible production changes. Record the resolved identifier in every trace so a strange result can be tied to its exact version.

> **Exam note:** If a scenario mentions reproducibility, auditability, or a regression that appeared without a deploy, suspect a moving alias. The fix is to pin a snapshot and log the resolved version.

### Breaking changes and controlled rollout

An upgrade can change more than answer quality. A thinking budget equal to the output ceiling may be rejected; a tool definition once tolerated may fail stricter validation; response blocks may appear in new combinations that break a text-only parser. Context limits, features, and pricing can move too.

| Change surface | Symptom | Pre-rollout guard |
| --- | --- | --- |
| Output and thinking allowance | Validation error on budget values | Assert budget plus expected answer is below the ceiling |
| Tool schemas | Rejected tool definitions at request time | Validate definitions against the new contract in staging |
| Response blocks | Parser errors on an unfamiliar block type | Parse by block type and ignore unknown blocks safely |
| Feature availability | Mode flagged as unsupported | Capability check before enabling the mode |
| Pricing and limits | Unexpected cost or rate-limit errors | Re-run the cost model with published rates for the new version |

A controlled rollout keeps the damage local. Freeze an evaluation set, run the candidate version against it, and compare both quality and tail latency with the pinned baseline. Canary a small share of traffic, watch error rates and spend, then widen gradually. Keep the previous snapshot available so that a rollback is a configuration change rather than a frantic code edit.

### Deciding when to upgrade

Upgrade when you gain something you can name: a measurable improvement on your evaluation set, a capability that removes a workaround, a lower price at equal quality, or the end of support for the old version. "It is newer" is not a reason by itself. Equally, do not postpone forever: an old snapshot may miss safety fixes, lose support, or lock you out of features that would simplify the system.

The decision is revisable. Record why the current model was chosen, what evidence would justify moving, and who reviews that evidence. A quarterly check with a frozen test set is often enough. When the workload changes — new input types, a tighter deadline, a different error cost — reopen the decision instead of assuming the old choice still holds.

> **Common mistake:** Upgrading every model in every environment at once. Without a canary and a rollback path, a subtle change in response structure becomes a broad outage.

## Practice lab

**Goal.** Compare two model configurations under one explicit constraint and practice a safe version change.

**Steps.**

1. Freeze ten representative requests with expected outcomes in a scratch test file.
2. Run them with a small model and a capable model, recording accuracy, latency at the slow tail, and token usage.
3. Write a decision matrix with cost, deadline, and error cost as columns, then mark each configuration pass, risk, or failure against a two-second target.
4. Pin both versions by resolved identifier and repeat one test after switching to a moving alias, noting any difference you can observe.
5. Change one configuration field that the newer version treats differently, such as a reasoning budget, and observe the validation error before fixing it.

**Expected observation.** The small model is cheaper and faster but loses accuracy on the hardest examples. The matrix disqualifies one configuration on the deadline even if it is cheaper. The pinned runs are repeatable, the alias makes version identity less certain, and the invalid budget is rejected rather than silently adjusted.

## Worked scenario

A freight company parses supplier invoices. Most follow one of two layouts; a minority contain handwritten adjustments. Extraction feeds a payment queue, so a bad total can cause a wrong payment. Uploads need a response within five seconds, at roughly 60,000 invoices a month.

They write constraints before picking a model. The deadline excludes slow reasoning on the main path; the error cost is asymmetric, since a wrong total is worse than a slow parse. Volume makes each cent visible, and image input plus structured output are required, while thinking is not.

The first configuration uses a small tier for known layouts, a strict schema, and code that recomputes line-item sums. A layout classifier sends unusual invoices to a capable tier with a bounded budget, holding those results for review before payment.

Three hundred archived invoices verify the design: the small tier handles known layouts well and the capable tier recovers most handwritten cases. A moving alias then causes a slight accuracy shift without a deploy, so they switch to a pinned snapshot, log the resolved version, and add a regression check on every mapping change.

A newer snapshot promising better handwriting is tested on the frozen set and canaried on five percent of uploads, comparing accuracy and promotion rate. It wins without hurting known layouts, so the rollout widens while the old mapping stays available for one release cycle. Each step carries evidence.

> **Exam note:** The reasoning pattern is reusable: name the binding constraint, measure candidates on your own data, pin what you deploy, and promote versions gradually with a rollback available.

## Common mistakes

- Selecting by product reputation instead of by an explicit constraint from the requirement.
- Ignoring tail latency because the average response looks acceptable.
- Escalating every request to a stronger model, which removes the point of escalation.
- Treating a confidence score as proof of correctness and deleting deterministic checks.
- Using a moving alias in a system that needs reproducible results.
- Assuming an upgrade changes only answer quality and cannot affect configuration validation.
- Rolling out a new version everywhere at once without a canary or rollback path.
- Upgrading solely because a newer version exists, with no measurement to justify it.

## Chapter summary

- Quality, latency, and cost trade against each other; the binding constraint decides the choice.
- Error cost, deadline, volume, context size, and feature needs turn a requirement into criteria.
- A decision matrix records configurations against constraints and removes options that fail a hard requirement.
- Escalation starts with a small model and promotes flagged cases, with deterministic checks as a backstop.
- Moving aliases update without a deploy; pinned snapshots trade automatic improvement for reproducibility.
- Upgrades can break budget validation, tool schemas, and response parsing, so canary and rollback matter.
- Upgrade on named evidence: measured quality, needed capability, lower price, or support requirements.

## Checkpoint questions

1. A nightly job enriches archived records and nobody waits for individual results. Which constraint should dominate model selection?

A. Time to first token

B. Cost per item and throughput

C. The model's general benchmark rank

D. The number of content blocks in each response

2. A checkout assistant must answer within two seconds and a wrong answer is easily spotted by the user. Which configuration is the best first candidate?

A. Capable tier with deep reasoning on every request

B. Small tier in a batch job with a long timeout

C. Fast or balanced tier with streaming and a short prompt

D. Any tier with the largest possible context window

3. What is the main risk of escalating from a small model to a larger one?

A. The larger model never improves any answer

B. Promoted requests pay for two calls, and confidently wrong first answers may never trigger promotion

C. Escalation is only possible with batch processing

D. The small model cannot produce structured output

4. Which identifier gives the strongest reproducibility for a production regression test?

A. A moving alias that tracks the provider's current default

B. A dated snapshot recorded in configuration and in traces

C. The model name written in a design document

D. The most expensive model available at test time

5. After an upgrade, requests fail with a validation error about the reasoning budget. What is the most likely explanation?

A. The new release requires a different API key for reasoning

B. The provider now disables all reasoning features

C. The prompt must contain a special instruction to enable budgeting

D. The budget and maximum output now conflict, leaving no room for the answer

6. What is the proper role of a canary rollout?

A. To replace regression testing entirely

B. To expose a small share of traffic to a candidate version before a wider switch

C. To guarantee that no configuration can ever fail

D. To remove the need for logging resolved versions

### Answers and rationale

1. **B.** With no deadline pressure, price and throughput are the levers. A is wrong because nobody is watching first-token speed. C is wrong because general rank does not predict cost efficiency on a narrow task. D is wrong because block structure is a parsing detail, not a selection constraint.

2. **C.** A short prompt, quick serving, and streaming fit a tight deadline with detectable errors. A is wrong because deep reasoning adds delay before the answer. B is wrong because batch work cannot meet a two-second target. D is wrong because a large window does not create speed and may add cost.

3. **B.** Double calls and silent confident errors are the real costs of escalation. A is wrong because promotion often helps. C is wrong because escalation works on ordinary request paths. D is wrong because small tiers commonly support structured output.

4. **B.** A fixed snapshot plus logged identity makes a test repeatable and auditable. A is wrong because a moving alias can change between runs. C is wrong because a document does not pin what the service actually called. D is wrong because price says nothing about identity.

5. **D.** Budget and output limits draw from the same allowance, so equal values leave nothing for the reply. A is wrong because credentials are not the issue. B is wrong because the error is a configuration conflict, not a missing feature. C is wrong because budgeting is an API-level setting.

6. **B.** A canary limits exposure while real traffic is observed. A is wrong because tests are still required. C is wrong because no rollout can guarantee zero failures. D is wrong because version logging remains essential during and after the canary.

---

*End of chapter 22.*
