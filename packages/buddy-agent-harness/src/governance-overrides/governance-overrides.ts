import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Where a governance document can come from. The order of this list is the order the layers are
 * searched, and `package` is the only one that is not an override — it is what this package itself
 * ships, and `--overrides-only` is the promise never to return it.
 */
export type GovernanceScope = 'project' | 'user' | 'managed' | 'managed-deprecated' | 'package'

/** One place to look, and the name a report gives it. */
export type GovernanceLayer = { scope: GovernanceScope; dir: string }

/** A governance located but not read: what `list` reports. */
export type GovernanceEntry = { name: string; scope: GovernanceScope; path: string }

/** A governance located and read: what `show` reports. */
export type GovernanceDocument = GovernanceEntry & { content: string }

export type LayerOptions = {
	/** Repository or package directory the project layer is resolved against. */
	root: string
	home: string
	platform: NodeJS.Platform
	/** `%ProgramData%`, read only on Windows. */
	programData?: string | undefined
}

/**
 * The machine-wide layer this package owns, and where a machine owner should put a governance now.
 */
export function managedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string {
	if (platform === 'darwin') return '/Library/Application Support/BuddyAgentHarness/governances'
	if (platform === 'win32') return join(programData || 'C:\\ProgramData', 'BuddyAgentHarness', 'governances')
	return '/etc/buddy-agent-harness/governances'
}

/**
 * The machine-wide layer at the location `universal-plugin` has been writing and reading for its
 * whole life. Still read, below the layer above, so a machine already carrying one keeps working
 * rather than silently losing its governances the day the command changed hands. Reported as
 * deprecated wherever it answers, so an admin learns there is somewhere else to move it to.
 */
export function deprecatedManagedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string {
	if (platform === 'darwin') return '/Library/Application Support/UniPlugin/governances'
	if (platform === 'win32') return join(programData || 'C:\\ProgramData', 'UniPlugin', 'governances')
	return '/etc/universal-plugin/governances'
}

/** The project override layer: one directory, in the canonical `.agents/` tree. */
export function projectGovernancesDir(root: string): string {
	return join(root, '.agents', 'governances')
}

/** The user layer, the same path under the home directory that every other `.agents/` scope uses. */
export function userGovernancesDir(home: string): string {
	return join(home, '.agents', 'governances')
}

/**
 * The governances this package itself ships, if it ever ships any.
 *
 * Found by walking up to the nearest `package.json` rather than written as a relative URL, because
 * this module sits two directories under the package root in `src/` and one in the bundle — a
 * literal `../..` would be right in exactly one of them, and the skill-script bundles ship deeper
 * still.
 */
export function packageGovernancesDir(from: string = fileURLToPath(import.meta.url)): string {
	let dir = dirname(from)
	for (;;) {
		if (existsSync(join(dir, 'package.json'))) return join(dir, 'governances')
		const parent = dirname(dir)
		// The filesystem root reached without a manifest: nothing is shipped from here.
		if (parent === dir) return join(dir, 'governances')
		dir = parent
	}
}

/** Every layer, in lookup order. The caller decides whether the package layer is in play. */
export function governanceLayers({ root, home, platform, programData }: LayerOptions): GovernanceLayer[] {
	return [
		{ scope: 'project', dir: projectGovernancesDir(root) },
		{ scope: 'user', dir: userGovernancesDir(home) },
		{ scope: 'managed', dir: managedGovernancesDir(platform, programData) },
		{ scope: 'managed-deprecated', dir: deprecatedManagedGovernancesDir(platform, programData) },
		{ scope: 'package', dir: packageGovernancesDir() },
	]
}

/**
 * The layers a person or a machine owner can write to. This is what `--overrides-only` searches, and
 * it is a filter over the scope rather than a slice of the list, so a layer added in the middle
 * later cannot quietly become an override.
 */
export function overrideLayers(layers: readonly GovernanceLayer[]): GovernanceLayer[] {
	return layers.filter((layer) => layer.scope !== 'package')
}

const namePattern = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/i

/**
 * A governance name is a file stem, never a path. Rejected rather than sanitized: a caller that
 * meant a path has asked the wrong question, and quietly answering a different one is how a name
 * built from someone else's input reads a file outside the layer.
 */
export function parseGovernanceName(value: string): string {
	// Caught before the pattern, which would accept it and then look for `<name>.md.md`.
	if (value.endsWith('.md')) {
		throw new Error(`"${value}" names a file. Ask for the governance by name, without the .md extension.`)
	}
	if (!namePattern.test(value)) {
		throw new Error(`"${value}" is not a governance name. A name is letters, digits, hyphens, and dots — not a path.`)
	}
	return value
}

/** `undefined` rather than a throw for anything unreadable, so one bad entry does not end the search. */
function readDocument(path: string): string | undefined {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return undefined
	}
}

/** The names of the documents in one layer. A layer that is missing, unreadable, or not a directory is empty. */
function documentNames(dir: string): string[] {
	try {
		return readdirSync(dir, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
			.map((entry) => entry.name.slice(0, -3))
	} catch {
		return []
	}
}

/** The first layer that holds the name wins; the rest are not read. */
export function resolveGovernance(name: string, layers: readonly GovernanceLayer[]): GovernanceDocument | undefined {
	for (const { scope, dir } of layers) {
		const path = join(dir, `${name}.md`)
		const content = readDocument(path)
		if (content !== undefined) return { name, scope, path, content }
	}
	return undefined
}

/** Every name any layer holds, each reported at the layer that would win, sorted by name. */
export function listGovernances(layers: readonly GovernanceLayer[]): GovernanceEntry[] {
	const found = new Map<string, GovernanceEntry>()
	for (const { scope, dir } of layers) {
		for (const name of documentNames(dir)) {
			if (!found.has(name)) found.set(name, { name, scope, path: join(dir, `${name}.md`) })
		}
	}
	return [...found.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Creates the project override layer when absent and counts what is in it, the same contract
 * `countSkills` has for `.agents/skills`: a fresh repository gets the directory, so there is one
 * obvious place to put an override rather than a path someone has to know.
 */
export function countProjectGovernances(root: string): number {
	const dir = projectGovernancesDir(root)
	mkdirSync(dir, { recursive: true })
	return documentNames(dir).length
}
