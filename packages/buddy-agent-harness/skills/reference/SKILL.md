---
name: reference
description: Use this skill when loading, writing, updating, or finding a reference — a Markdown document agents read by name.
---

# Reference

Route the request to one mode, then follow that mode. A **reference** is a Markdown document fetched by name; a **tier** is where a copy of it lives. Which copy answers a name is the `reference` command's decision. Never decide it by reading tier folders yourself.

## Route

| The request | Mode |
| --- | --- |
| a skill's instructions name references to load with this skill | [Load](#load) |
| write a new reference, for a project, for the user, or for a plugin to ship | [Create](#create) |
| change what an existing reference says, the user's own or a plugin's | [Update](#update) |
| find a reference for a topic, or see which ones exist | [Find](#find) |
| see a reference, or learn why a name resolved to the copy it did | [Inspect](#inspect) |
| make a skill load a reference | [Wire a skill](#wire-a-skill) |

Ask only when the request fits two modes. Otherwise pick one; outside Load, say which.

## Run the command

```sh
node <this skill's folder>/scripts/reference.mjs <subcommand> ... --root <repository root>
```

`scripts/reference.mjs` is the package's `reference` command bundled into one file; it needs no `node_modules`. Pass `--root` every time, so the repository's own `.agents/references/` is read.

Outside Load, when it is missing or cannot run, use `npx -y buddy-agent-harness@^0.13.1 reference` with the same arguments. Load never falls back to a package runner.

## Load

Load `references/load.md` from this skill's folder and follow it, then return to the caller's work.

## Create

Load `references/create.md` from this skill's folder and follow it.

## Update

1. Run `show <name> --trace`. Use the exact name it resolved, prefix included. If the name is ambiguous, ask the user which `<plugin>/<name>` they mean.
2. Choose the folder to write: `.agents/references/` for the project, or `~/.agents/references/` for the user alone.
3. If the `used` layer is in that folder, it is the user's own copy. Edit that file in place, then go to step 6.
4. Otherwise, write an override above it. Run `list` and find every plugin that holds the same name. An override applies to all of them, not only the one the user meant. If a second plugin holds it, tell the user before you write anything.
5. Write `<name>.md` in the chosen folder. Use `merge: merge-sections` in the frontmatter when the user changes some sections and keeps the rest. With the default, `first-wins`, the override replaces the whole document.
6. Run `show <name> --trace` again. The written file must be `used`, and every layer it replaces must be `shadowed`.

## Find

- For a topic, run `search <query>`. If nothing matches, say that nothing matched. Do not guess a name.
- For every reference, and which copy of each is used, run `list`.

## Inspect

- To read a reference, run `show <name>`.
- To learn why a name resolved to one copy, run `show <name> --trace`. Report the layer that was `used`, and each layer that was `shadowed` or `not read`, with its reason.

## Wire a skill

A skill never runs the command itself. It names this skill in one line; copy that line from the `README.md` in this skill's folder, and replace the example names. The skill may also ship its own copy of a reference at `references/<name>.md` in its folder, which Load reads when no tier holds the name or the command cannot run.

## Rules

- **Only Create and Update write.** Load, Find, Inspect, and Wire a skill change no reference file.
- **Never edit, move, rename, or delete a reference a plugin ships.** Update overrides it instead. Its callers load it by name.
- **Write only what the user approves.** Show the file and its path before you write it.

## Validate

Before reporting a Create or Update done:

- The written file is under `.agents/references/`, `~/.agents/references/`, or, for Create only, the plugin's own `references/` folder.
- No file in an installed plugin's `references/` folder changed.
- The file and its path were shown to the user before the write.
- `show <name> --trace` reports the written file as `used`.
