# Conclusion — The Golden Set's Filename Is Safe

**No canonical MCP configuration location is standardizing, and the one converging in practice is
already taken.**

The specification is silent on where configuration lives (E-MCP-06), and the proposals that would
change that are open, unratified, and about the file's *shape* rather than its *home* (E-MCP-07).
The AGENTS.md standard does not address MCP at all.

What is converging is a filename, not a directory: `<repo-root>/.mcp.json`, which Visual Studio
documents reading alongside Cursor's and VS Code's paths (E-MCP-08). That path is Claude Code's own
project config in Claude Code's own shape, so it was never available to a superset file. The
question that could have forced a rename resolves the other way.

**`.agents/buddy-agent-harness/mcp.toml` stands.** The tool-namespaced path collides with nothing
documented, and the only outside proposal for an `.agents/`-rooted MCP file wants the unqualified
`.agents/mcp.json` (E-MCP-09) — the exact name issue #54 declined to squat, for the exact reason it
gave.

## What this fixes in the registry

Project scope, primary-sourced, for the harnesses this project supports:

| Harness | Project-scope MCP file | Key | Format |
| --- | --- | --- | --- |
| Claude Code | `.mcp.json` | `mcpServers` | JSON |
| Cursor | `.cursor/mcp.json` | `mcpServers` | JSON |
| Codex | `.codex/config.toml` | `mcp_servers` | TOML |
| Gemini CLI | `.gemini/settings.json` | `mcpServers` | JSON |
| Copilot CLI | none documented (E-MCP-11) | — | — |
| Devin Desktop | none documented | — | — |

Two of those files hold far more than MCP configuration — `.gemini/settings.json` also carries the
instruction bridge (E-MCP-10) — so a reader must take the key it wants and leave the rest alone,
and a writer must never rewrite the file wholesale.

## What to watch

SEP-2633 and discussion #2218. If either is accepted **with** a stated directory convention, that
is the first primary-sourced answer to the location question and the trigger to revisit. Vendor-by-
vendor convergence is not that trigger; a ratified proposal is.

Separately, the unconfirmed report that Copilot CLI gained a project-scope MCP file (E-MCP-11) is
worth re-checking against GitHub's own documentation before Copilot CLI is left out again.
