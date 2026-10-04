import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { packageDir } from 'buddy-agent-reference'
import type { DepPlugin } from './dep-plugins.ts'

export type SkipReason = 'unresolved' | 'no-manifest' | 'unnamed'

export type ResolveOutcome = { ok: true; plugin: DepPlugin } | { ok: false; package: string; reason: SkipReason }

function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, 'utf8'))
	} catch {
		return undefined
	}
}

/** A manifest lives at the package root — the Agent Plugins Specification's pinned location. */
export function readDepPlugin(pkg: string, fromManifest: string): ResolveOutcome {
	const dir = packageDir(pkg, fromManifest)
	if (!dir) return { ok: false, package: pkg, reason: 'unresolved' }

	const manifest = readJson(join(dir, 'plugin.json'))
	if (!manifest || typeof manifest !== 'object') return { ok: false, package: pkg, reason: 'no-manifest' }

	const record = manifest as Record<string, unknown>
	const name = typeof record['name'] === 'string' ? record['name'] : undefined
	if (!name) return { ok: false, package: pkg, reason: 'unnamed' }

	// The installed version, not the manifest's declared range — npm installs by this number.
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
 * True under Yarn PnP, where packages live in zip archives rather than directories — nothing here
 * has an installable directory.
 */
export function isPnp(): boolean {
	return Boolean((process.versions as Record<string, string | undefined>)['pnp'])
}
