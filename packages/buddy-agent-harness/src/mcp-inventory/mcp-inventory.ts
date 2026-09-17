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
 * A public, redaction-safe inventory of configured MCP servers: what `diagnoseMcp` already knows how
 * to read, reshaped for a consumer that wants a list rather than a drift diagnosis.
 *
 * This is a **different question** than `doctor` answers, not a wider version of it. `doctor`
 * compares project-scope configuration against a golden set the user authors, and stays
 * project-scope only by design — see `apps/web/src/content/docs/agent-configuration/mcp-servers.md`
 * for why reading a user's home directory is a wider blast radius than diagnosis needs. An inventory
 * has no golden set to compare against and nothing to diagnose; it answers "what MCP servers does
 * this project, and this machine, already have configured", which is a question a consumer can only
 * answer by reading both scopes. Adding user scope here changes nothing about what `doctor` reads:
 * `diagnoseMcp` still touches `harness.project.mcpConfig` alone.
 *
 * Beyond `harnessRegistry`'s own harnesses this module also covers sources `doctor` never diagnoses
 * at all and that carry no `harnessRegistry` entry: VS Code, Windsurf/Devin Desktop's legacy config
 * path, OpenCode, and Zed at both scopes; Claude Code's project-local servers nested inside
 * `~/.claude.json`; and the MCP servers an installed Claude Code plugin ships. None of this changes
 * `selectHarnesses`, `diagnoseMcp`, or `doctor`'s project-scope-only policy — this module reads none
 * of it through those functions.
 *
 * Every field that could carry a credential is reduced before it leaves this module, the same
 * discipline `mcp-secrets.ts` documents for `doctor`'s own findings: `command` is trimmed to its
 * basename, `args` drops any `--flag=value` pair `nonSecretArgs` flags, and `url` is trimmed to its
 * origin and path. `env` and `headers` are not returned at all — a name alone does not say whether
 * the value behind it is a literal or a reference, and the safe answer is not to carry the map.
 */

/**
 * The two scopes `harnessRegistry` knows, plus the two this module adds on top of it.
 *
 * `local` is Claude Code's project-scoped entry inside the user-level `~/.claude.json` — a server
 * declared for one project only, not visible to any other. `plugin` is a server an installed Claude
 * Code plugin ships; `McpServerEntry.plugin` names which one. Neither fits `project` (there is no
 * project-scope file) or `user` (the entry does not apply to every project), so both get their own
 * name rather than being folded into the nearer of the two and read wrong.
 */
export type McpServerScope = HarnessScopeName | 'local' | 'plugin'

/** Where a harness keeps its **user-scope** MCP configuration, as that harness documents it.
 *
 * Unlike `harnessRegistry`, this table is read only from here: it is not wired into `doctor`, and
 * adding a harness to it never changes what `doctor` reads. Codex and Copilot CLI each let their
 * whole configuration directory move via an environment variable — `CODEX_HOME` and `COPILOT_HOME`
 * — so those two resolve through `env` before falling back to the home directory; the rest do not
 * document one.
 */
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
	/** Overrides `process.env`, for a test — read only for `CODEX_HOME`, `COPILOT_HOME`, and `XDG_CONFIG_HOME`. */
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
 * A raw entry reshaped so `serverFrom` recognizes fields the registry-driven harnesses never write:
 * OpenCode's `command` as an array (its first element is the command, the rest are args), Zed's
 * `command` as `{ path, args }`, and Windsurf's `serverUrl` as an alias for `url`. A field none of
 * those apply to is passed through unchanged.
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

/** Where VS Code keeps its user-scope settings, per platform — mirrors what VS Code itself documents. */
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

/**
 * Sources `harnessRegistry` carries no entry for at all, so they cannot be read through
 * `userScopeConfig` or a harness's `project.mcpConfig`. Each of these harnesses is either not one
 * `doctor` diagnoses (VS Code, OpenCode, Zed have no `HarnessScope.mcpConfig`) or is diagnosed under
 * a different name than the one its own vendor uses for this file: Windsurf was rebranded to Devin
 * Desktop (`.research/agentic-configuration-standards/evidence.md`, E-WS-02), and
 * `~/.codeium/windsurf/mcp_config.json` is that product's legacy config path, read here under
 * `devin-desktop` rather than under a separate `windsurf` MCP source. This is a deliberate departure
 * from `repobuddy`'s scanner, which has no such mapping and reports the file under a standalone
 * `windsurf` harness name.
 */
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
 * Claude Code's project-local servers: `~/.claude.json`'s `projects["<absolute project dir>"]
 * .mcpServers`, a server declared for this one project rather than every project the way the file's
 * top-level `mcpServers` (read as `'user'` scope, above) is.
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
 * MCP servers shipped by installed Claude Code plugins, with `enabled` reflecting whether the plugin
 * itself is enabled for this project — a plugin not set to `true` in the merged `enabledPlugins` is
 * disabled, and every server it ships is reported disabled regardless of that server's own field. An
 * install whose `projectPath` names a different project contributes nothing: that install is not
 * this project's.
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
 * Every MCP server configured for a project, across every supported harness and every scope that
 * harness documents — without ever surfacing a credential.
 *
 * Reuses `diagnoseMcp`'s own parsing (`parseTarget`, `serverFrom`), model (`McpServer`), and
 * redaction (`nonSecretArgs`, and the URL/command trimming this module adds) rather than re-reading
 * or re-parsing any of the supported harnesses' MCP files. A harness with no file present, or one
 * whose file does not parse, contributes no entries; this function reports an inventory, not a
 * diagnosis, so it has nothing to say about why a file is missing or broken.
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
