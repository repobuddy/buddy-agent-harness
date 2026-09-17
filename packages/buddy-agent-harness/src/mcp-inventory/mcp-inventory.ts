import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import type { McpServer, McpTransport } from '../diagnose-mcp/mcp-model.ts'
import { nonSecretArgs } from '../diagnose-mcp/mcp-secrets.ts'
import { parseTarget } from '../diagnose-mcp/mcp-sources.ts'
import { type HarnessName, type HarnessScopeName, harnessRegistry } from '../harness-registry/harness-registry.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'

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
 * Every field that could carry a credential is reduced before it leaves this module, the same
 * discipline `mcp-secrets.ts` documents for `doctor`'s own findings: `command` is trimmed to its
 * basename, `args` drops any `--flag=value` pair `nonSecretArgs` flags, and `url` is trimmed to its
 * origin and path. `env` and `headers` are not returned at all — a name alone does not say whether
 * the value behind it is a literal or a reference, and the safe answer is not to carry the map.
 */

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
	scope: HarnessScopeName
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
}

export type ListMcpServersOptions = {
	/** The project directory to read project-scope configuration from. */
	projectDir: string
	/** Overrides `os.homedir()`, for a test that must not touch the real one. */
	homeDir?: string
	/** Overrides `process.env`, for a test — read only for `CODEX_HOME` and `COPILOT_HOME`. */
	env?: Readonly<Record<string, string | undefined>>
}

function toEntry(
	harness: HarnessName,
	scope: HarnessScopeName,
	file: string,
	name: string,
	server: McpServer,
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
	}
}

function entriesFrom(harness: HarnessName, scope: HarnessScopeName, file: string, config: McpConfig): McpServerEntry[] {
	const parsed = parseTarget(config, read(file))
	if (parsed.kind !== 'servers') return []
	return [...parsed.servers].map(([name, server]) => toEntry(harness, scope, file, name, server))
}

/**
 * Every MCP server configured for a project, across every supported harness and every scope that
 * harness documents — without ever surfacing a credential.
 *
 * Reuses `diagnoseMcp`'s own parsing (`parseTarget`), model (`McpServer`), and redaction
 * (`nonSecretArgs`, and the URL/command trimming this module adds) rather than re-reading or
 * re-parsing any of the supported harnesses' MCP files. A harness with no file present, or one whose
 * file does not parse, contributes no entries; this function reports an inventory, not a diagnosis,
 * so it has nothing to say about why a file is missing or broken.
 */
export function listMcpServers(options: ListMcpServersOptions): McpServerEntry[] {
	const home = options.homeDir ?? homedir()
	const env = options.env ?? process.env
	const entries: McpServerEntry[] = []

	for (const harness of harnessRegistry) {
		if (harness.deprecated) continue

		const project = harness.project.mcpConfig
		if (project) entries.push(...entriesFrom(harness.name, 'project', join(options.projectDir, project.path), project))

		const user = userScopeConfig(harness.name, home, env)
		if (user) entries.push(...entriesFrom(harness.name, 'user', user.file, user.config))
	}

	return entries
}
