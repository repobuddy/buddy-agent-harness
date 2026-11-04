---
spec-type: behavioral
concept: command-interface
---

# references

## What

How this package offers the `reference` command: the one `cyber-agentkit` defines, mounted with this
package as a plugin.

A reference is a Markdown document an agent reads on demand: a style guide, a playbook, a checklist.
It is the counterpart of a skill. A harness loads every skill's frontmatter at session start, so a
skill costs context before it is used. A reference costs nothing until it is fetched.

`cyber-agentkit` owns what the command does: the tiers, how contributions combine (`replace`,
`patch`, `combine`, `remove`), `load`, `list`, `search`, `where`, `create`, `customize`, `delete`,
`implementations`, `check`, and the stable `code` each failure or warning carries. This node owns
only what this package adds to it.

**Key terms**

- **plugin** — this package, read as `buddy-agent-harness`: its own `references/` folder is the
  first plugin layer.
- **default format** — the output format a subcommand answers in when `--format` is absent.

**Non-goals**

- **How references resolve, combine, or are written.** That is `cyber-agentkit`, documented at
  <https://cyber-uni.github.io/cyber-agentkit/>.
- **Matching on message wording.** A caller reacts to the `code` of a failure or warning, never to the
  wording of stderr or of a message.
- **The deprecated `governance` command.** That is `../governance-overrides/`.

## Use Cases

**Actors**

- **an agent or skill** — runs `reference load <name>...` and parses the answer.
- **person at a shell** — runs `reference load` to read a document, and `reference customize` or
  `reference create` to write one.
- **a library caller** — mounts `referenceCommand` in its own command tree, or reads layers with
  `referenceLayers`.

**Entry points**

| Entry point | Trigger | Outcome |
| --- | --- | --- |
| `reference <subcommand>` | a caller runs the command | the subcommand `cyber-agentkit` defines, with this package as a plugin |
| `referenceCommand` | a library caller mounts it | the same command, as a clibuilder command |
| `referenceLayers` | a library caller reads layers | the layers `cyber-agentkit` builds, with this package as the plugin |

**Surface.** `load`, `create`, and `delete` answer in `text` unless `--format` says otherwise; every
other subcommand answers in `toon`. Nothing in this package names `reference show`, `reference select`,
`--scope project`, or `merge-sections`: they are `reference load`, `reference customize --extends`,
`--in <folder>`, and `patch`.

## Scenarios

| Scenario | Behavior |
| --- | --- |
| a caller lists the subcommands | `load`, `list`, `search`, `where`, `create`, `customize`, `delete`, `implementations`, and `check` are offered, and `show` and `select` are not |
| a caller loads a name this package ships | the package's `references/` folder answers as the plugin `buddy-agent-harness` |
| a caller runs `load`, `create`, or `delete` with no `--format` | the answer is `text` |
| a caller runs another subcommand with no `--format` | the answer is `toon` |
| a caller passes `--format` | that format wins |
| a caller reacts to a failure or warning | it matches on the `code`, not the wording |
| a library caller imports `referenceLayers` | the layers carry this package as a plugin |
