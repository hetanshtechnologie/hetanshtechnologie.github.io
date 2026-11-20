# Chapter 7 — Images, Files, and Grounded Data

## Learning objectives

- Explain how an image becomes a content block inside a message and why that differs from sending a plain text string.
- Describe how a model can read text from a photograph, and recognize when that is weaker than using text that already exists.
- Compare four ways of handing data to a model: inline content, a files API, retrieved passages with citations, and a runtime tool.
- Choose a delivery path using size, reuse, freshness, cost, and control as decision criteria.
- Define source grounding and predict how a well-designed system behaves when the supplied sources do not contain the answer.
- Decide between full context and retrieval by reasoning about context limits, price, and how often the data changes.

## Key concepts

### Beyond the text-only message

Early requests treat a message as a string, but real applications rarely stay that tidy. A user uploads a screenshot, or a policy question must be answered from a document store. The request still uses the same roles, yet `content` can hold an ordered list of typed blocks: text, image, document, or tool-related content. Order matters because the model reads left to right, and an instruction is often placed next to the evidence it describes.

Thinking in blocks rather than strings has two benefits. One turn can mix media, so a question can point at a picture and state what to look for in it. Metadata on each block, such as encoding or origin, helps logging and grounding. The model sees only what the application supplies, so a fact that was never sent cannot be assumed available.

> **Exam note:** A question asking "what should the application send so the model can see this photograph?" is really asking about content blocks and source encoding, not about a separate vision endpoint.

### Images as content blocks

An image enters as a block whose `source` describes the bytes, either inline encoded data or a reference to a file uploaded earlier. Inline delivery reads, encodes, and labels the file in the message; the service decodes it next to the text. A file reference uploads once and reuses an identifier, avoiding repeated transfers when the same picture serves many questions.

Three details decide whether the model can use the picture. Format and size must be accepted by the interface; oversized files waste bandwidth and context. Resolution matters more than file size: blurred small print may be unreadable. Relevance matters most, since every block shares the context budget. Cropping to the region of interest beats shrinking the whole image.

A compact Python example shows the inline path:

```python
import base64
from pathlib import Path
from model_client import Client

MODEL = "your-model-id"

def image_blocks(image_path: str, question: str) -> list[dict]:
    encoded = base64.b64encode(Path(image_path).read_bytes()).decode("utf-8")
    media = "image/png" if image_path.lower().endswith(".png") else "image/jpeg"
    return [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media,
                "data": encoded,
            },
        },
        {"type": "text", "text": question},
    ]

client = Client()
reply = client.messages.create(
    model=MODEL,
    max_tokens=600,
    messages=[
        {
            "role": "user",
            "content": image_blocks("receipt.png", "Report the vendor and total as JSON."),
        }
    ],
)
print(reply.content[0].text)
```

The image block precedes the instruction here, mirroring a person handing over a picture and then asking about it. The `max_tokens` ceiling keeps a bounded extraction cost predictable. A production version would handle file errors and validate the returned JSON.

### Reading text from a photograph

Pulling printed or handwritten text out of a photograph is a frequent vision task, and it should be separated from ordinary text input. When the source already exists as text, sending that text is cheaper, faster, and easier to verify. Sending an image is justified when the information is genuinely visual: the layout carries meaning, the characters are not machine-readable, or the artifact exists only as a picture. Receipts, whiteboard sketches, diagrams, screenshots of an error dialog, and handwritten notes are typical cases.

Vision-based extraction is probabilistic. Clear, well-lit type transcribes reliably; glare or a folded corner produces mistakes. Ask for structured output and validate it, and keep the original image beside the extracted result so a disputed value can be checked. For high-stakes fields, a confirmation step is cheaper than a wrong number reaching a downstream system.

Layout carries meaning. A table readable as an image can lose its row and column relationships when flattened to text, so request that structure explicitly or use a document block that preserves pages. When only a few fields matter, cropping beats transcribing everything.

> **Common mistake:** Sending a photograph of a paragraph when the paragraph is already available as text. It costs more and adds transcription risk for no gain.

### Four ways to hand data to a model

The application can deliver evidence through several mechanisms, and each carries different trade-offs.

Inline content puts bytes directly in the request. It needs no setup and suits a single small image or a short excerpt. The cost is that identical bytes are transmitted and processed on every call.

A files API stores bytes once under an identifier, so requests carry a reference rather than the bytes. This suits stable assets reused across calls, but adds lifecycle work: tracking identifiers, permissions, and deletion.

Retrieved passages move part of the work into a search step. The application finds relevant slices of a large collection and sends only those, with pointers back to their origin. Context stays small and answers can name sources.

A tool supplies data when needed. The model asks for a lookup and the application returns a tool message, which suits data that is unknown in advance, changes often, or sits behind access control that should not be flattened into a prompt.

