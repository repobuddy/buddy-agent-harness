---
title: 'CLI: dep-plugins'
description: 'CLI reference for buddy-agent-harness dep-plugins: deriving a marketplace catalog from dependencies that ship plugins, and reconciling it with each harness.'
---

```sh
buddy-agent-harness dep-plugins [--root <directory>] [--check] [--format toon|json|text]
```

A dependency that ships an Agent Plugins manifest at its package root is a plugin the consuming
repository could use, but no harness discovers one on its own. `dep-plugins` derives a marketplace
catalog from the declared dependencies that ship a manifest, so each harness can install them through
its own plugin mechanism.

Unlike a skills-only approach, this reaches a whole plugin — agents, commands, hooks, and MCP servers
as well as skills — because the harness installs the plugin rather than borrowing one file from it.

## What it writes

One file, at `.agents/buddy-agent-harness/.claude-plugin/marketplace.json`.

It sits in this tool's own directory rather than the repository root's `.claude-plugin/`, which is
where a repository publishes its *own* plugins for its *own* consumers. Merging the two would leak
every dependency-provided plugin into what a consumer sees on adding the published marketplace, and
no harness has a notion of a private catalog entry to prevent that.

## Options

| Option | Meaning |
| --- | --- |
| `--root <directory>` | The repository to derive from. Defaults to the current directory. |
| `--check` | Report whether the catalog is current without writing it, exiting non-zero when it is stale. For CI and `postinstall`. |
| `--format toon\|json\|text` | Token-efficient TOON output (default), JSON, or a human-readable report. |

## Output

```
catalog: .agents/buddy-agent-harness/.claude-plugin/marketplace.json
marketplace: acme-consumer
outcome: unchanged

plugins:
  name              package           version
  universal-plugin  universal-plugin  0.6.0

harness:
  runtime      status
  claude-code  2 to apply
  codex        in sync

actions:
  runtime      do                                                                subject                         why
  claude-code  claude plugin marketplace add ./.agents/... --scope project       acme-consumer                   marketplace is not registered with this harness
  claude-code  claude plugin install universal-plugin@acme-consumer --scope ...  universal-plugin@acme-consumer  not installed; catalog pins 0.6.0
```

`harness` lists every supported runtime detected on this machine. `actions` names what each one needs
and the command that does it — **reported, never run**. Registering and installing write outside the
repository, into a developer's own harness state, and a generation step should not reach there
without being asked.

## Resolution, not scanning

Only declared `dependencies` and `devDependencies` are considered, located through the module
resolver rather than by walking `node_modules`. A scan would find transitive dependencies nobody
vetted, and a plugin is instruction text that steers an agent — an unvetted transitive dependency is
a supply-chain surface, not a convenience.

Development dependencies are included: a plugin supplying a project's testing or release workflow is
a development dependency, and excluding them would drop most of the cases this exists for.

Two resolution details matter in practice. Roughly one package in seven declares an `exports` map
without a `./package.json` entry and refuses to resolve that way, so a walk up `node_modules` backs
the resolver up. And under pnpm only the package that *declares* a dependency can resolve it, so
resolution is anchored at the declaring manifest rather than at a workspace root.

## Why `npm` sources

Catalog entries use an `npm` source pinned to the installed version, not a path into `node_modules`.

A path source is resolved against the marketplace root and may not escape it — `..` and absolute
paths are both rejected. A path-based catalog would therefore have to sit at the repository root,
which is exactly where the repository's own public catalog lives. An `npm` source carries no path, so
the catalog can live in its own directory.

It also removes the package manager from the picture entirely: nothing depends on `node_modules`
being laid out any particular way, so pnpm's store layout and a not-yet-installed checkout stop
mattering.

## Derived in full

The catalog is regenerated from scratch every run and never merged into what is on disk. That is what
makes the three cases a consumer cares about — a plugin added, a plugin removed, a version moved —
fall out of regeneration rather than needing reconciliation logic of their own. Entries are sorted so
that unchanged inputs serialize identically, which is what lets `--check` compare bytes instead of
interpreting them.

The **harness** side is the opposite: it reconciles nothing on its own, so the delta has to be
computed. A catalog entry that appears is not installed; one that disappears leaves the plugin
installed and reporting a load failure, and `prune` declines to remove it because it was never an
auto-installed dependency.

## Harness support

Each row was established by running the shipped CLI, not from documentation.

| Runtime | Consumes this catalog | What differs |
| --- | --- | --- |
| Claude Code | yes | Every verb defaults to user scope, so each carries `--scope project`. Refresh is `plugin update` — re-running `plugin install` is a no-op that reports "already installed" and leaves the stale copy. |
| Codex | yes | No update verb and no scope: re-running `plugin add` re-reads the catalog and replaces the cached copy. The installed version appears only in the cache directory's name, never in its config. |
| Copilot CLI | **no** | Rejects an `npm` source with `plugins.0.source: Invalid input`. It accepts a path source, which cannot reach `node_modules` from a subdirectory. |
| Cursor | no | Exposes no plugin subcommand from a terminal. |

## Scope and marketplace names

Installs are made at project scope where a runtime has scopes. User scope is shared across every
repository on the machine, and two repositories whose catalogs share a marketplace name collide there
**silently**: the second registration replaces the first, and the install that follows reports
"already installed", so the repository runs the other one's versions with no error anywhere.

The marketplace name is derived from the consuming package's own name for the same reason. A name
generic enough that two repositories are likely to pick it — `deps`, `plugins`, `local` — is reported
as a note, and a marketplace already registered against a different directory is reported rather than
overwritten.

Codex has no scopes at all, so one install serves the whole machine there. The derived marketplace
name is what keeps two repositories apart.
