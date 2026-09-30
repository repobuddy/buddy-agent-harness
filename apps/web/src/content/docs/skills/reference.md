---
title: 'Skill: reference'
description: The one skill for references, loading them for a skill, and writing, updating, finding, and inspecting them yourself, with example prompts, how to override a reference a skill loads, and the naming rule for a plugin's.
---

The `reference` skill is the one skill for [references](/agent-configuration/references/). Other skills load their references through it, and you use it to work with references yourself. It picks a mode from the request, runs the matching [`reference`](/cli/reference/) subcommand, and writes a document only after you approve it. The command is read-only, so the skill writes the file itself.

It is not in the slash-command menu. Ask in words, as in the [examples](#examples) below, and the agent loads it.

## Modes

| The request | The skill |
| --- | --- |
| a skill names references to load | loads them, as [Loading from a skill](#loading-from-a-skill) describes |
| write a new reference | checks that it should not be a skill instead, picks the folder and the name, checks that the name is free with `show`, and writes it |
| update a reference | finds the exact name and the copy that answers with `show --trace`. It edits your own copy in place; for a plugin's copy it checks with `list` which other plugins hold that name, and writes an override |
| find a reference | runs `search`, or `list` for all of them |
| read a reference, or see why a name resolved to one copy | runs `show`, or `show --trace` and reports the layer used and the ones it replaced |
| learn where the agent looks for a reference, or where to put a copy that overrides it | runs `where` and reports the slots in order, which one is used, and the project and user files you can write. It writes nothing; to write the override, ask for an update |
| have a skill load a reference | gives you [the line a skill writes](#the-line-a-skill-writes) |

Reading, tracing, and `where` are all the Inspect mode; only creating and updating write a file.

## Examples

Each prompt below is one you might type. The skill picks the mode, so you never name it.

### Find and read

| You ask | The skill runs |
| --- | --- |
| "Is there a reference about commit messages?" | `search "commit messages"` |
| "List every reference this repo can load." | `list` |
| "Show me the `plugin-design` reference." | `show plugin-design` |
| "Why is the agent using universal-plugin's `plugin-design` and not ours?" | `show plugin-design --trace` |

### Customize a reference a skill loads

This is the most common case. A skill you installed loads a reference, and you want it to follow your rules instead: your team's commit style, your review checklist, your naming. You don't edit the plugin. You write a copy above it, and every skill that loads the name reads yours.

**1. Ask where.**

```text
Where does the agent look for plugin-design, and where do I put my own copy?
```

The skill runs `where` and reports:

```text
name: plugin-design
root: ~/code/my-repo

slots:
  layer                    path                                                                              status  scope
  project                  .agents/references/plugin-design.md                                               empty   everyone working in this repository
  user                     ~/.agents/references/plugin-design.md                                             empty   only you, in every repository
  plugin universal-plugin  ~/.claude/plugins/cache/palo/universal-plugin/0.11.1/references/plugin-design.md  used    read-only; override it with the project or user file

merge: The default, first-wins, makes the override replace the whole document. Set `merge: merge-sections` in its frontmatter to keep the sections it does not redefine.
```

Read it top to bottom: the first `used` row is what the agent reads today, here the plugin's copy. A file in either `empty` row above it wins.

**2. Pick the scope.**

- `.agents/references/plugin-design.md`: committed with the repository, so every teammate's agent reads it.
- `~/.agents/references/plugin-design.md`: yours alone, in every repository you work in.

**3. Pick how it combines.** By default your file replaces the whole document. Add `merge: merge-sections` to its frontmatter to replace only the sections you write, heading by heading, and keep the plugin's other sections. [How layers combine](/agent-configuration/references/#how-layers-combine) covers `combine` and the per-section markers.

**4. Write it, or have the skill write it.**

```text
Override plugin-design for this repo: keep everything, but replace the "Naming" section with ours.
```

That is the Update mode. It shows you the file and its path, writes it on your approval, and runs `show --trace` to confirm your copy is `used`.

When you ask about a reference a particular skill loads, the skill passes that skill's folder as `--caller`. A `caller` row then shows the skill's own fallback copy, which is read only when no layer holds the name.

### Write and wire

| You ask | The skill |
| --- | --- |
| "Write a reference for our API error format, for this repo." | Create: writes `.agents/references/api-errors.md` on approval |
| "Make my `release-notes` skill load `api-errors`." | Wire a skill: gives you the line to add to the skill |

### Pointing your users here

A skill that loads references can tell its users how to change them with one line in its README, without explaining the tiers:

```text
To change what this skill's `review-checklist` reference says, ask the agent where to override `review-checklist`.
```

## Run the command yourself

The same answers come from the [CLI](/cli/reference/), without an agent:

```sh
npx buddy-agent-harness reference search "commit messages"
npx buddy-agent-harness reference show plugin-design --trace
npx buddy-agent-harness reference where plugin-design --format text
npx buddy-agent-harness reference where review-checklist --caller ./skills/code-review --format text
```

## Where it writes

| For | Folder | File |
| --- | --- | --- |
| this repository | `.agents/references/` | `<reference>.md` |
| you, in every repository | `~/.agents/references/` | `<reference>.md` |
| every user of a plugin | the plugin's `references/` | `<plugin name>.<reference>.md` |

A plugin's reference carries the plugin's name as a prefix because a project, user, or managed copy of a name overrides every plugin's copy of it, silently. [Naming a reference a plugin ships](/agent-configuration/references/#naming-a-reference-a-plugin-ships) explains the clash.

For the same reason, an override warns you when a second plugin holds the name you are overriding: the override replaces that plugin's copy too.

## What it does not do

It never edits, renames, or removes a reference a plugin has shipped, since every caller loads it by name.

The skill runs the command from a launcher bundled in its own folder. When the plugin was installed from git and the launcher is missing, every mode but loading falls back to `npx buddy-agent-harness`. Loading never reaches the network; it uses the caller's copies instead.

## Loading from a skill

A **skill** loads a reference by naming this skill. A person or an agent working outside a skill runs [`reference show`](/cli/reference/) directly.

### The line a skill writes

A calling skill names the references it needs in one sentence, and names the plugin as well as the skill:

```text
Load `skill-design` and `agent-tool-output` with the `reference` skill in the `buddy-agent-harness` plugin.
```

Naming the plugin is what lets an agent that does not have the skill tell the user what to install. Claude Code can declare one plugin's dependency on another; Codex, Cursor, and GitHub Copilot CLI cannot, so on those harnesses the sentence is the only thing that says so.

The line names the skill in words rather than as a slash command, because each harness types a plugin's skill differently:

| Harness | Typed form |
| --- | --- |
| Claude Code, GitHub Copilot in VS Code | `/buddy-agent-harness:reference` |
| Cursor, GitHub Copilot CLI, Cline | `/reference` |
| Codex | `$reference` |
| OpenCode, Kilo Code, Gemini CLI, Qwen Code, Crush, OpenHands | no typed form; the model loads a skill when the task names it |

The skill sets `user-invocable: false`, so harnesses that honor it leave it out of the slash-command menu; the typed form is how a skill names it, not a command a user runs.

A form that leaves out the plugin says nothing about where the skill comes from, and two plugins' skills of the same name collide under it. A skill written for one harness only can add that harness's form after the skill's name. The skill's `README.md` carries this table, generated from [`@cyberuni/agent-harness`](https://github.com/cyberuni/agent-harness), so a calling skill's author copies the form from the installed package.

### How it loads

The skill runs the `reference` command from a launcher bundled in its own folder, once for every name the caller listed:

```sh
node <skill folder>/scripts/reference.mjs show <name>... --root <repository root>
```

The launcher is the package's CLI in one file with every dependency inlined. It needs no `node_modules`, runs no `npx`, and downloads nothing. `--root` is the repository, so an override in its `.agents/references/` reaches every skill that loads the name.

Which copy of a reference answers is the command's decision, through the [tiers](/cli/reference/#tiers). The skill never reads a tier folder itself.

It costs one skill description at session start however many references its callers load, and that description also serves every other mode.

### When a reference is not found

A calling skill can ship its own copy of a reference, at `references/<name>.md` in its folder, or at the legacy `references/governances/<name>.md`.

| The command | The skill |
| --- | --- |
| prints the reference | uses it |
| reports it missing | reads the caller's copy, and says so; with no copy, reports it as not loaded |
| reports it ambiguous, because two plugins ship it | loads neither, names both `<plugin>/<name>`, and asks the user to settle it |
| cannot run | reads the caller's copy of every name, and says that no override applied |

The command cannot run when the launcher is not there. It ships through the npm package and is not committed, so a plugin installed from git has none, and the caller's copies are what that install gets.

Reading a caller's copy is the one load that bypasses the command, so it is the one a future record of each load would not see. The skill always tells the user when it happens.

