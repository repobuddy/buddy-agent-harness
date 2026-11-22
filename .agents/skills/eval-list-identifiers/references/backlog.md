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
| N4 | near-miss | walk through what an install does, nothing to decide | a second explanation, so labelling one is measured beyond N3; added for round 5 |

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

## Round 2 — 2026-09-26, 234 turns

The backlog with R3. Same model, isolation, and judge as round 1.

| arm | I1 | R1 | I2 | R2 | I3 | R3 | I4 | N1 | N2 | N3 | present /24 | revise /18 | near-miss /18 | total /60 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| control | 6 | 0 | 5 | 0 | 0 | 0 | 0 | 6 | 6 | 6 | 11 | 0 | 18 | 29 |
| shipped | 6 | 6 | 5 | 6 | 5 | 6 | 6 | 6 | 6 | **0** | 22 | 18 | 12 | **52** |
| scoped | 6 | 5 | 4 | 6 | 3 | 6 | 6 | 6 | 6 | 3 | 19 | 17 | 15 | 51 |

**Hand corrections.** Scoped I4 was judged 3 of 6. Two failing verdicts ended "Correction: PASS",
a line the parser did not match, and one counted cross-references to proposals as repeated
identifiers, the round-1 misread. Scoped N3 was judged 2 of 6; one of the four failures numbers
every item plainly and says "A" once in its closing sentence, which labels no item. All four are
scored PASS above. The parser now also matches a prefixed verdict line.

**By the bar, the shipped wording holds again.** Scoped trails it by 1 in total and by 3 on
present. Its I3 losses are findings bundled under one number, or left unlabelled after the list.

**Scoped halves the N3 failure; it does not remove it.** Three scoped runs labelled the
explanation anyway, each saying it had labelled the items so the user could refer back to them.
Control never does. Any rule about labelling appears to spread to lists it does not name.

The shipped N3 failure reproduced, 6 of 6.

## The bar for round 3

Fixed before round 3, on the round-2 backlog. Arms are control, shipped, and narrowed. Narrowed
is the shipped text with only its first sentence changed, so the difference is attributable to it:

```markdown
## List identifiers

Label every list that asks the user to choose, answer, or decide, so they can answer each item by its label; a list that only explains needs none. Letter a plain list (A, B, C) or number it (1, 2, 3). Where every item is one kind of thing, prefix the number with a letter naming the kind: P1 for a proposal, Q1 for a question, S1 for a scenario.

Keep a label once you have given it. When you revise the list, each item keeps its label, a removed item's label is not reused, and a new item takes the next one in the sequence.
```

The round-1 bar applies unchanged.

## Round 3 — 2026-09-26, 234 turns

The round-2 backlog. Same model, isolation, and judge. No hand corrections: every failing verdict
was read against its reply and stands.

| arm | I1 | R1 | I2 | R2 | I3 | R3 | I4 | N1 | N2 | N3 | present /24 | revise /18 | near-miss /18 | total /60 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| control | 6 | 0 | 5 | 1 | 0 | 1 | 0 | 6 | 6 | 6 | 11 | 2 | 18 | 31 |
| shipped | 6 | 6 | 3 | 6 | 4 | 6 | 6 | 6 | 6 | **0** | 19 | 18 | 12 | 49 |
| narrowed | 6 | 6 | 5 | 6 | **1** | 4 | 6 | 6 | 6 | 6 | 18 | 16 | 18 | 52 |

**By the bar, the shipped wording holds a third time.** Narrowed clears the total by exactly 3 but
falls 2 below shipped on revise.

**Narrowed fixes N3 and breaks I3.** It never labels an explanation, but four of six runs present
code-review findings as unlabelled bullets under bold titles, and both R3 failures follow from
those unlabelled first replies. Read as "a list that asks the user to choose, answer, or decide",
a review's findings are something the user reads, not answers.

## Verdict after three rounds

**The shipped wording stays.** It met the bar against every candidate in all three rounds, and it
beats the empty control by 11 to 18 runs in total each round, almost all of it on revision and
two-list replies, which control fails nearly every time.

Its one categorical failure has reproduced in every round: it labels plain explanations, N3
failing 18 of 18 runs. Each narrowing tried so far trades that away for something worse. Scoped
drops presentation, and narrowed drops review findings, which is the section's purpose. The noise
of labels on an explanation costs less than findings the user cannot answer by label.

A next candidate would have to keep findings inside the rule while leaving explanations out. That
is a fourth round on this backlog, under the same bar.

## The bar for round 4

Fixed before round 4, on the round-2 backlog. The owner asked for a wording of one or two
sentences, scored before and after in promptfoo. Round 4 is the first round run through
`promptfoo/`; its runners, isolation, judge prompt, and verdict parser are the ones rounds 2 and 3
used, so only the driver changed. Arms are control, shipped, and two candidates whose files are
in `promptfoo/arms/`:

