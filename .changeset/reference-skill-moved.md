---
'buddy-agent-harness': minor
---

The `reference` skill moved to the `agent-harness` plugin, and the `buddy-agent-harness` plugin no longer ships it. The plugin now declares a dependency on `agent-harness@cyberplace`, so in Claude Code, installing `buddy-agent-harness` installs `agent-harness` and its `reference` skill with it. Cursor, Codex, and GitHub Copilot CLI read no plugin dependencies, so install `agent-harness` there yourself.

A calling skill's line changes from "in the `buddy-agent-harness` plugin" to "in the `agent-harness` plugin":

```text
Load `skill-design` and `agent-tool-output` with the `reference` skill in the `agent-harness` plugin.
```

In Claude Code, the typed form changes from `/buddy-agent-harness:reference` to `/agent-harness:reference`. The `buddy-agent-harness reference` command is unchanged.
