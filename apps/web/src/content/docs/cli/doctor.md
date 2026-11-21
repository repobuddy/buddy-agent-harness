---
title: 'CLI: doctor'
description: 'CLI reference for buddy-agent-harness doctor: flags, statuses, findings, what stands between a harness and AGENTS.md, and why it never repairs.'
---

```sh
buddy-agent-harness doctor [--root <directory>] [--harness <names>] [--format toon|json|text]
```

`doctor` reports whether a repository's harness bridges still resolve: the skill bridges [`init`](/cli/init/) creates into `.agents/skills`, and everything standing between a harness and `AGENTS.md` — the one bridge the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/) writes, and the files that suppress `AGENTS.md` where a harness reads it natively. It is read-only: it never creates, moves, or repairs anything, so it is safe to run at any point, including from a session-start hook.

## No install needed

Nothing has to be installed to diagnose a repository. Run it from npm in the repository root:

```sh
npx -y buddy-agent-harness doctor --format text
```

That is the whole dependency: one npx invocation, on a repository you cloned rather than one you set up. The plugin and its [`doctor-buddy-agent-harness` skill](/skills/doctor-buddy-agent-harness/) add an agent that runs this for you and reads the report, not a capability the command lacks.

## Why it exists

A committed directory symlink such as `.claude/skills` → `../.agents/skills` degrades badly on a native Windows checkout, and it degrades silently.

Creating a symlink on Windows needs `SeCreateSymbolicLinkPrivilege`, which means Administrator or Developer Mode. Git for Windows gates it separately with `core.symlinks`, which its installer leaves off by default. With `core.symlinks=false` git does not error: it checks the symlink out as a regular file whose contents are the target path. The harness looks for a directory, finds a file, and loads zero project skills, with no warning anywhere.

`core.symlinks` is per-clone. It is not distributed by `.gitattributes` or by committed config, so it cannot be enforced from the repository. Detection is the only reliable lever, and it is cheap: the path exists but is not a directory.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Selects the directory to diagnose. Defaults to the current directory. |
| `--harness <names>` | Comma-separated harnesses to check in addition to Claude Code and Cursor, such as `codex,windsurf`. |
| `--format toon\|json\|text` | Choose token-efficient TOON output (default), JSON, or a human-readable text report. |

The bridge list is derived from the same registry `init` projects into, so `doctor` always describes the bridges `init` actually creates rather than a separate list that can drift.

## Output

```
bin: ~/.local/bin/buddy-agent-harness
bridges[2]{harness,path,kind,status}:
  claude-code,.claude/skills,file,degraded
  windsurf,.windsurf/skills,none,missing
instructions[2]{harness,path,kind,status}:
  gemini-cli,.gemini/settings.json,none,missing
  claude-code,CLAUDE.md,file,shadowing
globalInstructions[1]{harness,path,kind,status}:
  claude-code,~/.claude/CLAUDE.md,import,ok
references[2]{name,tier,path,status}:
  testing,repo,~/code/acme/.agents/references/testing.md,used
  testing,user,~/.agents/references/testing.md,shadowed by repo (replace)
findings[4]{path,problem,cause,detail,command,instruction}:
  .claude/skills,degraded,"",expected a directory but found a regular file — checkout without core.symlinks,buddy-agent-harness init --copy --force .claude/skills,run `buddy-agent-harness init --copy --force .claude/skills` to rebuild .claude/skills as a real directory
  .windsurf/skills,missing,"",no bridge at this path — the harness sees zero project skills,buddy-agent-harness init,run `buddy-agent-harness init` to create the bridge at .windsurf/skills
  .gemini/settings.json,instructions-missing,"",no instruction bridge at this path — the harness reads none of AGENTS.md,"","hand .gemini/settings.json to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which writes the bridge into it"
  CLAUDE.md,instructions-shadowing,"","this file suppresses the AGENTS.md beside it — the harness reads this instead, and none of AGENTS.md","","hand CLAUDE.md to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which consolidates what it says into AGENTS.md, or adds an @AGENTS.md import above it where the file has to stay"
help[4]{command,instruction}:
  buddy-agent-harness init --copy --force .claude/skills,run `buddy-agent-harness init --copy --force .claude/skills` to rebuild .claude/skills as a real directory
  buddy-agent-harness init,run `buddy-agent-harness init` to create the bridge at .windsurf/skills
  "","hand .gemini/settings.json to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which writes the bridge into it"
  "","hand CLAUDE.md to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which consolidates what it says into AGENTS.md, or adds an @AGENTS.md import above it where the file has to stay"
```

