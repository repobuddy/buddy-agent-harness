import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { runCommandSync } from '../command-output/run-command.test-helper.ts'
import {
	agreedRepository,
	changed,
	commitAll,
	emptyRepository,
	git,
	link,
	plainDirectory,
	read,
	remove,
	snapshot,
	write,
} from '../copy-sync/copy-sync.test-helper.ts'
import { SyncError } from '../copy-sync/copy-sync.ts'
import { initCommand } from './init.command.ts'
import { initializeHarnesses } from './initialize-harnesses.ts'

const canonical = '.agents/skills/review/SKILL.md'
const copy = '.claude/skills/review/SKILL.md'

function isLink(root: string, path: string): boolean {
	return lstatSync(join(root, path)).isSymbolicLink()
}

describe('init over an existing copy (harness-init UC7, UC9)', () => {
	it('R52: keeps an in-sync copy as it is, not as a conflict, whether or not a copy was requested', () => {
		for (const copyRequested of [false, true]) {
			const root = plainDirectory()
			write(root, copy, '# Review')

			const result = initializeHarnesses({ root, copy: copyRequested })

			expect(isLink(root, '.claude/skills')).toBe(false)
			expect(result).toMatchObject({ linked: ['claude-code'], skipped: [], written: [], left: [] })
		}
	})

	it('R49: syncs a drifted copy file by file instead of reporting a conflict', () => {
		const root = agreedRepository({ 'review/SKILL.md': '# Review', 'lint/SKILL.md': '# Lint' })
		write(root, copy, '# Review, through the copy')
		write(root, '.claude/skills/lint/SKILL.md', '# Lint, through the copy')
		write(root, '.agents/skills/lint/SKILL.md', '# Lint, in place')

		const result = initializeHarnesses({ root })

		expect(isLink(root, '.claude/skills')).toBe(false)
		expect(read(root, canonical)).toBe('# Review, through the copy')
		expect(read(root, '.claude/skills/lint/SKILL.md')).toBe('# Lint, through the copy')
		expect(read(root, '.agents/skills/lint/SKILL.md')).toBe('# Lint, in place')
		expect(result).toMatchObject({
			linked: ['claude-code'],
			skipped: [],
			written: [{ bridge: '.claude/skills', path: copy, side: 'copy' }],
			left: [{ bridge: '.claude/skills', path: '.claude/skills/lint/SKILL.md' }],
		})
	})

	it('R49: syncs a copy at a path a request to replace does not name', () => {
		const root = plainDirectory()
		write(root, '.windsurf/skills/review/SKILL.md', '# Review, through Windsurf')

		const result = initializeHarnesses({ root, force: ['.claude/skills'] })

		expect(read(root, '.windsurf/skills/review/SKILL.md')).toBe('# Review, through Windsurf')
		expect(result.left).toEqual([{ bridge: '.windsurf/skills', path: '.windsurf/skills/review/SKILL.md' }])
		expect(result.skipped).toEqual([])
	})

	it('R51: replaces an existing copy a request to replace covers, and leaves the canonical directory as it was', () => {
		for (const force of [true, ['.claude/skills']] as const) {
			const root = agreedRepository()
			write(root, copy, '# Review, through the copy')

			const result = initializeHarnesses({ root, force: force as true | string[] })

			expect(isLink(root, '.claude/skills')).toBe(true)
			expect(read(root, canonical)).toBe('# Review')
			expect(result).toMatchObject({ written: [], left: [] })
		}
	})

	it('R49 with copy-sync R20: fails before writing when the canonical directory is missing under a copy', () => {
		const root = emptyRepository()
		write(root, copy, '# Review')
		const before = snapshot(root)

		expect(() => initializeHarnesses({ root })).toThrow(SyncError)
		expect(changed(before, snapshot(root))).toEqual([])

		initializeHarnesses({ root, force: true })
		expect(isLink(root, '.claude/skills')).toBe(true)
	})

	it('reports the missing canonical directory under its own code', () => {
		const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
		try {
			const root = emptyRepository()
			write(root, copy, '# Review')

			expect(runCommandSync(initCommand, { root })).toBe(1)
			expect(JSON.parse(stdout.mock.calls.map(([value]) => String(value)).join(''))).toMatchObject({
				code: 'canonical-missing',
			})
		} finally {
			stdout.mockRestore()
		}
	})

	it('R44: protects an in-sync tracked copy it kept, though it wrote nothing into it', () => {
		const root = agreedRepository()

		initializeHarnesses({ root })

		write(root, '.claude/skills/scratch.md', 'not to be committed')
		expect(git(root, 'status', '--porcelain', '--', '.claude')).toBe('')
		expect(read(root, '.git/info/exclude')).toContain('/.claude/skills/\n')
	})

	it('R50: protects a copy it writes at a tracked path', () => {
		const root = emptyRepository()
		write(root, canonical, '# Review')
		link(root, '.claude/skills')
		commitAll(root)
		remove(root, '.claude/skills')

		initializeHarnesses({ root, copy: true })

		expect(isLink(root, '.claude/skills')).toBe(false)
		expect(git(root, 'status', '--porcelain', '--', '.claude')).toBe('')
		git(root, 'add', '-A')
		expect(git(root, 'diff', '--cached', '--name-only', '--', '.claude')).toBe('')
	})

	it('R45: protects no copy at an untracked path', () => {
		const root = emptyRepository()
		write(root, canonical, '# Review')
		commitAll(root)

		initializeHarnesses({ root, copy: true })

		expect(read(root, '.git/info/exclude') ?? '').not.toContain('.claude/skills')
		expect(git(root, 'ls-files', '-v', '.claude/skills')).toBe('')
		remove(root, '.claude/skills')
	})
})
