---
title: Glossary
description: The terms this documentation uses for canonical configuration, harnesses, projections, and kinds of skill.
---

Each entry gives the short definition and links to the page that owns the topic. Where a term is used inconsistently in the wider ecosystem, the definition here is the one this documentation means.

## Configuration

**canonical configuration** — the repository-local `.agents/` tree and root `AGENTS.md`. It belongs to the repository rather than to any one harness. See [Configuration Layout](/reference/configuration-layout/).

**canonical instructions** — `AGENTS.md` and `.agents/AGENTS.md`, holding repository and shared behavioral guidance. Initialization does not rewrite them.

**canonical skills directory** — `.agents/skills/`, the capabilities portion of the canonical configuration. Note that this path is a convention, not part of the Agent Skills specification. See [Open Standards](/agent-configuration/open-standards/).

**canonical skill** — an immediate directory under `.agents/skills/`. Files at that level are ignored.

**tool setting** — harness or tool configuration kept in its own separately named file under `.agents/`, because each setting has its own schema and compatibility rules.

## Harnesses

**harness** — a coding-agent runtime with its own skill discovery location. Claude Code, Codex, and Cursor are harnesses.

**active harness** — the harness in which initialization is invoked.

**enabled harness** — the active harness plus any harness the user explicitly chose. The enabled set is derived on every run and only ever grows. See [Configuration Layout](/reference/configuration-layout/#no-configuration-record).

**native harness** — a harness that reads `.agents/skills/` directly at project scope, so the canonical directory *is* its directory and nothing is written for it. See [Harness Differences](/agent-configuration/harness-differences/).

**projection** — a directory-level symlink from a harness path to `.agents/skills`, such as `.claude/skills → ../.agents/skills`. Only Claude Code and Gemini CLI need one. Where symlinks are unavailable the initializer copies instead, which is a snapshot rather than a live projection.

**bridge** — the harness-specific edit that lets a harness reach `AGENTS.md` when it cannot read that file directly: the Claude Code `CLAUDE.md` import and the Gemini CLI `context.fileName` setting. The CLI does not write either one, because both need judgment about user-authored content. The [`init` skill](/guides/initialize/) handles them.

**enabled vs. projected** — enabling a harness states what the repository supports; projecting writes a link. For a native harness the two differ, so the CLI result separates `native` from `linked`. See [Harness Differences](/agent-configuration/harness-differences/#enabled-is-not-the-same-as-projected).

## Skills

**skill** — a `SKILL.md` file: frontmatter governing when it loads, and a body the agent follows once loaded. Commands, gateways, and personas are all skills. See [Kinds of Skill](/agent-configuration/skills/overview/).

**selection, visibility, effect** — the three independent axes that distinguish kinds of skill: how it is chosen, who may choose it, and what running it changes. The familiar names are recognizable combinations of values on these axes, not a fixed list.

**command** — a skill selected explicitly by the user, performing an action. See [Commands](/agent-configuration/skills/commands/).

**gateway skill** — a skill whose effect is routing rather than action: it directs the request to the right place. See [Gateway Skill](/agent-configuration/skills/gateway-skill/).

**persona skill** — a skill selected explicitly by the user whose effect is a stance rather than an action. See [Persona](/agent-configuration/skills/persona/).

**direct invocation skill** — an agent-only skill selected by name, with a `description` kept deliberately unmatchable so it is never auto-loaded. See [Direct Invocation Skill](/agent-configuration/skills/direct-skill/).

**discipline** — a skill triggered by an event, whose effect is a stance.

## Instructions

**purpose** — what a block of instruction is *for*: procedure, criteria, policy, reference, menu, tone, or structure. A property of the prose, not of the file. See [Instruction Purpose](/agent-configuration/instruction-purpose/).

**target** — which of the agent's outputs an instruction governs, and therefore who eventually reads it. Separating targets is what lets contradictory instructions coexist. See [Instruction Target](/agent-configuration/instruction-target/).

**file type matching, description matching, prose matching** — the three mechanisms that specify a target, acting at different moments: a path glob evaluated by the harness, a `description` judged by the agent at load time, and a distinction drawn in the body while working. See [Instruction Target](/agent-configuration/instruction-target/#specifying-a-target).
