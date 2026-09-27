# Load Reference

The one way a skill loads a reference. A calling skill names the references it needs in one line:

```text
Load `skill-design` and `agent-tool-output` with the `load-reference` skill in the `buddy-agent-harness` plugin.
```

Name the plugin as well as the skill: an agent that does not have the skill can then tell the user what to install. Write the skill's name in words, not as a slash command — only Claude Code addresses a plugin's skill as `plugin:skill`.

A calling skill may ship its own copy of a reference at `references/<name>.md`. The skill reads it when no tier holds the name, or when the command cannot run.

The skill runs `scripts/reference.mjs`, the package's `reference` command bundled into this folder. It ships through the npm package and runs with no `node_modules`, no `npx`, and no network.
