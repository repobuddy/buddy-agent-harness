---
title: 'CLI: sync'
description: 'CLI reference for buddy-agent-harness sync: merging a skills copy with .agents/skills file by file, picking a side for a file both sides changed, and keeping the copy out of commits.'
---

```sh
buddy-agent-harness sync [--root <directory>] [--resolve <bridge>/<file>=<canonical|copy>,...] [--format toon|json|text]
```

On a machine that cannot make symlinks, a harness that cannot read `.agents/skills` gets a copy of it at its own path, such as `.claude/skills`. The copy and `.agents/skills` then drift apart. An agent edits a skill through the copy, or someone edits `.agents/skills` directly, and the other side never learns of it. Rebuilding the copy throws away the edits made through it, and copying it back throws away the edits made in `.agents/skills`.

`sync` merges each copy with `.agents/skills` file by file instead, against the last commit where the two held the same files. Nothing is lost: a file only one side changed takes that side's version, and a file both sides changed waits for you to pick a side.

The [`repair-buddy-agent-harness` skill](/skills/repair-buddy-agent-harness/) runs it for a [`diverged-*`](/cli/doctor/#divergence) finding and asks you which side wins each file the sync leaves. [`init`](/cli/init/#existing-copies) runs the same sync on an existing copy instead of reporting it as a conflict.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Any directory of the repository. The sync works at the repository root, so it can run from a nested package. Outside a Git repository it works on this directory. Defaults to the current directory. |
| `--resolve <picks>` | Comma-separated picks for files a sync left for you. Each one is `<bridge>/<file>=<canonical\|copy>`: the file's path through the bridge, as `left` names it, and the side whose version both sides are to hold. |
| `--format toon\|json\|text` | Choose token-efficient TOON output (default), JSON, or a human-readable text report. |

## What it decides for each file

A skills bridge that is a symlink, a regular file, or absent is not a copy, and nothing is written for it. A copy that already holds the same files as `.agents/skills` is kept as it is.

For each file that differs between a copy and `.agents/skills`, the sync asks which side changed it since their last agreement. A file added or removed on a side counts as a change on that side.

| Changed on | What the sync does |
| --- | --- |
| One side only | Writes that side's version to the other side, a removal included, so an edit made through the copy lands in `.agents/skills`. |
| Both sides | Leaves the file as it is on both sides and lists it in `left`, unless a `--resolve` pick names it. |
| Unknown | Without a last agreement, every differing file is left the same way. |

There is no last agreement when the repository has no commits, when the copy and `.agents/skills` were never committed holding the same files, when the bridge was committed as a symlink, or outside a Git repository. A symlink commit says nothing about what a copy made from it held, so it never counts.

With more than one copy, such as `.claude/skills` and `.windsurf/skills`, a file two copies changed to different content counts as changed on both sides, and stays as it is everywhere until you pick. An edit made through one copy reaches `.agents/skills` and every other copy.

A file left for you stops no other file: everything else is still synced.

## Picking a side

Run the sync, read `left`, and pick a side for each file there. `git diff --no-index .agents/skills/<file> .claude/skills/<file>` shows how the two sides differ. Then pass your picks, naming each file once by its path through the bridge:

```sh
buddy-agent-harness sync --resolve .claude/skills/review/SKILL.md=copy,.claude/skills/lint/SKILL.md=canonical
```

`copy` writes the copy's version to `.agents/skills`, and `canonical` writes the `.agents/skills` version to the copy. When the picked side lacks the file, the file is removed from the other side too. A file you give no pick stays as it is on both sides.

The command refuses a pick before it writes anything, naming the pick:

- `invalid-resolution`: the pick names no side `sync` recognizes, or no file.
- `unneeded-resolution`: the pick names a file the sync does not leave for you: one the same on both sides, one only one side changed, or one in neither side.
- `conflicting-resolution`: with more than one copy, the picks for one file would leave the copies holding different versions, or would change `.agents/skills` under a copy still waiting for a pick.

## Copy protection

A copy at a path git tracks would otherwise show as uncommitted changes, and `git add -A` would put it in the next commit. After the sync, every copy it synced or kept at a tracked path has both parts of copy protection, whether or not the sync wrote into it:

- skip-worktree set on the copy's tracked entries, so `git status` stops showing their changes, and
- `/<bridge>/` listed in the clone's own exclude file, so git adds none of the copy's other files.

[The skip-worktree bit](/cli/doctor/#the-skip-worktree-bit) explains why both parts are needed and how to undo them. The sync never writes the committed `.gitignore`, and it protects no copy at an untracked path. Changes to `.agents/skills` show as ordinary changes, for you to commit.

## Output

```
root: ~/code/acme
outcome: files-left
copies[1]: .claude/skills
written[1]{bridge,path,side}:
  .claude/skills,.claude/skills/review/SKILL.md,copy
left[1]{bridge,path}:
  .claude/skills,.claude/skills/lint/SKILL.md
protected[1]: .claude/skills
```

| Field | Meaning |
| --- | --- |
| `root` | The repository root the sync worked at. |
| `outcome` | `synced` when no file waits for a pick, `files-left` when at least one does. |
| `copies` | Every copy bridge the sync synced or kept. |
| `written` | Each file the sync wrote, per copy, with `side` naming whose version it took: `copy` or `canonical`. |
| `left` | Each file left as it is on both sides. Its `path` is what `--resolve` takes. |
| `protected` | The copies at a tracked path that carry both parts of copy protection after the run. |

## Exit codes

`sync` exits `0` when it ran, whether or not it left files for you: read `outcome` to tell the two apart. Every failure is a coded report on stdout (`error`, `code`, any `entries`, and `help`), never prose on stderr.

| Code | Exit | When |
| --- | --- | --- |
| `invalid-resolution`, `unneeded-resolution`, `conflicting-resolution` | `2` | A pick was refused. Nothing was written. |
| `canonical-missing` | `1` | `.agents/skills` does not exist while a copy does. Nothing was written: an absent directory is not read as every skill deleted. |
| `write-failed` | `1` | A write failed partway, such as on a permission. |
| `command-failed` | `1` | An unforeseen failure. |

A `--format` other than `toon`, `json`, or `text` is a usage error, exit `2`, before anything is written.
