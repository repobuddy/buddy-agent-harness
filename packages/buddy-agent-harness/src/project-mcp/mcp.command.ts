import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import { parseFormat, writeResult } from '../command-output/command-output.ts'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { projectionRecordPath } from '../diagnose-mcp/mcp-baseline.ts'
import { goldenSetPath } from '../diagnose-mcp/mcp-sources.ts'
import { mcpReconcileCommand } from '../reconcile-mcp/reconcile.command.ts'
import { type ProjectionEntry, type ProjectionRow, projectMcp } from './project-mcp.ts'

export type ProjectionReport = {
	golden: string
	mode: string
	/** Emitted even when empty, so a run that changes nothing states its zero. */
	actions: ProjectionRow[] | string
	/** Omitted when no row changes a server. */
	entries?: ProjectionEntry[]
	record: string
}

export const mcpProjectCommand: cli.Command = command({
	name: 'project',
	description:
		'Project the golden MCP server set into each enabled harness. A dry run unless --write; never overwrites a change made on the harness side.',
	options: {
		root: {
			description: 'Repository or package directory. Defaults to the current directory.',
			type: z.optional(z.string()),
		},
		write: {
			description: 'Apply the plan and record what was projected. Without it nothing on disk changes.',
			type: z.optional(z.boolean()),
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
			const root = args.root ?? process.cwd()
			const write = args.write === true
			const plan = projectMcp({ root, git: new GitBridgeState(root), write })
			if (plan.kind === 'unreadable') {
				// Position only: the parser's message quotes the line, and that line may hold a credential.
				const at = plan.position ? ` at line ${plan.position.line}, column ${plan.position.column}` : ''
				process.stderr.write(`error: ${goldenSetPath} does not parse${at}.\n`)
				return exitCodes.error
			}
			if (plan.kind === 'absent') {
				writeResult(
					{
						golden: `0 servers — no golden set at ${goldenSetPath}`,
						mode: 'nothing to project',
						actions: '0 changes',
						record: 'not written',
					} satisfies ProjectionReport,
					format,
				)
				return exitCodes.success
			}
			const report: ProjectionReport = {
				golden: goldenSetPath,
				mode: write ? 'written' : 'dry run — nothing written; re-run with --write to apply',
				actions: plan.rows.length ? plan.rows : '0 changes — every enabled harness already carries the golden set',
				...(plan.entries.length ? { entries: plan.entries } : {}),
				record: write ? projectionRecordPath : 'not written — dry run',
			}
			writeResult(report, format)
			return exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'MCP projection failed.'}\n`)
			return exitCodes.error
		}
	},
})

export const mcpCommand: cli.Command = command({
	name: 'mcp',
	description: 'Work with the golden MCP server set at .agents/buddy-agent-harness/mcp.toml.',
	commands: [mcpProjectCommand, mcpReconcileCommand],
})
