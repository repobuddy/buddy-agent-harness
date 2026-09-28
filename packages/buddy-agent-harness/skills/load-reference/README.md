# Load Reference

The one way a skill loads a reference. A calling skill names the references it needs in one line:

```text
Load `skill-design` and `agent-tool-output` with the `load-reference` skill in the `buddy-agent-harness` plugin.
```

Name the plugin as well as the skill: an agent that does not have the skill can then tell the user what to install. Write the skill's name in words, as above. Every harness reads the words, but each types the skill differently, and where the typed form does not name the plugin, two plugins' skills of the same name collide.

A skill written for one harness only may add that harness's typed form after the skill's name, for example "with the `load-reference` skill (`/buddy-agent-harness:load-reference`) in the `buddy-agent-harness` plugin" in Claude Code. Each harness names it this way:

<!-- generated: harness invocations -->
| Harness | What a user types | Names the plugin |
| --- | --- | --- |
| `claude-code` | `/buddy-agent-harness:load-reference` | yes |
| `cursor` | `/load-reference` | no |
| `codex` | `$load-reference` | no |
| `copilot-cli` | `/load-reference` | no |
| `opencode` | no typed form recorded | — |
| `kilo` | no typed form recorded | — |
| `gemini-cli` | no typed form recorded | — |
| `qwen-code` | no typed form recorded | — |
| `vscode-copilot` | `/buddy-agent-harness:load-reference` | yes |
| `cline` | `/load-reference` | no |
| `crush` | no typed form recorded | — |
| `openhands` | no typed form recorded | — |
| `augment` | no typed form recorded | — |
<!-- /generated -->

A calling skill may ship its own copy of a reference at `references/<name>.md`. The skill reads it when no tier holds the name, or when the command cannot run.

The skill runs `scripts/reference.mjs`, the package's `reference` command bundled into this folder. It ships through the npm package and runs with no `node_modules`, no `npx`, and no network.
