---
name: doctor
description: Use this skill when a repository loads no project skills, when skills are missing after a clone, when a harness appears to be ignoring AGENTS.md, or when checking whether the agent configuration bridges into .claude/skills, CLAUDE.md, and the other harness files still resolve.
---

<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Harness Doctor

A repository keeps one canonical configuration: `.agents/skills` for its skills and `AGENTS.md` for its instructions. Harnesses that cannot read those get bridges pointing at them: Claude Code needs both, and Gemini CLI needs the instruction bridge only — it reads `.agents/skills` itself. A bridge that stops resolving is silent: the harness finds nothing and loads zero project skills, with no warning anywhere. An instruction bridge fails the same way and costs more, because the harness then reads none of the repository's instructions at all.

Diagnose it:

```sh
node scripts/doctor.mjs
```

That path is relative to this skill's own directory. The launcher runs the CLI that shipped beside it against the current working directory, so nothing is downloaded. Fall back to `npx -y buddy-agent-harness@^0.6.0 doctor` when the launcher cannot be resolved or run, which is the case when the plugin was installed from git rather than npm and its dependencies were never installed.

The command is read-only. It never repairs anything, so it is safe to run at any point, including from a session-start hook.

## Reading the report

`bridges` lists every skills bridge `init` would create for this repository, each with a `status` of `ok`, `missing`, `degraded`, `stale`, or `diverged`.

`instructions` lists every instruction bridge into `AGENTS.md`, with a `status` of `ok`, `missing`, `unbridged`, or `unreadable`. They are a separate section because nothing about them is shared: a different `kind`, a different status vocabulary, and a repair that is never a command.

`findings` explains each problem and carries more than the two sections above: the configuration and MCP findings have no section of their own, because they are about files rather than about bridges. `help` carries each repair, one row per distinct repair, with two columns:

- `command` — a shell invocation that, run exactly as given, **completes** the repair.
- `instruction` — the same repair in the imperative, always present and complete on its own.

`command` is empty whenever no single invocation does the job, and that emptiness is the signal: act on `instruction` and do not assemble a command out of it. A runnable invocation quoted *inside* an `instruction` is not the repair either — `diverged-both` names `git diff --no-index` because the diff shows you what differs, not because running it reconciles anything. Apply the repair, then re-run `doctor`.

Nothing in `help` is wrapped. An earlier version prefixed every repair with `Run`, which read as an instruction to paste prose into a shell.

Do not run an `init` command yourself. Rebuilding a skills bridge can move skills a user wrote, and rewriting an instruction file touches prose a person authored — both are the `init` skill's judgment, so hand the repair to `/buddy-agent-harness:init` instead. Every such repair carries an empty `command`: a skill invocation has no shell equivalent at all.

When every bridge resolves, `findings` says so outright rather than being empty.

The default output is TOON, which is what you parse. Add `--format text` when you need to show the same report to a person, or `--format json`.

## Where the detail is

Every `problem` name routes to exactly one page. Load the page for the finding in front of you and leave the rest unread — the tables are long, and reading four families to act on one is what this split exists to stop.

| Page | Load it for |
| --- | --- |
| `references/bridges.md` | any `bridges` row that is not `ok` |
| `references/instructions.md` | any `instructions` row that is not `ok` |
| `references/configuration.md` | a finding about the configuration around the bridges rather than a bridge |
| `references/mcp.md` | any finding whose path is an MCP locator — **always** before acting on a credential finding |
| `references/harnesses/<name>.md` | the paths and files one named harness uses |

## Rules

- Never repair a `diverged-both` or `diverged-unknown` bridge by re-running `init`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at `.agents/skills/<name>/SKILL.md`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to `.gitignore`. An untracked bridge swallows a real edit silently.
- Never repeat a value from a file an `mcp-literal-secret` or `mcp-committed-secret` finding points at. The report withheld it on purpose, and quoting it back puts it in the transcript anyway.
- Write instructions in `AGENTS.md`, never in `CLAUDE.md`. A bridge file holds the import and any harness-specific notes; content written there reaches one harness and drifts from the canonical file.
