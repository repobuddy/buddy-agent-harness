---
title: 'Library: references'
description: 'Library reference for the buddy-agent-harness reference exports: build the tier layers, resolve a name through them, and list or search what they hold.'
---

```ts
import {
	listReferences,
	managedReferencesDir,
	parseReferenceName,
	referenceCommand,
	referenceLayers,
	resolveReference,
	searchReferences,
} from 'buddy-agent-harness'
```

These exports are the engine behind the [`reference` command](/cli/reference/). Use them to read [reference documents](/agent-configuration/references/) from your own code, with the same tiers, file names, and merge rules the command uses. That page covers those rules; this one covers the functions and types.

The engine ships on its own as the [`buddy-agent-reference`](#the-buddy-agent-reference-package) package; `buddy-agent-harness` re-exports it, naming itself as the plugin whose own references come first.

Every function here is read-only. The work splits into three steps:

1. `referenceLayers` builds the ordered list of folders to read.
2. `parseReferenceName` checks a name, and `resolveReference` resolves it through those layers.
3. `listReferences` and `searchReferences` resolve every name the layers hold, the way `reference list` and `reference search` do.

```ts
import { homedir } from 'node:os'

const layers = await referenceLayers({ root: process.cwd(), home: homedir(), platform: process.platform })
const resolved = resolveReference(parseReferenceName('testing'), layers)
if (resolved.status === 'found') console.log(resolved.content)
```

## `referenceLayers`

```ts
function referenceLayers(options: ReferenceLayerOptions): Promise<ReferenceLayer[]>
```

Returns every layer a name is resolved through, highest precedence first: the `managed` tier, then the `project` tier for each folder from `root` up to the repository root, nearest first, then the `user` tier, then the `plugin` tier. [Tiers](/cli/reference/#tiers) lists each tier's layers.

A layer is listed even when its folder does not exist, except that an enabled plugin or a dependency is listed only when it has a `references/` folder. A layer that is never read, such as policy a harness keeps in MDM, is listed with `skipped` set to the reason. When two layers point at the same folder, as in a repository checked out at the home directory, only the first is kept.

### `ReferenceLayerOptions`

| Field | Type | Meaning |
| --- | --- | --- |
| `root` | `string` | the directory the project tier is read from, and each folder above it up to the repository root |
| `home` | `string` | the home directory the user tier is read from |
| `platform` | `NodeJS.Platform` | picks the machine-wide folders |
| `programData` | `string`, optional | `%ProgramData%` on Windows |
| `packageRoot` | `string`, optional | the root of this package, read as the plugin `buddy-agent-harness`. Defaults to the installed package |
| `env` | `Record<string, string \| undefined>`, optional | the environment the harness is detected from, and its settings read from. Defaults to `process.env` |

### `ReferenceLayer`

| Field | Type | Meaning |
| --- | --- | --- |
| `tier` | `ReferenceTier` | the tier the layer belongs to |
| `dir` | `string` | the folder read |
| `plugins` | `string[]` | every name a qualified `<plugin>/<name>` may use for this layer: the package name, and the `plugin.json` name when it differs. Empty outside the plugin tier |
| `status` | `string` | empty, or why the layer is legacy or deprecated |
| `skipped` | `string`, optional | set when the layer is never read, to the reason |

### `ReferenceTier`

```ts
type ReferenceTier = 'managed' | 'project' | 'user' | 'plugin'
```

Listed in precedence order, highest first.

## `managedReferencesDir`

```ts
function managedReferencesDir(platform: NodeJS.Platform, programData?: string): string
```

Returns the machine-wide `references/` folder for `platform`: `/etc/buddy-agent-harness/references` on Linux, `/Library/Application Support/BuddyAgentHarness/references` on macOS, and `BuddyAgentHarness\references` under `programData`, or under `C:\ProgramData` when it is not given, on Windows. Any other platform gets the Linux folder. It is the first layer `referenceLayers` returns.

## `parseReferenceName`

```ts
function parseReferenceName(value: string): ReferenceName
```

Checks a name and splits off its plugin qualifier. A name is letters, digits, hyphens, and dots, optionally after `<plugin>/`. A plugin may be scoped, as in `@acme/rules/testing`.

It throws rather than correcting the input:

- a value ending in `.md` names a file, not a reference;
- a value with any other character, such as a path, is not a reference name.

```ts
parseReferenceName('testing') // { name: 'testing', plugin: undefined, raw: 'testing' }
parseReferenceName('acme/testing') // { name: 'testing', plugin: 'acme', raw: 'acme/testing' }
parseReferenceName('testing.md') // throws
```

### `ReferenceName`

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | the name without its qualifier |
| `plugin` | `string \| undefined` | the plugin qualifier, when the value had one |
| `raw` | `string` | the value as given |

## `resolveReference`

```ts
function resolveReference(
	ref: ReferenceName,
	layers: readonly ReferenceLayer[],
	options?: ResolveOptions,
): ResolvedReference
```

Resolves one name through `layers` in order, the way `reference show` does. In each layer, the first [file name](/cli/reference/#file-names) that exists answers. Each document's `merge` frontmatter decides how it combines with the documents below it, down to the first `first-wins` document; documents below that one are shadowed. A qualified name reads only the plugin it names, and still lets the managed, project, and user tiers override it.

The result is never thrown: a name no layer holds has `status: 'missing'`, and an unqualified name two plugins hold, once resolution reaches the plugin tier, has `status: 'ambiguous'` with the qualified names to ask for in `plugins`. A malformed file adds to `warnings` instead of failing.

### `ResolveOptions`

| Field | Type | Meaning |
| --- | --- | --- |
| `display` | `(path: string) => string`, optional | how a path is shown in a layer label inside `content` and in a warning. Defaults to the path unchanged. The command passes one that collapses the home directory to `~` |

### `ResolvedReference`

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | the name as asked, qualifier included |
| `status` | `ReferenceStatus` | the outcome |
| `tier` | `ReferenceTier`, optional | the tier of the highest document used. Set when found |
| `plugin` | `string`, optional | the plugin of the highest document used, or `''` outside the plugin tier. Set when found |
| `path` | `string`, optional | the file of the highest document used. Set when found |
| `merge` | `MergeMode`, optional | the merge mode the highest document declared. Set when found |
| `metadata` | `Record<string, unknown>`, optional | the frontmatter of every document used, where a higher document overrides a key a lower one also sets. Set when found |
| `content` | `string`, optional | the combined text, without frontmatter or `<!-- merge: … -->` comments, ending in a newline. Set when found |
| `layers` | `UsedLayer[]` | the documents combined into `content`, highest first. Empty unless found |
| `warnings` | `string[]` | problems found while reading, such as a second file name in one folder or an unknown merge mode |
| `plugins` | `string[]` | the qualified `<plugin>/<name>` choices when the name is ambiguous. Empty otherwise |
| `trace` | `TraceEntry[]` | one entry per layer checked, in order |

When more than one document is combined with `combine`, `content` opens with a line saying how many layers it came from, and marks each layer with an HTML comment naming it.

### `ReferenceStatus`

```ts
type ReferenceStatus = 'found' | 'missing' | 'ambiguous'
```

### `UsedLayer`

| Field | Type | Meaning |
| --- | --- | --- |
| `tier` | `ReferenceTier` | the layer's tier |
| `plugin` | `string` | the layer's plugin, or `''` |
| `path` | `string` | the file read |
| `merge` | `MergeMode` | the merge mode the file declared |

### `TraceEntry`

The data `reference show --trace` reports.

| Field | Type | Meaning |
| --- | --- | --- |
| `tier` | `ReferenceTier` | the layer's tier |
| `plugin` | `string` | the layer's plugin, or `''` |
| `path` | `string` | the file that matched, or the layer's folder when none did |
| `found` | `boolean` | whether the layer holds the name |
| `candidate` | `string` | the file name that matched, such as `testing.md` or `testing/README.md`, or `''` |
| `merge` | `string` | the merge mode the file declared, or `''` |
| `outcome` | `string` | `used`, `missing`, `shadowed by <tier> (first-wins)`, `ambiguous`, or the reason a layer is never read |
| `description` | `string` | the file's own frontmatter `description`, or `''` |

A qualified name whose plugin no layer belongs to gets one more entry, so the trace says the plugin asked for is not there.

### `MergeMode`

```ts
type MergeMode = 'first-wins' | 'combine' | 'merge-sections'
```

The values of a document's `merge` frontmatter. A document with no `merge`, or an unknown value, is read as `first-wins`; an unknown value also adds a warning. [`merge-sections`](/cli/reference/#merge-sections) describes how sections are matched.

## `listReferences`

```ts
function listReferences(layers: readonly ReferenceLayer[], options?: ResolveOptions): ReferenceListing
```

Resolves every name any readable layer holds, and returns one row per name per layer that holds it, with the status that layer gets when the name is shown. Names are sorted. This is the `references` part of `reference list`.

### `ReferenceListing`

| Field | Type | Meaning |
| --- | --- | --- |
| `rows` | `ReferenceRow[]` | one per name per layer holding it |
| `warnings` | `string[]` | every warning from resolving the names, each once |

### `ReferenceRow`

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | the reference name |
| `tier` | `ReferenceTier` | the layer's tier |
| `plugin` | `string` | the layer's plugin, or `''` |
| `path` | `string` | the file that holds the name |
| `status` | `string` | the layer's outcome, as in `TraceEntry`. An ambiguous name reads `ambiguous — ask for one of <plugin>/<name>, …` |
| `description` | `string` | that file's frontmatter `description`, or `''` |

## `searchReferences`

```ts
function searchReferences(query: string, layers: readonly ReferenceLayer[], options?: ResolveOptions): SearchMatch[]
```

Finds references by what they are about, the way `reference search` does. The query is trimmed and matched without regard to case. Each name is resolved as `show` would resolve it, and a name two plugins hold is searched once per plugin, under the qualified name `show` would need.

Each reference gets the first kind of match that applies, and the results are sorted by that kind, then by name. Names that match nothing are left out.

### `MatchKind`

```ts
type MatchKind = 'name' | 'prefix' | 'close name' | 'description' | 'heading' | 'body'
```

Listed from best to worst:

| Kind | The query… |
| --- | --- |
| `name` | equals the name, with or without its qualifier |
| `prefix` | starts the name |
| `close name` | appears inside the name, or is within a small edit distance of it: one edit, or a quarter of the query's length when that is more |
| `description` | has every word in the frontmatter `description` and `tags` |
| `heading` | has every word in the document's headings, outside code fences |
| `body` | has every word in the document's text |

### `SearchMatch`

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | the name to pass to `show`, qualified when the bare name is ambiguous |
| `tier` | `ReferenceTier` | the tier of the highest document used |
| `match` | `MatchKind` | how the query matched |
| `description` | `string` | the first line of the frontmatter `description`, or `''` |

## `referenceCommand`

```ts
const referenceCommand: cli.Command
```

The `reference` command and its `show`, `list`, `search`, and `where` subcommands, as a [clibuilder](https://www.npmjs.com/package/clibuilder) command. Mount it in your own command tree to offer the same CLI. [`reference`](/cli/reference/) covers its flags and output.

The types below are the shapes the subcommands write with `--format json` or `toon`.

### `ReferenceShowEntry`

One entry per name asked, in the order asked, from `reference show`.

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | the name as asked |
| `status` | `ReferenceStatus` | the outcome |
| `tier`, `plugin`, `merge`, `metadata`, `content` | optional | as in `ResolvedReference`. Set when found |
| `path` | `string`, optional | the file of the highest document used, with the home directory shown as `~`. Set when found |
| `layers` | `UsedLayer[]`, optional | the documents combined, with the home directory shown as `~`. Set when found |
| `warnings` | `string[]` | problems found while reading |
| `suggestions` | `string[]`, optional | up to three close names, from `searchReferences`. Set when missing |
| `plugins` | `string[]`, optional | the qualified names to ask for instead. Set when ambiguous |
| `trace` | `TraceEntry[]` without `description`, optional | set with `--trace` |

### `ReferenceListReport`

The output of `reference list`.

| Field | Type | Meaning |
| --- | --- | --- |
| `layers` | `{ tier, plugin, path, status }[]` | every layer in precedence order, with its first plugin name or `''`, and its folder |
| `references` | `ReferenceRow[] \| string` | the rows, or a sentence stating the zero when no layer holds a reference |
| `warnings` | `string[]`, optional | set when resolving the names produced any |

### `ReferenceSearchReport`

The output of `reference search`.

| Field | Type | Meaning |
| --- | --- | --- |
| `query` | `string` | the query, trimmed |
| `references` | `SearchMatch[] \| string` | the matches, or a sentence stating the zero when nothing matches |

## The `buddy-agent-reference` package

```ts
import { createReferenceCommand, loadReference, referenceLayers, whereReference } from 'buddy-agent-reference'
```

A tool that resolves references without depending on `buddy-agent-harness`, such as a skill script that bundles the resolver, imports them from `buddy-agent-reference`. Every export above but `referenceCommand` is there under the same name. Three things differ.

- No plugin is assumed. `ReferenceLayerOptions` takes `plugin: { name, root }` in place of `packageRoot`: the plugin calling the resolver, whose `references/` is the first plugin layer. Without it, the plugin tier holds only the enabled plugins and the declared dependencies.
- `loadReference(name, options)` resolves one name in one call. `home` and `platform` default to the machine's own, and a name no layer holds comes back with status `missing`.
- `whereReference(name, layers, { root, caller?, display? })` returns the report `reference where` prints. `createReferenceCommand({ plugin })` builds the `reference` command for a host CLI, and the package's own `buddy-agent-reference` binary runs its subcommands at the top level.
