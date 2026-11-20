# Chapter 14 — Two Full Practice Papers

## Key concepts

### Purpose of these papers

This chapter is a question bank, not a teaching chapter. The two papers below are written to be attempted under exam-like conditions: no notes, no searching, and a single pass through the questions. Their purpose is retrieval practice. Reading a rule and recognizing it are different skills, and the second one is what these papers measure.

Each question presents a short operating situation and asks for the best judgment among four plausible options. The options are deliberately close. Several will sound reasonable in isolation; only one satisfies every constraint stated in the scenario. When you are torn between two choices, reread the scenario for a quiet constraint about safety, cost, latency, or reliability. That constraint is usually the tie-breaker.

### Timing and scoring

Set aside two separate sittings rather than answering all eighty questions in one go. Treat each paper as a timed block, then score it and read every rationale, including the ones for questions you answered correctly. A correct answer reached by luck is worth less than a wrong answer you now understand.

| Score | Interpretation | Recommended next step |
| --- | --- | --- |
| 36–40 | Strong command of the syllabus | Move to the capstones in Chapter 15 and focus on explanation quality |
| 30–35 | Solid, with a few soft spots | Re-read the rationales, then revisit the weak-area rows in the coverage map |
| 24–29 | Uneven understanding | Rework the relevant chapter, then attempt only the missed question numbers |
| Below 24 | Foundations not yet stable | Return to Chapters 1, 5, 8, 9, 10, 11, and 12 before reattempting |

### Coverage map

Both papers sample the whole syllabus. The ranges below let you turn a poor score into a targeted revision list instead of a vague feeling that you "need more practice."

| Syllabus area | Paper A questions | Paper B questions |
| --- | --- | --- |
| Agent versus workflow judgment | 1–3 | 1–3 |
| Loops and delegation | 4–6 | 4–6 |
| Hooks and guardrails | 7–8 | 7–8 |
| Requirements | 9–11 | 9–11 |
| REST, JSON, and asynchronous patterns | 12–14 | 12–14 |
| API messages and tool definitions | 15–17 | 15–17 |
| Streaming, vision, and thinking | 18–19 | 18–19 |
| Caching, batch, and vendor choice | 20–22 | 20–22 |
| Application design and configuration | 23–25 | 23–25 |
| Coding-assistant rules and permissions | 26–27 | 26–27 |
| Debugging and evaluations | 28–30 | 28–30 |
| Model selection | 31–32 | 31–32 |
| Tokens and cost | 33–34 | 33–34 |
| Prompt and context engineering | 35–36 | 35–36 |
| Security | 37–38 | 37–38 |
| Tool use and connectors | 39–40 | 39–40 |

### Answer sheet template

Copy this into a scratch file and fill it in before opening the answer key. Keeping all decisions visible makes it easier to spot a systematic bias, such as reaching for an agent whenever a workflow would do.

```text
Paper A
 1 __  2 __  3 __  4 __  5 __  6 __  7 __  8 __  9 __ 10 __
11 __ 12 __ 13 __ 14 __ 15 __ 16 __ 17 __ 18 __ 19 __ 20 __
21 __ 22 __ 23 __ 24 __ 25 __ 26 __ 27 __ 28 __ 29 __ 30 __
31 __ 32 __ 33 __ 34 __ 35 __ 36 __ 37 __ 38 __ 39 __ 40 __

Paper B
 1 __  2 __  3 __  4 __  5 __  6 __  7 __  8 __  9 __ 10 __
11 __ 12 __ 13 __ 14 __ 15 __ 16 __ 17 __ 18 __ 19 __ 20 __
21 __ 22 __ 23 __ 24 __ 25 __ 26 __ 27 __ 28 __ 29 __ 30 __
31 __ 32 __ 33 __ 34 __ 35 __ 36 __ 37 __ 38 __ 39 __ 40 __
```

> **Exam note:** A scenario that mentions a fixed step order, a published rule set, or an identical sequence on every run is almost always pointing toward a workflow, no matter how impressive an agent sounds.

> **Common mistake:** Choosing the most capable model tier for every task. Capability is an answer only when the scenario contains ambiguity, high error cost, or multi-step planning that a smaller tier cannot handle.

> **Try it:** After scoring, write a one-line reason for each wrong answer in your own words. If you cannot produce a reason, the concept is still unlearned even if the next attempt goes better.

## Practice Paper A

**1.** A support desk labels tickets as billing, access, bug, or other. A published keyword table maps each phrase to exactly one label, and the steps never vary between tickets. Which implementation shape best fits this job?

- A. An autonomous agent that plans its own sequence of investigations
- B. A deterministic workflow with a fixed classification step
- C. A long-running chat session with no tool access
- D. A background batch job that skips all validation

**2.** A user asks an assistant to plan a multi-city trip: compare fares, then choose lodging near the selected flights, then assemble a daily schedule. Each stage depends on what earlier stages discovered, and the full sequence cannot be fixed in advance. Which shape fits?

- A. A workflow with a hard-coded three-step order
- B. A single API call with a very long system prompt
- C. An agent with a bounded loop and relevant tools
- D. A batch request with no intermediate output

