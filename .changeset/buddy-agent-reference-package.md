---
'buddy-agent-reference': minor
---

First release: the reference resolver behind `buddy-agent-harness reference`, in a package of its own so a tool can bundle it without depending on `buddy-agent-harness`. It resolves a named Markdown document across the managed, project, user, and plugin tiers, merging overrides as their `merge` mode asks.

`loadReference(name, { root, plugin })` resolves one name for a root. `referenceLayers`, `resolveReference`, `listReferences`, `searchReferences`, and `whereReference` expose each step, and `createReferenceCommand({ plugin })` builds the `reference` command for a `clibuilder` host. The `buddy-agent-reference` binary runs `show`, `list`, `search`, `where`, and `create` at the top level.
