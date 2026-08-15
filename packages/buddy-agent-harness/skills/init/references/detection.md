# Detection

What to look for during the survey, and where each finding belongs.

| Class | Look for | Disposition |
| --- | --- | --- |
| Instructions | `AGENTS.md`, `.agents/AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `.github/instructions/**`, `GEMINI.md`, `.windsurfrules` | consolidate into `AGENTS.md`; confirm before replacing anything |
| Skills | `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.github/skills/`, `.windsurf/skills/`, `.gemini/skills/` | move to `.agents/skills/`, fix frontmatter, then link back |
| Commands | `.claude/commands/*.md`, `.cursor/commands/*.md` | move to `.agents/skills/<name>/SKILL.md`. Claude Code has merged commands into skills, so this follows the harness rather than fighting it |
| Subagents | `.claude/agents/` | canonical-only — no cross-harness format exists. Report; leave in place |
| Rules | `.cursor/rules/**.mdc`, `.claude/rules/`, `.windsurf/rules/` | canonical-only — `.mdc` and `.md` are not interchangeable, and path-scoping syntax differs. Report |
| MCP servers | `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.claude/settings.json` | canonical-only. Report; never convert between formats |
| Hooks, LSP, output styles | hook blocks in settings files, `.claude/output-styles/` | canonical-only. Hook event names differ by case across harnesses, so no safe projection exists. Report |

For every entry, record which of three states it is in:

- a real file or directory the user authored,
- a symlink already resolving into `.agents/` — a previous run, skip it,
- something occupying a projection target that is neither — a conflict to surface in Phase 3.

## Choosing harnesses

The enabled set is the union of three sources: Claude Code and Cursor unconditionally, any harness whose detection directory already exists, and any the user names with `--harness`. `init` detects the second group itself — you do not need to pass it.

There is no way to disable a harness. Never offer the user a choice that excludes Claude Code or Cursor; `init` enables them whatever the answer, so the question would be a fiction.

Enabling a harness is not the same as writing files for it. Most enabled harnesses read `.agents/skills/` natively and receive nothing — see `harnesses.md` for which ones get a projection. Report both facts, because only the projections are a real diff.

`.agents/repobuddy/config.json` records the last run under a `harnesses` key; nothing reads it back. Never infer the current enabled set from it, and expect a stale or hand-edited `harnesses` value to be silently rewritten.

The file is shared with repobuddy and its other plugins. `init` owns only the `harnesses` key and preserves the rest, so **never rewrite this file wholesale** — you would discard another plugin's configuration.

Detecting a harness directory means the repository has configuration to reconcile. It does not by itself mean the user wants that harness maintained — say which harnesses you are enabling and why, and let the user correct the part that is actually variable.
