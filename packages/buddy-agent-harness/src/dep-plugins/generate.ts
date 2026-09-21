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
 * Not the repository root's `.claude-plugin/` — that's the repo's own published catalog; merging
 * would leak dependency plugins into it.
 */
export const CATALOG_DIR: string = join('.agents', 'buddy-agent-harness')
export const CATALOG_PATH: string = join(CATALOG_DIR, '.claude-plugin', 'marketplace.json')

export type Skipped = { package: string; reason: SkipReason }

export type DerivedCatalog = {
	catalog: Catalog
	plugins: DepPlugin[]
	/** Only the dependencies that failed to resolve at all; a dependency with no plugin is not news. */
	unresolved: Skipped[]
	genericName: boolean
	/** True under Yarn PnP: no dependency has an installable directory. */
	pnp: boolean
}

function readManifest(path: string): Record<string, unknown> {
	return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

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

export type WriteOutcome = 'created' | 'updated' | 'unchanged'

/**
 * Compares serialized bytes, not parsed values — that's what makes `--check` a comparison rather
 * than an interpretation.
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

/** A write that would change nothing writes nothing. */
export function writeCatalog(root: string, catalog: Catalog): WriteOutcome {
	const outcome = catalogStatus(root, catalog)
	if (outcome === 'unchanged') return outcome

	const path = join(root, CATALOG_PATH)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, serializeCatalog(catalog))
	return outcome
}
