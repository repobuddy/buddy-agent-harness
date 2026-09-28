---
'buddy-agent-harness': minor
---

`buddy-agent-harness mcp project` writes your golden MCP server set (`.agents/buddy-agent-harness/mcp.toml`) into each enabled harness's own MCP file: `.mcp.json`, `.cursor/mcp.json`, `.codex/config.toml`, and `.gemini/settings.json`. It is a dry run unless you pass `--write`.

```
actions:
  target                 server  action  detail
  .mcp.json              fs      add     creates the file
  .codex/config.toml     old     refuse  transport: Codex supports no SSE transport
  .gemini/settings.json  linear  add     appends the server
```

- **Each harness gets its own spelling.** You write a reference once as `${NAME}`. Cursor gets `${env:NAME}`. Claude Code and Gemini CLI take it as written. Codex gets `env_vars`, `env_http_headers`, or `bearer_token_env_var`. A timeout in milliseconds becomes Codex's `tool_timeout_sec`.
- **It refuses rather than guesses.** A server a harness cannot hold as written is refused, and the refusal names the field. So is a golden entry holding a literal credential.
- **It never overwrites your edits.** A server changed on the harness side is skipped.
- **It keeps the rest of the file.** Every byte outside the entry it writes stays as it was, comments included. It will not rewrite an entry in place in a shared file, or an entry that holds a comment. It lists those changes for you to apply instead.
- **It records what it wrote.** `--write` writes `.agents/buddy-agent-harness/mcp.projected.json`, which `doctor` already reads to tell which side moved.

The `repair` skill now handles `mcp-unprojected` and `mcp-diverged-golden`: it shows the plan and runs the command once you approve.

`doctor` now reads each harness's MCP file in that harness's own format:

- A Gemini CLI `url` reads as SSE, and `httpUrl` as streamable HTTP.
- A Codex server's headers, passed-through variables, and timeout are compared instead of ignored.
- A golden field a harness has no place for, such as Cursor and `description`, is no longer reported as drift.
