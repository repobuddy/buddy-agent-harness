import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { parseJsonWithComments } from '../diagnose-bridges/json-with-comments.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { isRecord } from '../is-record/is-record.ts'
import { type McpField, type McpServer, sameField } from './mcp-model.ts'
import { goldenSetPath, type ParsedServers, parseGoldenSet, parseTarget } from './mcp-sources.ts'

/** Which side of a diverged server moved since the two last agreed. */
export type McpDirection = 'target' | 'golden' | 'both' | 'unknown'

/**
 * Where the record of what was last written to each target lives, beside the golden set it came
 * from.
 */
export const projectionRecordPath = '.agents/buddy-agent-harness/mcp.projected.json'

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

export class McpBaseline {
	constructor(private readonly options: BaselineOptions) {}

	/**
	 * Memoized per instance: unmemoized, `lastAgreed` would repeat the same `git show` and parse
	 * for every diverged field. The memo dies with the instance, so it never answers for a working
	 * tree that has since moved on.
	 */
	private readonly parsed = new Map<string, ParsedServers>()
	private readonly walked = new Map<string, string[]>()

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
	 * Compared at model granularity, not blob bytes — the two files never share bytes, so a
	 * reformat wouldn't register as agreement lost.
	 */
	private lastAgreed(config: McpConfig, name: string, field: McpField): McpServer | undefined {
		for (const commit of this.commitsTouching(config)) {
			const golden = this.parseAt(commit, goldenSetPath, parseGoldenSet)
			const target = this.parseAt(commit, config.path, (source) => parseTarget(config, source))
			if (golden.kind !== 'servers' || target.kind !== 'servers') continue
			const left = golden.servers.get(name)
			const right = target.servers.get(name)
			if (left && right && sameField(field, left, right)) return left
		}
		return undefined
	}

	private commitsTouching(config: McpConfig): string[] {
		const walked = this.walked.get(config.path)
		if (walked) return walked
		const commits = this.options.git.commitsTouching([goldenSetPath, config.path])
		this.walked.set(config.path, commits)
		return commits
	}

	private parseAt(commit: string, path: string, parse: (source: string | undefined) => ParsedServers): ParsedServers {
		const key = `${commit}\u0000${path}`
		const parsed = this.parsed.get(key)
		if (parsed) return parsed
		const result = parse(this.options.git.contentAt(commit, path))
		this.parsed.set(key, result)
		return result
	}
}
