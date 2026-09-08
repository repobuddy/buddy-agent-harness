/**
 * Dependency-provided plugins: the catalog half.
 *
 * A dependency that ships an Agent Plugins manifest at its package root is a plugin the consuming
 * repository can install through its harness. This module turns the set of such dependencies into a
 * marketplace catalog; installing from that catalog is the runtime's own job, and the lifecycle half
 * drives it.
 *
 * Everything here is pure. Resolution against `node_modules` lives in `resolve.ts`.
 */

/** One dependency that ships a plugin manifest. */
export type DepPlugin = {
	/** The npm package name — what a consumer declared, and what the catalog installs by. */
	package: string
	/** The plugin's own name from its manifest, which need not match the package name. */
	plugin: string
	/** The version actually installed, read from the dependency's own `package.json`. */
	version: string
	description?: string
}

/**
 * A catalog entry's `npm` source. Deliberately not a path: a path source is resolved against the
 * marketplace root and may not escape it, so a path-sourced catalog would have to sit at the
 * repository root — the one place the repository's own public catalog already occupies. An `npm`
 * source carries no path, so this catalog can live in its own directory and stay separate from
 * whatever the repository publishes for its own consumers.
 */
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

/**
 * The Claude-shaped catalog, which Codex, Copilot CLI, and Cursor also read. `owner` is an object
 * whose `name` is required — a string there is a schema error rather than a tolerated shorthand.
 */
export type Catalog = {
	name: string
	owner: { name: string }
	description: string
	plugins: CatalogEntry[]
}

/**
 * Marketplace names generic enough that two repositories are likely to pick the same one. The
 * collision is silent and costly: registering a second marketplace under a name already in use
 * replaces the first, and the install that follows reports "already installed" and does nothing —
 * so the repository silently runs the other one's plugin versions.
 */
const GENERIC_NAMES = new Set(['deps', 'dependencies', 'local', 'plugins', 'marketplace', 'plugin', 'default'])

export function isGenericName(name: string): boolean {
	return GENERIC_NAMES.has(name.toLowerCase())
}

/**
 * A marketplace name derived from the consuming package's own name, so two repositories do not
 * collide by default. A scope is folded into the name rather than dropped (`@acme/web` → `acme-web`)
 * because the unscoped half is the part most likely to repeat across organizations.
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
 * Dependency names a repository declares, both runtime and development.
 *
 * Development dependencies are included on purpose: a plugin that supplies a project's testing or
 * release workflow is a development dependency, and excluding them would drop most of the cases this
 * exists for. Transitive dependencies are never included — see `resolve.ts`.
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
 * The catalog is derived in full on every run and never merged into what is already on disk. That is
 * what makes the three cases a consumer cares about — a plugin added, a plugin removed, a version
 * moved — fall out of regeneration instead of needing reconciliation logic of their own.
 *
 * Entries are sorted by name so that a regeneration whose inputs did not change produces a
 * byte-identical file, which is what lets a check mode compare rather than interpret.
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

/** Serialized the way the repository formats JSON, with the trailing newline a text file needs. */
export function serializeCatalog(catalog: Catalog): string {
	return `${JSON.stringify(catalog, null, '\t')}\n`
}
