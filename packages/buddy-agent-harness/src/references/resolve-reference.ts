import { type Dirent, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	type MergeMode,
	mergeSections,
	parseDocument,
	parseSections,
	readFinal,
	readMergeMode,
	renderSections,
	stripMergeComments,
} from './reference-document.ts'
import type { ReferenceLayer, ReferenceTier } from './reference-layers.ts'

export type ReferenceName = { name: string; plugin: string | undefined; raw: string }

const namePattern = /^[a-z0-9]+(?:[-.][a-z0-9]+)*$/i
const pluginPattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

/**
 * Rejects rather than sanitizes — silently answering a different question is how untrusted input
 * reads a file outside the layer. The plugin qualifier is only ever compared with known plugin
 * names, never joined into a path.
 */
export function parseReferenceName(value: string): ReferenceName {
	if (value.endsWith('.md')) {
		throw new Error(`"${value}" names a file. Ask for the reference by name, without the .md extension.`)
	}
	const slash = value.lastIndexOf('/')
	const name = slash === -1 ? value : value.slice(slash + 1)
	const plugin = slash === -1 ? undefined : value.slice(0, slash)
	if (!namePattern.test(name) || (plugin !== undefined && !pluginPattern.test(plugin))) {
		throw new Error(
			`"${value}" is not a reference name. A name is letters, digits, hyphens, and dots, optionally after "<plugin>/" — not a path.`,
		)
	}
	return { name, plugin, raw: value }
}

const folderCandidates = ['README.md', 'index.md', 'SKILL.md']

/** Search order within one layer; the first that reads wins. */
export function candidateFiles(name: string): string[] {
	return [`${name}.md`, ...folderCandidates.map((file) => `${name}/${file}`)]
}

export type TraceEntry = {
	tier: ReferenceTier
	plugin: string
	path: string
	found: boolean
	candidate: string
	merge: string
	outcome: string
	/** The layer's own frontmatter `description`, so `list` can show it per row. */
	description: string
}

export type UsedLayer = { tier: ReferenceTier; plugin: string; path: string; merge: MergeMode }

export type ReferenceStatus = 'found' | 'missing' | 'ambiguous'

export type ResolvedReference = {
	name: string
	status: ReferenceStatus
	tier?: ReferenceTier
	plugin?: string
	path?: string
	merge?: MergeMode
	metadata?: Record<string, unknown>
	content?: string
	layers: UsedLayer[]
	warnings: string[]
	/** Qualified names to ask for instead, when two plugins hold an unqualified name. */
	plugins: string[]
	trace: TraceEntry[]
}

type FoundDocument = {
	layer: ReferenceLayer
	entry: TraceEntry
	metadata: Record<string, unknown>
	body: string
	merge: MergeMode
	final: boolean
}

export const BLOCKED_BY_FINAL = 'blocked by final in project'

export type ResolveOptions = {
	/** How a path is shown in a label or a warning — the command collapses the home directory. */
	display?: (path: string) => string
}

function tryRead(path: string): string | undefined {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return undefined
	}
}

function pluginLabel(layer: ReferenceLayer): string {
	return layer.plugins[0] ?? ''
}

function layerName(layer: ReferenceLayer): string {
	return layer.tier === 'plugin' ? `plugin ${pluginLabel(layer)}` : layer.tier
}

function layersFor(ref: ReferenceName, layers: readonly ReferenceLayer[]): ReferenceLayer[] {
	const plugin = ref.plugin
	if (plugin === undefined) return [...layers]
	const named = layers.filter((layer) => layer.tier !== 'plugin' || layer.plugins.includes(plugin))
	if (named.some((layer) => layer.tier === 'plugin')) return named
	// A placeholder so the trace says the plugin asked for is not there, rather than saying nothing.
	return [...named, { tier: 'plugin', dir: `(no dependency named ${plugin})`, plugins: [plugin], status: '' }]
}

