---
title: 'Skill: reference'
description: The skill for writing, updating, finding, and inspecting references, and the naming rule it applies when a plugin ships one.
---

The `reference` skill is the one to run when you work with [references](/agent-configuration/references/) yourself. It picks a mode from what you ask, runs the matching [`reference`](/cli/reference/) subcommand, and writes a document only after you approve it. The command is read-only, so the skill writes the file itself.

```text
/buddy-agent-harness:reference
```

## Modes

| You ask to… | The skill |
| --- | --- |
| write a new reference | checks that it should not be a skill instead, picks the folder and the name, checks that the name is free with `show`, and writes it |
| update a reference | finds the exact name and the copy that answers with `show --trace`. It edits your own copy in place; for a plugin's copy it checks with `list` which other plugins hold that name, and writes an override |
| find a reference | runs `search`, or `list` for all of them |
| see why a name resolved to one copy | runs `show --trace` and reports the layer used and the ones it replaced |
| have a skill load a reference | gives you the caller line for the [`load-reference` skill](/skills/load-reference/) |

## Where it writes

| For | Folder | File |
| --- | --- | --- |
| this repository | `.agents/references/` | `<reference>.md` |
| you, in every repository | `~/.agents/references/` | `<reference>.md` |
| every user of a plugin | the plugin's `references/` | `<plugin name>.<reference>.md` |

A plugin's reference carries the plugin's name as a prefix because a project, user, or managed copy of a name overrides every plugin's copy of it, silently. [Naming a reference a plugin ships](/agent-configuration/references/#naming-a-reference-a-plugin-ships) explains the clash.

For the same reason, an override warns you when a second plugin holds the name you are overriding: the override replaces that plugin's copy too.

## What it does not do

It never edits, renames, or removes a reference a plugin has shipped, since every caller loads it by name. It does not load references for a skill; that is [`load-reference`](/skills/load-reference/).

The skill runs the command from a launcher bundled in its own folder. When the plugin was installed from git and the launcher is missing, it falls back to `npx buddy-agent-harness`.
