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

export function divergingFields(golden: McpServer, target: McpServer): McpField[] {
	return mcpFields.filter((field) => {
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