**3.** A nightly job reads a file, validates rows against a schema, sends invalid rows to a dead-letter queue, and writes valid rows to storage. The rules are published and the order is identical every run. Which observation is the strongest argument against adding an agent loop?

- A. The job runs at night rather than during business hours
- B. The next step is fully knowable in advance and never depends on a discovery
- C. The schema has more than ten fields
- D. The output is written to storage rather than displayed to a user

**4.** An assistant has issued the same search call with an identical query eight times because the result set is empty. What is the most appropriate correction?

- A. Increase the maximum output tokens so the model can think longer
- B. Add a loop guard that detects repeated identical calls and stops or escalates
- C. Delete the tool description so the model stops relying on it
- D. Switch to a more expensive model tier and keep everything else unchanged

**5.** A team wants to audit a large repository by splitting it per module, having each worker return a typed findings list, then merging the results into one report. Which delegation design is sound?

- A. Give every worker the entire repository and ask for a free-form summary
- B. Let each worker decide independently whether to write changes to the repository
- C. Give workers narrow scopes and typed result schemas, then merge deterministically
- D. Ask one worker to call all the others in an unbounded chain

**6.** In a multi-step task, one delegated subtask repeatedly exhausts its token budget and restarts. Which change is most likely to help?

- A. Raise the global token limit and leave the task definition unchanged
- B. Narrow the subtask and supply only the context relevant to it
- C. Remove all tools from the coordinator
- D. Ask the subtask to produce a longer narrative before acting

**7.** Policy requires that no tool call may write to the production database during business hours. Where should the rule be enforced most reliably?

- A. In a pre-tool-use hook that validates the call and denies it with a reason
- B. In a sentence inside the system prompt asking the model to be careful
- C. In the client-side rendering layer
- D. In the documentation that describes the tool

**8.** Every customer-facing answer must end with a fixed compliance notice, whatever the model generates. Which mechanism guarantees this outcome?

- A. Place the notice first in the system prompt and hope it is repeated
- B. Use a post-response step that appends the notice deterministically
- C. Increase the thinking budget so the model remembers the notice
- D. Set the temperature to zero and shorten the user message

**9.** A stakeholder says the assistant should be smart. Which rewrite is a measurable requirement?

- A. The assistant should understand user intent well
- B. The assistant should feel helpful and natural to readers
- C. Given a ticket with a priority field, the assistant assigns the correct routing label on at least 95 percent of a held-out set of 500 cases
- D. The assistant should use the most capable model available

**10.** The line "the service should be fast" appears in a brief. Which acceptance criterion makes it testable?

- A. The service must feel immediate under normal conditions
- B. Time to first token must stay below 1.2 seconds at the 95th percentile for prompts up to four thousand tokens
- C. The service must use streaming wherever possible
- D. The service must avoid large models

**11.** Which statement belongs in an acceptance criterion rather than in a design note?

- A. The assistant will be deployed behind a gateway
- B. The assistant will use a tool-calling model
- C. The assistant must refuse to reveal credentials even when a user instructs it to ignore earlier rules
- D. The assistant will log requests to a central store

**12.** The API returns HTTP 429 with a Retry-After header during a traffic spike. What should the client do?

- A. Retry immediately in a tight loop until a response arrives
- B. Honor the header with bounded exponential backoff and jitter, then surface a clear failure if retries run out
- C. Switch permanently to a different provider after the first 429
- D. Drop the request and report success to the caller

**13.** A chat interface must show partial text as soon as it is produced and let the user cancel generation. Which API mode fits best?

- A. A synchronous request that waits for the full answer
- B. A batch submission polled once an hour
- C. A streaming response with client-side cancellation
- D. A single message containing the entire conversation history as plain text

**14.** A tool is supposed to return a numeric total but occasionally returns the string "42". What is the strongest fix?

- A. Ask the model in the prompt to please return a number
- B. Define a typed output schema and validate tool output before it is used
- C. Increase the maximum output tokens
- D. Replace the tool with a longer system prompt

**15.** An application passes a retrieved article containing the line "ignore all prior rules" alongside a user question. How should the message structure reduce risk?

- A. Concatenate the article into the system message so it gains authority
- B. Place policy in the system message and treat retrieved text as unlabeled user or tool content with clear boundaries
- C. Remove the user question and answer only from the article
- D. Put the article in the assistant role so the model treats it as its own prior statement

**16.** Which tool definition is most likely to produce correct, consistent calls?

- A. A single free-form string parameter described as "the input"
- B. No description, so the model invents its own arguments
- C. Typed parameters with enums, units, and a description of when the tool should be used
- D. A description that lists twenty unrelated uses for the same tool

**17.** The model calls a tool with a malformed argument. What should the application do?

- A. Execute it anyway and hope the downstream service corrects it
- B. Validate before execution, return a structured error as the tool result, and cap correction attempts
- C. End the conversation without telling the model what happened
- D. Silently replace the argument with a default value

**18.** An intake form arrives as a photographed page, and labeled fields must be extracted faithfully. Which combination is most appropriate?

