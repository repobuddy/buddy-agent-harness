---
"buddy-agent-harness": patch
---

`clibuilder` moves from `dependencies` to an optional peer dependency at `^12.1.0`. The `buddy-agent-harness` bin bundles its own copy and needs nothing installed; a host CLI that imports `activate` or a `*Command` export supplies its own `clibuilder`, at 12.1.0 or later so its copy and this package's work together.
