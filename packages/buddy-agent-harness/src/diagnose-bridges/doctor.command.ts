import { homedir } from 'node:os'
import type { cli } from 'clibuilder'
import { command, t } from 'clibuilder'
import { result } from 'clibuilder/axi'
import { listReferences, type ReferenceListLayerRow } from 'cyber-agentkit'
import { collapseHome, displayBinPath, fail } from '../command-output/command-output.ts'
import { type ConfigurationFinding, diagnoseConfiguration } from '../diagnose-configuration/diagnose-configuration.ts'
import { diagnoseMcp } from '../diagnose-mcp/diagnose-mcp.ts'
import { diagnoseNonstandard } from '../diagnose-nonstandard/diagnose-nonstandard.ts'
import { parseHarnesses } from '../harness-registry/harness-registry.ts'
import { referenceLayers } from '../references/references.ts'
import { type DiagnoseResult, diagnoseBridges } from './diagnose-bridges.ts'
import { commandInvocation, type DoctorProblem, type RepairAction } from './doctor-guidance.ts'
import { GitBridgeState } from './git-bridge-state.ts'

export type DoctorReference = Pick<ReferenceListLayerRow, 'name' | 'tier' | 'path'> & { status: string }

export type DoctorReport = {
	bin: string
	bridges: DiagnoseResult['bridges']
	instructions: DiagnoseResult['instructions']
	globalInstructions: DiagnoseResult['globalInstructions']
	/**
	 * References the managed, project, and user tiers hold, with the status `reference list` gives;
	 * reported rather than diagnosed, since a reference is a choice, not a fault.
	 */
	references: DoctorReference[] | string
	divergence?: DiagnoseResult['divergence']
	/**
	 * The repair is lifted out into `help`; `problem` stays on the row so a caller routes without
	 * parsing `detail` prose.
	 */
	findings: { path: string; problem: DoctorProblem; detail: string }[] | string
	/**
	 * One entry per distinct repair; `command` is always emitted, empty when there is none — an
	 * optional key would break TOON's tabular form.
	 */
	help?: RepairAction[]
}

/**
 * AXI §5: the healthy answer states the zero with context, so an agent doesn't re-run to confirm
 * nothing was wrong.
 */
export function buildDoctorReport(
	bin: string,
	result: DiagnoseResult,
	configuration: ConfigurationFinding[] = [],
	held: DoctorReference[] = [],
): DoctorReport {
	const findings = [...result.findings, ...configuration]
	const references = held.length ? held : '0 references — no layer outside the plugin tier holds one'
	// Counted together so a reader doesn't add up two numbers to learn that nothing is wrong.
	if (!findings.length) {
		const count = result.bridges.length + result.instructions.length
		const bridges = count === 1 ? 'the 1 bridge resolves' : `all ${count} bridges resolve`
		return {
			bin,
			bridges: result.bridges,
			instructions: result.instructions,
			globalInstructions: result.globalInstructions,
			references,
			findings: `0 problems found — ${bridges} and the configuration around them is current`,
		}
	}

	return {
		bin,
		bridges: result.bridges,
		instructions: result.instructions,
		globalInstructions: result.globalInstructions,
		references,
		...(result.divergence.length ? { divergence: result.divergence } : {}),
		findings: findings.map(({ path, problem, detail }) => ({ path, problem, detail })),
		// Deduped on the whole pair: several findings often share one repair, and repeating it
		// reads as more work than there is.
		help: [
			...new Map(
				findings.map((finding) => [`${finding.repair.command}\u0000${finding.repair.instruction}`, finding.repair]),
			).values(),
		],
	}
}

export const doctorCommand: cli.Command = command({
	name: 'doctor',
	description:
		"Report whether this repository's harness bridges still resolve — skills into .agents/skills, instructions into AGENTS.md — and whether each harness's user-scope file loads ~/.agents/AGENTS.md. Read-only.",
	options: {
		root: {
			description: 'Repository or package directory. Defaults to the current directory.',
			type: t.string().optional(),
		},
		harness: {
			description: 'Comma-separated harnesses to check in addition to Claude Code and Cursor, e.g. codex,gemini-cli.',
			type: t.string().optional(),
		},
	},
	async run(args) {
		try {
			const harnesses = parseHarnesses(args.harness)
			const root = args.root ?? process.cwd()
			const home = homedir()
			const diagnosis = diagnoseBridges({
				root,
				...(harnesses.length ? { harnesses } : {}),
				cli: commandInvocation,
				home,
				env: process.env,
			})
			const git = new GitBridgeState(root)
			const configuration = [
				...diagnoseConfiguration({ root, git, cli: commandInvocation }),
				...diagnoseMcp({ root, git, cli: commandInvocation }),
				...diagnoseNonstandard({ root, cli: commandInvocation }),
			]
			const { layers: rows } = listReferences(
				await referenceLayers({
					root,
					home,
					platform: process.platform,
					env: process.env,
				}),
			)
			// Resolved across every tier so each status matches `reference list`, but plugin rows are
			// left out: what a plugin ships is its own business, not a repository setting.
			const held = rows
				.filter(({ tier }) => tier !== 'plugin')
				.map(({ name, tier, path, outcome }) => ({ name, tier, path: collapseHome(home, path), status: outcome }))
			// Exit stays 0 even with findings: a non-zero code reads to an agent as "this command
			// is broken".
			return result(buildDoctorReport(displayBinPath(home, process.argv[1]), diagnosis, configuration, held))
		} catch (error) {
			return fail(error, 'Harness diagnosis failed.')
		}
	},
})
