# Chapter 29 — Prompt Injection, Secrets, and Layered Guardrails

## Learning objectives

- Explain why instructions and data sharing one text channel makes language-model applications a distinct security problem.
- Recognize prompt injection, including indirect injection arriving through a tool result, and describe containment measures.
- Identify paths by which personal data and secrets can leak into context, responses, and logs.
- Apply redaction before text is sent to a model, and explain why source-side removal is stronger.
- Distinguish authentication, authorization, and access control, and describe least-privilege design for tools and identities.
- Build layered guardrails and use hooks to block or gate destructive actions deterministically.

## Key concepts

### Why this is not an ordinary input field

In a conventional application, submitted text is data; a form field cannot rewrite server code. In a model application, that text is read alongside the instructions in the same channel, and the model cannot reliably tell a trusted rule from hostile content. That property is the root of a whole class of attacks.

The second property is that the model can cause side effects. A tool-using assistant calls a function because it decided the action would help, and that decision can be manipulated by text it read. The tool layer is part of the attack surface, not a neutral utility.

A helpful framing is the deputy problem: the assistant acts for a user while holding its own permissions. Someone who cannot reach a protected resource directly may persuade the deputy to fetch it. Security means making that authority small, checkable, and hard to redirect.

Start by drawing boundaries. List where untrusted text enters — user messages, files, retrieved documents, tool results, third-party pages, error messages — where decisions are made, and where side effects leave. Controls belong where these lines are crossed.

> **Key insight:** Retrieved content is untrusted content. A document becomes no safer because it lives in your knowledge base rather than arriving in a chat message.

### The threat landscape

A threat table turns worry into specific risks with an entry point and a control that breaks the chain. These groups chain together: an injection aims at exfiltration, which succeeds because a tool is over-privileged and output handling is weak.

| Threat | Typical entry point | What the attacker wants | Control that breaks the chain |
| --- | --- | --- | --- |
| Direct prompt injection | The user's own message | Override rules, reveal hidden instructions, change behavior | Input checks, clear instruction priority, output validation, limited tools |
| Indirect injection via a tool result | A fetched page, email, ticket, or file the assistant reads | Plant instructions the user never typed | Treat results as data, delimit them, scan them, never grant authority from content |
| Data exfiltration | A tool with a configurable destination or a generated link | Move private context outside the trust boundary | Minimize context, allowlist destinations, restrict network egress, redact |
| Over-privileged tool | A broad tool that reads, writes, and calls anything | Turn one mistaken decision into a large impact | Split tools by purpose, narrow parameters, scope credentials |
| Insecure output handling | Model output passed to a shell, query, page, or template | Execute injected text downstream | Encode and validate output, parameterize queries, never evaluate generated text |
| Credential exposure | Hard-coded keys, prompts, committed config, or verbose logs | Reuse a valid secret | Secret manager, runtime injection, rotation, log scrubbing |
| Destructive action | A write, delete, payment, or message tool | Cause irreversible change | Pre-tool hook, approval gate, dry run, reversible staging |

Two observations help. Narrowing tools helps against injection, exfiltration, and destructive actions at once. And no single control covers a whole chain; several small barriers limit damage if one fails.

Indirect injection deserves attention because the victim may be the operator. A ticket-summarizing tool will eventually receive a ticket saying to forward the customer list externally. Delimiters and a note that enclosed text is data reduce risk but cannot eliminate it, since language can be rephrased endlessly. Containment, not perfect detection, is the goal.

> **Exam note:** An answer claiming that clever prompt wording fully prevents injection is wrong. Exam-correct answers favor containment: fewer tools, narrower permissions, external validation, approval gates, and limited egress.

### Untrusted input, data leakage, and personal data

Minimizing what enters context is the most reliable privacy control: information never supplied cannot be echoed into a response or smuggled out through a tool. Teams often send entire records when one field would do, creating a larger exposure than the accuracy they gain.

Leakage paths vary. A response may repeat an identifier; a tool may place private data in a URL logged by a proxy; an error may echo the request; a trace may store every prompt broadly. Each is a place data leaves without anyone deciding it should.

