import { existsSync, readFileSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { parseJsonWithComments } from '../diagnose-bridges/json-with-comments.ts'
import type { McpServer, McpTransport } from '../diagnose-mcp/mcp-model.ts'
import { nonSecretArgs } from '../diagnose-mcp/mcp-secrets.ts'
import { parseTarget, serverFrom } from '../diagnose-mcp/mcp-sources.ts'
import { type HarnessName, type HarnessScopeName, harnessRegistry } from '../harness-registry/harness-registry.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { isRecord } from '../is-record/is-record.ts'

/**
 * `local`: Claude Code's per-project entry inside `~/.claude.json`. `plugin`: a server an installed
 * Claude Code plugin ships, named on `McpServerEntry.plugin`.
 */
export type McpServerScope = HarnessScopeName | 'local' | 'plugin'

/** Not wired into `doctor`: adding a harness here never changes what `doctor` reads. */
function userScopeConfig(
	harness: HarnessName,
	home: string,
	env: Readonly<Record<string, string | undefined>>,
): { file: string; config: McpConfig } | undefined {
	switch (harness) {
		case 'claude-code':
			return { file: join(home, '.claude.json'), config: { path: '.claude.json', key: 'mcpServers', format: 'json' } }
		case 'cursor':
			return {
				file: join(home, '.cursor', 'mcp.json'),
				config: { path: '.cursor/mcp.json', key: 'mcpServers', format: 'json' },
			}
		case 'codex':
			return {
				file: join(env['CODEX_HOME'] || join(home, '.codex'), 'config.toml'),
				config: { path: 'config.toml', key: 'mcp_servers', format: 'toml' },
			}
		case 'copilot-cli':
			return {
				file: join(env['COPILOT_HOME'] || join(home, '.copilot'), 'mcp-config.json'),
				config: { path: 'mcp-config.json', key: 'mcpServers', format: 'json' },
			}
		case 'gemini-cli':
			return {
				file: join(home, '.gemini', 'settings.json'),
				config: { path: '.gemini/settings.json', key: 'mcpServers', format: 'json', shared: true },
			}
		default:
			return undefined
	}
}

function read(file: string): string | undefined {
	return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

/** A URL trimmed to its origin and path, dropping any query string a token could ride in on. */
function safeUrl(value: string | undefined): string | undefined {
	if (!value) return undefined
	try {
		const url = new URL(value)
		return `${url.origin}${url.pathname}`
	} catch {
		return undefined
	}
}

/** One configured MCP server, redacted of everything that could carry a credential. */
export type McpServerEntry = {
	harness: HarnessName
	scope: McpServerScope
	/** The absolute path of the config file this entry was read from. */
	configFile: string
	/** The name the server is declared under. */
	name: string
	transport: McpTransport | undefined
	/** The command's basename, never its full path. */
	command: string | undefined
	/** `args`, with any credential-bearing `--flag=value` pair dropped. */
	args: readonly string[]
	/** The URL's origin and path, never its query string. */
	url: string | undefined
	enabled: boolean
	/** The plugin id this server came from, set only when `scope` is `'plugin'`. */
	plugin?: string
}

export type ListMcpServersOptions = {
	/** The project directory to read project-scope configuration from. */
	projectDir: string
	/** Overrides `os.homedir()`, for a test that must not touch the real one. */
	homeDir?: string
	/**
	 * Overrides `process.env`, for a test — read only for `CODEX_HOME`, `COPILOT_HOME`, and
	 * `XDG_CONFIG_HOME`.
	 */
	env?: Readonly<Record<string, string | undefined>>
	/** Overrides `os.platform()`, so the VS Code user directory is testable on every OS. */
	platform?: NodeJS.Platform
}

function toEntry(
	harness: HarnessName,
	scope: McpServerScope,
	file: string,
	name: string,
	server: McpServer,
	plugin?: string,
): McpServerEntry {
	return {
		harness,
		scope,
		configFile: file,
		name,
		transport: server.transport,
		command: server.command ? basename(server.command) : undefined,
		args: nonSecretArgs(server.args),
		url: safeUrl(server.url),
		enabled: server.enabled !== false,
		...(plugin ? { plugin } : {}),
	}
}

function entriesFrom(harness: HarnessName, scope: McpServerScope, file: string, config: McpConfig): McpServerEntry[] {
	const parsed = parseTarget(config, read(file))
	if (parsed.kind !== 'servers') return []
	return [...parsed.servers].map(([name, server]) => toEntry(harness, scope, file, name, server))
}

/**
 * Reshapes what `serverFrom` doesn't recognize: OpenCode's `command` array, Zed's `command` object,
 * and Windsurf's `serverUrl` alias for `url`.
 */
function normalizeRawEntry(raw: Record<string, unknown>): Record<string, unknown> {
	const command = raw['command']
	if (Array.isArray(command)) {
		const [first, ...rest] = command as unknown[]
		return { ...raw, command: first, args: raw['args'] ?? rest }
	}
	if (isRecord(command)) {
		return { ...raw, command: command['path'], args: raw['args'] ?? command['args'] }
	}
	if (raw['url'] === undefined && typeof raw['serverUrl'] === 'string') {
		return { ...raw, url: raw['serverUrl'] }
	}
	return raw
}

/** Every server under `key` in an already-parsed JSON(C) document, normalized and converted. */
function serversFromDocument(document: unknown, key: string): Map<string, McpServer> {
	const table = isRecord(document) ? document[key] : undefined
	if (!isRecord(table)) return new Map()
	return new Map(
		Object.entries(table)
			.filter((pair): pair is [string, Record<string, unknown>] => isRecord(pair[1]))
			.map(([name, entry]) => [name, serverFrom(normalizeRawEntry(entry))]),
	)
}

function entriesFromDocument(
	harness: HarnessName,
	scope: McpServerScope,
	file: string,
	document: unknown,
	key: string,
	options: { plugin?: string; forceDisabled?: boolean } = {},
): McpServerEntry[] {
	return [...serversFromDocument(document, key)].map(([name, server]) => {
		const entry = toEntry(harness, scope, file, name, server, options.plugin)
		return options.forceDisabled ? { ...entry, enabled: false } : entry
	})
}

/**
 * Where VS Code keeps its user-scope settings, per platform — mirrors what VS Code itself
 * documents.
 */
function vscodeUserDir(env: Readonly<Record<string, string | undefined>>, home: string, plat: NodeJS.Platform): string {
	if (plat === 'win32') return join(env['APPDATA'] || join(home, 'AppData', 'Roaming'), 'Code', 'User')
	if (plat === 'darwin') return join(home, 'Library', 'Application Support', 'Code', 'User')
	return join(env['XDG_CONFIG_HOME'] || join(home, '.config'), 'Code', 'User')
}

type ExtraSource = {
	harness: HarnessName
	scope: McpServerScope
	file: string
	key: string
}

// Sources with no registry entry. Windsurf's legacy path is read as `devin-desktop`, its new name
// (E-WS-02).
function extraSources(
	projectDir: string,
	home: string,
	env: Readonly<Record<string, string | undefined>>,
	plat: NodeJS.Platform,
): ExtraSource[] {
	const xdg = env['XDG_CONFIG_HOME'] || join(home, '.config')
	return [
		{ harness: 'vscode', scope: 'user', file: join(vscodeUserDir(env, home, plat), 'mcp.json'), key: 'servers' },
		{ harness: 'vscode', scope: 'project', file: join(projectDir, '.vscode', 'mcp.json'), key: 'servers' },
		{
			harness: 'devin-desktop',
			scope: 'user',
			file: join(home, '.codeium', 'windsurf', 'mcp_config.json'),
			key: 'mcpServers',
		},
		{ harness: 'opencode', scope: 'user', file: join(xdg, 'opencode', 'opencode.json'), key: 'mcp' },
		{ harness: 'opencode', scope: 'project', file: join(projectDir, 'opencode.json'), key: 'mcp' },
		{ harness: 'zed', scope: 'user', file: join(xdg, 'zed', 'settings.json'), key: 'context_servers' },
		{ harness: 'zed', scope: 'project', file: join(projectDir, '.zed', 'settings.json'), key: 'context_servers' },
	]
}

/**
 * Claude Code's per-project servers: `~/.claude.json`'s `projects[projectDir].mcpServers`, distinct
 * from the file's top-level `mcpServers` (read as `'user'` scope above).
 */
function claudeLocalEntries(home: string, projectDir: string): McpServerEntry[] {
	const file = join(home, '.claude.json')
	const text = read(file)
	if (text === undefined) return []
	const document = parseJsonWithComments(text)
	const projects = isRecord(document) ? document['projects'] : undefined
	const project = isRecord(projects) ? projects[resolve(projectDir)] : undefined
	if (!isRecord(project)) return []
	return entriesFromDocument('claude-code', 'local', file, project, 'mcpServers')
}

/** `enabledPlugins`, merged from global settings up through project-local settings, last write wins. */
function enabledPlugins(home: string, projectDir: string): Record<string, boolean> {
	const enabled: Record<string, boolean> = {}
	for (const file of [
		join(home, '.claude', 'settings.json'),
		join(projectDir, '.claude', 'settings.json'),
		join(projectDir, '.claude', 'settings.local.json'),
	]) {
		const text = read(file)
		if (text === undefined) continue
		const document = parseJsonWithComments(text)
		const table = isRecord(document) ? document['enabledPlugins'] : undefined
		if (!isRecord(table)) continue
		for (const [id, value] of Object.entries(table)) if (typeof value === 'boolean') enabled[id] = value
	}
	return enabled
}

/**
 * Servers shipped by installed Claude Code plugins, with `enabled` forced by the plugin's own
 * enabled state rather than the server's own field.
 */
function pluginEntries(home: string, projectDir: string): McpServerEntry[] {
	const file = join(home, '.claude', 'plugins', 'installed_plugins.json')
	const text = read(file)
	if (text === undefined) return []
	const document = parseJsonWithComments(text)
	const installed = isRecord(document) ? document['plugins'] : undefined
	if (!isRecord(installed)) return []

	const enabled = enabledPlugins(home, projectDir)
	const absoluteProject = resolve(projectDir)
	const entries: McpServerEntry[] = []

	for (const [id, list] of Object.entries(installed)) {
		if (!Array.isArray(list)) continue
		for (const install of list) {
			if (!isRecord(install)) continue
			const projectPath = install['projectPath']
			if (typeof projectPath === 'string' && resolve(projectPath) !== absoluteProject) continue
			const installPath = install['installPath']
			if (typeof installPath !== 'string') continue

			const mcpFile = join(installPath, '.mcp.json')
			const mcpText = read(mcpFile)
			if (mcpText === undefined) continue
			const mcpDocument = parseJsonWithComments(mcpText)
			if (!isRecord(mcpDocument)) continue

			// A plugin's `.mcp.json` may list servers under `mcpServers`, or at the file's top level.
			const document2 = isRecord(mcpDocument['mcpServers']) ? mcpDocument : { mcpServers: mcpDocument }
			entries.push(
				...entriesFromDocument('claude-code', 'plugin', mcpFile, document2, 'mcpServers', {
					plugin: id,
					forceDisabled: enabled[id] !== true,
				}),
			)
		}
	}
	return entries
}

/**
 * Every configured MCP server across supported harnesses and scopes, redacted of credentials. A
 * missing or unparseable file contributes no entries silently — this reports an inventory, not a
 * diagnosis.
 */
export function listMcpServers(options: ListMcpServersOptions): McpServerEntry[] {
	const home = options.homeDir ?? homedir()
	const env = options.env ?? process.env
	const plat = options.platform ?? platform()
	const entries: McpServerEntry[] = []

	for (const harness of harnessRegistry) {
		if (harness.deprecated) continue

		const project = harness.project.mcpConfig
		if (project) entries.push(...entriesFrom(harness.name, 'project', join(options.projectDir, project.path), project))

		const user = userScopeConfig(harness.name, home, env)
		if (user) entries.push(...entriesFrom(harness.name, 'user', user.file, user.config))
	}

	entries.push(...claudeLocalEntries(home, options.projectDir))
	entries.push(...pluginEntries(home, options.projectDir))

	for (const source of extraSources(options.projectDir, home, env, plat)) {
		const text = read(source.file)
		if (text === undefined) continue
		const document = parseJsonWithComments(text)
		if (document === undefined) continue
		entries.push(...entriesFromDocument(source.harness, source.scope, source.file, document, source.key))
	}

	return entries
}
