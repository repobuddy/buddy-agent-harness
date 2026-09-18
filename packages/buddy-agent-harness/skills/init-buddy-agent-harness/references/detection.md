# Detection

What to look for during the survey, and where each finding belongs.

| Class | Look for | Disposition |
| --- | --- | --- |
| Instructions | `AGENTS.md`, `.agents/AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `.github/instructions/**`, `GEMINI.md`, `.windsurfrules` | consolidate into `AGENTS.md`; confirm before replacing anything |
| Nested instructions | `**/AGENTS.md` below the root, and any `**/CLAUDE.md` beside one | canonical and scoped — report, never merge upward. Bridging is per directory and per approval; see `agents-md.md` |
| Skills | `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.github/skills/`, `.windsurf/skills/`, `.gemini/skills/` | move to `.agents/skills/`, fix frontmatter, then link back |
| Commands | `.claude/commands/*.md`, `.cursor/commands/*.md` | move to `.agents/skills/<name>/SKILL.md`. Claude Code has merged commands into skills, so this follows the harness rather than fighting it |
| Subagents | `.claude/agents/` | canonical-only — no cross-harness format exists. Report as having no candidate at all, so the list is not read as pending work; leave in place |
| Rules | `.cursor/rules/**.mdc`, `.claude/rules/`, `.windsurf/rules/` | offer a skill where the paths a rule names are incidental to what it says; leave it where the path scoping is the point. `.mdc` and `.md` are not interchangeable and path-scoping has no `AGENTS.md` equivalent, so the choice is the owner's — ask per rule |
| MCP servers | `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.claude/settings.json` | canonical-only. Report; never convert between formats. A mapping between them exists but is not lossless, and applying it means inventing fields the source did not carry |
| Hooks, LSP, output styles | hook blocks in settings files, `.claude/output-styles/` | canonical-only. Hook event names differ by case across harnesses, so no safe projection exists. Report |

`doctor` reports every artifact only one harness can read, each with the canonical form it is a candidate for. That report is the list — the table above says what each class *is*, and the command says what this repository actually has. Do not derive a second list by walking these paths yourself.

For every entry, record which of three states it is in:

- a real file or directory the user authored,
- a symlink already resolving into `.agents/` — a previous run, skip it,
- something occupying a projection target that is neither — a conflict to surface in Phase 3.

## Choosing harnesses

The enabled set is the union of three sources: Claude Code and Cursor unconditionally, any harness whose detection directory already exists, and any the user names with `--harness`. `init` detects the second group itself — you do not need to pass it.

There is no way to disable a harness. Never offer the user a choice that excludes Claude Code or Cursor; `init` enables them whatever the answer, so the question would be a fiction.

Enabling a harness is not the same as writing files for it. Most enabled harnesses read `.agents/skills/` natively and receive nothing — see the table in `SKILL.md` for which ones get a projection. Report both facts, because only the projections are a real diff.

`init` records nothing on disk about a run. The enabled set is recomputed from detection every time, so a stored copy could only ever go stale or contradict what is actually there. The command's own output is the report — read it, do not look for a file.

Antigravity and VS Code are native readers and are not registry entries — never write anything for them. Do not treat a `.vscode/` directory as a signal that any harness needs configuring.

Detecting a harness directory means the repository has configuration to reconcile. It does not by itself mean the user wants that harness maintained — say which harnesses you are enabling and why, and let the user correct the part that is actually variable.
