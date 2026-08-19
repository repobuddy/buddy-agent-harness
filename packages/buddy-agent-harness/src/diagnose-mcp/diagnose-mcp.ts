import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type McpProblem, repairFor } from '../diagnose-bridges/doctor-guidance.ts'
import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import type { ConfigurationFinding } from '../diagnose-configuration/diagnose-configuration.ts'
import { selectHarnesses } from '../harness-registry/harness-registry.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { McpBaseline, type McpDirection, parseProjectionRecord, projectionRecordPath } from './mcp-baseline.ts'
import { divergingFields, type McpServer } from './mcp-model.ts'
import { credentialFields } from './mcp-secrets.ts'
import { goldenLocator, goldenSetPath, parseGoldenSet, parseTarget } from './mcp-sources.ts'

/**
 * The MCP half of `doctor`: how a repository's **golden MCP server set** and the harness copies of
 * it have drifted apart, and where a literal credential is sitting in either.
 *
 * The golden set is a file the user authors. That is what makes this capability possible at all:
 * `init` reports MCP configuration rather than converting it because converting a config someone
 * wrote for one harness into another's format has to invent values they never wrote, and `init`
 * invents nothing. A set the user authored inverts the premise — a field they filled in is
 * transcription. **No golden set means no drift diagnosis**, and nothing here invents anything
 * either.
 *
 * Read-only, like the rest of `doctor`. Projecting the golden set forward and reconciling a
 * target-side change back into it are writes, and they need an approval-gated home; this module is
 * where that home reads its work from.
 */
export type DiagnoseMcpOptions = {
	root: string
	git: GitBridgeState
	/** How to name this tool in the repair commands. */
	cli: string
}

function read(root: string, path: string): string | undefined {
	const absolute = join(root, path)
	return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}

/**
 * The distinct MCP files the enabled harnesses read. Two harnesses may name the same file.
 *
 * No harness preference is accepted, for the same reason the configuration half accepts none: every
 * harness documenting an MCP file is already selected without one. Claude Code and Cursor are
 * selected unconditionally; Codex and Gemini CLI keep their file inside their own detection
 * directory, so it cannot exist without that directory selecting them. A preference could never add
 * a finding.
 */
function targetsOf(root: string): McpConfig[] {
	const seen = new Set<string>()
	return selectHarnesses(root, [])
		.map((harness) => harness.project.mcpConfig)
		.filter((config): config is McpConfig => config !== undefined)
		.filter((config) => !seen.has(config.path) && seen.add(config.path))
}

const divergence: Record<McpDirection, McpProblem> = {
	target: 'mcp-diverged-target',
	golden: 'mcp-diverged-golden',
	both: 'mcp-diverged-both',
	unknown: 'mcp-diverged-unknown',
}

export function diagnoseMcp({ root, git, cli }: DiagnoseMcpOptions): ConfigurationFinding[] {
	const findings: ConfigurationFinding[] = []
	const add = (path: string, problem: McpProblem) => {
		const { detail, repair } = repairFor(problem)
		findings.push({ path, problem, detail, repair: repair(path, cli) })
	}

	/**
	 * Credentials are reported for every file that holds servers, the golden set included — a user
	 * pastes a token into whichever file is open, and the golden set is a file. Severity splits on
	 * tracking, because a literal in a tracked file is already a committed credential and moving it
	 * to an environment variable does not un-commit it.
	 */
	const reportSecrets = (path: string, servers: Map<string, McpServer>) => {
		const committed = git.trackingOf(path) !== 'untracked'
		for (const [name, server] of servers)
			for (const field of credentialFields(server))
				add(`${path}#servers.${name}.${field}`, committed ? 'mcp-committed-secret' : 'mcp-literal-secret')
	}

	// Targets are read first so an unreadable one is reported whether or not a golden set exists: a
	// harness cannot read that file either, and its servers are not running.
	const targets = new Map<string, Map<string, McpServer>>()
	const configs: McpConfig[] = []
	for (const config of targetsOf(root)) {
		const parsed = parseTarget(config, read(root, config.path))
		if (parsed.kind === 'unreadable') {
			add(config.path, 'mcp-target-unreadable')
			continue
		}
		// A harness with no MCP file has nothing that could have drifted. Writing one for the first
		// time is projection, which is a write and not this command's.
		if (parsed.kind === 'absent') continue
		reportSecrets(config.path, parsed.servers)
		targets.set(config.path, parsed.servers)
		configs.push(config)
	}

	const golden = parseGoldenSet(read(root, goldenSetPath))
	if (golden.kind === 'unreadable') {
		add(goldenLocator(golden.position), 'mcp-golden-unreadable')
		return findings
	}
	if (golden.kind === 'absent') return findings
	reportSecrets(goldenSetPath, golden.servers)

	const baseline = new McpBaseline({ git, record: parseProjectionRecord(read(root, projectionRecordPath)) })

	for (const config of configs) {
		const servers = targets.get(config.path) as Map<string, McpServer>
		for (const [name, declared] of golden.servers) {
			const carried = servers.get(name)
			if (!carried) {
				add(`${config.path}#servers.${name}`, 'mcp-unprojected')
				continue
			}
			for (const field of divergingFields(declared, carried))
				add(
					`${config.path}#servers.${name}.${field}`,
					divergence[baseline.directionOf(config, name, field, declared, carried)],
				)
		}
		for (const name of servers.keys())
			if (!golden.servers.has(name)) add(`${config.path}#servers.${name}`, 'mcp-undeclared')
	}

	return findings
}
