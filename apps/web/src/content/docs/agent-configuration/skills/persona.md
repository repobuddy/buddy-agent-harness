---
title: Persona
description: Agent identity definitions that bundle role, expertise, permissions, and constraints, and why they are canonical-only configuration rather than something this project projects.
---

**Personas** are agent identity definitions. They encode who an agent is, not what workflow it runs. A persona bundles role framing, expertise, permissions, and constraints into a single named, invocable unit. When a parent agent spawns a subagent, it is instantiating a persona.

Skills define what to do. Personas define who does it.

## Start with the portability caveat

Unlike `AGENTS.md` and `SKILL.md`, **agent definitions have no open specification.** There is no `.agents/agents/` convention that any harness reads, and the frontmatter below is Claude Code's own. That is why this project treats subagents as [canonical-only configuration](/reference/configuration-layout/#what-stays-canonical): reported during initialization and left alone, never converted, because there is no safe cross-harness mapping to convert them into.

The page is here because the *concept* is portable even where the artifact is not. The identity layer can be written as a skill, and a skill travels everywhere.

## What a persona encodes

A persona is an agent definition file with two layers:

**Identity layer** (who the agent is):
- Role framing: "you are a senior code reviewer specializing in security"
- Expertise: domain knowledge the agent should apply
- Voice and tone: how the agent communicates

**Capability layer** (what the agent can do and how far it can go):
- `tools` / `disallowedTools`: the tool boundary for this agent
- `maxTurns` / `effort`: behavioral limits
- `model`: which model this agent uses
- `skills`: which skills are **preloaded** into this agent at startup
- `permissionMode`, `memory`, `mcpServers`, `isolation`: session-level controls

The identity layer shapes behavior through instruction. The capability layer shapes it through enforcement. Only the capability layer genuinely requires an agent definition: a skill can already set `model` and `effort`, and [wanting either is not a reason to reach for a subagent](/agent-configuration/skills/overview/#what-still-requires-an-agent-definition). What a skill cannot do is close the tool set: `tools` is an allowlist, where a skill's `allowed-tools` only grants.

## `skills:` is a preload list, not an access list

It injects each named skill's full content into the agent's context at startup. It does not gate what the agent may load later, which stays open through the harness's skill tool unless you remove that tool.

That makes it the right way to carry an identity layer other callers also need. Take a voice, a house style, or a review standard: write it once as a skill, name it in `skills`, and the same text serves both the spawned agent and any in-session load. Writing it into the agent body instead strands it there: the only ways back to it are spawning the agent or reading its file by path.

This is also the seam that keeps a persona portable. The identity layer, written as a skill, lives in `.agents/skills/` and works on every harness. Only the capability layer is stuck in the harness-specific file.

A skill named this way must stay model-invocable. `disable-model-invocation: true` blocks preloading, since preloading draws from the same pool the model may invoke. So a persona's preloaded skill cannot also be a [command](/agent-configuration/skills/commands/).

## As a delegated responsibility

A persona is usually the **delegate**, not the delegator. Another artifact, commonly a [gateway skill](/agent-configuration/skills/gateway-skill/), owns a required job such as an operation menu or a routing decision, and hands off only the voice or judgment layer to a persona it resolves by name, falling back to a bundled default if none is supplied. See [Responsibility](/agent-configuration/skills/responsibility/) for the axis this realizes.

A persona filling that role is `agent-only` and selected `by-name` rather than the explicit/user combination in the table below. It exists to be loaded by its caller, not invoked directly.

## Personas vs. skills vs. subagent definitions

These three get confused:

| | Persona | Skill | Subagent definition |
|---|---|---|---|
| **What it encodes** | Who the agent is | What workflow to run | Same as persona; persona is the concept, subagent definition is the artifact |
| **Activation** | Spawned by a parent agent | Invoked by an agent matching a situation | Spawned by a parent agent |
| **Portable** | Only as a skill | Yes | No |

"Subagent definition" is the file format. "Persona" is the concept. They are the same thing named differently by layer.

## Frontmatter

Claude Code's agent-definition fields, for orientation. Treat this as harness-specific, not as a standard:

```markdown
---
name: my-agent
description: What this agent specializes in — used by parent agents to decide when to spawn it
model: sonnet
effort: medium
maxTurns: 20
tools: [Read, Bash, WebSearch]
disallowedTools: [Write, Edit]
skills: [code-reviewer]
---

You are a [role framing here]...
```

## Related

- [Kinds of Skill](/agent-configuration/skills/overview/): including what still requires an agent definition
- [Responsibility](/agent-configuration/skills/responsibility/): Required / Optional / Delegated; a persona as the usual delegate
- [Gateway Skill](/agent-configuration/skills/gateway-skill/): the typical delegator
- [Instruction Purpose](/agent-configuration/instruction-purpose/): why a persona is not pure Tone
- [Configuration Layout](/reference/configuration-layout/): why subagents stay canonical
