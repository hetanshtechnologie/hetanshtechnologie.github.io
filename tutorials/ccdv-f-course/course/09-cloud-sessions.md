# Chapter 9 — Cloud Hosts, Sessions, and Integration Decisions

## Learning objectives

- Explain what it means to reach a model through a cloud provider rather than a direct vendor endpoint.
- Describe what a provider abstraction simplifies and which differences it cannot erase.
- State where conversation state lives and how to keep separate users and sessions isolated.
- Compare direct API access with managed hosting using control, operations, compliance, and cost lenses.
- Apply a decision checklist to a scenario with competing requirements.
- Recognize how exam questions encode constraints and turn them into an integration choice.

## Key concepts

### Two ways to reach the same kind of capability

An application can call a model through the vendor's own interface, or it can reach models through a cloud platform that hosts or brokers access. In the second arrangement, the platform supplies the endpoint, authentication, billing relationship, and often extra services such as private networking, logging, or governance controls. The model may be identical, but the surrounding contract changes: request shapes, error codes, region choices, and quota management follow the platform's conventions.

Teams choose managed hosting for several reasons. A billing and identity relationship may already exist with a cloud platform. Residency rules may require traffic to stay inside a particular environment. Procurement may prefer one contract, and a shared gateway can centralize policy, observability, and key rotation. None of these reasons concerns raw model quality; they concern the system around the model.

The trade-off is a layer of translation. Platform-specific message formats, streaming events, and error types must be mapped into something the application understands. Newest features may arrive later through a broker than through the direct interface. Capabilities can differ between models available on the same platform, so code that assumes uniform behavior will eventually fail.

> **Exam note:** When a scenario emphasizes existing cloud contracts, regional data rules, or a shared governance layer, the intended direction is usually managed hosting rather than a brand-new direct integration.

### What the abstraction changes, and what it does not

A provider abstraction is a thin layer between business code and any specific endpoint. Done well, it presents one internal shape for messages, one way to request streaming, one set of error categories, and one method for listing available capabilities. Adapters translate that internal shape into whatever a particular host expects. Application code then deals with intents such as "answer this question with grounding" instead of vendor field names.

The abstraction simplifies real work. Credentials live in one place, so rotation does not require edits across the codebase. Retry and timeout policy applies consistently, and telemetry uses common field names for fair comparisons. Swapping a backend for testing becomes configuration rather than rewriting, and different workloads can use different models without scattered conditionals.

It does not make providers identical. Context limits, media types, pricing, rate limits, and streaming details still differ, and a capability on one backend may be absent on another. Retention and regional processing depend on the host and contract, not the abstraction. A layer that pretends uniformity hides real differences, so expose capabilities explicitly and check them before use.

| Concern | Direct vendor API | Cloud-hosted or brokered access |
| --- | --- | --- |
| Authentication and billing | Separate relationship per vendor | Consolidated with the cloud account |
| Request and event formats | Vendor-native | Platform-specific or translated by a gateway |
| Feature availability | Usually earliest | May lag or differ by model and region |
| Data residency controls | Vendor-dependent | Often tied to platform regions and networking |
| Operational tooling | Build or integrate separately | Platform logging, monitoring, and policy tools |
| Switching cost | Higher if calls are scattered | Lower when a clean adapter layer exists |
| Operational burden | More handled by the application team | More delegated to the platform |

A deliberately leaky abstraction is the practical compromise. Normalize the common path, but represent capabilities as data, report unsupported features clearly, and keep provider-specific options in a narrow configuration area. Write a small adapter test for each backend so that translation mistakes surface before production.

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class ProviderProfile:
    name: str
    supports_vision: bool
    supports_streaming: bool
    max_input_tokens: int

PROFILES = {
    "direct": ProviderProfile("direct", True, True, 200_000),
    "cloud": ProviderProfile("cloud", True, True, 200_000),
}

