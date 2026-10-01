---
title: 'Library: governance'
description: 'Library reference for the deprecated governance exports: the override layers, resolveGovernance, listGovernances, and governanceCommand.'
---

:::caution[Deprecated]
Use the [`reference` exports](/library/references/) instead. Every export on this page keeps its behavior until the next major version, and each carries a `@deprecated` tag naming its replacement. The `reference` layers read the same `governances/` folders, below the `references/` folder in each tier.
:::

These exports perform the work behind the deprecated [`governance`](/cli/governance/) command. They locate governance documents in the override layers, resolve one name to the layer that wins, and list every name the layers hold. They only read: no export writes a governance document.

```ts
import {
	deprecatedManagedGovernancesDir,
	governanceCommand,
	governanceLayers,
	listGovernances,
	managedGovernancesDir,
	overrideLayers,
	parseGovernanceName,
	resolveGovernance,
} from 'buddy-agent-harness'
import type {
	GovernanceDocument,
	GovernanceEntry,
	GovernanceLayer,
	GovernanceListReport,
	GovernanceScope,
	GovernanceShowReport,
	LayerOptions,
} from 'buddy-agent-harness'
```

## Replacements

| Deprecated | Use instead |
| --- | --- |
| `governanceCommand` | `referenceCommand` |
| `governanceLayers`, `overrideLayers` | `referenceLayers` |
| `resolveGovernance` | `resolveReference` |
| `listGovernances` | `listReferences` |
| `parseGovernanceName` | `parseReferenceName` |
| `managedGovernancesDir`, `deprecatedManagedGovernancesDir` | `managedReferencesDir` |
| `GovernanceScope` | `ReferenceTier` |
| `GovernanceLayer` | `ReferenceLayer` |
| `LayerOptions` | `ReferenceLayerOptions` |
| `GovernanceEntry` | `ReferenceRow` |
| `GovernanceDocument` | `ResolvedReference` |
| `GovernanceListReport` | `ReferenceListReport` |
| `GovernanceShowReport` | `ReferenceShowEntry` |

The replacements do not share these signatures. `referenceLayers` is asynchronous, for example, and `resolveReference` reports a miss as a status instead of returning `undefined`.

## governanceLayers

**Deprecated:** use `referenceLayers`.

```ts
function governanceLayers(options: LayerOptions): GovernanceLayer[]
```

Returns the five layers in lookup order: `project`, `user`, `managed`, `managed-deprecated`, and `package`. It builds the paths and does not touch the file system, so a layer it returns may not exist.

| Scope | Directory |
| --- | --- |
| `project` | `<root>/.agents/governances` |
| `user` | `<home>/.agents/governances` |
| `managed` | `managedGovernancesDir(platform, programData)` |
| `managed-deprecated` | `deprecatedManagedGovernancesDir(platform, programData)` |
| `package` | the `governances` folder beside this package's `package.json` |

```ts
const layers = governanceLayers({ root: process.cwd(), home: homedir(), platform: process.platform })
```

### LayerOptions

**Deprecated:** use `ReferenceLayerOptions`.

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | The repository or package directory the `project` layer resolves against |
| `home` | `string` | The home directory the `user` layer resolves against |
| `platform` | `NodeJS.Platform` | Selects the machine-wide directories |
| `programData` | `string \| undefined` | `%ProgramData%`. Optional, and read only on Windows |

## overrideLayers

**Deprecated:** use `referenceLayers`.

```ts
function overrideLayers(layers: readonly GovernanceLayer[]): GovernanceLayer[]
```

