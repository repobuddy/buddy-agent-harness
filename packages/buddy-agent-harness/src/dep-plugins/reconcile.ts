/**
 * Comparing a derived catalog against what a harness actually has installed.
 *
 * The harness reconciles nothing on its own. A catalog entry that appears is not installed; one that
 * disappears leaves the plugin installed and failing to load, with `prune` declining to remove it
 * because it was never an auto-installed dependency. So the delta has to be computed, and every
 * conclusion here comes from that asymmetry.
 *
 * Pure. Reading harness state lives in `harness-plugins.ts`.
 */

import type { Catalog } from './dep-plugins.ts'
import type { InstalledPlugin, RegisteredMarketplace } from './harness-plugins.ts'

export type ActionKind = 'register' | 'install' | 'update' | 'uninstall'

export type Action = {
	kind: ActionKind
	/** `<plugin>@<marketplace>`, or the marketplace name for `register`. */
	subject: string
	/** Why, in the terms a reader can act on: the version moving, or the entry that went away. */
	detail: string
}

export type Reconciliation = {
	actions: Action[]
	/**
	 * Set when a marketplace of this name is registered against a different directory — the silent
	 * collision, which produces no error from the harness at any point.
	 */
	collision?: string
	/** Set when the catalog's marketplace is not registered with the harness at all. */
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
	 * Whether this runtime installs per repository. Where it does not — Codex keeps one install per
	 * machine — every install under this marketplace is this repository's by default, because there
	 * is nothing to tell two repositories apart.
	 */
	scoped?: boolean
}

/**
 * Installs belonging to this repository and this catalog.
 *
 * On a scoped runtime a user-scoped install is deliberately excluded rather than counted: it is
 * shared with every other repository on the machine, so treating it as satisfying this repository's
 * catalog would let one project's pin silently stand in for another's.
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

	// A registration pointing somewhere else is the collision case. Reported rather than repaired:
	// re-registering would take the name from whichever repository currently holds it, trading one
	// silent breakage for another.
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

	// Installed but no longer in the catalog: the dependency was removed or stopped shipping a plugin.
	// Nothing else removes these — the harness leaves them installed and failing to load.
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
