import { encode } from '@toon-format/toon'
import type { cli } from 'clibuilder'
import { command, z } from 'clibuilder'
import { type HarnessName, harnessRegistry } from '../harness-registry/harness-registry.ts'
import { initializeHarnesses } from './initialize-harnesses.ts'

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
		harness: {
			description: 'Comma-separated harnesses to enable in addition to Claude Code and Cursor, e.g. codex,windsurf.',
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
			write(
				initializeHarnesses({
					root: args.root ?? process.cwd(),
					...(requested?.length ? { harnesses: requested as HarnessName[] } : {}),
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
