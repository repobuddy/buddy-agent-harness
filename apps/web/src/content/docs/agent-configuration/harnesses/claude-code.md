---
title: Claude Code
description: Claude Code reads neither .agents/skills nor AGENTS.md — both bridges are required.
---

Claude Code is the only supported harness that reads **neither** canonical format. It reads `.claude/skills/` for capabilities and `CLAUDE.md` for instructions. Both bridges are required, and only one of them is written for you.

## Bridge 1 — skills

`buddy-agent-harness init` creates this:

```text
.claude/skills → ../.agents/skills
```

The link is at the directory level, so a skill added to `.agents/skills/` later appears in Claude Code with no further action.

Claude Code documents symlinks at the *per-skill* level — a `<skill-name>` entry may point elsewhere on disk, and a skill reachable from several locations is loaded once. Linking the `.claude/skills` directory itself is undocumented but verified working, and is preferred because it is live. If the directory-level link ever fails, fall back to per-skill symlinks (`.claude/skills/<name>` → the canonical skill directory), which are the documented form.

## Bridge 2 — instructions

The CLI does **not** write this one. Create it by hand, or let the [`init` skill](/guides/initialize/) do it:

```markdown
<!-- CLAUDE.md -->
@AGENTS.md
```

Claude-specific notes may follow below the import.

`ln -s AGENTS.md CLAUDE.md` also works, but **prefer the import** — on Windows a symlink needs Administrator or Developer Mode, and the import states the relationship in a file anyone can read.

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
- hook blocks in `.claude/settings.json` — event names differ by case across harnesses
- MCP server definitions

## Reference

- [Claude Code: skills](https://code.claude.com/docs/en/skills)
