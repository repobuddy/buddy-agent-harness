import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** JSON's conventional default, used when nothing in the repository expresses a preference. */
const fallback = '  '

/** The indentation of the first indented line, which is what a re-write has to match. */
function detectIndent(source: string): string | undefined {
	return /^\{\r?\n([ \t]+)/.exec(source)?.[1]
}

/** Matches an EditorConfig section header against `config.json`, covering `*` and brace lists. */
function sectionApplies(pattern: string): boolean {
	const expanded = /^(.*)\{([^}]*)\}(.*)$/.exec(pattern)
	const patterns = expanded
		? (expanded[2] as string).split(',').map((part) => `${expanded[1]}${part.trim()}${expanded[3]}`)
		: [pattern]
	return patterns.some((candidate) => candidate === '*' || candidate === '*.json' || candidate === 'config.json')
}

/**
 * EditorConfig is the one indentation preference every editor and formatter already reads, so it is
 * the right place to ask rather than inventing a setting of our own.
 *
 * Only the root file is read, and only section headers that apply to `config.json`. Inheritance
 * across parent directories and full glob syntax are deliberately unsupported — a repository that
 * needs either is better served by the existing file's own indentation.
 */
function editorconfigIndent(root: string): string | undefined {
	let source: string
	try {
		source = readFileSync(join(root, '.editorconfig'), 'utf8')
	} catch {
		return undefined
	}

	let applies = false
	let style: string | undefined
	let size: string | undefined
	for (const line of source.split('\n')) {
		const text = line.trim()
		const section = /^\[(.+)\]$/.exec(text)
		if (section) {
			applies = sectionApplies(section[1] as string)
			continue
		}
		if (!applies) continue
		const setting = /^([A-Za-z_]+)\s*=\s*(.+)$/.exec(text)
		if (!setting) continue
		const key = (setting[1] as string).toLowerCase()
		const value = (setting[2] as string).trim().toLowerCase()
		if (key === 'indent_style') style = value
		if (key === 'indent_size') size = value
	}

	if (style === 'tab') return '\t'
	if (style === 'space') {
		const width = Number.parseInt(size ?? '', 10)
		return ' '.repeat(Number.isNaN(width) || width < 1 ? 2 : width)
	}
	return undefined
}

/**
 * Indentation for the configuration record, in preference order: whatever the file already uses,
 * then the repository's EditorConfig, then two spaces.
 *
 * Re-indenting a shared file is a quieter form of the overwrite this package already refuses, and a
 * fresh file written against the repository's own convention keeps `init` from failing the
 * repository's formatter on its first run.
 */
export function resolveIndent(root: string, existingSource: string | undefined): string {
	return (existingSource ? detectIndent(existingSource) : undefined) ?? editorconfigIndent(root) ?? fallback
}
