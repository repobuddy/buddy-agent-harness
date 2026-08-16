---
title: Direct Invocation Skill
description: A skill selected by another skill naming it outright, never by matching a user's situation. The minimal-description rule that enforces it portably, and why it is not "internal."
---

A **Direct Invocation skill** (or **Direct skill** for short) is invoked by name only. It should never be triggered through context.

It is useful for a capability that should run only when a specific caller asks for it by name: a rubric a reviewer loads to grade against, a role a workflow fills without committing to which package supplies it, a fragment factored out of a longer procedure. None of these should self-activate just because their subject matter comes up in conversation.

## No harness supports this directly

There is no portable frontmatter field for "by name only". Claude Code has `disable-model-invocation: true`, which suppresses automatic loading outright. But a skill carrying that flag [cannot be preloaded into a subagent](https://code.claude.com/docs/en/sub-agents), because preloading draws from the same pool the model may invoke. A skill built on that flag is silently skipped when a subagent needs it preloaded at startup. And the flag is read by Claude Code and Cursor only; everywhere else it is discarded and the skill reverts to matching on its description.

So the portable approach is to set `description` to a fixed, minimal marker string that gives the model nothing to match against. It works on every harness because `description` is the one selection input every harness reads, and it keeps the skill preloadable.

**It must not be blank or omitted, either.** The two standards disagree about what an absent description means, and both answers are wrong for this purpose:

| Behavior on a missing `description` | Result |
| --- | --- |
| Claude Code falls back to the body's first paragraph | the skill becomes matchable on prose you did not write as a trigger |
| Agent Skills lenient validation skips the skill | the skill does not load at all, even by name |

A fixed marker string is the only value that is unmatchable in the first case and present in the second.

Because of that workaround, a Direct skill is not suitable as a slash command: the `/` menu would show only the marker, telling the user nothing. That is why a Direct skill typically also carries `user-invocable: false` where the harness supports it. It is a menu tidiness measure, not the mechanism.

This makes a Direct skill almost the polar opposite of a [Command](/agent-configuration/skills/commands/):

| Kind                                              | Selection                       | Visibility |
| ------------------------------------------------- | ------------------------------- | ---------- |
| [Command](/agent-configuration/skills/commands/)  | explicit (user types `/<name>`) | user       |
| **Direct skill**                                  | **by name (a caller names it)** | agent-only |

## Significance: dependency inversion

Architecturally, this kind of skill exists to enable **dependency inversion**: a caller can name a role it depends on without committing to which package supplies it. That one property drives several concrete use cases:

- A package ecosystem overrides a default implementation by name, without the caller's own content changing.
- A reviewer loads a reference rubric blind, so grading criteria stay identical across every run.
- A producer factors shared criteria out into a fragment every consumer in a pipeline loads the same way.

None of that works if the skill can also fire on its own. An overriding skill and the default it replaces would both be candidates for auto-match, and the caller loses control over which one runs. Direct invocation is the constraint that makes override-by-name safe: the model is never in the loop deciding, only the explicit name is.

For example, a workflow wants a `reviewer` role. It can:

1. Try to load a skill literally named `reviewer`, which a project or package may have defined to override the default.
2. Fall back to its own bundled default if no override exists.

Neither skill is "private" to the caller. `reviewer` might be authored by a completely unrelated package, discovered purely because the workflow asked for that name.

This is also why the kind is not "internal": *direct invocation* describes **how the skill is chosen**, not **who is allowed to choose it**. Any skill, agent, or workflow can load one, as long as it knows the name. There is no ownership fence around it. "Internal" would claim ownership by a single caller; direct invocation only claims a selection mechanism.

## The rule

> **A Direct Invocation skill's description is kept to the minimum.**

The `description` field is the only thing a model matches against, on every harness. A description with nothing matchable in it is a skill that cannot be selected by accident, anywhere:

```yaml
---
name: resolve-config
description: 'Direct invocation only'
---
```

Quote the value. A description containing an unquoted colon is invalid YAML that some parsers accept and others reject, which is [the most common way a skill silently vanishes on one harness](/agent-configuration/portable-skills/#validation-is-lenient-but-asymmetrically).

All Direct Invocation skills share this same description; they are distinguished by `name`, which is how callers address them. Identity moves to the body and the README. What the skill is, who calls it, and what it returns is documentation a caller reads after loading it by name, not selection criteria a model reads before.

`user-invocable: false` alone does not enforce unmatchability. It hides the skill from the `/` menu while leaving its description in context and fully model-invocable. See [Selection and Visibility are not the same question](/agent-configuration/skills/overview/#selection-and-visibility-are-not-the-same-question).

## Skills that are not meant to run alone

Some Direct skills are fragments: a criteria set a producer aligns itself to, a step factored out of a longer procedure. Running one standalone is not forbidden so much as meaningless. This is worth saying in the skill's README, and it changes nothing mechanically: a fragment and a self-contained engine are selected the same way and both keep minimal descriptions. Treat it as documentation, not as a separate kind.

A Direct skill whose effect is **reference** rather than **action** is read as criteria instead of executed as steps: a producer loads it to align, a reviewer loads it to grade.

## Related

- [Kinds of Skill](/agent-configuration/skills/overview/): the Selection, Visibility, and Effect axes this page specializes
- [Commands](/agent-configuration/skills/commands/): the user-visible, explicit-selection counterpart
- [Writing Portable Skills](/agent-configuration/portable-skills/): why the description is the only reliable selection input
- [Responsibility](/agent-configuration/skills/responsibility/): the delegation this mechanism realizes
- [Sources & Confidence](/sources/): how well-sourced the harness claims above are
