---
name: reference
description: Use this skill to write, update, find, or inspect a reference — a Markdown document an agent reads on demand by name, from `.agents/references/`, `~/.agents/references/`, or a plugin's `references/` folder. Covers shipping a reference in a plugin, updating a reference or overriding a plugin's in a project, finding which references exist, and why a name resolved to the copy it did. Triggers on 'write a reference', 'add a style guide as a reference', 'update the testing reference', 'override this plugin's reference', 'ship a reference in my plugin', 'what references are there', or 'why is this reference not my version'.
---

# Reference

Route the request to one mode, then follow that mode. A **reference** is a Markdown document fetched by name; a **tier** is where a copy of it lives. Which copy answers a name is the `reference` command's decision. Never decide it by reading tier folders yourself.

## Run the command

```sh
node <this skill's folder>/scripts/reference.mjs <subcommand> ... --root <repository root>
```

`scripts/reference.mjs` is the package's `reference` command bundled into one file; it needs no `node_modules`. When it is missing or cannot run, use `npx -y buddy-agent-harness@^0.13.1 reference` instead, with the same arguments. Pass `--root` every time, so the repository's own `.agents/references/` is read.

## Route

| The user wants to… | Mode |
| --- | --- |
| write a new reference, for a project, for themselves, or for a plugin to ship | [Create](#create) |
| change what an existing reference says, their own or a plugin's | [Update](#update) |
| find a reference for a topic, or see which ones exist | [Find](#find) |
| see a reference, or learn why a name resolved to the copy it did | [Inspect](#inspect) |
| have a skill load a reference | [Load from a skill](#load-from-a-skill) |

Ask only when the request fits two modes. Otherwise pick one and say which.

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

## Load from a skill

A skill never runs this command. It names the `load-reference` skill in one line. Copy that line from the `README.md` in the `load-reference` skill's folder, and replace the example names.

## Rules

- **Read-only, except Create and Update.** Find and Inspect write nothing.
- **Never edit, move, rename, or delete a reference a plugin ships.** Update overrides it instead. Its callers load it by name.
- **Write only what the user approves.** Show the file and its path before you write it.
