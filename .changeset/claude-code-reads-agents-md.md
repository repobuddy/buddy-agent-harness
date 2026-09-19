---
'buddy-agent-harness': minor
---

Claude Code reads `AGENTS.md` itself from v2.1.277, so the `CLAUDE.md` import bridge is gone from the model.

`init` writes no `CLAUDE.md` — not at the root, and not beside a nested `AGENTS.md`. Its instruction work is consolidation instead: a `CLAUDE.md` holding content of its own is now the urgent finding, because Claude Code reads it *instead of* `AGENTS.md`, and it is consolidated and removed on approval rather than left behind as a generated copy. A `CLAUDE.md` that is only `@AGENTS.md`, or a symlink to it, is offered for removal and kept on a no — the import is still the only way in for sessions that cannot read `AGENTS.md` directly, such as a third-party provider or a version before v2.1.277.

`doctor` reports two new findings in the `instructions` section: `instructions-shadowing` for a file read instead of the `AGENTS.md` beside it, and `instructions-superseded` for a bridge that still works and is no longer needed. Both are checked per directory holding an `AGENTS.md`, for `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`. It no longer reports a missing `CLAUDE.md`.

Gemini CLI is now the only harness in the registry that needs an instruction bridge. Nothing changes about skills projections: Claude Code still needs `.claude/skills`.
