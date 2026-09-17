import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listMcpServers } from './mcp-inventory.ts'

function write(root: string, path: string, body: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), body)
}

function directory(prefix: string): string {
	return mkdtempSync(join(tmpdir(), prefix))
}

describe('listMcpServers', () => {
	it('reads no servers from an empty project and an empty home', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
	})

	it('reads a project-scope server from Claude Code', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(
			projectDir,
			'.mcp.json',
			JSON.stringify({ mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } } }),
		)

		const servers = listMcpServers({ projectDir, homeDir, env: {} })

		expect(servers).toEqual([
			{
				harness: 'claude-code',
				scope: 'project',
				configFile: join(projectDir, '.mcp.json'),
				name: 'linear',
				transport: 'stdio',
				command: 'npx',
				args: ['-y', 'linear-mcp'],
				url: undefined,
				enabled: true,
			},
		])
	})

	it('reads a user-scope server from Claude Code, at the injected home directory', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(homeDir, '.claude.json', JSON.stringify({ mcpServers: { linear: { command: 'npx' } } }))

		const servers = listMcpServers({ projectDir, homeDir, env: {} })

		expect(servers).toEqual([
			expect.objectContaining({ harness: 'claude-code', scope: 'user', configFile: join(homeDir, '.claude.json') }),
		])
	})

	it('reads a user-scope server from Cursor', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(homeDir, '.cursor/mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
			expect.objectContaining({ harness: 'cursor', scope: 'user', configFile: join(homeDir, '.cursor', 'mcp.json') }),
		])
	})

	it('reads a user-scope server from Gemini CLI, sharing its settings file with the instruction bridge', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(
			homeDir,
			'.gemini/settings.json',
			JSON.stringify({ mcpServers: { a: { url: 'https://example.test/mcp' } }, other: 1 }),
		)

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
			expect.objectContaining({
				harness: 'gemini-cli',
				scope: 'user',
				configFile: join(homeDir, '.gemini', 'settings.json'),
			}),
		])
	})

	it('reads Codex user-scope configuration from the default `.codex` directory under home', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(homeDir, '.codex/config.toml', '[mcp_servers.a]\ncommand = "npx"\n')

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
			expect.objectContaining({ harness: 'codex', scope: 'user', configFile: join(homeDir, '.codex', 'config.toml') }),
		])
	})

	it('reads Codex user-scope configuration from `CODEX_HOME` when set, in preference to home', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		const codexHome = directory('buddy-agent-harness-mcp-inv-codex-home-')
		write(codexHome, 'config.toml', '[mcp_servers.a]\ncommand = "npx"\n')

		expect(listMcpServers({ projectDir, homeDir, env: { CODEX_HOME: codexHome } })).toEqual([
			expect.objectContaining({ harness: 'codex', scope: 'user', configFile: join(codexHome, 'config.toml') }),
		])
	})

	it('reads Copilot CLI user-scope configuration from `COPILOT_HOME` when set', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		const copilotHome = directory('buddy-agent-harness-mcp-inv-copilot-home-')
		write(copilotHome, 'mcp-config.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

		expect(listMcpServers({ projectDir, homeDir, env: { COPILOT_HOME: copilotHome } })).toEqual([
			expect.objectContaining({
				harness: 'copilot-cli',
				scope: 'user',
				configFile: join(copilotHome, 'mcp-config.json'),
			}),
		])
	})

	it('reads Copilot CLI user-scope configuration from the default `.copilot` directory under home', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(homeDir, '.copilot/mcp-config.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
			expect.objectContaining({
				harness: 'copilot-cli',
				scope: 'user',
				configFile: join(homeDir, '.copilot', 'mcp-config.json'),
			}),
		])
	})

	it('defaults `homeDir` to the real home directory and `env` to `process.env`', () => {
		// No assertion on content — the real machine's home directory is whatever it is. This only
		// pins that omitting both options does not throw and returns an array.
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')

		expect(Array.isArray(listMcpServers({ projectDir }))).toBe(true)
	})

	it('trims a command to its basename', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(projectDir, '.cursor/mcp.json', JSON.stringify({ mcpServers: { a: { command: '/usr/local/bin/npx' } } }))

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ command: 'npx' })])
	})

	it('trims a URL to its origin and path, dropping the query string', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(
			projectDir,
			'.cursor/mcp.json',
			JSON.stringify({ mcpServers: { a: { url: 'https://example.test/mcp?token=secret' } } }),
		)

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
			expect.objectContaining({ url: 'https://example.test/mcp', transport: 'http' }),
		])
	})

	it('reports no URL for a server whose URL does not parse', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(projectDir, '.cursor/mcp.json', JSON.stringify({ mcpServers: { a: { url: 'not a url', type: 'http' } } }))

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ url: undefined })])
	})

	it('drops a credential-bearing argument', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(
			projectDir,
			'.cursor/mcp.json',
			JSON.stringify({ mcpServers: { a: { command: 'npx', args: ['--token=sk-live-abc123', '-y'] } } }),
		)

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ args: ['-y'] })])
	})

	it('reports a server explicitly disabled', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(projectDir, '.cursor/mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx', enabled: false } } }))

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ enabled: false })])
	})

	it('reports a server enabled by default when the field is absent', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(projectDir, '.cursor/mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ enabled: true })])
	})

	it('contributes no entries for a config file that does not parse', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(projectDir, '.mcp.json', '{ not json')

		expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
	})

	it('never carries an env or headers value into an entry', () => {
		const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
		const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
		write(
			projectDir,
			'.cursor/mcp.json',
			JSON.stringify({
				mcpServers: { a: { command: 'npx', env: { GITHUB_TOKEN: 'sk-live-abc123' } } },
			}),
		)

		const emitted = JSON.stringify(listMcpServers({ projectDir, homeDir, env: {} }))
		expect(emitted).not.toContain('sk-live-abc123')
		expect(emitted).not.toContain('GITHUB_TOKEN')
	})

	describe('VS Code', () => {
		it('reads a project-scope server from .vscode/mcp.json, keyed under servers', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(projectDir, '.vscode/mcp.json', JSON.stringify({ servers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {}, platform: 'linux' })).toEqual([
				expect.objectContaining({
					harness: 'vscode',
					scope: 'project',
					configFile: join(projectDir, '.vscode', 'mcp.json'),
				}),
			])
		})

		it('reads a user-scope server on Linux, from $XDG_CONFIG_HOME/Code/User/mcp.json', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const xdg = directory('buddy-agent-harness-mcp-inv-xdg-')
			write(xdg, 'Code/User/mcp.json', JSON.stringify({ servers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: { XDG_CONFIG_HOME: xdg }, platform: 'linux' })).toEqual([
				expect.objectContaining({
					harness: 'vscode',
					scope: 'user',
					configFile: join(xdg, 'Code', 'User', 'mcp.json'),
				}),
			])
		})

		it('falls back to ~/.config on Linux when $XDG_CONFIG_HOME is unset', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.config/Code/User/mcp.json', JSON.stringify({ servers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {}, platform: 'linux' })).toEqual([
				expect.objectContaining({ harness: 'vscode', scope: 'user' }),
			])
		})

		it('reads a user-scope server on macOS, from Library/Application Support/Code/User/mcp.json', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				homeDir,
				'Library/Application Support/Code/User/mcp.json',
				JSON.stringify({ servers: { a: { command: 'npx' } } }),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {}, platform: 'darwin' })).toEqual([
				expect.objectContaining({ harness: 'vscode', scope: 'user' }),
			])
		})

		it('reads a user-scope server on Windows, from %APPDATA%/Code/User/mcp.json', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const appData = directory('buddy-agent-harness-mcp-inv-appdata-')
			write(appData, 'Code/User/mcp.json', JSON.stringify({ servers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: { APPDATA: appData }, platform: 'win32' })).toEqual([
				expect.objectContaining({ harness: 'vscode', scope: 'user' }),
			])
		})

		it('falls back to <home>/AppData/Roaming on Windows when %APPDATA% is unset', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, 'AppData/Roaming/Code/User/mcp.json', JSON.stringify({ servers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {}, platform: 'win32' })).toEqual([
				expect.objectContaining({ harness: 'vscode', scope: 'user' }),
			])
		})

		it('defaults platform to the real process platform when omitted', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			expect(Array.isArray(listMcpServers({ projectDir }))).toBe(true)
		})
	})

	describe('Windsurf, read under devin-desktop', () => {
		it('reads ~/.codeium/windsurf/mcp_config.json as a devin-desktop user-scope source', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.codeium/windsurf/mcp_config.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({
					harness: 'devin-desktop',
					scope: 'user',
					configFile: join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
				}),
			])
		})

		it('reads a remote server declared with serverUrl instead of url', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				homeDir,
				'.codeium/windsurf/mcp_config.json',
				JSON.stringify({ mcpServers: { a: { serverUrl: 'https://example.test/mcp?token=secret' } } }),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ transport: 'http', url: 'https://example.test/mcp' }),
			])
		})

		it('prefers an explicit url over serverUrl when both are present', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				homeDir,
				'.codeium/windsurf/mcp_config.json',
				JSON.stringify({
					mcpServers: { a: { url: 'https://example.test/primary', serverUrl: 'https://example.test/other' } },
				}),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ url: 'https://example.test/primary' }),
			])
		})
	})

	describe('OpenCode', () => {
		it('reads a project-scope server from opencode.json, keyed under mcp', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(projectDir, 'opencode.json', JSON.stringify({ mcp: { a: { command: ['npx', '-y', 'a-mcp'] } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({
					harness: 'opencode',
					scope: 'project',
					command: 'npx',
					args: ['-y', 'a-mcp'],
				}),
			])
		})

		it('reads a user-scope server from $XDG_CONFIG_HOME/opencode/opencode.json', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const xdg = directory('buddy-agent-harness-mcp-inv-xdg-')
			write(xdg, 'opencode/opencode.json', JSON.stringify({ mcp: { a: { url: 'https://example.test/mcp' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: { XDG_CONFIG_HOME: xdg } })).toEqual([
				expect.objectContaining({ harness: 'opencode', scope: 'user', url: 'https://example.test/mcp' }),
			])
		})

		it('falls back to ~/.config/opencode/opencode.json when $XDG_CONFIG_HOME is unset', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.config/opencode/opencode.json', JSON.stringify({ mcp: { a: { command: ['npx'] } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ harness: 'opencode', scope: 'user' }),
			])
		})

		it("keeps a server's own args when command is an array and args is also set", () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				projectDir,
				'opencode.json',
				JSON.stringify({ mcp: { a: { command: ['npx', '-y', 'ignored'], args: ['explicit'] } } }),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ command: 'npx', args: ['explicit'] }),
			])
		})
	})

	describe('Zed', () => {
		it('reads a project-scope server from .zed/settings.json, keyed under context_servers', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				projectDir,
				'.zed/settings.json',
				JSON.stringify({ context_servers: { a: { command: { path: '/usr/bin/npx', args: ['-y', 'a-mcp'] } } } }),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({
					harness: 'zed',
					scope: 'project',
					command: 'npx',
					args: ['-y', 'a-mcp'],
				}),
			])
		})

		it('reads a JSONC user-scope server from $XDG_CONFIG_HOME/zed/settings.json', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const xdg = directory('buddy-agent-harness-mcp-inv-xdg-')
			write(
				xdg,
				'zed/settings.json',
				'{\n  // a comment Zed tolerates\n  "context_servers": { "a": { "command": { "path": "npx" } } }\n}\n',
			)

			expect(listMcpServers({ projectDir, homeDir, env: { XDG_CONFIG_HOME: xdg } })).toEqual([
				expect.objectContaining({ harness: 'zed', scope: 'user', command: 'npx' }),
			])
		})

		it('falls back to ~/.config/zed/settings.json when $XDG_CONFIG_HOME is unset', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				homeDir,
				'.config/zed/settings.json',
				JSON.stringify({ context_servers: { a: { command: { path: 'npx' } } } }),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ harness: 'zed', scope: 'user' }),
			])
		})

		it("keeps a server's own args when command is an object and args is also set", () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				projectDir,
				'.zed/settings.json',
				JSON.stringify({
					context_servers: { a: { command: { path: 'npx', args: ['ignored'] }, args: ['explicit'] } },
				}),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ command: 'npx', args: ['explicit'] }),
			])
		})
	})

	describe('extra sources, general', () => {
		it('contributes no entries when an extra source file does not parse', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(projectDir, '.vscode/mcp.json', '{ not json')

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('contributes no entries when an extra source parses to something other than an object', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(projectDir, '.vscode/mcp.json', JSON.stringify([]))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})
	})

	describe('Claude Code project-local servers', () => {
		it('reads a server local to this project from ~/.claude.json, scope local', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(
				homeDir,
				'.claude.json',
				JSON.stringify({ projects: { [resolve(projectDir)]: { mcpServers: { a: { command: 'npx' } } } } }),
			)

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ harness: 'claude-code', scope: 'local', configFile: join(homeDir, '.claude.json') }),
			])
		})

		it('contributes no local entries when ~/.claude.json is absent', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('contributes no local entries when ~/.claude.json does not parse', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.claude.json', '{ not json')

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('contributes no local entries when projects has no entry for this project', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.claude.json', JSON.stringify({ projects: { '/some/other/project': { mcpServers: {} } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('contributes no local entries when the projects table itself is absent', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.claude.json', JSON.stringify({ mcpServers: {} }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})
	})

	describe('Claude Code plugin servers', () => {
		function installedPlugins(homeDir: string, plugins: unknown): void {
			write(homeDir, '.claude/plugins/installed_plugins.json', JSON.stringify({ plugins }))
		}

		it('reads a server from an enabled plugin, scope plugin, naming the plugin id', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(homeDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': true } }))
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({
					harness: 'claude-code',
					scope: 'plugin',
					plugin: 'acme/tools',
					configFile: join(pluginDir, '.mcp.json'),
					enabled: true,
				}),
			])
		})

		it('reads servers listed at the top level of a plugin .mcp.json, not under mcpServers', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(homeDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': true } }))
			write(pluginDir, '.mcp.json', JSON.stringify({ a: { command: 'npx' } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ harness: 'claude-code', scope: 'plugin', plugin: 'acme/tools' }),
			])
		})

		it('reports a server disabled when the plugin is not set to true in enabledPlugins', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ enabled: false })])
		})

		it('reports a server disabled when the plugin is enabled but the server declares enabled: false', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(homeDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': true } }))
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx', enabled: false } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ enabled: false })])
		})

		it('lets project-local settings.local.json override project settings.json, which overrides global', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(homeDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': false } }))
			write(projectDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': true } }))
			write(projectDir, '.claude/settings.local.json', JSON.stringify({ enabledPlugins: { 'acme/tools': false } }))
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ enabled: false })])
		})

		it('ignores a non-boolean enabledPlugins value', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(homeDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': 'yes' } }))
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ enabled: false })])
		})

		it('ignores an enabledPlugins settings file that does not parse', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(homeDir, '.claude/settings.json', '{ not json')
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([expect.objectContaining({ enabled: false })])
		})

		it('skips an install whose projectPath names a different project', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const otherProject = directory('buddy-agent-harness-mcp-inv-other-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir, projectPath: otherProject }] })
			write(homeDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': true } }))
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('reads an install whose projectPath names this same project', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir, projectPath: resolve(projectDir) }] })
			write(homeDir, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'acme/tools': true } }))
			write(pluginDir, '.mcp.json', JSON.stringify({ mcpServers: { a: { command: 'npx' } } }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([
				expect.objectContaining({ scope: 'plugin', plugin: 'acme/tools' }),
			])
		})

		it('contributes no plugin entries when installed_plugins.json is absent', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('contributes no plugin entries when installed_plugins.json does not parse', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.claude/plugins/installed_plugins.json', '{ not json')

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('contributes no plugin entries when plugins is missing from installed_plugins.json', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			write(homeDir, '.claude/plugins/installed_plugins.json', JSON.stringify({ other: 1 }))

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('skips a plugin id whose install list is not an array', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			installedPlugins(homeDir, { 'acme/tools': 'not-an-array' })

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('skips an install entry that is not itself a record', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			installedPlugins(homeDir, { 'acme/tools': ['not-a-record'] })

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it('skips an install with no installPath', () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			installedPlugins(homeDir, { 'acme/tools': [{}] })

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it("contributes nothing when the plugin's .mcp.json is absent", () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})

		it("contributes nothing when the plugin's .mcp.json does not parse", () => {
			const projectDir = directory('buddy-agent-harness-mcp-inv-project-')
			const homeDir = directory('buddy-agent-harness-mcp-inv-home-')
			const pluginDir = directory('buddy-agent-harness-mcp-inv-plugin-')
			installedPlugins(homeDir, { 'acme/tools': [{ installPath: pluginDir }] })
			write(pluginDir, '.mcp.json', '{ not json')

			expect(listMcpServers({ projectDir, homeDir, env: {} })).toEqual([])
		})
	})
})
