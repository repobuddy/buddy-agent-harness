import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HarnessName } from '../harness-registry/harness-registry.ts'
import { resolveIndent } from './indentation.ts'

function pathOccupied(path: string): boolean {
	try {
		lstatSync(path)
		return true
	} catch {
		return false
	}
}

/**
 * `.agents/repobuddy/config.json` is shared with the rest of the repobuddy ecosystem — this package
 * is a plugin to it, not the owner of the file. Merge into whatever is already there and preserve
 * every key we do not own, so initialization never discards another plugin's configuration.
 *
 * A run that changes nothing writes nothing. This package is not a formatter and cannot match every
 * rule a repository's own formatter has, so re-serializing an unchanged record would reformat the
 * file on every run and keep failing whatever check the repository runs.
 */
export function writeConfig(root: string, harnesses: HarnessName[]): void {
	const directory = join(root, '.agents', 'repobuddy')
	const file = join(directory, 'config.json')

	let existing: Record<string, unknown> = {}
	let source: string | undefined
	if (pathOccupied(file)) {
		source = readFileSync(file, 'utf8')
		const raw = source.trim()
		if (raw) {
			let parsed: unknown
			try {
				parsed = JSON.parse(raw)
			} catch {
				throw new Error(`Refusing to overwrite unparseable configuration at ${file}.`)
			}
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
				throw new Error(`Refusing to overwrite non-object configuration at ${file}.`)
			existing = parsed as Record<string, unknown>
		}
	}

	// Spreading first keeps an existing `harnesses` key in its original position, so an unchanged
	// record serializes identically and the equality check below stays honest.
	const merged = { ...existing, harnesses }
	if (source !== undefined && JSON.stringify(merged) === JSON.stringify(existing)) return

	mkdirSync(directory, { recursive: true })
	writeFileSync(file, `${JSON.stringify(merged, null, resolveIndent(root, source))}\n`)
}
