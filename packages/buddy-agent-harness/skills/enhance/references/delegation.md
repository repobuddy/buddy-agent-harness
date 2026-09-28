# Addition: Delegation

## Covered when

The merged view already tells the agent **when to hand work to a subagent**. Any of these counts:

- guidance on what to delegate and what to keep, under any heading
- a rule about briefing subagents, paired with any sense of when to spawn one
- an explicit statement that this repository does not use subagents

Naming a subagent tool, or listing available models, is not coverage. Neither is a delegation
rule that appears only in a skill body — this addition is for the always-loaded file.

## Stale when

Compare the `## Delegation` section already in the file against each wording in
`delegation.history.md` — the exact texts this addition used to offer — by the procedure in step 3
of the skill, with the text below as the current text.

A section that mentions what model a subagent inherits, or picking one, is not thereby the current
wording: anyone can write a sentence about choosing a model, including on top of a retired wording.

## Offer this text verbatim

```markdown
## Delegation

If this harness can spawn subagents, delegate the mechanical work and the research whose answer is far smaller than the reading behind it.

Size the job, not the step. A job made of many routine steps, or of waiting on something outside you, goes to a subagent as one job, even when each step alone is quicker to do than to brief. Do a job yourself only when the whole of it is quicker than the brief.

Split the job by what each part needs. The routine run goes to a cheaper subagent, told what counts as routine and to stop and report anything else instead of guessing. A hard part, such as a diagnosis, goes to whichever model can do it best, which may be a stronger subagent than you. Keep the decisions, such as what matters most, which option to take, or whether a result is good enough: they rest on what the user asked for and approved, which only you know. While a subagent runs, do not poll it or redo its work; handle its report when it arrives.

A subagent inherits your model if you do not pick one, and none of your context either way. Pick the cheapest, unless you cannot say what a right answer looks like or could not cheaply tell a wrong one. Where you can set its effort, pick the lowest, unless you could not write down the steps that reach that answer. Give it the context, the why, and what done looks like. Name the actions the user has authorized and the ones it must not take, since the subagent never saw the user say either.
```

## Where it belongs

**Recommend the owner's own global instruction file, not this repository's `AGENTS.md`.**

Nothing in this text is about the repository in front of you. It says how to work with subagents, which holds in every repository the owner opens — so the global file is the one home for it, written once and applying everywhere, with no per-repository copies to drift apart. That is the argument this package makes about `AGENTS.md` itself, applied one level up.

That file is `~/.agents/AGENTS.md`. It loads *alongside* a repository's `AGENTS.md` rather than instead of it, through the harness's own user-scope file, as step 4 of the skill says.

Offer this repository's `AGENTS.md` as the alternative, and name what each one buys:

| Destination | Reaches | Costs |
| --- | --- | --- |
| the owner's global file | every repository they open, themselves only | one copy, and nothing to keep in step |
| this repository's `AGENTS.md` | everyone who clones it, and any agent CI runs | a copy per repository, and a second copy in context for anyone who already has it globally |

The project file is the right pick for one reason and it is worth stating: a team's agents read the repository, not the maintainer's home directory. Where the owner wants the guidance to reach contributors, `AGENTS.md` is the only lever, and the duplicate copy is what that costs.

This skill writes the root `AGENTS.md` and nothing else, so a global placement is **handed over, not made**: give the text and the path, say it goes at the end of that file, and stop there.

## Do not edit it

The wording is fixed. In particular, do not add model names, tiers, or a table of models — the
section is written to stay correct as model lineups change, and naming one breaks that. Offer it
as written or not at all.

If the text is ever revised, the same change must do two things:

- append the outgoing wording to `delegation.history.md`, newest first, exactly as it was offered;
- add scenarios for the **shape of that revision** — which sentences the new text rewrote, dropped or
  added against the outgoing one — and pass the gate against the new pair.

The comparison in step 3 of the skill is checked against the wordings that exist, not against every revision someone
might one day make. How a sentence-level comparison behaves depends on how the two texts differ, so a
revision is the moment its behaviour is known and the moment it is verified.

Where the owner picks this repository over their global file, place it at the end of their prose, outside the `buddy-agent-harness` managed region.
