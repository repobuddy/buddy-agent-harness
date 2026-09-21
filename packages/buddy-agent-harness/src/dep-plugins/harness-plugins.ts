// E-* IDs below: .research/agentic-configuration-standards/evidence.md

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type PluginRuntimeName = 'claude-code' | 'codex'

export type InstalledPlugin = {
	/** `<plugin>@<marketplace>` */
	id: string
	version: string
	scope: string
	projectPath?: string
}

export type RegisteredMarketplace = { name: string; path: string }

/** Read, never written: installing is the runtime's own job, done through its own CLI. */
export type HarnessPluginState = {
	installed: InstalledPlugin[]
	marketplaces: RegisteredMarketplace[]
}

export type PluginRuntime = {
	name: PluginRuntimeName
	installedOnMachine(home: string, env?: NodeJS.ProcessEnv): boolean
	state(home: string, env?: NodeJS.ProcessEnv): HarnessPluginState
	register(catalogDir: string): string
	install(id: string): string
	update(id: string): string
	uninstall(id: string): string
	/** Empty where a runtime re-reads the catalog on install and needs no separate refresh. */
	refreshMarketplace(marketplace: string): string
	/** False where one install serves every repository on the machine. */
	scoped: boolean
}

// E-COPILOT-03
export const COPILOT_LIMITATION =
	'Copilot CLI rejects an npm marketplace source, so it cannot install from this catalog. It needs a path-sourced catalog, which cannot reach node_modules from a subdirectory.'

function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, 'utf8'))
	} catch {
		return undefined
	}
}

function directories(path: string): string[] {
	try {
		return readdirSync(path, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
	} catch {
		return []
	}
}

// ── Claude Code ──

export function claudeConfigDir(home: string, env: NodeJS.ProcessEnv = process.env): string {
	return env['CLAUDE_CONFIG_DIR'] || join(home, '.claude')
}

// E-CC-17: one array per plugin id, an element per scope and project.
export function readClaudeState(configDir: string): HarnessPluginState {
	const installedFile = readJson(join(configDir, 'plugins', 'installed_plugins.json')) as
		| { plugins?: Record<string, unknown> }
		| undefined
	const installed: InstalledPlugin[] = []
	for (const [id, entries] of Object.entries(installedFile?.plugins ?? {})) {
		if (!Array.isArray(entries)) continue
		for (const entry of entries) {
			if (!entry || typeof entry !== 'object') continue
			const record = entry as Record<string, unknown>
			const version = typeof record['version'] === 'string' ? record['version'] : undefined
			const scope = typeof record['scope'] === 'string' ? record['scope'] : undefined
			if (!version || !scope) continue
			const projectPath = typeof record['projectPath'] === 'string' ? record['projectPath'] : undefined
			installed.push(projectPath ? { id, version, scope, projectPath } : { id, version, scope })
		}
	}

	const knownFile = readJson(join(configDir, 'plugins', 'known_marketplaces.json')) as
		| Record<string, { source?: { path?: unknown } }>
		| undefined
	const marketplaces: RegisteredMarketplace[] = []
	for (const [name, value] of Object.entries(knownFile ?? {})) {
		marketplaces.push({ name, path: typeof value?.source?.path === 'string' ? value.source.path : '' })
	}

	return { installed, marketplaces }
}

export const claudeCode: PluginRuntime = {
	name: 'claude-code',
	scoped: true,
	installedOnMachine: (home, env = process.env) => existsSync(claudeConfigDir(home, env)),
	state: (home, env = process.env) => readClaudeState(claudeConfigDir(home, env)),
	register: (catalogDir) => `claude plugin marketplace add ./${catalogDir} --scope project`,
	install: (id) => `claude plugin install ${id} --scope project`,
	// Not `install`, a silent no-op (E-CC-15); `--scope project` is required on every verb (E-CC-16).
	update: (id) => `claude plugin update ${id} --scope project`,
	uninstall: (id) => `claude plugin uninstall ${id} --scope project`,
	refreshMarketplace: (marketplace) => `claude plugin marketplace update ${marketplace}`,
}

// ── Codex ──

export function codexHome(home: string, env: NodeJS.ProcessEnv = process.env): string {
	return env['CODEX_HOME'] || join(home, '.codex')
}

// E-CODEX-04: the version is only in the cache path. The TOML scan is deliberately narrow: a misread
// only suggests re-registering, which is harmless to re-run.
export function readCodexState(home: string): HarnessPluginState {
	const cacheRoot = join(home, 'plugins', 'cache')
	const installed: InstalledPlugin[] = []
	for (const marketplace of directories(cacheRoot)) {
		for (const plugin of directories(join(cacheRoot, marketplace))) {
			for (const version of directories(join(cacheRoot, marketplace, plugin))) {
				installed.push({ id: `${plugin}@${marketplace}`, version, scope: 'user' })
			}
		}
	}

	const marketplaces: RegisteredMarketplace[] = []
	let config = ''
	try {
		config = readFileSync(join(home, 'config.toml'), 'utf8')
	} catch {
		config = ''
	}
	let current: RegisteredMarketplace | undefined
	for (const line of config.split('\n')) {
		const header = /^\s*\[marketplaces\.(?:"([^"]+)"|([^\]]+))\]\s*$/.exec(line)
		if (header) {
			current = { name: (header[1] ?? header[2]) as string, path: '' }
			marketplaces.push(current)
			continue
		}
		if (/^\s*\[/.test(line)) {
			current = undefined
			continue
		}
		const source = current ? /^\s*source\s*=\s*"([^"]*)"\s*$/.exec(line) : undefined
		if (source?.[1] && current) current.path = source[1]
	}

	return { installed, marketplaces }
}

export const codex: PluginRuntime = {
	name: 'codex',
	// E-CODEX-03: unscoped, so only the derived marketplace name keeps two repositories apart.
	scoped: false,
	installedOnMachine: (home, env = process.env) => existsSync(codexHome(home, env)),
	state: (home, env = process.env) => readCodexState(codexHome(home, env)),
	register: (catalogDir) => `codex plugin marketplace add ./${catalogDir}`,
	install: (id) => `codex plugin add ${id}`,
	// E-CODEX-03: no update verb; `add` replaces the cached copy.
	update: (id) => `codex plugin add ${id}`,
	uninstall: (id) => `codex plugin remove ${id}`,
	// E-CODEX-03: `add` already re-reads a local catalog.
	refreshMarketplace: () => '',
}

// Copilot CLI (E-COPILOT-03) and Cursor (E-CUR-04) have no CLI this can drive.
export const runtimes: readonly PluginRuntime[] = [claudeCode, codex]
