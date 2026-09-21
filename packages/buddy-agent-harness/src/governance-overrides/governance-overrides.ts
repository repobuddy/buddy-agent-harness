import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Order here is search order. `package` is the only member that isn't an override —
 * `--overrides-only` promises never to return it.
 */
export type GovernanceScope = 'project' | 'user' | 'managed' | 'managed-deprecated' | 'package'

export type GovernanceLayer = { scope: GovernanceScope; dir: string }

/** A governance located but not read: what `list` reports. */
export type GovernanceEntry = { name: string; scope: GovernanceScope; path: string }

/** A governance located and read: what `show` reports. */
export type GovernanceDocument = GovernanceEntry & { content: string }

export type LayerOptions = {
	root: string
	home: string
	platform: NodeJS.Platform
	/** `%ProgramData%`, read only on Windows. */
	programData?: string | undefined
}

export function managedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string {
	if (platform === 'darwin') return '/Library/Application Support/BuddyAgentHarness/governances'
	if (platform === 'win32') return join(programData || 'C:\\ProgramData', 'BuddyAgentHarness', 'governances')
	return '/etc/buddy-agent-harness/governances'
}

/**
 * Still read below the layer above, so a machine already using it keeps working; reported as
 * deprecated so an admin knows to move it.
 */
export function deprecatedManagedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string {
	if (platform === 'darwin') return '/Library/Application Support/UniPlugin/governances'
	if (platform === 'win32') return join(programData || 'C:\\ProgramData', 'UniPlugin', 'governances')
	return '/etc/universal-plugin/governances'
}

export function projectGovernancesDir(root: string): string {
	return join(root, '.agents', 'governances')
}

export function userGovernancesDir(home: string): string {
	return join(home, '.agents', 'governances')
}

/**
 * Walks up to the nearest `package.json` rather than a relative literal — this module sits at a
 * different depth in `src/` vs the bundle.
 */
export function packageGovernancesDir(from: string = fileURLToPath(import.meta.url)): string {
	let dir = dirname(from)
	for (;;) {
		if (existsSync(join(dir, 'package.json'))) return join(dir, 'governances')
		const parent = dirname(dir)
		if (parent === dir) return join(dir, 'governances')
		dir = parent
	}
}

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
 * Filters by scope rather than slicing the list, so a layer added later can't quietly become an
 * override by position.
 */
export function overrideLayers(layers: readonly GovernanceLayer[]): GovernanceLayer[] {
	return layers.filter((layer) => layer.scope !== 'package')
}

const namePattern = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/i

/**
 * Rejects rather than sanitizes — silently answering a different question is how untrusted input
 * reads a file outside the layer.
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

/**
 * `undefined` rather than a throw for anything unreadable, so one bad entry does not end the
 * search.
 */
function readDocument(path: string): string | undefined {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return undefined
	}
}

/** Empty for a layer that's missing, unreadable, or not a directory — never throws. */
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
 * Creates the directory if absent — a fresh repository gets one obvious place to put an override,
 * and a count of zero.
 */
export function countProjectGovernances(root: string): number {
	const dir = projectGovernancesDir(root)
	mkdirSync(dir, { recursive: true })
	return documentNames(dir).length
}
