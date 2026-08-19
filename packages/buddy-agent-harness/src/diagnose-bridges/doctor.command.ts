import { homedir } from 'node:os'
import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import { binPath, parseFormat, writeResult } from '../command-output/command-output.ts'
import { type ConfigurationFinding, diagnoseConfiguration } from '../diagnose-configuration/diagnose-configuration.ts'
import { diagnoseMcp } from '../diagnose-mcp/diagnose-mcp.ts'
import { type HarnessName, harnessRegistry } from '../harness-registry/harness-registry.ts'
import { type DiagnoseResult, diagnoseBridges } from './diagnose-bridges.ts'
import { commandInvocation, type DoctorProblem, type RepairAction } from './doctor-guidance.ts'
import { GitBridgeState } from './git-bridge-state.ts'

export type DoctorReport = {
	bin: string
	bridges: DiagnoseResult['bridges']
	instructions: DiagnoseResult['instructions']
	divergence?: DiagnoseResult['divergence']
	/**
	 * The repair is lifted out into `help`, so a finding row stays to the diagnosis itself. `problem`
	 * stays on the row: it is how a caller routes without parsing `detail` prose.
	 */
	findings: { path: string; problem: DoctorProblem; detail: string }[] | string
	/**
	 * One entry per distinct repair. Two fields rather than a sentence, because the caller has to
	 * tell an executable repair from an instruction, and `RepairAction` is where that lives.
	 *
	 * Both keys are always emitted, `command` as an empty string when there is none. An optional key
	 * would drop the whole array out of TOON's tabular form into the nested list form — worse for
	 * exactly the consumer the default format exists for.
	 */
	help?: RepairAction[]
}

/**
 * AXI §5: the healthy answer states the zero with context, so an agent does not re-run with other
 * flags to confirm that an empty section really meant "nothing wrong".
 */
export function buildDoctorReport(
	bin: string,
	result: DiagnoseResult,
	configuration: ConfigurationFinding[] = [],
): DoctorReport {
	const findings = [...result.findings, ...configuration]
	// Both sections are bridges, so the healthy line counts them together rather than making a reader
	// add up two numbers to learn that nothing is wrong.
	if (!findings.length) {
		const count = result.bridges.length + result.instructions.length
		const bridges = count === 1 ? 'the 1 bridge resolves' : `all ${count} bridges resolve`
		return {
			bin,
			bridges: result.bridges,
			instructions: result.instructions,
			findings: `0 problems found — ${bridges} and the configuration around them is current`,
		}
	}

	return {
		bin,
		bridges: result.bridges,
		instructions: result.instructions,
		...(result.divergence.length ? { divergence: result.divergence } : {}),
		findings: findings.map(({ path, problem, detail }) => ({ path, problem, detail })),
		// Deduped on the whole pair: several findings often share one repair, and repeating it reads as
		// more work than there is. Nothing wraps a repair — a `Run …` around every one of them is what
		// this report used to do, and most repairs are not commands.
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
			const requested = args.harness
				?.split(',')
				.map((name) => name.trim())
				.filter(Boolean)
			const unsupported = requested?.filter((name) => !harnessRegistry.some((harness) => harness.name === name))
			if (unsupported?.length)
				throw new Error(
					`Unsupported harness: ${unsupported.join(', ')}. Supported: ${harnessRegistry
						.map((harness) => harness.name)
						.join(', ')}.`,
				)
			const root = args.root ?? process.cwd()
			const result = diagnoseBridges({
				root,
				...(requested?.length ? { harnesses: requested as HarnessName[] } : {}),
				cli: commandInvocation,
			})
			const git = new GitBridgeState(root)
			const configuration = [
				...diagnoseConfiguration({ root, git, cli: commandInvocation }),
				...diagnoseMcp({ root, git, cli: commandInvocation }),
			]
			// Exit stays 0 even with findings: the diagnosis succeeded, and a non-zero code reads to an
			// agent as "this command is broken, try something else".
			writeResult(buildDoctorReport(binPath(homedir(), process.argv[1]), result, configuration), format)
			return exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Harness diagnosis failed.'}\n`)
			// Returned, not written: a command that writes the code reports its failure past `run`
			// rather than to it, leaving a caller that is not the process no way to learn of it.
			return exitCodes.error
		}
	},
})
