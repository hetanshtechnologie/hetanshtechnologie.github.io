# Chapter 2 — How Language Models Produce Text

## Learning objectives

- Explain text generation as repeated next-token prediction conditioned on a context window.
- Treat the context window as one shared budget consumed by instructions, history, documents, and output.
- Explain why the same prompt can produce different answers across runs.
- Distinguish the role of system messages from the role of user messages.
- Describe extended or adaptive thinking as visible reasoning blocks.
- Use effort and speed controls as deliberate cost and latency levers.
- Explain why fluent prose is not evidence that an answer is correct.

## Key concepts

### Tokens and next-token prediction

A language model does not retrieve sentences from a store and does not look up answers in a table. It constructs text one small piece at a time. The pieces are called tokens. A token might be a whole short word, a part of a longer word, a piece of punctuation, or a space attached to a word. Tokens are not the same as words, and the mapping between them is not uniform across languages or domains. A common technical term may consume several tokens because the model has seen it less often during training.

At each step, the model considers the text that already exists and produces a probability distribution over possible next tokens. Some tokens are very likely given the preceding text; others are unlikely but still possible. One token is then selected, appended to the text, and the process repeats. The newly appended token becomes part of the condition for the next step. This is why generation feels coherent: each choice is made in light of everything that came before it, including the tokens the model itself just produced.

Three consequences follow from this mechanism. First, the model is sensitive to exact wording because wording determines the condition for every later step. Second, generation is inherently sequential, so a long answer takes longer than a short one even when the hardware is fast. Third, there is no separate step in which the model checks whether its answer is true. It continues producing plausible continuations until something tells it to stop. Truth is a property that the text may or may not have; it is not a stage in the generation loop.

The pseudocode below strips the process to its essentials. The names are illustrative; the point is the shape of the loop and the fact that every new token is fed back into the context.

```python
def generate(request, controls):
    context = assemble(
        system=controls.standing_rules,
        history=request.prior_turns,
        documents=request.supplied_text,
        user=request.current_message,
    )
    produced = []
    while budget_remaining(context, controls.output_limit):
        distribution = model.next_token_distribution(context)
        distribution = apply_temperature(distribution, controls.temperature)
        token = sample(distribution)
        if token == END_OF_TURN:
            break
        produced.append(token)
        context = append_token(context, token)
    return decode(produced)
```

Notice that the loop contains no step named verify. Correctness has to be introduced by the system around this loop, not by the loop itself.

> **Exam note:** When a question asks why changing one word early in a prompt can change the whole answer, the underlying reason is conditioning. Each token is predicted from the accumulated context, so a small change early can redirect every later choice.

### The context window as one shared budget

The context window is the finite amount of text the model can condition on at one time. It is a single hard budget, not a set of separate allowances. Everything that must influence the answer draws from the same pool: the system message, the conversation history, retrieved documents, tool results, the current user message, and the space reserved for the output that has not yet been produced.

This shared nature is the key architectural fact. If you add a large document, you have not merely used "document space"; you have reduced the room available for history, instructions, and the answer. If you reserve room for a long output, you have reduced how much input the model can consider. Designers sometimes speak as though these were independent containers, but they are not. A single window is filled by competing consumers.

Because the budget is hard, systems need a policy for what happens when it fills. The naive response is to drop the oldest material. That can be wrong when an early decision is still the most important constraint in the task. A better response is to decide deliberately what to keep verbatim, what to compress into a summary, and what to move into an external store that can be retrieved on demand. Chapter 22 returns to these strategies in detail; for now the essential point is that context is an engineering resource that must be budgeted.

| Consumer of context | Typical content | Budget implication |
| --- | --- | --- |
| System message | Standing behavior and constraints | Usually small but high priority because it frames everything |
| Conversation history | Prior turns and decisions | Grows continuously and often dominates long sessions |
| Retrieved documents | Source material supplied for the task | Can be large and may crowd out reasoning room |
| Tool results | Output returned by external actions | Variable and easy to underestimate before execution |
| Current request | The immediate question or task | Usually small but decisive for the next step |
| Reserved output | Space for the answer still to be generated | Must be planned for before the request is sent |

