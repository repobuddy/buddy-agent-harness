---
name: doctor
description: Use this skill when a repository loads no project skills, when skills are missing after a clone, or when checking whether the agent configuration bridges into .claude/skills and the other harness directories still resolve.
---

<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Harness Doctor

`.agents/skills` is the canonical skill directory. Harnesses that cannot read it — Claude Code and Gemini CLI — get a bridge pointing at it, normally a directory symlink. A bridge that stops resolving is silent: the harness finds nothing and loads zero project skills, with no warning anywhere.

Diagnose it:

```sh
node scripts/doctor.mjs
```

That path is relative to this skill's own directory. The launcher runs the CLI that shipped beside it against the current working directory, so nothing is downloaded. Fall back to `npx -y buddy-agent-harness@^0.5.0 doctor` when the launcher cannot be resolved or run, which is the case when the plugin was installed from git rather than npm and its dependencies were never installed.

The command is read-only. It never repairs anything, so it is safe to run at any point, including from a session-start hook.

## Reading the report

`bridges` lists every bridge `init` would create for this repository, each with a `status` of `ok`, `missing`, `degraded`, `stale`, or `diverged`. `findings` explains each problem and `help` names its repair. Apply the repair from the table below, then re-run `doctor`.

`help` names the `init` command for a person at a shell. Do not run it yourself. Rebuilding a bridge can move skills a user wrote, and that judgment belongs to the `init` skill — hand the repair to `/buddy-agent-harness:init` instead.

When every bridge resolves, `findings` says so outright rather than being empty.

The default output is TOON, which is what you parse. Add `--format text` when you need to show the same report to a person, or `--format json`.

## Findings and their repairs

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

## The Windows case

The common failure is `degraded`. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with `core.symlinks`, which its installer leaves off. With `core.symlinks=false` git does not error — it writes the symlink out as a regular file whose contents are the target path. `/buddy-agent-harness:init --copy --force` rebuilds the bridges as real directories on that machine.

A copy is a snapshot rather than a live projection, and an agent that edits a skill through it writes into the copy instead of into `.agents/skills`. That is what the `diverged` findings catch.

## Rules

- Never repair a `diverged-both` or `diverged-unknown` bridge by re-running `init`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at `.agents/skills/<name>/SKILL.md`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to `.gitignore`. An untracked bridge swallows a real edit silently.
