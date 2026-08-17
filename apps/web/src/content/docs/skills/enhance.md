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

## What it offers today

One addition ships, a `## Delegation` section:

```markdown
## Delegation

If this harness can spawn subagents, delegate bulk-mechanical work and research whose answer is far smaller than the reading behind it. Do it yourself when the brief would cost more than the task — a one-line edit is not worth a subagent. Keep the judgment calls and final decisions; delegate the fact-gathering that feeds them. The cheaper the subagent, the less should break if it gets the answer wrong. Brief every one you spawn: it inherits no context, so give it the context, the why, and what done looks like.
```

You see that text in full before you answer. On approval it is appended to the root `AGENTS.md`, outside the `buddy-agent-harness` managed region: the section asserts something about how the repository is worked in and holds true whether or not the tool ever ran, which makes it material content, and material content needs approval. The managed region is for the tool's own bookkeeping.

The wording is fixed. The skill offers it as written or not at all, and does not adapt it to a repository.

## Why that wording

The section was settled by testing rather than by taste. Candidate wordings were compared over 54 blind A/B runs, each run given the same five-task backlog and scored against a key fixed in advance, in two conditions: a current model roster, and a drifted roster naming models the session could not spawn.

The categorical results are the ones worth acting on.

A version naming concrete models scored worst. It listed model tiers in a table, and on the current roster one run produced an unexecutable plan by assigning work to a model the session could not spawn. Both drifted-roster runs reported the table inapplicable. That is why the shipped section names no model, vendor, or version. The same table failed a second way: one run read its "Delegate?" column backwards and routed bulk mechanical work up a tier, inverting the intent.

Defining a tier ladder bought nothing on its own. A model-free tier table scored no better than the named one.

Two clauses in the shipped text each fix a measured failure. An early prose draft with no lower bound delegated a one-line typo fix in 4 of 4 runs, which is what the "do it yourself" clause is for. Delegating the final verdict away failed 9 of 12 early runs; across the twelve runs of the two drafts that first carried "keep the judgment calls and final decisions", it failed none.

Compression did not help either. A maximum-compression rewrite came out both longer than the draft it was meant to improve and worse in behavior.

Read the small differences with care. One judge scored every run, against one task backlog, with six runs per cell in the final rounds, so the top candidates were statistically indistinguishable from one another. The named-model failure and the keep-the-decision fix are solid. The score gaps between close candidates are not.

## Rules it follows

These hold regardless of what you ask for mid-run:

- Never write without approval. The offer is the point.
- Never edit an addition to fit a repository.
- Never touch the managed region, a nested `AGENTS.md`, or any file other than the root `AGENTS.md`.
- Never consolidate harness instruction files. Reading them is the coverage judgment; merging them is [`init`](/skills/init/).
- Local agent configuration only: no workflows, repository settings, or unrelated project files.
