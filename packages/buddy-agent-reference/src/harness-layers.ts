import { join, posix, win32 } from 'node:path'
import {
	detectHarness,
	enabledPlugins,
	type HarnessEnvironment,
	type HarnessId,
	type InstalledPlugin,
	installedPlugins,
	type ManagedPolicyKind,
	managedPolicyLocations,
} from '@cyberuni/agent-harness'
import type { ReferenceLayer } from './reference-layers.ts'

type Env = Readonly<Record<string, string | undefined>>

/** Nested harnesses leave `detectHarness` at `unknown`; each candidate is still a harness in play. */
export function detectedHarnesses(env: Env): readonly HarnessId[] {
	return detectHarness({ env }).candidates
}

const unreadableKind: Partial<Record<ManagedPolicyKind, string>> = {
	'macos-managed-preferences': 'a macOS managed-preferences domain delivered by MDM',
	'windows-registry': 'a Windows registry key delivered by MDM or Group Policy',
	server: 'server-side settings',
}

function skippedLayer(
	tier: ReferenceLayer['tier'],
	dir: string,
	skipped: string,
	plugins: string[] = [],
): ReferenceLayer {
	return { tier, dir, plugins, status: skipped, skipped }
}

/**
 * The folder holding a harness's managed files gets a `references/` beside them. A `directory`
 * location inside that folder, such as a drop-in `managed-settings.d`, is part of it, not a folder
 * of its own.
 */
function managedFolders(harness: HarnessId, platform: NodeJS.Platform, env: Env) {
	const path = platform === 'win32' ? win32 : posix
	const locations = managedPolicyLocations(harness, { platform, env })
	const folders = [
		...new Set(
			locations.flatMap(({ kind, location }) =>
				kind === 'file' ? [path.dirname(location)] : kind === 'directory' ? [location] : [],
			),
		),
	]
	const outermost = folders.filter((folder) => !folders.some((other) => folder.startsWith(other + path.sep)))
	return {
		read: outermost.map((folder) => path.join(folder, 'references')),
		unread: locations.flatMap(({ kind, location }) => {
			const where = unreadableKind[kind]
			return where
				? [{ location, reason: `not read — ${harness} keeps this policy in ${where}, which cannot be read locally` }]
				: []
		}),
	}
}

export function harnessManagedLayers(
	harnesses: readonly HarnessId[],
	platform: NodeJS.Platform,
	env: Env,
): ReferenceLayer[] {
	if (!harnesses.length) {
		return [
			skippedLayer('managed', '(no harness detected)', 'not read — no harness detected, so no harness managed folder'),
		]
	}
	return harnesses.flatMap((harness) => {
		const { read, unread } = managedFolders(harness, platform, env)
		return [
			...read.map((dir): ReferenceLayer => ({ tier: 'managed', dir, plugins: [], status: '' })),
			...unread.map(({ location, reason }) => skippedLayer('managed', location, reason)),
		]
	})
}

/**
 * Claude Code installs one plugin at several scopes; a project- or local-scoped install loads only in
 * its own project, so the nearest folder of the walk picks it, and a user install answers elsewhere.
 */
function activeInstall(installs: readonly InstalledPlugin[], chain: readonly string[]): InstalledPlugin | undefined {
	for (const dir of chain) {
		const install = installs.find(({ projectPath }) => projectPath === dir)
		if (install) return install
	}
	return installs.find(({ projectPath }) => projectPath === undefined)
}

/**
 * Only plugins the harness has enabled: installing a plugin never activates it, and a reference is
 * instruction text an agent follows.
 */
export async function enabledPluginLayers(
	harnesses: readonly HarnessId[],
	chain: readonly string[],
	environment: HarnessEnvironment,
): Promise<ReferenceLayer[]> {
	const layers: ReferenceLayer[] = []
	for (const harness of harnesses) {
		const [enabled, installed] = await Promise.all([
			enabledPlugins(harness, environment),
			installedPlugins(harness, environment),
		])
		if (!enabled.supported) {
			layers.push(
				skippedLayer(
					'plugin',
					`(${harness} enabled plugins)`,
					`not read — ${harness} keeps no readable record of enabled plugins`,
				),
			)
			continue
		}
		if (enabled.unread.length) {
			layers.push(
				skippedLayer(
					'plugin',
					`(${harness} plugin policy)`,
					`not read — ${enabled.unread.join('; ')} may also enable or disable ${harness} plugins`,
				),
			)
		}
		for (const { id, enabled: on } of enabled.plugins) {
			if (!on) continue
			const plugin = id.split('@')[0] as string
			const install = activeInstall(
				installed.plugins.filter((candidate) => candidate.id === id),
				chain,
			)
			if (install) {
				layers.push({ tier: 'plugin', dir: join(install.path, 'references'), plugins: [plugin], status: '' })
				continue
			}
			layers.push(
				skippedLayer(
					'plugin',
					`(${id})`,
					`not read — enabled in ${harness}, but no install folder for this project is recorded`,
					[plugin],
				),
			)
		}
	}
	return layers
}
