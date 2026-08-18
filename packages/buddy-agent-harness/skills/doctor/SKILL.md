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

`findings` explains each problem and carries more than the two sections above: the configuration and MCP findings below have no section of their own, because they are about files rather than about bridges. `help` carries each repair, one row per distinct repair, with two columns:

- `command` — a shell invocation that, run exactly as given, **completes** the repair.
- `instruction` — the same repair in the imperative, always present and complete on its own.

`command` is empty whenever no single invocation does the job, and that emptiness is the signal: act on `instruction` and do not assemble a command out of it. A runnable invocation quoted *inside* an `instruction` is not the repair either — `diverged-both` names `git diff --no-index` because the diff shows you what differs, not because running it reconciles anything. Apply the repair, then re-run `doctor`.

Nothing in `help` is wrapped. An earlier version prefixed every repair with `Run`, which read as an instruction to paste prose into a shell.

Do not run an `init` command yourself. Rebuilding a skills bridge can move skills a user wrote, and rewriting an instruction file touches prose a person authored — both are the `init` skill's judgment, so hand the repair to `/buddy-agent-harness:init` instead. Every such repair carries an empty `command`: a skill invocation has no shell equivalent at all.

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

## Configuration findings and their repairs

The bridges resolve, and the configuration around them is still wrong: a superseded harness name, a git-ignored bridge, a local-override file nothing reads, a skill whose frontmatter makes every harness skip it. None of these is an `init` flag — `init` consolidates and creates, and will not correct a file the user already wrote. They go to the `repair` skill, which offers each correction with its before and after and writes only what is approved.

| Finding | What it means | Repair |
| --- | --- | --- |
| `deprecated-harness` | a projection under a harness name that has been superseded — the replacement reads .agents/skills natively and needs no projection at all | run `/buddy-agent-harness:repair` |
| `ignored-bridge` | a .gitignore rule matches this bridge — an untracked bridge swallows a real edit silently | run `/buddy-agent-harness:repair` |
| `unread-local-override` | no harness reads this filename, so everything in it is invisible to every agent | run `/buddy-agent-harness:repair` |
| `unloadable-skill` | frontmatter that does not parse, or no description — either one makes a harness skip the skill outright | run `/buddy-agent-harness:repair` |

`unbridged` is the one to read carefully. The file is there and looks fine, and it names `AGENTS.md` nowhere — a `CLAUDE.md` someone overwrote with real content, or a `.gemini/settings.json` another tool rewrote without `AGENTS.md` in `context.fileName`. Never fix it by replacing the file: the content that displaced the bridge may be the only copy of something.

An instruction bridge is reported per file, so a monorepo gets one row per `AGENTS.md` in the tree. Each nested `AGENTS.md` needs its own stub — an import bridges the file beside it and nothing deeper.

## MCP findings and their repairs

A repository may keep a **golden MCP server set** at `.agents/buddy-agent-harness/mcp.toml` — one canonical entry per server, in the superset of fields the supported hosts accept, written by the user. Where it exists, `doctor` compares it against each harness's own MCP configuration and reports how the two have drifted. **No golden set means no MCP drift findings at all**, and a harness with no MCP file yet has nothing that could have drifted.

Comparison is semantic. Six config keys across three file formats means no two of these files are ever byte-equal, so each side is parsed into one model and the models are compared. A field the golden set leaves unset is never a difference, however a harness fills it in: a host restating its own default and a user's deliberate edit are indistinguishable there, and treating both as changes is what makes a golden set accumulate noise.

Each finding names a **locator**, not a file: `.cursor/mcp.json#servers.linear.command` is the server and field, and that is what you route on.

