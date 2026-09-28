import { type McpField, type McpServer, serverFrom } from '../diagnose-mcp/mcp-model.ts'
import { isRecord } from '../is-record/is-record.ts'

export type McpDialectName = 'claude-code' | 'cursor' | 'codex' | 'gemini-cli'

export type McpRendering =
	| { kind: 'entry'; entry: Record<string, unknown> }
	| { kind: 'refused'; field: McpField; reason: string }

/**
 * One harness's MCP entry shape, both ways, per `.research/mcp-canonical-location/` E-MCP-12 to
 * E-MCP-16. `write` and `read` are a pair: whatever `write` emits, `read` returns the same model
 * over `fields`.
 */
export type McpDialect = {
	/** The golden fields this harness has a place for; the rest are dropped on write and never compared. */
	fields: ReadonlySet<McpField>
	/** Values the harness documents as its own default: present in its file, they may be the harness's, not the user's. */
	defaults?: Partial<McpServer>
	read(entry: Record<string, unknown>): McpServer
	write(server: McpServer): McpRendering
}

/** `${NAME}` — the golden set's one reference form, translated per target. */
const plainReference = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/
/** Any reference form a harness might expand, plain or not. */
const anyReference = /\$\{[^}]*\}|\$[A-Za-z_]/

class Refusal extends Error {
	constructor(
		readonly field: McpField,
		readonly reason: string,
	) {
		super(reason)
	}
}

function refuse(field: McpField, reason: string): never {
	throw new Refusal(field, reason)
}

function rendering(render: () => Record<string, unknown>): McpRendering {
	try {
		return { kind: 'entry', entry: render() }
	} catch (error) {
		if (!(error instanceof Refusal)) throw error
		return { kind: 'refused', field: error.field, reason: error.reason }
	}
}

/** Either a runnable command or an address — a server with neither has nothing to write. */
function assertRunnable(server: McpServer): void {
	if (server.transport === 'stdio' ? !server.command : !server.url)
		refuse(
			server.transport === 'stdio' ? 'command' : 'url',
			'the golden set leaves it unset and the target requires it',
		)
}

function defined(entry: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined))
}

function mapValues(
	values: Readonly<Record<string, string>> | undefined,
	map: (value: string) => string,
): Record<string, string> | undefined {
	return values && Object.fromEntries(Object.entries(values).map(([key, value]) => [key, map(value)]))
}

/** The fields that run a server, restricted to a target that expands no reference in them. */
function noReferenceIn(server: McpServer, fields: readonly ('command' | 'args' | 'url')[], harness: string): void {
	for (const field of fields) {
		const value = server[field]
		const values = Array.isArray(value) ? value : [value]
		if (values.some((item) => typeof item === 'string' && anyReference.test(item)))
			refuse(field, `${harness} documents no reference expansion here`)
	}
}

const claudeCode: McpDialect = {
	fields: new Set(['transport', 'command', 'args', 'env', 'url', 'headers', 'description', 'timeout']),
	read: serverFrom,
	write: (server) =>
		rendering(() => {
			assertRunnable(server)
			return defined({
				type: server.transport,
				command: server.command,
				args: server.args,
				env: server.env,
				url: server.url,
				headers: server.headers,
				description: server.description,
				timeout: server.timeout,
			})
		}),
}

/** Cursor spells a reference `${env:NAME}` and has no default form (E-MCP-13). */
function toCursor(value: string, field: McpField): string {
	return value.replace(/\$\{([^}]*)\}|\$[A-Za-z_]/g, (match, name: string | undefined) => {
		if (name === undefined || !plainReference.test(match))
			refuse(field, 'Cursor expands only a plain variable reference, with no default')
		return `\${env:${name}}`
	})
}

function fromCursor(value: string): string {
	return value.replace(/\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name: string) => `\${${name}}`)
}

function fromCursorEntry(entry: Record<string, unknown>): Record<string, unknown> {
	const strings = (value: unknown) => (typeof value === 'string' ? fromCursor(value) : value)
	const map = (value: unknown) =>
		isRecord(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, strings(item)])) : value
	return {
		...entry,
		command: strings(entry['command']),
		args: Array.isArray(entry['args']) ? entry['args'].map(strings) : entry['args'],
		env: map(entry['env']),
		url: strings(entry['url']),
		headers: map(entry['headers']),
	}
}

/**
 * Cursor documents `type: "stdio"` and no field choosing between SSE and streamable HTTP (E-MCP-13),
 * so a remote server's transport is not a field it holds.
 */
const cursor: McpDialect = {
	fields: new Set(['command', 'args', 'env', 'url', 'headers']),
	read: (entry) => serverFrom(fromCursorEntry(entry)),
	write: (server) =>
		rendering(() => {
			assertRunnable(server)
			const stdio = server.transport === 'stdio'
			return defined({
				type: stdio ? 'stdio' : undefined,
				command: server.command && toCursor(server.command, 'command'),
				args: server.args?.map((arg) => toCursor(arg, 'args')),
				env: mapValues(server.env, (value) => toCursor(value, 'env')),
				url: server.url && toCursor(server.url, 'url'),
				headers: mapValues(server.headers, (value) => toCursor(value, 'headers')),
			})
		}),
}

