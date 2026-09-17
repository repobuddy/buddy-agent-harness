import { sep } from 'node:path'
import { encode } from '@toon-format/toon'
import { isRecord } from '../is-record/is-record.ts'

export type OutputFormat = 'json' | 'toon' | 'text'

const formats: readonly OutputFormat[] = ['toon', 'json', 'text']

/** Rejects anything but the supported formats so an unknown value never falls back silently. */
export function parseFormat(value: string | undefined): OutputFormat {
	if (!formats.includes(value as OutputFormat)) throw new Error('--format must be toon, json, or text.')
	return value as OutputFormat
}

/** The single stdout boundary: internal logic stays on plain objects, encoding happens here. */
export function writeResult(value: object, format: OutputFormat): void {
	process.stdout.write(`${encodeResult(value, format)}\n`)
}

/**
 * The other thing a command can have to say: a document that already is the answer, written exactly
 * as it was read. `governance show` is the caller — a rule set an agent is about to follow is not a
 * result to encode, and a Markdown body run through TOON or through the text renderer comes back as
 * one escaped line.
 *
 * It lives here rather than in that command because this module is the stdout boundary, and the
 * boundary is the module rather than the function. A run still writes once: a command either encodes
 * a result or writes a document, never both.
 */
export function writeDocument(content: string): void {
	process.stdout.write(content.endsWith('\n') ? content : `${content}\n`)
}

function encodeResult(value: object, format: OutputFormat): string {
	if (format === 'json') return JSON.stringify(value)
	return format === 'text' ? renderText(value) : encode(value)
}

function cell(value: unknown): string {
	return value === undefined ? '' : String(value)
}

/** A header row plus one row per record, every column padded to its widest cell. */
function table(rows: Record<string, unknown>[]): string[] {
	const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
	const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => cell(row[column]).length)))
	const line = (values: string[]) =>
		`  ${values.map((value, index) => value.padEnd(widths[index] as number)).join('  ')}`.trimEnd()
	return [line(columns), ...rows.map((row) => line(columns.map((column) => cell(row[column]))))]
}

/**
 * The same result rendered for a person rather than for an agent: scalars as `key: value`, records
 * as an aligned table, and everything else as a bulleted list. TOON stays the default because it is
 * what an agent parses; this is for reading over someone's shoulder.
 */
export function renderText(value: object): string {
	const blocks = Object.entries(value).map(([key, item]) => {
		if (!Array.isArray(item)) return [`${key}: ${isRecord(item) ? JSON.stringify(item) : String(item)}`]
		if (!item.length) return [`${key}: (none)`]
		const body = item.every(isRecord) ? table(item) : item.map((entry) => `  - ${String(entry)}`)
		return [`${key}:`, ...body]
	})

	// A blank line wherever a multi-line block meets its neighbour, so a following scalar does not
	// read as another row of the table above it.
	return blocks
		.flatMap((block, index) => {
			const previous = blocks[index - 1]
			return previous && (previous.length > 1 || block.length > 1) ? ['', ...block] : block
		})
		.join('\n')
}

/**
 * AXI §10: an absolute path with the user's home directory collapsed to `~`, so a reader handed a
 * report can paste the path on a machine that is not the one it came from.
 */
export function collapseHome(home: string, path: string): string {
	return home && path.startsWith(home + sep) ? `~${path.slice(home.length)}` : path
}

/** The same collapse for the executable that produced a report, which may not be known at all. */
export function binPath(home: string, executable: string | undefined): string {
	return executable ? collapseHome(home, executable) : 'buddy-agent-harness'
}
