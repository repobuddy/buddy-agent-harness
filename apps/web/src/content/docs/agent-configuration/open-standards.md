---
title: Open Standards
description: AGENTS.md, Agent Skills, and how much authority the .agents/skills convention actually has.
---

Buddy Agent Harness does not introduce a new agent-configuration format. It keeps a repository's canonical configuration in familiar, open formats and projects only the parts a harness can consume.

Three things are in play, and they have very different standing: one open format for instructions, one open specification for capabilities, and one widely-adopted convention for where capabilities live.

## Repository instructions: AGENTS.md

[AGENTS.md](https://agents.md/) is an open project format for repository instructions: setup commands, conventions, tests, and contribution guidance. Put shared, always-applicable guidance in the repository-root `AGENTS.md`. Add nested `AGENTS.md` files only where a subproject needs more specific instructions.

The format is deliberately separate from skills. [Codex reads `AGENTS.md` before it starts work and layers project guidance from the repository root to the working directory](https://learn.chatgpt.com/docs/agent-configuration/agents-md). That makes it a good home for stable repository policy rather than task procedures.

### Nested files, and what happens when they disagree

Nested files are explicitly part of the format. The site's guidance for monorepos is to "place another AGENTS.md inside each package," and its FAQ gives the resolution rule:

> The closest AGENTS.md to the edited file wins; explicit user chat prompts override everything.

So the published rule is **nearest-file-wins**, keyed to the file being edited rather than the directory the agent was launched from.

What the site does *not* say is whether a nested file inherits its ancestors and overrides selectively, or replaces them wholesale. It states precedence and stops. That gap is live: an [open v1.1 proposal](https://github.com/agentsmd/agents.md/issues/135) would settle it in the inheriting direction, with guidance that "accumulates as you traverse the directory tree" while "more specific instructions take precedence over more general ones." It has no maintainer response yet, so it is a proposal, not the rule.

Two practical consequences. Write a nested file to stand on its own for anything it covers, rather than relying on inheriting half a rule from the root. And expect harnesses to differ here more than the one-line FAQ suggests. Claude Code already implements accumulation instead of override, which [Harness Differences](/agent-configuration/harness-differences/#nested-instruction-files-resolve-differently) covers.

## Task capabilities: Agent Skills

[Agent Skills](https://agentskills.io/specification) defines a portable capability package: a skill directory with a required `SKILL.md`, YAML frontmatter, and optional scripts, references, and assets. The required `name` and `description` fields help a harness identify when the skill applies.

Use a skill for a reusable procedure that should load when relevant, such as a release checklist or a test workflow. Keep repository-wide policy in `AGENTS.md` instead. [Claude Code](https://code.claude.com/docs/en/skills) and [Cursor](https://cursor.com/docs/skills) both describe their skills as implementations of this open format.

Writing a skill that behaves the same everywhere is a separate problem from storing it in one place. See [Portable Skills](/agent-configuration/portable-skills/).

## Where skills live: the `.agents/` convention

The Agent Skills specification defines what goes *inside* a skill directory and deliberately says nothing about where that directory lives. `.agents/skills/` fills that gap, but it is a convention rather than a specification, and it is worth knowing exactly how much authority it has.

It is documented in the [Agent Skills client-implementation guide](https://agentskills.io/client-implementation/adding-skills-support), a page written for people building harnesses rather than people using them, which is why it is easy to miss. That guide states the position plainly:

> The `.agents/skills/` paths have emerged as a widely-adopted convention for cross-client skill sharing. While the Agent Skills specification does not mandate where skill directories live (it only defines what goes inside them), scanning `.agents/skills/` means skills installed by other compliant clients are automatically visible to yours, and vice versa.

It recommends four locations: `<project>/.<client>/skills/`, `<project>/.agents/skills/`, `~/.<client>/skills/`, and `~/.agents/skills/`. The [`skills` CLI](https://github.com/vercel-labs/skills) implements the same model, treating agents that read `.agents/skills/` directly as *universal* and symlinking the rest. Codex, Cursor, Copilot CLI, and Gemini CLI have since adopted the path into their own documentation.

So the chain of authority is documentation, then reference implementation, then vendor adoption. It is not a standard. Buddy Agent Harness treats `.agents/skills/` as durable but not guaranteed, and does not extend the convention to paths no harness actually reads. That is why `.agents/rules/`, `.agents/commands/`, and `.agents/agents/` are not invented here: nothing reads them.

## What the standards do not cover

MCP servers, custom agents, hooks, and harness-specific settings are useful agent configuration, but neither format above covers them. They stay canonical until a documented, safe mapping exists for the target harness.

**Personal, uncommitted instructions** are the other gap, and a more surprising one. Claude Code has `CLAUDE.local.md`, a gitignored counterpart that loads alongside `CLAUDE.md` and holds machine-specific preferences. `AGENTS.md` has no published equivalent, so consolidating onto it costs you that capability everywhere except Claude Code.

There is demand but no answer: three open issues request it ([#13](https://github.com/agentsmd/agents.md/issues/13), [#72](https://github.com/agentsmd/agents.md/issues/72), [#211](https://github.com/agentsmd/agents.md/issues/211)), and the most developed of them names two candidate filenames (`AGENTS.local.md` or `AGENTS.override.md`) and leans additive where most third-party write-ups assume override. Neither the spelling nor the semantics is settled.

This project therefore does not create or project such a file, because doing so would pick a winner ahead of the standard. Keep personal instructions in `CLAUDE.local.md` and gitignore it, accepting that only Claude Code will read them.

## Unsettled questions

Where an upstream standard has a gap this project deliberately declines to fill, the reasoning and the trigger for revisiting it are tracked in the open:

- [Should `AGENTS.local.md` be supported?](https://github.com/repobuddy/buddy-agent-harness/discussions/10) No local-override file exists in the published standard, and the open requests disagree on both the filename and the semantics.

[All unsettled upstream questions →](https://github.com/repobuddy/buddy-agent-harness/discussions?discussions_q=label%3Aupstream-unsettled)

Each carries the current evidence, why we have not acted, and what would change our mind. If you have a use case that the documented workaround does not cover, that is the input that moves them.

## Further reading

- [AGENTS.md](https://agents.md/)
- [AGENTS.md v1.1 proposal](https://github.com/agentsmd/agents.md/issues/135): would change nested resolution from override to accumulation; open, unratified
- [Agent Skills specification](https://agentskills.io/specification)
- [Agent Skills: adding skills support to your agent](https://agentskills.io/client-implementation/adding-skills-support): the source of the `.agents/skills/` convention
- [Codex: custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Claude Code: skills](https://code.claude.com/docs/en/skills)
- [Cursor: Agent Skills](https://cursor.com/docs/skills)
- [GitHub Copilot: agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [`vercel-labs/skills`](https://github.com/vercel-labs/skills): the reference implementation of canonical storage plus per-harness links