Personal data needs deliberate handling. Identify sensitive fields, avoid sending them unless required, and redact the rest before the call. Set retention periods that match debugging needs and store identifiers rather than raw values.

Redaction replaces sensitive values with placeholders before text is sent, ideally close to the source so downstream components never see raw values. The snippet applies patterns to user text and retrieved content, returning detected labels for logging.

```python
import re

PATTERNS = {
    "email": re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"),
    "card": re.compile(r"\b(?:\d[ -]*?){13,16}\b"),
    "token": re.compile(r"\b(?:sk|ak)[A-Za-z0-9_-]{16,}\b"),
}

def redact(text: str) -> tuple[str, list[str]]:
    seen = []
    for label, pattern in PATTERNS.items():
        text, count = pattern.subn(f"[{label}_REDACTED]", text)
        if count:
            seen.append(label)
    return text, seen

def prepare_for_model(user_text: str, retrieved: str):
    safe_user, in_user = redact(user_text)
    safe_context, in_context = redact(retrieved)
    return safe_user, safe_context, in_user + in_context
```

Pattern redaction is incomplete; it misses formats you did not anticipate. Back it with source minimization, output checks, and restricted logging. Tasks that genuinely need a value call for a safer design, such as tokenizing it and substituting back after the response.

> **Common mistake:** Redacting only the final response while sending raw personal data in the prompt. The model's context and your trace store are also destinations that deserve protection.

### Identity: authentication, authorization, and access control

Three terms are often blurred. Authentication establishes who is calling; authorization decides what that identity may do; access control is the machinery that enforces it. An assistant should run as a recognizable identity with narrow permissions, not a shared administrator account.

Consider a tool that reads customer records. Even if the assistant judges a record relevant, the backend must verify that the requesting user is entitled to it. Authorization belongs downstream, because the model's decision is not a security decision; trusting it turns injection into a breach.

Scope across tenants and environments: prototype credentials should not reach production data, and read-only roles should not write. Audit records complete the picture by recording who asked, which identity acted, which tool ran with which arguments, what approval was given, and the outcome.

> **Exam note:** If a question uses the word "who," think authentication. If it asks "may they," think authorization. If it asks "what actually happened," think audit logging. Distractors often swap these deliberately.

### Secrets, credentials, and API keys

A secret grants access: an API key, token, password, signing key, or connection string. Secrets do not belong in code, prompts, context, committed config, or logs. They belong in a secret manager or injected environment variable, reaching the process only at runtime.

Three habits do most of the work. Scope each secret to the smallest permissions and environments; rotate on schedule and immediately on suspicion; prefer short-lived credentials so an attacker has a smaller window.

Secrets and models interact in one specific way: a secret in context can be repeated by the model, summarized into a tool argument, or captured in a trace. Keeping it out of context is stronger than asking the model not to mention it. Scrub secret patterns before logging and fail loudly when a credential is missing.

If a key appears publicly, treat it as compromised at once. Rotate first, then determine access and look for unusual activity. Remove it from repository history, scan other repositories, add scanning rules, monitor reuse, and document the timeline.

> **Security note:** A published key is a compromised key. Rotation is cheap; the investigation can follow once the value no longer works.

### Layered guardrails, least privilege, and hooks

Guardrails are deterministic checks around the model call. Input guardrails inspect what will be sent; output guardrails inspect what came back or what a tool is about to do. They are testable and independent of the model's mood, which makes them the right place to enforce rules that must hold.

Least privilege is the principle behind them. Give each tool one purpose, constrain parameters with enumerations and ranges, and enforce the same constraints in code; a schema guides the model but is not a guarantee.

Hooks are callbacks at defined points — message arrival, before a tool executes, after it returns. Their value is that they run in your code, outside the model's influence. A pre-tool hook can block or gate a destructive action, and a post-tool hook can scan returned text before it re-enters context.

