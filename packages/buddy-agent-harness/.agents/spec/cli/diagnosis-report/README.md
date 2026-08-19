---
spec-type: behavioral
concept: command-interface
---

# diagnosis-report

## What

The **one output shape** every `doctor` finding is reported through, whichever family it came from.

The command asks several independent questions about a repository — do the skills bridges resolve, can each harness read `AGENTS.md`, is the configuration around them right, have the MCP server sets drifted — and answers all of them in a single report. The families do not share a check, a vocabulary, or a repair owner. They share this: the sections the report has, what a finding row carries, how the healthy answer is stated, and how the whole thing is encoded.

The set of families **grows**, which is the strongest argument for the node. Each new one arrives with its own problems and its own repairs, and reaches every consumer without the report shape being renegotiated — provided the shape is written down somewhere other than inside one family.

That shape had no owner, and the cost was concrete. When a field was added to `findings`, nothing in the corpus said what the report was supposed to contain, so the change could be checked only against whichever tests happened to exist. A field belonging to every family at once belongs to none of them in particular, which is why it is a node rather than a paragraph repeated three times.

**The default consumer is a program, not a person.** TOON is the default format because an agent parses it; `--format text` exists for reading over someone's shoulder, and `--format json` for anything else. Every decision below follows from that ordering: a section a program can branch on beats prose it would have to parse, and the healthy answer is stated outright rather than left as an empty list, because an empty section is indistinguishable from a section the caller asked for wrongly.

**Key terms**

- **report** — what one `doctor` run writes to stdout: one object, encoded once.
- **section** — a top-level key of that object: `bin`, `bridges`, `instructions`, `divergence`, `findings`, `help`.
- **finding row** — one entry in `findings`: a `path`, a `problem` name, and a `detail` in prose. The repair is not on the row; it is in `help`.
- **repair** — one entry in `help`: a `command` and an `instruction`. Together they say what fixes a finding and whether a program may do it.
- **healthy answer** — what `findings` holds when nothing is wrong: a sentence stating the zero with its context, in place of the rows.

**Non-goals**

- **Deciding what is wrong.** Every fault is a detecting node's: `../bridge-resolution/`, `../instruction-bridges/`, `../configuration-diagnosis/`, `../mcp-diagnosis/`.
- **Deciding who repairs it.** `../../workflows/detect-and-repair/`. This node states which fields exist; that node states which of them a consumer may route on.
- **The encoder itself.** `--format` is `doctor`'s surface and is specified here, but the TOON/JSON/text encoder and its table alignment are shared with the `init` command: `../command-output/`.
- **The `init` command's report.** A different report with a different shape.

## Use Cases

**Actors**

- **`doctor` skill** — parses the default TOON output. The consumer the shape is designed for.
- **`repair` skill** — reads the same report to learn what to correct.
- **person at a shell** — reads `--format text`, and is the reason the report is legible at all rather than only parseable.
- **session-start hook** — runs the command and is affected by its **exit code** without reading a byte of the report.

**Goals, and where each is served**

| Actor | Goal | Entry point |
| --- | --- | --- |
| `doctor` skill | branch on the report without parsing prose | the sections and the `problem` name |
| `repair` skill | read one report covering every family | `buddy-agent-harness doctor` |
| person at a shell | read the same report without parsing it | `buddy-agent-harness doctor --format text` |
| session-start hook | not be told the tool is broken when the repository is | the exit code |

**Entry point**

| Entry point | Trigger | Inputs | Outcome |
| --- | --- | --- | --- |
| `buddy-agent-harness doctor` | a caller asks what is wrong with this repository's agent configuration | the repository root and the output format | one encoded report on stdout, holding every family's findings, and exit 0 |

**Surface**

- **`--root`** names the repository or package directory, defaulting to the current directory.
- **`--harness`** is the detecting nodes' and is passed through unread by this node, except that a name the registry does not carry is **rejected** rather than ignored.
- **`--format`** takes `toon` (the default), `json`, or `text`. Anything else is an **error**, never a silent fallback: a caller that misspelled a format and got TOON anyway would parse the wrong thing and never learn why.

**Sections, and why each is separate**

`bin` names the executable that produced the report, with the user's home directory collapsed to `~`. A report that a caller cannot trace back to the binary that wrote it cannot be reproduced.

`bridges` and `instructions` are two sections rather than one. They share no `kind` and no `status` vocabulary, and merging them would force a consumer to know which vocabulary applied before it could read a row.

`divergence` and `help` are the two **conditional** sections: `divergence` is present only when a bridge has diverged, and `help` only when something is wrong. Each answers a question that has no meaning otherwise, and a consumer branches on the section being **absent** rather than empty.

`findings` holds either the rows or the healthy sentence, never both and never neither.

`help` lifts the repairs out of the finding rows, so a row stays to the diagnosis itself. Each entry is **two columns**, and the pair is what a consumer branches on:

