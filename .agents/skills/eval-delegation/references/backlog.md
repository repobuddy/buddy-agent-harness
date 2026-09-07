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

For contrast, measured on an earlier backlog whose T2 was a typo fix rather than a `.gitignore`
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
