---
'buddy-agent-harness': minor
---

Add `reference show|list|search`, which reads on-demand reference documents by name. A reference costs no context until it is fetched, unlike a skill, whose description loads in every session.

- **Tiers.** A name resolves through the managed, project (`.agents/references/`), user (`~/.agents/references/`), and plugin tiers, highest first. The plugin tier is this package, the plugins your harness has enabled, and the dependencies declared in the nearest `package.json`; ask for `<plugin>/<name>` when two plugins hold a name.
- **Your harness.** The command detects the harness it runs under. It reads a `references/` folder beside that harness's managed settings (for example `/etc/claude-code/references`), and the `references/` of each plugin the harness has enabled, from the folder it installed the plugin in. A plugin that is installed but not enabled is never read. Policy kept in MDM, the Windows registry, or the vendor's servers cannot be read locally; `--trace` and `list` show it as `not read`, with the reason.
- **Monorepos.** The project tier is read at `--root` and each folder above it up to the repository root (`.git`, `pnpm-workspace.yaml`, or a `package.json` with `workspaces`), nearest first, so a package can override a reference the repository shares.
- **Merge modes.** The higher document chooses in its frontmatter: `first-wins` (default), `combine`, or `merge-sections`, which merges by heading and honors `<!-- merge: combine -->` and `<!-- merge: remove -->` under a heading.
- **File names.** `<name>.md`, `<name>/README.md`, `<name>/index.md`, or `<name>/SKILL.md`.
- **Several names per call.** `show a b c` returns each document between `<reference>` delimiters, in order; `--format json` returns an array. A missing name is reported in place, suggests close names, and makes the exit code 1.
- **`--trace`** shows every layer checked and why each was used or shadowed; `list` marks the same.

`governance list|show` is deprecated. It works as before and writes one line on stderr pointing to `reference`. `reference` still reads the `governances/` folders, below `references/` in each tier.