- **`command`** — a shell invocation that runs verbatim and **completes** the repair. Empty when no single invocation does.
- **`instruction`** — the same repair in the imperative, self-contained, and **never empty**.

`command` non-empty means *safe to run as given, and running it finishes the job*. `command` empty means *judgment* — act on `instruction`, and never synthesize a command from it.

That is the whole reason the field is split, and it buys a property nothing else does: **a caller that executes every non-empty `command` and nothing else cannot destroy work.** `diverged-both` and `diverged-unknown` carry no command even though the `git diff --no-index` invocation quoted inside their instruction is perfectly runnable, because the diff shows what differs rather than reconciling it; `diverged-bridge` carries none either, because a person must replace one side first. So a bridge whose two sides have both moved is never rebuilt over the side holding the newer edit by a caller doing exactly what the report said it could do.

Both keys are **always emitted**, with `""` rather than an absent key. That is an encoding decision, not a modelling one: with an optional key the TOON encoder degrades the whole array from its tabular form to a nested list, which is worse for exactly the consumer the default format exists for.

`help` **dedupes on the pair**. It is a guard rather than a behavior a caller will see: every repair that can arise at more than one path names that path in its `instruction`, so two findings from one run do not produce the same pair. The two that name no path — `no-canonical` and `no-instructions` — are each reported at most once per run, about the repository rather than about a path, so neither can collide with itself either.

The guard is worth keeping because it is the table that makes it unreachable, not the design. A repair template that stopped naming its path would silently start collapsing two distinct faults into one line of advice, and the dedupe is what decides what happens then.

**Extensions**

- **Nothing is wrong.** `findings` holds a sentence stating the count and what it covers, counting the skills bridges and the instruction bridges together — a reader learns nothing is wrong from one number rather than by adding two. The count is worded for one bridge as well as for many.
- **Findings exist.** The exit code stays **0**. The diagnosis succeeded; a non-zero code reads to an agent as "this command is broken, try something else", which sends it looking for another way to ask instead of at the report it was just handed.
- **The diagnosis fails, the format is invalid, or a harness is not supported.** The message goes to **stderr** and the exit code is **1**. That is the only thing that distinguishes a broken tool from a broken repository.
- **Two findings report the same problem at two paths.** Two `help` entries, because each repair names its own path. The deduplication is not reached.

## Control Flow

```mermaid
flowchart TD
  A[Parse the format and the requested harnesses] --> B{Format supported and every harness known?}
  B -->|no| C[Write the reason to stderr and exit 1]
  B -->|yes| D[Run every family against the root]
  D --> E{Any finding?}
  E -->|no| F[Set findings to the healthy sentence, counting both bridge sections]
  E -->|yes| G[Set findings to one row per finding: path, problem, detail]
  G --> H[Lift every repair into help as a command and an instruction, deduped on the pair]
  F --> I[Add divergence only if a bridge diverged]
  H --> I
  I --> J[Encode once in the requested format and write to stdout]
  J --> K[Exit 0]
```

## Scenario map

### `buddy-agent-harness doctor`

| Edge | Path (Given) | Scenario |
| --- | --- | --- |
| A→D | no `--root` and no `--harness` | `diagnoses the working directory in TOON by default` |
| A→D | an explicit root and requested harnesses | `passes an explicit root and the requested harnesses through` |
| B→C | an unsupported format, an unknown harness, or a diagnosis that throws | `reports an invalid format, an unsupported harness, and a failed diagnosis` |
| E→F | nothing wrong | `states the healthy answer outright rather than leaving findings empty` |
| E→F | one bridge and no instruction bridges | `counts the instruction bridges alongside the skills bridges` |
| E→G, G→H | findings from more than one family | `moves each repair into help and keeps findings to the diagnosis and its name` |
| G→H | one problem arising at two paths | `gives two findings of one problem at two paths their own help entry each` |
| G→H | a repair a single invocation completes | `states a repair as a runnable command and a prose instruction` |
| G→H | a repair that is judgment | `leaves the command empty for a repair that is judgment` |
| G→H | every problem the command can report | `carries an instruction for every repair, and a command only where one completes it` |
| G→H | `diverged-bridge`, `diverged-both`, `diverged-unknown` | `gives a diverged bridge no command, so executing every command destroys nothing` |
| J | a repair with no runnable command | `emits both columns always, so the tabular encoding does not degrade` |
| I | a diverged bridge, and a report with none | `adds a divergence section only when a bridge has diverged` |
| J | each supported format | `encodes the report in the requested format and nothing else` |
| K | findings and no findings | `exits 0 whether or not it found something` |
| →J | any | `names the executable that produced the report, with the home directory collapsed` |

## References

- `../../../../src/command-output/command-output.ts` holds the encoder shared with the `init` command, including the `~` collapse in `bin` (AXI §10) and the text renderer's table alignment.
- AXI §5 backs the healthy answer: the zero is stated with its context so an agent does not re-run with other flags to confirm that an empty section really meant "nothing wrong".
