# References

The package offers the `reference` command, with itself as a plugin.

## What

Agents and people need documents an agent reads on demand: a style guide, a playbook, a checklist. A skill costs
context from the start of every session, because a harness loads every skill's frontmatter then. A reference costs
nothing until it is fetched. Without this command, a user of `buddy-agent-harness` would need a second tool to read
or write one, and the references this package ships would have no reader.

The `cyber-agentkit` package defines the `reference` command and everything it does. This package offers that command
under its own name, reads its own references as a plugin, and picks each subcommand's default output form. This spec
owns only those additions.

## Non-goals

- N1 How references resolve, combine, or are written: the tiers, the merges, and what each subcommand does. That is
  `cyber-agentkit`'s, documented at its [home](https://cyber-uni.github.io/cyber-agentkit/).
- N2 The failure and warning codes themselves. `cyber-agentkit` assigns them; this package passes them on.
- N3 Matching on message wording. A caller reacts to the code of a failure or warning, never to its wording.
- N4 The deprecated `governance` command. That is [governance-overrides](../governance-overrides/README.md).
- N5 The encoder that turns a result into bytes. That is [command-output](../command-output/README.md).
- N6 Reporting references in `doctor`. That is [diagnosis-report](../diagnosis-report/README.md).

## Key terms

- K1 **reference**: a document an agent reads by name, as `cyber-agentkit` defines it. See its
  [home](https://cyber-uni.github.io/cyber-agentkit/).
- K2 **plugin**: a package whose own `references/` folder is a layer of the plugin tier, read under the plugin's name.
- K3 **this package's plugin layer**: this package's own `references/` folder, read as the plugin named
  `buddy-agent-harness`.
- K4 **default form**: the output form a subcommand answers in when the caller names none.
- K5 **current spelling**: the subcommand names, flags, and merge names the depended-on `cyber-agentkit` version
  accepts, as opposed to one it retired.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | an agent or a skill | load a reference by name and parse the answer |
| A2.1 | a person at a shell | read a reference as the document it is |
| A2.2 | a person at a shell | create or customize a reference without a second tool |
| A3.1 | a library caller | offer the same command inside its own command tree |
| A3.2 | a library caller | read the same layers the command reads, from its own code |
| A4.1 | a reader of the docs or `llms.txt` | find a spelling the command still accepts |

## Use cases

### UC1 — Use the reference command through this package (A1, A2, A3)

- **Trigger**: a caller wants to load, list, search, locate, write, or check a reference.
- **Entry points**:
  - command line (primary): `buddy-agent-harness reference <subcommand>`.
  - library: `referenceCommand`, mounted in the caller's own command tree.
- **Inputs**: the subcommand and its arguments, as `cyber-agentkit` defines them.
- **Success**: the subcommand runs as `cyber-agentkit` defines it, with this package as a plugin.
- **Extensions**:
  - UC1.1 The caller names a subcommand `cyber-agentkit` retired: it is not offered.
  - UC1.2 A subcommand fails or warns: the caller receives the code `cyber-agentkit` assigned.

### UC2 — Read this package's own references (A1, A3)

- **Trigger**: a caller resolves a reference this package ships.
- **Entry points**:
  - command line (primary): any `reference` subcommand that reads the layers.
  - library: `referenceLayers`.
- **Inputs**: the reference name, or the layer options `cyber-agentkit` defines, and for the library an optional
  package root.
- **Success**: this package's plugin layer answers as the plugin `buddy-agent-harness`.
- **Extensions**:
  - UC2.1 A library caller names a package root: the plugin layer is read from that folder instead.

### UC3 — Get each answer in a form fit for its reader (A1, A2)

- **Trigger**: a caller runs a subcommand, with or without naming a format.
- **Entry points**:
  - command line (primary): `buddy-agent-harness reference <subcommand>`.
- **Inputs**: the subcommand, and an optional format.
- **Success**: a subcommand that prints a document or a file answers as that document or file; every other
  subcommand answers in the form an agent parses.
- **Extensions**:
  - UC3.1 The caller names a format: that format answers instead of the default.

### UC4 — Find a spelling that still works (A4)

- **Trigger**: a reader looks up how to call the command in the docs site or in `llms.txt`.
- **Entry points**:
  - docs site (primary): the `reference` pages.
  - `llms.txt`.
- **Inputs**: none.
- **Success**: every spelling the reader finds is one the command accepts.
- **Extensions**: extensions: none, a page either names a current spelling or fails R10.

## Criteria

### Offering the command

- R1 (UC1) Through this package, the `reference` command offers every subcommand of the `cyber-agentkit` version
  this package depends on: `load`, `list`, `search`, `where`, `create`, `customize`, `delete`, `implementations`, and
  `check`.
- R2 (UC1.1) Through this package, the `reference` command offers no subcommand `cyber-agentkit` 2.0 retired: there is
  no `show` and no `select`.
- R3 (UC1) Each `reference` subcommand behaves as `cyber-agentkit` defines it; this package changes only the plugin it
  names (R5) and the default form of each subcommand (R7, R8).
- R4 (UC1.2) When a `reference` subcommand run through this package fails or warns, the caller receives the same code
  `cyber-agentkit` assigned to that failure or warning.

### This package as a plugin

- R5 (UC2) When a reference is resolved through this package, by the command or by the library, this package's own
  `references/` folder is the first plugin layer, under the plugin name `buddy-agent-harness`.
- R6 (UC2.1) When a library caller reading the layers names a package root, the plugin layer is that folder's
  `references/`, still under the plugin name `buddy-agent-harness`.

### Default form

- R7 (UC3) Run through this package with no format named, `reference load`, `reference create`, and `reference delete`
  answer with the document or the file itself, not wrapped in a structure.
- R8 (UC3) Run through this package with no format named, every other `reference` subcommand answers in the
  structured form an agent parses, the one the package's other commands default to.
- R9 (UC3.1) When the caller names a format on any `reference` subcommand, the answer is in that format.

### Docs

- R10 (UC4) The docs site and `llms.txt` name only current spellings of the `reference` command, and none that
  `cyber-agentkit` retired.

### Adapters

- R11 (UC1, UC2) The `reference` command reached from the command line and the one a library caller mounts offer the
  same subcommands with the same outcomes, and the layers the library returns are the ones the command reads.

## Open questions

- Q1 Which spec is the home of the default-form rule (R7, R8)? The [command-output](../command-output/README.md)
  spec owns the encoder, and `llms.txt` states every command's default in one line. Options: (a) keep the rule for
  `reference` here and have command-output link it; (b) move every command's default form to command-output and link
  it from here. Recommendation: (b), since the same split holds for `governance show` and one home stops the two
  from drifting.

## References

- `cyber-agentkit`, the owner of the command: [home](https://cyber-uni.github.io/cyber-agentkit/).
- User docs: [CLI reference](../../../../../apps/web/src/content/docs/cli/reference.md),
  [library references](../../../../../apps/web/src/content/docs/library/references.md),
  [what a reference is](../../../../../apps/web/src/content/docs/agent-configuration/references.md).
- Sibling specs: [governance-overrides](../governance-overrides/README.md),
  [command-output](../command-output/README.md), [entry-point](../entry-point/README.md),
  [diagnosis-report](../diagnosis-report/README.md).
