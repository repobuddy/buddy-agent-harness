/**
 * The shape both sides of an MCP comparison are normalized into.
 *
 * No two MCP configuration files are ever byte-equal — the supported harnesses spread the same
 * servers across six config keys and three serialization formats — so comparison cannot be a
 * diff. Each side is parsed into this model and the models are compared.
 *
 * The field list is a **superset** of what the hosts accept, which is the whole premise of a
 * golden set: `description`, `enabled`, and `timeout` are Goose's, `source` is Zed's, and a
 * converter writing into either has to supply them. Supplying a value the user wrote is
 * transcription; supplying one they did not is invention, and `init` invents nothing. See
 * `.research/agentic-configuration-standards/` (E-MCP-05) for what each host makes up today.
 */
export type McpTransport = 'stdio' | 'http' | 'sse'

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Whether two values of the same field agree. Arrays are ordered — `args` is a command line, and
 * reordering it changes what runs. Maps are not, so they are compared by their sorted entries.
 */
function sameValue(field: McpField, left: unknown, right: unknown): boolean {
	if (mapFields.has(field) && isRecord(left) && isRecord(right)) {
		const keys = Object.keys(left)
		return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key])
	}
	return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * The fields on which a target disagrees with the golden set.
 *
 * Asymmetric by design, and this is the rule that keeps a golden set from accumulating noise. A
 * field the golden set leaves unset is never a difference, however the target fills it: a host
 * restating its own default and a user's deliberate edit are indistinguishable in that position,
 * and pulling both back would grow the golden set on every round-trip. The golden set speaks only
 * about what it says.
 *
 * `env` and `headers` are compared per name for the same reason — a variable only the target sets
 * is that target's business, and one the golden set names must match.
 */
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
