---
name: doctor
description: Use this skill when a repository loads no project skills, when skills are missing after a clone, when a harness appears to be ignoring AGENTS.md, or when checking whether the agent configuration bridges into .claude/skills, CLAUDE.md, and the other harness files still resolve.
---

<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Harness Doctor

A repository keeps one canonical configuration: `.agents/skills` for its skills and `AGENTS.md` for its instructions. Harnesses that cannot read those — Claude Code and Gemini CLI — get bridges pointing at them. A bridge that stops resolving is silent: the harness finds nothing and loads zero project skills, with no warning anywhere. An instruction bridge fails the same way and costs more, because the harness then reads none of the repository's instructions at all.

Diagnose it:

```sh
node scripts/doctor.mjs
```

That path is relative to this skill's own directory. The launcher runs the CLI that shipped beside it against the current working directory, so nothing is downloaded. Fall back to `npx -y buddy-agent-harness@^0.5.0 doctor` when the launcher cannot be resolved or run, which is the case when the plugin was installed from git rather than npm and its dependencies were never installed.

The command is read-only. It never repairs anything, so it is safe to run at any point, including from a session-start hook.

## Reading the report

`bridges` lists every skills bridge `init` would create for this repository, each with a `status` of `ok`, `missing`, `degraded`, `stale`, or `diverged`.

`instructions` lists every instruction bridge into `AGENTS.md`, with a `status` of `ok`, `missing`, `unbridged`, or `unreadable`. They are a separate section because nothing about them is shared: a different `kind`, a different status vocabulary, and a repair that is never a command.

`findings` explains each problem from either section and `help` names its repair. Apply the repair from the tables below, then re-run `doctor`.

Do not run an `init` command yourself. Rebuilding a skills bridge can move skills a user wrote, and rewriting an instruction file touches prose a person authored — both are the `init` skill's judgment, so hand the repair to `/buddy-agent-harness:init` instead. A `help` line naming that skill has no shell equivalent at all.

When every bridge resolves, `findings` says so outright rather than being empty.

The default output is TOON, which is what you parse. Add `--format text` when you need to show the same report to a person, or `--format json`.

## Skills bridge findings

| Finding | What it means | Repair |
| --- | --- | --- |
| `no-canonical` | the canonical skill directory does not exist, so no bridge can resolve | run `/buddy-agent-harness:init`, which creates `.agents/skills` and the bridges |
| `missing` | no bridge at this path — the harness sees zero project skills | run `/buddy-agent-harness:init` |
| `degraded` | expected a directory but found a regular file — checkout without core.symlinks | run `/buddy-agent-harness:init --copy --force` |
| `stale` | symlink does not resolve to .agents/skills | run `/buddy-agent-harness:init --force` |
| `diverged-bridge` | only the bridge changed since the two last agreed — an agent wrote through the copy | replace .agents/skills with <path> to keep the newer edit, then run `/buddy-agent-harness:init --force` |
| `diverged-canonical` | only .agents/skills changed since the two last agreed — the copy is stale | run `/buddy-agent-harness:init --copy --force` |
| `diverged-both` | both sides changed since they last agreed — rebuilding would discard one of them | run `git diff --no-index .agents/skills <path>` and reconcile by hand |
| `diverged-unknown` | contents differ and no commit where they agreed was found — which side moved is unknown | run `git diff --no-index .agents/skills <path>` and reconcile by hand |
| `unpinned-copy` | tracked copy without the skip-worktree bit — the tree is dirty with content that must not be committed | run `git ls-files -z <path> \| xargs -0 git update-index --skip-worktree` |

Substitute the reported bridge path for `<path>`.

## Instruction bridge findings

| Finding | What it means | Repair |
| --- | --- | --- |
| `no-instructions` | no AGENTS.md at the repository root, so every instruction bridge points at nothing | run `/buddy-agent-harness:init`, which derives AGENTS.md and the bridges to it |
| `instructions-missing` | no instruction bridge at this path — the harness reads none of AGENTS.md | run `/buddy-agent-harness:init` |
| `instructions-unbridged` | the file is present but names AGENTS.md nowhere — the harness reads none of it | run `/buddy-agent-harness:init`, which adds the bridge without discarding what the file already says |
| `instructions-unreadable` | the settings file does not parse, so the harness reads none of it | fix the JSON by hand, then run `/buddy-agent-harness:init` |

`unbridged` is the one to read carefully. The file is there and looks fine, and it names `AGENTS.md` nowhere — a `CLAUDE.md` someone overwrote with real content, or a `.gemini/settings.json` another tool rewrote without `AGENTS.md` in `context.fileName`. Never fix it by replacing the file: the content that displaced the bridge may be the only copy of something.

An instruction bridge is reported per file, so a monorepo gets one row per `AGENTS.md` in the tree. Each nested `AGENTS.md` needs its own stub — an import bridges the file beside it and nothing deeper.

## The Windows case

The common failure is `degraded`. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with `core.symlinks`, which its installer leaves off. With `core.symlinks=false` git does not error — it writes the symlink out as a regular file whose contents are the target path. `/buddy-agent-harness:init --copy --force` rebuilds the bridges as real directories on that machine.

A copy is a snapshot rather than a live projection, and an agent that edits a skill through it writes into the copy instead of into `.agents/skills`. That is what the `diverged` findings catch.

## Rules

- Never repair a `diverged-both` or `diverged-unknown` bridge by re-running `init`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at `.agents/skills/<name>/SKILL.md`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to `.gitignore`. An untracked bridge swallows a real edit silently.
- Write instructions in `AGENTS.md`, never in `CLAUDE.md`. A bridge file holds the import and any harness-specific notes; content written there reaches one harness and drifts from the canonical file.
