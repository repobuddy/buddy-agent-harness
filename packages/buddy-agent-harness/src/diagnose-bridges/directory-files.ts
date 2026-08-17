import { readdirSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'

/**
 * Every file below `directory`, as paths relative to it, POSIX-separated and sorted. A directory
 * that does not exist reads as empty: `doctor` never creates one to look at it.
 */
export function filesUnder(directory: string): string[] {
	try {
		return readdirSync(directory, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) => relative(directory, join(entry.parentPath, entry.name)).split(sep).join(posix.sep))
			.sort()
	} catch {
		return []
	}
}