def require_capability(profile: ProviderProfile, feature: str) -> None:
    if feature == "vision" and not profile.supports_vision:
        raise ValueError(f"{profile.name} cannot accept image blocks")
    if feature == "streaming" and not profile.supports_streaming:
        raise ValueError(f"{profile.name} cannot stream responses")

def dispatch(provider_key: str, needs_vision: bool) -> str:
    profile = PROFILES[provider_key]
    if needs_vision:
        require_capability(profile, "vision")
    return f"selected adapter: {profile.name}"
```

The point of this snippet is not the particular fields. It is that a request states what it needs, and the layer checks capability before a call is made. A missing capability becomes a clear error at the boundary rather than a confusing failure deep in generation.

### Session hygiene and state ownership

A model does not remember a conversation between requests. Every call carries the context the application chooses to send. Conversation state therefore belongs in application storage: a database, cache, or document store keyed by a session identifier. Confusing this with model memory is one of the most durable misconceptions in AI application work. If a follow-up question needs earlier turns, the application must include them in the next request.

Session hygiene has several parts. Each history must be isolated so one conversation cannot leak into another. Identifiers should be unpredictable, and access checks must precede every read. Old sessions expire under a defined retention policy, controlling cost and exposure. Histories are summarized or trimmed near the context budget, keeping the current task rather than a raw transcript. Secrets and unnecessary personal data never enter conversation state.

State ownership also determines how failures behave. If the browser holds the whole history, a lost tab loses the conversation and a malicious client can edit prior turns. If the backend owns it, the application can enforce ordering, apply redaction, and keep an audit trail, at the cost of storage and retrieval work. Most production assistants choose backend ownership with a short client-side pointer. A multi-device experience needs that server-side store; a single-page demo may not.

> **Common mistake:** Assuming a session identifier is the conversation. The identifier is only a key; the actual turns live wherever the application stores them and must be reattached to each request.

Session contents deserve the same review as prompts. System instructions are stable and shared; per-turn user content is untrusted and may try to override policy, and tool results can carry the same hazard. Storing these categories separately makes the right trust level easier to apply when rebuilding a request, and it lets evaluations replay a session with one part changed.

### Choosing between direct access and managed hosting

The choice is rarely about which option is better in the abstract. It is about which constraints dominate. A small team shipping a prototype may value the fastest path to a working call and a single SDK. A regulated enterprise may value regional processing, private endpoints, and a unified audit trail far more than the newest feature. A platform team supporting several products may value a common gateway above all.

Cost comparisons must include more than token price. Managed hosting can add per-request overhead or require committed capacity, but it may reduce staffing needs for key management, monitoring, and gateway maintenance. Direct access may look cheaper on a price sheet while creating operational work that nobody budgeted. Conversely, a platform fee is hard to justify when it adds latency and offers no capability the team needs.

Risk and resilience also matter. Depending on one route creates a single point of failure, yet adding a second route introduces translation bugs and inconsistent behavior. A reasonable middle position is a clean internal interface with one primary backend and a tested fallback for the subset of features both support. Deciding which features are in that subset is a design activity, not an afterthought.

| Decision lens | Question to ask | Points toward direct access | Points toward managed hosting |
| --- | --- | --- | --- |
| Latency | Is time to first token tightly bounded? | Fewest hops and full control of routing | Acceptable overhead with regional endpoints |
| Privacy and residency | Must data stay in a named region or network? | Vendor-specific controls already approved | Platform regions and private networking available |
| Governance | Need one place for keys, policies, and logs? | Small estate with few consumers | Shared gateway and audit tooling |
| Capability needs | Is the newest feature required now? | Earliest access to new features | Feature set is sufficient and stable |
| Team skills | Who maintains integration code? | Team comfortable with vendor specifics | Prefer delegated operations |
| Budget model | How is spend measured and capped? | Direct usage pricing fits the forecast | Consolidated billing and platform caps fit |
| Scale and resilience | Are spikes or outages expected? | Custom traffic engineering in place | Platform capacity and routing available |
| Change risk | How often might the backend switch? | Low expected churn | High churn; adapter layer already exists |

No single row decides the matter. A project can score managed hosting on governance and direct access on capability, which means the team must rank the lenses before choosing. That ranking is exactly what the exam likes to test: it presents a constraint, hides it in narrative form, and expects the candidate to name the dominant one.

### Exam-style reasoning about constraints

Scenario questions rarely say "choose managed hosting." They describe a situation and ask for the most appropriate integration decision. A reliable routine is to translate the story into constraints, separate hard constraints from preferences, and then eliminate options that violate a hard constraint.

Consider the phrasing patterns. "Traffic must never leave the approved network footprint" is a hard constraint that rules out any route not offering private connectivity, regardless of model quality. "The organization already has a single cloud contract and wants one bill" is a governance preference that favors consolidation. "The feature must ship next week with a small team" favors the path with the least new machinery. "The assistant must not invent policy" is a grounding requirement, not a hosting choice, though it may drive a retrieval design that influences where data is stored.

Watch for distractors that solve the wrong problem. Changing the prompt will not fix a regional data rule. Adding retries will not fix a missing capability. Switching models will not solve session leakage between users. A good answer addresses the constraint named in the question and does not silently introduce a new risk. When two options both seem plausible, prefer the one that keeps choices reversible: a narrow adapter and explicit capabilities preserve options, while scattering vendor calls through business logic closes them.

> **Exam note:** Translate soft words such as "must," "should," and "prefer" into hard and soft constraints. A "must" eliminates options; a "prefer" only ranks them.

## Decision checklist

Use this checklist before committing to an integration path. Each item should have an answer that can be tested, not a vague intention.

- What is the dominant hard constraint: residency, latency, capability, budget, or governance?
- Which model features are genuinely required rather than merely nice to have?
- Where will conversation state live, and who owns its retention policy?
- How are sessions isolated, expired, and protected from cross-user leakage?
- Which backend owns credentials, and what is the rotation procedure?
- What does the internal abstraction normalize, and which capabilities remain explicit?
- How are streaming events, error categories, and usage totals translated?
- Is there a tested fallback for the features both candidate backends support?
- Can the choice be reversed with configuration changes instead of a rewrite?
- Which constraint would force a different answer if it changed?

## Practice lab

**Goal:** Compare two provider profiles and practice choosing one from constraints rather than preference.

1. Create a small configuration module with two provider profiles like the one above.
2. Write a function that accepts a request description with fields for vision, streaming, region, and governance needs.
3. Add a capability check that raises a clear error when a requirement cannot be met.
4. Run three cases: a prototype chat, a regulated support assistant with a regional requirement, and a bulk job with no interactive user.
5. Record which profile each case selects and which constraint decided it.

**Expected observation:** Different cases select different profiles even with identical code. You should see that a hard regional requirement overrides a preference for newest features, and that a bulk job cares more about queuing and cost than about streaming support. The capability check should fail early and clearly when a requirement is unsupported.

## Worked scenario

A company runs a customer assistant on a direct vendor interface. Growth brings two pressures: the security team requires all traffic to stay within an already approved cloud footprint, and finance wants one consolidated bill. At the same time, a pilot feature needs a capability that the available managed catalogue does not yet expose.

**Reasoning.** Two constraints are hard: network footprint and consolidated billing. Both point toward a managed route in the existing cloud platform. The missing capability is important for one pilot but not for the core assistant, so it is a preference for that pilot rather than a blocker for the whole product. Treating it as universal would let a narrow need dictate the architecture for every user.

**Resolution.** The team introduces an internal interface with an adapter for the managed platform and moves production traffic onto it. Regional endpoints and private networking satisfy the security requirement, and billing consolidates. The pilot runs through a separate, explicitly labeled direct adapter behind the same interface, with capability checks preventing other code from depending on it. Conversation history moves into the backend store with per-user isolation and a retention window, so no session state depends on either provider. Telemetry uses common field names with a provider tag, allowing fair comparison. When the managed catalogue gains the needed capability, only the configuration changes.

## Common mistakes

- Assuming the model remembers prior turns when the application did not resend them.
- Letting a session identifier stand in for actual state ownership and access control.
- Treating a provider abstraction as if it erased differences in features, limits, and pricing.
- Choosing a backend before ranking the hard constraints in the scenario.
- Comparing token prices while ignoring operational and governance costs.
- Scattering provider-specific calls through business logic and losing the ability to switch.

## Chapter summary

- Managed hosting supplies endpoints, identity, billing, and often governance, with platform-specific formats and possible feature lag.
- A provider abstraction normalizes common operations but should expose real capability differences explicitly.
- Conversation state belongs in application storage, with isolation, expiry, and careful trust boundaries.
- Direct access favors earliest features and full control; managed hosting favors consolidation, residency, and shared operations.
- Decision lenses include latency, privacy, governance, capability, skills, budget, scale, and reversibility.
- Exam scenarios should be read as constraints: hard constraints eliminate options, preferences only rank them.

## Checkpoint questions

1. A policy requires all model traffic to remain inside an approved private network. What is the first design consequence?

   - A. Increase the system prompt length
   - B. Choose a route that offers private connectivity and an approved region
   - C. Add more retries to the existing direct endpoint
   - D. Store longer conversation histories in the browser

2. Which statement about a provider abstraction is accurate?

   - A. It makes every backend support identical features
   - B. It removes the need for authentication
   - C. It standardizes common operations while leaving real differences visible
   - D. It guarantees lower token prices

3. Where should conversation state live for a multi-device assistant with access control?

   - A. In the model's memory between requests
   - B. In browser storage only
   - C. In backend storage keyed by an access-controlled session identifier
   - D. Inside the system prompt template

4. A pilot needs a brand-new capability that the managed catalogue lacks, while the core product values consolidated billing. What is a reasonable split?

   - A. Move everything to the direct interface
   - B. Abandon the pilot regardless of its value
   - C. Use labeled adapters behind one internal interface for the distinct cases
   - D. Duplicate business logic for each backend

5. Which wording in a scenario signals a hard constraint rather than a preference?

   - A. "The team would like faster responses"
   - B. "Data must not leave the approved region"
   - C. "A single dashboard would be convenient"
   - D. "The prototype should be simple"

6. What is the main risk of pretending all providers are identical?

   - A. Requests become too short
   - B. Unsupported features fail at runtime and useful differences are hidden
   - C. Sessions automatically become more secure
   - D. Token usage stops being recorded

7. Which item belongs on a session hygiene checklist?

   - A. Defining expiry and isolation for stored conversations
   - B. Increasing output length on every request
   - C. Removing all system instructions
   - D. Sending the full history to every user

### Answers and rationale

1. **B.** A network-residency rule is a hard constraint, so the route must provide private connectivity in an approved region. A changes prompt size, not network path. C retries cannot change where traffic flows. D moves state without addressing the network requirement.

2. **C.** A good layer standardizes common operations while exposing genuine differences. A is false because capabilities differ. B is false because credentials are still required. D is false because pricing is set by the provider.

3. **C.** Backend storage with an access-controlled key supports multiple devices, isolation, and retention policy. A is false because models do not retain conversation state across calls. B loses state on device changes and invites tampering. D would hard-code user data into a shared instruction.

4. **C.** Separate labeled adapters behind one interface let each workload use the route that fits without duplicating business logic. A ignores billing. B discards valid value unnecessarily. D creates maintenance risk and blocks future switching.

5. **B.** "Must not" expresses a hard prohibition that eliminates options. The other phrases describe desires or preferences that only rank options.

6. **B.** Uniform pretense hides real differences and lets unsupported features fail during execution. A is unrelated. C is false; security depends on design. D is false because usage can still be recorded with a translation layer.

7. **A.** Expiry and isolation are core session hygiene concerns. B changes generation length, not state. C removes useful guidance. D would leak conversations between users.

---

*End of chapter 9.*
