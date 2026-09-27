import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { declaredDependencies } from '../dep-plugins/dep-plugins.ts'
import { packageDir } from '../dep-plugins/resolve.ts'
import {
	deprecatedManagedGovernancesDir,
	managedGovernancesDir,
	packageGovernancesDir,
} from '../governance-overrides/governance-overrides.ts'
import { isRecord } from '../is-record/is-record.ts'

/** Order here is precedence order, highest first. */
export type ReferenceTier = 'managed' | 'project' | 'user' | 'plugin'

export type ReferenceLayer = {
	tier: ReferenceTier
	dir: string
	/** Every name a qualified `<plugin>/<name>` may use for this layer; empty outside the plugin tier. */
	plugins: string[]
	/** Empty unless the layer is legacy or deprecated; then it says where its documents belong. */
	status: string
}

export type ReferenceLayerOptions = {
	root: string
	home: string
	platform: NodeJS.Platform
	programData?: string | undefined
	/** This package's own root, the `buddy-agent-harness` plugin. */
	packageRoot?: string | undefined
}

export const PACKAGE_PLUGIN = 'buddy-agent-harness'
export const LEGACY_STATUS = 'legacy — move these documents to references/ beside it'
export const DEPRECATED_STATUS = 'deprecated — move these documents to the managed references/ layer'

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

export function referenceLayers({
	root,
	home,
	platform,
	programData,
	packageRoot = dirname(packageGovernancesDir()),
}: ReferenceLayerOptions): ReferenceLayer[] {
	const layer = (tier: ReferenceTier, dir: string, status = ''): ReferenceLayer => ({
		tier,
		dir,
		plugins: [],
		status,
	})
	const self = [PACKAGE_PLUGIN]
	const layers: ReferenceLayer[] = [
		layer('managed', managedReferencesDir(platform, programData)),
		layer('managed', managedGovernancesDir(platform, programData), LEGACY_STATUS),
		layer('managed', deprecatedManagedGovernancesDir(platform, programData), DEPRECATED_STATUS),
		...projectReferenceLayers(root),
		layer('user', join(home, '.agents', 'references')),
		layer('user', join(home, '.agents', 'governances'), LEGACY_STATUS),
		{ tier: 'plugin', dir: join(packageRoot, 'references'), plugins: self, status: '' },
		{ tier: 'plugin', dir: join(packageRoot, 'governances'), plugins: self, status: LEGACY_STATUS },
		...dependencyLayers(root, new Set([canonical(packageRoot)])),
	]
	// A repository checked out at the home directory would read the same folder as project and user.
	const seen = new Set<string>()
	return layers.filter(({ dir }) => !seen.has(dir) && seen.add(dir))
}