Each finding carries its own repair on its row, in two columns. `command` is a shell invocation that runs exactly as given and **completes** the repair; `instruction` is the same repair in the imperative. `command` is empty when no single invocation does the job — the last two rows above, where the repair is the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/)'s judgment and nothing in a shell does it. `cause` is set only on an `unloadable-skill` finding, which has one repair per cause. `help` lists each distinct repair once, as a summary of the rows' own.

That emptiness is the whole point of the split: a caller can tell an executable repair from an instruction without parsing prose. A runnable invocation quoted *inside* an `instruction` is not a command either — `diverged-both` names `git diff --no-index` because the diff shows you what differs, not because running it reconciles anything.

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
  windsurf,.windsurf/skills,symlink,ok
instructions[1]{harness,path,kind,status}:
  gemini-cli,.gemini/settings.json,settings-entry,ok
globalInstructions[1]{harness,path,kind,status}:
  claude-code,~/.claude/CLAUDE.md,import,ok
references: 0 references — no layer outside the plugin tier holds one
findings: 0 problems found — all 3 bridges resolve and the configuration around them is current
```

The count spans both sections, and a reader learning that nothing is wrong should not have to add two numbers together. Claude Code contributes no `instructions` row here, which is what a healthy repository looks like now: it reads `AGENTS.md` itself, and a row appears only where something is in the way.

### `--format text`

TOON is the default because it is what an agent parses. `--format text` renders the same result for a person, with each collection as an aligned table:

```
bin: ~/.local/bin/buddy-agent-harness

bridges:
  harness      path              kind  status
  claude-code  .claude/skills    file  degraded
  windsurf     .windsurf/skills  none  missing

instructions:
  harness      path                   kind    status
  gemini-cli   .gemini/settings.json  none    missing
  claude-code  CLAUDE.md              file    shadowing

references:
  name     tier     path                                      status
  testing  repo     ~/code/acme/.agents/references/testing.md  used
  testing  user     ~/.agents/references/testing.md            shadowed by repo (replace)

findings:
  path                   problem                 cause  detail                                                                                                command                                                 instruction
  .claude/skills         degraded                       expected a directory but found a regular file — checkout without core.symlinks                        buddy-agent-harness init --copy --force .claude/skills  run `buddy-agent-harness init --copy --force .claude/skills` to rebuild .claude/skills as a real directory
  .windsurf/skills       missing                        no bridge at this path — the harness sees zero project skills                                         buddy-agent-harness init                                run `buddy-agent-harness init` to create the bridge at .windsurf/skills
  .gemini/settings.json  instructions-missing           no instruction bridge at this path — the harness reads none of AGENTS.md                                                                                      hand .gemini/settings.json to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which writes the bridge into it
  CLAUDE.md              instructions-shadowing         this file suppresses the AGENTS.md beside it — the harness reads this instead, and none of AGENTS.md                                                          hand CLAUDE.md to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which consolidates what it says into AGENTS.md, or adds an @AGENTS.md import above it where the file has to stay

help:
  command                                                 instruction
  buddy-agent-harness init --copy --force .claude/skills  run `buddy-agent-harness init --copy --force .claude/skills` to rebuild .claude/skills as a real directory
  buddy-agent-harness init                                run `buddy-agent-harness init` to create the bridge at .windsurf/skills
                                                          hand .gemini/settings.json to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which writes the bridge into it
                                                          hand CLAUDE.md to `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which consolidates what it says into AGENTS.md, or adds an @AGENTS.md import above it where the file has to stay
```

