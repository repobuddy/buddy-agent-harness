# The backlog, the key, and the baseline

## The six tasks

Held fixed. The runner sees them as an ordinary day's work, in this order, with no hint that
delegation is the subject.

T6 was added after the 29/30 baseline was measured. Adding it changes the prompt below the
`end AGENTS.md` marker, so **the six-task backlog is a different backlog**: scores measured on it
are not poolable with the 29/30 figure below, and T6 is always reported as its own number.

| | Task |
| --- | --- |
| T1 | Rename the exported function `initHarness` to `initRepo` across the codebase (61 call sites) and update the tests that reference it. |
| T2 | Add `coverage/` to the repository root `.gitignore`. |
| T3 | Find every SKILL.md under `.agents/skills/` that references a path beginning with `.claude/`, and list them with line numbers. |
| T4 | Decide whether our new "Delegation" guidance belongs in AGENTS.md or in a separate loadable skill, and give the reasoning. |
| T5 | Review the 4 open dependency-update PRs and, for each, decide merge / hold / needs-work. |
| T6 | For each of the 96 skills in the marketplace snapshot under `.research/snapshot/`, record the skill name, the character count of its frontmatter `description`, and whether the file has a `license` field. Produce one table row per skill. |

Each task discriminates a different way, and the set is balanced so that a candidate cannot win
by pushing the agent in one direction:

- **T1** is bulk mechanical with a wide blast radius. Delegating it is right; the interesting
  part is which subagent and how it is briefed.
- **T2** is the over-delegation trap. It costs less to do than to brief. A candidate that only
  says "push work down" fails this every time.
- **T3** is scoped research whose answer is far smaller than the reading. Delegate.
- **T4** is a judgment call. Keep it. Watch for runs that delegate it *upward* — a tier ladder
  invites this.
- **T5** is mixed: the gathering is delegable, the verdict is not. The hardest case, and the one
  that separates candidates most.
- **T6** does not test delegate-versus-keep — that answer is not in doubt. It holds *delegate*
  fixed and discriminates on the **assignment**: high volume, no judgment, a verifiable answer,
  no blast radius. The cheapest rung on any roster is capable of it, so any run that spends a
  more expensive one is spending it for no reason. It exists because T1's `any subagent` column
  lets a cost-blind run score full marks; T6 does not.

## The key

| | Correct | Also acceptable |
| --- | --- | --- |
| T1 | delegate | any subagent, if the brief names the verification |
| T2 | do it yourself | — |
| T3 | delegate | — |
| T4 | keep | — |
| T5 | keep the verdict | delegate the gathering with an explicit instruction not to decide |
| T6 | delegate on the cheapest rung the work admits, chosen visibly rather than inherited | any rung below the most-capable, when the row says why that rung fits the work |

Score one point per task.

T6 scores on three buckets, not two:

- **correct** — delegates, and the assignment shows a rung was chosen: the cheapest rung, or a
  higher-but-not-top rung with the reason stated.
- **unclear** — delegates, but assigns the rung the session is already running on (`sonnet` /
  `atlas`) with nothing said about tier. This is the inheritance default, which is the failure
  the task was built to see; it scores no point.
- **wrong** — assigns the most-capable rung (`opus` / `atlas-max`), or keeps the task.

A run that names a subagent in the who-column while its own note says the work is cheaper to do
directly scores as **wrong** — the assignment is the answer.

**The bar for T6, fixed before the runs:** a wording holds T6 at 4 of 6 or better, the same
tolerance T2 carries in `SKILL.md`. Below that, the section has a measured gap.

## The two roster conditions

Both are generated from one candidate. The drift roster is not a hypothetical: it stands in for
every harness whose model lineup differs from the one the author had in mind, which is most of
them, and it is where wording that names models comes apart.

| Condition | The runner is told |
| --- | --- |
| current | it runs as a mid model, and may spawn a cheap, a mid, and a most-capable model named as this vendor names them |
| drifted | the same three rungs under a different vendor's names |

## Baseline — the shipped wording

54 runs across six rounds settled the current text. The shipped section scored **29 of 30** on
the clean backlog above, at six runs per cell:

| | T1 | T2 | T3 | T4 | T5 |
| --- | --- | --- | --- | --- | --- |
| shipped wording | 6/6 | 5/6 | 6/6 | 6/6 | 6/6 |

