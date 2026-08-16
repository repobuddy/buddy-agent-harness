---
title: Kinds of Skill
description: Commands, gateways, personas, and by-name skills are all SKILL.md files — the three axes that actually distinguish them, and which distinctions survive between harnesses.
---

A skill is a `SKILL.md` file: frontmatter that governs when it loads, and a body the agent follows once it has. [Open Standards](/agent-configuration/open-standards/) covers the format and [Configuration Layout](/reference/configuration-layout/) covers where it lives. This page covers the vocabulary — because **commands, gateway skills, personas, and by-name skills are all skills**, differing only in how they get selected, who is allowed to select them, and what running them changes.

That matters for portability. Some of these distinctions are expressed in the Markdown body, which every harness reads; others are expressed in frontmatter that most harnesses discard. Knowing which is which tells you whether a skill keeps its character when it travels.

## What a skill encodes

A `SKILL.md` file has two parts:

- **`description` frontmatter** — for most harnesses the only field loaded at startup, and the entire basis on which the model decides whether to load the body. For a situational skill it states the capability, "Use this skill when…", and at least one implicit phrasing an agent might not otherwise connect to the trigger. For a skill that should never be matched, it is kept deliberately empty of anything matchable — see [Direct Invocation Skill](/agent-configuration/skills/direct-skill/).
- **Body** — the workflow itself: numbered steps for a process skill, tool usage and guardrails for a tool-based skill, or rules and pass conditions for a standard.

Skills stay narrow and composable by design: one workflow per skill.

## Kinds of skill

"What kind of skill is this?" has no single answer, because **kind is not one axis**. A skill is selected some way, by someone, to change something. Three independent questions, asked every time:

| Axis | Question | Values |
|---|---|---|
| **Selection** | How does this skill get chosen? | situational · explicit · by-name · event |
| **Visibility** | Who is allowed to choose it? | user · agent-only |
| **Effect** | What does running it change? | action · routing · stance · reference |

The familiar names are **recognizable combinations** of these values, not slots in a list. They cross-cut.

| Kind | Selection | Visibility | Effect |
|---|---|---|---|
| Public skill | situational | user | action |
| [Command](/agent-configuration/skills/commands/) | explicit | user | action |
| [Gateway skill](/agent-configuration/skills/gateway-skill/) | situational or explicit | user | routing |
| [Persona skill](/agent-configuration/skills/persona/) | explicit | user | stance |
| [Direct invocation skill](/agent-configuration/skills/direct-skill/) | by-name | agent-only | action or reference |
| Discipline | event | — | stance |

Every row is a skill. Commands, gateways, and personas are not separate artifacts that sit *beside* skills — they are skills whose values on these three axes differ from the default.

**Public skill** is the default — its description states the situations it serves, the agent matches that against the request, and the user can invoke it directly. Everything else is a deviation from it.

**Commands** are skills the user invokes explicitly via `/name`, with automatic invocation suppressed. Use them where accidental auto-invocation would be disruptive — deployments, releases.

**Gateway skills** own the front door of an opt-in workflow: they activate it, gather intent the request did not supply, load the workflow's rules, and route to a narrower skill. What marks a gateway is its behavior when it *cannot* infer intent — it asks, rather than guessing or failing.

**Persona skills** alter how the agent behaves rather than performing a task, and take no action of their own.

**Direct invocation skills** are named outright by a caller and never matched against a situation. The mechanism that enforces that is a deliberately unmatchable description, which is the one part of the pattern that works on every harness.

**Disciplines** are stances that are always on, selected by an event — a session starting, a tool finishing — rather than by a request. A discipline is the one row that usually is *not* a skill in practice: an always-on rule is cheaper as an `AGENTS.md` section, since [that file is already resident](/agent-configuration/instruction-files/) and a skill would have to be re-selected to apply.

### Selection and Visibility are not the same question

These two get collapsed, and the collapse causes real breakage.

- *Selection* is how the model finds the skill: by matching your situation against its description, or because something named it outright.
- *Visibility* is whether the skill appears in the user's command list.

They feel identical — a skill you can't see is one you can't ask for — but they are not. A skill can be **hidden yet situational**: a background-knowledge skill that should load automatically when relevant, while being noise in a command menu.

Claude Code documents the two as separate fields with opposite effects, which is the clearest confirmation that they are different questions:

| Field | User-invocable | Model-invocable | Description in context |
| --- | --- | --- | --- |
| `disable-model-invocation: true` | Yes | No | No |
| `user-invocable: false` | No | Yes | Yes — always |

So **a visibility flag must never be read as a selection signal**. If a tool treats "hidden" as proof of "loaded by name only", it will demand that skill drop its trigger language, and the automatic loading it depended on breaks. Hiding a skill is a statement about the *menu*. Having no trigger is a statement about the *description*.

Note also that neither field is portable. Both are Claude Code's, and one of the two is recognized by Cursor — everywhere else, a skill relying on them is a plain public skill. The description-based approach in [Direct Invocation Skill](/agent-configuration/skills/direct-skill/) is the portable substitute.

## Runtime fields, and why they are not portable

