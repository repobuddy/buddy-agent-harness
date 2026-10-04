import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import {
	collapseHome,
	type OutputFormat,
	parseFormat,
	renderText,
	writeDocument,
	writeResult,
} from './command-output/command-output.ts'
import { readTemplate, templateWarnings, withMergeSections } from './create-reference.ts'
import { listReferences, type ReferenceRow, type SearchMatch, searchReferences } from './reference-catalog.ts'
import {
	projectReferencesDir,
	type ReferenceLayer,
	type ReferencePlugin,
	type ReferenceTier,
	referenceLayers,
} from './reference-layers.ts'
import { whereReference } from './reference-where.ts'
import {
	parseReferenceName,
	type ResolvedReference,
	resolveReference,
	type TraceEntry,
	type UsedLayer,
} from './resolve-reference.ts'

export type { ReferenceWhereReport, ReferenceWhereSlot } from './reference-where.ts'

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

export type ReferenceCreateReport = {
	name: string
	scope: CreateScope
	path: string
	dryRun: boolean
	content: string
	warnings: string[]
	/** Only after a write: the name resolved again, the new file's step `used`. */
	trace?: Omit<TraceEntry, 'description'>[]
}

export type ReferenceSearchReport = { query: string; references: SearchMatch[] | string }

type CommonArgs = { root: string | undefined; format: string | undefined }

const rootOption = {
	description:
		'Directory the project tier is read from, and each folder above it up to the repository root. Defaults to the current directory.',
	type: z.optional(z.string()),
}

type LayersFor = (args: CommonArgs, home: string) => Promise<ReferenceLayer[]>

function layerSource(plugin: ReferencePlugin | undefined): LayersFor {
	return (args, home) =>
		referenceLayers({
			root: args.root ?? process.cwd(),
			home,
			platform: process.platform,
			programData: process.env['ProgramData'],
			env: process.env,
			plugin,
		})
}

function fail(error: unknown, fallback: string): number {
	process.stderr.write(`error: ${error instanceof Error ? error.message : fallback}\n`)
	return exitCodes.error
}

