import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import { parseFormat, writeResult } from '../command-output/command-output.ts'
import { doctorCommand } from '../diagnose-bridges/doctor.command.ts'
import { parseHarnesses } from '../harness-registry/harness-registry.ts'
import { parseForce } from '../skill-projection/skill-projection.ts'
import { initializeHarnesses } from './initialize-harnesses.ts'

export const initCommand: cli.Command = command({
	name: 'init',
	description: 'Set up canonical agent skills for the harnesses already enabled in a repository.',
	options: {
		root: {
			description: 'Repository or package directory. Defaults to the current directory.',
			type: z.optional(z.string()),
		},
		harness: {
			description: 'Comma-separated harnesses to enable in addition to Claude Code and Cursor, e.g. codex,gemini-cli.',
			type: z.optional(z.string()),
		},
		copy: {
			description: 'Copy skills instead of linking them.',
			type: z.optional(z.boolean()),
		},
		force: {
			description:
				'Replace conflicting target skill directories. Names the targets to replace, comma-separated (e.g. .claude/skills); given alone it replaces every conflicting target.',
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
			writeResult(
				initializeHarnesses({
					root: args.root ?? process.cwd(),
					...(harnesses.length ? { harnesses } : {}),
					...(args.copy === undefined ? {} : { copy: args.copy }),
					...(args.force === undefined ? {} : { force: parseForce(args.force) }),
				}),
				format,
			)
			return exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Harness initialization failed.'}\n`)
			// Returned, not written: a command that writes the code reports its failure past `run`
			// rather than to it, leaving a caller that is not the process no way to learn of it.
			return exitCodes.error
		}
	},
})

// Named for the package rather than shortened to `harness`: `repobuddy` mounts every plugin into one
// command namespace, where `harness` is generic enough to collide with another plugin's.
export const harnessCommand: cli.Command = command({
	name: 'agent-harness',
	description: 'Commands for configuring agent harness compatibility.',
	commands: [initCommand, doctorCommand],
})

export function activate({ addCommand }: { addCommand(command: typeof harnessCommand): void }): void {
	addCommand(harnessCommand)
}
