---
title: 'Skill: enhance'
description: What the enhance skill offers a repository, how it decides a section is already covered or carries an outdated version of a shipped one, and the runs behind the wording it ships.
---

The `enhance` skill proposes guidance a repository does not have, and offers a fresh copy of guidance it took from an earlier release. [`init`](/skills/init/) is the other half: it consolidates what you already wrote and bridges the harnesses that cannot read it, and it invents nothing. Initialization has to be safe to run anywhere, so it carries no opinions. An addition is opinionated by construction.

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

Every run reports, whichever way it went: what it read, the verdict for each addition and why, what it offered, and what was written. A run that offers nothing still reports. That is the only way to tell "already covered" from "did not look".

## When a section is out of date

Judging by meaning has one blind spot, and it took a while to notice. A wording that ships here can change. The `## Delegation` text was rewritten once already. A repository that took the earlier version keeps a section that covers the subject perfectly well, so every later run judged it covered and the new wording was never mentioned. The file quietly stayed a release behind, and nothing in the report said so.

So coverage is now two questions rather than one. The first is unchanged: does the merged view already tell the agent what this addition would tell it? Only text that answers yes reaches the second: is that text a recognizable earlier form of the addition's own wording? Each addition's reference file states that criterion beside the one for coverage, as a small set of conditions that decide the question outright.

The order is the safety property, and it is worth being explicit about why. Coverage is the broad judgment, staleness the narrow one inside it. Guidance you wrote yourself, under your own heading, clears the first question and never reaches the second, so the skill has no path that weighs your words against this package's and prefers its own. Doubt resolves the same direction in both places: toward leaving the file alone. Closeness in meaning is coverage. It is never staleness.

Each addition therefore ends in one of three states:

- **absent** — offered as an addition, as before.
- **an earlier form, in the root `AGENTS.md`** — the current text is offered as a replacement for that section, and for nothing else.
- **covered** — nothing offered, and the report names what covers it.

A replacement is an offer like any other. You see the section as it stands and the text that would take its place, and nothing is written until you say so. On approval only that section changes, from its heading to the next heading of the same or higher level; the rest of the file is left byte-for-byte as it was. On a decline the old section stays exactly where it is.

An earlier form found somewhere other than the root `AGENTS.md`, in a `CLAUDE.md` or a `.cursorrules`, is reported by name and not replaced. This skill writes one file. Replacing the root copy while an older copy stayed in a harness file would leave you holding two versions of the same guidance instead of one, which is worse than the problem it set out to fix. Run [`init`](/skills/init/) to consolidate first.

## What it never does

These hold regardless of what you ask for mid-run:

- Never write without approval. The offer is the point.
- Never silently overwrite. A replacement is gated exactly as an addition is, word for word.
- Never edit an addition to fit a repository.
- Never touch the managed region, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Never consolidate harness instruction files. Reading them is the coverage judgment; merging them is [`init`](/skills/init/).
- Never reach past local agent configuration into workflows, repository settings, or unrelated project files.

## What it offers today

### Delegation

A `## Delegation` section, on the work an agent should hand to a subagent and the work it should keep:

```markdown wrap
## Delegation

If this harness can spawn subagents, delegate the mechanical work and the research whose answer is far smaller than the reading behind it. Keep the judgment calls and the decisions; anything you would finish in less time than briefing it takes, do yourself.

A subagent inherits your model if you do not pick one, and none of your context either way. Pick the cheapest, unless you cannot say what a right answer looks like or could not cheaply tell a wrong one. Give it the context, the why, and what done looks like.
```

The staleness criterion has to answer a harder question than it first appears: not "does this say roughly the same thing", but "did this text come from *here*, at an older version". The two are easy to confuse, and confusing them means offering to overwrite something an owner wrote.

So the criterion is three conditions on a `## Delegation` section, and the first one carries the weight. It looks for one span of the text, present character for character: `whose answer is far smaller than the reading behind it`. That span appears in the current wording and in the one it replaced, so it proves nothing about which version is in the file; what it proves is that the section came from this file at all. Nobody arrives at that clause independently. The other two conditions then pick the version: the section says a subagent inherits no context, and says nothing about the model it inherits or how to pick one. A section that does mention the model is the current text.

It is one span rather than several, and that is a correction rather than an accident. An earlier draft accepted a second span, `the context, the why, and what done looks like`, which appears in both wordings just as reliably — but it is an ordinary triad that an engineering team writes on its own without ever having seen this package, and blind runs on plausible in-house guidance built around it offered to replace the owner's words. Four phrases survive both wordings; exactly one of them is odd enough to stand for provenance. A provenance test is only as strong as its weakest accepted match, so the others are not accepted at all.

An even earlier draft tried to do this with the opening clause "If this harness can spawn subagents" plus the silence about models, and it does not work either, for the same reason. That clause opens the current wording too, so it separates nothing, and silence about model inheritance is simply what unrelated prose looks like — most people writing delegation guidance would never think to mention it. Handed a plausible, independently-written section that happened to open that way, blind runs offered to replace it.

One thing the span condition has to check beyond presence: whether the span is the section's own instruction or something it is quoting. A repository that quotes the phrase in order to argue against it — stating a deliberately different delegation policy — is the owner disagreeing with this package, which is about the strongest signal there is that the prose is theirs. Blind runs on exactly that file offered to replace it until the condition said so. It is the same rule the coverage judgment already applies one step earlier, where a heading inside a fenced code block is not a heading.

Once the three conditions hold, the section's remaining sentences are not read against the current text. That comparison always finds differences, because differing sentences are what a rewrite produces; an earlier draft of the criterion left the comparison open and blind runs on a genuinely stale file came back covered every time. The conditions themselves are still matched exactly — a paraphrase of the span is not the span, and is in fact evidence the text was written independently.

You see the text in full before you answer. On approval it is appended to the root `AGENTS.md`, outside the `buddy-agent-harness` managed region: the section asserts something about how the repository is worked in and holds true whether or not the tool ever ran, which makes it material content, and material content needs approval. The managed region is for the tool's own bookkeeping.

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
