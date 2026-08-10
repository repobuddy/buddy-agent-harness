import { encode } from '@toon-format/toon'
import type { cli } from 'clibuilder'
import { command, z } from 'clibuilder'
import { initializeHarnesses } from './harness.ts'

function write(value: object, format: 'json' | 'toon' | undefined): void {
	process.stdout.write(`${format === 'json' ? JSON.stringify(value) : encode(value)}\n`)
}

export const initCommand: cli.Command = command({
	name: 'init',
	description: 'Set up canonical agent skills for the harnesses already enabled in a repository.',
	options: {
		root: {
			description: 'Repository or package directory. Defaults to the current directory.',
			type: z.optional(z.string()),
		},
		copy: {
			description: 'Copy skills instead of linking them.',
			type: z.optional(z.boolean()),
		},
		force: {
			description: 'Replace conflicting target skill directories.',
			type: z.optional(z.boolean()),
		},
		format: {
			description: 'Output format: toon (default) or json.',
			type: z.optional(z.string()),
			default: 'toon',
		},
	},
	run(args) {
		try {
			const format = args.format
			if (format !== 'toon' && format !== 'json') throw new Error('--format must be toon or json.')
			write(
				initializeHarnesses({
					root: args.root ?? process.cwd(),
					...(args.copy === undefined ? {} : { copy: args.copy }),
					...(args.force === undefined ? {} : { force: args.force }),
				}),
				format,
			)
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Harness initialization failed.'}\n`)
			process.exitCode = 1
		}
	},
})

export const harnessCommand: cli.Command = command({
	name: 'harness',
	description: 'Commands for configuring agent harness compatibility.',
	commands: [initCommand],
})

export function activate({ addCommand }: { addCommand(command: typeof harnessCommand): void }): void {
	addCommand(harnessCommand)
}