function traceOf(resolved: ResolvedReference, home: string): Omit<TraceEntry, 'description'>[] {
	return resolved.trace.map(({ description: _, ...step }) => ({ ...step, path: collapseHome(home, step.path) }))
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
	if (trace) entry.trace = traceOf(resolved, home)
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

function showCommand(layersFor: LayersFor): cli.Command {
	return command({
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
}

const listFormatOption = {
	description: 'Output format: toon (default), json, or text for a human-readable report.',
	type: z.optional(z.string()),
	default: 'toon',
}

function listCommand(layersFor: LayersFor): cli.Command {
	return command({
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
}

function searchCommand(layersFor: LayersFor): cli.Command {
	return command({
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
}

function whereCommand(layersFor: LayersFor): cli.Command {
	return command({
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
				const report = whereReference(name, layers, {
					root: resolve(args.root ?? process.cwd()),
					caller: args.caller === undefined ? undefined : resolve(args.caller),
					display: (path) => collapseHome(home, path),
				})
				writeResult(report, format)
				if (!report.plugins) return exitCodes.success
				process.stderr.write(
					`error: ${missReason({ name: name.raw, status: 'ambiguous', plugins: report.plugins, warnings: [] })}\n`,
				)
				return exitCodes.error
			} catch (error) {
				return fail(error, 'Reference placement lookup failed.')
			}
		},
	})
}

type CreateScope = 'project' | 'user'

function parseScope(value: string | undefined): CreateScope {
	if (value !== 'project' && value !== 'user') throw new Error('--scope must be project or user.')
	return value
}

type CreateArgs = CommonArgs & {
	name: string
	template: string | undefined
	scope: string | undefined
	'dry-run': boolean | undefined
}

function createCommand(layersFor: LayersFor): cli.Command {
	return command({
		name: 'create',
		description:
			'Start a new reference in the project or user tier from a template, marked merge-sections when it overrides a copy below. Never overwrites.',
		arguments: [{ name: 'name', description: 'Reference name, without the `.md` extension.', type: z.string() }],
		options: {
			root: rootOption,
			template: {
				description:
					'File whose text is written as it is, frontmatter included. Defaults to a built-in template of top-level `##` sections with no `#` title.',
				type: z.optional(z.string()),
			},
			scope: {
				description:
					'Tier to write: project (default), `.agents/references/` at the root, or user, `~/.agents/references/`.',
				type: z.optional(z.string()),
				default: 'project',
			},
			'dry-run': {
				description: 'Print the target path and the exact content, and write nothing.',
				type: z.optional(z.boolean()),
			},
			format: {
				description:
					'Output format: text (default) writes the path, then the content or the trace; toon and json return an object.',
				type: z.optional(z.string()),
				default: 'text',
			},
		},
		async run(args: CreateArgs) {
			try {
				const format = parseFormat(args.format)
				const name = parseReferenceName(args.name)
				if (name.plugin !== undefined) {
					throw new Error(
						`an override is written under the bare name, which every tier resolves; ask for "${name.name}".`,
					)
				}
				const scope = parseScope(args.scope)
				const template = readTemplate(args.template === undefined ? undefined : resolve(args.template))
				const home = homedir()
				const dir =
					scope === 'project'
						? projectReferencesDir(resolve(args.root ?? process.cwd()))
						: join(home, '.agents', 'references')
				const target = join(dir, `${name.name}.md`)
				const display = (path: string) => collapseHome(home, path)
				const layers = await layersFor(args, home)
				const { trace } = resolveReference(name, layers, { display })
				const at = layers.findIndex((layer) => layer.dir === dir)
				if (trace[at]?.found) {
					throw new Error(
						`${display(trace[at].path)} already holds "${name.name}"; change it with the reference skill's Update mode.`,
					)
				}
				const shadow = trace.slice(0, at).find((step) => step.found && step.merge === 'first-wins')
				if (shadow) {
					throw new Error(
						`the ${shadow.tier} copy ${display(shadow.path)} is first-wins, so nothing would read a new ${scope} file; change that copy instead.`,
					)
				}
				const overrides = trace.slice(at + 1).some((step) => step.found)
				const content =
					overrides && template.metadata['merge'] === undefined ? withMergeSections(template.content) : template.content
				const warnings = templateWarnings(template)
				const report: ReferenceCreateReport = {
					name: name.name,
					scope,
					path: display(target),
					dryRun: Boolean(args['dry-run']),
					content,
					warnings,
				}
				if (!report.dryRun) {
					mkdirSync(dir, { recursive: true })
					writeFileSync(target, content, { flag: 'wx' })
					report.trace = traceOf(resolveReference(name, layers, { display }), home)
				}
				if (format !== 'text') writeResult(report, format)
				else {
					for (const warning of warnings) process.stderr.write(`warning: ${warning}\n`)
					if (report.trace) process.stdout.write(`${report.path}\n\n${renderText({ trace: report.trace })}\n`)
					else writeDocument(`${report.path}\n\n${content}`)
				}
				return exitCodes.success
			} catch (error) {
				return fail(error, 'Reference creation failed.')
			}
		},
	})
}

export type ReferenceCommandOptions = {
	/** The plugin running the command; see `ReferenceLayerOptions['plugin']`. */
	plugin?: ReferencePlugin | undefined
}

export type ReferenceCommands = {
	show: cli.Command
	list: cli.Command
	search: cli.Command
	where: cli.Command
	create: cli.Command
}

/** A factory, so each host CLI names itself as the plugin whose own references come first. */
export function createReferenceCommands({ plugin }: ReferenceCommandOptions = {}): ReferenceCommands {
	const layersFor = layerSource(plugin)
	return {
		show: showCommand(layersFor),
		list: listCommand(layersFor),
		search: searchCommand(layersFor),
		where: whereCommand(layersFor),
		create: createCommand(layersFor),
	}
}

export function createReferenceCommand(options: ReferenceCommandOptions = {}): cli.Command {
	const { show, list, search, where, create } = createReferenceCommands(options)
	return command({
		name: 'reference',
		description:
			'Read on-demand reference documents by name, layered across the managed, project, user, and plugin tiers, and start a new one in the project or user tier.',
		commands: [show, list, search, where, create],
	})
}
