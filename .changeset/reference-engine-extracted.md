---
'buddy-agent-harness': minor
---

The `reference` command, its skill script, and the reference exports now come from `@cyberuni/agent-harness`. The same tiers, output, and exit codes, and the same library exports and options. The command gains `reference delete`, which removes the project or user copy of a reference and reports which copy answers the name afterwards; it never deletes a plugin-shipped or managed copy.
