/** Pure. Reading harness state lives in `harness-plugins.ts`. */

import type { Catalog } from './dep-plugins.ts'
import type { InstalledPlugin, RegisteredMarketplace } from './harness-plugins.ts'

export type ActionKind = 'register' | 'install' | 'update' | 'uninstall'

export type Action = {
	kind: ActionKind
	/** `<plugin>@<marketplace>`, or the marketplace name for `register`. */
	subject: string
	detail: string
}

export type Reconciliation = {
	actions: Action[]
	/**
	 * Set when a marketplace of this name is registered against a different directory — the harness
	 * gives no error for this on its own.
	 */
	collision?: string
	unregistered: boolean
}

export type ReconcileOptions = {
	catalog: Catalog
	/** Where the catalog lives, relative to the repository root. */
	catalogDir: string
	/** Absolute repository root, used to keep another project's installs out of the comparison. */
	root: string
	installed: readonly InstalledPlugin[]
	marketplaces: readonly RegisteredMarketplace[]
	/**
	 * False for a runtime with no per-repo scope (Codex): every install under this marketplace
	 * counts as this repository's, since nothing else distinguishes them.
	 */
	scoped?: boolean
}

/**
 * Excludes a user-scoped install on a scoped runtime — it's shared machine-wide, so it can't
 * satisfy this repository's catalog alone.
 */
function ours(
	installed: readonly InstalledPlugin[],
	marketplace: string,
	root: string,
	scoped: boolean,
): InstalledPlugin[] {
	const suffix = `@${marketplace}`
	return installed.filter((entry) => entry.id.endsWith(suffix) && (!scoped || entry.projectPath === root))
}

export function reconcile({
	catalog,
	catalogDir,
	root,
	installed,
	marketplaces,
	scoped = true,
}: ReconcileOptions): Reconciliation {
	const registration = marketplaces.find((entry) => entry.name === catalog.name)
	const actions: Action[] = []

	// Reported, not repaired: re-registering would just steal the name from whoever holds it.
	const expected = catalogDir.split(/[\\/]/).filter(Boolean)
	const pointsHere = registration ? expected.every((segment) => registration.path.includes(segment)) : false
	const collision = registration && !pointsHere ? registration.path : undefined

	if (!registration) {
		actions.push({
			kind: 'register',
			subject: catalog.name,
			detail: 'marketplace is not registered with this harness',
		})
	}

	const mine = ours(installed, catalog.name, root, scoped)
	const byId = new Map(mine.map((entry) => [entry.id, entry]))

	for (const entry of catalog.plugins) {
		const id = `${entry.name}@${catalog.name}`
		const current = byId.get(id)
		if (!current) {
			actions.push({ kind: 'install', subject: id, detail: `not installed; catalog pins ${entry.source.version}` })
			continue
		}
		if (current.version !== entry.source.version) {
			actions.push({
				kind: 'update',
				subject: id,
				detail: `installed ${current.version}, catalog pins ${entry.source.version}`,
			})
		}
	}

	// Nothing else removes these — the harness leaves a plugin dropped from the catalog installed
	// and failing to load.
	const wanted = new Set(catalog.plugins.map((entry) => `${entry.name}@${catalog.name}`))
	for (const entry of mine) {
		if (!wanted.has(entry.id)) {
			actions.push({
				kind: 'uninstall',
				subject: entry.id,
				detail: 'installed but no longer in the catalog; it will report a load failure until removed',
			})
		}
	}

	return {
		actions,
		...(collision ? { collision } : {}),
		unregistered: !registration,
	}
}
