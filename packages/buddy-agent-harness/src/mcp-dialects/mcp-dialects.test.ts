import { describe, expect, it } from 'vitest'
import type { McpServer } from '../diagnose-mcp/mcp-model.ts'
import { mcpDialects } from './mcp-dialects.ts'

/**
 * References are assembled rather than written literally: a `${…}` inside a plain string is what
 * the lint rule for a mistyped template literal looks for, and every one here is deliberate.
 */
const ref = (name: string) => `$\u007b${name}\u007d`
const withDefault = (name: string) => `$\u007b${name}:-x\u007d`
const envRef = (name: string) => `$\u007benv:${name}\u007d`
const bearer = (name: string) => `Bearer ${ref(name)}`

const refused = (rendering: ReturnType<(typeof mcpDialects)['codex']['write']>) => {
	if (rendering.kind !== 'refused') throw new Error('expected a refusal')
	return rendering
}
const entry = (rendering: ReturnType<(typeof mcpDialects)['codex']['write']>) => {
	if (rendering.kind !== 'entry') throw new Error('expected an entry')
	return rendering.entry
}

describe('claude-code dialect', () => {
	const dialect = mcpDialects['claude-code']

	it('writes every field it has a place for', () => {
		const server: McpServer = {
			transport: 'http',
			url: 'https://mcp.example.com',
			description: 'desc',
			timeout: 5000,
			headers: { Authorization: bearer('TOKEN') },
		}

		expect(entry(dialect.write(server))).toEqual({
			type: 'http',
			url: 'https://mcp.example.com',
			description: 'desc',
			timeout: 5000,
			headers: { Authorization: bearer('TOKEN') },
		})
	})

	it('refuses a stdio server with no command', () => {
		expect(refused(dialect.write({ transport: 'stdio' })).field).toBe('command')
	})

	it('refuses a remote server with no url', () => {
		expect(refused(dialect.write({ transport: 'http' })).field).toBe('url')
	})

	it('reads an entry through the shared model', () => {
		expect(dialect.read({ command: 'npx' })).toEqual({ transport: 'stdio', command: 'npx' })
	})
})

describe('cursor dialect', () => {
	const dialect = mcpDialects.cursor

	it('writes a plain reference in command, args, env, headers and url in Cursor syntax', () => {
		const server: McpServer = {
			transport: 'stdio',
			command: ref('CMD'),
			args: [ref('ARG')],
			env: { A: ref('A') },
			headers: { H: ref('H') },
		}

		expect(entry(dialect.write(server))).toEqual({
			type: 'stdio',
			command: envRef('CMD'),
			args: [envRef('ARG')],
			env: { A: envRef('A') },
			headers: { H: envRef('H') },
		})
	})

	it('omits type for a remote server', () => {
		const rendering = entry(dialect.write({ transport: 'http', url: 'https://mcp.example.com' }))

		expect(rendering).not.toHaveProperty('type')
		expect(rendering).toEqual({ url: 'https://mcp.example.com' })
	})

	it('refuses a reference with a default form, naming the field', () => {
		expect(refused(dialect.write({ transport: 'stdio', command: withDefault('CMD') })).field).toBe('command')
	})

	it('refuses a bare $VAR form with no braces', () => {
		expect(refused(dialect.write({ transport: 'stdio', command: '$CMD' })).field).toBe('command')
	})

	it('reads Cursor references back as the golden form, in every field', () => {
		const server = dialect.read({
			command: envRef('CMD'),
			args: [envRef('ARG')],
			env: { A: envRef('A') },
			headers: { H: envRef('H') },
			url: envRef('URL'),
		})

		expect(server).toEqual({
			transport: 'http',
			command: ref('CMD'),
			args: [ref('ARG')],
			env: { A: ref('A') },
			headers: { H: ref('H') },
			url: ref('URL'),
		})
	})

	it('leaves a reference form Cursor does not use untouched on read', () => {
		expect(dialect.read({ command: ref('CMD') })).toEqual({ transport: 'stdio', command: ref('CMD') })
	})
})

