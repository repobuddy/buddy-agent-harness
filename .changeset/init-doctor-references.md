---
'buddy-agent-harness': minor
---

`init` and `doctor` now work with references instead of governances.

- **`init`** creates `.agents/references/` instead of `.agents/governances/`. Its result reports `references`, the number of references the project tier holds, in place of `governances`. Documents in an existing `.agents/governances/` are counted too.
- **`doctor`** reports a `references` section in place of `governances`. There is one row per name per layer, `{ name, tier, path, status }`, for the managed, project, and user tiers. `status` is the one `reference list` gives, such as `used` or `shadowed by project (first-wins)`. When no layer holds a reference, the section reads `0 references — no layer outside the plugin tier holds one`.

The legacy `governances/` folders are still read by `reference`, so nothing already written stops resolving.
