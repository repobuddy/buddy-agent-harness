import { type Dirent, existsSync, readdirSync } from 'node:fs'
import { join, posix } from 'node:path'

/** Directories that never hold instructions this repository is responsible for bridging. */
const pruned = new Set(['node_modules'])

/**
 * Every directory below `root` holding an `AGENTS.md`, repository-relative and POSIX-separated,
 * with the root itself as `''`. Sorted, root first.
 *
 * Dot-directories are pruned along with `node_modules`. That is not only a speed measure:
 * `.agents/AGENTS.md` is canonical shared instructions rather than a subtree-scoped file, and
 * bridging it would claim a scope it does not have.
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
