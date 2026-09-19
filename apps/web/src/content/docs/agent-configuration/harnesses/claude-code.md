---
title: Claude Code
description: Claude Code needs a skills projection, and reads AGENTS.md itself unless a CLAUDE.md beside it suppresses it.
---

Claude Code is the only supported harness that does not read `.agents/skills/`, so it is the only one a projection is written for. Instructions are the opposite case: it reads `AGENTS.md` where it lies, and the thing to watch is a file that stops it.

## Skills need a projection

`buddy-agent-harness init` creates this:

```text
.claude/skills → ../.agents/skills
```

The link is at the directory level, so a skill added to `.agents/skills/` later appears in Claude Code with no further action.

Claude Code documents symlinks at the *per-skill* level: a `<skill-name>` entry may point elsewhere on disk, and a skill reachable from several locations is loaded once. Linking the `.claude/skills` directory itself is undocumented but verified working, and is preferred because it is live. Treat it as supported in practice rather than guaranteed by contract. If the directory-level link ever fails, fall back to per-skill symlinks (`.claude/skills/<name>` → the canonical skill directory), which are the documented form.

## Instructions need nothing written

From v2.1.277, Claude Code reads `AGENTS.md` as the project's instructions. The vendor states it directly: "Claude Code can read `AGENTS.md` as your project instructions, so a repository already set up for other coding agents works without adding a `CLAUDE.md`, an import, or a setting."

Nothing is written for this, and nothing should be. A repository that consolidated onto `AGENTS.md` is already done.

### A CLAUDE.md beside it suppresses it

The default is conditional, and the condition is the part that costs you instructions. Claude reads `AGENTS.md` only when there is no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` in the working directory or any directory above it. Where one of those sits beside an `AGENTS.md`, Claude reads it **instead** and never sees `AGENTS.md`.

Three files are exempt from that check and load alongside whatever wins it: your `~/.claude/CLAUDE.md`, an organization's managed `CLAUDE.md`, and `.claude/rules/` files.

So a `CLAUDE.md` carrying content of its own is the failure, and it is silent: nothing is missing, nothing errors, and the file the rest of the repository maintains is simply not read. Consolidate what it says into `AGENTS.md`. Where the file has to stay — a gitignored `CLAUDE.local.md` holding one person's preferences — open it with an `@AGENTS.md` import, which delivers the canonical file above whatever follows.

A `CLAUDE.md` that is only an `@AGENTS.md` import, or a symlink to `AGENTS.md`, still delivers it and is not read twice. It is the bridge this project used to write, and it is now redundant rather than harmful.

One Windows detail survives from that era. On a checkout without symlink support, Git writes a symlinked `CLAUDE.md` as a regular file whose entire content is the target path: the literal text `AGENTS.md`. That file carries content of its own, so it shadows rather than bridges, and Claude reads one word where the instructions should have been.

### Nested files need no stub

At session start Claude reads every `AGENTS.md` and `.claude/AGENTS.md` in the working directory and the directories above it. Below it, a subdirectory's `AGENTS.md` is read when Claude opens a file there with the Read tool and that subdirectory has none of the three `CLAUDE.md` files of its own. A monorepo therefore needs nothing placed beside each nested `AGENTS.md`.

### Sessions that still need the import

Reading `AGENTS.md` directly requires Claude Code v2.1.277 or later, and it is additionally unavailable in sessions that do not fetch feature flags: a third-party provider such as Amazon Bedrock, telemetry disabled, the first session after an install or upgrade, and where hooks or the built-in `agents-md` plugin are disabled. The vendor's remedy for those sessions is the old import:

```markdown
<!-- CLAUDE.md -->
@AGENTS.md
```

That is why an import-only `CLAUDE.md` is offered for removal rather than removed. It works everywhere, and in those sessions it is the only thing that does.

Two observability differences come with reading `AGENTS.md` directly rather than through an import: it is not listed in `/memory` or `/context`, and `InstructionsLoaded` hooks do not fire for it. Both still hold for an imported file.

### The setting is not a repository's to set

A **Project instructions** setting chooses between `claude-md-or-agents-md` (the default described above), `claude-md-and-agents-md`, `claude-md`, and `managed-only`. It is read from `~/.claude/settings.json`, a `--settings` file, or managed settings only — Claude Code ignores it in project and local settings files. A repository cannot set it for its contributors, so write for the default.

## How CLAUDE.md files load

Where `CLAUDE.md` files are in play, Claude Code walks up the directory tree from the working directory, and:

> All discovered files are concatenated into context rather than overriding each other. Across the directory tree, content is ordered from the filesystem root down to your working directory... so instructions closer to where you launched Claude are read last.

Files *below* the working directory are not loaded at launch; they are included when Claude reads files in those subdirectories. Conflicts are explicitly undefined: if two files disagree, "Claude may pick one arbitrarily."

This is additive, where the `AGENTS.md` standard specifies nearest-file-wins. [Harness Differences](/agent-configuration/harness-differences/#nested-instruction-files-resolve-differently) covers what that means for authoring nested files.

`claudeMdExcludes` skips specific files by absolute-path glob, at any settings layer, with arrays merging across layers. It is the lever for a monorepo where ancestor files are irrelevant, but it removes whole files rather than resolving conflicts between them.

## Frontmatter

Claude Code recognizes the most frontmatter fields of any harness: `context: fork`, `agent:`, `disable-model-invocation`, `once`, and `${CLAUDE_SKILL_DIR}` expansion. Every other harness drops them silently.

Two rules follow:

- **Restate anything load-bearing in the Markdown body.** A behavior that exists only in a Claude-specific field does not exist anywhere else. See [Portable Skills](/agent-configuration/portable-skills/).
- **Keep `name` equal to the directory name.** Claude Code treats `name` as a display label only and resolves the invoking command from the directory name. Matching them removes the discrepancy.

## Commands migrate to skills

`.claude/commands/*.md` are portable and move to `.agents/skills/<name>/SKILL.md`. Claude Code has merged commands into skills, so this follows the harness rather than fighting it.

## Left canonical-only

These are reported and left in place:

- `.claude/agents/` (subagents), `.claude/rules/`, `.claude/output-styles/` — no cross-harness format exists to convert them into
- hook blocks in `.claude/settings.json` — event names differ by case across harnesses
- MCP server definitions in `.mcp.json` and `.claude/settings.json` — a cross-harness mapping does exist, but it is lossy

[What stays canonical](/reference/configuration-layout/#what-stays-canonical) has the reasoning for each.

`.claude/settings.json` is strict JSON: a comment in it is a parse error, and the file is then rejected as a whole. This is the opposite of Gemini CLI's settings file, where comments are legal and a rewrite destroys them. See [JSON configuration disagrees about comments](/agent-configuration/harness-differences/#json-configuration-disagrees-about-comments).

## Reference

- [Claude Code: skills](https://code.claude.com/docs/en/skills)
- [Claude Code: how Claude remembers your project](https://code.claude.com/docs/en/memory): when `AGENTS.md` is read and what suppresses it, the **Project instructions** setting, `CLAUDE.md` load order, `claudeMdExcludes`, and the `@AGENTS.md` import
