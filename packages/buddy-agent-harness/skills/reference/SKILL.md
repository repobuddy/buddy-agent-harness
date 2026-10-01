---
name: reference
description: Use this skill when loading, writing, updating, or finding a reference — a Markdown document agents read by name.
user-invocable: false
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
| learn where the agent looks for a reference, or where to put a copy that overrides it | [Inspect](#inspect) |
| make a skill load a reference | [Wire a skill](#wire-a-skill) |

Ask only when the request fits two modes. Otherwise pick one; outside Load, say which.

## Run the command

```sh
node <this skill's folder>/scripts/reference.mjs <subcommand> ... --root <repository root>
```

`scripts/reference.mjs` is the package's `reference` command bundled into one file; it needs no `node_modules`. Pass `--root` every time, so the repository's own `.agents/references/` is read.

Outside Load, when it is missing or cannot run, use `npx -y buddy-agent-harness@^0.17.0 reference` with the same arguments. Load never falls back to a package runner.

## Load

Load `references/load.md` from this skill's folder and follow it, then return to the caller's work.

## Create

Load `references/create.md` from this skill's folder and follow it.

## Update

1. Run `show <name> --trace`. Use the exact name it resolved, prefix included. If the name is ambiguous, ask the user which `<plugin>/<name>` they mean.
2. Choose the folder to write: `.agents/references/` for the project, or `~/.agents/references/` for the user alone.
3. If the `used` layer is in that folder, it is the user's own copy. Edit that file in place, then go to step 6.
4. Otherwise, write an override above it. Run `list` and find every plugin that holds the same name. An override applies to all of them, not only the one the user meant. If a second plugin holds it, tell the user before you write anything.
5. Start the override with `create <name> --dry-run`, adding `--scope user` for the user's folder. Pass `--template <path>` with a file that holds only the sections the user changes, each under the heading path it has in the copy below, or the calling skill's template. `create` marks it `merge: merge-sections`, so the sections it does not redefine are kept. Show the user the path and content, then run it without `--dry-run` on approval.
6. Run `show <name> --trace` again. The written file must be `used`. A layer below a `merge-sections` override stays `used`; a layer below a `first-wins` one is `shadowed`.

## Find

- For a topic, run `search <query>`. If nothing matches, say that nothing matched. Do not guess a name.
- For every reference, and which copy of each is used, run `list`.

## Inspect

- To read a reference, run `show <name>`.
- To learn why a name resolved to one copy, run `show <name> --trace`. Report the layer that was `used`, and each layer that was `shadowed` or `not read`, with its reason.
- To learn where to put a copy that overrides it, run `where <name>`; when a skill loads the name, add `--caller <that skill's folder>`. Report the slots in order and which are `used`, then the project and user files the user can write, each with its scope, and the merge note. A plugin or `caller` slot is a copy an override covers; never offer it as a place to write. If the user then wants the override written, go to [Update](#update).

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
- A created reference holds no heading with a single `#`.
- Every `##` heading of a `merge-sections` override matches a heading path in the copy below it. `show <name> --trace` warns when one does not.
