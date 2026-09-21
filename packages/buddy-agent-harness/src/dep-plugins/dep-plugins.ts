/** Pure. Resolution against `node_modules` lives in `resolve.ts`. */

export type DepPlugin = {
	package: string
	/** The manifest's own name; may differ from `package`. */
	plugin: string
	/** The version installed, not the manifest's declared range. */
	version: string
	description?: string
}

/** `npm`, not `path`: a path source must sit at the repository root, which this catalog does not. */
export type NpmSource = {
	source: 'npm'
	package: string
	version: string
}

export type CatalogEntry = {
	name: string
	source: NpmSource
	description?: string
}

/** `owner` must be an object; a bare string is a schema error, not an accepted shorthand. */
export type Catalog = {
	name: string
	owner: { name: string }
	description: string
	plugins: CatalogEntry[]
}

/** Generic marketplace names: a second registration under one of these replaces the first, silently. */
const GENERIC_NAMES = new Set(['deps', 'dependencies', 'local', 'plugins', 'marketplace', 'plugin', 'default'])

export function isGenericName(name: string): boolean {
	return GENERIC_NAMES.has(name.toLowerCase())
}

/**
 * Folds a scope into the name (`@acme/web` → `acme-web`) rather than dropping it — the unscoped
 * part collides more often.
 */
export function marketplaceName(packageName: string): string {
	const folded = packageName.replace(/^@/, '').replace(/\//g, '-')
	const cleaned = folded
		.replace(/[^a-zA-Z0-9-_.]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
	return cleaned || 'agent-plugins'
}

/**
 * Includes `devDependencies` — a plugin can supply a project's testing or release workflow.
 * Transitive dependencies are excluded; see `resolve.ts`.
 */
export function declaredDependencies(manifest: unknown): string[] {
	if (!manifest || typeof manifest !== 'object') return []
	const record = manifest as Record<string, unknown>
	const names = new Set<string>()
	for (const field of ['dependencies', 'devDependencies']) {
		const group = record[field]
		if (!group || typeof group !== 'object') continue
		for (const name of Object.keys(group as Record<string, unknown>)) names.add(name)
	}
	return [...names].sort()
}

export type BuildCatalogOptions = {
	name: string
	owner: string
	plugins: readonly DepPlugin[]
}

/**
 * Derived in full every run, never merged with what's on disk. Entries are sorted so unchanged
 * inputs serialize identically, which `--check` relies on.
 */
export function buildCatalog({ name, owner, plugins }: BuildCatalogOptions): Catalog {
	const entries = [...plugins]
		.sort((a, b) => a.plugin.localeCompare(b.plugin))
		.map(({ plugin, package: pkg, version, description }): CatalogEntry => {
			const source: NpmSource = { source: 'npm', package: pkg, version }
			return description ? { name: plugin, source, description } : { name: plugin, source }
		})

	return {
		name,
		owner: { name: owner },
		description: 'Plugins provided by this repository’s dependencies. Generated — do not edit.',
		plugins: entries,
	}
}

/** Includes the trailing newline. */
export function serializeCatalog(catalog: Catalog): string {
	return `${JSON.stringify(catalog, null, '\t')}\n`
}
