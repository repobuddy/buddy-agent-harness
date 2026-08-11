---
title: Standards
description: The open formats that shape portable repository agent configuration.
---

Buddy Agent Harness does not introduce a new agent-configuration format. It keeps a repository's canonical configuration in familiar, open formats and projects only the parts a harness can consume.

## Repository instructions: AGENTS.md

[AGENTS.md](https://agents.md/) is an open project format for repository instructions: setup commands, conventions, tests, and contribution guidance. Put shared, always-applicable guidance in the repository-root `AGENTS.md`. Add nested `AGENTS.md` files only where a subproject needs more specific instructions.

The format is deliberately separate from skills. For example, [Codex reads `AGENTS.md` before it starts work and layers project guidance from the repository root to the working directory](https://learn.chatgpt.com/docs/agent-configuration/agents-md). That makes it a good home for stable repository policy rather than task procedures.

## Task capabilities: Agent Skills

[Agent Skills](https://agentskills.io/specification) defines a portable capability package: a skill directory with a required `SKILL.md`, YAML frontmatter, and optional scripts, references, and assets. The required `name` and `description` fields help a harness identify when the skill applies.

Use a skill for a reusable procedure that should load when relevant, such as a release checklist or a test workflow. Keep repository-wide policy in `AGENTS.md` instead. [Claude Code](https://code.claude.com/docs/en/skills) and [Cursor](https://cursor.com/docs/skills) both describe their skills as implementations of this open format.

## Related configuration

MCP servers, custom agents, hooks, and harness-specific settings are useful agent configuration, but they are not covered by either format above. Buddy Agent Harness keeps these artifacts canonical until it has a documented, safe mapping for the target harness. A vendor-specific configuration file is never treated as a second source of truth.

## Further reading

- [AGENTS.md](https://agents.md/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Codex: custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Claude Code: skills](https://code.claude.com/docs/en/skills)
- [Cursor: Agent Skills](https://cursor.com/docs/skills)
- [GitHub Copilot: agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
