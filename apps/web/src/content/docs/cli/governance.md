---
title: 'CLI: governance'
description: 'CLI reference for buddy-agent-harness governance: listing and showing the governance documents the override layers hold.'
---

```sh
buddy-agent-harness governance list [--root <directory>] [--overrides-only] [--format toon|json|text]
buddy-agent-harness governance show <name> [--root <directory>] [--overrides-only] [--format toon|json|text]
```

A **governance** is a version-pinned Markdown rule set that a skill loads, such as `skill-design` or
`agent-tool-output`. Each skill ships its own committed copy. `governance` reads the layers a person
or a machine owner can override that copy with, and is read-only: it never writes a governance
document itself.

## Lookup order

A governance name resolves at the first layer that holds it:

| Scope | Directory |
| --- | --- |
| `project` | `<root>/.agents/governances/` |
| `user` | `~/.agents/governances/` |
| `managed` | the machine-wide directory this package owns |
| `managed-deprecated` | the machine-wide directory `universal-plugin` wrote |
| `package` | governances this package ships. It ships none today. |

Both machine-wide layers are defaults, not enforcement — they sit after the project and user layers,
so either can override them.

## The machine-wide directories

A new install uses the directory this package owns. The one `universal-plugin` wrote is still read,
one layer below it, so a machine already carrying governances keeps resolving them.

| Scope | Linux | macOS | Windows |
| --- | --- | --- | --- |
| `managed` | `/etc/buddy-agent-harness/governances` | `/Library/Application Support/BuddyAgentHarness/governances` | `%ProgramData%\BuddyAgentHarness\governances` |
| `managed-deprecated` | `/etc/universal-plugin/governances` | `/Library/Application Support/UniPlugin/governances` | `%ProgramData%\UniPlugin\governances` |

The deprecation is said, not enforced. The old location still answers, so nothing is broken and there
is nothing to repair. `governance list` carries a `status` on that layer's row and on no other, and
[`doctor`](/cli/doctor/) names the directory each override was read from, so an admin can see both
that there is somewhere else to put it and where it currently is.

`init` creates the project layer, `<root>/.agents/governances/`, when it is absent; see
[`init`](/cli/init/). `doctor` reports what is in the project, user, and managed layers as a
`governances` section, never as a finding; see [`doctor`](/cli/doctor/).

## `--overrides-only`

Restricts resolution to the layers someone can write to — `project`, `user`, and both machine-wide
layers — and never returns a governance this package ships. This is the guarantee behind step 2 of the lookup order a skill runs at load
time: `buddy-agent-harness governance show <name> --overrides-only`, run only from an already-installed
copy, so a skill's own tested copy is never silently replaced by whatever this package happens to
ship.

With `--overrides-only`, `governance show` exits non-zero and writes nothing when no override layer
holds the name — including when the package layer would have.

## `governance list`

Lists every governance any layer holds, each reported at the layer that would win, sorted by name,
plus the `layers` section naming every layer in lookup order and its status. Always exits `0`.

```sh
buddy-agent-harness governance list --format text
```

```
layers:
  scope               path                                                    status
  project             ~/code/acme/.agents/governances
  user                ~/.agents/governances
  managed             /etc/buddy-agent-harness/governances
  managed-deprecated  /etc/universal-plugin/governances                       deprecated — move these documents to the managed layer above
  package             ~/code/acme/node_modules/buddy-agent-harness/governances

governances:
  name               scope    path
  agent-tool-output  project  ~/code/acme/.agents/governances/agent-tool-output.md
  skill-design       user     ~/.agents/governances/skill-design.md
```

When no layer holds a governance, the `governances` section is the sentence
`0 governances — no layer holds one` rather than an empty list, following the same "state the zero"
convention as [`doctor`](/cli/doctor/#output).

## `governance show`

Prints the resolved governance for one name.

```sh
buddy-agent-harness governance show agent-tool-output
```

The default format is `text`, which writes the Markdown document itself, verbatim, and nothing else
— no wrapper, no trailing report. `--format toon` or `--format json` wraps it instead:

```sh
buddy-agent-harness governance show agent-tool-output --format json
```

```json
{"name":"agent-tool-output","scope":"project","path":"~/code/acme/.agents/governances/agent-tool-output.md","content":"# Agent tool output\n\n..."}
```

Exits `1` when no layer holds the name, writing the reason to stderr and nothing to stdout — a
caller reading the document off stdout must never receive prose about not finding one.

### Governance names

A name is a file stem: letters, digits, hyphens, and dots, never a path separator, and never ending
in `.md`. Anything else is rejected before any file is touched, so a name built from untrusted input
cannot reach outside a layer's directory.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | Repository or package directory the project layer resolves against. Defaults to the current directory. |
| `--overrides-only` | Resolve only the layers someone can write to: project, user, and both machine-wide layers. Never returns a governance this package ships. |
| `--format toon\|json\|text` | Output format. `governance list` defaults to `toon`; `governance show` defaults to `text`. |

## Paths in the report

Every path is reported with the user's home directory collapsed to `~`, so a report handed to
someone else can be pasted on a machine that is not the one it came from.
