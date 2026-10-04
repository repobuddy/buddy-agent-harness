import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { declaredDependencies, packageDir } from './dependencies/dependencies.ts'
import { detectedHarnesses, enabledPluginLayers, harnessManagedLayers } from './harness-layers.ts'
import { isRecord } from './is-record/is-record.ts'

/** Order here is precedence order, highest first. */
export type ReferenceTier = 'managed' | 'project' | 'user' | 'plugin'

export type ReferenceLayer = {
	tier: ReferenceTier
	dir: string
	/** Every name a qualified `<plugin>/<name>` may use for this layer; empty outside the plugin tier. */
	plugins: string[]
	/** Empty unless the layer is legacy, deprecated, or skipped; then it says why. */
	status: string
	/** Set when the layer is never read, and why: policy held in MDM, or a plugin with no install folder. */
	skipped?: string
}

export type ReferenceLayerOptions = {
	root: string
	home: string
	platform: NodeJS.Platform
	programData?: string | undefined
	/**
	 * The plugin running the resolver. Its `references/` is the first plugin layer, and its install,
	 * when a harness has it enabled, is not read a second time.
	 */
	plugin?: ReferencePlugin | undefined
	/** Detects the harness and reads its settings. Defaults to `process.env`. */
	env?: Readonly<Record<string, string | undefined>>
}

export type ReferencePlugin = {
	/** The name a qualified `<plugin>/<name>` uses for it. */
	name: string
	/** The package root, which holds its `references/`. */
	root: string
}

export const LEGACY_STATUS = 'legacy — move these documents to references/ beside it'
export const DEPRECATED_STATUS = 'deprecated — move these documents to the managed references/ layer'

/** Read below the managed `references/` layer, so a machine already using it keeps working. */
export function managedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string {
	if (platform === 'darwin') return '/Library/Application Support/BuddyAgentHarness/governances'
	if (platform === 'win32') return join(programData || 'C:\\ProgramData', 'BuddyAgentHarness', 'governances')
	return '/etc/buddy-agent-harness/governances'
}

/** Still read, below the layer above, and reported as deprecated so an admin knows to move it. */
export function deprecatedManagedGovernancesDir(platform: NodeJS.Platform, programData?: string | undefined): string {
	if (platform === 'darwin') return '/Library/Application Support/UniPlugin/governances'
	if (platform === 'win32') return join(programData || 'C:\\ProgramData', 'UniPlugin', 'governances')
	return '/etc/universal-plugin/governances'
}

export function managedReferencesDir(platform: NodeJS.Platform, programData?: string | undefined): string {
	return join(dirname(managedGovernancesDir(platform, programData)), 'references')
}

export function projectReferencesDir(root: string): string {
	return join(root, '.agents', 'references')
}

export function projectReferenceLayers(root: string): ReferenceLayer[] {
	return [
		{ tier: 'project', dir: projectReferencesDir(root), plugins: [], status: '' },
		{ tier: 'project', dir: join(root, '.agents', 'governances'), plugins: [], status: LEGACY_STATUS },
	]
}

function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, 'utf8'))
	} catch {
		return undefined
	}
}

function isRepositoryRoot(dir: string): boolean {
	if (existsSync(join(dir, '.git')) || existsSync(join(dir, 'pnpm-workspace.yaml'))) return true
	const manifest = readJson(join(dir, 'package.json'))
	return isRecord(manifest) && manifest['workspaces'] !== undefined
}

/**
 * `root` and each folder above it up to the repository root, nearest first. With no repository root
 * above, `root` alone: a walk that never finds one would read every ancestor up to the filesystem root.
 */
export function projectChain(root: string): string[] {
	const start = resolve(root)
	const chain: string[] = []
	let dir = start
	for (;;) {
		chain.push(dir)
		if (isRepositoryRoot(dir)) return chain
		const parent = dirname(dir)
		if (parent === dir) return [start]
		dir = parent
	}
}

function isDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory()
	} catch {
		return false
	}
}

function nearestManifest(root: string): string | undefined {
	let dir = root
	for (;;) {
		const path = join(dir, 'package.json')
		if (existsSync(path)) return path
		const parent = dirname(dir)
		if (parent === dir) return undefined
		dir = parent
	}
}

function canonical(path: string): string {
	try {
		return realpathSync(path)
	} catch {
		return path
	}
}

/**
 * Declared dependencies only: a transitive package never becomes a plugin, because a reference is
 * instruction text an agent follows.
 */
function dependencyLayers(root: string, skip: ReadonlySet<string>): ReferenceLayer[] {
	const manifestPath = nearestManifest(root)
	if (!manifestPath) return []
	const layers: ReferenceLayer[] = []
	for (const pkg of declaredDependencies(readJson(manifestPath))) {
		const dir = packageDir(pkg, manifestPath)
		if (!dir || skip.has(canonical(dir))) continue
		const references = join(dir, 'references')
		if (!isDirectory(references)) continue
		const manifest = readJson(join(dir, 'plugin.json'))
		const manifestName = isRecord(manifest) && typeof manifest['name'] === 'string' ? manifest['name'] : undefined
		const plugins = manifestName && manifestName !== pkg ? [pkg, manifestName] : [pkg]
		layers.push({ tier: 'plugin', dir: references, plugins, status: '' })
	}
	return layers
}

function ownLayers({ name, root }: ReferencePlugin): ReferenceLayer[] {
	return [
		{ tier: 'plugin', dir: join(root, 'references'), plugins: [name], status: '' },
		{ tier: 'plugin', dir: join(root, 'governances'), plugins: [name], status: LEGACY_STATUS },
	]
}

export async function referenceLayers({
	root,
	home,
	platform,
	programData,
	plugin,
	env = process.env,
}: ReferenceLayerOptions): Promise<ReferenceLayer[]> {
	const layer = (tier: ReferenceTier, dir: string, status = ''): ReferenceLayer => ({
		tier,
		dir,
		plugins: [],
		status,
	})
	const harnesses = detectedHarnesses(env)
	const chain = projectChain(root)
	const ownRoot = plugin && canonical(plugin.root)
	const enabled = await enabledPluginLayers(harnesses, chain, { env, homedir: home, cwd: resolve(root), platform })
	const layers: ReferenceLayer[] = [
		layer('managed', managedReferencesDir(platform, programData)),
		...harnessManagedLayers(harnesses, platform, env),
		layer('managed', managedGovernancesDir(platform, programData), LEGACY_STATUS),
		layer('managed', deprecatedManagedGovernancesDir(platform, programData), DEPRECATED_STATUS),
		...chain.flatMap(projectReferenceLayers),
		layer('user', join(home, '.agents', 'references')),
		layer('user', join(home, '.agents', 'governances'), LEGACY_STATUS),
		...(plugin ? ownLayers(plugin) : []),
		...enabled.filter(({ dir, skipped }) => skipped || (isDirectory(dir) && canonical(dirname(dir)) !== ownRoot)),
		...dependencyLayers(root, new Set(ownRoot ? [ownRoot] : [])),
	]
	// A repository checked out at the home directory would read the same folder as project and user.
	const seen = new Set<string>()
	return layers.filter(({ dir }) => !seen.has(dir) && seen.add(dir))
}
