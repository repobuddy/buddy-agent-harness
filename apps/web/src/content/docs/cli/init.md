---
title: 'CLI: init'
description: 'CLI reference for buddy-agent-harness init: flags, output, existing copies, and conflict behavior.'
---

```sh
buddy-agent-harness init [--root <directory>] [--harness <names>] [--copy] [--force] [--format toon|json|text]
```

The CLI performs the linking step only. Consolidating existing configuration and writing the instruction bridges is the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/)'s job, because both need judgment about user-authored content. Run the CLI directly on a repository that is already consolidated.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Selects the directory to initialize. The product direction is repository-root-only configuration. |
| `--harness <names>` | Comma-separated harnesses to enable in addition to Claude Code and Cursor, such as `codex,gemini-cli`. |
| `--copy` | Copy the canonical skills directory when links are unavailable. |
| `--force` | Replace a conflicting target after the command has identified it, or an existing copy instead of syncing it. Name the targets, comma-separated, such as `--force .claude/skills`; given alone it replaces every one. |
| `--format toon\|json\|text` | Choose token-efficient TOON output (default), JSON, or a human-readable text report. |

## Output

The result reports the selected root, the canonical skill count, the count of [references](/agent-configuration/references/) the project tier holds (`<root>/.agents/references/`, created when absent), whether copying was requested, and three harness lists:

| Field | Meaning |
| --- | --- |
| `harnesses` | Every enabled harness |
| `native` | Harnesses that read `.agents/skills` directly, so nothing was written for them |
| `linked` | Harnesses that received a projection |

The `native` / `linked` split is the useful part: only `linked` is a real diff. A `deprecated` field reports any enabled deprecated harness name, and `skipped` the harnesses whose conflicting target a named `--force` left alone.

Two more fields report the sync of an [existing copy](#existing-copies), in the shape [`sync`](/cli/sync/#output) gives them:

| Field | Meaning |
| --- | --- |
| `written` | Each file the sync wrote, with the side whose version it took |
| `left` | Each file left as it is on both sides, waiting for a pick through `sync --resolve` |

Nothing is written to record the run. The enabled set is derived from detection every time, so the result above is the only report. See [Configuration Layout](/reference/configuration-layout/#no-configuration-record).

## Projections

A projection is a single directory-level symlink from the harness path to `.agents/skills`, so a skill added later appears in every enabled harness without re-running the command. Only Claude Code needs one; see [Harness Differences](/agent-configuration/harness-differences/) for the per-harness paths.

`--copy` is reserved for environments where links are unavailable. A copy is a snapshot rather than a live projection, so it needs a [sync](/cli/sync/) after every skill change.

A copy the command writes at a path git tracks gets [copy protection](/cli/doctor/#the-skip-worktree-bit), so it never shows as uncommitted changes and git adds none of its files. A copy at an untracked path, or outside a Git repository, gets none.

## Existing copies

A directory already at a projection path is an existing copy, not a conflict. The command syncs it with `.agents/skills` file by file, exactly as [`sync`](/cli/sync/) does, whether or not `--copy` was passed:

- A copy that already holds the same files is kept as it is.
- A file only one side changed since the two last agreed takes that side's version on both sides, so an edit made through the copy reaches `.agents/skills`.
- A file both sides changed, or every differing file when no last agreement exists, is left as it is and listed in `left`. `init` takes no picks; pass them to [`sync --resolve`](/cli/sync/#picking-a-side).

A copy it synced or kept at a tracked path gets copy protection too, even when the sync wrote nothing into it.

`--force` naming the copy's path, or given alone, replaces the copy with a fresh projection instead of syncing it, and leaves `.agents/skills` as it was. That discards every edit made through the copy.

When `.agents/skills` does not exist while an existing copy does, the command writes nothing and fails with `canonical-missing`: an absent directory is not read as every skill deleted. Move the skills into `.agents/skills/` first, or pass `--force` to replace the copy.

## Conflicts

The command checks every target before changing any of them. Without `--force`, conflicts stop the command and leave all targets unchanged. A target that appears during a failed link attempt is preserved rather than overwritten.

A conflicting target is anything at a projection path other than a link into `.agents/skills` or an existing copy: a regular file, or a link to somewhere else. A pre-existing harness skills directory is an existing copy, which the command syncs; when it and `.agents/skills` were never committed holding the same files, the sync leaves every differing file for a pick. Move those skills into `.agents/skills/` first (see [Migrating Existing Configuration](/getting-started/migrating/)) rather than discarding them with `--force`.
