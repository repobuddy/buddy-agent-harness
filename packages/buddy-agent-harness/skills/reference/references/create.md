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

A reference is top-level `##` sections, with no `#` title, and a `description` in its frontmatter:

```md
---
description: One line that says what the reference covers.
tags: [testing, fixtures]
---

## Fixtures

Instructions only.
```

- `description` and `tags` are what `search` matches. Always write a `description`.
- Other frontmatter keys are allowed. `show --format json` returns them under `metadata`, merged key by key across the layers used.
- If the user's text starts with a `#` title, drop the title and make the sections under it top-level `##` sections.
- Write instructions an agent follows. Leave the rationale out.

For the project or the user, run `create`; never write the file by hand:

1. Run `create <name> --dry-run`. Add `--scope user` for the user alone, and `--template <path>` when a calling skill or the user supplies the text; without it, the command writes its own template.
2. Show the user the path and the content it printed, with any warning.
3. On approval, run the same command without `--dry-run`. Its trace must report the new file `used`.

If `create` refuses, report its reason and write nothing. An existing file means Update.

For a plugin, `create` does not write into the plugin. Show the file and its path, then write it by hand on approval, under the same shape.

## 5. Connect it to a caller

Nothing loads a reference by itself. Tell the user where to name it:

- For a repository, add a line to `AGENTS.md`, or to the skill that needs it, such as: "Read the `testing` reference before writing tests."
- For a plugin, add the caller line to each skill that needs the reference, as Wire a skill says.

## 6. Verify

Run `show <name> --trace`, unless `create`'s own trace already showed it. The new file must be the layer that is `used`. For a plugin reference, run the command where the plugin is installed. Otherwise, report that the plugin tier was not checked.
