import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { HarnessName } from '../harness-registry/harness-registry.ts'

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
 */
export function writeConfig(root: string, harnesses: HarnessName[]): void {
	const directory = join(root, '.agents', 'repobuddy')
	const file = join(directory, 'config.json')

	let existing: Record<string, unknown> = {}
	if (pathOccupied(file)) {
		const raw = readFileSync(file, 'utf8').trim()
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

	mkdirSync(directory, { recursive: true })
	writeFileSync(file, `${JSON.stringify({ ...existing, harnesses }, null, 2)}\n`)
}
