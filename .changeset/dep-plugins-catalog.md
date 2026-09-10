---
"buddy-agent-harness": minor
---

Add `dep-plugins`: derive a marketplace catalog for plugins shipped by a repository's dependencies.

A dependency that ships an Agent Plugins manifest at its package root is a plugin the consuming
repository could use, but no harness discovers one on its own. This command derives a marketplace
catalog from the declared dependencies that ship a manifest, so a harness can install them through
its own plugin mechanism. It reaches whole plugins — agents, commands, hooks, MCP servers — rather
than only skills.

```sh
buddy-agent-harness dep-plugins                # write .agents/buddy-agent-harness/.claude-plugin/marketplace.json
buddy-agent-harness dep-plugins --check        # report whether it is current; writes nothing
buddy-agent-harness dep-plugins --format text  # human-readable report; `toon` is the default, `json` is also available
buddy-agent-harness dep-plugins --root ./pkg   # run against a directory other than the current one
```

Three decisions worth knowing:

- **Resolution, not scanning.** Only declared `dependencies` and `devDependencies` are considered,
  located through the module resolver. Walking `node_modules` would pull in transitive dependencies
  nobody vetted, and a plugin is instruction text that steers an agent.
- **`npm` sources, not paths.** A path source is resolved against the marketplace root and may not
  escape it, so a path-based catalog would have to sit at the repository root — where the
  repository's own public catalog already lives, leaking dependency plugins to anyone adding it. An
  `npm` source carries no path, so this catalog lives in its own directory. It also means the design
  is unaffected by pnpm's layout or by a missing `node_modules`.
- **Derived in full, never merged.** A plugin added, removed, or moved to a new version all follow
  from regeneration, so there is no reconciliation logic to get wrong. `--check` compares bytes.

The catalog is the committed artifact. Registering it with a harness and installing from it are
per-machine actions, so the command **reports** what the harness needs and the command that does it,
and never touches harness state itself:

```
harness:
  runtime: claude-code
  actions:
    do: claude plugin marketplace update acme-web && claude plugin update review@acme-web --scope project
    why: installed 1.0.0, catalog pins 2.0.0
```

It reads each harness's own state files to compute that delta, covering the three cases a dependency
change produces — a plugin appearing, a version moving, and a plugin whose dependency was removed.
The last one matters most: nothing else removes it, so the harness leaves it installed and reporting
a load failure. Every emitted verb carries `--scope project`, because all of them default to user
scope, and user scope is shared across every repository on the machine — two repositories whose
catalogs share a marketplace name collide there silently. A registration already pointing elsewhere
is reported rather than overwritten.

**Runtime support**, each established by running the shipped CLI rather than from documentation:

| Runtime | Consumes this catalog | Notes |
| --- | --- | --- |
| Claude Code | yes | every verb defaults to user scope, so each carries `--scope project`; refresh is `plugin update`, since re-running `install` is a no-op |
| Codex | yes | no update verb and no scope — re-running `plugin add` re-reads the catalog and replaces the cached copy; the installed version appears only in the cache directory name |
| Copilot CLI | **no** | rejects an npm source (`plugins.0.source: Invalid input`); it accepts a path source, which cannot reach `node_modules` from a subdirectory |
| Cursor | no | exposes no plugin subcommand from a terminal |

Only runtimes actually present on the machine are reported, so the output names work the reader can
actually do.
