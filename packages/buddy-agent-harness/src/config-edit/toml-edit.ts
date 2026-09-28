import { stringify as stringifyToml } from 'smol-toml'
import { type AST, parseTOML } from 'toml-eslint-parser'
import type { ConfigEdit } from './config-edit.ts'

function nested(path: string[], value: Record<string, unknown>): Record<string, unknown> {
	return path.reduceRight<Record<string, unknown>>((inner, key) => ({ [key]: inner }), value)
}

/** `value` as the table at `path`, with its sub-tables, in the form `smol-toml` writes it. */
export function renderTomlTable(path: string[], value: Record<string, unknown>): string {
	return stringifyToml(nested(path, value))
}

/** Appends the table at `path` after the last byte of `source`, which stays as it is. */
export function appendTomlTable(source: string, path: string[], value: Record<string, unknown>): string {
	const separator = source === '' || source.endsWith('\n') ? '' : '\n'
	return `${source}${separator}\n${renderTomlTable(path, value)}`
}

function keyNames(key: AST.TOMLKey): string[] {
	return key.keys.map((part) => (part.type === 'TOMLBare' ? part.name : part.value))
}

function startsWith(key: readonly (string | number)[], prefix: string[]): boolean {
	return prefix.length <= key.length && prefix.every((part, index) => key[index] === part)
}

/** Either key names a place inside the other, so a value at one defines or holds the other. */
function overlaps(key: string[], path: string[]): boolean {
	return startsWith(key, path) || startsWith(path, key)
}

/**
 * Replaces the table at `path` and every `[path.*]` sub-table, wherever they sit, keeping every
 * byte outside them. Only the `[table]` header form is replaced: a table written inline or as
 * dotted keys, or holding an array of tables, is refused as `shape`, and so is one whose header is
 * only implied by a sub-table. `smol-toml` keeps no source offsets, so `toml-eslint-parser`
 * locates the tables; values still come from `smol-toml`.
 */
export function replaceTomlTable(source: string, path: string[], value: Record<string, unknown>): ConfigEdit {
	let program: AST.TOMLProgram
	try {
		program = parseTOML(source)
	} catch {
		return { kind: 'refused', reason: 'unreadable' }
	}
	const owned: AST.TOMLTable[] = []
	for (const node of program.body[0].body) {
		if (node.type === 'TOMLKeyValue') {
			if (overlaps(keyNames(node.key), path)) return { kind: 'refused', reason: 'shape' }
			continue
		}
		if (startsWith(node.resolvedKey, path)) {
			if (node.kind === 'array') return { kind: 'refused', reason: 'shape' }
			owned.push(node)
			continue
		}
		const table = node.resolvedKey as string[]
		if (node.body.some((pair) => overlaps([...table, ...keyNames(pair.key)], path)))
			return { kind: 'refused', reason: 'shape' }
	}
	if (!owned.length) return { kind: 'refused', reason: 'absent' }
	if (!owned.some((table) => table.resolvedKey.length === path.length)) return { kind: 'refused', reason: 'shape' }
	// A table's range ends at its last value; a comment after that value on the same line is still its.
	const spans = owned.map((table): [number, number] => {
		const lineEnd = source.slice(table.range[1]).search(/\r?\n/)
		return [table.range[0], lineEnd < 0 ? source.length : table.range[1] + lineEnd]
	})
	const inside = (offset: number) => spans.some(([start, end]) => start <= offset && offset < end)
	if (program.comments.some((comment) => inside(comment.range[0]))) return { kind: 'refused', reason: 'comment' }

	const [first, ...rest] = spans as [[number, number], ...[number, number][]]
	let text = source
	for (const [start, end] of rest.reverse()) {
		const before = text.slice(0, start)
		const after = text.slice(end).replace(/^\r?\n/, '')
		text = /\n\r?\n$/.test(before) ? `${before}${after.replace(/^\r?\n/, '')}` : `${before}${after}`
	}
	const rendered = renderTomlTable(path, value).trimEnd()
	return { kind: 'edited', text: `${text.slice(0, first[0])}${rendered}${text.slice(first[1])}` }
}

const bareKey = /^[A-Za-z0-9_-]+$/

function tomlKey(name: string): string {
	return bareKey.test(name) ? name : JSON.stringify(name)
}

/** One value in TOML inline syntax: a map stays on its line as an inline table, not a sub-table. */
export function renderTomlInline(value: unknown): string {
	if (typeof value === 'object' && value !== null && !Array.isArray(value))
		return `{ ${Object.entries(value)
			.map(([name, item]) => `${tomlKey(name)} = ${renderTomlInline(item)}`)
			.join(', ')} }`
	return stringifyToml({ v: value }).slice('v = '.length).trimEnd()
}

/**
 * Appends the table at `path` with every value inline, so a later field edit finds each value on
 * one line of that table rather than in a sub-table.
 */
export function appendInlineTomlTable(source: string, path: string[], value: Record<string, unknown>): string {
	const separator = source === '' || source.endsWith('\n') ? '' : '\n'
	const lines = Object.entries(value).map(([name, item]) => `${tomlKey(name)} = ${renderTomlInline(item)}\n`)
	return `${source}${separator}\n[${path.map(tomlKey).join('.')}]\n${lines.join('')}`
}

function lineEndAt(source: string, offset: number): number {
	const end = source.indexOf('\n', offset)
	return end === -1 ? source.length : end
}

/**
 * Sets, adds, or (with `undefined`) removes the one key `name` of the `[path]` table, keeping every
 * byte outside that key-value line. Only a key written directly in the table's own `[header]` form
 * is taken apart: a table written inline or as dotted keys is `absent`, and a key spread over dotted
 * keys or a sub-table is `shape`.
 */
export function setTomlKey(source: string, path: string[], name: string, value: unknown): ConfigEdit {
	let program: AST.TOMLProgram
	try {
		program = parseTOML(source)
	} catch {
		return { kind: 'refused', reason: 'unreadable' }
	}
	const tables = program.body[0].body.filter((node): node is AST.TOMLTable => node.type === 'TOMLTable')
	const table = tables.find(
		(node) => node.kind === 'standard' && node.resolvedKey.length === path.length && startsWith(node.resolvedKey, path),
	)
	if (!table) return { kind: 'refused', reason: 'absent' }
	const pairs = table.body
	const spread =
		tables.some((node) => startsWith(node.resolvedKey, [...path, name])) ||
		pairs.some((pair) => keyNames(pair.key)[0] === name && pair.key.keys.length > 1)
	if (spread) return { kind: 'refused', reason: 'shape' }

	const pair = pairs.find((item) => item.key.keys.length === 1 && keyNames(item.key)[0] === name)
	if (pair && value !== undefined)
		return {
			kind: 'edited',
			text: `${source.slice(0, pair.value.range[0])}${renderTomlInline(value)}${source.slice(pair.value.range[1])}`,
		}
	if (pair) {
		// TOML holds one key-value per line, so the whole line and its trailing comment go with it.
		const start = source.lastIndexOf('\n', pair.range[0] - 1) + 1
		const end = lineEndAt(source, pair.range[1])
		return { kind: 'edited', text: `${source.slice(0, start)}${source.slice(Math.min(end + 1, source.length))}` }
	}
	if (value === undefined) return { kind: 'edited', text: source }
	const after = lineEndAt(source, pairs.at(-1)?.range[1] ?? table.range[0])
	return {
		kind: 'edited',
		text: `${source.slice(0, after)}\n${tomlKey(name)} = ${renderTomlInline(value)}${source.slice(after)}`,
	}
}