const bearer = /^Bearer \$\{([A-Za-z_][A-Za-z0-9_]*)\}$/

/**
 * Codex expands no reference in a string and reaches the environment only through named fields
 * (E-MCP-14): `env_vars` passes a variable through under its own name, `env_http_headers` and
 * `bearer_token_env_var` fill a header from one.
 */
function codexEnv(env: Readonly<Record<string, string>> | undefined): Record<string, unknown> {
	const literal: Record<string, string> = {}
	const passed: string[] = []
	for (const [key, value] of Object.entries(env ?? {})) {
		const name = plainReference.exec(value)?.[1]
		if (name === key) passed.push(key)
		else if (anyReference.test(value)) refuse('env', 'Codex passes a variable through only under its own name')
		else literal[key] = value
	}
	return defined({
		env: Object.keys(literal).length ? literal : undefined,
		env_vars: passed.length ? passed : undefined,
	})
}

function codexHeaders(headers: Readonly<Record<string, string>> | undefined): Record<string, unknown> {
	const literal: Record<string, string> = {}
	const fromEnv: Record<string, string> = {}
	let token: string | undefined
	for (const [key, value] of Object.entries(headers ?? {})) {
		const name = plainReference.exec(value)?.[1]
		const bearerName = bearer.exec(value)?.[1]
		if (bearerName && key === 'Authorization') token = bearerName
		else if (name) fromEnv[key] = name
		else if (anyReference.test(value))
			refuse('headers', 'Codex fills a header only from a whole variable reference, or Bearer and one')
		else literal[key] = value
	}
	return defined({
		http_headers: Object.keys(literal).length ? literal : undefined,
		env_http_headers: Object.keys(fromEnv).length ? fromEnv : undefined,
		bearer_token_env_var: token,
	})
}

function stringRecord(value: unknown): Record<string, string> {
	if (!isRecord(value)) return {}
	return Object.fromEntries(Object.entries(value).filter(([, item]) => typeof item === 'string')) as Record<
		string,
		string
	>
}

function fromCodex(entry: Record<string, unknown>): Record<string, unknown> {
	const passed = Array.isArray(entry['env_vars']) ? entry['env_vars'].filter((name) => typeof name === 'string') : []
	const env = { ...stringRecord(entry['env']), ...Object.fromEntries(passed.map((name) => [name, `\${${name}}`])) }
	const token = entry['bearer_token_env_var']
	const headers = {
		...stringRecord(entry['http_headers']),
		...Object.fromEntries(
			Object.entries(stringRecord(entry['env_http_headers'])).map(([key, name]) => [key, `\${${name}}`]),
		),
		...(typeof token === 'string' ? { Authorization: `Bearer \${${token}}` } : {}),
	}
	const seconds = entry['tool_timeout_sec']
	return {
		command: entry['command'],
		args: entry['args'],
		env,
		url: entry['url'],
		headers,
		enabled: entry['enabled'],
		timeout: typeof seconds === 'number' ? Math.round(seconds * 1000) : undefined,
	}
}

const codex: McpDialect = {
	fields: new Set(['transport', 'command', 'args', 'env', 'url', 'headers', 'enabled', 'timeout']),
	defaults: { timeout: 60_000 },
	read: (entry) => serverFrom(fromCodex(entry)),
	write: (server) =>
		rendering(() => {
			if (server.transport === 'sse') refuse('transport', 'Codex supports no SSE transport')
			assertRunnable(server)
			noReferenceIn(server, ['command', 'args', 'url'], 'Codex')
			return defined({
				command: server.command,
				args: server.args,
				...codexEnv(server.env),
				url: server.url,
				...codexHeaders(server.headers),
				enabled: server.enabled,
				tool_timeout_sec: server.timeout === undefined ? undefined : server.timeout / 1000,
			})
		}),
}

/**
 * Gemini CLI splits the two remote transports into two fields (E-MCP-15), and expands `${NAME}` and
 * `${NAME:-default}` in every string of its settings file (E-MCP-18), so a reference passes through.
 */
function fromGemini(entry: Record<string, unknown>): Record<string, unknown> {
	const { httpUrl, url, ...rest } = entry
	if (typeof httpUrl === 'string') return { ...rest, type: 'http', url: httpUrl }
	return typeof url === 'string' ? { ...rest, type: 'sse', url } : rest
}

const geminiCli: McpDialect = {
	fields: new Set(['transport', 'command', 'args', 'env', 'url', 'headers', 'timeout']),
	defaults: { timeout: 600_000 },
	read: (entry) => serverFrom(fromGemini(entry)),
	write: (server) =>
		rendering(() => {
			assertRunnable(server)
			return defined({
				command: server.command,
				args: server.args,
				env: server.env,
				url: server.transport === 'sse' ? server.url : undefined,
				httpUrl: server.transport === 'http' ? server.url : undefined,
				headers: server.headers,
				timeout: server.timeout,
			})
		}),
}

export const mcpDialects: Record<McpDialectName, McpDialect> = {
	'claude-code': claudeCode,
	cursor,
	codex,
	'gemini-cli': geminiCli,
}
