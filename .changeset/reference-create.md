---
"buddy-agent-harness": minor
---

New `reference create <name>` starts a reference in the project tier, or with `--scope user` in `~/.agents/references/`. It copies `--template <path>` as it is, or writes a built-in template of top-level `##` sections with no `#` title. When a lower layer already holds the name, it adds `merge: merge-sections` so the new file overrides section by section, unless the template sets `merge` itself. It never overwrites a file, refuses a copy above that would shadow the new one, warns on a `#` heading or a missing `description`, and `--dry-run` prints the path and content without writing. The `reference` skill's Create and Update modes now write project and user references through it.
