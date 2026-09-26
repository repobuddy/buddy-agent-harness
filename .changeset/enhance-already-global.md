---
'buddy-agent-harness': minor
---

The `enhance` skill no longer offers a section that your agent already reads from your global instructions. When the repository's `AGENTS.md` lacks an addition but instructions loaded from outside the repository carry its current text, the verdict is *already global*. Nothing is offered, and the report says a repository copy would reach your team but give you the text twice. The skill writes that copy only if you ask for it. When both places carry the text, the report names the duplicate.

The global destination it recommends is now `~/.agents/AGENTS.md`. The skill also says that a harness reads that file only through its own user-scope file, such as `~/.claude/CLAUDE.md` on Claude Code.
