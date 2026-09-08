/**
 * What each harness does with a marketplace catalog, and how to read what it currently has.
 *
 * The runtimes diverge more than they look, and every difference below was established by running
 * the shipped CLI rather than by reading a document:
 *
 * - **Claude Code** refreshes with `plugin update`; re-running `plugin install` is a no-op that
 *   reports "already installed" and leaves the stale copy in place. Every verb defaults to user
 *   scope, so each one has to name `--scope project` explicitly.
 * - **Codex** has no update verb and no scope. Re-running `plugin add` re-reads the catalog and
 *   replaces the cached copy, so the same command installs and refreshes. It records no version in
 *   its config — the installed version is only in the cache directory's name.
 * - **Copilot CLI** accepts a path source but **rejects an `npm` source**, so it cannot consume this
 *   catalog at all. See {@link COPILOT_LIMITATION}.
 * - **Cursor** exposes no plugin subcommand from a terminal.
 *
 * A consumer should not have to know any of that, which is why it is here rather than in a document.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type PluginRuntimeName = 'claude-code' | 'codex'

export type InstalledPlugin = {
	/** `<plugin>@<marketplace>` — the identity a harness installs and uninstalls by. */
	id: string
	version: string
	scope: string
	/** Present for project- and local-scoped installs; absent where a runtime has no scopes. */
	projectPath?: string
}

export type RegisteredMarketplace = { name: string; path: string }

/**
 * The state a harness keeps outside the repository. Read, never written: the install is the
 * runtime's own job, and driving it through its own CLI is what keeps that true.
 */
export type HarnessPluginState = {
	installed: InstalledPlugin[]
	marketplaces: RegisteredMarketplace[]
}

/**
 * One runtime's half of the contract: where its state lives, how to read it, and the commands that
 * move it toward a catalog.
 */
export type PluginRuntime = {
	name: PluginRuntimeName
	/** Whether this runtime is set up on this machine at all. */
	present(home: string, env?: NodeJS.ProcessEnv): boolean
	state(home: string, env?: NodeJS.ProcessEnv): HarnessPluginState
	register(catalogDir: string): string
	install(id: string): string
	update(id: string): string
	uninstall(id: string): string
	/** Empty where a runtime re-reads the catalog on install and needs no separate refresh. */
	refreshMarketplace(marketplace: string): string
	/**
	 * True where an install belongs to one repository rather than the whole machine. Where false,
	 * every repository on the machine shares one install and the reconciliation cannot isolate them.
	 */
	scoped: boolean
}

/**
 * Why Copilot CLI is absent from the table. Recorded rather than dropped, so the reason travels with
 * the code: `copilot plugin marketplace add` rejects this catalog with
 * `Invalid marketplace.json: plugins.0.source: Invalid input`, while the same catalog with a
 * `./path` source is accepted. Supporting it needs a second, path-sourced catalog — and a path source
 * cannot escape its marketplace root, which is the constraint the `npm` source was chosen to avoid.
 */
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

/**
 * `CLAUDE_CONFIG_DIR` wins where set, which is also what keeps a test off a developer's real
 * configuration.
 */
export function claudeConfigDir(home: string, env: NodeJS.ProcessEnv = process.env): string {
	return env['CLAUDE_CONFIG_DIR'] || join(home, '.claude')
}

/**
 * Reads what Claude Code has installed.
 *
 * The file keys each plugin by `<plugin>@<marketplace>` and holds an *array* per key, because the
 * same plugin can be installed at more than one scope and, at project scope, once per project.
 */
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
	present: (home, env = process.env) => existsSync(claudeConfigDir(home, env)),
	state: (home, env = process.env) => readClaudeState(claudeConfigDir(home, env)),
	register: (catalogDir) => `claude plugin marketplace add ./${catalogDir} --scope project`,
	install: (id) => `claude plugin install ${id} --scope project`,
	/**
	 * Not `install`: re-running that on an already-installed plugin changes nothing and says so, which
	 * reads as success. `--scope project` is required rather than cosmetic — every verb defaults to
	 * user scope, so an update omitting it fails with "not installed at scope user" against a plugin
	 * that is plainly installed.
	 */
	update: (id) => `claude plugin update ${id} --scope project`,
	uninstall: (id) => `claude plugin uninstall ${id} --scope project`,
	refreshMarketplace: (marketplace) => `claude plugin marketplace update ${marketplace}`,
}

// ── Codex ──

export function codexHome(home: string, env: NodeJS.ProcessEnv = process.env): string {
	return env['CODEX_HOME'] || join(home, '.codex')
}

/**
 * Reads what Codex has installed.
 *
 * The installed version comes from the cache layout, `plugins/cache/<marketplace>/<plugin>/<version>`,
 * because Codex's `config.toml` records only that a plugin is enabled — never which version.
 *
 * Registered marketplaces are read from `config.toml` by scanning for its `[marketplaces.<name>]`
 * tables. A deliberately narrow read rather than a TOML parser: only two keys are needed, and the
 * cost of being wrong is a report that suggests re-registering, which is harmless to re-run.
 */
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
	// The entry itself is carried rather than its name, so assigning a source needs no index lookup
	// and no guard against one that cannot fail.
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
	/**
	 * Codex installs into `CODEX_HOME` with no notion of scope, so one install is shared by every
	 * repository on the machine. Two repositories whose catalogs share a marketplace name cannot be
	 * told apart here, which is what makes the marketplace name derived from the package name matter.
	 */
	scoped: false,
	present: (home, env = process.env) => existsSync(codexHome(home, env)),
	state: (home, env = process.env) => readCodexState(codexHome(home, env)),
	register: (catalogDir) => `codex plugin marketplace add ./${catalogDir}`,
	install: (id) => `codex plugin add ${id}`,
	/** No update verb: re-running `add` re-reads the catalog and replaces the cached copy. */
	update: (id) => `codex plugin add ${id}`,
	uninstall: (id) => `codex plugin remove ${id}`,
	/** `marketplace upgrade` refreshes git snapshots only; `add` already re-reads a local catalog. */
	refreshMarketplace: () => '',
}

export const runtimes: readonly PluginRuntime[] = [claudeCode, codex]