| Delivery path | Best fit | Main strength | Main cost |
| --- | --- | --- | --- |
| Inline content | One small image or a short text excerpt | Nothing to set up; explicit in the request | Bytes repeat on every call; consumes context |
| Files API identifier | Stable assets reused across many calls | Upload once; cleaner requests | Identifier lifecycle and retention rules |
| Retrieved passages with citations | Large or frequently updated knowledge bases | Small context; answers can name sources | Depends on search quality and source tracking |
| Tool or lookup at runtime | Unknown-in-advance or access-controlled data | Fresh, permission-aware information | Extra round trip and tool contract work |

### Grounding and the "not found" behavior

Grounding means tying a claim to evidence the model was given. An answer is grounded when a reader can trace each factual statement back to a supplied passage, image region, or tool result. Grounding is not an automatic property of a model; it is a property of a system design. The application supplies sources, instructs the model to answer only from them, asks for references, and checks that the references point to real material.

A well-designed grounded system has a specific behavior when the answer is absent: it says so. "The supplied documents do not state a refund window" is a correct and useful response. A system that invents a number to fill the gap has failed, even if the sentence is fluent. Exam scenarios often describe a support assistant that must not invent policy; the expected reasoning is to retrieve relevant passages, require citations, and treat a missing passage as a valid outcome rather than a problem to hide.

Four habits make this reliable in practice. Send a clear instruction that unanswered questions should be reported as unanswered. Keep source identifiers attached to every passage so citations can be checked. Give the model an explicit "no result" signal when a search or tool finds nothing, instead of an empty string that looks like missing data. Validate before display: if the reply cites identifiers that were never sent, reject it or retry under a bounded policy.

> **Try it:** Ask a grounded question with the relevant passage removed. A trustworthy implementation should report that the information is unavailable, not offer a confident guess.

### Full context versus retrieval

Two strategies compete when a question depends on a large body of material. Full context sends everything that might matter. It is simple and sometimes necessary when relationships across a whole document matter, but it strains the budget, costs more, and dilutes attention. Retrieval selects a subset first. It lowers cost and latency, supports freshness, and makes citations natural, but a missed passage produces a wrong answer that looks clean.

Size, cost, and freshness decide the balance. If the whole corpus fits comfortably in the context window and rarely changes, full context is defensible and easier to reason about. If the corpus is large, grows daily, or is edited by many authors, retrieval wins because resending everything is expensive and quickly stale. Hybrid designs are common: send a stable core of instructions and reference material in every call, then retrieve the volatile portion for each question.

| Lens | Full context | Retrieval |
| --- | --- | --- |
| Size | Fits only when the corpus is small | Scales to large or growing collections |
| Cost per call | Higher; all bytes are processed | Lower; only selected passages are sent |
| Freshness | Requires resending to reflect changes | Reads the current store at query time |
| Failure mode | Buried details and budget pressure | Missing the right passage |
| Grounding support | Possible but citations are coarse | Natural; each passage carries an identifier |

A useful rule is to pay for context only where it changes the answer. Stable instructions can be reused or cached; volatile facts should be fetched close to the moment of use. When an exam describes a knowledge base that "updates several times a day," that phrase is a strong signal for retrieval rather than a fixed prompt.

### Guardrails for visual and file data

Images may contain personal data, location metadata, or credentials visible in a screenshot. Uploading sends that content to the provider and may place it in logs, so settle redaction and retention rules before shipping. Strip unneeded metadata, blur sensitive regions, and set how long uploaded files are kept.

A files API identifier is not authorization; check that the caller may read the content before attaching it. Retrieved passages should carry source permissions so search never exposes a document the user cannot open. A citation helps only if the reader is entitled to follow it.

## Practice lab

**Goal:** Build a small image-extraction request and observe how evidence and instructions interact.

1. Choose a clear photograph of a receipt or a simple form with a few printed fields.
2. Write a function like `image_blocks` that encodes the file and places an image block before a text instruction.
3. Ask for a strict JSON object with two fields and print the raw response.
4. Repeat with a deliberately vague instruction, then with a precise one that names each field and its format.
5. Repeat once with a crop containing only the relevant region.

**Expected observation:** The precise instruction produces more consistent output than the vague one, and the cropped image reduces wandering or invented fields. You should also see that the image is transmitted on every call, which is why repeated extraction of the same picture is a good candidate for a files API identifier.

## Worked scenario

A field service application lets technicians photograph a damaged part and ask what the warranty covers. The first design sends every photograph with a long warranty document embedded in the system prompt. Testing exposes two problems. Large photos push some requests toward the context limit and delay the first visible token. The warranty document is revised monthly, so answers drift out of date after each release.

**Reasoning.** The photograph is genuine visual evidence, so it stays as an image block, cropped to the damaged area. The warranty text is not visual and changes often, so embedding it is the wrong delivery path. Coverage depends on the part category and the current policy version, both of which can be looked up at query time. That suggests retrieval with citations, plus a firm rule that missing passages produce an explicit response rather than a guess.