`init` accepts the same flag.

## Reaching AGENTS.md

The `instructions` section reports two shapes, not one. A **bridge** is what a harness needs before it can read `AGENTS.md` at all: Gemini CLI reads the `context.fileName` array in `.gemini/settings.json`, `AGENTS.md` is not in its default list, and without that entry it reads no instructions. It is the only harness left needing one. A **shadow** is the reverse — a file sitting beside an `AGENTS.md` that a harness reading it natively prefers, so the canonical file never loads. Claude Code is the case, and the files are `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`; [Claude Code](/agent-configuration/harnesses/claude-code/#a-claudemd-beside-it-suppresses-it) has the rule.

Both fail as silently as a skills bridge and cost more. Losing a skills bridge costs a repository its skills; losing `AGENTS.md` costs it every instruction it has.

They are a separate `instructions` section rather than more `bridges` rows, because nothing about them is shared:

- The `kind` and `status` vocabularies differ. `stale` and `diverged` describe a directory projection and mean nothing for a Markdown import or a JSON array entry.
- The repair is never a command. `init` writes skills projections; the instruction files carry prose a person authored, so restoring a bridge without discarding what displaced it is the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/)'s judgment.
- A `bridges` row is a directory the CLI wrote. An `instructions` row is a file a person wrote, or one the skill wrote into. Merging them would make one section mean two things.

| Status | Meaning |
| --- | --- |
| `ok` | The harness reaches `AGENTS.md` through this file. |
| `missing` | Nothing is at the path. |
| `unbridged` | The file is there and names `AGENTS.md` nowhere. |
| `unreadable` | A settings file that does not parse as JSON, once its comments are removed. |
| `shadowing` | A file that suppresses the `AGENTS.md` beside it. The harness reads this instead. |
| `superseded` | A file that suppresses `AGENTS.md` and then delivers it anyway, through an `@AGENTS.md` import or a symlink. |

`unbridged` is the case with no equivalent on the skills side, and the reason these checks exist. Nothing looks wrong: `.gemini/settings.json` is present, and another tool rewrote it without the entry. The repair never replaces the file, because the content that displaced the bridge may be the only copy of it.

`shadowing` is the same failure from the other direction, and the most expensive row in this section. Nothing is missing, nothing looks wrong, and the harness is reading a file the rest of the repository does not maintain. The repair consolidates what the file says into `AGENTS.md`, or — where the file has to stay, as a gitignored `CLAUDE.local.md` does — adds an `@AGENTS.md` import above it so both load.