## Baseline — the shipped wording on the six-task backlog

A separate backlog from the one above. **Never pool these figures with the 29/30.** Six runs,
three per roster, all on the same model, the shipped section built through
`build-prompts.mjs` with only the T6 line differing below the `end AGENTS.md` marker.

T6, reported on its own as the key requires:

| | T6 |
| --- | --- |
| shipped wording | **6/6 correct** |

Every run delegated T6 to the cheapest rung on its roster — `haiku` three times on the current
roster, `atlas-mini` three times on the drifted one. No run inherited the session's own rung, and
no run spent the most-capable one. The bar was 4 of 6, fixed before the runs. The shipped wording
holds T6.

The rest of the six-task backlog, for the record and not comparable to the 29/30:

| | T1 | T2 | T3 | T4 | T5 |
| --- | --- | --- | --- | --- | --- |
| shipped wording | 5/6 | 6/6 | 6/6 | 6/6 | 5/6 |

Both misses are the same run, on the current roster: it briefed T1 without naming any
verification, and delegated T5's merge/hold/needs-work verdict itself rather than the gathering.
One run either way is noise at this sample size.

### What T6 measured that T1 could not

T1 and T6 are both bulk mechanical, and the runs assigned them to **different rungs**:

| | blast radius | rung chosen |
| --- | --- | --- |
| T1 — 61-call-site rename | wide | the session's own mid rung, 5 of 6 |
| T6 — 96-file read-only sweep | none | the cheapest rung, 6 of 6 |

That is rung-to-risk calibration, and it is what `the cheaper the subagent, the less should break
if it gets the answer wrong` asks for. The line reads as passive risk-bounding, but the runs use
it as a tier rule in both directions. The reported failure — everything inheriting the parent's
model — did not reproduce.

### The thin spot T6 exposed anyway

Three of six runs delegated T6 correctly and still reported the tier rule as missing in their
**unclear** line: no rule for choosing among the rungs, and no rule for sizing a subagent against
risk. Both drifted runs that named it assigned correctly regardless.

This is the T5 pattern: a clause the runs resolve in practice while reporting they could not
apply it. It is a known thin spot, recorded rather than chased. Closing it costs words in a
section loaded on every session, and the behavior it would buy is already at 6 of 6.

## Earlier contrasts

Measured on an earlier backlog whose T2 was a typo fix rather than a `.gitignore`
line — **report these separately, never pooled with the above**:

| Candidate | Score | Notes |
| --- | --- | --- |
| a table naming concrete models | 12/20 | assigned work to a model absent from the roster, on the *current* roster; both drifted runs called it inapplicable; one run read its `Delegate?` column backwards and routed bulk mechanical work up a tier |
| a model-free tier table | 12/20 | defining a ladder bought nothing |
| prose with no lower bound | 13/20 | delegated the one-line edit 4 of 4 |
| maximum-compression rewrite | 25/30 | came out longer than the draft it compressed, and worse |

## Known limits

One judge scores every run. One backlog. Six runs per cell. The top candidates in the final
rounds were statistically indistinguishable, so the ranking is weak evidence and the categorical
failures are strong evidence. Say so in any writeup.

T5's gather-versus-decide boundary still draws an unclear from roughly half of all runs under
every wording tried, while resolving correctly in most. It is a known thin spot, not a
regression to chase — closing it costs words, and the section is loaded on every session.

# The model-choice axis

Added 2026-09-10, after a report that agents follow the routing rules and then spawn every
subagent on their own model. The five tasks, the prompt bytes, and the T1–T5 key above are
untouched — this is an added scoring axis on the same backlog, not a new one, so T1–T5 figures
stay comparable with the 29/30 baseline. Only the model column, which every run has always
produced and no key has ever read, is now scored.

## Why it was invisible

The `Model + effort` column has been in the emitted prompt since the first round. Nothing scored
it. T1's key even says *"any subagent, if the brief names the verification"* — an explicit
decline to look. A wording can therefore hold 29/30 while producing the exact behavior the axis
below fails.

## The key

Scored only on T1 and T3. Both resolve to *delegate* at 6/6 under the shipped wording, so the
denominator is fixed at 2 points per run and does not move with the routing result.

