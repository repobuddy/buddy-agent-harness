import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listReferences, searchReferences } from './reference-catalog.ts'
import type { ReferenceLayer } from './reference-layers.ts'

function tempDir(prefix = 'reference-catalog-'): string {
	return mkdtempSync(join(tmpdir(), prefix))
}

function write(root: string, relPath: string, content: string): string {
	const path = join(root, relPath)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, content)
	return path
}

function layer(tier: ReferenceLayer['tier'], dir: string, plugins: string[] = []): ReferenceLayer {
	return { tier, dir, plugins, status: '' }
}

describe('listReferences', () => {
	it('reports an ambiguous name with the plugins it names, not the bare "ambiguous" outcome', () => {
		const dirA = tempDir()
		const dirB = tempDir()
		write(dirA, 'testing.md', '# dep-a testing\n')
		write(dirB, 'testing.md', '# dep-b testing\n')

		const { rows } = listReferences([layer('plugin', dirA, ['dep-a']), layer('plugin', dirB, ['dep-b'])])

		expect(rows.every((row) => row.status.startsWith('ambiguous — ask for one of dep-a/testing, dep-b/testing'))).toBe(
			true,
		)
	})
})

describe('searchReferences', () => {
	it('does not read a heading fenced as code, and tags an array frontmatter value into the description text', () => {
		const dir = tempDir()
		write(dir, 'beta.md', '# beta\n\n```\n## test inside fence\n```\n\n## Testing checklist\n\nnothing else here\n')
		write(dir, 'delta.md', '---\ntags:\n  - foo\n  - test\n---\n# delta\n\nnothing relevant in the body\n')

		const matches = searchReferences('test', [layer('project', dir)])

		const beta = matches.find((match) => match.name === 'beta')
		expect(beta?.match).toBe('heading')
		const delta = matches.find((match) => match.name === 'delta')
		expect(delta?.match).toBe('description')
	})

	it('reads neither an array nor a string tags value as tag text', () => {
		const dir = tempDir()
		write(dir, 'epsilon.md', '---\ndescription: mentions test directly\ntags: 5\n---\n# epsilon\n')

		const [match] = searchReferences('test', [layer('project', dir)])

		expect(match?.name).toBe('epsilon')
		expect(match?.match).toBe('description')
	})

	it('reads a bare string tags value as tag text', () => {
		const dir = tempDir()
		write(dir, 'zeta.md', '---\ntags: test\n---\n# zeta\n\nnothing relevant in the body\n')

		const [match] = searchReferences('test', [layer('project', dir)])

		expect(match?.name).toBe('zeta')
		expect(match?.match).toBe('description')
	})

	it('falls back to an empty description when its first line is blank', () => {
		const dir = tempDir()
		write(dir, 'alpha.md', '---\ndescription: "\\nsecond line mentions test"\n---\n# alpha\n')

		const [match] = searchReferences('test', [layer('project', dir)])

		expect(match?.description).toBe('')
	})

	it('reports every plugin that holds an ambiguous name as its own match', () => {
		const dirA = tempDir()
		const dirB = tempDir()
		write(dirA, 'testing.md', '# dep-a testing\n')
		write(dirB, 'testing.md', '# dep-b testing\n')

		const matches = searchReferences('testing', [layer('plugin', dirA, ['dep-a']), layer('plugin', dirB, ['dep-b'])])

		expect(matches.map((match) => match.name).sort()).toEqual(['dep-a/testing', 'dep-b/testing'])
	})

	it('breaks a tie between same-kind matches by name', () => {
		const dir = tempDir()
		write(dir, 'zzz.md', '# zzz\n\nthis paragraph happens to mention test material\n')
		write(dir, 'aaa.md', '# aaa\n\nthis paragraph happens to mention test material too\n')

		const matches = searchReferences('test material', [layer('project', dir)])

		expect(matches.map((match) => match.name)).toEqual(['aaa', 'zzz'])
	})
})
