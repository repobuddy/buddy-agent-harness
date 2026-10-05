---
title: 'CLI: reference'
description: 'CLI reference for buddy-agent-harness reference: show, list, search, where, create, and delete on-demand reference documents across layered tiers.'
---

```sh
buddy-agent-harness reference show <name>... [--root <directory>] [--trace] [--format text|toon|json]
buddy-agent-harness reference list [--root <directory>] [--format toon|json|text]
buddy-agent-harness reference search <query> [--root <directory>] [--format toon|json|text]
buddy-agent-harness reference where <name> [--root <directory>] [--caller <skill folder>] [--format toon|json|text]
buddy-agent-harness reference create <name> [--template <path>] [--scope project|user] [--root <directory>] [--dry-run] [--format text|toon|json]
buddy-agent-harness reference delete <name> [--scope project|user] [--root <directory>] [--dry-run] [--format text|toon|json]
```

A **reference** is a Markdown document an agent reads on demand. [References and Skills](/agent-configuration/references/) covers when to write one instead of a skill. Every subcommand but `create` and `delete` is read-only. `create` writes one new file in the project or user tier and never changes a file that exists. `delete` removes one file from the project or user tier and never touches a plugin-shipped or managed copy.

`--root` is the directory the project tier is read from, walking up to the repository root. It defaults to the current directory.