| | Correct | Wrong |
| --- | --- | --- |
| M1 (T1's model) | cheapest or mid | most-capable, or no model named |
| M3 (T3's model) | cheapest | anything else, including the runner's own tier |

M3 is the discriminating cell. T3 is scoped read-only search whose answer is checked the moment
it lands; nothing breaks if it is wrong. A run that assigns its own tier there has defaulted, not
decided, and that default is the reported production failure.

M1 is the guard against a candidate that wins M3 by pushing everything to the cheapest rung. T1
rewrites 61 call sites; most-capable is over-spend, but cheapest-everywhere is the failure mode
in the other direction and shows up here first.

Record, without scoring: the effort level attached to each delegated task, and any run assigning
most-capable to anything. Neither has discriminated yet; both are cheap to keep.

## The bar for this axis

Fixed before the first run. A candidate replaces the shipped wording only if **all** hold:

- T1, T3, T4, T5 stay at the baseline, and T2 does not drop below 4 of 6 — unchanged.
- M3 improves by at least 3 of 6 runs over the shipped wording's measured baseline. Fewer than 3
  is noise at this sample size and the incumbent keeps the slot.
- M1 does not drop.

## Known limits of this axis

The emitted prompt *asks* for a model per row, so a run cannot silently omit the choice the way a
production session does — it is forced to write something. The axis therefore measures which tier
a forced choice lands on, which is a proxy for the production failure and not the failure itself.
A wording that fixes the tier here may still leave a real session inheriting its parent's model
by never forming the thought. Treat a win here as necessary, not sufficient.

## Measured — 2026-09-10, 12 runs

Six runs per candidate, three per roster, every runner on the same mid model, each told only to
read its prompt file. Prompts diffed below the `end AGENTS.md` marker: identical. The candidate
differed from the shipped wording by one inserted sentence: *"Set each subagent's model when you
spawn it — left unset it is usually yours, and most delegated work does not need yours."*

| | T1 | T2 | T3 | T4 | T5 | total | M1 | M3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shipped | 5/6 | 5/6 | 6/6 | 6/6 | 6/6 | 28/30 | 5/5 | 6/6 |
| candidate | 5/6 | 5/6 | 6/6 | 6/6 | 6/6 | 28/30 | 5/5 | 6/6 |

M1's denominator is the runs that delegated T1; one run per candidate kept it, and a kept task
has no model choice to score. Scoring it as a failure would have double-counted a miss already
recorded in T1.

**The candidate does not replace the shipped wording.** A tie keeps the incumbent, and the
M3 improvement the bar required (≥3 of 6) was unreachable: the shipped wording already scores
6 of 6 there.

### What this measured, and what it did not

The axis found no defect to fix. Every run under both wordings sent T3 to the cheapest rung
unprompted. The production report that motivated the axis — a session spawning every subagent on
its own model — did not reproduce once in twelve runs.

That is the limit written above, now observed: the emitted prompt has a `Model + effort` column,
so a run must write a tier into it. Being asked is most of the work. The production failure is
not choosing a bad tier, it is never reaching the question, and a harness that asks cannot
produce a run that never asks. **Do not read the 6/6 above as evidence that the shipped wording
prevents the reported behavior.** It is evidence that the harness cannot see the behavior.

Closing that needs a harness change, not a wording change: a roster condition whose output format
permits an unspecified model, so that inheriting the parent's tier is an available answer and can
be scored as one. Until then this axis discriminates over-spend, not omission.

### Findings worth keeping

- **The added sentence raises a question it does not answer.** Four of six candidate runs quoted
  it back in UNCLEAR asking for a tier-to-task mapping — *"gives no guidance on mapping task type
  to model/effort tier"*. One shipped run reported the same gap spontaneously; naming the choice
  quadrupled it. Per `method.md`, a clause several runs cannot apply is a defect even when the
  scores pass. Any future candidate on this axis should carry the mapping or leave the choice
  unnamed.
- **T5 escalates.** Five of six drift runs sent PR review to the most-capable rung, and both
  wordings did it equally. Nothing in the section bounds upward spend, only downward risk.
- **The self-contradicting row appeared again**, once, under the shipped wording: a run put
  the cheapest model in T2's who-column beside a note reading *"one-line edit, doing it myself"*.
  Fourth wording it has shown up under.

# The unforced axis

Added 2026-09-10, immediately after the model-choice axis returned 6/6 for both wordings and
reproduced nothing. That axis asks *which tier do you pick when a column demands one*. Production
asks *do you reach the question at all*, because the model is an optional parameter with a
default and nothing prompts for it. Those are different tasks, and only the second is the
reported failure.

The `unforced` condition drops the `Model + effort` column from the required table. The roster
paragraph stays — a production agent does know its roster from the tool schema, so telling it is
faithful; what is not faithful is a cell it cannot leave blank. Naming a model becomes something
the run volunteers or does not.

The two older conditions are untouched and still emit byte-identical prompts, so the T1–T5
routing baseline stands. Note that its 29/30 was measured under a prompt that names models in the
output format, which may lift delegation rates in absolute terms; it was constant across every
candidate ever compared, so the A/B results are unaffected either way.

## The key

Primary, **V**: out of 6 runs, how many name a model or tier for at least one delegated task,
anywhere in the answer — table cell, brief text, or surrounding prose.

Secondary, recorded not scored: delegated tasks carrying an explicit model over delegated tasks
total; and, for the assignments that do name one, the M1/M3 tier judgments defined above.

Routing (T1–T5) is scored as always, but on this condition it is a fresh cell. Do not pool it
with the forced-condition figures.

## The bar

Fixed before the first run.

- If the **shipped** wording scores V ≥ 4 of 6, this axis has failed to reproduce the report too.
  Record that and change no wording — the next suspect is the setting, not the sentence.
- The candidate replaces the shipped wording only if V improves by **at least 3 of 6**, and no
  T1–T5 task on this condition falls more than one run below the shipped score on the same
  condition.

## Measured — unforced axis, 2026-09-10, 12 runs

Six per wording, all on the same mid model, `unforced` condition only.

| | T1 | T2 | T3 | T4 | T5 | total | V |
| --- | --- | --- | --- | --- | --- | --- | --- |
| shipped | 6/6 | 5/6 | 6/6 | 5/6 | 6/6 | 28/30 | **6/6** |
| candidate | 6/6 | 2/6 | 6/6 | 3/6 | 3/6 | 20/30 | **6/6** |

### The axis did not reproduce the report either

V is 6 of 6 for the shipped wording. With no column asking for a model, every run named one
anyway. Removing the prompt did not produce a single run that left a subagent on the parent's
tier, and the tiers chosen were sensible — T3 went to the cheapest rung in 5 of 6.

Per the bar fixed before these runs: **shipped V ≥ 4 of 6 means record it and change no wording.**
Two axes, 24 runs, and the reported behavior has not appeared once. The evidence now says the
Delegation section is not what is failing, and the next suspect is the harness default, not the
sentence.

What still separates this from production is not the output format. It is that a run here is
*planning* — writing out who does what before doing any of it — while the production failure
happens *mid-flow*, at the moment a tool call is composed. A planning step surfaces the choice on
its own. This backlog cannot remove that without ceasing to be a plan-scored backlog, and that is
now the honest boundary of what it can measure.

### The candidate is rejected, and not on a tie

The same sentence that tied on the forced axis costs **8 points** here. T2 — the
over-delegation trap — fell from 5 of 6 to 2 of 6: four runs handed a one-line `.gitignore` edit
to a subagent. T4 and T5 fell with it, two runs abandoning both rows as `n/a` rather than
assigning them.

The mechanism is legible in the runs. *"Most delegated work does not need yours"* is a sentence
about model choice, but it presupposes delegation and reads as encouragement to delegate. On the
forced condition the model column absorbed it. With that column gone it landed on the who-column
and pushed work down that should have stayed. The wording this section replaced failed the same
way — see the *prose with no lower bound* row above, 4 of 4 on the one-line edit.

The shipped wording held 5 of 6 on T2 under this same condition, so this is the wording, not the
condition.

### The mapping gap, confirmed on a second axis

Five of six candidate runs asked in UNCLEAR for a rule mapping task type to tier — *"gives no
criteria for choosing among haiku/sonnet/opus beyond cost"* — against two of six for the shipped
wording. The forced axis showed four of six against one. Naming the choice reliably raises demand
for a mapping the section cannot supply without naming tiers. Treat that as settled across both
axes: **a candidate that tells the agent to pick a model owes it a way to pick, and this section
has no room for one.**

## Measured — isolated runners with an empty control, 2026-09-10, 18 runs

First round run through `scripts/run.sh` (sandbox HOME, no inherited CLAUDE.md) and the first with
an empty control. Unforced condition. The three arms' prompts are identical below the marker
(md5 verified). **Every earlier figure in this file was measured with the shipped section present
in all arms via the global CLAUDE.md, and none of them should be trusted.**

| arm | T1 | T2 | T3 | T4 | T5 | routing | M3 (T3 cheapest) | V |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **control** (no section) | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | **30/30** | 3/6 | 6/6 |
| shipped | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | **30/30** | 6/6 | 6/6 |
| candidate: *"Pick a cheaper subagent when a wrong answer is cheap to catch … Keep the capable one for work where being wrong is expensive."* | 6/6 | 6/6 | 6/6 | 6/6 | 6/6 | **30/30** | 6/6 | 6/6 |

### The backlog does not discriminate routing

An AGENTS.md with no Delegation section scores 30 of 30. It keeps the one-line `.gitignore` edit,
keeps the judgment call, delegates the rename and the search, and retains the verdict on the PRs
— with no guidance at all. Every routing figure in this file above this section is therefore
uninterpretable: the tasks measure a behavior the model already has.

**These five tasks are exhausted.** Any future round needs cases the empty control actually fails.

### The one thing the section does measurably do

M3 separates: 3 of 6 for the control, 6 of 6 for both wordings. Without the section, half the runs
route the search to a generically-named agent and never name a tier; with it, every run names the
cheapest one. That is a real effect at the pre-registered categorical threshold, and it is the
only effect this harness has ever cleanly attributed to the section.

Note it is about *naming* a tier, not choosing well: volunteering a model at all (V) is 6 of 6 in
the control too, so that is base behavior, not something the wording produces.

### The candidate ties, again

Third wording tested this day, third that does not beat the shipped text. It is not worse — it
fixes a real prose defect, since the shipped sentence states a bound without ever asking for an
act — but the bar is beat-the-incumbent, and at 6/6 against 6/6 with the control at 3/6 there is
no room left to show a difference. A wording cannot be shown better than the shipped one on a
backlog where the shipped one is already saturated.

# Backlog v2 — the discriminating set

v1's five tasks are frozen and still reachable with `--backlog v1`, but an empty control scores
30/30 on them, so they cannot show what any wording does. v2 is built so the control has room to
fail: the discriminating dimension found in the isolated round was *which tier a delegated task
gets*, so v2 carries tasks whose correct tier is unambiguous in both directions.

| | Task | Why it is here |
| --- | --- | --- |
| U1 | Update an import specifier in 140 files | bulk mechanical, wide but verifiable |
| U2 | Bump one `engines.node` field | over-delegation trap, replaces v1's `.gitignore` line |
| U3 | Find which version dropped Node 18 in a 4,200-line CHANGELOG | huge read, one-line answer, nothing breaks if wrong |
| U4 | Decide an org-wide lockfile migration | judgment, keep |
| U5 | Triage 23 issues and flag the 3 most urgent | gather delegable, the flagging is not |
| U6 | Rotate a CI cache key in 6 workflow files | escalation trap — reads as risky, is mechanical |
| U7 | Diagnose an intermittently empty release tarball | genuinely hard; guards against cheapest-everywhere |
| U8 | List packages with no `test` script | scoped survey, zero blast radius |

## The key

Routing, 8 points:

| | Correct | Also acceptable |
| --- | --- | --- |
| U1 | delegate | — |
| U2 | keep | — |
| U3 | delegate | — |
| U4 | keep | — |
| U5 | delegate the triage, keep the urgency flag | keep entirely |
| U6 | delegate | — |
| U7 | delegate to the most capable | keep |
| U8 | delegate | — |

Tier, 5 points, scored only on U1, U3, U6, U7, U8. A delegated task with no model named is wrong.

| | Correct | Wrong |
| --- | --- | --- |
| U1 | cheapest or mid | most-capable |
| U3 | cheapest | anything else |
| U6 | cheapest or mid | most-capable — the trap |
| U7 | most-capable (or kept) | cheapest |
| U8 | cheapest | anything else |

**Tier-perfect** = a run scoring 5 of 5 on the tier column. That is the headline number.

## The bar

Fixed before the first v2 run.

- The candidate replaces the shipped wording only if tier-perfect runs rise by **at least 3 of 6**
  over the shipped arm, and no routing task falls more than one run below shipped.
- If the control's tier-perfect count is within 1 of both wordings, v2 is saturated as well.
  Report that and swap nothing on this evidence.

## Measured — backlog v2, isolated, 2026-09-10, 18 runs

| arm | routing | tier-perfect |
| --- | --- | --- |
| **control** (no section) | 46/48 | **6/6** |
| shipped | 46/48 | 5/6 |
| candidate: *"Set the model on every subagent you spawn; leaving it unset gives it yours. Send the work to the cheapest agent whose mistakes would be cheap to catch…"* | **47/48** | 5/6 |

Tier-perfect counts runs with no tier error among the delegated tasks in {U1, U3, U6, U7, U8}; a
run that kept one of them is judged on the rest, since the routing column already charges for
keeping it.

**v2 is saturated too.** The control is at ceiling on the tier column and ties on routing, so by
the bar fixed above, nothing here justifies a swap. Built to discriminate, it does not: the model
sends the 4,200-line CHANGELOG search and the workspace survey to the cheapest rung, keeps the
one-line `engines.node` bump, keeps the org-wide decision, and reserves the most capable agent for
the intermittent-tarball diagnosis — with no delegation guidance in context at all. The only task
that separated anything was U6, the escalation trap, and it separated the *control* downward
(4/6 routing vs 6/6 shipped) rather than any wording upward.

Three backlogs and 36 isolated runs have now failed to attribute a routing effect to this section.
The most likely reading is that current models already do what the section describes, and that
what it is worth is the cases a plan-scored backlog cannot reach — a long session where the
guidance is the only thing still holding the line, and the mid-flow tool call where no column asks
for a model.

### The wording was changed anyway, on the owner's decision

Recorded so the next person knows what this evidence does and does not support. The section now
reads *"Set the model on every subagent you spawn; leaving it unset gives it yours…"*. The
argument for it is not a score:

- The sentence it replaced stated a bound and never asked for an act. Nothing in it made choosing
  a model something the agent does.
- It named no mechanism. The failure reported from practice is an unset model inheriting the
  parent's, and the old text gave the agent no reason to know that.
- Of the three candidates tried this day it was the only one that did not cost routing points
  (47/48, the best of the three arms).

What this round did **not** show is that the new wording produces better behavior than no wording
at all. Do not cite these tables as evidence that it does.

## Measured — v2, the two flow revisions, 2026-09-10, 12 further runs

| arm | routing | tier-perfect |
| --- | --- | --- |
| control (no section) | 46/48 | 6/6 |
| shipped, pre-change | 46/48 | 5/6 |
| *"…cheapest agent whose mistakes would be cheap to catch"* | 47/48 | 5/6 |
| *"…cheapest one **with the strength the task actually needs**"* | 45/48 | **4/6** |
| *"…**start at the cheapest** and move up only when…"* (shipped now) | 45/48 | 5/6 |

All five arms sit inside the noise band this skill defines, so none of this is a ranking. One
result is categorical and worth keeping:

**Naming a capability criterion without a cheap default causes over-spend.** The fourth arm's
*"the cheapest one with the strength the task actually needs"* sent U3 — a 4,200-line CHANGELOG
search with a one-line answer — up to the mid rung in two of six runs, and kept the U6 escalation
trap in three. Volume reads as difficulty, and a filter phrased as *strength needed* invites the
run to find some. Inverting it so the cheapest rung is the starting point and moving up needs a
reason recovered tier-perfect to 5/6 with the same two criteria present.

That is a property to preserve in any future wording: **state the cheap default first, and make
moving up the thing that needs justifying.** It is the same shape as the failure this section is
for — an unset model is a default nobody chose.

## Measured — v2, the observable-criterion wording, 2026-09-10, 6 further runs

| arm | routing | tier-perfect | U3 upsized |
| --- | --- | --- | --- |
| control (no section) | 46/48 | 6/6 | 3/6 |
| shipped, pre-change | 46/48 | 5/6 | 1/6 |
| *"…whose mistakes would be cheap to catch"* | 47/48 | 5/6 | 1/6 |
| *"…with the strength the task actually needs"* | 45/48 | 4/6 | 2/6 |
| *"…move up only when the task genuinely needs the strength"* | 45/48 | 5/6 | 1/6 |
| *"…move up only when you **cannot say what a right answer looks like, or could not cheaply tell a wrong one**"* (shipped now) | 44/48 | **6/6** | **0/6** |

### Why the criterion was rewritten

*"The task genuinely needs the strength"* asks the agent to estimate something it cannot observe:
what a cheaper model would have got wrong. There is no signal available to it, so a run either
ignores the clause or substitutes a surface cue — which is how the *strength the task actually
needs* arm read a 4,200-line file as a hard job and sent a one-line lookup up a rung.

Both replacements are properties of the lead's own position, which it can check: whether it can
state a right answer, and whether it could tell a wrong one cheaply. That arm is the only wording
that never upsized U3 and the only one to reach the control's tier ceiling.

**Property to preserve: every criterion in this section must be something the agent can evaluate
about itself, not a prediction about a model it has not run.**

### U6 is a suspect discriminator

Across all six arms, U6 — rotate a CI cache key in 6 workflow files — is the only task whose
routing moves at all; every other task scores identically in every arm. It was keyed *delegate*,
but keeping a six-file mechanical edit is defensible under this section's own "the brief would
cost more than the task" rule, and the arms split 1–4 of 6 on it with no legible pattern. The
routing spread of 44–47 across every wording tested is entirely U6.

Treat the routing column on v2 as carrying no signal until U6 is either re-keyed as
*either acceptable* or replaced with a task whose correct answer is not arguable.

## Measured — v2, the restructured section, 2026-09-10, 6 further runs

| arm | routing | tier-perfect | words |
| --- | --- | --- | --- |
| control (no section) | 46/48 | 6/6 | 0 |
| shipped, original | 46/48 | 5/6 | 115 |
| observable-criterion, single paragraph | 44/48 | 6/6 | 115 |
| **restructured** (shipped now) | **48/48** | 5/6 | **97** |

The restructure is the first arm to score perfect routing, and the first to take U6 — the
escalation trap — 6 of 6. Every other arm, control included, split 1–4 on U6 with no legible
pattern, which is why the note above calls it a suspect discriminator. **Withdraw that note.** U6
was discriminating something real: the previous wording spent three overlapping sentences on
whether to delegate, and a task that is mechanical but sounds risky fell through the overlap. One
sentence for what goes down and one for what stays resolved it.

The single tier miss is one run putting the intermittent-tarball diagnosis on the mid rung, caught
by the U7 guard, inside the noise band.

### What changed, structurally

- Three sentences answering "delegate or not" became two: one for what goes down, one for what
  stays. The removed one restated the other two.
- The mechanism moved to the front of the second half. *A subagent inherits your model unless you
  choose one, and none of your context either way* is one fact that makes both following
  imperatives follow, instead of two unrelated facts thirty words apart.
- The worked example — *a one-line edit is not worth a subagent* — was cut. The empty control
  scores 6/6 on that case, so the example bought nothing and `method.md` warns about examples that
  resemble backlog tasks.

**Property to preserve: state each rule once. The overlap was costing a task, not just words.**

## Measured — v2, "start at / move up" versus a default and its exception, 36 runs

| arm | routing | tier-perfect |
| --- | --- | --- |
| *"Start at the cheapest and move up only when…"* | 48/48 | 11/12 |
| *"Choose the cheapest model, unless…"* | 47/48 | 10/12 |
| *"Pick the cheapest, unless…"* (shipped now) | 47/48 | **6/6** |

Twelve runs each on the first two and the harness still cannot separate them — one run apart. The
change was made on the prose argument, which the scores neither support nor contradict.

**"Start at the cheapest and move up" describes a search the agent never runs.** It picks once, at
spawn time, and never revisits. The phrasing names an iterative escalation — try cheap, escalate
on failure — that has no counterpart in the act being instructed, so the agent has to translate it
back into a default and an exception before it can act. Saying it as a default and its exception
removes that step.

**Property to preserve: instruct the act the agent actually performs.** A rule shaped like a
procedure the harness cannot execute is a rule the agent has to reinterpret, and reinterpretation
is where wordings drift apart.

The third row is the same rule with the repeated *unless*/*choose* removed. Measured rather than
assumed, per this skill's own rule about changing wording on taste, and it holds tier-perfect at
6 of 6.
