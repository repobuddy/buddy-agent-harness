# Reference

Loads, writes, updates, and finds [references](https://repobuddy.github.io/buddy-agent-harness/agent-configuration/references/): Markdown documents an agent reads on demand by name. It routes each request to the `reference` command, run from a launcher bundled in `scripts/`, and writes a reference only after the user approves it.

| Mode | When |
| --- | --- |
| Load | a skill's instructions name references to load with this skill |
| Create | writing a new reference; a plugin's is named `<plugin name>.<reference>.md` |
| Update | changing a reference: the user's own in place, a plugin's by an override |
| Find | `search` for a topic, or `list` every reference |
| Inspect | `show`, or `show --trace` for why a name resolved to one copy |
| Wire a skill | giving a skill the line below |

It ships in the `buddy-agent-harness` plugin:

```text
/plugin marketplace add cyberuni/cyberplace
/plugin install buddy-agent-harness@cyberplace
```

## Loading a reference from a skill

A calling skill names the references it needs in one line:

```text
Load `skill-design` and `agent-tool-output` with the `reference` skill in the `buddy-agent-harness` plugin.
```

Name the plugin as well as the skill: an agent that does not have the skill can then tell the user what to install. Write the skill's name in words, as above. Every harness reads the words, but each types the skill differently, and where the typed form does not name the plugin, two plugins' skills of the same name collide.

A skill written for one harness only may add that harness's typed form after the skill's name, for example "with the `reference` skill (`/buddy-agent-harness:reference`) in the `buddy-agent-harness` plugin" in Claude Code. Each harness names it this way:

<!-- generated: harness invocations -->
| Harness | What a user types | Names the plugin |
| --- | --- | --- |
| `claude-code` | `/buddy-agent-harness:reference` | yes |
| `cursor` | `/reference` | no |
| `codex` | `$reference` | no |
| `copilot-cli` | `/reference` | no |
| `opencode` | no typed form recorded | — |
| `kilo` | no typed form recorded | — |
| `gemini-cli` | no typed form recorded | — |
| `qwen-code` | no typed form recorded | — |
| `vscode-copilot` | `/buddy-agent-harness:reference` | yes |
| `cline` | `/reference` | no |
| `crush` | no typed form recorded | — |
| `openhands` | no typed form recorded | — |
| `augment` | no typed form recorded | — |
<!-- /generated -->

A calling skill may ship its own copy of a reference at `references/<name>.md`. The skill reads it when no tier holds the name, or when the command cannot run.

`scripts/reference.mjs` is the package's `reference` command bundled into this folder. It ships through the npm package and runs with no `node_modules`. Loading never falls back to `npx` or the network; the other modes fall back to a pinned `npx buddy-agent-harness` when the launcher is missing.
