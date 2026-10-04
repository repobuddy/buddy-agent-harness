---
'buddy-agent-harness': patch
---

The `reference` command, its skill script, and the reference exports now come from the new `buddy-agent-reference` package, which `buddy-agent-harness` depends on and re-exports. Nothing changes for a user: the same tiers, output, and exit codes, and the same library exports and options.
