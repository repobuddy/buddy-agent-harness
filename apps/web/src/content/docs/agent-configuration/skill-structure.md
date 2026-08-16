---
title: Structuring a Skill
description: How to split a skill across SKILL.md and references/ so an agent actually reads the part it needs.
---

A skill that contains the right instruction still fails if the agent never reaches it. Splitting content across files is what makes progressive disclosure work, and it is also the most common way a skill quietly stops working — the agent activates it, reads the body, and never opens the file holding the actual answer.

## Every hop is a chance to miss

The [specification](https://agentskills.io/specification) states the rule and then explains it:

> Keep file references one level deep from `SKILL.md`. Avoid deeply nested reference chains.

The first sentence reads as a ban on subdirectories. The second is the real constraint: what matters is the length of the *chain*, not the depth of the path. A file two directories down that `SKILL.md` links to directly is one hop. A flat file reached through a routing file is two.

The reason to care is behavioral rather than mechanical. Following a link is a decision the agent makes each time, and it can decline in more than one way — skipping the read, reading the file and not acting on it, or deciding the body already told it enough. None of those raise an error. Each additional hop is another independent opportunity for one of them, so reliability falls off faster than the file count suggests.

That makes routing files a bad trade. A router that exists only to point at other files spends a full hop without adding an instruction, and it is the hop most likely to be skipped, because its content looks like navigation rather than substance.

## Put the routing table in the body

If the skill body has to choose between several reference files, put the choice in `SKILL.md` and name each target directly:

```markdown
| Harness | Read |
| --- | --- |
| Claude Code | `references/harnesses/claude-code.md` |
| Gemini CLI | `references/harnesses/gemini-cli.md` |
```

Subdirectories are fine — grouping six harness files under `references/harnesses/` costs nothing, because the hop count is set by how many files the agent opens in sequence, not by how deep they sit. What costs something is an intermediate file between the body and the payload.

## What belongs in the body

`SKILL.md` loads in full on activation, so its budget is real but generous — the specification recommends staying under 500 lines and under roughly 5000 tokens. Reference files load only when the agent opens them.

Content earns a place in the body when the agent needs it to decide *what to do next*: the phase order, the routing table, the rules that apply regardless of which path it takes. Content belongs in `references/` when it is payload for one branch — the detail for a single harness, a format specification, a table consulted only in one case.

The failure mode runs in both directions. A body that inlines every reference file is loaded in full every time the skill activates, most of it irrelevant to the task at hand. A body that pushes out its own decision rules leaves the agent choosing between files without knowing what distinguishes them.

## Duplication is sometimes cheaper than a hop

When one short rule is needed on both sides of a branch, restating it in each reference file is usually better than routing through a shared one. Two copies of a sentence cost less than a hop that may not happen, and the copies are visible to anyone editing either file.

This trades against the usual rule that a fact should have one home, and the trade is worth making only for short, stable statements. A paragraph that needs to stay in sync across files is a signal it belongs in the body instead.

## In short

- Count hops from `SKILL.md`, not directory levels. Subdirectories are free; intermediate files are not.
- Delete routers. Move the routing table into the body and link each target directly.
- Keep decision-making content in the body, payload in `references/`.
- Prefer a duplicated sentence over a hop taken to fetch one.
