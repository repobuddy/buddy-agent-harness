---
title: 'CLI: init'
description: 'CLI reference for buddy-agent-harness init: flags, output, and conflict behavior.'
---

```sh
buddy-agent-harness init [--root <directory>] [--harness <names>] [--copy] [--force] [--format toon|json|text]
```

The CLI performs the linking step only. Consolidating existing configuration and writing the instruction bridges is the [`init` skill](/skills/init/)'s job, because both need judgment about user-authored content. Run the CLI directly on a repository that is already consolidated.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Selects the directory to initialize. The product direction is repository-root-only configuration. |
| `--harness <names>` | Comma-separated harnesses to enable in addition to Claude Code and Cursor, such as `codex,gemini-cli`. |
| `--copy` | Copy the canonical skills directory when links are unavailable. |
| `--force` | Replace a conflicting target after the command has identified it. |
| `--format toon\|json\|text` | Choose token-efficient TOON output (default), JSON, or a human-readable text report. |

## Output

The result reports the selected root, the canonical skill count, whether copying was requested, and three harness lists:

| Field | Meaning |
| --- | --- |
| `harnesses` | Every enabled harness |
| `native` | Harnesses that read `.agents/skills` directly, so nothing was written for them |
| `linked` | Harnesses that received a projection |

The `native` / `linked` split is the useful part: only `linked` is a real diff. A `deprecated` field reports any enabled deprecated harness name.

Nothing is written to record the run. The enabled set is derived from detection every time, so the result above is the only report. See [Configuration Layout](/reference/configuration-layout/#no-configuration-record).

## Projections

A projection is a single directory-level symlink from the harness path to `.agents/skills`, so a skill added later appears in every enabled harness without re-running the command. Only Claude Code and Gemini CLI need one; see [Harness Differences](/agent-configuration/harness-differences/) for the per-harness paths.

`--copy` is reserved for environments where links are unavailable. A copy is a snapshot rather than a live projection, so it needs a re-run after every skill change.

## Conflicts

The command checks every target before changing any of them. Without `--force`, conflicts stop the command and leave all targets unchanged. A target that appears during a failed link attempt is preserved rather than overwritten.

A pre-existing harness skills directory containing real skills is a conflict by design. Move those skills into `.agents/skills/` first (see [Migrating Existing Configuration](/getting-started/migrating/)) rather than discarding them with `--force`.