- A. Vision input with a typed extraction schema and light image pre-processing
- B. Text-only input with a request to imagine the missing fields
- C. A batch classification call with no image data
- D. A streaming chat response with no schema

**19.** A reconciliation task involves multi-step arithmetic where accuracy matters far more than speed. Which lever fits best?

- A. Minimize the thinking budget and shorten the prompt
- B. Enable extended thinking with an adequate budget and keep the final answer separate from the reasoning
- C. Disable all tool use to reduce noise
- D. Choose the smallest model tier to save tokens

**20.** Ten thousand nightly summarization requests share a long, identical instruction prefix. Which two levers best reduce cost and latency?

- A. Streaming and a larger model
- B. Prompt caching for the stable prefix and batch processing for the work
- C. Longer output limits and higher temperature
- D. Repeated system messages and synchronous retries

**21.** Which workload is the poorest fit for a batch API?

- A. Overnight scoring of a large document set
- B. Nightly generation of report summaries
- C. Interactive chat that must answer within two seconds
- D. Offline evaluation of a prompt change

**22.** A team wants the option of changing model providers later without rewriting the application. Which practice best supports that goal?

- A. Embed provider-specific tokens deeply in stored prompts
- B. Keep model access behind a thin internal interface and record the model identifier with each trace
- C. Hard-code model names in every feature module
- D. Avoid logging model versions so the system stays flexible

**23.** A service must route each request to a cheap or capable tier using explicit rules, with a safe fallback. Which design fits?

- A. Let the model choose its own tier on every turn
- B. Use a configuration-driven router with logged decisions and a default tier
- C. Always use the most capable tier to avoid routing mistakes
- D. Store the tier in the user message so it is visible to the caller

**24.** Where should an API key used by the server-side client be stored?

- A. In the system prompt so the model can use it when needed
- B. In a client-side configuration file shipped with the page
- C. In a secret manager or environment injected at runtime, never in prompts or client bundles
- D. In a tool description that the model reads on demand

**25.** A multi-tenant application caches prefixes containing tenant-specific policy text. What prevents cross-tenant leakage?

- A. Use one shared cache key so hits are maximized
- B. Include a tenant identifier in the cache key and isolate conversation state
- C. Disable logging for all tenants
- D. Put all tenants in the same conversation history

**26.** A team wants the coding assistant to run the full test suite before proposing any commit. Where should this rule live?

- A. In a one-off chat message at the start of a session
- B. In a project rules file reinforced by a hook or check that actually runs the tests
- C. In the README as a polite suggestion
- D. In the model name chosen for the assistant

**27.** The coding assistant tries to write a file outside the repository. Which control is most appropriate?

- A. Allow all writes and review them later
- B. Restrict tool permissions to workspace paths and require approval for writes outside them
- C. Disable the assistant's read tool as punishment
- D. Ask the model to promise not to do it again

**28.** Answer quality dropped immediately after a prompt edit. What is the best first diagnostic step?

- A. Rewrite the entire application from scratch
- B. Compare against a frozen evaluation set and inspect traces around the change
- C. Increase the temperature to introduce variety
- D. Blame the model provider and switch tiers

**29.** Which evaluation setup best supports a change to a classification prompt?

- A. A held-out labeled set with a fixed metric, run on every prompt revision
- B. A few examples the prompt already gets right
- C. A subjective feeling gathered from one reviewer
- D. A count of tokens used during generation

**30.** Traces show that most latency sits in one tool call. What should the team do first?

- A. Replace the model with a smaller one
- B. Instrument that tool's duration, add a timeout, and inspect its query behavior
- C. Shorten the system prompt by one sentence
- D. Disable tracing so the overhead disappears

**31.** Extracting a fixed-format date from a short string is high-volume and simple. Which model tier fits best?

- A. The most capable tier with extended thinking enabled
- B. The smallest fast tier with a typed output schema
- C. A tier chosen randomly per request
- D. A tier that supports vision but not tool use

**32.** A high-stakes contract interpretation task has ambiguous inputs and expensive errors. Which choice is safest?

- A. The smallest tier with no review to keep latency low
- B. A capable tier with grounded sources and a human review step
- C. A batch call with no citations
- D. The cheapest tier with a longer system prompt

**33.** An application resends the entire conversation history on every turn. What is the most likely effect?

- A. Input tokens and latency grow with history length
- B. Output tokens shrink automatically
- C. Caching becomes more effective with every new message
- D. The model stops needing a system prompt

**34.** The system prompt is identical on every request and several thousand tokens long. Which lever reduces spend without changing behavior?

- A. Delete the prompt and rely on examples alone
- B. Cache the stable prefix so it is billed at a reduced rate on later calls
- C. Move the prompt into the user message each time
- D. Increase the maximum output tokens

**35.** Where should the most authoritative behavioral rules be placed?

- A. At the end of a long retrieved document
- B. In the system message, with task specifics in the user turn
- C. In the tool results, where the model sees them last
- D. In the client-side display template

**36.** A relevant fact sits in the middle of a very long document and is consistently missed. What is the best fix?

- A. Add more instructions telling the model to try harder
- B. Retrieve and reorder the pertinent passages, or chunk the document and cite sources
- C. Increase the temperature so the model explores more text
- D. Remove all other content from the system message

