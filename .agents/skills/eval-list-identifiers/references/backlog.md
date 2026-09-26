# The backlog, the key, and the bar

The task text and each task's key line are fixed in `scripts/backlog.mjs`; the judge reads them
from there. This file says why each task is there, the bar, and what the runs measured.

## The tasks

Each task is its own `claude -p` session, so the runner answers it the way it would answer a
user, not as one row of a plan. The runner loads a `CLAUDE.md` holding the project stub and the
arm's section, and nothing else.

| | Kind | Task | Why it is here |
| --- | --- | --- | --- |
| I1 | present | lay out approaches to a slow command and ask which to take | options put to the user |
| I2 | present | ask what you need to know before adding a flag | questions put to the user |
| I3 | present | review a nine-line function | findings put to the user |
| I4 | present | propose README changes and list decisions for the user | two lists in one reply; a bare "2" must name one item |
| R1 | revise | on I1's session: drop the second option, add a disk cache, show the list again | labels survive a removal and an addition |
| R2 | revise | on I2's session: answer the first question, raise a new one, show what is open | labels survive an answer and a follow-up |
| N1 | near-miss | write a commit message | a list in an artifact, where labels are noise |
| N2 | near-miss | write a changeset file | the same, in a file |
| N3 | near-miss | explain a failure mode, nothing to decide | a list that asks nothing of the user |

The revision prompts refer to items by position, never by label, so a runner is not handed the
labelling habit by the user.

A near-miss fails on letter labels or kind-prefixed labels only. Plain numerals are ordinary
markdown and score nothing either way.

## The arms

| Arm | Section |
| --- | --- |
| control | none |
| shipped | the text in `packages/buddy-agent-harness/skills/enhance/references/list-identifiers.md` |
| scoped | below |
| minimal | below |

**scoped** — confines labelling to lists put to the user, drops the kind prefix, and asks for
distinct labels across lists in one reply:

```markdown
## List identifiers

When you put a list to the user — options, questions, findings, proposals — label each item (A, B, C or 1, 2, 3) so they can answer it by its label. When one reply carries more than one such list, keep the labels distinct across them. A list inside something you write for another reader, such as a file or a message, follows that document's conventions instead.

Keep a label once you have given it. When you revise the list, each item keeps its label, a removed item's label is not reused, and a new item takes the next one in the sequence.
```

**minimal** — one sentence:

```markdown
## List identifiers

Number or letter the items of any list you ask the user to respond to, and keep those labels fixed when you revise it: never renumber, never reuse a dropped label, and give a new item the next label.
```

## The bar

Fixed before the first run. Six runs per task per arm; category totals are present /24,
revise /12, near-miss /18.

- **The section earns its place** only if the shipped arm beats control by at least 3 runs in
  some category. If control is within 2 of shipped in every category, the backlog shows no effect
  of the section; say so and swap nothing.
- **A candidate replaces the shipped wording** only if its total beats shipped's by at least 3
  runs and no category falls more than 1 run below shipped. Anything less is a tie, and a tie
  keeps the incumbent.
- A categorical failure — a task failing 5 or 6 of 6 under an arm — is reported on its own
  whatever the totals say.
