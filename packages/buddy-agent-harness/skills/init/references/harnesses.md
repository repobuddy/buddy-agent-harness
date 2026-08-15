# Harness routing

Which harnesses need work beyond the baseline in `standard.md`. Read only the `<harness>.md` files for harnesses you are actually enabling.

| Harness | Skills projection | Instruction bridge | Details |
| --- | --- | --- | --- |
| Codex | none | none | `codex.md` |
| Cursor | none | none written; one gap to report | `cursor.md` |
| GitHub Copilot CLI | none | none | `copilot-cli.md` |
| Devin Desktop | none | none | `devin-desktop.md` |
| Claude Code | `.claude/skills` | `CLAUDE.md` with `@AGENTS.md` | `claude-code.md` |
| Gemini CLI | `.gemini/skills` | `.gemini/settings.json` edit | `gemini-cli.md` |

**Only Claude Code and Gemini CLI need a projection.** Everything else reads the canonical directory.

Antigravity and VS Code are also native readers and are not registry entries — never write anything for them. Do not treat a `.vscode/` directory as a signal that any harness needs configuring.

## Division of labour

`buddy-agent-harness init` writes **skills projections only**. Every instruction bridge above is manual work in Phase 4.

Projections are directory-level symlinks to `../.agents/skills`. Where links are unavailable the CLI copies instead — a copy is a snapshot, not a live projection, so say so when you fall back.

## Report accurately

- Enabling a harness is not the same as writing files for it. Report which harnesses were enabled and which received an actual projection — only the projections are a real diff.
- Flag **Cursor's instruction gap** as contested — it is not confirmed from Cursor's own documentation. See `cursor.md`.
- If a repository uses the deprecated `windsurf` name, say it was rebranded to Devin Desktop and that its projection is now legacy compatibility. See `devin-desktop.md`.
