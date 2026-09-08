/**
 * Deriving a repository's dependency-plugin catalog, and deciding whether what is on disk matches.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
	buildCatalog,
	type Catalog,
	type DepPlugin,
	declaredDependencies,
	isGenericName,
	marketplaceName,
	serializeCatalog,
} from './dep-plugins.ts'
import { isPnp, readDepPlugin, type SkipReason } from './resolve.ts'

/**
 * The catalog's home, relative to the repository root.
 *
 * Under this tool's own directory, beside the other files it owns there — the same place as
 * `mcp.toml` and `mcp.projected.json`, and the same shape as `.agents/repobuddy/` and
 * `.agents/cyberlegion/`. A directory named for what it holds rather than for who writes it would be
 * a second convention in a tree that already has one.
 *
 * Not the repository root's `.claude-plugin/`, which is where a repository publishes its *own*
 * plugins for its *own* consumers. Merging the two would leak every dependency-provided plugin into
 * what a consumer sees on adding the published marketplace, and no harness has a notion of a private
 * catalog entry to prevent that. Being a separate directory also makes this one a marketplace root
 * in its own right, which is what lets its entries be resolved without reaching outside it.
 */
export const CATALOG_DIR: string = join('.agents', 'buddy-agent-harness')
export const CATALOG_PATH: string = join(CATALOG_DIR, '.claude-plugin', 'marketplace.json')

/** A declared dependency that yielded no plugin, kept so a report can say why rather than go quiet. */
export type Skipped = { package: string; reason: SkipReason }

export type DerivedCatalog = {
	catalog: Catalog
	plugins: DepPlugin[]
	/** Only the dependencies that failed to resolve at all; a dependency with no plugin is not news. */
	unresolved: Skipped[]
	/** Set when the marketplace name is one two repositories are likely to share. */
	genericName: boolean
	/** Set under Yarn PnP, where no dependency has a directory for a harness to install from. */
	pnp: boolean
}

function readManifest(path: string): Record<string, unknown> {
	return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

/**
 * Derives the catalog from the repository's declared dependencies.
 *
 * Derived in full every time. A plugin newly added to `package.json` appears, one removed disappears,
 * and a version that moved follows — all three without a line of reconciliation logic, because there
 * is nothing to reconcile against. That is the same rule the vendor manifests already follow: the
 * artifact is derived, never authored.
 */
export function deriveCatalog(root: string): DerivedCatalog {
	const manifestPath = join(root, 'package.json')
	const manifest = readManifest(manifestPath)

	const plugins: DepPlugin[] = []
	const unresolved: Skipped[] = []
	for (const pkg of declaredDependencies(manifest)) {
		const outcome = readDepPlugin(pkg, manifestPath)
		if (outcome.ok) plugins.push(outcome.plugin)
		else if (outcome.reason === 'unresolved') unresolved.push({ package: pkg, reason: outcome.reason })
	}

	const owner = typeof manifest['name'] === 'string' ? manifest['name'] : 'unknown'
	const name = marketplaceName(owner)

	return {
		catalog: buildCatalog({ name, owner, plugins }),
		plugins,
		unresolved,
		genericName: isGenericName(name),
		pnp: isPnp(),
	}
}

/** What a write did, or would do, so a caller can report a no-op as a no-op rather than as a change. */
export type WriteOutcome = 'created' | 'updated' | 'unchanged'

/**
 * What writing the catalog would do, without touching the disk.
 *
 * Comparing the serialized form rather than the parsed one is deliberate: a byte comparison is what
 * lets a check mode be a comparison instead of an interpretation, and `buildCatalog` sorts its
 * entries so that unchanged inputs serialize identically.
 */
export function catalogStatus(root: string, catalog: Catalog): WriteOutcome {
	let current: string | undefined
	try {
		current = readFileSync(join(root, CATALOG_PATH), 'utf8')
	} catch {
		current = undefined
	}
	if (current === serializeCatalog(catalog)) return 'unchanged'
	return current === undefined ? 'created' : 'updated'
}

/** Writes the catalog, reporting whether it moved. A write that would change nothing writes nothing. */
export function writeCatalog(root: string, catalog: Catalog): WriteOutcome {
	const outcome = catalogStatus(root, catalog)
	if (outcome === 'unchanged') return outcome

	const path = join(root, CATALOG_PATH)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, serializeCatalog(catalog))
	return outcome
}
