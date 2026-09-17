---
"buddy-agent-harness": minor
---

`listMcpServers` now also reads VS Code, Windsurf (under `devin-desktop`), OpenCode, and Zed at every scope those hosts document; Claude Code's project-local servers nested in `~/.claude.json`; and the MCP servers an installed Claude Code plugin ships, gated on whether that plugin is enabled for the project. `McpServerEntry.scope` gained `'local'` and `'plugin'`, and `McpServerEntry` gained an optional `plugin` field naming the plugin id. `ListMcpServersOptions` gained an optional `platform` override so the VS Code user directory is testable on every OS.
