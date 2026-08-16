---
"buddy-agent-harness": minor
---

Adopt the Agent Plugins 1.0.0 canonical manifest. `plugin.json` at the package root is now the single source the vendor manifests are generated from, with skills and per-harness settings under `extensions["org.cyberuni.universal-plugin"]`. The superseded `.plugin/plugin.json` is removed.
