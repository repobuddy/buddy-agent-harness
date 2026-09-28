---
'buddy-agent-harness': minor
---

`buddy-agent-harness mcp reconcile` pulls a change made in a harness's MCP file back into your golden set (`.agents/buddy-agent-harness/mcp.toml`), one approved field at a time. It is a dry run unless you name a field with `--accept`.

```
fields:
  path                                          action  value
  .mcp.json#servers.linear.command              import  command = "bunx"
  .mcp.json#servers.docs.url                    import  url = "https://docs"
  .mcp.json#servers.docs.headers.Authorization  refuse
```

```sh
buddy-agent-harness mcp reconcile --accept '.mcp.json#servers.linear.command'
```

- **One field per approval.** There is no approve-all. A server the golden set lacks is added from the fields you approve, and one of them must be its `command` or `url`.
- **Conflicts stay yours.** A field both sides changed, or one no baseline can place, is reported and never imported.
- **No credentials.** A literal credential is refused and never shown. The server's other fields are still offered, so you can reference the secret as `${VAR}`.
- **Harness defaults are not your edits.** A Codex or Gemini CLI timeout equal to that harness's default is not imported.
- **Each harness's spelling comes back as `${NAME}`.** That covers Cursor's `${env:NAME}` and Codex's `bearer_token_env_var`.
- **Your comments stay.** The golden set is edited in place, not rewritten. A field it spreads over a sub-table is listed for you to apply by hand.

The `repair` skill now handles `mcp-diverged-target` and `mcp-undeclared`. It offers each field on its own and passes only the ones you approve.