> **Common mistake:** Planning a document budget without reserving room for the response. If the input fills the window, the answer is cut off, and a truncated answer often removes exactly the qualification that made it safe.

### Why identical prompts can diverge

A prompt is not a deterministic function whose output is fixed. Even with identical text, runs can differ because token selection involves randomness. After the model produces its probability distribution, a sampling procedure chooses a token. A common approach samples from the distribution rather than always taking the most likely token. This means a token with modest probability can occasionally win, and that early divergence changes the condition for every later step.

Temperature is a control that reshapes the distribution before sampling. Lower values make dominant tokens more dominant, producing more repetitive and predictable text. Higher values flatten the distribution, allowing less likely tokens to appear more often and increasing variety. A related control limits the pool of candidate tokens considered at each step. These settings do not add knowledge; they change how the model explores the choices already available to it.

Other sources of variation matter as well. Small differences in wording, ordering of examples, or accumulated history change the condition for prediction. A fixed seed can reduce variation when the surrounding system supports it, but it does not turn a language model into a lookup table. Different model versions also produce different distributions, so a prompt that behaved consistently in one environment may behave differently in another.

The architectural response is not to demand perfect determinism. It is to separate tasks that require reproducibility from tasks that benefit from variety. Drafting a marketing headline may benefit from higher variation. Extracting a value from a contract with a fixed schema should be made as stable as possible, and the result should be validated by code rather than trusted because it sounded confident.

### System messages and user messages

Messages are usually categorized by role, and the role affects how the text is treated. The system message carries standing instructions that apply across turns: what the assistant is for, what it must never do, how it should format results, and which constraints outrank a later request. It is framing material. The user message carries the immediate task: the question, the document, the change requested in this turn.

The distinction matters under conflict. If a user message asks for something the system message forbids, a well-behaved assistant should follow the standing constraint and explain the refusal. That is why durable rules belong in the framing layer rather than being repeated in every request. A rule repeated only in the current message can be overlooked or overridden by a later, more recent instruction.

However, a system message is guidance, not enforcement. It shapes the probability of certain continuations; it does not create a barrier that the generation process cannot cross. For constraints with real consequences, enforcement must live outside the model in code that checks the action before it executes. Chapter 4 and Chapter 10 develop this point. A useful mental model is that the system message tells the assistant what to intend, while external controls determine what it can actually do.

| Message role | Primary purpose | Where it belongs | What it does not do |
| --- | --- | --- | --- |
| System | Standing behavior and priority rules | Framing layer, set once per session | Does not physically block a forbidden action |
| User | Immediate request or task for this turn | Current request | Does not override a higher-priority prohibition |
| Assistant | Prior output and reasoning kept as history | Session record | Does not guarantee that earlier claims were correct |
| Tool or environment | Results returned from external actions | Injected into context | Does not verify itself unless a check is applied |

### Extended thinking as visible reasoning

Some interactions allow the model to produce an extended reasoning block before the final answer. This is often described as extended or adaptive thinking. The block is generated text, just like the answer, but it is shown separately and may be used to work through a difficult problem before committing to a response. The amount of reasoning can be allowed to vary with the difficulty of the task rather than being fixed in advance.

Visible reasoning is useful for a specific reason: it gives the model more opportunities to work through intermediate steps before producing a final statement. For multi-step calculations, ambiguous requirements, or designs with several interacting constraints, extra working space can improve the result. It also gives a reviewer something to inspect. A reviewer can see whether the assistant noticed the deciding constraint, rather than judging only the polish of the conclusion.

Two cautions apply. Reasoning text is not a proof, and it can contain confident errors just as a final answer can. A chain of reasoning may look thorough while resting on a false premise. Second, reasoning consumes the same context budget and adds latency, because those tokens must be generated before the answer begins. Extended thinking is therefore a deliberate trade: extra working space and inspectability in exchange for time and tokens.

