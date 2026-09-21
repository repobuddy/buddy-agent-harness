import { homedir } from 'node:os'
import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import { binPath, collapseHome, parseFormat, writeResult } from '../command-output/command-output.ts'
import { type ConfigurationFinding, diagnoseConfiguration } from '../diagnose-configuration/diagnose-configuration.ts'
import { diagnoseMcp } from '../diagnose-mcp/diagnose-mcp.ts'
import { diagnoseNonstandard } from '../diagnose-nonstandard/diagnose-nonstandard.ts'
import {
	type GovernanceScope,
	governanceLayers,
	listGovernances,
	overrideLayers,
} from '../governance-overrides/governance-overrides.ts'
import { parseHarnesses } from '../harness-registry/harness-registry.ts'
import { type DiagnoseResult, diagnoseBridges } from './diagnose-bridges.ts'
import { commandInvocation, type DoctorProblem, type RepairAction } from './doctor-guidance.ts'
import { GitBridgeState } from './git-bridge-state.ts'

export type DoctorReport = {
	bin: string
	bridges: DiagnoseResult['bridges']
	instructions: DiagnoseResult['instructions']
	/**
	 * Governance overrides in play, each at the layer that would win; reported rather than
	 * diagnosed, since an override is a choice, not a fault.
	 */
	governances: { name: string; scope: GovernanceScope; path: string }[] | string
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
	overrides: { name: string; scope: GovernanceScope; path: string }[] = [],
): DoctorReport {
	const findings = [...result.findings, ...configuration]
	const governances = overrides.length
		? overrides
		: '0 governance overrides — no .agents/governances at project, user, or machine scope'
	// Counted together so a reader doesn't add up two numbers to learn that nothing is wrong.
	if (!findings.length) {
		const count = result.bridges.length + result.instructions.length
		const bridges = count === 1 ? 'the 1 bridge resolves' : `all ${count} bridges resolve`
		return {
			bin,
			bridges: result.bridges,
			instructions: result.instructions,
			governances,
			findings: `0 problems found — ${bridges} and the configuration around them is current`,
		}
	}

	return {
		bin,
		bridges: result.bridges,
		instructions: result.instructions,
		governances,
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
		"Report whether this repository's harness bridges still resolve — skills into .agents/skills, instructions into AGENTS.md. Read-only.",
	options: {
		root: {
			description: 'Repository or package directory. Defaults to the current directory.',
			type: z.optional(z.string()),
		},
		harness: {
			description: 'Comma-separated harnesses to check in addition to Claude Code and Cursor, e.g. codex,gemini-cli.',
			type: z.optional(z.string()),
		},
		format: {
			description: 'Output format: toon (default), json, or text for a human-readable report.',
			type: z.optional(z.string()),
			default: 'toon',
		},
	},
	run(args) {
		try {
			const format = parseFormat(args.format)
			const harnesses = parseHarnesses(args.harness)
			const root = args.root ?? process.cwd()
			const home = homedir()
			const result = diagnoseBridges({
				root,
				...(harnesses.length ? { harnesses } : {}),
				cli: commandInvocation,
			})
			const git = new GitBridgeState(root)
			const configuration = [
				...diagnoseConfiguration({ root, git, cli: commandInvocation }),
				...diagnoseMcp({ root, git, cli: commandInvocation }),
				...diagnoseNonstandard({ root, cli: commandInvocation }),
			]
			// Override layers only: what a skill ships is the skill's own business, not a
			// repository setting.
			const overrides = listGovernances(
				overrideLayers(
					governanceLayers({
						root,
						home,
						platform: process.platform,
						programData: process.env['ProgramData'],
					}),
				),
			).map(({ name, scope, path }) => ({ name, scope, path: collapseHome(home, path) }))
			// Exit stays 0 even with findings: a non-zero code reads to an agent as "this command
			// is broken".
			writeResult(buildDoctorReport(binPath(home, process.argv[1]), result, configuration, overrides), format)
			return exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Harness diagnosis failed.'}\n`)
			// Returned, not written: a caller that is not the process has no other way to learn of
			// the failure.
			return exitCodes.error
		}
	},
})
