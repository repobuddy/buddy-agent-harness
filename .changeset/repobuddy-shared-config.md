---
'buddy-agent-harness': minor
---

Write the configuration record to `.agents/repobuddy/config.json`, and merge instead of overwriting.

This package is a plugin in the repobuddy ecosystem, so it now writes to the shared `.agents/repobuddy/config.json` rather than a package-specific `.agents/buddy-agent-harness/config.json`.

Because the file is shared, initialization no longer replaces it. It reads whatever is present, sets the `harnesses` key, and writes every other key back untouched — configuration owned by repobuddy or another plugin survives initialization. When the file exists but cannot be parsed as a JSON object, initialization fails rather than overwriting it.

Repositories initialized with an earlier version keep an orphaned `.agents/buddy-agent-harness/config.json`. Nothing reads it, so it is safe to delete; the next run writes the new location.

Documentation now uses **harness** for harness-owned files and directories, reserving *vendor* for the organization publishing the documentation.
