import { homedir } from 'node:os'
import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import { collapseHome, parseFormat, writeDocument, writeResult } from '../command-output/command-output.ts'
import {
	type GovernanceLayer,
	type GovernanceScope,
	governanceLayers,
	listGovernances,
	overrideLayers,
	parseGovernanceName,
	resolveGovernance,
} from './governance-overrides.ts'

export type GovernanceListReport = {
	/**
	 * `status` is always a string, not optional — an optional key would drop this array out of
	 * TOON's tabular form into a nested list.
	 */
	layers: { scope: GovernanceScope; path: string; status: string }[]
	/** Emitted even when empty, so a healthy run states its zero explicitly. */
	governances: { name: string; scope: GovernanceScope; path: string }[] | string
}

export type GovernanceShowReport = {
	name: string
	scope: GovernanceScope
	path: string
	content: string
}

type Args = { root: string | undefined; format: string | undefined; 'overrides-only': boolean | undefined }

function layersFor(args: Args): GovernanceLayer[] {
	const layers = governanceLayers({
		root: args.root ?? process.cwd(),
		home: homedir(),
		platform: process.platform,
		programData: process.env['ProgramData'],
	})
	return args['overrides-only'] ? overrideLayers(layers) : layers
}

export const DEPRECATED_MANAGED = 'deprecated — move these documents to the managed layer above'

const rootOption = {
	description: 'Repository or package directory. Defaults to the current directory.',
	type: z.optional(z.string()),
}

const overridesOnlyOption = {
	description:
		'Resolve only the project, user, and machine-wide layers. Never returns a governance this package ships, and exits non-zero when no layer has one.',
	type: z.optional(z.boolean()),
}

export const governanceListCommand: cli.Command = command({
	name: 'list',
	description: 'List every governance the override layers hold, each at the layer that would win.',
	options: {
		root: rootOption,
		'overrides-only': overridesOnlyOption,
		format: {
			description: 'Output format: toon (default), json, or text for a human-readable report.',
			type: z.optional(z.string()),
			default: 'toon',
		},
	},
	run(args: Args) {
		try {
			const format = parseFormat(args.format)
			const home = homedir()
			const layers = layersFor(args)
			const entries = listGovernances(layers)
			const report: GovernanceListReport = {
				layers: layers.map(({ scope, dir }) => ({
					scope,
					path: collapseHome(home, dir),
					status: scope === 'managed-deprecated' ? DEPRECATED_MANAGED : '',
				})),
				governances: entries.length
					? entries.map(({ name, scope, path }) => ({ name, scope, path: collapseHome(home, path) }))
					: '0 governances — no layer holds one',
			}
			writeResult(report, format)
			return exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Governance listing failed.'}\n`)
			return exitCodes.error
		}
	},
})

export const governanceShowCommand: cli.Command = command({
	name: 'show',
	description: 'Print one governance document, resolved through the layers in order.',
	arguments: [{ name: 'name', description: 'The governance name, without the `.md` extension.', type: z.string() }],
	options: {
		root: rootOption,
		'overrides-only': overridesOnlyOption,
		format: {
			description:
				'Output format: text (default) writes the document itself; toon and json wrap it with the layer it came from.',
			type: z.optional(z.string()),
			default: 'text',
		},
	},
	run(args: Args & { name: string }) {
		try {
			const format = parseFormat(args.format)
			const name = parseGovernanceName(args.name)
			const found = resolveGovernance(name, layersFor(args))
			if (!found) {
				// stderr, not stdout — a caller piping the document off stdout must never see this
				// prose
				// mixed in.
				process.stderr.write(
					args['overrides-only']
						? `error: no override for governance "${name}" in the project, user, or machine-wide layer.\n`
						: `error: no governance named "${name}" in any layer.\n`,
				)
				return exitCodes.error
			}
			if (format === 'text') {
				writeDocument(found.content)
			} else {
				const report: GovernanceShowReport = {
					name: found.name,
					scope: found.scope,
					path: collapseHome(homedir(), found.path),
					content: found.content,
				}
				writeResult(report, format)
			}
			return exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Governance lookup failed.'}\n`)
			return exitCodes.error
		}
	},
})

export const governanceCommand: cli.Command = command({
	name: 'governance',
	description: 'Read the governance documents the project, user, and machine-wide override layers hold. Read-only.',
	commands: [governanceListCommand, governanceShowCommand],
})
