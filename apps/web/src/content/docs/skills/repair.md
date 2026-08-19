---
title: 'Skill: repair'
description: What the repair skill corrects, why doctor detects and repair repairs, and the line it will not cross.
---

The `repair` skill corrects agent configuration a repository already has that is **wrong or outdated**.

The other three skills each refuse this work on purpose. [`init`](/skills/init/) consolidates what you already wrote and invents nothing, so it never clobbers a file you authored. [`enhance`](/skills/enhance/) offers guidance the repository is **missing**. [`doctor`](/skills/doctor/) never writes, which is what makes it safe to run from a session-start hook. Configuration that is present but wrong falls between all three.

## `doctor` detects, `repair` repairs

The skill looks for nothing itself. It runs the `doctor` command, reads the findings, and corrects the ones that are its own. It knows which those are by the finding's `problem` name: the skill keeps one correction per fault it repairs, and a `problem` it holds no correction for is not one it can repair. So a finding added to `doctor` tomorrow is reported and handed on rather than guessed at.

That split is the design, not an implementation detail. Detection has one home, so the two halves cannot drift apart, and the finding set can grow without touching the skill. It is also what keeps `doctor` read-only: adding a repair flag there would forfeit hook-safety for every caller, and the bridge repairs worth automating are already expressible with `init` flags, so the flag would duplicate `init` rather than add anything.

## Run it

In Claude Code:

```text
/buddy-agent-harness:repair
```

Any agent that reads `.agents/skills/` can be asked in prose instead, from the repository root:

```text
Our agent config is out of date — check it and fix what's wrong.
```

## What it corrects

`doctor` reports several families of finding, and only one is the skill's.

**Bridge and instruction findings** — the `missing` / `degraded` / `stale` / `diverged-*` / `unpinned-copy` set, and the `instructions-*` set — are about a bridge, whether it stopped resolving or was never completed. Most go to [`init`](/skills/init/), which is what builds every bridge in the first place. A few go to nobody: a divergence with edits on both sides, one where no baseline says which side moved, and a bridge whose only fault is the git index. Rebuilding those would destroy work rather than repair it, so they are yours to settle by hand. Either way the skill reports them and hands them on.

The instruction bridges are worth a note, because they look like configuration faults. A `CLAUDE.md` that names `AGENTS.md` nowhere is a bridge that was never finished, and `init` writes that import itself. `init` also writes the `CLAUDE.md` stub *without* asking, where `repair` asks before every write — and one line cannot have two homes and two contradictory approval rules.

**MCP findings** — the `mcp-*` set, reported when a golden MCP server set and a harness's copy of it disagree — belong to nobody. Which side is right is a judgment about servers rather than a correction to a file, so `doctor` states each repair in full and the skill passes it to you unchanged.

**Configuration findings** are its own:

| Finding | What is wrong |
| --- | --- |
| `deprecated-harness` | a skills projection under a harness name that has been superseded. The replacement reads `.agents/skills` natively and needs no projection, so the correction removes the old one rather than renaming it |
| `ignored-bridge` | a `.gitignore` rule matches a bridge, usually a blanket `.claude/`. An untracked bridge swallows a real edit silently |
| `unread-local-override` | an `AGENTS.local.md`. The standard defines no local-override file, so no harness reads it and everything in it is invisible |
| `unloadable-skill` | frontmatter that does not parse, or no `description`. Those are the two faults that make a harness skip a skill outright — a `name` that mismatches its directory is only a warning, and is deliberately not reported |

## The line it will not cross

The skill corrects what the **tooling** decides is wrong, never what your repository means.

The discriminator is the one `init` already applies: content that would stop being true if the tool's output were removed is non-material, and non-material content is all the skill may correct. A statement about how your repository is worked in stays yours, even when it is out of date. The skill reports it and offers no write.

The clearest case is `unloadable-skill`. A `description` broken by an unquoted colon is a quoting fault, and quoting it changes nothing about what the skill claims — so the skill corrects it. A `description` that is **missing** cannot be written without asserting what a skill you did not author actually does, and that claim holds whether or not the tool ever ran. The skill reports it and asks you.

## How it offers

You see the file as it stands and as it would read. Not a summary: the actual before and after, so you are reading the change rather than a description of it.

Where more than one correction is valid, the skill presents the options and asks. `unread-local-override` is always that case — the file might be personal notes bound for `CLAUDE.local.md`, project guidance bound for `AGENTS.md`, or dead. Those options come from the skill's own reference rather than from the report: `doctor` names one repair per finding and has not read what the file contains.

After writing what you approved, it runs `doctor` again. A correction can fail to hold: a second `.gitignore` rule matching the same path, a frontmatter fix that leaves another fault behind. Re-running is how the skill knows, and a finding that survives is reported as still open rather than as landed.

Every run reports, whichever way it went — one row per finding, naming what was wrong and what happened to it. A run that finds nothing still reports, because "nothing found" is otherwise indistinguishable from not having looked.

## Rules it follows

These hold regardless of what you ask for mid-run:

- Never write without approval. There is no flag that skips it.
- Never detect. `doctor` owns detection; a check here would be a second home for it.
- Never rebuild a bridge. That is `doctor`'s diagnosis and [`init`](/skills/init/)'s repair.
- Never invent an owner. A finding whose repair names no skill is work for a person, and the skill says so rather than picking one.
- Never consolidate. Moving content into `AGENTS.md` is `init`'s.
- Local agent configuration only: no workflows, repository settings, or unrelated project files. A retired harness name in a workflow file is not the skill's to rename.
