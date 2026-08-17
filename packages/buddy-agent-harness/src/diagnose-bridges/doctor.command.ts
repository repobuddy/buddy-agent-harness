import { homedir } from 'node:os'
import type { cli } from 'clibuilder'
import { command, z } from 'clibuilder'
import { binPath, parseFormat, writeResult } from '../command-output/command-output.ts'
import { type HarnessName, harnessRegistry } from '../harness-registry/harness-registry.ts'
import { type DiagnoseResult, diagnoseBridges } from './diagnose-bridges.ts'
import { commandInvocation } from './doctor-guidance.ts'

type DoctorReport = {
	bin: string
	bridges: DiagnoseResult['bridges']
	divergence?: DiagnoseResult['divergence']
	/** The repair is lifted out into `help`, so a finding row stays to the diagnosis itself. */
	findings: Omit<DiagnoseResult['findings'][number], 'repair'>[] | string
	help?: string[]
}

/**
 * AXI §5: the healthy answer states the zero with context, so an agent does not re-run with other
 * flags to confirm that an empty section really meant "nothing wrong".
 */
export function buildReport(bin: string, result: DiagnoseResult): DoctorReport {
	if (!result.findings.length) {
		const count = result.bridges.length
		return {
			bin,
			bridges: result.bridges,
			findings:
				count === 1 ? '0 problems found — the 1 bridge resolves' : `0 problems found — all ${count} bridges resolve`,
		}
	}

	return {
		bin,
		bridges: result.bridges,
		...(result.divergence.length ? { divergence: result.divergence } : {}),
		findings: result.findings.map(({ path, detail }) => ({ path, detail })),
		help: [...new Set(result.findings.map((finding) => `Run \`${finding.repair}\``))],
	}
}

export const doctorCommand: cli.Command = command({
	name: 'doctor',
	description: 'Report whether the harness skill bridges in this repository still resolve. Read-only.',
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
			description: 'Output format: toon (default) or json.',
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
			const result = diagnoseBridges({
				root: args.root ?? process.cwd(),
				...(requested?.length ? { harnesses: requested as HarnessName[] } : {}),
				cli: commandInvocation,
			})
			// Exit stays 0 even with findings: the diagnosis succeeded, and a non-zero code reads to an
			// agent as "this command is broken, try something else".
			writeResult(buildReport(binPath(homedir(), process.argv[1]), result), format)
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Harness diagnosis failed.'}\n`)
			process.exitCode = 1
		}
	},
})
