import { createOutput, formatOption } from '@clibuilder/axi'
import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { projectionRecordPath } from '../diagnose-mcp/mcp-baseline.ts'
import { goldenSetPath } from '../diagnose-mcp/mcp-sources.ts'
import { type ReconcileRow, reconcileMcp } from './reconcile-mcp.ts'

export type ReconcileReport = {
	golden: string
	mode: string
	/** Emitted even when empty, so a run that finds nothing states its zero. */
	fields: ReconcileRow[] | string
	record: string
}

export const mcpReconcileCommand: cli.Command = command({
	name: 'reconcile',
	description:
		'Import a harness-side MCP change into the golden set, one approved field at a time. A dry run unless --accept names a field.',
	options: {
		root: {
			description: 'Repository or package directory. Defaults to the current directory.',
			type: z.optional(z.string()),
		},
		accept: {
			description:
				'Approve one field by the path a dry run lists for it; repeat for each field. There is no approve-all.',
			type: z.optional(z.array(z.string())),
		},
		format: formatOption,
	},
	run(args) {
		try {
			const output = createOutput(args.format)
			const root = args.root ?? process.cwd()
			const accept = args.accept ?? []
			const plan = reconcileMcp({ root, git: new GitBridgeState(root), accept })
			if (plan.kind === 'unreadable') {
				// Position only: the parser's message quotes the line, and that line may hold a credential.
				const at = plan.position ? ` at line ${plan.position.line}, column ${plan.position.column}` : ''
				process.stderr.write(`error: ${goldenSetPath} does not parse${at}.\n`)
				return exitCodes.error
			}
			if (plan.kind === 'rejected') {
				process.stderr.write(`error: nothing written.\n${plan.reasons.map((reason) => `- ${reason}\n`).join('')}`)
				return exitCodes.error
			}
			if (plan.kind === 'absent') {
				output.result({
					golden: `0 servers — no golden set at ${goldenSetPath}`,
					mode: 'nothing to reconcile into',
					fields: '0 fields',
					record: 'not written',
				} satisfies ReconcileReport)
				return exitCodes.success
			}
			const report: ReconcileReport = {
				golden: goldenSetPath,
				mode: plan.written
					? 'written — only the fields named by --accept'
					: 'dry run — nothing written; re-run with --accept <path> for each approved field',
				fields: plan.rows.length ? plan.rows : '0 fields — no harness holds a change the golden set lacks',
				record: plan.written ? projectionRecordPath : 'not written — dry run',
			}
			output.result(report)
			return exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'MCP reconcile failed.'}\n`)
			return exitCodes.error
		}
	},
})
