import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
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
})
