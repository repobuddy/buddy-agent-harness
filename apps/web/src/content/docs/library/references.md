---
title: 'Library: references'
description: 'Library reference for the buddy-agent-harness reference exports: build the tier layers, resolve a name through them, and list or search what they hold.'
---

```ts
import {
	listReferences,
	parseReferenceName,
	referenceCommand,
	referenceLayers,
	resolveReference,
	searchReferences,
} from 'buddy-agent-harness'
```

These exports are the engine behind the [`reference` command](/cli/reference/). Use them to read [reference documents](/agent-configuration/references/) from your own code, with the same tiers and merge rules the command uses.

The engine comes from [`cyber-agentkit`](#the-cyber-agentkit-package); `buddy-agent-harness` re-exports it, naming itself as the plugin whose own references come first. Its [documentation](https://cyber-uni.github.io/cyber-agentkit/) holds the signatures and types of every function below.

```ts
import { homedir } from 'node:os'

const layers = await referenceLayers({ root: process.cwd(), home: homedir(), platform: process.platform })
const resolved = resolveReference(parseReferenceName('testing'), layers)
if (resolved.status === 'found') console.log(resolved.content)
```

## `referenceLayers`

```ts
function referenceLayers(options: ReferenceLayerOptions): Promise<ReferenceLayers>
```

Returns every layer a name is resolved through, highest precedence first: the `managed` tier, then the `project` tier for each folder from `root` up to the repository root, nearest first, then the `user` tier, then the `plugin` tier. [Tiers](/cli/reference/#tiers) lists each tier's layers.

`ReferenceLayerOptions` is the one `cyber-agentkit` documents, except that `plugin` is fixed to this package, read as the plugin `buddy-agent-harness`, and `packageRoot` overrides the folder it is read from. It defaults to the installed package.

## `parseReferenceName`

Checks a name and splits off its plugin qualifier. A name is letters, digits, hyphens, and dots, optionally after `<plugin>/`. It throws on a value ending in `.md` or one with any other character, such as a path.

## `resolveReference`

Resolves one name through the layers, the way `reference show` does. It never throws: a name no layer holds has `status: 'missing'`, and an unqualified name two plugins hold has `status: 'ambiguous'`.

## `listReferences` and `searchReferences`

`listReferences` returns the rows `reference list` prints: one per name, and one per name per layer holding it. `searchReferences` finds references by what they are about, the way `reference search` does.

## `referenceCommand`

```ts
const referenceCommand: cli.Command
```

The `reference` command and its subcommands, as a [clibuilder](https://www.npmjs.com/package/clibuilder) command. Mount it in your own command tree to offer the same CLI. [`reference`](/cli/reference/) covers its flags and output.

The report types `ReferenceListReport`, `ReferenceSearchReport`, and `ReferenceShowEntry` are the shapes the subcommands write with `--format json` or `toon`.

## The `cyber-agentkit` package

```ts
import { loadReference, referenceLayers, whereReference } from 'cyber-agentkit'
import { createReferenceCommand } from 'cyber-agentkit/commands'
```

A tool that resolves references without depending on `buddy-agent-harness`, such as a skill script that bundles the resolver, imports them from `cyber-agentkit`. The report types, `createReferenceCommand`, and `createReferenceCommands` come from `cyber-agentkit/commands`, not the root entry. No plugin is assumed: `ReferenceLayerOptions` takes `plugin: { name, root }`, the plugin calling the resolver, whose `references/` is the first plugin layer.
