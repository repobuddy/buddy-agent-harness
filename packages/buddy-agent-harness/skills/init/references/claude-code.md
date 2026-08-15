# Claude Code

Reads neither `.agents/skills/` nor `AGENTS.md`. **Both bridges are required.**

## Bridge 1 — skills

`buddy-agent-harness init` creates this:

```
.claude/skills → ../.agents/skills
```

If the directory-level link ever fails, fall back to documented per-skill symlinks (`.claude/skills/<name>` → the canonical skill directory).

## Bridge 2 — instructions

`init` does **not** do this. Create by hand:

```markdown
<!-- CLAUDE.md -->
@AGENTS.md
```

Claude-specific notes may follow below the import.

`ln -s AGENTS.md CLAUDE.md` also works, but **prefer the import** — on Windows a symlink needs Administrator or Developer Mode.

## Frontmatter

Claude Code recognizes the most fields (`context: fork`, `agent:`, `disable-model-invocation`, `once`, `${CLAUDE_SKILL_DIR}`). Other harnesses drop them silently.

- Restate anything load-bearing in the Markdown body.
- **Enforce `name` equal to the directory name.** Claude Code treats `name` as a display label only and resolves the command from the directory name; matching them removes the discrepancy.

## Leave alone — canonical-only

Report these and do not convert them:

- `.claude/agents/` (subagents), `.claude/rules/`, `.claude/output-styles/`
- hook blocks in `.claude/settings.json` — event names differ by case across harnesses
- MCP server definitions

## Commands

`.claude/commands/*.md` are **portable** — migrate to `.agents/skills/<name>/SKILL.md`. Claude Code has merged commands into skills, so this follows the harness rather than fighting it.
