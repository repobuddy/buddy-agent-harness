# Governance overrides

A caller learns where a governance comes from when someone has overridden it.

## What

A skill ships its own copy of each governance it loads, and that copy is the version the skill was tested against.
A repository, a person, or a machine owner may replace it without rebuilding the skill, by putting an override in a
known directory. A skill needs to ask, cheaply and on every governance it reads, whether such an override exists. The
answer almost always is "no". If the answer could come from some other package's shipped copy, the skill would follow
a version it was never built against, without anyone noticing.

The `governance` command answers that question over the override layers, and lets a person or a program read one
governance or see what the layers hold. It never answers with a copy from inside a skill. An override is a choice,
never a fault, so nothing here diagnoses.

The command is deprecated: the [`reference`](../references/README.md) command is the read path now. It keeps the
behavior below until the next major version, and says on every run that it is deprecated.

## Non-goals

- N1 The copy inside a skill. The skill reads its own default from its own folder. This command never reads a skill's
  folder.
- N2 Putting the copies into the skills. That is `universal-plugin`'s build step.
- N3 Which runner a skill uses to call the command. The skill decides. A skill that cannot run the command at all
  takes the same branch as one that ran it and found nothing (R13).
- N4 What a governance says. Nothing here parses a document.
- N5 The encoder, and the refusal of an unsupported format before the command runs. That is
  [command-output](../command-output/README.md).
- N6 Reporting overrides as findings or as a section of `doctor`. Only this command reads the governance layers:
  `init` creates the project references layer and no governances one, and `doctor` reports references through the
  reference layers, which read no `governances/` folder. See [diagnosis-report](../diagnosis-report/README.md) and
  [references](../references/README.md).
- N7 Writing a governance. The command only reads.
- N8 The replacement read path. That is [references](../references/README.md).

## Key terms

