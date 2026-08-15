---
title: Open Standards
description: AGENTS.md, Agent Skills, and how much authority the .agents/skills convention actually has.
---

Buddy Agent Harness does not introduce a new agent-configuration format. It keeps a repository's canonical configuration in familiar, open formats and projects only the parts a harness can consume.

Three things are in play, and they have very different standing: one open format for instructions, one open specification for capabilities, and one widely-adopted convention for where capabilities live.

## Repository instructions: AGENTS.md

[AGENTS.md](https://agents.md/) is an open project format for repository instructions — setup commands, conventions, tests, and contribution guidance. Put shared, always-applicable guidance in the repository-root `AGENTS.md`. Add nested `AGENTS.md` files only where a subproject needs more specific instructions.

The format is deliberately separate from skills. [Codex reads `AGENTS.md` before it starts work and layers project guidance from the repository root to the working directory](https://learn.chatgpt.com/docs/agent-configuration/agents-md). That makes it a good home for stable repository policy rather than task procedures.

## Task capabilities: Agent Skills

[Agent Skills](https://agentskills.io/specification) defines a portable capability package: a skill directory with a required `SKILL.md`, YAML frontmatter, and optional scripts, references, and assets. The required `name` and `description` fields help a harness identify when the skill applies.

Use a skill for a reusable procedure that should load when relevant — a release checklist, a test workflow. Keep repository-wide policy in `AGENTS.md` instead. [Claude Code](https://code.claude.com/docs/en/skills) and [Cursor](https://cursor.com/docs/skills) both describe their skills as implementations of this open format.

Writing a skill that behaves the same everywhere is a separate problem from storing it in one place. See [Portable Skills](/agent-configuration/portable-skills/).

## Where skills live: the `.agents/` convention

The Agent Skills specification defines what goes *inside* a skill directory and deliberately says nothing about where that directory lives. `.agents/skills/` fills that gap — but it is a convention, not a specification, and it is worth knowing exactly how much authority it has.

It is documented in the [Agent Skills client-implementation guide](https://agentskills.io/client-implementation/adding-skills-support), a page written for people building harnesses rather than people using them, which is why it is easy to miss. That guide states the position plainly:

> The `.agents/skills/` paths have emerged as a widely-adopted convention for cross-client skill sharing. While the Agent Skills specification does not mandate where skill directories live (it only defines what goes inside them), scanning `.agents/skills/` means skills installed by other compliant clients are automatically visible to yours, and vice versa.

It recommends four locations: `<project>/.<client>/skills/`, `<project>/.agents/skills/`, `~/.<client>/skills/`, and `~/.agents/skills/`. The [`skills` CLI](https://github.com/vercel-labs/skills) implements the same model, treating agents that read `.agents/skills/` directly as *universal* and symlinking the rest. Codex, Cursor, Copilot CLI, and Gemini CLI have since adopted the path into their own documentation.

So the chain of authority is documentation, then reference implementation, then vendor adoption — not a standard. Buddy Agent Harness treats `.agents/skills/` as durable but not guaranteed, and does not extend the convention to paths no harness actually reads. That is why `.agents/rules/`, `.agents/commands/`, and `.agents/agents/` are not invented here: nothing reads them.

## What the standards do not cover

MCP servers, custom agents, hooks, and harness-specific settings are useful agent configuration, but neither format above covers them. They stay canonical until a documented, safe mapping exists for the target harness.

## Further reading

- [AGENTS.md](https://agents.md/)
- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Skills: adding skills support to your agent](https://agentskills.io/client-implementation/adding-skills-support) — the source of the `.agents/skills/` convention
- [Codex: custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Claude Code: skills](https://code.claude.com/docs/en/skills)
- [Cursor: Agent Skills](https://cursor.com/docs/skills)
- [GitHub Copilot: agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [`vercel-labs/skills`](https://github.com/vercel-labs/skills) — the reference implementation of canonical storage plus per-harness links