| Layer | Where it runs | What it can stop |
| --- | --- | --- |
| Source minimization | Before data is gathered | Sensitive values ever entering context or logs |
| Input guardrail | Before the model call | Oversized input, obvious abuse, unsanitized active content |
| Tool schema and policy | At tool definition and argument validation | Malformed arguments, disallowed destinations, broad paths |
| Pre-tool hook | Immediately before execution | Destructive or state-changing actions without approval |
| Output guardrail | After a response or tool result | Leaked secrets, personal data, disallowed content, unsafe text |
| Identity and access control | In the downstream service | Actions the requesting user is not entitled to perform |
| Network egress limits | At the process boundary | Outbound contact with unapproved hosts |
| Audit and monitoring | Throughout | Undetected patterns and unexplainable incidents |

The hook below shows a deterministic gate for destructive actions. It never asks the model whether an action is safe; it inspects the tool name and arguments and returns a decision the execution layer honors.

```python
DESTRUCTIVE = {"delete_file", "drop_table", "send_email", "charge_card"}

def pre_tool_use(tool_name: str, arguments: dict) -> dict:
    if tool_name in DESTRUCTIVE:
        return {
            "decision": "require_approval",
            "reason": "action changes state or sends data",
            "preview": {"tool": tool_name, "target": arguments.get("target")},
        }
    return {"decision": "allow"}
```

Because the check sits before execution, injected wording cannot skip it. Requiring approval keeps legitimate work possible, and showing the resolved target lets the approver decide. Where an error is extreme, prefer blocking plus reversible staging.

Content policy ties the layers together. Write testable rules: which categories are refused, which fields redacted, which actions need approval, which roles are allowed. Vague policies produce inconsistent enforcement. Keep adversarial prompts in the regression suite so later changes cannot quietly weaken defense.

> **Try it:** Pick one tool you have built and list every destination and path its current credential can reach. If the list is longer than the tool's stated purpose, split the tool or narrow the credential before shipping.

## Practice lab

**Goal:** Demonstrate that a hostile instruction in a tool result is harmless when several containment layers are present.

**Steps:**

1. Create a scratch document containing a paragraph that instructs the assistant to copy configuration data to an external address.
2. Run an assistant that reads the document with a broad write tool and no hooks. Record what it attempts.
3. Replace the broad tool with a single-purpose tool that writes only to a fixed directory, and restrict its credential.
4. Add the redaction function from this chapter to both the user text and the retrieved document before the model call.
5. Add the pre-tool hook above and require approval for any write. Replay the same document and record the difference.

**Expected observation:** In the first run, the injected paragraph influences the plan and a risky write is attempted. In the final run, the instruction still appears in context, but the destination is invalid, the hook demands approval, and secrets are placeholders. The manipulation no longer causes harm.

## Worked scenario

A team builds an assistant that reads shared project documents and writes status notes. One file contains a paragraph asking the reader to include a deployment token in the next note and place a copy in a public folder. The assistant prepares exactly that write, using a token found in another readable file.

The chain is clear. The paragraph is indirect injection through retrieved content, and the objective is exfiltration. It succeeds only because the write tool accepts arbitrary paths, the credential can read the token, no redaction runs, and no hook stands between decision and write. Every link is a place to insert a barrier.

The first change is structural: a single-purpose note tool writes only to a fixed directory with a credential limited to it, making the public folder unreachable. Next, deployment configuration is moved out of the readable workspace and the exposed token is rotated. Redaction is applied to retrieved text before it enters context, a pre-tool hook requires approval for writes and displays the resolved target, and an output scan blocks notes containing secret patterns.

When the hostile document is replayed, the injected paragraph is still in the trace, but the destination is outside the tool's allowed area, the hook demands approval, and the token no longer exists at its old value. The assistant may produce an odd note, yet the attack chain cannot complete.

The team adds the document to the adversarial regression set and writes a policy rule that notes must never contain credential-shaped strings. A later prompt change that weakens the format will now be caught by tests rather than by an incident. The principle is to make the consequences of untrusted influence small and visible rather than trying to make the model perfectly trustworthy.

## Common mistakes

