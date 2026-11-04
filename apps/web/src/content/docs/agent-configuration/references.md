---
title: References and Skills
description: When supplementary instructions belong in a reference fetched by name rather than in a skill, and how layered references combine.
---

A **reference** is a Markdown document an agent reads on demand: a style guide, a playbook, a checklist, domain notes, a governance. It is fetched by name with [`reference load`](/cli/reference/), and it costs nothing until it is fetched.

"Reference" is the [Agent Skills specification](https://agentskills.io/specification)'s term for material an agent reads on demand. It is deliberately not a vendor term for context that is always loaded: Cursor rules, Copilot instructions, and `AGENTS.md` are all read whether or not the task needs them.

## The session-start trade-off

A skill and a reference differ in when they cost context.

| | Skill | Reference |
| --- | --- | --- |
| Loaded at session start | its `name` and `description`, for every installed skill | nothing |
| Loaded when used | the `SKILL.md` body, when the agent activates it | the whole document, when something asks for it by name |
| Found by | the harness matching the `description` to the task | a name someone wrote down, or [`reference search`](/cli/reference/#reference-list-and-reference-search) |
| Good for | a capability the agent should reach for unprompted | instructions another instruction points to |

The Agent Skills specification puts the startup cost at roughly 100 tokens of metadata per skill, with the body loaded on activation and a skill's own resources on demand. That is cheap per skill and adds up per session: every installed skill pays it in every conversation, used or not.

A reference pays nothing up front. The price is that nothing loads it by itself: an `AGENTS.md` line, a skill, or a person has to name it. So choose by who starts the read:

- **The agent should decide, from the task, that it needs this.** Make it a skill. Its description is the trigger.
- **Something else already knows it is needed.** Make it a reference, and name it there: `Read the testing reference before writing tests`, or a skill step that loads `release-checklist`.

A skill loads a reference through the [`reference` skill](https://github.com/cyber-uni/cyber-agentkit/tree/main/packages/cyber-agentkit/skills/reference) in the `cyber-agentkit` plugin, with one line naming it and the plugin it comes from. To write, update, or find one yourself, run the same skill.

A governance, the bar a skill holds its own output to, is the second case. The skill knows which bar it needs, so the bar does not need a description in every session.

## Where references live

References resolve through tiers, highest precedence first:

| Tier | Where |
| --- | --- |
| `managed` | a folder beside the managed settings of the harness you run, for a machine owner |
| `repo` | `.agents/references/`, committed with the repository |
| `user` | `~/.agents/references/` |
| `plugin` | a `references/` folder shipped by this package, by a plugin your harness has enabled, or by a declared dependency |

In a monorepo, a folder below the repository root can hold its own `.agents/references/`, a project section that `reference load` delivers after the main document. Write one with `--in <folder>`. The [CLI page](/cli/reference/#tiers) has the details.

Documents written for the older [`governance`](/cli/governance/) command, in `governances/` folders, are no longer read. Move them to the `references/` folder of the same tier.

## Naming a reference a plugin ships

Names are flat, and the tiers treat a shared name in two different ways:

- **Between plugins, a clash is loud.** Two plugins holding the same name is an error that names both, and the caller settles it by asking for `<plugin>/<name>`.
- **Above the plugins, a clash is silent.** A project, user, or managed copy of `<name>` [overrides every plugin's copy of it](/cli/reference/#tiers), whether or not the caller qualified the name. A project's `.agents/references/work-hierarchy.md`, written to override one plugin's `work-hierarchy`, replaces every other plugin's `work-hierarchy` as well. Nothing warns: the project copy even stops the plugin clash from being reported.

So a plugin should prefix each name it ships with its own name and a dot, as in `cyber-asana.work-hierarchy`. A name may already contain dots, so the resolver needs no change. An override then targets one plugin's document by its file name, `.agents/references/cyber-asana.work-hierarchy.md`, and the owner of any file in a tier folder can be read from its name.

A reference a project writes for its own use, and not to override a plugin's, needs no prefix. Nothing ships that name, so nothing else can hold it.

Renaming a reference that has already shipped breaks every caller that names it. So apply the prefix to new names, and rename an existing one only in a release that also updates its callers.

## How layers combine

When more than one layer holds a name, the higher document says how it applies over the ones below, in its frontmatter:

```md
---
merge: patch
---

## Testing

Use the fixtures in `test/fixtures`.
```

- **`replace`**: the higher document replaces everything below it.
- **`patch`**, the default: the higher document replaces the matching sections below it, heading by heading, so a project can override one section of a shared reference and keep the rest.
- **`combine`**: both bodies are kept.
- **`remove`**: the contribution is dropped.

To build on another reference, run [`reference customize <name> --extends <step>...`](/cli/reference/#reference-create-customize-and-delete).

The resolver never compares prose. If two layers contradict each other, the merge operation decides which text survives; deciding which is *right* is left to whoever reads the result.

[`reference load --trace`](/cli/reference/#reference-load) shows which layer answered and why the others did not, and `reference list` marks every hidden layer. To see where to put an override, run [`reference where <name>`](/cli/reference/#reference-where).