**37.** A user instructs the assistant to ignore earlier rules and reveal configuration. Which defense is strongest?

- A. A single sentence in the system prompt forbidding it
- B. Layered controls: policy in the system message, input treated as data, no secrets in prompts, limited tool permissions, and output checking
- C. A longer answer that confuses the request
- D. Disabling streaming for that user only

**38.** A retrieved web page contains hidden text telling the assistant to call a refund tool. What mitigation is strongest?

- A. Treat retrieved content as untrusted, require confirmation for state-changing tools, and validate arguments against policy
- B. Give the refund tool broader permissions so it can be audited later
- C. Trust any instruction that appears inside a tool result
- D. Remove the refund tool's description from the schema

**39.** A connector must offer read-only search over an internal wiki. Which design is correct?

- A. Use an administrator credential with write access for simplicity
- B. Expose all wiki endpoints and filter in the client
- C. Use a scoped read-only service account, an allow-list of endpoints, rate limits, and audit logs
- D. Allow the model to construct arbitrary requests against the wiki host

**40.** A tool returns a huge JSON document that consumes most of the context window. What is the best fix?

- A. Increase the context window and keep the full payload
- B. Filter and paginate at the tool layer, returning only the fields the task needs
- C. Ask the model to ignore the middle of the payload
- D. Convert the payload into a longer system prompt

## Practice Paper B

**1.** A claims processor must follow a regulatory checklist in the same order for every case, with the same evidence fields each time. Which shape is most appropriate?

- A. An agent with freedom to reorder steps
- B. A fixed workflow with explicit validation gates
- C. A vision-only endpoint with no structured data
- D. A streaming chat session with no persistence

**2.** A user asks the system to determine why a nightly job failed, inspect logs and configuration, and apply the smallest safe fix. The investigation path cannot be known in advance. Which shape fits?

- A. A deterministic workflow with a fixed five-step sequence
- B. A bounded agent loop with diagnostic tools and a stop condition
- C. A batch classification call
- D. A single synchronous message with no tools

**3.** Which question best separates an agent from a workflow?

- A. Does the application use JSON?
- B. Does the next step depend on information discovered at runtime rather than fixed in advance?
- C. Does the application run in the cloud?
- D. Does the response contain more than one paragraph?

**4.** An assistant calls a failing tool twelve times with slightly different malformed arguments and never reports the problem. What correction is best?

- A. Add a per-tool failure budget, return structured errors, and stop to ask for help at the threshold
- B. Increase the thinking budget and keep retrying
- C. Remove error messages from the tool results
- D. Switch to a provider with faster timeouts

**5.** Parallel workers each research a different region, and a synthesizer combines their findings. What makes the synthesis reliable?

- A. Let each worker write directly to the final report
- B. Require typed results with source references, then merge them deterministically
- C. Give all workers the same region to encourage agreement
- D. Remove the synthesizer and concatenate raw transcripts

**6.** A coordinator spends most of its token budget re-reading the full task and repeating context to workers. What change helps most?

- A. Give each worker a self-contained task packet containing only relevant context
- B. Remove all stop conditions from the loop
- C. Ask workers to restate the whole task before acting
- D. Increase the maximum output tokens globally

**7.** An audit requires a record of every tool invocation, including arguments, with sensitive values removed. Which mechanism fits?

- A. A hook that emits structured, redacted events around tool calls
- B. A note in the system prompt asking the model to behave transparently
- C. A screenshot of the final answer
- D. A count of total tokens used

**8.** An assistant produces confident answers that are not supported by the supplied sources. Which guardrail addresses this directly?

- A. A higher temperature to encourage variety
- B. A groundedness check that compares claims to source spans and blocks unsupported answers
- C. A shorter user message
- D. A larger context window with more unrelated documents

**9.** The requirement "the assistant must not hallucinate" needs to become testable. Which rewrite works?

- A. The assistant should be as accurate as possible
- B. The assistant should sound certain about its answers
- C. On a 300-question set with supplied passages, at least 98 percent of claims cite a supporting span, and unsupported cases are labeled
- D. The assistant should use a capable model at all times

**10.** A brief says responses should arrive quickly. Which acceptance criterion is measurable?

- A. Answers should not keep users waiting
- B. The service should never use batch processing
- C. The 95th percentile time to first token must be under 1.5 seconds for prompts up to eight thousand tokens
- D. The service should prefer short system prompts

**11.** Which statement is a non-functional constraint rather than a feature description?

- A. The assistant can summarize a meeting transcript
- B. The assistant can draft a reply
- C. All inference requests and tool calls must be retained for 400 days in immutable storage
- D. The assistant offers three response styles

**12.** A retried write request must not create duplicate records. Which pattern is essential?

- A. Retry with the same idempotency key and honor backoff guidance
- B. Retry immediately with a new key each time
- C. Ignore server errors and report success
- D. Convert the write into a streaming response

**13.** A client needs partial output as it is generated and a way to stop early. Which combination is correct?

- A. Batch submission with manual polling
- B. Streaming responses plus a cancellation path
- C. Synchronous request with a very long timeout
- D. A single message that embeds the entire history as plain text

