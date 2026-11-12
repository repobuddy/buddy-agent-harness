---
title: 'CLI: reference'
description: 'CLI reference for buddy-agent-harness reference: load, list, search, where, create, customize, delete, implementations, and check on-demand reference documents across layered tiers.'
---

```sh
buddy-agent-harness reference load <name>... [--root <directory>] [--trace] [--format text|toon|json]
buddy-agent-harness reference list [pattern] [--root <directory>] [--format toon|json|text]
buddy-agent-harness reference search <query> [--full] [--root <directory>] [--format toon|json|text]
buddy-agent-harness reference where <name> [--in <folder>] [--root <directory>] [--format toon|json|text]
buddy-agent-harness reference create <name> [--scope repo|user] [--in <folder>] [--merge replace|patch|combine|remove] [--template <path>] [--dry-run]
buddy-agent-harness reference customize <name> [--extends <step>...] [--scope repo|user] [--in <folder>] [--dry-run]
buddy-agent-harness reference delete <name> [--scope repo|user] [--in <folder>] [--dry-run]
buddy-agent-harness reference implementations <interface>
buddy-agent-harness reference check [name...]
buddy-agent-harness reference migrate [name...] [--plugin <folder>] [--default <folder>] [--root <directory>] [--write]
```

A **reference** is a Markdown document an agent reads on demand. [References and Skills](/agent-configuration/references/) covers when to write one instead of a skill.

The command is `cyber-agentkit`'s `reference` command, mounted with `buddy-agent-harness` as the plugin whose own `references/` folder comes first among the plugin layers. `cyber-agentkit` owns what each subcommand does, its options, and its output, and documents them at [cyber-uni.github.io/cyber-agentkit](https://cyber-uni.github.io/cyber-agentkit/). Run `buddy-agent-harness reference <subcommand> --help` for the options of the version you installed. This page covers what `buddy-agent-harness` adds.

## What this package adds

- **The plugin.** This package's `references/` folder is read as the plugin `buddy-agent-harness`.
- **The default format.** `load`, `create`, and `delete` answer in `text`; every other subcommand answers in `toon`. `--format` overrides either.
- **The skill.** A skill does not run this command itself. It names the [`reference` skill](https://github.com/cyber-uni/cyber-agentkit/tree/main/packages/cyber-agentkit/skills/reference) in the `cyber-agentkit` plugin, which runs `load` from a launcher bundled in its own folder.

## Tiers

A name resolves through these tiers, highest precedence first.

| Tier | Where |
| --- | --- |
| `managed` | a `references/` beside each detected harness's managed files |
| `repo` | `<repository root>/.agents/references/` |
| `user` | `~/.agents/references/` |
| `plugin` | this package's `references/`, the `references/` folder of each plugin the detected harness has enabled, and of each dependency in the repository root's `package.json` |

`--root` is the directory the repository root is found from: the nearest folder at or above it that holds `.git`. It defaults to the current directory.

A folder below the root can hold its own `.agents/references/<name>.md`, a **project section**. `load` delivers each one after the main document. Write one with `--in <folder>`.

`--scope` takes `repo` or `user`. There is no `project` scope: per-folder instructions are project sections.

The `governances/` folders are no longer read. Move a document there to the `references/` folder of the same tier.

## Combining contributions

When more than one contribution holds a name, the higher one says how it applies over the ones below, in its frontmatter `merge`:

| `merge` | Effect |
| --- | --- |
| `replace` | the higher document replaces everything below it |
| `patch` (default) | the higher document's sections replace the matching sections below it, and the rest stay |
| `combine` | both bodies are kept |
| `remove` | the contribution is dropped, and has no body |

`customize` starts from what a name builds on: `reference customize <name> --extends <step>...` lists the steps, bottom first. See `cyber-agentkit` for the exact rules.

## Failures and warnings

An error or warning a subcommand raises carries a stable `code`. A caller that needs to react matches on the `code`, never on the wording of a message. Both are written to stdout, in the format asked for. Exit `0` means the command answered, `1` that it could not complete, and `2` that it was called wrongly.

## `reference load`

```sh
buddy-agent-harness reference load testing release-checklist
```

Prints each document composed from its contributions, in the order asked. With `--format json` or `toon` it returns one entry per name. `--trace` adds every layer checked, its outcome, and how the result was built.

## `reference list` and `reference search`

`list` gives one row per name, with its description, and its status when the name is not found. A pattern keeps only the names it matches exactly. `search` finds references by name, description, tags, headings, or body, best match first, and shows the best 10 unless `--full` asks for every match. Neither writes.

## `reference where`

```sh
buddy-agent-harness reference where testing --in packages/api
```

Gives the files a customization of a name is written to, who each reaches and what hides it, and with `--in`, that folder's project section.

## `reference create`, `customize`, and `delete`

`create` starts a contribution, `customize` picks what a name builds on, and `delete` removes one. All three take `--scope repo|user`, or `--in <folder>` for a project section, and `--dry-run` to print the path and content without writing. `create` never overwrites a file with a body. `delete` never touches an installed or managed contribution.

```sh
buddy-agent-harness reference create release-policy --template ./references/acme.release-policy.md --dry-run
buddy-agent-harness reference customize testing --extends testing-base
buddy-agent-harness reference delete release-policy --dry-run
```

## `reference migrate`

```sh
buddy-agent-harness reference migrate
```

Plans the rewrite of reference files still in a form version 1 wrote, and the rename of files under a name a plugin renamed, in the repo and user tiers and every project section. `--plugin` or `--default` limits it to one plugin's or skill's source folder instead. `--write` applies the plan; it never changes a managed or installed file.
