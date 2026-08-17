---
'buddy-agent-harness': minor
---

Mount the plugin's commands as `agent-harness` rather than `harness`.

`repobuddy` puts every plugin's commands in one namespace, where `harness` is generic enough for a second plugin to want it. The commands are otherwise unchanged: `buddy agent-harness doctor` and `buddy agent-harness init`.

This renames the mount point. A consumer running `buddy harness init` has to update the call; the `npx buddy-agent-harness` invocations are unaffected.
