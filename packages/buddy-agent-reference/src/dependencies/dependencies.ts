import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/**
 * Includes `devDependencies` — a plugin can supply a project's testing or release workflow.
 * Transitive dependencies are excluded: only what the manifest declares.
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

function ancestorCandidates(startDir: string, pkg: string): string[] {
	const segments = pkg.split('/')
	const candidates: string[] = []
	let dir = startDir
	for (;;) {
		candidates.push(join(dir, 'node_modules', ...segments))
		const parent = dirname(dir)
		if (parent === dir) break
		dir = parent
	}
	return candidates
}

/**
 * Anchored at the declaring manifest (required for pnpm's isolation), then falls back to a
 * `node_modules` walk — an `exports` map without a `./package.json` entry blocks the first.
 */
export function packageDir(pkg: string, fromManifest: string): string | undefined {
	try {
		const require = createRequire(fromManifest)
		return dirname(require.resolve(`${pkg}/package.json`))
	} catch {}
	for (const candidate of ancestorCandidates(dirname(fromManifest), pkg)) {
		if (existsSync(join(candidate, 'package.json'))) return candidate
	}
	return undefined
}
