---
"buddy-agent-harness": patch
---

`clibuilder` moves from `dependencies` to an optional peer dependency. The `buddy-agent-harness` bin bundles its own copy and needs nothing installed; a host CLI that imports `activate` or a `*Command` export supplies its own `clibuilder`.
