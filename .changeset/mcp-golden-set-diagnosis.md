---
'buddy-agent-harness': minor
---

`doctor` diagnoses a golden MCP server set.

A repository may now keep one canonical MCP server per entry at `.agents/buddy-agent-harness/mcp.toml`, in the superset of fields the supported hosts accept. Where that file exists, `doctor` compares it against each harness's own project-scope MCP configuration — Claude Code's `.mcp.json`, Cursor's `.cursor/mcp.json`, Codex's `.codex/config.toml`, and Gemini CLI's `.gemini/settings.json` — and reports how the two have drifted, in either direction. No golden set means no MCP findings, and `init` still converts nothing.

Comparison is semantic rather than textual: no two of those files ever share bytes, so each side is parsed into one model. A field the golden set leaves unset is never a difference, because a host restating its own default cannot be told apart from a deliberate edit. Direction comes from a last-projected record where there is one and from git history for a tracked target, and is reported as unknown rather than guessed when neither answers.

`doctor` also reports a literal credential sitting in any of those files, including the golden set. A finding carries the file, the server, and the field and never the value — no truncated preview either — and an unreadable golden set is reported by line and column, because a parser's own message quotes the line that holds the secret. A literal in a tracked file is reported as committed, and its repair is to rotate the credential rather than to move it.

`doctor` remains read-only. Projecting the golden set into a harness and reconciling a harness-side edit back into it are writes and are not part of this change.
