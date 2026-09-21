import { type Dirent, existsSync, readdirSync } from 'node:fs'
import { join, posix } from 'node:path'

/** Directories that never hold instructions this repository is responsible for bridging. */
const pruned = new Set(['node_modules'])

/**
 * Dot-directories are pruned along with `node_modules`: `.agents/AGENTS.md` is canonical shared
 * instructions, not a subtree-scoped file.
 */
export function agentsFileDirectories(root: string): string[] {
	const found: string[] = []

	const walk = (relative: string): void => {
		if (existsSync(join(root, relative, 'AGENTS.md'))) found.push(relative)
		let entries: Dirent[]
		try {
			entries = readdirSync(join(root, relative), { withFileTypes: true })
		} catch {
			return
		}
		for (const entry of entries) {
			if (!entry.isDirectory() || entry.name.startsWith('.') || pruned.has(entry.name)) continue
			walk(relative ? posix.join(relative, entry.name) : entry.name)
		}
	}

	walk('')
	return found.sort()
}
