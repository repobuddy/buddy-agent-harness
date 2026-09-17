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
	 * Where a governance may come from, in lookup order, so a reader knows where to write one.
	 *
	 * `status` is emitted on every row, empty where there is nothing to say, rather than only on the
	 * row that has something: an optional key would drop the whole array out of TOON's tabular form
	 * into the nested list form, which is worse for exactly the consumer the default format exists
	 * for.
	 */
	layers: { scope: GovernanceScope; path: string; status: string }[]
	/** Always emitted, so a healthy run states its zero rather than leaving a reader to infer it. */
	governances: { name: string; scope: GovernanceScope; path: string }[] | string
}

export type GovernanceShowReport = {
	name: string
	scope: GovernanceScope
	path: string
	content: string
}

type Args = { root: string | undefined; format: string | undefined; 'overrides-only': boolean | undefined }

/**
 * `--overrides-only` is the narrowing step 2 of the skill lookup order is pinned to: the answer comes
 * from a layer someone set, never from what this package ships. A skill asks the question to learn
 * whether an override exists at all, and an answer drawn from the package would replace the copy the
 * skill was tested against.
 */
function layersFor(args: Args): GovernanceLayer[] {
	const layers = governanceLayers({
		root: args.root ?? process.cwd(),
		home: homedir(),
		platform: process.platform,
		programData: process.env['ProgramData'],
	})
	return args['overrides-only'] ? overrideLayers(layers) : layers
}

/**
 * Said on the layer rather than on a finding: the old location still answers, so nothing is broken
 * and nothing is to be repaired — there is simply somewhere better to put it.
 */
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
				// stderr, not stdout: a caller reading the document off stdout must never receive prose
				// about not having found one, and the exit code is the whole answer to `--overrides-only`.
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