> **Try it:** Take a scenario question you missed and write the reasoning you would expect to see before the correct answer. If your written reasoning never mentions the deciding constraint, you have found where your own process went wrong.

### Effort and speed as levers

Many interfaces expose controls that trade resources against response quality or latency. One family of controls adjusts how much work the model is allowed to do before responding. Higher effort generally means more extensive reasoning and more careful synthesis; lower effort favors quick answers. A second family influences latency, for example by returning text incrementally so that a reader sees partial output while the rest is still being generated.

These are levers, not quality switches. More effort does not repair a missing document, a misleading instruction, or a tool with no validation. It can help when the difficulty lies in reasoning over material that is already present. Faster responses do not necessarily reduce total cost if they cause repeated retries, and streaming partial text does not change the number of tokens ultimately produced.

For exam purposes, the design question is which lever fits the constraint. A customer-facing interaction with a strict responsiveness requirement may accept lower effort and compensate with deterministic checks on the output. A background review of a complex document can afford higher effort and a slower response because nobody is waiting. Treating effort and speed as scarce resources to be allocated by task is the habit the exam rewards.

| Lever | What it changes | What it does not change | Sensible use |
| --- | --- | --- | --- |
| Reasoning effort | Amount of working before the answer | Access to missing facts | Complex synthesis over supplied material |
| Response length limit | Maximum output tokens | Accuracy of what is produced | Tasks with a required format or short answer |
| Sampling settings | Variety of token choices | The model's underlying knowledge | Creative drafting versus stable extraction |
| Incremental output | When text becomes visible | Total work performed | Interactions where perceived delay matters |
| Model selection | Capability and cost profile | The need for external validation | Matching capability to task difficulty |

### Fluency is not correctness

A language model is optimized to produce plausible continuations, not to certify facts. Because of this, the most dangerous failure mode is not obviously broken text. It is smooth, confident, well-structured text that contains a fabricated detail, a misapplied rule, or a conclusion that does not follow from the evidence. Fluent prose carries a strong signal of competence, and readers naturally treat confidence as a proxy for reliability.

That proxy is unsafe. A fabricated citation, an invented API parameter, and a plausible but wrong summary of a clause all arrive in the same polished packaging as a correct answer. The risk grows in exactly the situations where review is hardest: long outputs, unfamiliar domains, and documents the reviewer has not read closely. A design that relies on the reader noticing every error is a design that will eventually fail.

The remedy is structural. Supply source material and require the answer to stay within it. Ask for explicit uncertainty instead of a single confident claim. Validate structured fields with code. Keep a human review step for actions with real consequences. Treat the model as a generator of candidates whose claims must be checked, not as an authority whose style signals truth.

## Worked scenario

A team feeds the same prompt to an assistant several times and receives different wording and slightly different conclusions. One reviewer argues that the system is unreliable and should be replaced. Another argues that the variation proves the assistant is thinking creatively and should be trusted more. A third asks what the variation actually indicates.

The first step is to classify the observation. Variation across runs is expected when token selection involves sampling and the surrounding context differs slightly. Different wording is not, by itself, a defect. The team should check whether the underlying facts and final decision vary, not merely the phrasing. If the conclusion changes, the team must look for the source of the instability.

The next step is to inspect the conditions. The team discovers that the document supplied with the prompt is long, the output limit was never set, and reasoning effort was left at a low default. On some runs the answer is cut off before the qualification about an exception in the source document. The apparent disagreement is partly a budgeting failure. The document and an unbounded answer competed for the same context window, and the crucial qualification fell outside what the reader saw.

The resolution has three parts. The team reserves room for output and shortens the supplied document to the relevant passages. It lowers sampling variation and raises reasoning effort because stability matters more than variety. It also adds a validation step that checks whether the answer mentions the exception clause before the result is accepted. The model is still generating tokens probabilistically, but the surrounding system now constrains the result.

The journal lesson has two parts. Variation in phrasing is expected and should not be treated as a defect on its own. Variation in conclusions is a signal to inspect context budgeting, controls, and validation, not to assume the model has become unreliable in a general sense.

