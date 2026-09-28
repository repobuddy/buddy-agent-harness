import { stringify as stringifyToml } from 'smol-toml'
import { type AST, parseTOML } from 'toml-eslint-parser'
import type { McpField, McpServer } from '../diagnose-mcp/mcp-model.ts'
import { isRecord } from '../is-record/is-record.ts'

const bareKey = /^[A-Za-z0-9_-]+$/

function key(name: string): string {
	return bareKey.test(name) ? name : JSON.stringify(name)
}

/** One value as TOML inline syntax — a map stays on its line rather than becoming a sub-table. */
export function tomlValue(value: unknown): string {
	if (isRecord(value))
		return `{ ${Object.entries(value)
			.map(([name, item]) => `${key(name)} = ${tomlValue(item)}`)
			.join(', ')} }`
	return stringifyToml({ v: value }).slice('v = '.length).trimEnd()
}

/** A new `[servers.<name>]` table, fields in the model's order, appended after everything already there. */
export function appendGoldenServer(source: string, name: string, server: McpServer): string {
	const lines = Object.entries(server).map(([field, value]) => `${field} = ${tomlValue(value)}`)
	const separator = source === '' || source.endsWith('\n') ? '' : '\n'
	const gap = source === '' ? '' : '\n'
	return `${source}${separator}${gap}[servers.${key(name)}]\n${lines.join('\n')}\n`
}

function sameKeys(left: readonly unknown[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((item, index) => item === right[index])
}

function keysOf(pair: AST.TOMLKeyValue): string[] {
	return pair.key.keys.map((part) => (part.type === 'TOMLBare' ? part.name : part.value))
}

function lineEnd(source: string, offset: number): number {
	const end = source.indexOf('\n', offset)
	return end === -1 ? source.length : end
}

function lineStart(source: string, offset: number): number {
	return source.lastIndexOf('\n', offset - 1) + 1
}

/**
 * Sets, adds, or removes one field of one server by splicing at the parse tree's offsets, so every
 * byte outside that field survives — the golden set's comments carry each server's rationale.
 * `undefined` where the server or field is written in a shape this edit does not take apart (an
 * inline or dotted server, a field spread over dotted keys or a sub-table): the caller hands that
 * change over rather than reserializing the file.
 */
export function setGoldenField(source: string, name: string, field: McpField, value: unknown): string | undefined {
	const tables = parseTOML(source).body[0].body.filter((node): node is AST.TOMLTable => node.type === 'TOMLTable')
	const table = tables.find((node) => node.kind === 'standard' && sameKeys(node.resolvedKey, ['servers', name]))
	if (!table) return undefined
	if (tables.some((node) => sameKeys(node.resolvedKey.slice(0, 3), ['servers', name, field]))) return undefined
	const pairs = table.body
	if (pairs.some((pair) => keysOf(pair)[0] === field && pair.key.keys.length > 1)) return undefined

	const pair = pairs.find((item) => sameKeys(keysOf(item), [field]))
	if (pair && value !== undefined)
		return `${source.slice(0, pair.value.range[0])}${tomlValue(value)}${source.slice(pair.value.range[1])}`
	if (pair) {
		// TOML holds one key-value per line, so the whole line and its trailing comment go with it.
		const end = lineEnd(source, pair.range[1])
		return `${source.slice(0, lineStart(source, pair.range[0]))}${source.slice(Math.min(end + 1, source.length))}`
	}
	if (value === undefined) return source
	const after = lineEnd(source, pairs.at(-1)?.range[1] ?? table.range[0])
	return `${source.slice(0, after)}\n${field} = ${tomlValue(value)}${source.slice(after)}`
}
