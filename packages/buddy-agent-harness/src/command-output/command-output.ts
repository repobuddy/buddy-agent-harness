import { sep } from 'node:path'
import { encode } from '@toon-format/toon'

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

function encodeResult(value: object, format: OutputFormat): string {
	if (format === 'json') return JSON.stringify(value)
	return format === 'text' ? renderText(value) : encode(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
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

/** AXI §10: the executable's absolute path, with the user's home directory collapsed to `~`. */
export function binPath(home: string, executable: string | undefined): string {
	if (!executable) return 'buddy-agent-harness'
	return home && executable.startsWith(home + sep) ? `~${executable.slice(home.length)}` : executable
}
