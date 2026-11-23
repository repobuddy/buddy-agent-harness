---
"buddy-agent-harness": patch
---

The plugin manifest lists its dependency on `cyber-agentkit` under `extensions["io.github.cyber-uni.plugin-manager"]`, the key both universal-plugin and cyber-agentkit read, instead of the `org.cyberuni.universal-plugin` fallback. The Claude Code manifest still declares the dependency. The skill forwarders are rebuilt with universal-plugin 0.24.0: in a checkout whose CLI build output is missing, such as a git-sourced install, a forwarder now runs the published package instead of a bin that cannot load.