`superseded` is not a fault. It is the bridge this tool used to write, still working and no longer needed, and there is one reason to keep it: [sessions that cannot read `AGENTS.md` directly](/agent-configuration/harnesses/claude-code/#sessions-that-still-need-the-import). The removal is offered, never made.

Both are reported per file, not per harness. A shadow suppresses the `AGENTS.md` beside it and nothing deeper, and an import bridges no further either, so every directory holding a nested `AGENTS.md` gets its own row where something sits there:

```
instructions[2]{harness,path,kind,status}:
  claude-code,CLAUDE.md,import,superseded
  claude-code,packages/core/CLAUDE.md,file,shadowing
```

A directory with a nested `AGENTS.md` and nothing beside it produces no row at all. That is the healthy state, not an omission.

`AGENTS.md` files under a dot-directory or `node_modules` are not counted. `.agents/AGENTS.md` is canonical shared instructions rather than instructions scoped to a subtree, and a vendored one is not this repository's to bridge.

A repository with no root `AGENTS.md` gets one finding saying so, provided something in it depends on that file: a bridge pointing at it, or a shadowing file that is the only instructions one harness reads. A repository with neither has no instructions at all, which is `init`'s to create rather than a fault here.

`.gemini/settings.json` may legally carry comments — the Gemini CLI loader strips them before parsing — so `doctor` strips them too. Reporting a commented settings file as broken would be a false alarm on a file that works. A trailing comma is still a parse error, because nothing documents it as accepted. [Harness Differences](/agent-configuration/harness-differences/#json-configuration-disagrees-about-comments) covers the disagreement between the two `settings.json` files.

Which harnesses are checked is the same question as for skills: the registry records, per harness, an instruction bridge or the filenames that shadow `AGENTS.md`, and `--harness` gates both kinds together. Codex, Cursor, Copilot CLI, and Devin Desktop read `AGENTS.md` where it lies and nothing documented suppresses it, so they get no rows — see [Harness Differences](/agent-configuration/harness-differences/).

## Reaching ~/.agents/AGENTS.md

`~/.agents/AGENTS.md` is the user-scope counterpart of the root `AGENTS.md`: instructions that hold in every repository you open. The [`enhance-buddy-agent-harness` skill](/skills/enhance-buddy-agent-harness/) writes text into it when you pick it, and other tools hand text over for it. No harness reads it by itself. Each harness reads a user-scope file of its own, and that file has to load the global one. Where none does, text placed in the global file does nothing in that harness, and nothing says so.

`globalInstructions` reports, for each harness installed for you, whether its user-scope file loads the global one. A harness counts as installed where its user-scope directory exists in your home directory, such as `~/.claude`, or where `--harness` names it.

| Harness | User-scope file | What loads `~/.agents/AGENTS.md` |
| --- | --- | --- |
| Claude Code | `~/.claude/CLAUDE.md` | the line `@~/.agents/AGENTS.md`, or the file as a symlink to it |
| Codex | `~/.codex/AGENTS.md` | the file as a symlink to it. Codex has no import |
| Copilot CLI | `~/.copilot/copilot-instructions.md` | the file as a symlink to it. Copilot CLI refuses an import that starts with `~/` |
| Gemini CLI | `~/.gemini/GEMINI.md` | the file as a symlink to it |

Gemini CLI's project bridge does not carry over. At user scope, `context.fileName` names files inside `~/.gemini/` only, so no setting can point it at `~/.agents/`. Cursor keeps its user rules in a settings panel, and Devin Desktop documents no user-scope path, so neither gets a row.

Three harnesses let a variable move their directory: `CODEX_HOME` replaces `~/.codex`, `COPILOT_HOME` replaces `~/.copilot`, and `CLAUDE_CONFIG_DIR` replaces `~/.claude`. Where one is set and non-empty, `doctor` looks for the directory and the file under it, and writes the path from the variable, so the report says which one moved it:

```
globalInstructions[1]{harness,path,kind,status}:
  codex,$CODEX_HOME/AGENTS.md,symlink,ok
```

A variable that is set but empty is read the way the harness reads it. Codex and Copilot CLI read it as unset, so the file is the one under `~`. Claude Code reads an empty `CLAUDE_CONFIG_DIR` as the directory it starts in, so its user-scope file becomes whichever `CLAUDE.md` is there: in a repository, the project's own. The row names that file relative to the directory `doctor` ran in, `./CLAUDE.md`, and the `global-instructions-emptied` finding blames the variable instead of the file. You most likely didn't mean to set it, and bridging that file would only work in one directory, and through the project's file. The repair is to unset it, or set it to the folder you meant:

```
help[1]{command,instruction}:
  "","hand the user this step, since nothing here writes outside the repository: unset CLAUDE_CONFIG_DIR where your shell sets it, or set it to the folder you meant"
```

Codex also reads `AGENTS.override.md` before `AGENTS.md`, and uses whichever first holds more than whitespace. An override that does not load the global file makes the row `overridden`, however well `AGENTS.md` is bridged, and the `global-instructions-overridden` finding names the override. Its repair is to move what it says into `~/.agents/AGENTS.md` and remove it. An override that is itself a symlink to the global file is `ok`.

| Status | Meaning |
| --- | --- |
| `ok` | The file imports the global file, or is a symlink to it. |
| `missing` | The harness has no user-scope instruction file at all. |
| `unbridged` | The file holds content of its own and does not load the global file. |
| `overridden` | The harness reads another file in its place, and that file does not load the global file. |

The rows are reported whether or not `~/.agents/AGENTS.md` exists, so a skill handing text over for it can say which harnesses will load it. A finding, `global-instructions-missing`, `global-instructions-unbridged`, `global-instructions-overridden`, or `global-instructions-emptied`, is raised only where the file exists and a harness is not loading it.

**The repair is handed to you, never made.** The file belongs to the harness, in your home directory, and nothing this package ships writes a harness's user-scope file. Each repair has an empty `command`, and its `instruction` names the exact line or symlink to add yourself:

```
help[1]{command,instruction}:
  "","hand the user this step, since nothing here writes outside the repository: add the line `@~/.agents/AGENTS.md` to ~/.claude/CLAUDE.md"
```

Where the bridge is a symlink, the file it replaces may hold content of its own. That content has to move into `~/.agents/AGENTS.md` first, or it is lost, and the repair says so. The vendor sources behind each row are in [Sources & Confidence](/sources/).

## References

`doctor` also reports the [references](/agent-configuration/references/) the managed, repo, and user tiers hold: one row per name per layer, `{ name, tier, path, status }`. `status` is the one [`reference list`](/cli/reference/#reference-list-and-reference-search) gives, such as `used` or `shadowed by repo (replace)`. What a plugin ships is left out; that is the plugin's own business. The section is never a finding: a reference is a choice someone made, not a fault, and it never changes `doctor`'s exit code.

When no layer holds a reference, the section is the sentence `0 references — no layer outside the plugin tier holds one` rather than an empty list, the same "state the zero" convention the rest of this report follows. The path is on the row because the tier does not settle it: the managed tier holds a `references/` folder beside each detected harness's managed files. The home directory is collapsed to `~`, as in `bin`.

## Divergence

A symlink makes write-back drift structurally impossible: an agent that edits `.claude/skills/<name>/SKILL.md` edits `.agents/skills/<name>/SKILL.md`. A copy does not. The edit lands in the copy, and the two sides drift apart.

"These two differ" is not actionable, so a `diverged` bridge also gets a `direction`, computed against the last commit where the two agreed:

```
divergence[1]{path,direction}:
  .claude/skills,bridge
```

| Direction | What happened | What to do |
| --- | --- | --- |
| `bridge` | An agent wrote through the copy. | `buddy-agent-harness sync` carries the edits into `.agents/skills`. |
| `canonical` | Ordinary staleness. | `buddy-agent-harness sync` carries the newer `.agents/skills` into the copy. |
| `both` | A genuine conflict. | `sync` carries every file one side changed and leaves each file both sides changed for you to pick a side, through `sync --resolve`. |
| `unknown` | No commit where the two agreed was found. | `sync` leaves every differing file for you to pick a side. |

Every direction takes the same repair, the file-by-file [`sync`](/cli/sync/), and none takes a rebuild: rebuilding the copy from `.agents/skills` discards the edits made through it, and the reverse discards the edits made in `.agents/skills`. A program that runs every `command` a report offers therefore rebuilds no diverged bridge. The `both` and `unknown` findings offer no `command`, since the sync cannot finish them until you pick a side for each file it leaves. The [`repair-buddy-agent-harness` skill](/skills/repair-buddy-agent-harness/) owns all four, and asks you for each pick.

## The skip-worktree bit

Running `init --copy` over a tracked symlink turns the bridge from a symlink blob into a directory of real files. Without help, that leaves a permanently dirty tree holding something that must never be committed. A copy over a tracked path therefore needs copy protection, in two parts:

- **skip-worktree** on the copy's tracked entries in the index: `git update-index --skip-worktree` is git's tool for a tracked path deliberately different on one machine, and it stops `git status` and `git add` from seeing changes to those entries.
- **the bridge path in the clone's own exclude file**, as a line such as `/.claude/skills/`. When the committed bridge is a symlink, the copy's files are untracked paths under it, which skip-worktree does not cover and `git add -A` would still add. The exclude file is the one `git rev-parse --git-path info/exclude` names: `.git/info/exclude` in a plain clone, and the file the clone shares in a linked worktree. It is never the committed `.gitignore`, so the rule stays on this machine.

A copy with only one part is not protected. [`init`](/cli/init/) puts both in place on every copy it writes, syncs, or keeps at a tracked path, and so does [`sync`](/cli/sync/#copy-protection).

The skip-worktree bit is a hint rather than a guarantee, because some checkout and merge operations clear it. So `doctor` checks both parts on every tracked copy that holds what `.agents/skills` holds, rather than assuming them, and reports an `unpinned-copy` finding while either is missing. Its repair puts both in place for that copy and changes no file's content.

To undo the protection, such as before committing a change to the copy on purpose, remove both parts:

```sh
git ls-files -z .claude/skills | xargs -0 git update-index --no-skip-worktree
```

and delete the `/.claude/skills/` line from the exclude file `git rev-parse --git-path info/exclude` names.

## Configuration findings

Alongside the bridge and instruction sections, `doctor` reports configuration that is present and **wrong**. None of these is a resolution problem — every one resolves fine.

| Finding | What is wrong |
| --- | --- |
| `deprecated-harness` | a skills projection under a harness name that has been superseded. The replacement reads `.agents/skills` natively, so the correction removes the projection rather than renaming it |
| `ignored-bridge` | a `.gitignore` rule matches a bridge, usually a blanket `.claude/`. Asked of `git check-ignore`, so a rule on a parent directory is caught |
| `unread-local-override` | an `AGENTS.local.md`. No harness reads that filename, so its content is invisible |
| `unloadable-skill` | frontmatter that does not parse, or no `description` — the two faults that make a harness skip a skill outright. A `name` that mismatches its directory is only a warning, so it is deliberately not reported |

These four repair through the [`repair-buddy-agent-harness` skill](/skills/repair-buddy-agent-harness/), which offers each correction with its before and after and writes only what you approve.

Each finding row carries three fields: `problem` is its name and the only thing a program should branch on, `path` is what it is about, and `detail` is prose for a person. Route on `problem`, never on `detail` — the prose is meant to be read, and improving its wording must not change what a caller does.

`--harness` does not affect these checks. Every one requires a projection to exist on disk, and a projection cannot exist without its harness's own directory, which selects that harness already.

## Non-standard configuration findings

`doctor` also reports configuration that **works, for exactly one harness**: a `.cursor/rules/*.mdc`, a harness-only command, skill, or subagent directory. None of these is a fault. The problem is reach: guidance in a Cursor rule reaches Cursor and nothing else, and nobody finds out except by noticing an agent behave differently in another tool.

Each `nonstandard-*` finding names the canonical form its content converts to: `AGENTS.md` for prose, `.agents/skills/` for a capability. The harness file is then generated from that source rather than authored beside it. Every conversion moves content someone wrote, so each one is offered by the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/) and never written on sight. `repair-buddy-agent-harness` owns none of them, because it corrects configuration that is wrong and none of this is wrong. `nonstandard-subagent` names no owner at all: there is no cross-harness subagent format to convert to, so the finding reports the gap instead of a repair that cannot run.

Zero of these is a direction, not a gate. Nothing blocks on the count.

## MCP findings

Where a repository keeps a [golden MCP server set](/agent-configuration/mcp-servers/) at `.agents/buddy-agent-harness/mcp.toml`, `doctor` compares it against each harness's project-scope MCP configuration and reports drift in both directions, as `mcp-*` findings in the same `findings` section. Literal credentials in any MCP file are reported whether or not a golden set exists, and a secret's value never enters the report — the finding carries a locator like `.cursor/mcp.json#servers.linear.headers.Authorization` and nothing else.

These findings stay within the command's contract: read-only, `--harness`-independent for the same reason as the configuration findings, and routed on `problem`. What the golden set is, which file each harness reads, and every `mcp-*` finding with its repair are on [MCP Servers](/agent-configuration/mcp-servers/).

## Agent worktree findings

Where a repository has a `.claude/` directory, `doctor` reports where the [git worktrees Claude Code creates](/agent-configuration/agent-worktrees/) land, and what the repository lacks, or carries, that breaks them.

| Finding | What is missing |
| --- | --- |
| `worktrees-in-repository` | nothing missing: an agent worktree sits inside the repository under `.claude/worktrees/`, reported once per worktree, with `git worktree move` to a sibling `<repository>.worktrees/` directory as the repair and [`enhance-buddy-agent-harness`](/skills/enhance-buddy-agent-harness/#agent-worktrees) offering the guidance that keeps new ones out |
| `worktrees-untracked` | a `.gitignore` rule for `.claude/worktrees/`, so every agent worktree shows as untracked in `git status` |
| `worktrees-self-ignored` | nothing missing: `biome.json` excludes `.claude/worktrees`, and inside an agent worktree there that exclusion matches every file, so Biome processes nothing; the repair replaces it with `vcs.useIgnoreFile` |
| `worktree-base-unset` | `worktree.baseRef` in `.claude/settings.json`, so agent worktrees branch from the default branch |

An explicit `"fresh"` is the owner's choice and is not reported. Every finding but `worktrees-in-repository` is offered by the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/). Why each one matters is on [Agent Worktrees](/agent-configuration/agent-worktrees/).

## Exit codes

`doctor` exits `0` even when it has findings. The diagnosis succeeded, and a non-zero code reads to an agent as "this command is broken, try something else." A `--strict` flag for CI, the one caller that genuinely wants a failing process, is not implemented yet.

It exits `1` when the diagnosis itself fails, and `2` on a usage error: an unknown option, an unknown `--harness` name (`unsupported-harness`), or a `--format` other than `toon`, `json`, or `text`. Every failure is a coded report on stdout (`error`, `code`, and `help` lines), not prose on stderr.

## No `--fix`

Every repair is already expressible with an existing command, and each finding names the exact one — or says plainly, with an empty `command`, that no command does it:

| Finding | Repair |
| --- | --- |
| `no-canonical` | `buddy-agent-harness init` |
| `missing` | `buddy-agent-harness init` |
| `degraded` | `buddy-agent-harness init --copy --force` |
| `stale` | `buddy-agent-harness init --force` |
| `diverged-bridge`, `diverged-canonical` | `buddy-agent-harness sync` |
| `diverged-both`, `diverged-unknown` | `buddy-agent-harness sync`, then a pick for each file it leaves, through `sync --resolve`; no `command` |
| `unpinned-copy` | `git ls-files -z <path> \| xargs -0 git update-index --skip-worktree && echo /<path>/ >> "$(git rev-parse --git-path info/exclude)"` |
| `no-instructions` | `/buddy-agent-harness:init-buddy-agent-harness` |
| `instructions-missing` | `/buddy-agent-harness:init-buddy-agent-harness` |
| `instructions-unbridged` | `/buddy-agent-harness:init-buddy-agent-harness` |
| `instructions-shadowing` | `/buddy-agent-harness:init-buddy-agent-harness` |
| `instructions-superseded` | `/buddy-agent-harness:init-buddy-agent-harness`, which offers the removal |
| `instructions-unreadable` | Fix the JSON by hand, then `/buddy-agent-harness:init-buddy-agent-harness` |

`no-canonical` is the one finding that is not about a bridge: `.agents/skills` itself is absent, so nothing can resolve into it. `no-instructions` is its counterpart for `AGENTS.md`. `unpinned-copy` is the [copy protection](#the-skip-worktree-bit) case, and it is reported against a bridge whose status is still `ok`.

Every instruction repair names a skill rather than a shell command, because no shell command does the job. They carry an empty `command` for exactly that reason, so a caller never has to work out which rows it can run.

A `--fix` flag would reimplement that logic and drift from it. On the Windows case it would likely reimplement it wrongly: the naive repair is to recreate the link, which is precisely the operation that already failed on that machine. `--copy` is the branch that works there. The three-way divergence case has no safe automatic answer at all, which is why `sync` leaves each such file for a pick.