**14.** A long job reports completion through a webhook. Which handling is correct?

- A. Trust every delivery and process it repeatedly
- B. Verify the signature, deduplicate by event identifier, and handle delivery idempotently
- C. Ignore the webhook and poll once a week
- D. Store the payload in the system prompt for later reference

**15.** A multi-turn application keeps rebuilding its system prompt with small wording changes each turn. What is the likely consequence?

- A. Cache hits improve because the prompt changes
- B. Cache hits are lost because the stable prefix keeps moving
- C. The model stops accepting tool results
- D. Token usage becomes irrelevant

**16.** A tool accepts a status field that has exactly four valid values. How should the schema express this?

- A. As a free-form string with no guidance
- B. As an enumeration with descriptions for each value
- C. As a boolean, regardless of meaning
- D. As a nested object with no constraints

**17.** Which tool result helps the model recover from an error most effectively?

- A. A long paragraph of prose with no structure
- B. A typed error object with a code and a suggested correction
- C. An empty string that hides the failure
- D. The entire internal stack trace with credentials included

**18.** An application streams a final answer while the model reasons internally. What should the user see?

- A. The raw internal reasoning, token by token
- B. Only the final answer, with reasoning kept private
- C. Both, interleaved without labels
- D. Nothing until the entire process finishes

**19.** Photographs of small print produce poor extraction. Which pre-processing step is most useful?

- A. Shrink the image to reduce token use
- B. Crop and enlarge the relevant regions before passing them as image input
- C. Replace the image with a blank placeholder
- D. Ask the model to guess the illegible words

**20.** An evaluation harness reruns the same 500 prompts nightly, changing only the system instruction. Which approach saves the most without changing the experiment?

- A. Cache the stable shared portion and send the changed portion separately
- B. Remove the system instruction entirely
- C. Increase output length so results are more detailed
- D. Run each prompt three times with different temperatures

**21.** Which statement is not a benefit of batch processing?

- A. Lower unit price for large volumes
- B. Better throughput for work that is not time-critical
- C. Guaranteed sub-second responses for interactive users
- D. Simpler handling of large offline jobs

**22.** A team may switch vendors next quarter. Which logging choice supports that plan?

- A. Record only the final text, not the model or token counts
- B. Record model identifier, token usage, latency, and request parameters with each trace
- C. Store all prompts in the client browser
- D. Disable tracing to reduce storage costs

**23.** A new deployment starts with an invalid temperature value in configuration. What should the service do?

- A. Fail fast at startup with a clear validation error
- B. Silently substitute a random value
- C. Wait until the first user request to discover the problem
- D. Round the value to zero without warning

**24.** A new prompt is rolled out to a small slice of traffic before a full release. What makes this a safe canary?

- A. No comparison metrics, only a gut feeling
- B. A defined metric, a small traffic slice, and an immediate rollback switch
- C. Sending the new prompt to every internal test account at once
- D. Removing the old prompt from version control

**25.** A service must keep certain data within a specific region. Which design decision matters most?

- A. Choose model endpoints and storage that satisfy the residency requirement
- B. Use the fastest available endpoint regardless of location
- C. Store data wherever caching is cheapest
- D. Let each user pick a region at runtime without checks

**26.** A repository rule forbids generated code from writing directly to a database. How should the team enforce it reliably?

- A. State it once in chat and trust the assistant's memory
- B. Combine a project rules file with a check in continuous integration that scans the diff
- C. Rename the database module so it is harder to find
- D. Remove all tests so failures are not noisy

**27.** The coding assistant asks to fetch a package from an unfamiliar domain. Which control is appropriate?

- A. Allow all network access during development
- B. Use a domain allow-list, require approval for new domains, and log the request
- C. Disable logging for network activity
- D. Install every requested package automatically

**28.** Wrong answers appear only in long conversations and never in short ones. What is the best first hypothesis and test?

- A. Context dilution; build a reproduction that varies history length and inspects token composition
- B. Model malfunction; replace the provider immediately
- C. Network failure; increase the timeout
- D. Font rendering; change the client theme

**29.** A test set was built from the same examples used to write the prompt. What is the main problem?

- A. The set is too small to measure anything
- B. The evaluation is contaminated and will overstate quality; hold out fresh examples and version the set
- C. The set contains too many hard cases
- D. The set should be rewritten in a different language

**30.** Which pair of metrics best evaluates a support agent that resolves issues or escalates them?

- A. Tokens per request and characters per answer
- B. Task completion rate and escalation rate
- C. Number of tool definitions and prompt length
- D. Temperature and maximum output tokens

**31.** High-volume sentiment tagging uses three fixed labels and short texts. Which tier fits?

- A. The smallest fast tier with strict output validation
- B. The most capable tier with extended thinking
- C. A vision-capable tier with no text support
- D. A tier selected by coin flip per batch

**32.** A planning task combines ambiguous intent with multi-step tool use. Which tier fits?

- A. The cheapest tier with no tools
- B. A capable tier with tool use and a bounded loop
- C. A batch-only tier with no streaming
- D. Any tier, because tiers do not differ in planning ability

