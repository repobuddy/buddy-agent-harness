---
title: Harness Support
description: How major coding-agent harnesses relate to canonical repository configuration.
---

Support is not a binary label. A harness can natively read a canonical format, need a harness-specific projection, or expose settings that should remain vendor-specific. This page distinguishes the vendor's documented capability from the current Buddy Agent Harness implementation.

## Native formats and locations

| Harness | Documented configuration relevant here | Canonical relationship |
| --- | --- | --- |
| [Claude Code](https://code.claude.com/docs/en/skills) | Project skills in `.claude/skills/<skill>/SKILL.md` | Uses the Agent Skills format; a projection is useful. |
| [Codex](https://learn.chatgpt.com/docs/agent-configuration/agents-md) | Repository `AGENTS.md` instructions | Reads root and nested `AGENTS.md`; configuration beyond instructions requires an explicit adapter. |
| [Cursor](https://cursor.com/docs/skills) | `.agents/skills/` and `.cursor/skills/` | Reads canonical `.agents/skills/` directly, as well as its own skill directory. |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) | `.agents/skills/`, `.github/skills/`, and `.claude/skills/` | Reads canonical `.agents/skills/` directly and supports vendor-local skills. |
| [Windsurf](https://docs.windsurf.com/windsurf/cascade/skills) | `.windsurf/skills/<skill>/SKILL.md` | Uses the Agent Skills format; a projection is useful. |

Vendor documentation changes independently. Follow the linked documentation for setup requirements, product editions, and features beyond skills and instructions.

## Current package behavior

Today, `buddy-agent-harness init` synchronizes immediate skill directories from `.agents/skills/`. It always selects Claude Code and selects Cursor, Codex, Copilot CLI, and Windsurf when their detection directory already exists. It creates links where possible and falls back to copies. See [Configuration Layout](./configuration-layout/) for the exact paths currently written by the CLI.

This is intentionally narrower than the project's objective. It does not yet project `AGENTS.md`, MCP settings, custom agents, hooks, or other tool settings. Nor does registration in the CLI mean every generated path is a complete implementation of the vendor's configuration model.

## Compatibility policy

Buddy Agent Harness prefers direct consumption of the canonical format. Where a harness needs another location, it can project a compatible artifact by link or copy. It does not translate policy into an undocumented vendor format, overwrite an existing user-owned configuration, or turn an existing vendor directory into permission to configure that harness.