- K1 **governance**: see [glossary](../glossary.md#governance).
- K2 **override layer**: see [glossary](../glossary.md#override-layer). Here the machine-wide directory is two layers,
  K5 and K6.
- K3 **layer**: one directory a governance can come from. The layers are the override layers and the package layer.
  A governance in a layer is a Markdown file whose stem is its name.
- K4 **package layer**: the governances this package ships, found beside this package's own manifest. Not an override
  layer.
- K5 **owned machine-wide layer**: the machine-wide directory this package owns, where a machine owner should put a
  governance now. A default, not enforcement: the project and user layers outrank it.
- K6 **deprecated machine-wide layer**: the machine-wide directory `universal-plugin` wrote governances to before this
  package owned the command. Still read, one layer below K5.
- K7 **lookup order**: project layer `<root>/.agents/governances/`, then user layer `~/.agents/governances/`, then K5,
  then K6, then K4. The first layer holding a name wins.
- K8 **search set**: the layers a run reads: every layer, or, when the caller asks for overrides only, every layer
  except K4.
- K9 **governance name**: a file stem. It holds no path separator and no parent-directory segment, and does not end in
  `.md`.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | a skill resolving a governance | learn whether an override exists without paying for a registry lookup |
| A1.2 | a skill resolving a governance | never be handed a shipped copy in place of the one it was tested with |
| A2.1 | a person at a shell, or an agent outside a skill | read one governance as the Markdown it is |
| A2.2 | a person at a shell | learn which layers exist, which one answers each name, and where to write an override |
| A3.1 | another program | take a governance and the layer it came from together |
| A4.1 | a machine owner | keep the governances installed in the deprecated machine-wide layer resolving |
| A4.2 | a machine owner | learn that there is a better place for them, and where they are now |
| A5.1 | a person whose files sit outside the layers | have no file outside a layer read through a governance name |
| A6.1 | any caller of the command | learn that the command is deprecated and what replaces it |

## Use cases

### UC1 — Learn whether an override exists (A1)

- **Trigger**: a skill is about to load a governance and checks for an override first.
- **Entry node**: S0 in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `governance show <name>`, restricted to overrides.
  - library: `resolveGovernance` with the layers `overrideLayers` keeps.
- **Inputs**: the name, the root (the current directory when none is named), and the overrides-only restriction.
- **Success**: the override's document, with a success status.
- **Extensions**:
  - UC1.1 No override layer holds the name: not found, told apart by status alone.
  - UC1.2 A layer is missing, unreadable, or not a directory, or its entry is not a readable document: passed over.
  - UC1.3 The name is not a file stem: rejected (UC6).
  - UC1.4 The run fails unexpectedly: a stated reason, no success.

### UC2 — Read one governance (A2.1)

- **Trigger**: a person or an agent needs the text of a governance it was told to follow.
- **Entry node**: S0 in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `governance show <name>`.
  - library: `resolveGovernance` with the layers `governanceLayers` builds.
- **Inputs**: the name, the root, and an optional format.
- **Success**: the document itself, from the first layer in lookup order that holds it.
- **Extensions**:
  - UC2.1 No layer holds the name: not found.
  - UC2.2 A layer or its entry cannot be read: passed over.
  - UC2.3 The name is not a file stem: rejected (UC6).
  - UC2.4 The run fails unexpectedly: a stated reason, no success.

### UC3 — Take a governance with its layer (A3)

- **Trigger**: a program needs the document and where it came from in one answer.
- **Entry node**: S0 in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `governance show <name>` with a machine format.
  - library: `resolveGovernance`.
- **Inputs**: the name, the root, the format, and the overrides-only restriction.
- **Success**: the name, the layer, the path, and the content together.
- **Extensions**:
  - UC3.1 Not found, rejected, or failed: the same outcomes as UC2.1 to UC2.4.

### UC4 — See what is in play and where to write an override (A2.2)

- **Trigger**: a person asks what governances the layers hold.
- **Entry node**: L0 in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `governance list`.
  - library: `listGovernances` with the layers `governanceLayers` builds.
- **Inputs**: the root and the overrides-only restriction.
- **Success**: every name once, at the layer that would win, and the layers of the search set in lookup order.
- **Extensions**:
  - UC4.1 No layer holds anything: the zero is stated, and the run succeeds.
  - UC4.2 A layer cannot be read: it counts as empty.
  - UC4.3 The run fails unexpectedly: a stated reason, no success.

### UC5 — Keep machine-wide governances resolving after the change of owner (A4)

- **Trigger**: a machine carries governances in the directory `universal-plugin` wrote.
- **Entry node**: S0 or L0 in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `governance show` and `governance list`.
  - library: `governanceLayers`, `managedGovernancesDir`, `deprecatedManagedGovernancesDir`.
- **Inputs**: the platform, and on Windows the program data directory from the environment.
- **Success**: the deprecated layer still answers, below the owned one, and `list` says where to move its documents.
- **Extensions**:
  - UC5.1 Windows names no program data directory: the default one stands in.
  - UC5.2 Both machine-wide layers hold the name: the owned one answers.

### UC6 — Keep a name from reading outside the layers (A5)

- **Trigger**: a caller passes a name built from input it does not control.
- **Entry node**: S0 in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `governance show <name>`.
  - library: `parseGovernanceName`.
- **Inputs**: the name.
- **Success**: a name that is not a file stem is refused, and no file is read for it.
- **Extensions**: extensions: none, the refusal is this use case's goal and it is never sanitized into another name.

### UC7 — Learn that the command is deprecated (A6)

- **Trigger**: any run of `governance list` or `governance show`.
- **Entry node**: S0 or L0 in [graph.md](./graph.md).
- **Entry points**:
  - command line (primary): `governance list`, `governance show`.
- **Inputs**: none beyond the run's own.
- **Success**: the caller is told the command is deprecated and that `reference` replaces it, and the result is
  otherwise unchanged.
- **Extensions**: extensions: none, the notice is written on every run, whatever its outcome.

## Criteria

### Layers

- R1 (UC2, UC4) The layers are read in this lookup order: the project layer `<root>/.agents/governances/`, the user
  layer `~/.agents/governances/`, the owned machine-wide layer, the deprecated machine-wide layer, and the package
  layer.
- R2 (UC2, UC4) When no root is named, the project layer is `.agents/governances/` under the current working
  directory.
- R3 (UC5) On Linux, macOS, and Windows, the owned machine-wide layer is a directory named for this package in that
  platform's machine-wide data location.
- R4 (UC5) On Linux, macOS, and Windows, the deprecated machine-wide layer is the directory `universal-plugin` has
  always used for governances on that platform.
- R5 (UC5.1) On Windows with no program data directory in the environment, both machine-wide layers sit under the
  platform's default program data directory.
- R6 (UC1, E1, E7) When the caller asks for overrides only, the search set is every layer except the package layer,
  both machine-wide layers included, and no answer comes from the package layer or from any skill's folder.

### Showing one governance

- R7 (UC2, E11) When `governance show` finds the name, the first layer in lookup order holding a readable document
  of that name answers, and no later layer is read.
- R8 (UC1.2, UC2.2, E9) When `governance show` meets a layer that is missing, unreadable, or not a directory, or an
  entry of that name that cannot be read as a document, it asks the next layer, and the run does not fail on it.
- R9 (UC5, UC5.2, E11) When only the deprecated machine-wide layer holds the name, `governance show` answers from it;
  when both machine-wide layers hold it, the owned one answers.
- R10 (UC2, E12) When `governance show` finds the name and no format is named, the stream that carries the result
  holds the document exactly as read and nothing else, ending on a newline even when the file does not.
- R11 (UC3, E13) When `governance show` finds the name in a machine format, the result holds the name, the layer it
  came from, the path it was read from, and the content.
- R13 (UC1, E6, E10, E14) `governance show` ends with a success status only when it returns a document, so a caller
  reading only the status takes one branch for every run that found no override.
- R26 (UC1.1, UC2.1, E10) When no layer of the search set holds the name, `governance show` ends without success
  and answers with no document and, in the format the caller asked for, an error whose stable code names not-found
  as its cause, in the error form [command-output](../command-output/README.md) defines.
- R27 (UC6, E6) When the name holds a path separator or a parent-directory segment, or ends in `.md`, `governance
  show` refuses it and reads no file. It answers, in the format the caller asked for, with an error that says what a
  governance name is and carries a stable code distinct from the not-found code of R26, in the error form
  [command-output](../command-output/README.md) defines.
- R15 (UC1.4, UC2.4, E14) When `governance show` fails with something that carries no readable message, it still
  gives a stated reason and ends without success.

### Listing the layers

- R16 (UC4, E4) `governance list` reports each name once, at the layer the lookup order reaches first, sorted by
  name rather than by layer.
- R17 (UC4) `governance list` counts only Markdown files as governances: a file with another extension, or a
  directory named like a document, is not reported.
- R18 (UC4.1, E3) When no layer of the search set holds a governance, `governance list` states that zero were found
  in place of the entries and ends with success.
- R19 (UC4, E3, E4) `governance list` reports every layer of the search set in lookup order with its path, and no
  reported path carries the user's home directory in full: it is collapsed as
  [command-output](../command-output/README.md) collapses it.
- R20 (UC4.2) When `governance list` meets a layer it cannot read, it reports that layer as holding nothing and the
  run does not fail on it.
- R21 (UC5) `governance list` gives the deprecated machine-wide layer a status that says where to move its documents,
  gives no other layer a status, and reports each name answered from that layer with the directory it was read from.
- R22 (UC4.3, E5) When `governance list` fails, even with something that carries no readable message, it gives a
  stated reason and ends without success.

### Default form

- R28 (UC2, UC4) With no format named, `governance show` answers in `text`, with the document itself (R10), and
  `governance list` answers in `toon`.

### Deprecation

- R24 (UC7) Every run of `governance list` or `governance show` says, once, that the command is deprecated and that
  `reference` replaces it, and the notice never appears in the result, a success or an error alike.

### Adapters

- R25 (UC1 to UC5) The library reads the same layers in the same lookup order as the command, and for the same
  inputs finds the same governance at the same layer.

## Open questions

None.

## References

- Decision graph: [graph.md](./graph.md).
- Design this implements, including the lookup order a skill follows and why the check never runs through `npx`:
  [122-governance-retrieval](../../../../../.agents/plans/122-governance-retrieval.design.md).
- User docs: [CLI governance](../../../../../apps/web/src/content/docs/cli/governance.md),
  [library governance](../../../../../apps/web/src/content/docs/library/governance.md).
- Sibling specs: [references](../references/README.md), [command-output](../command-output/README.md),
  [diagnosis-report](../diagnosis-report/README.md), [entry-point](../entry-point/README.md).
