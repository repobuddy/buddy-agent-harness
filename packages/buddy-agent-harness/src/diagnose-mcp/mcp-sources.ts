import { parse as parseToml } from 'smol-toml'
import { parseJsonWithComments } from '../diagnose-bridges/json-with-comments.ts'
import type { Position } from '../diagnose-bridges/locator.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { isRecord } from '../is-record/is-record.ts'
import type { McpServer, McpTransport } from './mcp-model.ts'

/** Where the golden set lives, and why it is namespaced rather than sitting at `.agents/mcp.json`. */
export const goldenSetPath = '.agents/buddy-agent-harness/mcp.toml'

const goldenKey = 'servers'

export type ParsedServers =
	/** The file is absent. Nothing to compare, and not a fault. */
	| { kind: 'absent' }
	| { kind: 'servers'; servers: Map<string, McpServer> }
	| { kind: 'unreadable'; position?: Position | undefined }

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

function serversUnder(document: unknown, key: string): Map<string, McpServer> {
	const table = isRecord(document) ? document[key] : undefined
	if (!isRecord(table)) return new Map()
	return new Map(
		Object.entries(table)
			.filter(([, entry]) => isRecord(entry))
			.map(([name, entry]) => [name, serverFrom(entry as Record<string, unknown>)]),
	)
}

/**
 * Only line and column — never `message` or `codeblock`, which quote the source line and could echo
 * a credential.
 */
export function positionOf(error: unknown): Position | undefined {
	if (!isRecord(error)) return undefined
	const { line, column } = error
	return typeof line === 'number' && typeof column === 'number' ? { line, column } : undefined
}

/** The golden set, parsed. Absent is the common case and is not a fault. */
export function parseGoldenSet(source: string | undefined): ParsedServers {
	if (source === undefined) return { kind: 'absent' }
	try {
		return { kind: 'servers', servers: serversUnder(parseToml(source), goldenKey) }
	} catch (error) {
		return { kind: 'unreadable', position: positionOf(error) }
	}
}

/**
 * One harness's config, parsed under its own key only — `.gemini/settings.json` also carries the
 * instruction bridge. JSON is parsed with comments stripped, matching Gemini CLI's own loader.
 */
export function parseTarget(config: McpConfig, source: string | undefined): ParsedServers {
	if (source === undefined) return { kind: 'absent' }
	if (config.format === 'toml') {
		try {
			return { kind: 'servers', servers: serversUnder(parseToml(source), config.key) }
		} catch {
			return { kind: 'unreadable' }
		}
	}
	const document = parseJsonWithComments(source)
	// A literal `null` parses successfully and holds no servers — reported the same as `{}`, not as
	// unreadable.
	if (document === undefined) return { kind: 'unreadable' }
	return { kind: 'servers', servers: serversUnder(document, config.key) }
}
