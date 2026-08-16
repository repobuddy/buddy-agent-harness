---
title: Agent Configuration Best Practices
description: Practices that apply across AGENTS.md, skills, and harness bridges, starting with the cost of every file an agent has to go and open.
---

The pages in this section cover what each format is and how the harnesses differ. This one covers what holds across all of them.

## Every hop is a chance to miss

Agent configuration is spread across files by design. `AGENTS.md` links to deeper documentation, a `SKILL.md` body points at `references/`, a monorepo carries a nested `AGENTS.md` per package. Splitting is what keeps any single file small enough to be worth loading.

The cost is that **an instruction the agent has to go and fetch is less reliable than one already in front of it.**

Following a link is a decision the agent makes, and it can decline in more than one way: skipping the read, opening the file and not acting on what it says, or judging that the calling document already told it enough. None of those raise an error, and none are visible in the output. Each additional file in a chain is another independent opportunity for one of them, so reliability drops off faster than the number of files suggests.

This is why a **routing file is the worst kind to keep**. A file that exists only to point at other files spends a whole hop without contributing an instruction, and it is the hop most likely to be skipped, because its content reads as navigation rather than substance. Fold the routing table into the document that would have linked to it, and name each destination directly.

## Mechanical hops are free; model-decided hops are not

Not all indirection carries the same risk, and the difference is who resolves it.

| Resolved by | Example | Reliability |
| --- | --- | --- |
| the harness | `CLAUDE.md` containing `@AGENTS.md` | deterministic: the import is expanded before the model sees it |
| the filesystem | `.claude/skills` symlinked to `.agents/skills` | deterministic: one directory, two names |
| the model | "see `references/detection.md`" | a judgment call, made fresh each time |

Only the third kind is lossy, and it is the only kind worth counting. This is why a one-line `CLAUDE.md` that imports `AGENTS.md` is not a hop in the sense that matters, while a one-line document that *tells* the agent to go read `AGENTS.md` is.

Prefer mechanical indirection wherever a harness offers it. Where it does not, shorten the chain rather than trusting the link.

## Depth is not the same as distance

Directory nesting is free. What counts is how many files the agent opens in sequence.

`references/harnesses/claude-code.md` linked directly from a skill body is one hop. A flat `references/claude-code.md` reached through a routing file is two, despite the shallower path. Organize files for the humans maintaining them, and count hops for the agents reading them.

The [Agent Skills specification](https://agentskills.io/specification) says to "keep file references one level deep from `SKILL.md`" and then glosses it as "avoid deeply nested reference chains." Read on its own the first half sounds like a ban on subdirectories; the second half says the subject is chains. Layout itself is explicitly unconstrained, and no validator enforces either reading.

## Say what to do, not only what not to

An instruction that forbids something without naming the alternative leaves the agent to search for one, which costs more than the prohibition saved. "Never edit `.claude/skills/`" invites exploration; "skills are canonical in `.agents/skills/`, so edit them there" ends it.

The same holds for warnings about paths. A caution about a file that does not exist in this repository teaches the agent to discount the surrounding text, so generated notes should name only what was actually created.

## Duplication is sometimes cheaper than a hop

When one short rule is needed on both sides of a branch, restating it in each destination usually beats routing both through a shared file. Two copies of a sentence cost less than a fetch that may not happen, and both copies are visible to whoever edits either file.

This cuts against the usual rule that a fact should have exactly one home, and the trade is only worth making for short, stable statements. A paragraph that would need to stay in sync across files is a sign it belongs in the parent document instead.

## In short

- Count model-decided hops. Harness imports and symlinks are not hops.
- Delete routers. Move the routing table up and link each destination directly.
- Nest directories freely; it is sequence, not depth, that costs.
- Pair every prohibition with the action that replaces it.
- Prefer a duplicated sentence over a fetch taken to retrieve one.
