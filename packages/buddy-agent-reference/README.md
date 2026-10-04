# buddy-agent-reference

[![npm](https://img.shields.io/npm/v/buddy-agent-reference)](https://www.npmjs.com/package/buddy-agent-reference)
[![License](https://img.shields.io/npm/l/buddy-agent-reference)](https://github.com/repobuddy/buddy-agent-harness/blob/main/LICENSE)

Resolve a named Markdown reference document across the managed, project (`.agents/references/`), user (`~/.agents/references/`), and plugin tiers, each layer combined as its frontmatter `merge` mode asks — `merge-sections` keeps the sections an override does not redefine.

It is the engine behind the [`reference` command](https://repobuddy.github.io/buddy-agent-harness/cli/reference/) of [`buddy-agent-harness`](https://www.npmjs.com/package/buddy-agent-harness), in a package of its own so a tool can bundle the resolver without depending on the harness tool. The tiers, file names, and merge rules are on [Reference documents](https://repobuddy.github.io/buddy-agent-harness/agent-configuration/references/).

## Library

```ts
import { loadReference } from 'buddy-agent-reference'

const resolved = await loadReference('agent-readiness-weights', {
	root: process.cwd(),
	// The plugin calling the resolver: its own `references/` is the first plugin layer.
	plugin: { name: 'my-plugin', root: pluginRoot },
})
if (resolved.status === 'found') console.log(resolved.content)
```

- `loadReference(name, options)` resolves one name for a root, with every tier read and each override merged.
- `referenceLayers(options)` builds the ordered layers; `resolveReference`, `listReferences`, `searchReferences`, and `whereReference` resolve one name, every name, a query, or the files an override of a name can be written to.
- `createReferenceCommand({ plugin })` is the `reference` command, for a host CLI built on [`clibuilder`](https://www.npmjs.com/package/clibuilder); `createReferenceCommands` returns its subcommands one by one.

The library is ESM, and its dependencies stay external. A tool that ships a self-contained bundle inlines this package along with them.

## CLI

```sh
npx -y buddy-agent-reference show <name>... --root <repository root>
npx -y buddy-agent-reference list
npx -y buddy-agent-reference search <query>
npx -y buddy-agent-reference where <name>
npx -y buddy-agent-reference create <name> --scope project
```

The subcommands are those of `buddy-agent-harness reference`; `--help` lists their options.
