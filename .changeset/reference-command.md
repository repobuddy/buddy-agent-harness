---
'buddy-agent-harness': minor
---

Add `reference show|list|search`, which reads on-demand reference documents by name. A reference costs no context until it is fetched, unlike a skill, whose description loads in every session.

- **Tiers.** A name resolves through the managed, local (`.agents/references.local/`, personal and gitignored), project (`.agents/references/`), user (`~/.agents/references/`), and plugin tiers, highest first. The plugin tier is this package and the dependencies declared in the nearest `package.json`; ask for `<plugin>/<name>` when two plugins hold a name.
- **Monorepos.** The local and project tiers are read at `--root` and each folder above it up to the repository root (`.git`, `pnpm-workspace.yaml`, or a `package.json` with `workspaces`), nearest first, so a package can override a reference the repository shares.
- **`final: true`** in a project reference stops a local copy from overriding it; `--trace` and `list` report the local copy as `blocked by final in project`.
- **Merge modes.** The higher document chooses in its frontmatter: `first-wins` (default), `combine`, or `merge-sections`, which merges by heading and honors `<!-- merge: combine -->` and `<!-- merge: remove -->` under a heading.
- **File names.** `<name>.md`, `<name>/README.md`, `<name>/index.md`, or `<name>/SKILL.md`.
- **Several names per call.** `show a b c` returns each document between `<reference>` delimiters, in order; `--format json` returns an array. A missing name is reported in place, suggests close names, and makes the exit code 1.
- **`--trace`** shows every layer checked and why each was used or shadowed; `list` marks the same.

`governance list|show` is deprecated. It works as before and writes one line on stderr pointing to `reference`. `reference` still reads the `governances/` folders, below `references/` in each tier.
