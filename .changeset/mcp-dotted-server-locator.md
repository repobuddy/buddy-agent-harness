---
'buddy-agent-harness': patch
---

`doctor` names a dotted MCP server in full in its repair.

A finding's locator addresses a place inside a file — `.cursor/mcp.json#servers.linear.command` — and the two membership repairs recovered the server name from it by splitting on `.` and taking the last segment. For `.codex/config.toml#servers.io.github.foo` that gave `foo`, a server present in neither file, so the repair for an `mcp-unprojected` or `mcp-undeclared` finding named something the user could not act on. `io.github.*` is a common way to name an MCP server.

The file, server, and field now travel with the finding as parts and are assembled into the locator at the one place that renders it. Nothing splits a locator back apart, because no separator survives the dotted case.