**Resolution.** The redesigned flow uploads the photo once and reuses its identifier, retrieves the current policy clauses for the detected part category, and sends the image, the clauses, and an instruction that every claim must reference a clause identifier. When no clause matches, the assistant reports that coverage cannot be confirmed and opens a review ticket. The context shrinks, freshness follows the policy store, and the "not found" route becomes a feature instead of a silent failure.

## Common mistakes

- Sending an image of text when the original text is already available.
- Assuming the model can reach a file or database that was never included in the request.
- Treating a fluent answer as grounded merely because a document was mentioned somewhere earlier.
- Reusing a files API identifier without checking that the caller is allowed to read the content.
- Sending an entire knowledge base in every request because retrieval seems more complicated.
- Reporting an empty tool result as though it proved the answer is "none."

## Chapter summary

- Rich messages carry ordered content blocks, so images and text can travel together in one user turn.
- Images arrive as encoded data or a files API reference; legibility, format, and relevance determine success.
- Extracting text from photos is best reserved for cases where layout or handwriting makes plain text unavailable.
- Inline content, files APIs, retrieved citations, and runtime tools fit different sizes, reuse patterns, and freshness needs.
- Grounding ties claims to supplied sources, and a correct system reports when those sources lack the answer.
- Full context suits small, stable corpora; retrieval suits large, changing ones and supports cheaper, fresher, cited answers.

## Checkpoint questions

1. A user uploads a screenshot of an error dialog and asks what the message says. Which message shape is most appropriate?

   - A. A text-only message describing the screenshot
   - B. A user message with an image block followed by a text instruction
   - C. A system message containing the encoded bytes as plain text
   - D. A tool definition that points at the user's local disk

2. Which change most improves extraction from a photograph of a small table?

   - A. Raising the effort setting without changing the input
   - B. Cropping to the table and asking for a structured format
   - C. Sending the same photograph several times in one message
   - D. Removing the text instruction so the model focuses only on the image

3. A knowledge base changes several times a day and is far larger than the context window. Which delivery path is the strongest default?

   - A. Inline the entire knowledge base in the system prompt
   - B. Upload everything once and never refresh it
   - C. Retrieve relevant passages with citations at query time
   - D. Expect the model to fetch the knowledge base from the internet

4. What should a grounded assistant do when no supplied passage addresses the question?

   - A. Produce the most likely answer from general knowledge
   - B. State that the supplied sources do not contain the answer
   - C. Silently repeat the question back to the user
   - D. Invent a citation so the response looks complete

5. Which statement about a files API identifier is true?

   - A. It removes the need for any access control checks
   - B. It guarantees the file will never appear in logs
   - C. It lets a stable file be referenced without resending its bytes each call
   - D. It makes the model automatically search the file's contents

6. A team needs answers from a stable two-page reference that fits comfortably in context and never changes. Which approach is reasonable?

   - A. Send the full text with each request, possibly with a cached prefix
   - B. Build a complex retrieval index regardless of size
   - C. Convert the text to a photograph before sending it
   - D. Omit the reference and rely on memory

7. Which is the main risk of a retrieval-based design?

   - A. The model always refuses to answer
   - B. The search step can miss the passage containing the correct answer
   - C. Images cannot be included anywhere in the request
   - D. Citations cannot be attached to retrieved text

### Answers and rationale

1. **B.** A user turn can mix an image block with a text instruction, supplying both visual evidence and the question. A is wrong because a description cannot replace pixels. C is wrong because encoded bytes must be declared as an image source, not pasted as text. D is wrong because a tool definition describes a callable function; it does not grant access to a local disk.

2. **B.** Cropping raises the effective resolution of the relevant region, and a structured format makes the expected output explicit. A may help reasoning but does not fix illegible input. C wastes context without adding information. D removes the guidance that tells the model which fields matter.

3. **C.** Retrieval keeps context small, reflects recent updates, and provides identifiers for citations. A exceeds the budget and goes stale. B also goes stale. D is wrong because the model cannot browse arbitrary sources by itself.

4. **B.** Reporting the gap is the defining behavior of a grounded system. A substitutes general knowledge for evidence. C avoids the question. D fabricates a reference, which is worse than admitting uncertainty.

5. **C.** A files API identifier avoids repeated uploads for a stable asset. A is false because authorization stays the application's job. B is false because retention and logging depend on configuration. D is false because the model sees only what the application places in the request.

6. **A.** For a small, unchanging reference, full context is simple and reliable, and a cached prefix can reduce repeated cost. B adds machinery without benefit. C adds transcription risk. D removes the evidence entirely.

7. **B.** Retrieval's weak point is recall: if search misses the right passage, the answer will be wrong yet well formed. A is not inherent to retrieval. C is false because images and text can coexist. D is false because passages can carry identifiers that become citations.

---

*End of chapter 7.*
