---
title: 'CLI: reference'
description: 'CLI reference for buddy-agent-harness reference: show, list, and search on-demand reference documents across layered tiers.'
---

```sh
buddy-agent-harness reference show <name>... [--root <directory>] [--trace] [--format text|toon|json]
buddy-agent-harness reference list [--root <directory>] [--format toon|json|text]
buddy-agent-harness reference search <query> [--root <directory>] [--format toon|json|text]
```

A **reference** is a Markdown document an agent reads on demand. [References and Skills](/agent-configuration/references/) covers when to write one instead of a skill. `reference` is read-only: it never writes a document.

`--root` is the directory whose `.agents/` holds the project tier. It defaults to the current directory.

## Tiers

A name resolves through these tiers, highest precedence first. Each tier holds one or more layers.

| Tier | Layers, in order |
| --- | --- |
| `managed` | the machine-wide `references/`, then the machine-wide `governances/`, then the folder `universal-plugin` wrote |
| `project` | `<root>/.agents/references/`, then `<root>/.agents/governances/` |
| `user` | `~/.agents/references/`, then `~/.agents/governances/` |
| `plugin` | this package's `references/` as the plugin `buddy-agent-harness`, and the `references/` folder of each dependency in the nearest `package.json` |

The machine-wide folders:

| | Linux | macOS | Windows |
| --- | --- | --- | --- |
| `references/` | `/etc/buddy-agent-harness/references` | `/Library/Application Support/BuddyAgentHarness/references` | `%ProgramData%\BuddyAgentHarness\references` |

The `governances/` folders are the ones [`governance`](/cli/governance/) reads, kept so existing documents keep resolving. `list` marks each of them as legacy.

The project tier is read at `--root` only. A parent folder, such as a monorepo root above a package, is not read.

**Plugins.** Only packages listed in `dependencies` or `devDependencies` are read, never a transitive dependency. Two plugins holding the same name is an error that names both; ask for one as `<plugin>/<name>`. A qualified name picks that plugin's copy, and a project, user, or managed copy of `<name>` still overrides it.

Harness-managed folders and plugins enabled in a harness are not read yet.

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

A `combine` or `remove` that matches nothing, and a heading path that appears twice, each produce a warning. Layers apply from the bottom up.

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

Reports, per name, every layer checked, whether it held the name, the file that matched, the merge mode it declared, and its outcome: `used`, `missing`, `shadowed by <tier> (first-wins)`, or `ambiguous`. With `--format json` or `toon` it is the entry's `trace` field. With `text` it is written to stderr, so stdout is still only the documents.

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
