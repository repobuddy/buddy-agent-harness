---
title: doctor
description: 'CLI reference for buddy-agent-harness doctor: flags, statuses, findings, and why it never repairs.'
---

```sh
buddy-agent-harness doctor [--root <directory>] [--harness <names>] [--format toon|json]
```

`doctor` reports whether the skill bridges [`init`](/cli/init/) creates still resolve into `.agents/skills`. It is read-only: it never creates, moves, or repairs anything, so it is safe to run at any point, including from a session-start hook.

## Why it exists

A committed directory symlink such as `.claude/skills` → `../.agents/skills` degrades badly on a native Windows checkout, and it degrades silently.

Creating a symlink on Windows needs `SeCreateSymbolicLinkPrivilege` — Administrator, or Developer Mode. Git for Windows gates it separately with `core.symlinks`, which its installer leaves off by default. With `core.symlinks=false` git does not error: it checks the symlink out as a regular file whose contents are the target path. The harness looks for a directory, finds a file, and loads zero project skills, with no warning anywhere.

`core.symlinks` is per-clone. It is not distributed by `.gitattributes` or by committed config, so it cannot be enforced from the repository. Detection is the only reliable lever, and it is cheap: the path exists but is not a directory.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Selects the directory to diagnose. Defaults to the current directory. |
| `--harness <names>` | Comma-separated harnesses to check in addition to Claude Code and Cursor, such as `codex,gemini-cli`. |
| `--format toon\|json` | Choose token-efficient TOON output (default) or JSON. |

The bridge list is derived from the same registry `init` projects into, so `doctor` always describes the bridges `init` actually creates rather than a separate list that can drift.

## Output

```
bin: ~/.local/bin/buddy-agent-harness
bridges[2]{harness,path,kind,status}:
  claude-code,.claude/skills,file,degraded
  gemini-cli,.gemini/skills,none,missing
findings[2]{path,detail}:
  .claude/skills,expected a directory but found a regular file — checkout without core.symlinks
  .gemini/skills,no bridge at this path — the harness sees zero project skills
help[2]: Run `buddy-agent-harness init --copy --force`,Run `buddy-agent-harness init`
```

`kind` is what is on disk now — `symlink`, `copy`, `file`, or `none` — and `status` is whether it works.

| Status | Meaning |
| --- | --- |
| `ok` | The bridge resolves into `.agents/skills`. |
| `missing` | Nothing is at the bridge path. |
| `degraded` | The path is a regular file. This is the Windows checkout above. |
| `stale` | The path is a symlink pointing somewhere other than `.agents/skills`, or at a target that no longer exists. |
| `diverged` | The bridge is a copy whose contents no longer match `.agents/skills`. |

A healthy repository says so outright rather than printing an empty section, so an agent does not re-run with different flags to confirm:

```
bridges[2]{harness,path,kind,status}:
  claude-code,.claude/skills,symlink,ok
  gemini-cli,.gemini/skills,symlink,ok
findings: 0 problems found — all 2 bridges resolve
```

## Divergence

A symlink makes write-back drift structurally impossible: an agent that edits `.claude/skills/<name>/SKILL.md` edits `.agents/skills/<name>/SKILL.md`. A copy does not. The edit lands in the copy, and the two sides drift apart.

"These two differ" is not actionable, so a `diverged` bridge also gets a `direction`, computed against the last commit where the two agreed:

```
divergence[1]{path,direction}:
  .claude/skills,bridge
```

| Direction | What happened | What to do |
| --- | --- | --- |
| `bridge` | An agent wrote through the copy. | Propagate the bridge into `.agents/skills`, then re-run `init --force`. |
| `canonical` | Ordinary staleness. | Refresh the bridge with `init --copy --force`. |
| `both` | A genuine conflict. | Reconcile by hand. Rebuilding discards one side's edit. |
| `unknown` | No commit where the two agreed was found. | Reconcile by hand. |

## The skip-worktree bit

Running `init --copy --force` over a tracked symlink turns the bridge from a symlink blob into a directory of real files, leaving a permanently dirty tree holding something that must never be committed. `git update-index --skip-worktree` is the intended tool for a tracked path deliberately different on one machine.

It is a hint rather than a guarantee — some checkout and merge operations clear it — so `doctor` verifies the bit is still set on a tracked copy rather than assuming it, and reports the path as dirty-and-uncommittable if it has been lost.

## Exit codes

`doctor` exits `0` even when it has findings. The diagnosis succeeded, and a non-zero code reads to an agent as "this command is broken, try something else." A `--strict` flag for CI, the one caller that genuinely wants a failing process, is not implemented yet.

## No `--fix`

Every repair is already expressible with existing `init` flags, and each finding names the exact command:

| Finding | Repair |
| --- | --- |
| `missing` | `buddy-agent-harness init` |
| `degraded` | `buddy-agent-harness init --copy --force` |
| `stale` | `buddy-agent-harness init --force` |
| `diverged` | Depends on the direction; see above. |

A `--fix` flag would reimplement that logic and drift from it. On the Windows case it would likely reimplement it wrongly: the naive repair is to recreate the link, which is precisely the operation that already failed on that machine. `--copy` is the branch that works there. The three-way divergence case has no safe automatic answer at all.