describe('codex dialect', () => {
	const dialect = mcpDialects.codex

	it('refuses an SSE transport', () => {
		expect(refused(dialect.write({ transport: 'sse', url: 'https://mcp.example.com' })).field).toBe('transport')
	})

	it('writes a literal env value and a passed-through variable together', () => {
		const rendering = entry(
			dialect.write({ transport: 'stdio', command: 'npx', env: { LITERAL: 'plain', HOME_DIR: ref('HOME_DIR') } }),
		)

		expect(rendering).toMatchObject({ env: { LITERAL: 'plain' }, env_vars: ['HOME_DIR'] })
	})

	it('refuses a variable renamed on the way in', () => {
		expect(refused(dialect.write({ transport: 'stdio', command: 'npx', env: { API: ref('OTHER') } })).field).toBe('env')
	})

	it('writes a literal header, an env-sourced header, and a bearer token together', () => {
		const rendering = entry(
			dialect.write({
				transport: 'stdio',
				command: 'npx',
				headers: { 'X-Plain': 'value', 'X-Key': ref('KEY'), Authorization: bearer('TOKEN') },
			}),
		)

		expect(rendering).toMatchObject({
			http_headers: { 'X-Plain': 'value' },
			env_http_headers: { 'X-Key': 'KEY' },
			bearer_token_env_var: 'TOKEN',
		})
	})

	it('refuses a Bearer-shaped header on a field other than Authorization', () => {
		expect(
			refused(dialect.write({ transport: 'stdio', command: 'npx', headers: { 'X-Other': bearer('TOKEN') } })).field,
		).toBe('headers')
	})

	it('refuses a lowercase authorization header, since Codex reads the token back only under the exact key', () => {
		expect(
			refused(dialect.write({ transport: 'stdio', command: 'npx', headers: { authorization: bearer('TOKEN') } })).field,
		).toBe('headers')
	})

	it('refuses a reference in command, args or url', () => {
		expect(refused(dialect.write({ transport: 'stdio', command: ref('CMD') })).field).toBe('command')
		expect(refused(dialect.write({ transport: 'stdio', command: 'npx', args: [ref('A')] })).field).toBe('args')
	})

	it('refuses a server with nothing to run', () => {
		expect(refused(dialect.write({ transport: 'stdio' })).field).toBe('command')
	})

	it('converts a timeout from milliseconds to seconds', () => {
		expect(entry(dialect.write({ transport: 'stdio', command: 'npx', timeout: 30000 }))).toMatchObject({
			tool_timeout_sec: 30,
		})
	})

	it('reads Codex headers and variables back as references', () => {
		const server = dialect.read({
			command: 'npx',
			env: { LITERAL: 'plain' },
			env_vars: ['HOME_DIR'],
			http_headers: { 'X-Plain': 'value' },
			env_http_headers: { 'X-Key': 'KEY' },
			bearer_token_env_var: 'TOKEN',
			tool_timeout_sec: 30,
		})

		expect(server).toEqual({
			transport: 'stdio',
			command: 'npx',
			env: { LITERAL: 'plain', HOME_DIR: ref('HOME_DIR') },
			headers: { 'X-Plain': 'value', 'X-Key': ref('KEY'), Authorization: bearer('TOKEN') },
			timeout: 30000,
		})
	})

	it('reads no timeout when the field is not a number, and no token when it is not a string', () => {
		expect(dialect.read({ command: 'npx', tool_timeout_sec: 'soon', bearer_token_env_var: 7 })).toEqual({
			transport: 'stdio',
			command: 'npx',
		})
	})

	it('reads no env or headers when neither field is a record', () => {
		expect(dialect.read({ command: 'npx', env: 'nope', http_headers: 'nope' })).toEqual({
			transport: 'stdio',
			command: 'npx',
		})
	})
})

describe('gemini-cli dialect', () => {
	const dialect = mcpDialects['gemini-cli']

	it('writes a streamable HTTP server under httpUrl', () => {
		expect(entry(dialect.write({ transport: 'http', url: 'https://mcp.example.com' }))).toEqual({
			httpUrl: 'https://mcp.example.com',
		})
	})

	it('writes an SSE server under url', () => {
		expect(entry(dialect.write({ transport: 'sse', url: 'https://mcp.example.com' }))).toEqual({
			url: 'https://mcp.example.com',
		})
	})

	it('writes a reference, with or without a default, as written in every field', () => {
		const server: McpServer = {
			transport: 'http',
			url: `https://mcp.example.com/${ref('TENANT')}`,
			headers: { Authorization: bearer('TOKEN'), Region: withDefault('REGION') },
		}
		expect(entry(dialect.write(server))).toEqual({
			httpUrl: server.url,
			headers: server.headers,
		})
		expect(
			entry(
				dialect.write({
					transport: 'stdio',
					command: ref('BIN'),
					args: [ref('ARG')],
					env: { A: withDefault('A') },
				}),
			),
		).toEqual({ command: ref('BIN'), args: [ref('ARG')], env: { A: withDefault('A') } })
	})

	it('refuses a server with nothing to run', () => {
		expect(refused(dialect.write({ transport: 'stdio' })).field).toBe('command')
	})

	it('reads a streamable HTTP entry as http', () => {
		expect(dialect.read({ httpUrl: 'https://mcp.example.com' })).toEqual({
			transport: 'http',
			url: 'https://mcp.example.com',
		})
	})

	it('reads an SSE entry as sse', () => {
		expect(dialect.read({ url: 'https://mcp.example.com' })).toEqual({
			transport: 'sse',
			url: 'https://mcp.example.com',
		})
	})

	it('reads a stdio entry unchanged when neither remote field is set', () => {
		expect(dialect.read({ command: 'npx' })).toEqual({ transport: 'stdio', command: 'npx' })
	})
})

describe('rendering', () => {
	it('rethrows an error the write path raises that is not a refusal', () => {
		// `args` is typed as a string array; a caller that hands in something else at runtime hits
		// `.map` on a non-array rather than a documented refusal, and that error is not swallowed.
		expect(() =>
			mcpDialects.cursor.write({ transport: 'stdio', command: 'npx', args: 'oops' as unknown as string[] }),
		).toThrow(TypeError)
	})
})
