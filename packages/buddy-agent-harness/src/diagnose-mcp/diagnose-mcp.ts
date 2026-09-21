import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type McpProblem, repairFor } from '../diagnose-bridges/doctor-guidance.ts'
import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { type Locator, locatorText } from '../diagnose-bridges/locator.ts'
import type { ConfigurationFinding } from '../diagnose-configuration/diagnose-configuration.ts'
import { selectHarnesses } from '../harness-registry/harness-registry.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { McpBaseline, type McpDirection, parseProjectionRecord, projectionRecordPath } from './mcp-baseline.ts'
import { divergingFields, type McpServer } from './mcp-model.ts'
import { credentialFields } from './mcp-secrets.ts'
import { goldenSetPath, parseGoldenSet, parseTarget } from './mcp-sources.ts'

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
 * The distinct MCP files the enabled harnesses read. No `--harness` preference is accepted: every
 * harness documenting an MCP file is already selected without one, so a preference could never add
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
	// The locator is built once and never parsed back — a server name like `io.github.foo` would
	// not survive a split.
	const add = (at: Locator, problem: McpProblem) => {
		const { detail, repair } = repairFor(problem)
		findings.push({ path: locatorText(at), problem, detail, repair: repair(at, cli) })
	}

	const reportSecrets = (path: string, servers: Map<string, McpServer>) => {
		const committed = git.trackingOf(path) !== 'untracked'
		for (const [name, server] of servers)
			for (const field of credentialFields(server))
				add({ file: path, server: name, field }, committed ? 'mcp-committed-secret' : 'mcp-literal-secret')
	}

	// Read first so an unreadable target is reported even without a golden set — that harness can't
	// read the file either.
	const targets = new Map<string, Map<string, McpServer>>()
	const configs: McpConfig[] = []
	for (const config of targetsOf(root)) {
		const parsed = parseTarget(config, read(root, config.path))
		if (parsed.kind === 'unreadable') {
			add({ file: config.path }, 'mcp-target-unreadable')
			continue
		}
		// No file yet means nothing has drifted — writing one is projection, a write this command
		// doesn't do.
		if (parsed.kind === 'absent') continue
		reportSecrets(config.path, parsed.servers)
		targets.set(config.path, parsed.servers)
		configs.push(config)
	}

	const golden = parseGoldenSet(read(root, goldenSetPath))
	if (golden.kind === 'unreadable') {
		add({ file: goldenSetPath, position: golden.position }, 'mcp-golden-unreadable')
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
				add({ file: config.path, server: name }, 'mcp-unprojected')
				continue
			}
			for (const field of divergingFields(declared, carried))
				add(
					{ file: config.path, server: name, field },
					divergence[baseline.directionOf(config, name, field, declared, carried)],
				)
		}
		for (const name of servers.keys())
			if (!golden.servers.has(name)) add({ file: config.path, server: name }, 'mcp-undeclared')
	}

	return findings
}
