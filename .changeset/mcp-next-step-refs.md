---
"buddy-agent-harness": patch
---

`mcp project` and `mcp reconcile` now give their next-step command through clibuilder's `ref()`, so the command line is checked against the CLI's command tree. With no golden set, `mcp project` answers two `help` lines: what to create, then ``Run `buddy-agent-harness mcp project` to preview the projection``. A rejected `mcp reconcile --accept` says ``Run `buddy-agent-harness mcp reconcile` to list the fields that can be approved``.
