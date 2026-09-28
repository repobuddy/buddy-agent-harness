---
title: 'Skill: load-reference'
description: The one way a skill loads a reference, the line a calling skill writes, and what happens when the command cannot run.
---

The `load-reference` skill is how a **skill** loads a [reference](/agent-configuration/references/). A person or an agent working outside a skill runs [`reference show`](/cli/reference/) directly.

## The line a skill writes

A calling skill names the references it needs in one sentence, and names the plugin as well as the skill:

```text
Load `skill-design` and `agent-tool-output` with the `load-reference` skill in the `buddy-agent-harness` plugin.
```

Naming the plugin is what lets an agent that does not have the skill tell the user what to install. Claude Code can declare one plugin's dependency on another; Codex, Cursor, and GitHub Copilot CLI cannot, so on those harnesses the sentence is the only thing that says so.

The line names the skill in words rather than as a slash command, because each harness types a plugin's skill differently:

| Harness | What a user types |
| --- | --- |
| Claude Code, GitHub Copilot in VS Code | `/buddy-agent-harness:load-reference` |
| Cursor, GitHub Copilot CLI, Cline | `/load-reference` |
| Codex | `$load-reference` |
| OpenCode, Kilo Code, Gemini CLI, Qwen Code, Crush, OpenHands | no typed form; the model loads a skill when the task names it |

A form that leaves out the plugin says nothing about where the skill comes from, and two plugins' skills of the same name collide under it. A skill written for one harness only can add that harness's form after the skill's name. The skill's `README.md` carries this table, generated from [`@cyberuni/agent-harness`](https://github.com/cyberuni/agent-harness), so a calling skill's author copies the form from the installed package.

## What it does

The skill runs the `reference` command from a launcher bundled in its own folder, once for every name the caller listed:

```sh
node <skill folder>/scripts/reference.mjs show <name>... --root <repository root>
```

The launcher is the package's CLI in one file with every dependency inlined. It needs no `node_modules`, runs no `npx`, and downloads nothing. `--root` is the repository, so an override in its `.agents/references/` reaches every skill that loads the name.

Which copy of a reference answers is the command's decision, through the [tiers](/cli/reference/#tiers). The skill never reads a tier folder itself.

It costs one skill description at session start however many references its callers load, and the description is the minimal `By name only`, since a caller names the skill rather than a situation matching it.

## When a reference is not found

A calling skill can ship its own copy of a reference, at `references/<name>.md` in its folder, or at the legacy `references/governances/<name>.md`.

| The command | The skill |
| --- | --- |
| prints the reference | uses it |
| reports it missing | reads the caller's copy, and says so; with no copy, reports it as not loaded |
| reports it ambiguous, because two plugins ship it | loads neither, names both `<plugin>/<name>`, and asks the user to settle it |
| cannot run | reads the caller's copy of every name, and says that no override applied |

The command cannot run when the launcher is not there. It ships through the npm package and is not committed, so a plugin installed from git has none, and the caller's copies are what that install gets.

Reading a caller's copy is the one load that bypasses the command, so it is the one a future record of each load would not see. The skill always tells the user when it happens.
