import { isRecord } from '../is-record/is-record.ts'
export type McpTransport = 'stdio' | 'http' | 'sse'

/** A superset of every host's fields (E-MCP-05): carry what the user wrote, never invent a value. */
export type McpServer = {
	transport?: McpTransport
	command?: string
	args?: readonly string[]
	env?: Readonly<Record<string, string>>
	url?: string
	headers?: Readonly<Record<string, string>>
	description?: string
	enabled?: boolean
	timeout?: number
	source?: string
}

/** Every field of the model, in the order a finding reports them. */
export const mcpFields = [
	'transport',
	'command',
	'args',
	'env',
	'url',
	'headers',
	'description',
	'enabled',
	'timeout',
	'source',
] as const

export type McpField = (typeof mcpFields)[number]

/** The two fields holding one value per name rather than a single value. */
const mapFields = new Set<McpField>(['env', 'headers'])

/** Arrays compare ordered (`args` is a command line); maps compare by sorted entries. */
function sameValue(field: McpField, left: unknown, right: unknown): boolean {
	if (mapFields.has(field) && isRecord(left) && isRecord(right)) {
		const keys = Object.keys(left)
		return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key])
	}
	return JSON.stringify(left) === JSON.stringify(right)
}

/** Only over `fields`: a golden field the target has no place for is dropped on write, not drift. */
export function divergingFields(
	golden: McpServer,
	target: McpServer,
	fields: ReadonlySet<McpField> = new Set(mcpFields),
): McpField[] {
	return mcpFields.filter((field) => {
		if (!fields.has(field)) return false
		const declared = golden[field]
		if (declared === undefined) return false
		if (mapFields.has(field) && isRecord(declared) && isRecord(target[field])) {
			const observed = target[field] as Record<string, unknown>
			return Object.keys(declared).some((key) => declared[key] !== observed[key])
		}
		return !sameValue(field, declared, target[field])
	})
}

/** Whether one field of two models agrees, for naming the side that moved. */
export function sameField(field: McpField, left: McpServer | undefined, right: McpServer | undefined): boolean {
	return sameValue(field, left?.[field], right?.[field])
}

function stringMap(value: unknown): Record<string, string> | undefined {
	if (!isRecord(value)) return undefined
	const entries = Object.entries(value).filter(([, item]) => typeof item === 'string') as [string, string][]
	return entries.length ? Object.fromEntries(entries) : undefined
}

const transports = new Set<string>(['stdio', 'http', 'sse'])

/**
 * Infers transport when unstated (`url` → `http`, `command` → `stdio`), so a `url` entry in one
 * file compares equal to a `type: http` entry in another.
 */
function transportOf(entry: Record<string, unknown>): McpTransport | undefined {
	const declared = entry['type'] ?? entry['transport']
	if (typeof declared === 'string' && transports.has(declared)) return declared as McpTransport
	if (typeof entry['url'] === 'string') return 'http'
	if (typeof entry['command'] === 'string') return 'stdio'
	return undefined
}

/**
 * One host or golden entry, converted into the shared model; a field of the wrong type is dropped
 * rather than carried through, so a `timeout` that is a string does not report as a divergence.
 * Also used by `mcp-inventory.ts`, which normalizes its own raw shapes into these same fields
 * first.
 */
export function serverFrom(entry: Record<string, unknown>): McpServer {
	const args = Array.isArray(entry['args']) && entry['args'].every((item) => typeof item === 'string')
	const transport = transportOf(entry)
	const env = stringMap(entry['env'])
	const headers = stringMap(entry['headers'])
	return {
		...(transport ? { transport } : {}),
		...(typeof entry['command'] === 'string' ? { command: entry['command'] } : {}),
		...(args ? { args: entry['args'] as string[] } : {}),
		...(env ? { env } : {}),
		...(typeof entry['url'] === 'string' ? { url: entry['url'] } : {}),
		...(headers ? { headers } : {}),
		...(typeof entry['description'] === 'string' ? { description: entry['description'] } : {}),
		...(typeof entry['enabled'] === 'boolean' ? { enabled: entry['enabled'] } : {}),
		...(typeof entry['timeout'] === 'number' ? { timeout: entry['timeout'] } : {}),
		...(typeof entry['source'] === 'string' ? { source: entry['source'] } : {}),
	}
}
