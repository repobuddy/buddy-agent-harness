---
"buddy-agent-harness": minor
---

Skills now run the CLI through one forwarding script each, `scripts/buddy-agent-harness.mjs`, written by `universal-plugin plugin build`. Each runner line is `node <this skill's folder>/scripts/buddy-agent-harness.mjs <command>`, with no `npx` fallback beside it. In a checkout the forwarder runs the local build, so testing a skill runs your change. Elsewhere it runs `npx -y buddy-agent-harness@<version>`, the version the skill shipped with.

The per-subcommand bundles (`scripts/doctor.mjs`, `init.mjs`, `mcp.mjs`, `sync.mjs`) are gone. They were about 425 KB each and shipped only through npm, so a git-sourced install never had them. `enhance` reaches `cyber-agentkit prose-update` through a pinned `scripts/cyber-agentkit.mjs` forwarder when the `prose-update` skill's own script cannot be reached.
