---
title: 'Skill: doctor'
description: What the doctor skill checks, including the instruction bridges, how an agent reads the report, and the repairs it refuses to automate.
---

The `doctor` skill checks whether a repository's harness bridges still resolve — its skills into `.agents/skills`, and its instructions into `AGENTS.md`. A bridge that has stopped resolving is silent: the harness finds nothing and loads zero project skills, or reads none of the repository's instructions, with no warning anywhere. Reach for this skill when either has happened, or before you conclude a skill or an instruction is being ignored.

The command it runs writes nothing. A repair does write, so the skill names the `init` command it is about to run and runs that as a separate step.

## Run it

In Claude Code:

```text
/buddy-agent-harness:doctor
```

The skill also loads on its own when an agent hits the symptom, so "my skills are missing after cloning this repo" or "Claude is ignoring our AGENTS.md" is enough to reach it.

Its one action is to run `buddy-agent-harness doctor` and act on the report. If you would rather run that yourself, the plugin is not a prerequisite: see the [CLI reference](/cli/doctor/#no-install-needed).

The skill runs the copy of the CLI that shipped with it, through a launcher in its own `scripts/` directory, so an installed plugin downloads nothing. It falls back to `npx`, pinned to the version it shipped with, when that path cannot be resolved. [Skill Scripts](/agent-configuration/skill-scripts/) covers the pattern, and [Introduction](/getting-started/introduction/#install) covers why the plugin wants an npm-backed install.

## What it checks

It checks every bridge [`init`](/skills/init/) would create for this repository. Both read the same registry, so the two cannot describe different bridge sets.

The report has two of them. `bridges` covers the skills projections into `.agents/skills`; `instructions` covers the files that let a harness read `AGENTS.md` — a `CLAUDE.md` holding `@AGENTS.md`, one beside every nested `AGENTS.md`, and the `context.fileName` entry in `.gemini/settings.json`. They are separate sections because their statuses and their repairs have nothing in common; the [CLI reference](/cli/doctor/#instruction-bridges) has the reasoning.

For each one the report gives a `kind` (what is on disk now) and a `status` (whether it works). A `findings` entry explains each problem and a `help` row carries its repair in two columns: a `command` that runs verbatim and completes it, and an `instruction` in the imperative. An empty `command` means no single invocation does the job — act on the instruction. Apply the repair, then run `doctor` again.

Every instruction repair is `/buddy-agent-harness:init` rather than a command. Those files carry prose someone wrote, and restoring a bridge without discarding what displaced it is the `init` skill's judgment.

A healthy repository says so outright instead of printing an empty section, so an agent does not re-run with other flags to check whether "nothing" meant "nothing wrong".

The report is TOON by default, which is what the agent parses. Ask for `--format text` when you want to read it yourself.

Statuses, findings, and their repairs are tabulated in the [CLI reference](/cli/doctor/). The skill body carries the same table, generated from the source the command prints from, so the guidance an agent follows cannot drift from what the command reports.

## The failure it was built for

A committed symlink such as `.claude/skills` → `../.agents/skills` breaks on a native Windows checkout, where git writes it out as a regular file instead. That is the `degraded` status, and the [CLI reference](/cli/doctor/#why-it-exists) explains why git does it silently.

The repair there is `init --copy --force` rather than recreating the link. Creating a link is the operation that already failed on that machine.

## Configuration findings

Beyond the bridges, `doctor` reports configuration that is present and **wrong**: a superseded harness name still projected, a `.gitignore` rule swallowing a bridge, an `AGENTS.local.md` no harness reads, and a skill whose frontmatter makes every harness skip it. Each resolves fine and is still wrong.

Those four go to the [`repair` skill](/skills/repair/), which offers each correction with its before and after and writes only what you approve. Everything else `doctor` finds goes to [`init`](/skills/init/).

## MCP findings

Where the repository keeps a [golden MCP server set](/agent-configuration/mcp-servers/), the command also reports how each harness's own MCP config has drifted from it, and it reports a literal credential in any MCP file whether or not a golden set exists. Every `mcp-*` repair is carried in the finding itself, and none of them is automated: the command detects, and the skill acts on the report the same way it does everywhere else. Two rules bind the skill here — never merge a `mcp-diverged-both` conflict automatically, and never read a reported secret's value back into the conversation; the report deliberately does not contain it. [MCP Servers](/agent-configuration/mcp-servers/) is the home for the golden set, the per-harness files, and the findings.

## What it will not do

There is no `--fix`, and the skill does not invent one. Three rules hold whatever you ask for mid-run:

- Never repair a `diverged-both` or `diverged-unknown` bridge by re-running `init`. Both sides moved, so rebuilding discards one of the edits. Reconcile the two directories first.
- Edit skills at `.agents/skills/<name>/SKILL.md`. Editing through a bridge is only safe when that bridge is a symlink, because a copy takes the write and keeps it.
- Never add a bridge to `.gitignore`. An untracked bridge swallows a real edit silently.
- Never repair an `unbridged` instruction file by replacing it. Something displaced the import, and it may be the only copy of that content.

Because it writes nothing and always exits `0`, the command is safe to wire into a session-start hook. Why the exit code stays `0`, and why divergence gets a direction rather than a diff, are covered in the [CLI reference](/cli/doctor/).
