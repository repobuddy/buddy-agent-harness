---
title: 'CLI: doctor'
description: 'CLI reference for buddy-agent-harness doctor: flags, statuses, findings, instruction bridges, and why it never repairs.'
---

```sh
buddy-agent-harness doctor [--root <directory>] [--harness <names>] [--format toon|json|text]
```

`doctor` reports whether a repository's harness bridges still resolve: the skill bridges [`init`](/cli/init/) creates into `.agents/skills`, and the instruction bridges the [`init` skill](/skills/init/) writes into `AGENTS.md`. It is read-only: it never creates, moves, or repairs anything, so it is safe to run at any point, including from a session-start hook.

## No install needed

Nothing has to be installed to diagnose a repository. Run it from npm in the repository root:

```sh
npx -y buddy-agent-harness doctor --format text
```

That is the whole dependency: one npx invocation, on a repository you cloned rather than one you set up. The plugin and its [`doctor` skill](/skills/doctor/) add an agent that runs this for you and reads the report, not a capability the command lacks.

## Why it exists

A committed directory symlink such as `.claude/skills` → `../.agents/skills` degrades badly on a native Windows checkout, and it degrades silently.

Creating a symlink on Windows needs `SeCreateSymbolicLinkPrivilege`, which means Administrator or Developer Mode. Git for Windows gates it separately with `core.symlinks`, which its installer leaves off by default. With `core.symlinks=false` git does not error: it checks the symlink out as a regular file whose contents are the target path. The harness looks for a directory, finds a file, and loads zero project skills, with no warning anywhere.

`core.symlinks` is per-clone. It is not distributed by `.gitattributes` or by committed config, so it cannot be enforced from the repository. Detection is the only reliable lever, and it is cheap: the path exists but is not a directory.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Selects the directory to diagnose. Defaults to the current directory. |
| `--harness <names>` | Comma-separated harnesses to check in addition to Claude Code and Cursor, such as `codex,gemini-cli`. |
| `--format toon\|json\|text` | Choose token-efficient TOON output (default), JSON, or a human-readable text report. |

The bridge list is derived from the same registry `init` projects into, so `doctor` always describes the bridges `init` actually creates rather than a separate list that can drift.

## Output

```
bin: ~/.local/bin/buddy-agent-harness
bridges[2]{harness,path,kind,status}:
  claude-code,.claude/skills,file,degraded
  gemini-cli,.gemini/skills,none,missing
instructions[2]{harness,path,kind,status}:
  claude-code,CLAUDE.md,import,ok
  gemini-cli,.gemini/settings.json,none,missing
findings[3]{path,detail}:
  .claude/skills,expected a directory but found a regular file — checkout without core.symlinks
  .gemini/skills,no bridge at this path — the harness sees zero project skills
  .gemini/settings.json,no instruction bridge at this path — the harness reads none of AGENTS.md
help[3]: Run `buddy-agent-harness init --copy --force`,Run `buddy-agent-harness init`,Run `/buddy-agent-harness:init`
```

`kind` is what is on disk now (`symlink`, `copy`, `file`, or `none`), and `status` is whether it works.

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
instructions[2]{harness,path,kind,status}:
  claude-code,CLAUDE.md,import,ok
  gemini-cli,.gemini/settings.json,settings-entry,ok
findings: 0 problems found — all 4 bridges resolve
```

The count spans both sections. Both are bridges, and a reader learning that nothing is wrong should not have to add two numbers together.

### `--format text`

TOON is the default because it is what an agent parses. `--format text` renders the same result for a person, with each collection as an aligned table:

```
bin: ~/.local/bin/buddy-agent-harness

bridges:
  harness      path            kind  status
  claude-code  .claude/skills  file  degraded
  gemini-cli   .gemini/skills  none  missing

instructions:
  harness      path                   kind    status
  claude-code  CLAUDE.md              import  ok
  gemini-cli   .gemini/settings.json  none    missing

findings:
  path                   detail
  .claude/skills         expected a directory but found a regular file — checkout without core.symlinks
  .gemini/skills         no bridge at this path — the harness sees zero project skills
  .gemini/settings.json  no instruction bridge at this path — the harness reads none of AGENTS.md

help:
  - Run `buddy-agent-harness init --copy --force`
  - Run `buddy-agent-harness init`
  - Run `/buddy-agent-harness:init`
