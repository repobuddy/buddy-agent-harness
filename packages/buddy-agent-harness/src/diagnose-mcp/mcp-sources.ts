import { parse as parseToml } from 'smol-toml'
import { parseJsonWithComments } from '../diagnose-bridges/json-with-comments.ts'
import type { Position } from '../diagnose-bridges/locator.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { isRecord } from '../is-record/is-record.ts'
import type { McpServer, McpTransport } from './mcp-model.ts'

/** Where the golden set lives, and why it is namespaced rather than sitting at `.agents/mcp.json`. */
export const goldenSetPath = '.agents/buddy-agent-harness/mcp.toml'

/** The table the golden set keeps its servers under. */
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
 * The transport a host entry describes. Hosts spell it `type` (Claude Code, VS Code) or
 * `transport`, and several state it nowhere and leave it implied by which of `url` and `command`
 * is present. Inferring it is what lets a `url` entry in one file compare equal to a `type: http`
 * entry in another.
 */
function transportOf(entry: Record<string, unknown>): McpTransport | undefined {
	const declared = entry['type'] ?? entry['transport']
	if (typeof declared === 'string' && transports.has(declared)) return declared as McpTransport
	if (typeof entry['url'] === 'string') return 'http'
	if (typeof entry['command'] === 'string') return 'stdio'
	return undefined
}

/**
 * One host entry, or one golden entry, in the canonical model. The two formats carry the same
 * field names — the divergence between hosts is the file, the top-level key, and the serialization,
 * not the entry — so one reader serves both directions of the comparison.
 *
 * A field whose value is the wrong type is dropped rather than carried through. A `timeout` that
 * is a string is not a timeout, and letting it into the model would report a divergence whose real
 * cause is a typo the finding does not name.
 */
function serverFrom(entry: Record<string, unknown>): McpServer {
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
 * The position out of a thrown parse error, and nothing else out of it.
 *
 * `smol-toml` reports `line` and `column` on the error alongside a `codeblock` quoting the source,
 * and its `message` embeds that same code block. Both are unusable: in a file of MCP configuration
 * the line a parser failed on is exactly the line holding the credential. Only the two numbers are
 * read, and anything thrown that does not carry them is reported without a position rather than by
 * reaching for its message.
 *
 * Exported because that restriction is the point of the function rather than an implementation
 * detail of it, and it is verified directly.
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
 * One harness's MCP configuration, parsed. The file is read for its own key and nothing else:
 * `.gemini/settings.json` also carries the instruction bridge, and a reader that treated the whole
 * file as MCP would report the rest of a user's settings as servers it does not recognize.
 *
 * JSON is parsed with comments stripped, because Gemini CLI's loader strips them too and a
 * settings file may legally carry them.
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
	// `parseJsonWithComments` answers `undefined` for a file that does not parse. A file whose
	// literal content is `null` parses and holds no servers, which reads the same here and is
	// reported the same way it would be for `{}`.
	if (document === undefined) return { kind: 'unreadable' }
	return { kind: 'servers', servers: serversUnder(document, config.key) }
}
