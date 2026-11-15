import { homedir } from 'node:os'
import type { cli } from 'clibuilder'
import { command, t } from 'clibuilder'
import { CliError, exitCodes, result } from 'clibuilder/axi'
import { collapseHome, fail } from '../command-output/command-output.ts'
import { parseResolutions, SyncError, type SyncErrorCode, syncSkillCopies } from './copy-sync.ts'

const resolveHelp =
	'Pass --resolve as <bridge>/<file>=<canonical|copy>, comma-separated, naming only files a sync left for the user, such as .claude/skills/review/SKILL.md=canonical.'

const nextStep: Record<SyncErrorCode, string> = {
	'invalid-resolution': resolveHelp,
	'unneeded-resolution': `Run the sync without that resolution; ${resolveHelp}`,
	'conflicting-resolution':
		'Give the file the same pick in every copy that waits on it, or leave it unresolved in all of them.',
	'canonical-missing':
		'Create .agents/skills first, such as by moving the copy there, then run the sync again; nothing was written.',
	'write-failed': 'Fix what stopped the write, such as a permission, then run the sync again.',
}

/**
 * A refused request exits with the usage code, and a sync that could not finish with the failure
 * code, so a caller tells the two apart from the exit status alone.
 */
export function syncFailure(error: unknown, fallback: string): never {
	if (!(error instanceof SyncError)) return fail(error, fallback)
	const refused = error.code.endsWith('-resolution')
	throw new CliError(error.message, {
		code: error.code,
		exitCode: refused ? exitCodes.usage : exitCodes.error,
		details: { entries: [...error.entries] },
		help: nextStep[error.code],
		cause: error,
	})
}

export const syncCommand: cli.Command = command({
	name: 'sync',
	description:
		'Merge each skills copy bridge with .agents/skills file by file, keeping the edits made on either side, and keep a tracked copy out of commits.',
	options: {
		root: {
			description: 'Any directory of the repository; the sync works at its root. Defaults to the current directory.',
			type: t.string().optional(),
		},
		resolve: {
			description:
				'Comma-separated picks for files the sync left for the user, each <bridge>/<file>=<canonical|copy>, e.g. .claude/skills/review/SKILL.md=canonical.',
			type: t.string().optional(),
		},
	},
	examples: [
		{ command: 'buddy-agent-harness sync', description: 'Sync every skills copy with .agents/skills' },
		{
			command: 'buddy-agent-harness sync --resolve .claude/skills/review/SKILL.md=copy',
			description: "Keep the copy's version of a file both sides changed",
		},
	],
	run(args) {
		try {
			const synced = syncSkillCopies({
				root: args.root ?? process.cwd(),
				...(args.resolve === undefined ? {} : { resolutions: parseResolutions(args.resolve) }),
			})
			return result({ ...synced, root: collapseHome(homedir(), synced.root) })
		} catch (error) {
			return syncFailure(error, 'Skills copy sync failed.')
		}
	},
})
