---
title: Responsibility
description: The Required / Optional / Delegated axis — what an agent-configuration artifact must do itself, may optionally add, or hands to a named role via dependency inversion.
---

**Responsibility** is a different question from [kind](/agent-configuration/skills/overview/#kinds-of-skill). Kind answers *how a skill gets chosen* — Selection, Visibility, Effect. Responsibility answers *what job it is on the hook for* once chosen: what it must implement to be that kind of artifact at all, what it may optionally add on top, and what it explicitly refuses to implement itself — handing that job to whatever role fills a name.

This axis applies to any agent-configuration artifact, not just skills: a persona, an always-on rule, a command are all answering the same three questions about themselves.

## The three relations

| Relation | Meaning | Absence means |
|---|---|---|
| **Required** | Must implement — this is what makes the artifact this kind of thing | It isn't doing its job |
| **Optional** | May implement, as an artifact-specific add-on over the default | Nothing breaks; the default behavior stands |
| **Delegated** | Explicitly not implemented here — resolved by loading a named role | The caller falls back to a bundled default, or does without |

Required and Optional both describe things the artifact does itself. Delegated describes something it deliberately does not — the distinction from Optional is not "how important is this," it is "who does the work."

## Delegation is dependency inversion, realized by name

A **Delegated** responsibility is fulfilled the way [Direct Invocation skills](/agent-configuration/skills/direct-skill/) describe: the artifact tries to load a role by a known name, and falls back to its own bundled default if no override exists.

This is what lets one artifact's required responsibility stay untouched while its delegated responsibility gets swapped by whoever consumes it. The delegate is usually a new combination on the [Selection / Visibility / Effect axes](/agent-configuration/skills/overview/#kinds-of-skill) — by-name selection, agent-only visibility, and whatever effect the delegated job needs, often **stance** when what is being delegated is voice or judgment rather than a task.

Note what this depends on: the delegate must be genuinely unmatchable, or the override and the default both become auto-match candidates and the caller loses control of which one runs. Since [no harness offers a portable field for that](/agent-configuration/skills/direct-skill/#no-harness-supports-this-directly), the minimal-description convention is what holds the whole pattern up. Delegation is only as reliable as that description.

## Responsibility across the kinds

| Artifact | Required | Optional | Delegated |
|---|---|---|---|
| [Gateway skill](/agent-configuration/skills/gateway-skill/) | Activation, intake against a fixed operation menu, context loading, routing | Continuing to shape the work after routing | Voice and judgment during intake and routing — an optional by-name persona |
| [Persona](/agent-configuration/skills/persona/) | Identity layer (role, expertise, voice) and capability layer (tools, constraints) | Additional constraints beyond the defaults | — (a persona is typically the delegate, not the delegator) |
| [Command](/agent-configuration/skills/commands/) | Explicit-only invocation, auto-match suppressed | — | — |
| [Direct invocation skill](/agent-configuration/skills/direct-skill/) | An unmatchable description; identity carried by `name` and the body | — | — |
| Always-on rule | Applying without being selected | — | — |
| Public skill (default) | Matching a situation, performing the action | — | — |

Most rows have no Delegated column: delegation is the exception, not the default. It shows up where an artifact's job genuinely splits into "the mechanism" (required, fixed, owned by whoever ships it) and "the manner" (an overlay the consumer should be free to swap).

## Worked example: a gateway delegates its voice to a persona

A [gateway skill](/agent-configuration/skills/gateway-skill/) owns a closed operation menu. That vocabulary is the workflow's own: a consumer changing it has forked the workflow, not customized it. So it is **Required**.

Whether the gateway keeps shaping the work after it routes is **Optional** — allowed, not mandatory, and it does not change what kind of artifact the gateway is.

How the gateway sounds while doing intake — cautious or terse, how it handles ambiguity, what it apologizes for — has nothing to do with the operation menu. That is **Delegated**: the gateway tries to load a persona by a conventional name and falls back to its own bundled default voice if the consumer has not supplied one. The consumer overrides the voice without touching the menu; the workflow ships a default voice without locking the consumer into it.

This is the same seam [Instruction Target](/agent-configuration/instruction-target/#composing-configuration) describes from the other direction. The menu targets the user and so does the voice, which is exactly why they would conflict if both were fixed — delegation resolves it by letting only one of the two be authored per installation.

## Related

- [Kinds of Skill](/agent-configuration/skills/overview/) — the Selection / Visibility / Effect axes this one complements
- [Direct Invocation Skill](/agent-configuration/skills/direct-skill/) — the by-name resolution that realizes delegation
- [Gateway Skill](/agent-configuration/skills/gateway-skill/) — the running example above
- [Persona](/agent-configuration/skills/persona/) — the usual shape of a delegated responsibility
- [Instruction Target](/agent-configuration/instruction-target/) — why two units on one target conflict
