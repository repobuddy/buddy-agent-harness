---
title: Claude Code
description: Claude Code reads neither .agents/skills nor AGENTS.md, so both bridges are required.
---

Claude Code is the only supported harness that reads **neither** canonical format. It reads `.claude/skills/` for capabilities and `CLAUDE.md` for instructions. Both bridges are required, and only one of them is written for you.

## Bridge 1: skills

`buddy-agent-harness init` creates this:

```text
.claude/skills → ../.agents/skills
```

The link is at the directory level, so a skill added to `.agents/skills/` later appears in Claude Code with no further action.

Claude Code documents symlinks at the *per-skill* level: a `<skill-name>` entry may point elsewhere on disk, and a skill reachable from several locations is loaded once. Linking the `.claude/skills` directory itself is undocumented but verified working, and is preferred because it is live. Treat it as supported in practice rather than guaranteed by contract. If the directory-level link ever fails, fall back to per-skill symlinks (`.claude/skills/<name>` → the canonical skill directory), which are the documented form.

## Bridge 2: instructions

The CLI does **not** write this one. Create it by hand, or let the [`init` skill](/skills/init/) do it:

```markdown
<!-- CLAUDE.md -->
@AGENTS.md
```

Claude-specific notes may follow below the import.

`ln -s AGENTS.md CLAUDE.md` also works, but **prefer the import**. The vendor documentation gives the same advice, for the same reason: "On Windows, creating a symlink requires Administrator privileges or Developer Mode, so use the `@AGENTS.md` import instead."

The failure mode is worth stating plainly, because it is silent. On a Windows checkout without symlink support, Git writes a symlinked `CLAUDE.md` as a regular file whose entire content is the target path: the literal text `AGENTS.md`. Claude Code reads that as the repository's instructions. Nothing errors, and no warning placed in `AGENTS.md` can help, because Claude never reaches it.

## How CLAUDE.md files load

Claude Code walks up the directory tree from the working directory, and:

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

These are reported and left in place, because no safe cross-harness mapping exists:

- `.claude/agents/` (subagents), `.claude/rules/`, `.claude/output-styles/`
- hook blocks in `.claude/settings.json` (event names differ by case across harnesses)
- MCP server definitions

`.claude/settings.json` is strict JSON: a comment in it is a parse error, and the file is then rejected as a whole. This is the opposite of Gemini CLI's settings file, where comments are legal and a rewrite destroys them. See [JSON configuration disagrees about comments](/agent-configuration/harness-differences/#json-configuration-disagrees-about-comments).

## Reference

- [Claude Code: skills](https://code.claude.com/docs/en/skills)
- [Claude Code: how Claude remembers your project](https://code.claude.com/docs/en/memory): CLAUDE.md load order, `claudeMdExcludes`, and the `@AGENTS.md` import