A skill does not run this command itself. It names the [`reference` skill](https://github.com/cyberuni/agent-harness/tree/main/packages/agent-harness/skills/reference) in the `cyber-agent-harness` plugin, which runs `show` from a launcher bundled in its own folder.

## Tiers

A name resolves through these tiers, highest precedence first. Each tier holds one or more layers.

| Tier | Layers, in order |
| --- | --- |
| `managed` | the machine-wide `references/`, then a `references/` beside each detected harness's managed files, then the machine-wide `governances/`, then the folder `universal-plugin` wrote |
| `project` | `<dir>/.agents/references/`, then `<dir>/.agents/governances/`, for each folder of the walk, nearest first |
| `user` | `~/.agents/references/`, then `~/.agents/governances/` |
| `plugin` | this package's `references/` as the plugin `buddy-agent-harness`, the `references/` folder of each plugin the detected harness has enabled, and the `references/` folder of each dependency in the nearest `package.json` |

The machine-wide folders:

| | Linux | macOS | Windows |
| --- | --- | --- | --- |
| `references/` | `/etc/buddy-agent-harness/references` | `/Library/Application Support/BuddyAgentHarness/references` | `%ProgramData%\BuddyAgentHarness\references` |

**Harness-managed folders.** The command detects the harness it runs under from its environment, and reads a `references/` folder beside the managed policy files that harness keeps on disk: `/etc/claude-code/references` for Claude Code on Linux, `/etc/codex/references` for Codex. A drop-in folder such as `managed-settings.d` is part of the folder above it, not a folder of its own. No harness documents a managed references folder; the name is this package's own. Policy a harness keeps in MDM, the Windows registry, or its vendor's servers cannot be read locally. It is listed as a layer marked `not read`, with the reason, so `--trace` and `list` show what was skipped. With no harness detected, one `not read` layer says so. Nested harnesses, where one was started from the other's shell, are each read.

The `governances/` folders are the ones [`governance`](/cli/governance/) reads, kept so existing documents keep resolving. `list` marks each of them as legacy.

**The walk.** The project tier is read at `--root` and at each folder above it, up to and including the repository root: the first folder holding `.git`, `pnpm-workspace.yaml`, or a `package.json` with `workspaces`. In a monorepo, a package's own `.agents/references/` answers before the one at the repository root. With no repository root above `--root`, only `--root` is read.

**Plugins.** Only packages listed in `dependencies` or `devDependencies` are read, never a transitive dependency. Two plugins holding the same name is an error that names both; ask for one as `<plugin>/<name>`. A qualified name picks that plugin's copy, and a project, user, or managed copy of `<name>` still overrides it. A plugin avoids that silent override by [prefixing the names it ships](/agent-configuration/references/#naming-a-reference-a-plugin-ships).

**Enabled plugins.** A plugin the detected harness has enabled, in its settings files, is read from the folder the harness installed it in. A plugin that is installed but not enabled is never read: installing a plugin does not activate it. A Claude Code plugin installed for one project is read only inside that project. An enabled plugin with no recorded install folder, a harness that keeps no readable record of enabled plugins (Cursor), and policy that can enable plugins but cannot be read locally each appear as a `not read` layer with the reason. `node_modules` is never searched for plugins.

## File names

In each layer, the first of these that exists answers:

1. `<name>.md`
2. `<name>/README.md`, then `<name>/index.md`
3. `<name>/SKILL.md`, a skill folder served as a reference

When two exist in one layer, the earlier answers and a warning names the other.

## Frontmatter

| Field | Meaning |
| --- | --- |
| `merge` | `first-wins` (default), `combine`, or `merge-sections`: how this document combines with the layers below it |
| `description` | one line, shown by `list` and `search` |
| `tags` | matched by `search` |

Frontmatter never appears in the text output. `--format json` returns it as `metadata`.

### `merge-sections`

A section is a heading and the headings above it, such as `Testing > Fixtures`. Matching ignores case and surrounding whitespace, and headings inside code fences are ignored. Text before the first heading is its own section.

| In the higher document | Effect |
| --- | --- |
| a section that matches one below | replaces it, subsections included |
| `<!-- merge: combine -->` directly under the heading | keeps both bodies, and merges the subsections the same way |
| `<!-- merge: remove -->` directly under the heading | drops the section |
| a section that matches nothing | added after its last sibling |

A `combine` or `remove` that matches nothing, and a heading path that appears twice, each produce a warning. Layers apply from the bottom up: plugin, user, project farthest first, managed.

## `reference show`

```sh
buddy-agent-harness reference show testing release-checklist
```

| Result | stdout | stderr | Exit |
| --- | --- | --- | --- |
| one name, found | the document | warnings, if any | `0` |
| several names, all found | each document as `<reference name="…" tier="…">` … `</reference>`, in the order asked | warnings, if any | `0` |
| some missing or ambiguous | the found ones, and `<reference name="…" status="missing" />` in place of each miss | one `error:` line per miss, with up to three close names | `1` |
| one name, missing | nothing | the `error:` line | `1` |
| a name that is a path, or an unknown format | nothing | the reason | `1` |

`show` never answers with a close match. It only suggests one.

`--format json` and `--format toon` return an array, one entry per name in the order asked:

```json
[
  {
    "name": "testing",
    "status": "found",
    "tier": "project",
    "plugin": "",
    "path": "~/code/acme/.agents/references/testing.md",
    "merge": "merge-sections",
    "metadata": { "merge": "merge-sections", "description": "How we test" },
    "content": "…",
    "layers": [
      { "tier": "project", "plugin": "", "path": "~/code/acme/.agents/references/testing.md", "merge": "merge-sections" },
      { "tier": "user", "plugin": "", "path": "~/.agents/references/testing.md", "merge": "first-wins" }
    ],
    "warnings": []
  },
  { "name": "nope", "status": "missing", "suggestions": [], "warnings": [] }
]
```

An ambiguous entry carries `plugins`, the qualified names to ask for instead.

### `--trace`

Reports, per name, every layer checked, whether it held the name, the file that matched, the merge mode it declared, and its outcome: `used`, `missing`, `shadowed by <tier> (first-wins)`, `ambiguous`, or `not read — <reason>` for a layer that is never read. With `--format json` or `toon` it is the entry's `trace` field. With `text` it is written to stderr, so stdout is still only the documents.

## `reference list`

Lists every layer in precedence order, then one row per name per layer that holds it, with the status that layer gets when the name is shown. Always exits `0`.

```sh
buddy-agent-harness reference list --format text
```

```
references:
  name     tier     plugin  path                                          status                        description
  testing  project          ~/code/acme/.agents/references/testing.md        used                          How we test
  testing  user             ~/.agents/references/testing.md                  shadowed by project (first-wins)
```

With nothing in any layer, `references` is a sentence stating the zero.

## `reference search`

Finds a reference an agent cannot name. Matches are ranked: exact name, name prefix, a close name, `description` or `tags`, a heading, then the body. Each match is one row with the name, tier, kind of match, and description. Always exits `0`, and states the zero when nothing matches.

```sh
buddy-agent-harness reference search fixtures
```

## `reference where`

Answers where a copy of a name can live, so you know the file to write to override it. `show --trace` answers the other way: why a name resolved to the copy it did.

```sh
buddy-agent-harness reference where testing --format text
```

It resolves the name exactly as `show` does, and reports the slots you can act on, highest precedence first: the project file, the user file, the plugin copy it overrides when a plugin ships the name, and with `--caller <skill folder>`, the loading skill's own copy. `root` states the folder a project path is relative to.

| Field | Meaning |
| --- | --- |
| `layer` | `project`, `user`, `plugin <name>` for the plugin that ships the copy, or `caller` for the loading skill's own copy |
| `path` | the file to write, or the file that holds the name. A project path is relative to `root` |
| `status` | `used`, `shadowed`, or `empty`. It follows each copy's `merge` metadata, so a copy under a merging override stays `used`. The caller's copy is `used` only when no layer holds the name |
| `scope` | who the slot applies to: everyone working in this repository (project), only you (user), or read-only for a plugin's or the caller's copy, which you override with the project or user file |

`merge` explains how an override combines with what it covers: by default it replaces the whole document; set `merge: merge-sections` in its frontmatter to keep the sections it does not redefine.

A name no layer holds is not an error; the slots are still the answer. An ambiguous name lists the `<plugin>/<name>` choices and exits `1`.

## `reference create`

Starts a new reference, or an override of a copy a lower layer holds.

```sh
buddy-agent-harness reference create release-policy --template ./references/acme.release-policy.md --dry-run
```

| Option | Meaning |
| --- | --- |
| `--scope` | `project` (default) writes `<root>/.agents/references/<name>.md`; `user` writes `~/.agents/references/<name>.md`. It never writes a plugin's or the managed folder |
| `--template` | a file written as it is, frontmatter included. Without it, a built-in template: a `description` and `tags` placeholder, then top-level `##` sections, with no `#` title |
| `--dry-run` | prints the target path, a blank line, and the exact content; writes nothing |

When a layer below the target already holds the name, `create` adds `merge: merge-sections` to the frontmatter, so the new file replaces only the sections it writes. A template that sets `merge` itself keeps its value. A plugin can pass its own shipped reference as `--template` to start a repository's copy from its text.

The file is written as top-level `##` sections because `merge-sections` matches a section by its full heading path. A `#` title holds every other section under it: an override that repeats the title replaces the whole document, and one that leaves it out has every section added as a duplicate. `create` warns on a `#` heading outside a code fence, and on a missing `description`, and still writes.

| Refused, exit `1`, nothing written | Why |
| --- | --- |
| the target file exists | change it with the `reference` skill's Update mode; there is no `--force` |
| a `first-wins` copy in a layer above the target | nothing would read the new file |
| a template path with no readable file, or frontmatter that is not a YAML mapping | `show` would drop that frontmatter |
| a name that is a path, or `<plugin>/<name>` | an override is written under the bare name |
| a scope other than `project` or `user` | |

After a write, `text` prints the path and then the name's trace, in which the new file is `used`. `--format json` and `toon` return one object: `name`, `scope`, `path`, `dryRun`, `content`, `warnings`, and after a write `trace`.

## `reference delete`

Removes the project or user copy of a reference, and reports which copy answers the name afterwards.

```sh
buddy-agent-harness reference delete release-policy --dry-run
```

| Option | Meaning |
| --- | --- |
| `--scope` | `project` (default) deletes from `<root>/.agents/references/`; `user` deletes from `~/.agents/references/`. It never deletes a plugin's or the managed copy |
| `--dry-run` | prints the file that would be deleted and what would answer the name then; deletes nothing |

| Refused, exit `1`, nothing deleted | Why |
| --- | --- |
| no copy of the name in the target tier | the message says which copy answers the name instead |
| a name that is a path, or `<plugin>/<name>` | a project or user copy is held under the bare name |
| a scope other than `project` or `user` | |

`text` prints the path, `deleted` (or `would delete`) with what answers the name next, and then the name's trace without the file. `--format json` and `toon` return one object: `name`, `scope`, `path`, `dryRun`, `next`, and `trace`.
