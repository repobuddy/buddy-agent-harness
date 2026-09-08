/**
 * Locating a declared dependency on disk, and reading the plugin manifest it may ship.
 *
 * Resolution rather than scanning. Walking `node_modules` finds transitive dependencies nobody
 * vetted, and a skill or plugin is instruction text that steers an agent — an unvetted transitive
 * dependency is a supply-chain surface, not a convenience. Asking the module resolver where a
 * *declared* dependency lives answers the question that was actually asked, and it is correct under
 * npm, pnpm, yarn with the node-modules linker, and bun alike, because all four put a real directory
 * on disk. Only Yarn PnP does not, and it is reported rather than guessed at.
 */

import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { DepPlugin } from './dep-plugins.ts'

/** Why a declared dependency yielded no plugin, when the caller needs to explain itself. */
export type SkipReason = 'unresolved' | 'no-manifest' | 'unnamed'

export type ResolveOutcome = { ok: true; plugin: DepPlugin } | { ok: false; package: string; reason: SkipReason }

function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, 'utf8'))
	} catch {
		return undefined
	}
}

/**
 * Every ancestor `node_modules/<pkg>` from `startDir` upward. The fallback path only — see
 * {@link packageDir}.
 */
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
 * The directory a declared dependency was installed into, or `undefined`.
 *
 * Two mechanisms, in order, because neither alone is sufficient:
 *
 * 1. **`require.resolve('<pkg>/package.json')`, anchored at the declaring manifest.** The anchor
 *    matters: under pnpm's isolated store only the package that declares a dependency can resolve it,
 *    so resolving from a workspace root would miss what a workspace member declared.
 * 2. **A walk up `node_modules`.** Roughly one package in seven declares an `exports` map without a
 *    `./package.json` entry, and those refuse the first mechanism with `ERR_PACKAGE_PATH_NOT_EXPORTED`
 *    however plainly they are installed. Resolving a deeper file instead is not an escape — the same
 *    map blocks that too.
 */
export function packageDir(pkg: string, fromManifest: string): string | undefined {
	try {
		const require = createRequire(fromManifest)
		return dirname(require.resolve(`${pkg}/package.json`))
	} catch {
		// fall through to the walk
	}
	for (const candidate of ancestorCandidates(dirname(fromManifest), pkg)) {
		if (existsSync(join(candidate, 'package.json'))) return candidate
	}
	return undefined
}

/**
 * Reads the plugin a dependency ships, if it ships one.
 *
 * The version comes from the dependency's own `package.json` rather than from a lockfile. It is the
 * same number — the version actually installed — and reading it needs no knowledge of which of the
 * four lockfile formats this repository uses.
 *
 * A manifest at the package root is what the Agent Plugins Specification pins, and it is the form a
 * harness accepts as a marketplace source without any vendor-specific manifest alongside it.
 */
export function readDepPlugin(pkg: string, fromManifest: string): ResolveOutcome {
	const dir = packageDir(pkg, fromManifest)
	if (!dir) return { ok: false, package: pkg, reason: 'unresolved' }

	const manifest = readJson(join(dir, 'plugin.json'))
	if (!manifest || typeof manifest !== 'object') return { ok: false, package: pkg, reason: 'no-manifest' }

	const record = manifest as Record<string, unknown>
	const name = typeof record['name'] === 'string' ? record['name'] : undefined
	if (!name) return { ok: false, package: pkg, reason: 'unnamed' }

	// The installed version, not the manifest's: the catalog installs the package from npm, so the
	// number that must match is the one npm published the tree under.
	const installed = readJson(join(dir, 'package.json')) as { version?: unknown } | undefined
	const version = typeof installed?.version === 'string' ? installed.version : undefined
	if (!version) return { ok: false, package: pkg, reason: 'no-manifest' }

	const description = typeof record['description'] === 'string' ? record['description'] : undefined
	return {
		ok: true,
		plugin: description
			? { package: pkg, plugin: name, version, description }
			: { package: pkg, plugin: name, version },
	}
}

/**
 * True when the process is running under Yarn's Plug'n'Play resolver, where packages live inside zip
 * archives rather than as directories. A marketplace source must be a real directory and an npm
 * source must be installable, so a PnP project needs `nodeLinker: node-modules` or the affected
 * dependencies unplugged. Detected rather than worked around, so the report can say so.
 */
export function isPnp(): boolean {
	return Boolean((process.versions as Record<string, string | undefined>)['pnp'])
}