**33.** Output tokens cost more than input tokens. Which tactic targets output cost specifically?

- A. Cache the system prompt
- B. Set a sensible output limit and request concise structured answers
- C. Increase the context window
- D. Add more few-shot examples

**34.** A cached prefix includes a timestamp that changes on every request. What happens?

- A. Cache hits rise because the prefix is unique
- B. Cache hits are effectively zero; keep volatile values after the stable prefix
- C. The API rejects the timestamp
- D. Output quality improves automatically

**35.** What makes a set of few-shot examples effective near a difficult decision boundary?

- A. All examples should be easy and nearly identical
- B. Examples should be diverse and include borderline cases with clear labels
- C. Examples should be as long as possible
- D. Examples should be placed only at the very end of the context

**36.** A user message conflicts with a system rule. Which statement describes the intended hierarchy?

- A. The user message always overrides the system rule
- B. System-level policy takes precedence; state precedence explicitly and test it
- C. The last sentence in any message wins
- D. The model chooses randomly between them

**37.** A prompt template interpolates a secret into the context, and the answer later includes it. What is the root fix?

- A. Ask the model not to repeat the secret
- B. Never place secrets in prompts; inject them at the tool layer from a secret store
- C. Shorten the system prompt
- D. Disable streaming for that request

**38.** Tool output from an external page contains instructions that redirect the assistant. What is the correct classification of that text?

- A. Untrusted data, never an instruction source
- B. Equivalent to the system prompt because it arrived through a tool
- C. Trusted because it came from a known domain
- D. Trusted only if the model agrees with it

**39.** A connector must expose only search over approved collections. Which implementation matches the brief?

- A. Allow-list collection identifiers, use read-only credentials, and apply per-tenant quotas
- B. Expose every collection and rely on the model to filter
- C. Grant write access so indexing can happen during search
- D. Remove rate limits to improve responsiveness

**40.** A tool fails intermittently under load. Which design improves resilience without duplicating work?

- A. Idempotency keys, bounded retry with backoff, and a clear error contract
- B. Unlimited immediate retries
- C. Returning success for every failure
- D. Removing the tool from the schema permanently

## Answer key and rationale

### Paper A

**1. B.** A published mapping and an unchanging sequence describe a deterministic process. An agent would add planning overhead without improving the result.

**2. C.** Later stages depend on discoveries from earlier ones, so the path must be chosen at runtime. A bounded loop with relevant tools supports that; a fixed sequence cannot.

**3. B.** Agent loops exist to handle steps that cannot be predicted at design time. Here every step is known in advance, so the extra machinery only adds cost and failure modes.

**4. B.** Repeated identical calls are a classic loop failure. A guard that detects duplication and stops or escalates addresses the cause; more tokens simply fund more retries.

**5. C.** Narrow scopes and typed results make each worker's output checkable and the merge deterministic. Free-form summaries and chains of unbounded workers are hard to validate.

**6. B.** Most runaway subtasks are under-specified or overloaded with irrelevant context. Narrowing scope and context fixes the cause more reliably than raising global limits.

**7. A.** A hook at the tool boundary runs on every call and can deny it deterministically. Prompt wording is advisory and cannot guarantee a policy outcome.

**8. B.** A deterministic post-processing step always appends the notice. Prompt instructions and sampling settings are probabilistic, so they cannot guarantee identical output.

**9. C.** It names the input, the task, a numeric threshold, and a held-out set. The other options are qualities or implementation choices, not measurements.

**10. B.** It defines a metric, a percentile, a load condition, and an input size. Words like "fast" or "immediate" cannot be tested consistently.

**11. C.** It states a behavior that can be tested with an adversarial prompt. The other statements describe deployment or implementation details.

**12. B.** The header tells the client when to retry, and bounded backoff with jitter avoids a retry storm. Immediate retries worsen overload, and reporting success hides the failure.

**13. C.** Streaming delivers incremental text, and cancellation stops work the user no longer wants. Batch and synchronous modes withhold output until completion.

**14. B.** A schema plus validation enforces the contract at the boundary. A polite prompt instruction is not a guarantee, and output length is unrelated to type correctness.

**15. B.** Policy belongs in the system message, while retrieved text should be marked as untrusted content. Giving article text system-level authority invites the injection to succeed.

**16. C.** Types, enumerations, units, and a clear purpose statement constrain the call and help the model choose correctly. Vague or missing descriptions invite invented arguments.

**17. B.** Validate first, then return a structured error so the model can correct itself within a bounded number of attempts. Silent defaults and hidden errors produce wrong actions.

**18. A.** Vision input reads the page, a typed schema constrains the extracted fields, and pre-processing improves legibility. Text-only approaches cannot recover information that was never provided.

**19. B.** Extended thinking trades latency for extra reasoning steps, which suits accuracy-critical arithmetic. Minimizing the budget or the model tier moves in the opposite direction.

**20. B.** A stable prefix is ideal for prompt caching, and non-urgent volume is ideal for batch processing. Streaming and larger models increase cost rather than reduce it.