Returns the layers someone can write to: every layer except `package`. It filters by scope, not by position. This is what [`--overrides-only`](/cli/governance/#--overrides-only) resolves against.

```ts
const found = resolveGovernance('skill-design', overrideLayers(layers))
```

## managedGovernancesDir

**Deprecated:** use `managedReferencesDir`.

```ts
function managedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string
```

Returns the machine-wide directory this package owns:

| Platform | Directory |
| --- | --- |
| `linux` and any other | `/etc/buddy-agent-harness/governances` |
| `darwin` | `/Library/Application Support/BuddyAgentHarness/governances` |
| `win32` | `<programData>\BuddyAgentHarness\governances` |

On Windows, an empty or absent `programData` falls back to `C:\ProgramData`.

## deprecatedManagedGovernancesDir

**Deprecated:** use `managedReferencesDir`.

```ts
function deprecatedManagedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string
```

Returns the machine-wide directory `universal-plugin` wrote. It is still read, one layer below `managed`, so a machine already carrying governances keeps resolving them.

| Platform | Directory |
| --- | --- |
| `linux` and any other | `/etc/universal-plugin/governances` |
| `darwin` | `/Library/Application Support/UniPlugin/governances` |
| `win32` | `<programData>\UniPlugin\governances` |

On Windows, an empty or absent `programData` falls back to `C:\ProgramData`.

## parseGovernanceName

**Deprecated:** use `parseReferenceName`.

```ts
function parseGovernanceName(value: string): string
```

Returns `value` unchanged when it is a governance name: letters, digits, hyphens, and dots, with no path separator. It rejects input instead of sanitizing it, so a name built from untrusted input cannot reach outside a layer's directory.

It throws when:

- `value` ends in `.md`, because it names a file;
- `value` holds anything other than letters, digits, and single hyphens or dots between them.

```ts
parseGovernanceName('agent-tool-output') // 'agent-tool-output'
parseGovernanceName('../secrets') // throws
```

## resolveGovernance

**Deprecated:** use `resolveReference`.

```ts
function resolveGovernance(name: string, layers: readonly GovernanceLayer[]): GovernanceDocument | undefined
```

Reads `<dir>/<name>.md` in each layer, in order, and returns the first one it can read. The layers after it are not read. It returns `undefined` when no layer holds the name. A layer that is missing or unreadable is skipped, never thrown.

It does not validate `name`. Pass it through `parseGovernanceName` first when it comes from outside.

```ts
const document = resolveGovernance(parseGovernanceName(input), governanceLayers(options))
if (document) console.log(document.scope, document.content)
```

## listGovernances

**Deprecated:** use `listReferences`.

```ts
function listGovernances(layers: readonly GovernanceLayer[]): GovernanceEntry[]
```

Returns every name any layer holds, each reported at the layer that would win, sorted by name. A name is the stem of a `.md` file directly in a layer's directory. It does not read the documents, and it skips a layer that is missing, unreadable, or not a directory.

## governanceCommand

**Deprecated:** use `referenceCommand`.

```ts
const governanceCommand: cli.Command
```

The [`governance`](/cli/governance/) command group as a `clibuilder` command object, holding `list` and `show`. Each subcommand writes the deprecation warning to stderr before it runs. Each returns `0` on success and `1` on failure, such as an unknown format. `show` also returns `1` when it rejects the name or no layer holds it. A failure goes to stderr, never to stdout.

`harnessCommand` mounts it; see [Init and run](/library/init/#harnesscommand).

## GovernanceScope

**Deprecated:** use `ReferenceTier`.

```ts
type GovernanceScope = 'project' | 'user' | 'managed' | 'managed-deprecated' | 'package'
```

The order is the lookup order. `package` is the only scope that is not an override.

## GovernanceLayer

**Deprecated:** use `ReferenceLayer`.

| Field | Type | Meaning |
| --- | --- | --- |
| `scope` | `GovernanceScope` | Which layer this is |
| `dir` | `string` | The directory the layer reads |

## GovernanceEntry

**Deprecated:** use `ReferenceRow`.

A governance located but not read, as `listGovernances` returns it.

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | The governance name, without `.md` |
| `scope` | `GovernanceScope` | The layer that holds the winning copy |
| `path` | `string` | The winning copy's file path |

## GovernanceDocument

**Deprecated:** use `ResolvedReference`.

A governance located and read, as `resolveGovernance` returns it. It has every `GovernanceEntry` field, plus:

| Field | Type | Meaning |
| --- | --- | --- |
| `content` | `string` | The document, verbatim |

## GovernanceListReport

**Deprecated:** use `ReferenceListReport`.

The report `governance list` writes.

| Field | Type | Meaning |
| --- | --- | --- |
| `layers` | `{ scope: GovernanceScope; path: string; status: string }[]` | Every layer in lookup order. `status` is the deprecation note on the `managed-deprecated` row and the empty string on the others |
| `governances` | `{ name: string; scope: GovernanceScope; path: string }[] \| string` | Every governance at its winning layer, or the sentence `0 governances — no layer holds one` when there are none |

Paths have the home directory collapsed to `~`.

## GovernanceShowReport

**Deprecated:** use `ReferenceShowEntry`.

The report `governance show --format toon|json` writes.

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | The governance name |
| `scope` | `GovernanceScope` | The layer it was read from |
| `path` | `string` | Its file path, with the home directory collapsed to `~` |
| `content` | `string` | The document, verbatim |
