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
 * Writes a document exactly as read, bypassing the encoders — a Markdown body run through TOON or
 * the text renderer comes back as one escaped line. A command writes one or the other, never both.
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

function table(rows: Record<string, unknown>[]): string[] {
	const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
	const widths = columns.map((column) => Math.max(column.length, ...rows.map((row) => cell(row[column]).length)))
	const line = (values: string[]) =>
		`  ${values.map((value, index) => value.padEnd(widths[index] as number)).join('  ')}`.trimEnd()
	return [line(columns), ...rows.map((row) => line(columns.map((column) => cell(row[column]))))]
}

/** Renders for a person, not an agent — TOON stays the default since that's what an agent parses. */
export function renderText(value: object): string {
	const blocks = Object.entries(value).map(([key, item]) => {
		if (!Array.isArray(item)) return [`${key}: ${isRecord(item) ? JSON.stringify(item) : String(item)}`]
		if (!item.length) return [`${key}: (none)`]
		const body = item.every(isRecord) ? table(item) : item.map((entry) => `  - ${String(entry)}`)
		return [`${key}:`, ...body]
	})

	// Blank line between blocks so a following scalar doesn't read as another row of the table
	// above it.
	return blocks
		.flatMap((block, index) => {
			const previous = blocks[index - 1]
			return previous && (previous.length > 1 || block.length > 1) ? ['', ...block] : block
		})
		.join('\n')
}

/**
 * AXI §10: collapses the home directory to `~` so a path in a report is portable to another
 * machine.
 */
export function collapseHome(home: string, path: string): string {
	return home && path.startsWith(home + sep) ? `~${path.slice(home.length)}` : path
}

export function displayBinPath(home: string, executable: string | undefined): string {
	return executable ? collapseHome(home, executable) : 'buddy-agent-harness'
}
