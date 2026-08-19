import { describe, expect, it } from 'vitest'
import { divergingFields, sameField } from './mcp-model.ts'
import { parseGoldenSet, parseTarget } from './mcp-sources.ts'

describe('divergingFields', () => {
	it('names no field when the golden set declares nothing', () => {
		expect(divergingFields({}, { command: 'npx', timeout: 30000 })).toEqual([])
	})

	it('names a field the two disagree on', () => {
		expect(divergingFields({ command: 'npx' }, { command: 'bunx' })).toEqual(['command'])
	})

	it('treats a reordered argument list as a difference, because it changes what runs', () => {
		expect(divergingFields({ args: ['-y', 'linear'] }, { args: ['linear', '-y'] })).toEqual(['args'])
	})

	it('ignores an environment variable only the target sets', () => {
		expect(divergingFields({ env: { A: '1' } }, { env: { A: '1', B: '2' } })).toEqual([])
	})

	it('names an environment variable the two disagree on', () => {
		expect(divergingFields({ env: { A: '1' } }, { env: { A: '2' } })).toEqual(['env'])
	})

	it('names an environment variable the target does not set at all', () => {
		expect(divergingFields({ env: { A: '1' } }, { env: {} })).toEqual(['env'])
	})

	it('names the whole map when the target carries none of it', () => {
		expect(divergingFields({ headers: { Accept: 'text/event-stream' } }, {})).toEqual(['headers'])
	})
})

describe('sameField', () => {
	it('reads two maps as equal however their keys are ordered', () => {
		expect(sameField('env', { env: { A: '1', B: '2' } }, { env: { B: '2', A: '1' } })).toBe(true)
	})

	it('reads maps of different sizes as different', () => {
		expect(sameField('env', { env: { A: '1' } }, { env: { A: '1', B: '2' } })).toBe(false)
	})

	it('reads two absent sides as equal', () => {
		expect(sameField('command', undefined, undefined)).toBe(true)
	})

	it('reads a map against a missing side as different', () => {
		expect(sameField('env', { env: { A: '1' } }, undefined)).toBe(false)
	})
})

describe('parseGoldenSet', () => {
	it('reads no servers from an absent file', () => {
		expect(parseGoldenSet(undefined)).toEqual({ kind: 'absent' })
	})

	it('reads no servers from a file with no servers table', () => {
		const parsed = parseGoldenSet('title = "notes"\n')

		expect(parsed).toMatchObject({ kind: 'servers' })
	})

	it('takes the transport a server declares', () => {
		const parsed = parseGoldenSet('[servers.a]\ntransport = "sse"\nurl = "https://example.test"\n')

		expect(parsed.kind === 'servers' && parsed.servers.get('a')).toMatchObject({ transport: 'sse' })
	})

	it('ignores a transport that names nothing it recognizes', () => {
		const parsed = parseGoldenSet('[servers.a]\ntransport = "carrier-pigeon"\ndescription = "x"\n')

		expect(parsed.kind === 'servers' && parsed.servers.get('a')).toEqual({ description: 'x' })
	})

	it('drops a field whose value is the wrong type', () => {
		const parsed = parseGoldenSet('[servers.a]\ncommand = "npx"\ntimeout = "soon"\nargs = [1, 2]\n')

		expect(parsed.kind === 'servers' && parsed.servers.get('a')).toEqual({ transport: 'stdio', command: 'npx' })
	})

	it('keeps every superset field the golden set fills in', () => {
		const parsed = parseGoldenSet(
			'[servers.a]\nurl = "https://example.test"\ndescription = "d"\nenabled = true\ntimeout = 30000\nsource = "custom"\n',
		)

		expect(parsed.kind === 'servers' && parsed.servers.get('a')).toEqual({
			transport: 'http',
			url: 'https://example.test',
			description: 'd',
			enabled: true,
			timeout: 30000,
			source: 'custom',
		})
	})

	it('reads a map holding no string values as absent rather than empty', () => {
		const parsed = parseGoldenSet('[servers.a]\ncommand = "npx"\n[servers.a.env]\nCOUNT = 3\n')

		expect(parsed.kind === 'servers' && parsed.servers.get('a')).toEqual({ transport: 'stdio', command: 'npx' })
	})

	it('skips a servers entry that is not a table', () => {
		const parsed = parseGoldenSet('[servers]\na = "not a table"\n')

		expect(parsed.kind === 'servers' && parsed.servers.size).toBe(0)
	})
})

describe('parseTarget', () => {
	const json = { path: '.cursor/mcp.json', key: 'mcpServers', format: 'json' } as const

	it('reads no servers from an absent file', () => {
		expect(parseTarget(json, undefined)).toEqual({ kind: 'absent' })
	})

	it('reads a JSON file that carries comments', () => {
		const parsed = parseTarget(json, '{ // servers\n"mcpServers": { "a": { "command": "npx" } } }')

		expect(parsed.kind === 'servers' && parsed.servers.get('a')).toEqual({ transport: 'stdio', command: 'npx' })
	})

	it('takes the transport from the `type` key hosts spell it with', () => {
		const parsed = parseTarget(
			json,
			JSON.stringify({ mcpServers: { a: { type: 'sse', url: 'https://example.test' } } }),
		)

		expect(parsed.kind === 'servers' && parsed.servers.get('a')).toMatchObject({ transport: 'sse' })
	})

	it('reads a document that is not an object as holding no servers', () => {
		expect(parseTarget(json, 'null')).toEqual({ kind: 'servers', servers: new Map() })
	})
})