| Finding | What it means | Repair |
| --- | --- | --- |
| `mcp-golden-unreadable` | the golden MCP set does not parse — the locator gives the line and column, and nothing else can be said about it | fix the TOML at <path> by hand — the reported line and column are all that can be quoted, because the parser's own message repeats the offending line and that line is the one holding the credential |
| `mcp-target-unreadable` | this harness config does not parse, so the harness starts none of its servers and nothing in it can be compared | fix the syntax of <path> by hand |
| `mcp-unprojected` | the golden set declares this server and the harness config does not carry it | add the server at <path> to that file from its golden entry, or drop it from the golden set |
| `mcp-undeclared` | the harness config carries this server and the golden set does not declare it | copy the server at <path> into .agents/buddy-agent-harness/mcp.toml, refusing any literal credential it carries, or drop it from <path> |
| `mcp-diverged-target` | only the harness config changed since the two last agreed — the edit was made through the copy | reconcile the value at <path> back into .agents/buddy-agent-harness/mcp.toml, field by field |
| `mcp-diverged-golden` | only the golden set changed since the two last agreed — the harness copy is stale | update <path> from the golden entry |
| `mcp-diverged-both` | both sides changed since they last agreed — merging either way would discard the other | reconcile <path> against .agents/buddy-agent-harness/mcp.toml by hand — never merge a three-way conflict automatically |
| `mcp-diverged-unknown` | the two disagree and no baseline says which side moved — neither history nor a last-projected record covers this server | compare <path> against .agents/buddy-agent-harness/mcp.toml by hand |
| `mcp-literal-secret` | a credential-bearing field holds a literal rather than a reference to an environment variable | move the value at <path> into an environment variable and reference it — read the value from the file, never from this report, and never repeat it back |
| `mcp-committed-secret` | a credential-bearing field holds a literal in a git-tracked file — the credential is committed, and moving it does not un-commit it | rotate the credential behind <path> at its issuer, then reference it from an environment variable — it is in the repository's history, so moving it is not enough |

### Credentials

The two secret findings are the ones to handle carefully.

- **The report never contains the value.** It gives you the locator and stops. Read the value out of the file named in the locator, and do not repeat it into your reply, into a commit message, or into any other file. There is no truncated preview to work from because a truncated credential is a leaked credential in the same transcript.
- **`mcp-committed-secret` is not `mcp-literal-secret` with worse wording.** The file is tracked, so the value is in the repository's history and every clone already has it. Moving it into an environment variable fixes the working tree and changes nothing about that. Rotate it at its issuer first.
- **A reference passes.** `${LINEAR_TOKEN}` and `Bearer ${LINEAR_TOKEN}` are the documented ways to write these fields and are never reported. The test is that shape, not how random the value looks.
- **An unreadable golden set is reported by position only.** The parser's own message quotes the line it failed on, and in this file that line is the one holding the credential — so neither the message nor the offending line is ever carried into the report. Open the file at the reported line and column.

## The Windows case

The common failure is `degraded`. Creating a symlink on Windows needs a privilege most accounts do not have, and Git for Windows gates it separately with `core.symlinks`, which its installer leaves off. With `core.symlinks=false` git does not error — it writes the symlink out as a regular file whose contents are the target path. `/buddy-agent-harness:init --copy --force` rebuilds the bridges as real directories on that machine.

A copy is a snapshot rather than a live projection, and an agent that edits a skill through it writes into the copy instead of into `.agents/skills`. That is what the `diverged` findings catch.

## Rules

- Never repair a `diverged-both` or `diverged-unknown` bridge by re-running `init`. Rebuilding overwrites whichever side holds the newer edit. Reconcile the two directories first.
- Edit skills at `.agents/skills/<name>/SKILL.md`. Editing through a bridge is only safe when that bridge is a symlink.
- Do not add bridges to `.gitignore`. An untracked bridge swallows a real edit silently.
- Never repeat a value from a file an `mcp-literal-secret` or `mcp-committed-secret` finding points at. The report withheld it on purpose, and quoting it back puts it in the transcript anyway.
- Write instructions in `AGENTS.md`, never in `CLAUDE.md`. A bridge file holds the import and any harness-specific notes; content written there reaches one harness and drifts from the canonical file.