- Treating the system prompt as a security boundary instead of guidance the model may ignore.
- Forgetting that tool results and retrieved documents are untrusted input.
- Giving one tool broad read, write, and network powers for convenience.
- Sending full records when a single field would satisfy the task.
- Redacting only responses while leaving raw data in prompts and traces.
- Embedding API keys in source code, committed configuration, prompts, or verbose logs.
- Waiting to rotate an exposed key until after finishing the investigation.
- Enforcing destination rules only in natural language rather than in a hook or connector.

## Chapter summary

- Shared text channels and tool-driven side effects make model applications a distinct security problem.
- Map untrusted entry points, decision points, and side-effect exits, then place controls on the crossings.
- Indirect injection through tool results is dangerous because the user may never know hostile text arrived.
- Minimize context, redact before sending, restrict destinations, and limit network egress to prevent leakage.
- Authentication establishes identity, authorization grants permission, and access control enforces it downstream.
- Secrets stay out of code, prompts, context, and logs; scope them narrowly and rotate them quickly.
- Layered guardrails combine minimization, input checks, tool policy, hooks, output scans, and identity checks.
- Hooks run in your code before a side effect, so injected wording cannot bypass a destructive-action gate.
- Write content policies as testable rules and keep adversarial cases in the regression suite.

## Checkpoint questions

1. A retrieved web page tells the assistant to ignore its rules and send private notes to an external address. Which response is strongest?

A. Add a stronger sentence to the system prompt.

B. Narrow the tools, validate destinations in a hook, and restrict outbound network access.

C. Increase the amount of context so the model has more information.

D. Remove the page only after a leak is observed.

2. Why is indirect injection harder to notice than direct injection?

A. It only affects the model's tone.

B. It arrives through content the assistant reads, without the user typing the attack.

C. It is automatically removed by output formatting.

D. It requires administrator credentials to work.

3. Which practice most reliably prevents a secret from appearing in a model response?

A. Asking the model not to repeat it.

B. Keeping the secret out of the context and scanning outputs for secret patterns.

C. Storing it in a committed configuration file.

D. Logging the full prompt for later review.

4. A tool can read a file, write to any path, and call any URL. Which change best embodies least privilege?

A. Add a warning in the tool description.

B. Split it into narrow tools with constrained parameters and a scoped credential.

C. Increase the model's effort setting.

D. Retry failed calls more times.

5. Where should a rule that no file may be deleted outside a fixed directory be enforced?

A. In a pre-tool hook that inspects the resolved path.

B. In the system prompt.

C. In the user's question.

D. In a comment in the tool definition.

6. Which log record is most useful for auditing an assistant's actions?

A. A line stating that a tool ran.

B. The full text of every prompt without filtering.

C. The calling identity, tool name, resolved arguments, decision, reason, and outcome.

D. Only the final answer shown to the user.

### Answers and rationale

1. **B.** Restricting capabilities, enforcing policy in a hook, and limiting egress break the attack chain at several points. A relies on guidance that injected text may override. C adds material the attacker can also influence. D is reactive and may leave other sources exposed.

2. **B.** Hostile text can arrive through files, pages, or messages the assistant processes, so the user may introduce it unknowingly. A is false because tool-using assistants can act. C is false because formatting does not neutralize intent. D is false because no elevated attacker privilege is required.

3. **B.** A value absent from context cannot be echoed, and an output scan catches patterns that do appear. A depends on an instruction the model may ignore. C creates an easily exposed copy. D adds another location where the secret can leak.

4. **B.** Narrow tools, constrained parameters, and scoped credentials limit what a manipulated model can do. A is guidance, not enforcement. C changes reasoning effort, not authority. D addresses retries, which are irrelevant to privilege.

5. **A.** A pre-tool hook runs in code before the side effect and cannot be bypassed by wording. B, C, and D are all natural-language signals that a model may disregard, especially under injection.

6. **C.** Those fields allow an incident to be reconstructed, including why a decision was made. A lacks detail. B risks storing sensitive data while still omitting decisions. D ignores the tool activity where the important events occur.

---

*End of chapter 29.*