export function resolveReference(
	ref: ReferenceName,
	layers: readonly ReferenceLayer[],
	{ display = (path) => path }: ResolveOptions = {},
): ResolvedReference {
	const warnings: string[] = []
	const trace: TraceEntry[] = []
	const found: FoundDocument[] = []

	for (const layer of layersFor(ref, layers)) {
		const entry: TraceEntry = {
			tier: layer.tier,
			plugin: pluginLabel(layer),
			path: layer.dir,
			found: false,
			candidate: '',
			merge: '',
			outcome: 'missing',
			description: '',
		}
		trace.push(entry)
		const hits = candidateFiles(ref.name).flatMap((candidate) => {
			const raw = tryRead(join(layer.dir, candidate))
			return raw === undefined ? [] : [{ candidate, raw }]
		})
		const [hit, ...ignored] = hits
		if (!hit) continue
		for (const other of ignored) {
			warnings.push(
				`${display(join(layer.dir, other.candidate))} is ignored: ${hit.candidate} answers first in that folder`,
			)
		}
		const path = join(layer.dir, hit.candidate)
		const warn = (message: string) => warnings.push(`${display(path)}: ${message}`)
		const { metadata, body } = parseDocument(hit.raw, warn)
		const merge = readMergeMode(metadata, warn)
		const final = readFinal(metadata, warn)
		if (final && layer.tier !== 'project')
			warn(`final applies only to a project reference; ignored in the ${layer.tier} tier`)
		const description = typeof metadata['description'] === 'string' ? metadata['description'] : ''
		Object.assign(entry, { path, found: true, candidate: hit.candidate, merge, outcome: '', description })
		found.push({ layer, entry, metadata, body, merge, final: final && layer.tier === 'project' })
	}

	const result: ResolvedReference = { name: ref.raw, status: 'missing', layers: [], warnings, plugins: [], trace }

	const blocked = found.some(({ final }) => final) ? found.filter(({ layer }) => layer.tier === 'local') : []
	for (const { entry } of blocked) entry.outcome = BLOCKED_BY_FINAL
	const readable = found.filter((document) => !blocked.includes(document))

	const stop = readable.findIndex(({ merge }) => merge === 'first-wins')
	const chain = stop === -1 ? readable : readable.slice(0, stop + 1)
	const shadowed = stop === -1 ? [] : readable.slice(stop + 1)
	const base = chain.at(-1)

	// Plugins are alternatives, not a stack: once resolution reaches the plugin tier, two plugins
	// holding the name leave nothing to choose between them.
	const holders = [...new Set(found.filter(({ layer }) => layer.tier === 'plugin').map(({ entry }) => entry.plugin))]
	if (ref.plugin === undefined && holders.length > 1 && chain.some(({ layer }) => layer.tier === 'plugin')) {
		for (const { entry } of readable) entry.outcome = 'ambiguous'
		result.status = 'ambiguous'
		result.plugins = holders.map((plugin) => `${plugin}/${ref.name}`)
		return result
	}
	for (const document of shadowed) {
		document.entry.outcome = `shadowed by ${(base as FoundDocument).layer.tier} (first-wins)`
	}
	if (!base) return result

	for (const { entry } of chain) entry.outcome = 'used'
	const top = chain[0] as FoundDocument
	return {
		...result,
		status: 'found',
		tier: top.layer.tier,
		plugin: top.entry.plugin,
		path: top.entry.path,
		merge: top.merge,
		// Lower layers first, so each document above overrides a key the one below also sets.
		metadata: Object.assign({}, ...[...chain].reverse().map(({ metadata }) => metadata)),
		content: withNewline(stripMergeComments(fold(chain, display, (message) => warnings.push(message)))),
		layers: chain.map(({ layer, entry, merge }) => ({
			tier: layer.tier,
			plugin: entry.plugin,
			path: entry.path,
			merge,
		})),
	}
}

type Part = { labels: string[]; body: string }

/** Bottom-up: the base is the lowest document read, and each document above says how it applies. */
function fold(chain: readonly FoundDocument[], display: (path: string) => string, warn: (message: string) => void) {
	const label = ({ layer, entry }: FoundDocument) => `${layerName(layer)} ${display(entry.path)}`
	const [base, ...above] = [...chain].reverse() as [FoundDocument, ...FoundDocument[]]
	let parts: Part[] = [{ labels: [label(base)], body: base.body }]
	for (const document of above) {
		if (document.merge === 'combine') {
			parts = [{ labels: [label(document)], body: document.body }, ...parts]
			continue
		}
		const below = parts.map(({ body }) => body.trim()).join('\n\n')
		const merged = mergeSections(parseSections(below, warn), parseSections(document.body, warn), label(document), warn)
		parts = [{ labels: [label(document), ...parts.flatMap(({ labels }) => labels)], body: renderSections(merged) }]
	}
	if (parts.length === 1) return (parts[0] as Part).body
	return [
		`> Combined from ${parts.length} layers, highest precedence first. Where they conflict, the first layer wins.`,
		...parts.map(({ labels, body }) => `<!-- layer: ${labels.join(', ')} -->\n\n${body.trim()}`),
	].join('\n\n')
}

function withNewline(content: string): string {
	return content.endsWith('\n') ? content : `${content}\n`
}

/** Every name a layer holds in any candidate form; empty for a layer that is missing or unreadable. */
export function layerNames(dir: string): string[] {
	let entries: Dirent[]
	try {
		entries = readdirSync(dir, { withFileTypes: true })
	} catch {
		return []
	}
	const names = new Set<string>()
	for (const entry of entries) {
		const name = entry.isFile() && entry.name.endsWith('.md') ? entry.name.slice(0, -3) : entry.name
		if (!namePattern.test(name)) continue
		if (
			entry.isFile()
				? entry.name.endsWith('.md')
				: folderCandidates.some((file) => tryRead(join(dir, name, file)) !== undefined)
		) {
			names.add(name)
		}
	}
	return [...names]
}

export function referenceNames(layers: readonly ReferenceLayer[]): string[] {
	return [...new Set(layers.flatMap(({ dir }) => layerNames(dir)))].sort((a, b) => a.localeCompare(b))
}
