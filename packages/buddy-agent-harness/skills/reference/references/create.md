# Create a reference

## 1. Check that it should be a reference

Decide who starts the read:

- If the agent must decide from the task that it needs this, it is a **skill**, not a reference. Say so and stop.
- If an `AGENTS.md` line, a skill, or a person will name it, it is a reference. Continue.

## 2. Choose where it lives

| Who it is for | Folder | File |
| --- | --- | --- |
| this repository | `.agents/references/` at the repository root, or in a package's folder for that package alone | `<reference>.md` |
| the user, in every repository | `~/.agents/references/` | `<reference>.md` |
| every user of a plugin | the plugin's `references/` folder, next to its `skills/` | `<plugin name>.<reference>.md` |

To change a reference that already exists, use Update instead.

## 3. Name it

- Use lowercase words joined by `-`. A name is a file name, never a path.
- **A plugin prefixes every name it ships** with its own name and a dot: `cyber-asana.work-hierarchy.md`, not `work-hierarchy.md`. Callers load it as `cyber-asana.work-hierarchy`. Without the prefix, a project's `work-hierarchy.md` silently replaces the document of every plugin that ships `work-hierarchy`.
- A repository's or user's own reference needs no prefix.
- Run `show <name>`. If the name already resolves, pick another name, or switch to Update.
- Do not rename a reference that a plugin has already shipped. Its callers load it by the old name. Rename one only in a release that also updates every caller.

## 4. Write it

Write the file in the folder from step 2:

```md
---
description: One line that says what the reference covers.
tags: [testing, fixtures]
---

# Title

Instructions only.
```

- `description` and `tags` are what `search` matches. Always write a `description`.
- Write instructions an agent follows. Leave the rationale out.
- Add `merge` only to a document that sits above another copy of the same name. Update covers this.

## 5. Connect it to a caller

Nothing loads a reference by itself. Tell the user where to name it:

- For a repository, add a line to `AGENTS.md`, or to the skill that needs it, such as: "Read the `testing` reference before writing tests."
- For a plugin, add the caller line to each skill that needs the reference, as Wire a skill says.

## 6. Verify

Run `show <name> --trace`. The new file must be the layer that is `used`. For a plugin reference, run the command where the plugin is installed. Otherwise, report that the plugin tier was not checked.
