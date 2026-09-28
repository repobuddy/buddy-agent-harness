import { findNodeAtLocation, type Node, parseTree } from 'jsonc-parser'
import { stripJsonComments } from '../diagnose-bridges/json-with-comments.ts'
import type { ConfigEdit } from './config-edit.ts'

/** The one indent unit a file already uses, so an inserted value reads like its neighbours. */
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
 * Adds `name` to the object at `path`, or `undefined` when there is no object there or it already
 * holds `name`. `jsonc-parser`'s own `modify` reformats the properties beside the one it inserts,
 * so the text is spliced at the parse tree's offsets instead: every byte outside the insertion
 * survives, comments included.
 */
export function insertJsonProperty(source: string, path: string[], name: string, value: unknown): string | undefined {
	const container = objectAt(parseTree(source), path)
	if (!container || findNodeAtLocation(container, [name])) return undefined
	const depth = path.length + 1
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

/** Replaces the value at `path`, keeping every byte outside it. A comment inside the value is refused. */
export function replaceJsonValue(source: string, path: string[], value: unknown): ConfigEdit {
	const root = parseTree(source)
	const node = root && findNodeAtLocation(root, path)
	if (!node) return { kind: 'refused', reason: 'absent' }
	const end = node.offset + node.length
	const text = source.slice(node.offset, end)
	if (stripJsonComments(text) !== text) return { kind: 'refused', reason: 'comment' }
	return {
		kind: 'edited',
		text: `${source.slice(0, node.offset)}${jsonAt(value, indentUnit(source), path.length)}${source.slice(end)}`,
	}
}
