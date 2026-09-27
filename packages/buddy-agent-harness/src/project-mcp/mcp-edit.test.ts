import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { appendServer, createFile, renderEntry, replaceServer } from './mcp-edit.ts'

const jsonConfig: McpConfig = { path: '.cursor/mcp.json', key: 'mcpServers', format: 'json', dialect: 'cursor' }
const tomlConfig: McpConfig = { path: '.codex/config.toml', key: 'mcp_servers', format: 'toml', dialect: 'codex' }

describe('createFile', () => {
	it('creates a JSON file holding the server under the key', () => {
		const text = createFile(jsonConfig, 'linear', { command: 'npx' })

		expect(JSON.parse(text)).toEqual({ mcpServers: { linear: { command: 'npx' } } })
		expect(text.endsWith('\n')).toBe(true)
	})

	it('creates a TOML file holding the server under the key', () => {
		const text = createFile(tomlConfig, 'linear', { command: 'npx' })

		expect(parseToml(text)).toEqual({ mcp_servers: { linear: { command: 'npx' } } })
	})
})

describe('appendServer', () => {
	it('inserts a server after the last one in an existing table, keeping every other byte', () => {
		const source = '{\n  // note\n  "mcpServers": {\n    "a": { "command": "npx" } // comment\n  }\n}'

		const next = appendServer(jsonConfig, source, 'b', { command: 'bunx' })

		const before = source.slice(0, source.indexOf('"npx" }') + '"npx" }'.length)
		expect(next).toBeDefined()
		expect(next?.startsWith(before)).toBe(true)
		expect((next as string).endsWith('// comment\n  }\n}')).toBe(true)
		expect(JSON.parse((next as string).replace('// note', '').replace('// comment', ''))).toEqual({
			mcpServers: { a: { command: 'npx' }, b: { command: 'bunx' } },
		})
	})

	it('inserts the first server into an empty table', () => {
		const source = '{\n  "mcpServers": {}\n}'

		const next = appendServer(jsonConfig, source, 'a', { command: 'npx' })

		expect(JSON.parse(next as string)).toEqual({ mcpServers: { a: { command: 'npx' } } })
	})

	it('adds the key to a document that has none yet', () => {
		const source = '{\n  "context": { "fileName": ["AGENTS.md"] }\n}'

		const next = appendServer(jsonConfig, source, 'a', { command: 'npx' })

		expect(JSON.parse(next as string)).toEqual({
			context: { fileName: ['AGENTS.md'] },
			mcpServers: { a: { command: 'npx' } },
		})
	})

	it('falls back to a two-space indent for a document with none of its own', () => {
		const next = appendServer(jsonConfig, '{}', 'a', { command: 'npx' })

		expect(next).toContain('  "mcpServers": {\n    "a"')
	})

	it('returns undefined for a root that is not an object', () => {
		expect(appendServer(jsonConfig, '[]', 'a', { command: 'npx' })).toBeUndefined()
	})

	it('returns undefined when the key already exists but is not an object', () => {
		expect(appendServer(jsonConfig, '{ "mcpServers": "nope" }', 'a', { command: 'npx' })).toBeUndefined()
	})

	it('appends a TOML table without touching a byte of what came before', () => {
		const source = '# a comment\nmodel = "gpt"\n'

		const next = appendServer(tomlConfig, source, 'linear', { command: 'npx' }) as string

		expect(next.startsWith(source)).toBe(true)
		expect(parseToml(next)).toEqual({ model: 'gpt', mcp_servers: { linear: { command: 'npx' } } })
	})

	it('appends a TOML table to a source with no trailing newline', () => {
		const source = 'model = "gpt"'

		const next = appendServer(tomlConfig, source, 'linear', { command: 'npx' }) as string

		expect(next.startsWith(source)).toBe(true)
		expect(parseToml(next)).toEqual({ model: 'gpt', mcp_servers: { linear: { command: 'npx' } } })
	})

	it('appends a TOML table to an empty source', () => {
		const next = appendServer(tomlConfig, '', 'linear', { command: 'npx' }) as string

		expect(parseToml(next)).toEqual({ mcp_servers: { linear: { command: 'npx' } } })
	})
})

describe('replaceServer', () => {
	it('replaces the entry in place, keeping every other byte', () => {
		const source = '{\n  "mcpServers": {\n    "a": { "command": "npx" },\n    "b": { "command": "bunx" }\n  }\n}'

		const next = replaceServer(jsonConfig, source, 'a', { command: 'pnpx' })

		expect(JSON.parse(next as string)).toEqual({
			mcpServers: { a: { command: 'pnpx' }, b: { command: 'bunx' } },
		})
		expect((next as string).endsWith('"b": { "command": "bunx" }\n  }\n}')).toBe(true)
	})

	it('returns undefined when the server is not carried', () => {
		const source = '{ "mcpServers": { "a": { "command": "npx" } } }'

		expect(replaceServer(jsonConfig, source, 'missing', { command: 'pnpx' })).toBeUndefined()
	})

	it('returns undefined when the entry holds a comment the replacement would drop', () => {
		const source = '{ "mcpServers": { "a": { "command": "npx" /* keep */ } } }'

		expect(replaceServer(jsonConfig, source, 'a', { command: 'pnpx' })).toBeUndefined()
	})
})

describe('renderEntry', () => {
	it('renders a JSON entry the way the target would read it', () => {
		expect(renderEntry(jsonConfig, 'a', { command: 'npx' })).toBe(JSON.stringify({ a: { command: 'npx' } }, null, 2))
	})

	it('renders a TOML entry the way the target would read it', () => {
		expect(parseToml(renderEntry(tomlConfig, 'a', { command: 'npx' }))).toEqual({
			mcp_servers: { a: { command: 'npx' } },
		})
	})
})
