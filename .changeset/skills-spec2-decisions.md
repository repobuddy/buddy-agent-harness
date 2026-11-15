---
"buddy-agent-harness": minor
---

The `init-buddy-agent-harness`, `repair`, and `enhance` skills now follow the owner-approved design specs.

- `init-buddy-agent-harness` asks, for each harness instruction file it consolidated other than `CLAUDE.md`, whether to delete it, replace it with a pointer to `AGENTS.md`, or leave it as it is. It never writes a copy of `AGENTS.md` in its place, and offers deletion only when every harness that read the file reads `AGENTS.md` after the run (`GEMINI.md` only with the `context.fileName` entry). A declined step leaves the file byte-identical.
- `init-buddy-agent-harness` shows you each skills-copy file changed on both sides, asks which side wins, and writes nothing for a file you do not answer, then reruns `sync --resolve` with your picks.
- `init-buddy-agent-harness` now ends by listing the `doctor` findings that `repair` owns and offering once to continue with `repair`, before it offers `enhance`.
- The agent-worktree settings are offered by `init-buddy-agent-harness` only, where the repository has a `.claude/` directory or you named Claude Code. `enhance` no longer offers them, and writes only the root `AGENTS.md` and `~/.agents/AGENTS.md`.
- `repair` now syncs a skills copy that drifted from `.agents/skills`, asking which side wins for each file both sides changed, and restores a tracked copy's protection. "Sync the `.claude/skills` copy that drifted" reaches it.
- `repair` reports two new outcomes: "needs your decision" for a finding no skill owns, and "for you to do outside the repo" for a step in your home directory. It never repeats a literal MCP credential, reports a server the projection refuses with the reason, and applies a hand edit with only that server's entry changed.
- Each of the three skills now ends with a `Done when` checklist.
