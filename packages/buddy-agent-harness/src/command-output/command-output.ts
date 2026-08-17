import { sep } from 'node:path'
import { encode } from '@toon-format/toon'

export type OutputFormat = 'json' | 'toon'

/** Rejects anything but the two supported formats so an unknown value never falls back silently. */
export function parseFormat(value: string | undefined): OutputFormat {
	if (value !== 'toon' && value !== 'json') throw new Error('--format must be toon or json.')
	return value
}

/** The single stdout boundary: internal logic stays on plain objects, TOON is produced here. */
export function writeResult(value: object, format: OutputFormat): void {
	process.stdout.write(`${format === 'json' ? JSON.stringify(value) : encode(value)}\n`)
}

/** AXI §10: the executable's absolute path, with the user's home directory collapsed to `~`. */
export function binPath(home: string, executable: string | undefined): string {
	if (!executable) return 'buddy-agent-harness'
	return home && executable.startsWith(home + sep) ? `~${executable.slice(home.length)}` : executable
}