**21. C.** Batch APIs trade latency for price and throughput. Interactive chat with a two-second requirement needs an online path.

**22. B.** An internal interface limits how deeply provider specifics spread, and trace records make migration measurable. Hard-coded names and missing logs create hidden coupling.

**23. B.** Explicit configuration makes routing auditable, and a default tier handles unknown cases safely. Letting the model pick its own tier removes the control the scenario requires.

**24. C.** Runtime injection from a secret manager keeps the key out of prompts, logs, and client bundles. Prompts and client files are readable by parties who should not hold credentials.

**25. B.** Tenant-specific cache keys prevent one tenant's policy text from being served to another. A single shared key maximizes hits at the cost of a serious isolation failure.

**26. B.** A rules file guides behavior, but a hook or check enforces it every time. A one-off chat message disappears with the session.

**27. B.** Path restrictions and approval gates enforce the boundary regardless of what the model decides. Promises and retrospective review do not prevent the unauthorized write.

**28. B.** A frozen evaluation set and trace comparison isolate the prompt change from other variables. Rewriting the system or blaming the provider destroys the evidence needed to diagnose.

**29. A.** A held-out labeled set with a fixed metric detects regressions objectively. Examples the prompt already handles cannot reveal a weakness.

**30. B.** Instrumenting the slow tool reveals whether the time is spent in query planning, transfer, or waiting. Replacing the model does not touch the measured bottleneck.

**31. B.** Simple, high-volume extraction rewards speed and low cost, and a schema makes the output dependable. Extended thinking is unnecessary expense here.

**32. B.** Ambiguity and high error cost justify a capable tier plus human oversight. Price and latency should not dominate a decision with expensive mistakes.

**33. A.** Input tokens accumulate with history, which raises both cost and latency. Output size is unaffected, and a changing history makes prefix caching less effective.

**34. B.** Caching a repeated prefix lets later calls reuse computation at a lower billed rate. Deleting or relocating the prompt changes behavior, which the scenario rules out.

**35. B.** System-level rules carry the greatest authority, with task details in the user turn. Rules buried in retrieved or tool content compete with data and are easier to displace.

**36. B.** Retrieval and reordering place the pertinent passage where the model will use it, and citations make support checkable. Telling the model to try harder does not change the input.

**37. B.** No single sentence is sufficient; layered controls reduce both disclosure and the damage if a rule is bypassed. Keeping secrets out of prompts is the most important layer.

**38. A.** Retrieved content is data, and state-changing tools should require confirmation plus argument validation. Broader permissions magnify the harm of a successful injection.

**39. C.** Scoped read-only credentials, endpoint allow-listing, rate limits, and logs match a read-only search brief. Administrator credentials and arbitrary requests violate least privilege.

**40. B.** Filtering and pagination at the tool layer keep the context focused on relevant fields. A larger window masks the problem and increases cost on every call.

### Paper B

**1. B.** Regulatory checklists with fixed order and fixed fields are deterministic processes. An agent would introduce variation precisely where variation is forbidden.

**2. B.** The investigation path is unknown at the start, which is the defining signal for an agent. A bounded loop and diagnostic tools allow discovery with a clear stopping point.

**3. B.** The distinguishing feature is whether the next action is derived from runtime findings rather than fixed in advance. JSON, hosting, and answer length are irrelevant.

**4. A.** A failure budget and structured errors turn a silent loop into a bounded, explainable one. More thinking time without error feedback simply produces more failed attempts.

**5. B.** Typed results with sources make each contribution checkable, and deterministic merging avoids another round of model interpretation. Raw transcripts and direct writes are hard to audit.

**6. A.** Self-contained packets give workers what they need without repeating the full task. Longer restatements and removed stop conditions increase the waste.

**7. A.** Hooks run on every tool call and can emit structured, redacted events. A prompt request has no enforcement guarantee and no consistent format.

**8. B.** A groundedness check tests claims against the supplied spans and blocks unsupported ones. Sampling changes and larger contexts do not verify support.

**9. C.** It defines a dataset, a numeric threshold, and a behavior for unsupported cases. Words like "accurate" or "certain" are not measurable.

**10. C.** It supplies a metric, a percentile, a load point, and an input size. "Not keep users waiting" is a preference, not a criterion.

**11. C.** Retention and immutability are constraints on how the system operates, not features it offers. The other options describe capabilities.

**12. A.** An idempotency key lets the server recognize a retry and avoid a second record. New keys on each attempt defeat the mechanism.

**13. B.** Streaming provides incremental output and cancellation stops unnecessary work. Batch and plain synchronous calls cannot satisfy either requirement.

**14. B.** Signature verification proves origin, deduplication prevents double processing, and idempotent handling covers repeated delivery. Trusting every delivery is unsafe.

**15. B.** Prefix caching depends on a stable leading segment. Rewording the system prompt each turn invalidates the cache even when the meaning is unchanged.

**16. B.** An enumeration communicates the valid set and lets the schema reject anything else. Free-form strings and unrelated types produce inconsistent calls.

**17. B.** A structured error with a code and suggestion gives the model a path to recovery. Hidden failures and unredacted traces either block correction or leak data.

