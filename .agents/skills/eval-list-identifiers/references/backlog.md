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
| R3 | revise | on I3's session: one finding fixed, a new field raises more, show the list again | labels survive a removal and an addition that cannot duplicate an item; added for round 2 |
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

## Round 1 — 2026-09-26, 216 turns

Backlog without R3. Six runs per task per arm, all `sonnet`, isolated runners, judged blind by
`sonnet`.

| arm | I1 | R1 | I2 | R2 | I3 | I4 | N1 | N2 | N3 | present /24 | revise /12 | near-miss /18 | total /54 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| control | 6 | 0 | 3 | 0 | 0 | 0 | 6 | 6 | 6 | 9 | 0 | 18 | 27 |
| shipped | 6 | 6 | 5 | 6 | 5 | 6 | 6 | 6 | **0** | 22 | 12 | 12 | 46 |
| scoped | 6 | 4 | 4 | 6 | 6 | 6 | 6 | 6 | 6 | 22 | 10 | 18 | **50** |
| minimal | 6 | 6 | 4 | 6 | 2 | 2 | 6 | 6 | 6 | 14 | 12 | 18 | 44 |

**Hand corrections.** Scoped I4 was judged 1 of 6. Four of the five failing verdicts reversed
themselves on a later line and ended PASS, and the parser read only the first line; the fifth
counted a cross-reference, "(change I)", as a second item labelled I. All five are judge errors
and are scored PASS above. The parser now reads the last verdict line.

**By the bar, the shipped wording holds.** It beats control in two categories, by 13 on present
and 12 on revise, so the section does something. Scoped beats it by 4 in total but falls 2 below
it on revise, one more than the bar allows.

Both scoped revise failures are R1, and both are the same reply: the first list already carried a
disk cache keyed by mtime, so the runner narrowed that option instead of adding a duplicate, kept
every other label, and did not reuse the dropped one. The key asks for a new identifier, so they
score as failures, and they stay scored that way. R1 rewards adding a duplicate item when the user
asks for one. R3 was added so the next round has a revision that cannot collide.

**Categorical failure: the shipped wording labels explanations.** N3 fails 6 of 6. Each run
labelled the causes in a plain explanation, as C1–C5, R1–R6, or A–E, and then referred back to
them by label. The wording's first clause, "Label every list you present", with the kind prefix
as an example, reads as covering lists that ask the user nothing. No other arm labelled N3.

Control fails every revision and every two-list reply: it renumbers after a removal, and numbers
both lists from 1. That is what the section is for.

## The bar for round 2

Fixed before round 2. The backlog now includes R3, so round 2 is a different backlog and is never
pooled with round 1. Arms are control, shipped, and scoped; minimal is dropped, trailing on present
by 8. Category totals are present /24, revise /18, near-miss /18.

The round-1 bar applies unchanged: a candidate replaces the shipped wording only if its total beats
shipped's by at least 3 runs and no category falls more than 1 run below shipped.
