import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import {
	collapseHome,
	type OutputFormat,
	parseFormat,
	renderText,
	writeDocument,
	writeResult,
} from '../command-output/command-output.ts'
import { listReferences, type ReferenceRow, type SearchMatch, searchReferences } from './reference-catalog.ts'
import { type ReferenceLayer, type ReferenceTier, referenceLayers } from './reference-layers.ts'
import {
	layersFor as layersTraced,
	parseReferenceName,
	type ResolvedReference,
	resolveReference,
	type TraceEntry,
	type UsedLayer,
} from './resolve-reference.ts'

/** One per name asked, in the order asked — the contract the `reference` skill's Load mode builds on. */
export type ReferenceShowEntry = {
	name: string
	status: ResolvedReference['status']
	tier?: ReferenceTier
	plugin?: string
	path?: string
	merge?: string
	metadata?: Record<string, unknown>
	content?: string
	layers?: UsedLayer[]
	warnings: string[]
	suggestions?: string[]
	plugins?: string[]
	trace?: Omit<TraceEntry, 'description'>[]
}

export type ReferenceListReport = {
	layers: { tier: ReferenceTier; plugin: string; path: string; status: string }[]
	/** Emitted even when empty, so a healthy run states its zero explicitly. */
	references: ReferenceRow[] | string
	warnings?: string[]
}

export type ReferenceWhereSlot = {
	/** The tier, `plugin <name>` for a plugin's copy, or `caller` for the calling skill's own copy. */
	layer: string
	path: string
	status: string
	scope: string
}

export type ReferenceWhereReport = {
	name: string
	/** What a project path is relative to. */
	root: string
	slots: ReferenceWhereSlot[]
	merge: string
	/** The `<plugin>/<name>` choices when two plugins hold the name. */
	plugins?: string[]
	warnings?: string[]
}

export type ReferenceSearchReport = { query: string; references: SearchMatch[] | string }

type CommonArgs = { root: string | undefined; format: string | undefined }

const rootOption = {
	description:
		'Directory the project tier is read from, and each folder above it up to the repository root. Defaults to the current directory.',
	type: z.optional(z.string()),
}

function layersFor(args: CommonArgs, home: string): Promise<ReferenceLayer[]> {
	return referenceLayers({
		root: args.root ?? process.cwd(),
		home,
		platform: process.platform,
		programData: process.env['ProgramData'],
		env: process.env,
	})
}

function fail(error: unknown, fallback: string): number {
	process.stderr.write(`error: ${error instanceof Error ? error.message : fallback}\n`)
	return exitCodes.error
}

function showEntry(
	resolved: ResolvedReference,
	home: string,
	suggestions: string[],
	trace: boolean,
): ReferenceShowEntry {
	const entry: ReferenceShowEntry = { name: resolved.name, status: resolved.status, warnings: [] }
	if (resolved.status === 'found') {
		Object.assign(entry, {
			tier: resolved.tier,
			plugin: resolved.plugin,
			path: collapseHome(home, resolved.path as string),
			merge: resolved.merge,
			metadata: resolved.metadata,
			content: resolved.content,
			layers: resolved.layers.map((layer) => ({ ...layer, path: collapseHome(home, layer.path) })),
		})
	}
	if (resolved.status === 'missing') entry.suggestions = suggestions
	if (resolved.status === 'ambiguous') entry.plugins = resolved.plugins
	entry.warnings = resolved.warnings
	if (trace) {
		entry.trace = resolved.trace.map(({ description: _, ...step }) => ({
			...step,
			path: collapseHome(home, step.path),
		}))
	}
	return entry
}

function missReason(entry: ReferenceShowEntry): string {
	if (entry.status === 'ambiguous') {
		return `"${entry.name}" is held by more than one plugin; ask for one of ${(entry.plugins as string[]).join(', ')}.`
	}
	const hint = entry.suggestions?.length ? ` Did you mean: ${entry.suggestions.join(', ')}?` : ''
	return `no reference named "${entry.name}" in any tier.${hint}`
}

function writeShowText(entries: readonly ReferenceShowEntry[]): void {
	if (entries.length === 1) {
		const [entry] = entries as [ReferenceShowEntry]
		if (entry.content !== undefined) writeDocument(entry.content)
		return
	}
	const blocks = entries.map((entry) =>
		entry.content === undefined
			? `<reference name="${entry.name}" status="${entry.status}" />`
			: `<reference name="${entry.name}" tier="${entry.tier}">\n${entry.content}</reference>`,
	)
	writeDocument(blocks.join('\n\n'))
}