## Common mistakes

- Believing that a context window has separate regions for instructions, documents, and output.
- Assuming that a lower temperature guarantees factual accuracy or makes output fully reproducible.
- Treating the system message as an enforcement mechanism rather than as framing guidance.
- Assuming that visible reasoning is a proof that the conclusion is correct.
- Confusing incremental output with faster overall generation or lower total cost.
- Trusting polished prose as evidence that a detail was checked against the source material.

## Chapter summary

- Text is produced by repeated next-token prediction, with each new token changing the condition for the next.
- The context window is one hard budget shared by instructions, history, documents, tool results, and output.
- Same-prompt variation arises from sampling, temperature, small condition changes, and model differences.
- System messages frame standing rules; user messages carry the immediate task; neither enforces a constraint by itself.
- Extended thinking provides visible working space at the cost of tokens and latency.
- Effort, length, sampling, and response style are levers to allocate by task, not universal quality settings.
- Fluency signals plausible construction, not verified correctness, so validation must be external.

## Checkpoint questions

1. What is a token?

A. A fixed unit equal to one word
B. A piece of text used as one step in prediction
C. A database record retrieved by the model
D. A validation rule applied after generation

2. Why must output length be planned before a request is sent?

A. Because output competes for the same context budget as input
B. Because longer answers are always more accurate
C. Because the model cannot stop without a limit
D. Because output is stored separately from input

3. What does lowering temperature usually do?

A. Adds facts to the model's knowledge
B. Makes token choice more dominant and predictable
C. Removes the need for validation
D. Increases the context window size

4. Which statement about the system message is accurate?

A. It physically blocks forbidden actions
B. It replaces the need for external checks
C. It frames standing behavior but does not enforce it
D. It is only read when the user asks a question

5. What is the main benefit of visible extended reasoning?

A. It guarantees a correct answer
B. It reduces the number of tokens consumed
C. It provides working space and something for a reviewer to inspect
D. It removes context limits

6. Which task most warrants higher reasoning effort?

A. Copying a field from a short form
B. Synthesizing several conflicting requirements in a supplied document
C. Streaming a greeting to a user
D. Listing the keys in a small object

7. Why is fluent output a risk in a review process?

A. Because it is always shorter than the source
B. Because confidence in style can hide unchecked errors
C. Because it cannot be stored
D. Because it prevents sampling

### Answers and rationale

**1. Correct answer: B.** Tokens are the incremental pieces the model predicts and appends. A is wrong because tokens are not fixed word units. C is wrong because tokens are not retrieved records. D is wrong because validation is a separate mechanism applied to generated text.

**2. Correct answer: A.** Output draws from the same finite window as input, so it must be reserved in advance. B is wrong because length does not determine accuracy. C is wrong because stopping conditions can exist without a fixed length plan. D is wrong because output becomes context as it is generated.

**3. Correct answer: B.** Lower temperature sharpens the distribution toward likely tokens. A is wrong because sampling settings do not add knowledge. C is wrong because validation remains necessary. D is wrong because controls of this kind do not resize the context window.

**4. Correct answer: C.** The system message shapes behavior and priority but is not a hard barrier. A is wrong because blocking requires code outside the model. B is wrong because framing is not enforcement. D is wrong because framing applies across the session.

**5. Correct answer: C.** Extra reasoning offers intermediate working space and inspectability. A is wrong because reasoning can contain errors. B is wrong because reasoning consumes additional tokens. D is wrong because the budget is unchanged.

**6. Correct answer: B.** Conflicting requirements need synthesis, which benefits from more working space. A and D are simple extraction tasks that do not need it. C is a latency-sensitive interaction where extra effort offers little value.

**7. Correct answer: B.** Polished confidence can conceal a fabricated or unverified detail. A is wrong because length is unrelated to the risk. C is wrong because output can be stored. D is wrong because fluency does not disable sampling.

---

*End of chapter 2.*
