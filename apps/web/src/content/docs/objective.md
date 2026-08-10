---
title: Objective
description: One portable agent-configuration source for every coding harness in a repository.
---

Buddy Agent Harness aims to make a repository's agent configuration portable instead of harness-specific.

## One configuration, many harnesses

The repository root is the consumer boundary. Its `AGENTS.md` and `.agents/` tree are the canonical configuration:

- `.agents/AGENTS.md` holds shared behavioral guidance.
- `.agents/skills/**/SKILL.md` holds reusable agent capabilities.
- Separately named files hold tool settings, such as MCP configuration.

The active harness is configured by default. A user's explicit preferences may add other supported harnesses; an existing vendor directory is not itself permission to configure that harness.

## Safe projections

Harness-specific files are projections of the canonical configuration, never a second source of truth. Buddy Agent Harness preserves user-authored policy, links compatible artifacts when possible, copies only when linking is unavailable, and leaves unsupported tool settings canonical rather than converting them speculatively.

The tool does not invent project instructions, replace unrelated configuration, or change CI, repository settings, security scanning, or branch rules.

## Related standards and projects

- [Buddy Agent Harness on GitHub](https://github.com/repobuddy/buddy-agent-harness)
- [Agents Standard](https://agentsstandard.com/) — the broader `AGENTS.md`, skills, and tool-settings configuration model.
- [Agent Skills](https://agentskills.io/specification) — the `SKILL.md` capability format that complements repository instructions.