**kinds** — one sentence. It names the four kinds of list the backlog's failures came from, so
findings stay inside the rule (round 3's loss), and it makes the kind prefix the only scheme, so
two lists in one reply carry different labels (round 1 minimal's loss on two-list replies):

```markdown
## List identifiers

Give each option, question, finding, or proposal you put to the user a label they can answer by, a letter for its kind and a number (O1, Q1, F1, P1), and keep it through every revision: never renumber, never reuse a removed item's label, and give a new item the next number.
```

**kinds-explain** — the same rule in two sentences, with one clause added that leaves the points of
an explanation out, so the difference between the two candidates is attributable to that clause:

```markdown
## List identifiers

Give each option, question, finding, or proposal you put to the user a label they can answer by, a letter for its kind and a number (O1, Q1, F1, P1); the points of a plain explanation need none. Keep each label through every revision: never renumber, never reuse a removed item's label, and give a new item the next number.
```

The round-1 bar applies unchanged: a candidate replaces the shipped wording only if its total
beats shipped's by at least 3 runs and no category falls more than 1 run below shipped. Category
totals are present /24, revise /18, near-miss /18. Categorical failures are reported on their own.

## Round 4 — 2026-11-10, 240 turns

The round-2 backlog, run through `promptfoo/` on promptfoo 0.125.1 and Claude Code 2.1.322, all
`sonnet`, isolated runners, judged blind by `sonnet`. No hand corrections. Every failing verdict
under shipped and the candidates was read against its reply and stands.

| arm | I1 | R1 | I2 | R2 | I3 | R3 | I4 | N1 | N2 | N3 | present /24 | revise /18 | near-miss /18 | total /60 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| control | 6 | **0** | 5 | 4 | 2 | 3 | **0** | 6 | 6 | 6 | 13 | 7 | 18 | 38 |
| shipped | 6 | 6 | 4 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 21 | 18 | 18 | 57 |
| kinds | 6 | 5 | 5 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 23 | 17 | 18 | 58 |
| kinds-explain | 6 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 23 | 18 | 18 | **59** |

**By the bar, the shipped wording holds a fourth time.** Kinds-explain beats it by 2 in total and
kinds by 1, and the bar asks for 3. Neither falls more than 1 below shipped in any category, so
both tie with shipped at a third of its length. A tie keeps the incumbent.

**The shipped N3 failure did not reproduce.** In rounds 1 to 3 it failed 18 of 18; here all six
shipped explanations number their causes with plain numerals, which the key allows. The runner
model behind `sonnet` has changed since September, so round 4 is not pooled with earlier rounds,
and the shipped wording's one categorical failure is no longer a measured reason to replace it.

**The candidate losses are the shapes the earlier rounds named.** I2 fails under every arm on a
closing question left outside the labelled list, such as asking where the `link` command lives:
twice under shipped, once under each candidate. The kinds R1 failure is the round-1 duplicate: the
first reply already carried an on-disk cache, and the runner revised it rather than adding a new
option. The shipped I3 failure leaves the changeset and missing-test notes unlabelled after the list.

**Categorical failures are control's alone.** It fails R1 and I4 6 of 6, renumbering after a
removal and numbering both lists of a two-list reply from 1. The section still beats control by 19
runs, 8 on present and 11 on revise.

## The bar for round 5

Fixed before round 5. The owner's decisions after round 4: a shorter wording that scores the same
as shipped should replace it, and kinds-explain's explanation clause is the fix for labelling
explanations. The backlog gains N4, a second explanation, so round 5 is a different backlog and is
never pooled with earlier rounds. Category totals are present /24, revise /18, near-miss /24, total
/66.

Arms are control, shipped, kinds (A), and kinds-explain (B), with the wordings recorded in the
round-4 bar, unchanged.

This bar replaces the round-1 bar for this round, because both candidates are shorter than shipped:

- **A shorter candidate replaces the shipped wording** if its total is no more than 1 run below
  shipped's and no category falls more than 1 run below shipped.
- If both candidates clear it, the higher total wins. On equal totals, kinds-explain wins, because
  it carries the explanation clause the owner chose as the fix.
- A categorical failure, a task failing 5 or 6 of 6 under an arm, is reported on its own whatever
  the totals say.

## Round 5 — 2026-11-10, 264 turns

The round-4 backlog plus N4, run through `promptfoo/` on promptfoo 0.125.1, all `sonnet`, isolated
runners, judged blind by `sonnet`. No hand corrections. Every failing verdict under shipped and the
candidates was read against its reply and stands.

| arm | I1 | R1 | I2 | R2 | I3 | R3 | I4 | N1 | N2 | N3 | N4 | present /24 | revise /18 | near-miss /24 | total /66 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| control | 6 | **0** | 5 | 2 | 3 | 3 | **0** | 6 | 6 | 6 | 6 | 14 | 5 | 24 | 43 |
| shipped | 6 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 6 | **0** | 3 | 23 | 18 | 15 | 56 |
| kinds | 6 | 6 | 5 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 6 | 22 | 18 | 24 | 64 |
| kinds-explain | 6 | 6 | 5 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | 6 | 22 | 18 | 24 | **64** |

**By the round-5 bar, kinds-explain replaces the shipped wording.** Both candidates clear it: each
beats shipped by 8 in total and falls 1 below it on present, which the bar allows. Their totals
are equal, so kinds-explain wins on the tie rule fixed before the run.

**The shipped N3 failure is back, 6 of 6.** Every shipped run lettered the causes A to F and
referred back to them by letter. Three of six shipped runs labelled N4's install steps S1 to S9.
Round 4's 0 of 6 on the same task and model reads as run-to-run variance, not a changed model.
Neither candidate labelled either explanation in any run.

**The candidate losses are I2 and I3, once each.** The I2 loss is a closing question left outside
the labelled list, which every arm has shown. The I3 loss is several findings bundled under one
label, such as an F6 that holds five style points.

**Categorical failures:** control fails R1 and I4 6 of 6, as in every round. Shipped fails N3 6 of 6.
