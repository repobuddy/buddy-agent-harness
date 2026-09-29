---
'buddy-agent-harness': minor
---

The `load-reference` skill is now the `reference` skill's Load mode, and the `load-reference` skill is removed. A calling skill's line changes from "with the `load-reference` skill" to "with the `reference` skill":

```text
Load `skill-design` and `agent-tool-output` with the `reference` skill in the `buddy-agent-harness` plugin.
```

Loading works as before: one `reference show` run from the launcher bundled in the skill folder, no `npx` and no network, and the calling skill's own `references/<name>.md` when the command cannot run or no tier holds the name. The plugin now puts one skill description in every session for references, instead of two.
