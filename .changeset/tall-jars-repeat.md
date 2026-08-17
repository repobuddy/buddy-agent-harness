---
'buddy-agent-harness': minor
---

Add `--format text` to `init` and `doctor`.

TOON stays the default because it is what an agent parses. `--format text` renders the same result for a person: scalars as `key: value`, each collection of records as a table with its columns aligned, and lists of names as bullets.

`--format` now rejects an unknown value with `--format must be toon, json, or text.`
