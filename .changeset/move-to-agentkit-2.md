---
'buddy-agent-harness': major
---

Moves to `cyber-agentkit` 2.0. `reference show` is now `reference load` and `reference select` is now `reference customize`. The `--scope project` option is now `--scope repo`, and references are read from the repository root. `reference load` exits 0 for a name it did not find. `list --trace` rows carry `kind: selection` where they had `selection: true`.
