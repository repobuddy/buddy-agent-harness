---
"buddy-agent-harness": minor
---

Export `listMcpServers` — a redaction-safe inventory of every MCP server configured across the supported harnesses, for a project directory and (where a harness documents one) an injectable home directory.

It reuses `diagnoseMcp`'s own parsing, model, and secret-redaction rather than re-implementing them, and it never surfaces a credential: `command` is trimmed to its basename, `args` drops any `--flag=value` pair a credential-bearing flag would carry literally, and `url` is trimmed to its origin and path. `env` and `headers` are not returned at all.

Unlike `doctor`, which stays project-scope only by design, this export also reads the user-scope MCP configuration each harness documents — Codex and Copilot CLI resolve theirs through `CODEX_HOME`/`COPILOT_HOME` first. It changes nothing about what `doctor` itself reads.

This is meant for a consumer that wants to bundle an MCP inventory without pulling in this package's CLI: the module this ships from imports nothing from `clibuilder`.
