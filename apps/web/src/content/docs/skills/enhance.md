---
title: 'Skill: enhance'
description: What the enhance skill offers a repository, how it decides a section is already covered, and the runs behind the wording it ships.
---

The `enhance` skill proposes guidance a repository does not have. [`init`](/skills/init/) is the other half: it consolidates what you already wrote and bridges the harnesses that cannot read it, and it invents nothing. Initialization has to be safe to run anywhere, so it carries no opinions. An addition is opinionated by construction.

That is why `enhance` is opt-in. Every addition is offered and never written on sight, and `init` now ends by asking whether to run it.

This skill has no CLI command behind it. There is nothing mechanical to hand off: the work is reading your instructions and judging what they already cover.

## Run it

In Claude Code:

```text
/buddy-agent-harness:enhance
```

Any agent that reads `.agents/skills/` can be asked in prose instead, from the repository root:

```text
Add the guidance my AGENTS.md is missing.
```

The target is the root `AGENTS.md`. If there is none, the skill stops and points at [`init`](/skills/init/), because it adds to an existing file and creating one is `init`'s job. A nested `AGENTS.md` is never a target, since none of the additions are scoped to a subtree.

## How it decides

The skill reads the root `AGENTS.md` together with any harness instruction file whose content still belongs in it: a `CLAUDE.md` with a body of its own, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `GEMINI.md`, `.windsurfrules`. It judges against that merged view, because the combined text is what an agent effectively reads. Guidance living in a Cursor always-on rule counts as present.

It reads those files and never consolidates them. Consolidation is `init`'s alone. Where the skill finds content that should be merged, it says so and recommends `init`, then carries on with the coverage judgment.

Coverage is judged by meaning, not by heading or wording. A repository covering delegation under `## Working with subagents`, or in three sentences inside a longer section, is covered. One that mentions subagents only to name a tool is not. In doubt, the skill treats the addition as covered and says why: a missed offer costs you nothing, while a duplicate section teaches every future agent that this file repeats itself.

Detection decides every run. There is no first-run path and no memory of a previous decline, so a section you delete is offered again. Absence is the whole state. If the repeat offer annoys you, decline `init`'s offer to run the skill.

Every run reports, whichever way it went: what it read, what it judged covered and why, what it offered, and what was written. A run that offers nothing still reports. That is the only way to tell "already covered" from "did not look".

## What it never does

These hold regardless of what you ask for mid-run:

- Never write without approval. The offer is the point.
- Never edit an addition to fit a repository.
- Never touch the managed region, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Never consolidate harness instruction files. Reading them is the coverage judgment; merging them is [`init`](/skills/init/).
- Never reach past local agent configuration into workflows, repository settings, or unrelated project files.

## What it offers today

### Delegation

A `## Delegation` section, on the work an agent should hand to a subagent and the work it should keep:

```markdown wrap
## Delegation

If this harness can spawn subagents, delegate bulk-mechanical work and research whose answer is far smaller than the reading behind it. Do it yourself when the brief would cost more than the task — a one-line edit is not worth a subagent. Keep the judgment calls and final decisions; delegate the fact-gathering that feeds them. The cheaper the subagent, the less should break if it gets the answer wrong. Brief every one you spawn: it inherits no context, so give it the context, the why, and what done looks like.
```

You see that text in full before you answer. On approval it is appended to the root `AGENTS.md`, outside the `buddy-agent-harness` managed region: the section asserts something about how the repository is worked in and holds true whether or not the tool ever ran, which makes it material content, and material content needs approval. The managed region is for the tool's own bookkeeping.

#### Why the Delegation wording

The wording is fixed: the skill offers it as written or not at all, and does not adapt it to a repository. It was settled by testing rather than by taste, over 54 blind A/B runs across six rounds. Every run got the same five-task backlog, scored against a key fixed before the runs, under two roster conditions: a current model roster, and a drifted one naming models the session could not spawn.

The runner sees the five tasks as an ordinary day's work, in this order, with no hint that delegation is the subject. Each discriminates differently, and the set is balanced so that a candidate cannot win by pushing the agent in one direction.

| | Task | Correct | What it catches |
| --- | --- | --- | --- |
| T1 | Rename an exported function across 61 call sites and update the tests | delegate | bulk mechanical work with a wide blast radius. The interesting part is which subagent, and how it is briefed |
| T2 | Add `coverage/` to the root `.gitignore` | do it yourself | the over-delegation trap. It costs less to do than to brief, so a candidate that only says "push work down" fails it every time |
| T3 | List every SKILL.md that references a `.claude/` path, with line numbers | delegate | scoped research whose answer is far smaller than the reading behind it |
| T4 | Decide whether the Delegation guidance belongs in `AGENTS.md` or in a separate skill | keep | a judgment call. Watch for runs that delegate it *upward*, which a tier ladder invites |
| T5 | Review 4 open dependency-update PRs and rule merge, hold, or needs-work on each | keep the verdict | mixed: the gathering is delegable, the verdict is not. The hardest case, and the one that separates candidates most |

One point per task. A run that names a subagent while its own note says the work is cheaper to do directly scores wrong, because the assignment is the answer and not the reasoning beside it.

The shipped wording scores 29 of 30 on that backlog, at six runs per cell:

| | T1 | T2 | T3 | T4 | T5 |
| --- | --- | --- | --- | --- | --- |
| shipped wording | 6/6 | 5/6 | 6/6 | 6/6 | 6/6 |

The candidates it beat were measured earlier, on a backlog whose T2 was a typo fix rather than a `.gitignore` line. Read that set against itself and never against the table above: a figure pooling runs from two backlogs measures nothing.

| Candidate | Score | What went wrong |
| --- | --- | --- |
| a table naming concrete models | 12/20 | assigned work to a model absent from the roster, on the *current* roster rather than the drifted one. Both drifted runs called the table inapplicable. One run read its `Delegate?` column backwards and routed bulk mechanical work up a tier |
| a model-free tier table | 12/20 | defining a ladder bought nothing on its own |
| prose with no lower bound | 13/20 | delegated the one-line edit in 4 of 4 runs |
| maximum-compression rewrite | 25/30 | came out longer than the draft it compressed, and worse in behavior |

The first row is why the shipped section names no model, vendor, or version, and the third is what the "do it yourself" clause is for. One more fix does not show up in either table: delegating the final verdict away failed 9 of 12 early runs, and across the twelve runs of the two drafts that first carried "keep the judgment calls and final decisions", it failed none.

Read the small differences with care. One judge scored every run, against one backlog, six runs per cell in the final rounds, so the top candidates were statistically indistinguishable. The categorical failures are the strong evidence. The gaps between close scores are not. T5's gather-versus-decide boundary remains a known thin spot: about half of all runs report it unclear under every wording tried, while still resolving it correctly.

The backlog, the key, and the baseline are recorded in `.agents/skills/eval-delegation/`, which is also the harness for re-running them.