function writeShowStderr(entries: readonly ReferenceShowEntry[], format: OutputFormat): void {
	for (const entry of entries) {
		if (format === 'text') {
			for (const warning of entry.warnings) process.stderr.write(`warning: ${warning}\n`)
			if (entry.trace) process.stderr.write(`${renderText({ [`trace ${entry.name}`]: entry.trace })}\n`)
		}
		if (entry.status !== 'found') process.stderr.write(`error: ${missReason(entry)}\n`)
	}
}

export const referenceShowCommand: cli.Command = command({
	name: 'show',
	description: 'Print one or more references, each resolved through the tiers and combined as its layers ask.',
	arguments: [
		{
			name: 'names',
			description: 'Reference names, without the `.md` extension; `<plugin>/<name>` picks one plugin.',
			type: z.array(z.string()),
		},
	],
	options: {
		root: rootOption,
		trace: {
			description: 'Report every path checked, the file that matched, the merge mode, and why a layer was dropped.',
			type: z.optional(z.boolean()),
		},
		format: {
			description:
				'Output format: text (default) writes the documents themselves; toon and json return an array with metadata.',
			type: z.optional(z.string()),
			default: 'text',
		},
	},
	async run(args: CommonArgs & { names: string[]; trace: boolean | undefined }) {
		try {
			const format = parseFormat(args.format)
			const names = args.names.map(parseReferenceName)
			if (!names.length) throw new Error('Name at least one reference.')
			const home = homedir()
			const layers = await layersFor(args, home)
			const display = (path: string) => collapseHome(home, path)
			const entries = names.map((name) => {
				const resolved = resolveReference(name, layers, { display })
				const suggestions =
					resolved.status === 'missing'
						? searchReferences(name.name, layers, { display })
								.slice(0, 3)
								.map((match) => match.name)
						: []
				return showEntry(resolved, home, suggestions, Boolean(args.trace))
			})
			if (format === 'text') writeShowText(entries)
			else writeResult(entries, format)
			writeShowStderr(entries, format)
			return entries.every((entry) => entry.status === 'found') ? exitCodes.success : exitCodes.error
		} catch (error) {
			return fail(error, 'Reference lookup failed.')
		}
	},
})

const listFormatOption = {
	description: 'Output format: toon (default), json, or text for a human-readable report.',
	type: z.optional(z.string()),
	default: 'toon',
}

export const referenceListCommand: cli.Command = command({
	name: 'list',
	description: 'List every layer, and every reference at every layer that holds it, marked used or shadowed.',
	options: { root: rootOption, format: listFormatOption },
	async run(args: CommonArgs) {
		try {
			const format = parseFormat(args.format)
			const home = homedir()
			const layers = await layersFor(args, home)
			const { rows, warnings } = listReferences(layers, { display: (path) => collapseHome(home, path) })
			const report: ReferenceListReport = {
				layers: layers.map(({ tier, plugins, dir, status }) => ({
					tier,
					plugin: plugins[0] ?? '',
					path: collapseHome(home, dir),
					status,
				})),
				references: rows.length
					? rows.map((row) => ({ ...row, path: collapseHome(home, row.path) }))
					: '0 references — no layer holds one',
			}
			if (warnings.length) report.warnings = warnings
			writeResult(report, format)
			return exitCodes.success
		} catch (error) {
			return fail(error, 'Reference listing failed.')
		}
	},
})

export const referenceSearchCommand: cli.Command = command({
	name: 'search',
	description: 'Find references by name, description, tags, headings, or body, best match first.',
	arguments: [{ name: 'query', description: 'What the reference is about.', type: z.string() }],
	options: { root: rootOption, format: listFormatOption },
	async run(args: CommonArgs & { query: string }) {
		try {
			const format = parseFormat(args.format)
			const query = args.query.trim()
			if (!query) throw new Error('Search needs a query.')
			const home = homedir()
			const matches = searchReferences(query, await layersFor(args, home), {
				display: (path) => collapseHome(home, path),
			})
			const report: ReferenceSearchReport = {
				query,
				references: matches.length ? matches : `0 references match "${query}"`,
			}
			writeResult(report, format)
			return exitCodes.success
		} catch (error) {
			return fail(error, 'Reference search failed.')
		}
	},
})

