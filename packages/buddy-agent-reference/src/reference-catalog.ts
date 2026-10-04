import type { ReferenceLayer, ReferenceTier } from './reference-layers.ts'
import {
	parseReferenceName,
	type ResolvedReference,
	type ResolveOptions,
	referenceNames,
	resolveReference,
} from './resolve-reference.ts'

export type ReferenceRow = {
	name: string
	tier: ReferenceTier
	plugin: string
	path: string
	status: string
	description: string
}

export type ReferenceListing = { rows: ReferenceRow[]; warnings: string[] }

/** One row per name per layer holding it, with the status resolution gave that layer. */
export function listReferences(layers: readonly ReferenceLayer[], options: ResolveOptions = {}): ReferenceListing {
	const rows: ReferenceRow[] = []
	const warnings = new Set<string>()
	for (const name of referenceNames(layers)) {
		const resolved = resolveReference(parseReferenceName(name), layers, options)
		for (const warning of resolved.warnings) warnings.add(warning)
		for (const entry of resolved.trace) {
			if (!entry.found) continue
			rows.push({
				name,
				tier: entry.tier,
				plugin: entry.plugin,
				path: entry.path,
				status:
					entry.outcome === 'ambiguous' ? `ambiguous — ask for one of ${resolved.plugins.join(', ')}` : entry.outcome,
				description: entry.description,
			})
		}
	}
	return { rows, warnings: [...warnings] }
}

export type MatchKind = 'name' | 'prefix' | 'close name' | 'description' | 'heading' | 'body'

const matchOrder: readonly MatchKind[] = ['name', 'prefix', 'close name', 'description', 'heading', 'body']

export type SearchMatch = { name: string; tier: ReferenceTier; match: MatchKind; description: string }

function distance(a: string, b: string): number {
	let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
	for (let i = 1; i <= a.length; i++) {
		const current = [i]
		for (let j = 1; j <= b.length; j++) {
			const substitution = (previous[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1)
			current.push(Math.min((previous[j] as number) + 1, (current[j - 1] as number) + 1, substitution))
		}
		previous = current
	}
	return previous[b.length] as number
}

function headings(content: string): string {
	let fenced = false
	const lines: string[] = []
	for (const line of content.split('\n')) {
		if (/^ {0,3}(`{3,}|~{3,})/.test(line)) fenced = !fenced
		else if (!fenced && /^ {0,3}#{1,6}\s/.test(line)) lines.push(line)
	}
	return lines.join('\n')
}

function tagText(value: unknown): string {
	if (Array.isArray(value)) return value.map(String).join(' ')
	return typeof value === 'string' ? value : ''
}

function matchKind(name: string, reference: ResolvedReference, query: string): MatchKind | undefined {
	const bare = name.slice(name.lastIndexOf('/') + 1).toLowerCase()
	if (bare === query || name.toLowerCase() === query) return 'name'
	if (bare.startsWith(query)) return 'prefix'
	if (bare.includes(query) || distance(bare, query) <= Math.max(1, Math.floor(query.length / 4))) return 'close name'
	const terms = query.split(/\s+/)
	const holds = (text: string) => {
		const lower = text.toLowerCase()
		return terms.every((term) => lower.includes(term))
	}
	const metadata = reference.metadata as Record<string, unknown>
	const description = typeof metadata['description'] === 'string' ? metadata['description'] : ''
	if (holds(`${description} ${tagText(metadata['tags'])}`)) return 'description'
	const content = reference.content as string
	if (holds(headings(content))) return 'heading'
	if (holds(content)) return 'body'
	return undefined
}

/**
 * Every name resolves the way `show` would; a name two plugins hold is searched once per plugin, as
 * the qualified name `show` would need.
 */
export function searchReferences(
	query: string,
	layers: readonly ReferenceLayer[],
	options: ResolveOptions = {},
): SearchMatch[] {
	const normalized = query.trim().toLowerCase()
	const matches: SearchMatch[] = []
	for (const name of referenceNames(layers)) {
		const resolved = resolveReference(parseReferenceName(name), layers, options)
		const candidates =
			resolved.status === 'ambiguous'
				? resolved.plugins.map((qualified) => resolveReference(parseReferenceName(qualified), layers, options))
				: [resolved]
		// Every name listed is backed by a readable file, so each of these resolves as found.
		for (const reference of candidates.filter(({ status }) => status === 'found')) {
			const match = matchKind(reference.name, reference, normalized)
			if (!match) continue
			const description = (reference.metadata as Record<string, unknown>)['description']
			matches.push({
				name: reference.name,
				tier: reference.tier as ReferenceTier,
				match,
				description: typeof description === 'string' ? description.split('\n')[0]?.trim() || '' : '',
			})
		}
	}
	return matches.sort(
		(a, b) => matchOrder.indexOf(a.match) - matchOrder.indexOf(b.match) || a.name.localeCompare(b.name),
	)
}
