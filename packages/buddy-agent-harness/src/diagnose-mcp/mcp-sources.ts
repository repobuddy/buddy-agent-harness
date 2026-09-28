import { parse as parseToml } from 'smol-toml'
import { parseJsonWithComments } from '../diagnose-bridges/json-with-comments.ts'
import type { Position } from '../diagnose-bridges/locator.ts'
import { selectHarnesses } from '../harness-registry/harness-registry.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { isRecord } from '../is-record/is-record.ts'
import { mcpDialects } from '../mcp-dialects/mcp-dialects.ts'
import { type McpServer, serverFrom } from './mcp-model.ts'

/** Where the golden set lives, and why it is namespaced rather than sitting at `.agents/mcp.json`. */
export const goldenSetPath = '.agents/buddy-agent-harness/mcp.toml'

const goldenKey = 'servers'

/**
 * The distinct MCP files the enabled harnesses read. No `--harness` preference is accepted: every
 * harness documenting an MCP file is already selected without one, so a preference could never add
 * a target.
 */
export function mcpTargets(root: string): McpConfig[] {
	const seen = new Set<string>()
	return selectHarnesses(root, [])
		.map((harness) => harness.project.mcpConfig)
		.filter((config): config is McpConfig => config !== undefined)
		.filter((config) => !seen.has(config.path) && seen.add(config.path))
}

export type ParsedServers =
	/** The file is absent. Nothing to compare, and not a fault. */
	| { kind: 'absent' }
	| { kind: 'servers'; servers: Map<string, McpServer> }
	| { kind: 'unreadable'; position?: Position | undefined }

function serversUnder(
	document: unknown,
	key: string,
	read: (entry: Record<string, unknown>) => McpServer = serverFrom,
): Map<string, McpServer> {
	const table = isRecord(document) ? document[key] : undefined
	if (!isRecord(table)) return new Map()
	return new Map(
		Object.entries(table)
			.filter(([, entry]) => isRecord(entry))
			.map(([name, entry]) => [name, read(entry as Record<string, unknown>)]),
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
			return { kind: 'servers', servers: serversUnder(parseToml(source), config.key, mcpDialects[config.dialect].read) }
		} catch {
			return { kind: 'unreadable' }
		}
	}
	const document = parseJsonWithComments(source)
	// A literal `null` parses successfully and holds no servers — reported the same as `{}`, not as
	// unreadable.
	if (document === undefined) return { kind: 'unreadable' }
	return { kind: 'servers', servers: serversUnder(document, config.key, mcpDialects[config.dialect].read) }
}
