---
'buddy-agent-harness': minor
---

The `enhance` skill now recommends the owner's own global instruction file for the `## Delegation` section, rather than the repository's `AGENTS.md`.

Nothing in that text is about the repository in front of it: it says how to work with subagents, which holds in every repository the owner opens. Copying it into each one is a copy per repository to keep in step — the drift this package exists to remove, one level up from the file it removes it in. So an addition now declares where it belongs, the offer leads with that destination, and the alternative is named with what each one buys: the global file reaches every repository the owner opens and nobody else, and the project file reaches everyone who clones it at the cost of a copy per repository.

Where the agent's own always-loaded instructions already carry the text, the offer says so — the repository copy then adds the team and nothing else, and the owner carries the text twice. That is stated, not decided.

A global placement is handed over rather than written. The skill still writes the root `AGENTS.md` and nothing else, so it gives the text and the path and stops; on Claude Code that path is `~/.claude/CLAUDE.md`. Where the harness in use documents no user-scope instruction file, no path is guessed.