**18. B.** Internal reasoning should remain private while the final answer is streamed. Exposing raw reasoning can reveal sensitive intermediate content and is not required by the brief.

**19. B.** Cropping and enlarging the relevant regions improves legibility before vision processing. Shrinking the image removes detail, and guessing invents data.

**20. A.** The shared portion can be cached while only the changing instruction is resent. Removing the instruction would change the experiment, and repeated sampling increases cost.

**21. C.** Batch processing explicitly trades latency for price and throughput, so guaranteed sub-second replies are not a benefit. The other statements describe real advantages.

**22. B.** Model identifiers, token counts, latency, and parameters make cost and behavior comparable across vendors. Text-only logs hide the information needed for a migration decision.

**23. A.** Invalid configuration should stop deployment with a clear message. Random substitution and delayed discovery allow a broken service to reach users.

**24. B.** A metric, a small slice, and a rollback switch turn a rollout into a controlled experiment. Internal accounts and intuition do not protect production traffic.

**25. A.** Residency is satisfied by choosing endpoints and storage in the required region. Speed, cost, or user preference cannot override a legal constraint.

**26. B.** A rules file shapes suggestions, and a continuous-integration check enforces the prohibition on every change. Chat memory and obscurity are not controls.

**27. B.** An allow-list with approval and logging constrains network access without blocking legitimate work. Allowing everything or hiding the audit trail removes the safeguard.

**28. A.** A length-dependent failure points to context dilution, and a controlled reproduction confirms it. Provider, network, and theme explanations do not fit the observed pattern.

**29. B.** Testing on examples used to build the prompt measures memorization rather than generalization. Fresh held-out examples and versioned sets give a trustworthy signal.

**30. B.** Completion and escalation describe the job the agent is meant to do. Token and prompt statistics measure implementation, not user outcomes.

**31. A.** Short texts with fixed labels need speed and strict validation, not deep reasoning. Vision support and random selection are irrelevant to the task.

**32. B.** Ambiguity combined with multi-step tool use calls for a capable model and a bounded loop. Cheap tiers and batch-only modes cannot manage that complexity.

**33. B.** Output limits and concise structured answers directly reduce generated tokens. Caching targets input, and more examples usually add input tokens.

**34. B.** A changing timestamp breaks prefix reuse because the leading segment never matches. Volatile values should come after the stable portion.

**35. B.** Borderline examples with clear labels teach the boundary that matters. Identical easy examples and extreme length do not improve discrimination.

**36. B.** System-level policy governs behavior, and stating precedence explicitly reduces conflict. User override, recency rules, and randomness undermine the hierarchy.

**37. B.** Secrets must never enter the context in the first place; injecting them at the tool layer from a secret store removes the exposure entirely. Asking the model to hide them is unreliable.

**38. A.** Text arriving through a tool is untrusted data even when the domain is familiar. Treating it as policy or awaiting model agreement both fail under injection.

**39. A.** Allow-listed collections, read-only credentials, and quotas match a restricted search brief. Broad access and write permissions exceed the requirement.

**40. A.** Idempotency keys prevent duplicate effects on retry, backoff reduces load, and a clear error contract lets callers recover. Unlimited retries amplify an outage.

## Worked scenario

Consider how the reasoning works on a question that tempts you toward complexity. A scenario describes a nightly job that validates rows against a published schema in an identical order every run, and it asks for the strongest argument against adding an agent loop.

The first step is to translate the scenario into constraints. "Published schema," "identical order," and "every run" together mean the next action is knowable before execution starts. The second step is to recall what a loop buys: the ability to choose a next action from information discovered at runtime. Since the scenario removes that uncertainty, the benefit disappears. The third step is to name what the loop costs: extra tokens, more failure modes, and harder debugging. The correct option is the one that states the missing uncertainty, not the one that mentions night execution or storage.

Notice that several distractors are factually harmless. Running at night is true, but it is not the reason. Having more than ten fields is irrelevant. Writing to storage instead of displaying output says nothing about determinism. The exam rewards matching an option to the stated constraint, not to a general impression.

## Common mistakes

- Reaching for an agent when the step order is already known
- Treating a prompt instruction as a guarantee instead of using a hook, schema, or post-processing step
- Confusing input-token growth with output-token growth when discussing long conversations
- Assuming batch processing helps interactive latency
- Forgetting that retrieved documents and tool results are untrusted input
- Picking a model tier before checking the ambiguity and error cost in the scenario
- Choosing a vague but pleasant requirement over a measurable one
- Answering from general knowledge when the scenario contains a quiet constraint that reverses the obvious choice

## Chapter summary

- Both papers sample sixteen syllabus areas, and the coverage map turns a score into a focused revision list.
- Agent questions hinge on runtime uncertainty; workflow questions hinge on fixed sequence and published rules.
- Deterministic guarantees come from hooks, schemas, validation, and post-processing, not from prompt wording.
- Cost questions usually turn on prefix stability, output length, batch suitability, and history growth.
- Security questions usually turn on treating external content as data and limiting tool permissions.
- Every rationale in this chapter explains why the correct option fits and why the nearest alternative does not.

---

*End of chapter 14.*
