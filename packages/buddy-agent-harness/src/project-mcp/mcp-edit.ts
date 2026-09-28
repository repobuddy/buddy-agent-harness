import { findNodeAtLocation, type Node, parseTree } from 'jsonc-parser'
import { stringify as stringifyToml } from 'smol-toml'
import { stripJsonComments } from '../diagnose-bridges/json-with-comments.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'

export type McpEntry = Record<string, unknown>

/** The one indent unit a file already uses, so an inserted entry reads like its neighbours. */
function indentUnit(source: string): string {
	const indented = /\n([ \t]+)\S/.exec(source)
	return indented ? (indented[1] as string) : '  '
}

function jsonAt(value: unknown, unit: string, depth: number): string {
	return JSON.stringify(value, null, unit).replaceAll('\n', `\n${unit.repeat(depth)}`)
}

function objectAt(root: Node | undefined, path: string[]): Node | undefined {
	const node = root && (path.length ? findNodeAtLocation(root, path) : root)
	return node?.type === 'object' ? node : undefined
}

/**
 * `jsonc-parser`'s own `modify` reformats the properties beside the one it inserts, so the text is
 * spliced at the parse tree's offsets instead: every byte outside the insertion survives, comments
 * included.
 */
function insertProperty(source: string, container: Node, depth: number, name: string, value: unknown): string {
	const unit = indentUnit(source)
	const property = `${unit.repeat(depth)}${JSON.stringify(name)}: ${jsonAt(value, unit, depth)}`
	const last = container.children?.at(-1)
	if (last) {
		const end = last.offset + last.length
		return `${source.slice(0, end)},\n${property}${source.slice(end)}`
	}
	const open = container.offset + 1
	const close = container.offset + container.length - 1
	return `${source.slice(0, open)}\n${property}\n${unit.repeat(depth - 1)}${source.slice(close)}`
}

/** A new file holding only the MCP key, in the format the target reads. */
export function createFile(config: McpConfig, name: string, entry: McpEntry): string {
	const document = { [config.key]: { [name]: entry } }
	return config.format === 'toml' ? stringifyToml(document) : `${JSON.stringify(document, null, 2)}\n`
}

/**
 * Adds one server to an existing file without touching a byte of what is already there, or
 * `undefined` when the file's shape leaves no safe place to put it.
 */
export function appendServer(config: McpConfig, source: string, name: string, entry: McpEntry): string | undefined {
	if (config.format === 'toml') {
		const separator = source === '' || source.endsWith('\n') ? '' : '\n'
		return `${source}${separator}\n${stringifyToml({ [config.key]: { [name]: entry } })}`
	}
	const root = parseTree(source)
	const servers = objectAt(root, [config.key])
	if (servers) return insertProperty(source, servers, 2, name, entry)
	const document = objectAt(root, [])
	if (!document || findNodeAtLocation(document, [config.key])) return undefined
	return insertProperty(source, document, 1, config.key, { [name]: entry })
}

/**
 * Replaces one server's entry in a JSON file, or `undefined` when the entry holds a comment the
 * replacement would drop — a comment is the user's, and dropping it is not this command's call.
 */
export function replaceServer(config: McpConfig, source: string, name: string, entry: McpEntry): string | undefined {
	const node = objectAt(parseTree(source), [config.key, name])
	if (!node) return undefined
	const end = node.offset + node.length
	const text = source.slice(node.offset, end)
	if (stripJsonComments(text) !== text) return undefined
	return `${source.slice(0, node.offset)}${jsonAt(entry, indentUnit(source), 2)}${source.slice(end)}`
}

/** The entry as it would read in the target, for a person or a skill to apply by hand. */
export function renderEntry(config: McpConfig, name: string, entry: McpEntry): string {
	return config.format === 'toml'
		? stringifyToml({ [config.key]: { [name]: entry } })
		: JSON.stringify({ [name]: entry }, null, 2)
}