/** Managed is left out: writing there needs an admin, and most of it cannot be read locally. */
const slotScopes: Partial<Record<ReferenceTier, string>> = {
	project: 'everyone working in this repository',
	user: 'only you, in every repository',
	plugin: 'read-only; override it with the project or user file',
}

const callerScope = "read-only; the calling skill's own copy, read only when no layer holds the name"

const mergeNote =
	'The default, first-wins, makes the override replace the whole document. Set `merge: merge-sections` in its frontmatter to keep the sections it does not redefine.'

function slotStatus(outcome: string): string {
	if (outcome === 'missing') return 'empty'
	return outcome.startsWith('shadowed') ? 'shadowed' : outcome
}

/** Where Load reads the caller's copy when no layer holds the name, in the order it tries them. */
function callerCopy(caller: string, name: string): string | undefined {
	return [join(caller, 'references', `${name}.md`), join(caller, 'references', 'governances', `${name}.md`)].find(
		(path) => existsSync(path),
	)
}

function callerStatus(resolved: ResolvedReference): string {
	if (resolved.status === 'missing') return 'used'
	return resolved.status === 'ambiguous' ? 'not read — the name is ambiguous' : 'shadowed'
}

export const referenceWhereCommand: cli.Command = command({
	name: 'where',
	description:
		'List the project and user files an override of a reference can be written to, highest precedence first, with the copy each overrides and who it applies to.',
	arguments: [
		{
			name: 'name',
			description: 'Reference name, without the `.md` extension; `<plugin>/<name>` picks one plugin.',
			type: z.string(),
		},
	],
	options: {
		root: rootOption,
		caller: {
			description:
				"Folder of the skill that loads the reference, so its own copy is reported as the reference skill's Load mode reads it.",
			type: z.optional(z.string()),
		},
		format: listFormatOption,
	},
	async run(args: CommonArgs & { name: string; caller: string | undefined }) {
		try {
			const format = parseFormat(args.format)
			const name = parseReferenceName(args.name)
			const home = homedir()
			const layers = await layersFor(args, home)
			const root = resolve(args.root ?? process.cwd())
			const display = (path: string) => collapseHome(home, path)
			const resolved = resolveReference(name, layers, { display })
			const traced = layersTraced(name, layers)
			const slots: ReferenceWhereSlot[] = []
			for (const [index, step] of resolved.trace.entries()) {
				const layer = traced[index] as ReferenceLayer
				const scope = slotScopes[step.tier]
				// A legacy folder or a plugin is never a place to write, so it shows only while it holds a copy.
				if (!scope || ((layer.status || step.tier === 'plugin') && !step.found)) continue
				const path = step.found ? step.path : join(layer.dir, `${name.name}.md`)
				slots.push({
					layer: step.tier === 'plugin' ? `plugin ${step.plugin}` : step.tier,
					path: step.tier === 'project' ? relative(root, path) : display(path),
					status: slotStatus(step.outcome),
					scope,
				})
			}
			const copy = args.caller === undefined ? undefined : callerCopy(resolve(args.caller), name.name)
			if (copy) {
				slots.push({ layer: 'caller', path: display(copy), status: callerStatus(resolved), scope: callerScope })
			}
			const report: ReferenceWhereReport = { name: name.name, root: display(root), slots, merge: mergeNote }
			if (resolved.status === 'ambiguous') report.plugins = resolved.plugins
			if (resolved.warnings.length) report.warnings = resolved.warnings
			writeResult(report, format)
			if (resolved.status !== 'ambiguous') return exitCodes.success
			process.stderr.write(
				`error: ${missReason({ name: name.raw, status: 'ambiguous', plugins: resolved.plugins, warnings: [] })}\n`,
			)
			return exitCodes.error
		} catch (error) {
			return fail(error, 'Reference placement lookup failed.')
		}
	},
})

export const referenceCommand: cli.Command = command({
	name: 'reference',
	description:
		'Read on-demand reference documents by name, layered across the managed, project, user, and plugin tiers. Read-only.',
	commands: [referenceShowCommand, referenceListCommand, referenceSearchCommand, referenceWhereCommand],
})