The three axes above describe *selection*. A second, independent question is what a skill is allowed to change about the run itself once it loads — the model, the effort level, the tool pool, whether it executes inline or in a subagent.

A stale assumption is common here: that a skill is "just instructions" and anything about *how* the agent runs has to be an agent definition. That was true once. It is not Claude Code's current contract:

| Field | Effect | Scope |
| --- | --- | --- |
| `model` | Model to use while the skill is active | rest of the current turn |
| `effort` | Effort level while the skill is active | rest of the current turn |
| `allowed-tools` | **Pre-approves** tools — does not restrict the pool | rest of the current turn |
| `disallowed-tools` | Removes tools from the pool | rest of the current turn |
| `context: fork` + `agent` | Run the skill in a subagent, with the body as the task | the forked run |
| `paths` | Limit automatic activation to matching files | activation only |

Three details worth holding on to, because they are the ones that bite:

- **`allowed-tools` grants, it does not fence.** Listing `Read` does not stop the skill from writing files — every tool remains callable. Use `disallowed-tools` to take a tool away.
- **These are turn-scoped, not skill-scoped.** The grant and the model override clear when you send your next message, even though the skill's *content* stays in context for the rest of the session. An agent definition's equivalents apply for that subagent's whole life.
- **Only `allowed-tools` is in the specification**, and even there it is marked experimental. Everything else in the table is Claude Code's own. A skill that encodes load-bearing behavior in these fields behaves differently on every other harness — see [Writing Portable Skills](/agent-configuration/portable-skills/).

### What still requires an agent definition

A skill cannot express a tool **allowlist** — "only these tools, nothing else". `allowed-tools` grants and `disallowed-tools` denies; neither closes the set. Nor can it set `permissionMode`, `maxTurns`, persistent `memory`, `mcpServers`, or worktree `isolation`.

Those are the honest reasons to reach for an agent definition. Wanting a different model or a higher effort level is not one.

Bear in mind that agent definitions are further from portable than skills are: no open specification covers them, and this project treats them as canonical-only configuration that is [reported rather than projected](/reference/configuration-layout/#what-stays-canonical).

### Composing the two

The two artifacts compose in both directions, and the direction you want depends on which one owns the task:

| Direction | System prompt | The task is | Use when |
|---|---|---|---|
| Agent definition with `skills:` | the agent's body | the delegation message | the skill is **reference** — a voice, a standard, a convention set |
| Skill with `context: fork` | the agent type's | the skill body | the skill is a **task** with explicit steps |

`skills:` preloads the full skill content into the subagent at startup — one body of content reachable from both an in-session load and a delegated run, with no duplicated text and no reading another file by path. It preloads rather than gates: the subagent can still invoke skills the list does not name.

One trap: a skill marked `disable-model-invocation: true` **cannot be preloaded**, because preloading draws from the same pool the model may invoke. If a skill needs to be both user-only and preloadable, those two requirements conflict — which is the second reason [Direct Invocation Skill](/agent-configuration/skills/direct-skill/) reaches for a description-based approach instead of the flag.

## Placement

Kind says nothing about where a skill lives. [Configuration Layout](/reference/configuration-layout/) owns the paths; the short version is that `.agents/skills/<name>/` is the canonical project location, `~/.agents/skills/<name>/` is the user-scope equivalent, and a package that ships skills to other repositories exposes them at its own `skills/<name>/`.

Placement is orthogonal to kind, as are **distribution** (whether the skill ships to other repositories) and **pattern** (the workflow shape of the body: process, tool-based, standard, persona). Every skill has a value on every axis at once — a project-scoped, process-pattern, situational, user-visible skill with an action effect is just "a normal skill". The names on this page only get used when something deviates.

## When a persona is not a skill

Persona has a second realization that is *not* a skill, and that is the one usually being contrasted with skills:

| | Persona skill | Persona as subagent |
|---|---|---|
| **Artifact** | `SKILL.md` | an agent definition |
| **How it loads** | into the context of the agent already running | spawned as a separate agent |
| **Changes agent identity?** | No | Yes — a new role, expertise, and capability bundle |
| **Portable?** | Yes — the body travels | No — no open specification covers agent definitions |

A skill can *spawn* a persona as a subagent. In that form they are separate artifacts with their own mechanisms. As a persona **skill**, it is a row in the kinds table above — the same `SKILL.md` mechanism, differing only in its values on the three axes.

## Related

- [Writing Portable Skills](/agent-configuration/portable-skills/) — which frontmatter survives the trip between harnesses
- [Responsibility](/agent-configuration/skills/responsibility/) — the Required / Optional / Delegated axis, orthogonal to kind
- [Commands](/agent-configuration/skills/commands/) — explicit-only invocation
- [Gateway Skill](/agent-configuration/skills/gateway-skill/) — workflow entrypoints that route
- [Direct Invocation Skill](/agent-configuration/skills/direct-skill/) — selected by name, never by situation
- [Persona](/agent-configuration/skills/persona/) — bundled agent identity a skill can invoke as a subagent
- [Instruction Purpose](/agent-configuration/instruction-purpose/) — what a *section* is for, one level below kind
