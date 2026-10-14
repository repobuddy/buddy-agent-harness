import type { cli } from 'clibuilder'
import { command, t } from 'clibuilder'
import { result } from 'clibuilder/axi'
import { fail } from '../command-output/command-output.ts'
import { doctorCommand } from '../diagnose-bridges/doctor.command.ts'
import { governanceCommand } from '../governance-overrides/governance.command.ts'
import { parseHarnesses } from '../harness-registry/harness-registry.ts'
import { referenceCommand } from '../references/references.ts'
import { parseForce } from '../skill-projection/skill-projection.ts'
import { initializeHarnesses } from './initialize-harnesses.ts'

export const initCommand: cli.Command = command({
	name: 'init',
	description: 'Set up canonical agent skills for the harnesses already enabled in a repository.',
	options: {
		root: {
			description: 'Repository or package directory. Defaults to the current directory.',
			type: t.string().optional(),
		},
		harness: {
			description: 'Comma-separated harnesses to enable in addition to Claude Code and Cursor, e.g. codex,gemini-cli.',
			type: t.string().optional(),
		},
		copy: {
			description: 'Copy skills instead of linking them.',
			type: t.boolean().optional(),
		},
		force: {
			description:
				'Replace conflicting target skill directories. Names the targets to replace, comma-separated (e.g. .claude/skills); given alone it replaces every conflicting target.',
			type: t.string().optional(),
		},
	},
	run(args) {
		try {
			const harnesses = parseHarnesses(args.harness)
			return result(
				initializeHarnesses({
					root: args.root ?? process.cwd(),
					...(harnesses.length ? { harnesses } : {}),
					...(args.copy === undefined ? {} : { copy: args.copy }),
					...(args.force === undefined ? {} : { force: parseForce(args.force) }),
				}),
			)
		} catch (error) {
			return fail(error, 'Harness initialization failed.')
		}
	},
})

// Named `agent-harness`, not `harness` — `repobuddy` mounts every plugin into one namespace, and
// `harness` is generic enough to collide.
export const harnessCommand: cli.Command = command({
	name: 'agent-harness',
	description: 'Commands for configuring agent harness compatibility.',
	commands: [initCommand, doctorCommand, referenceCommand, governanceCommand],
})

export function activate({ addCommand }: { addCommand(command: typeof harnessCommand): void }): void {
	addCommand(harnessCommand)
}
