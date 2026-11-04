---
title: 'Library: references'
description: 'Library reference for the buddy-agent-harness reference exports: the reference command and the tier layers it reads.'
---

```ts
import { referenceCommand, referenceLayers } from 'buddy-agent-harness'
```

These exports are the [`reference` command](/cli/reference/) and the layers it reads. Use them to mount the command in your own tree, or to read [reference documents](/agent-configuration/references/) from your own code with the same tiers.

The engine comes from [`cyber-agentkit`](#the-cyber-agentkit-package); `buddy-agent-harness` re-exports it, naming itself as the plugin whose own references come first. Its [documentation](https://cyber-uni.github.io/cyber-agentkit/) holds the signatures and types.

## `referenceLayers`

```ts
function referenceLayers(options: ReferenceLayerOptions): Promise<ReferenceLayers>
```

Returns every layer a name is resolved through, highest precedence first: the `managed` tier, then the `repo` tier, then the `user` tier, then the `plugin` tier. [Tiers](/cli/reference/#tiers) lists each tier's layers.

`ReferenceLayerOptions` is the one `cyber-agentkit` documents, except that `plugin` is fixed to this package, read as the plugin `buddy-agent-harness`, and `packageRoot` overrides the folder it is read from. It defaults to the installed package.

## `referenceCommand`

```ts
const referenceCommand: cli.Command
```

The `reference` command and its subcommands, as a [clibuilder](https://www.npmjs.com/package/clibuilder) command. Mount it in your own command tree to offer the same CLI. [`reference`](/cli/reference/) covers its flags and output.

## The `cyber-agentkit` package

```ts
import { referenceLayers } from 'cyber-agentkit'
import { createReferenceCommand } from 'cyber-agentkit/commands'
```

A tool that resolves references without depending on `buddy-agent-harness`, such as a skill script that bundles the resolver, imports them from `cyber-agentkit`. `createReferenceCommand` and the report types come from `cyber-agentkit/commands`, not the root entry. No plugin is assumed: `ReferenceLayerOptions` takes `plugin: { name, root }`, the plugin calling the resolver, whose `references/` is the first plugin layer.
