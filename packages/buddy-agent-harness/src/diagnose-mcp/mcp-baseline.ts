import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { parseJsonWithComments } from '../diagnose-bridges/json-with-comments.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { type McpField, type McpServer, sameField } from './mcp-model.ts'
import { goldenSetPath, parseGoldenSet, parseTarget } from './mcp-sources.ts'

/** Which side of a diverged server moved since the two last agreed. */
export type McpDirection = 'target' | 'golden' | 'both' | 'unknown'

/** Where the record of what was last written to each target lives, beside the golden set it came from. */
export const projectionRecordPath = '.agents/buddy-agent-harness/mcp.projected.json'

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The last-projected record: per target path, per server name, the model that was written there.
 *
 * It exists because git can only answer for a file it can see. Harnesses write their MCP
 * configuration themselves, at user scope, into files that are often untracked or ignored outright,
 * and for those "which side moved since they last agreed" has no answer in history. A record
 * written at projection time has one, exactly, because it *is* what was projected.
 *
 * A malformed record answers nothing rather than throwing. It is a cache of an answer, not the
 * answer, and a diagnosis that dies because its cache is corrupt is worse than one that says
 * `unknown`.
 */
export function parseProjectionRecord(source: string | undefined): Map<string, Map<string, McpServer>> {
	const document = source === undefined ? undefined : parseJsonWithComments(source)
	const targets = isRecord(document) ? document['targets'] : undefined
	if (!isRecord(targets)) return new Map()
	return new Map(
		Object.entries(targets)
			.filter(([, servers]) => isRecord(servers))
			.map(([path, servers]) => [
				path,
				new Map(
					Object.entries(servers as Record<string, unknown>)
						.filter(([, server]) => isRecord(server))
						.map(([name, server]) => [name, server as McpServer]),
				),
			]),
	)
}

export type BaselineOptions = {
	git: GitBridgeState
	record: Map<string, Map<string, McpServer>>
}

/**
 * Which side moved, for one server and one field.
 *
 * The record is asked first, because it records exactly what was written and therefore answers
 * exactly. Where it holds nothing, a **tracked** target falls back to git: the newest commit where
 * the golden set and the target agreed on that field, then which working tree still matches it.
 * Where neither can answer, the direction is `unknown` and the finding says so — naming a side on a
 * guess would send a reconcile at the wrong file.
 */
export class McpBaseline {
	constructor(private readonly options: BaselineOptions) {}

	directionOf(config: McpConfig, name: string, field: McpField, golden: McpServer, target: McpServer): McpDirection {
		const base = this.baseFor(config, name, field)
		if (base === undefined) return 'unknown'
		const goldenMoved = !sameField(field, golden, base)
		const targetMoved = !sameField(field, target, base)
		if (goldenMoved && targetMoved) return 'both'
		return targetMoved ? 'target' : 'golden'
	}

	private baseFor(config: McpConfig, name: string, field: McpField): McpServer | undefined {
		const recorded = this.options.record.get(config.path)?.get(name)
		if (recorded) return recorded
		return this.lastAgreed(config, name, field)
	}

	/**
	 * The newest committed state where both files described this field the same way. Read at model
	 * granularity rather than by comparing blobs: the two files never share bytes, and a commit that
	 * reformatted one of them did not change what it says.
	 */
	private lastAgreed(config: McpConfig, name: string, field: McpField): McpServer | undefined {
		for (const commit of this.options.git.commitsTouching([goldenSetPath, config.path])) {
			const golden = parseGoldenSet(this.options.git.contentAt(commit, goldenSetPath))
			const target = parseTarget(config, this.options.git.contentAt(commit, config.path))
			if (golden.kind !== 'servers' || target.kind !== 'servers') continue
			const left = golden.servers.get(name)
			const right = target.servers.get(name)
			if (left && right && sameField(field, left, right)) return left
		}
		return undefined
	}
}