```

`init` accepts the same flag.

## Instruction bridges

A repository that consolidated into `AGENTS.md` needs a second bridge per harness that cannot read it. Claude Code reads `CLAUDE.md`, so it gets one holding `@AGENTS.md`. Gemini CLI reads the `context.fileName` array in `.gemini/settings.json`, and `AGENTS.md` is not in its default list, so without that entry it reads no instructions at all.

These fail as silently as a skills bridge and cost more. Losing a skills bridge costs a repository its skills; losing the instruction bridge costs it every instruction it has.

They are a separate `instructions` section rather than more `bridges` rows, because nothing about them is shared:

- The `kind` and `status` vocabularies differ. `stale` and `diverged` describe a directory projection and mean nothing for a Markdown import or a JSON array entry.
- The repair is never a command. `init` writes skills projections; the instruction files carry prose a person authored, so restoring a bridge without discarding what displaced it is the [`init` skill](/skills/init/)'s judgment.
- A `bridges` row is a directory the CLI wrote. An `instructions` row is a file the skill wrote. Merging them would make one section mean two things.

| Status | Meaning |
| --- | --- |
| `ok` | The harness reaches `AGENTS.md` through this file. |
| `missing` | Nothing is at the path. |
| `unbridged` | The file is there and names `AGENTS.md` nowhere. |
| `unreadable` | A settings file that does not parse as JSON, once its comments are removed. |

`unbridged` is the case with no equivalent on the skills side, and the reason these checks exist. Nothing looks wrong: `CLAUDE.md` is present, and it holds something a well-meaning agent wrote over the import; or `.gemini/settings.json` is present, and another tool rewrote it without the entry. The repair never replaces the file, because the content that displaced the bridge may be the only copy of it.

Bridges are reported per file, not per harness. An import bridges the `AGENTS.md` beside it and nothing deeper, so every directory holding a nested `AGENTS.md` gets its own row:

```
instructions[3]{harness,path,kind,status}:
  claude-code,CLAUDE.md,import,ok
  claude-code,apps/web/CLAUDE.md,none,missing
  claude-code,packages/core/CLAUDE.md,import,ok
```

`AGENTS.md` files under a dot-directory or `node_modules` are not counted. `.agents/AGENTS.md` is canonical shared instructions rather than instructions scoped to a subtree, and a vendored one is not this repository's to bridge.

A repository with no root `AGENTS.md` gets one finding saying so, and no bridge rows — there is nothing for a bridge to point at.

`.gemini/settings.json` may legally carry comments — the Gemini CLI loader strips them before parsing — so `doctor` strips them too. Reporting a commented settings file as broken would be a false alarm on a file that works. A trailing comma is still a parse error, because nothing documents it as accepted. [Harness Differences](/agent-configuration/harness-differences/#json-configuration-disagrees-about-comments) covers the disagreement between the two `settings.json` files.

Which harnesses are checked is the same question as for skills: the registry records an instruction bridge per harness, and `--harness` gates both kinds together. Codex, Cursor, Copilot CLI, and Devin Desktop read `AGENTS.md` where it lies, so they get no rows — see [Harness Differences](/agent-configuration/harness-differences/).

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

It is a hint rather than a guarantee, because some checkout and merge operations clear it. So `doctor` verifies the bit is still set on a tracked copy rather than assuming it, and reports the path as dirty-and-uncommittable if it has been lost.

## Exit codes

`doctor` exits `0` even when it has findings. The diagnosis succeeded, and a non-zero code reads to an agent as "this command is broken, try something else." A `--strict` flag for CI, the one caller that genuinely wants a failing process, is not implemented yet.

## No `--fix`

Every repair is already expressible with existing `init` flags, and each finding names the exact command:

| Finding | Repair |
| --- | --- |
| `no-canonical` | `buddy-agent-harness init` |
| `missing` | `buddy-agent-harness init` |
| `degraded` | `buddy-agent-harness init --copy --force` |
| `stale` | `buddy-agent-harness init --force` |
| `diverged` | Depends on the direction; see above. |
| `unpinned-copy` | `git ls-files -z <path> \| xargs -0 git update-index --skip-worktree` |
| `no-instructions` | `/buddy-agent-harness:init` |
| `instructions-missing` | `/buddy-agent-harness:init` |
| `instructions-unbridged` | `/buddy-agent-harness:init` |
| `instructions-unreadable` | Fix the JSON by hand, then `/buddy-agent-harness:init` |

`no-canonical` is the one finding that is not about a bridge: `.agents/skills` itself is absent, so nothing can resolve into it. `no-instructions` is its counterpart for `AGENTS.md`. `unpinned-copy` is the [skip-worktree](#the-skip-worktree-bit) case, and it is reported against a bridge whose status is still `ok`.

The four instruction repairs name a skill rather than a shell command, because no shell command does the job. They are the one place `help` cannot be pasted into a terminal.

A `--fix` flag would reimplement that logic and drift from it. On the Windows case it would likely reimplement it wrongly: the naive repair is to recreate the link, which is precisely the operation that already failed on that machine. `--copy` is the branch that works there. The three-way divergence case has no safe automatic answer at all.
