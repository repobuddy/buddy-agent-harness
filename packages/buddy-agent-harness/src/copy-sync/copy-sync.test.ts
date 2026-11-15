import { mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diagnoseBridges } from '../diagnose-bridges/diagnose-bridges.ts'
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
} from './copy-sync.test-helper.ts'
import {
	parseResolutions,
	SyncError,
	type SyncErrorCode,
	type SyncResolution,
	syncCopyBridges,
	syncSkillCopies,
} from './copy-sync.ts'

const canonical = '.agents/skills/review/SKILL.md'
const copy = '.claude/skills/review/SKILL.md'

function sync(root: string, resolutions: SyncResolution[] = []) {
	return syncSkillCopies({ root, resolutions })
}

function refusal(run: () => unknown): { code: SyncErrorCode; entries: readonly string[] } {
	try {
		run()
	} catch (error) {
		if (error instanceof SyncError) return { code: error.code, entries: error.entries }
		throw error
	}
	throw new Error('expected the sync to refuse')
}

describe('parseResolutions', () => {
	it('reads each comma-separated pick through its bridge', () => {
		expect(parseResolutions(' .claude/skills/a.md=canonical , ./.claude/skills/b.md=copy ,')).toEqual([
			{ path: '.claude/skills/a.md', side: 'canonical' },
			{ path: '.claude/skills/b.md', side: 'copy' },
		])
	})

	it('splits at the last =, so a path holding one still parses', () => {
		expect(parseResolutions('.claude/skills/a=b.md=copy')).toEqual([{ path: '.claude/skills/a=b.md', side: 'copy' }])
	})

	// copy-sync R10: a side the sync does not recognize is refused, and the refusal names the entry.
	it('refuses an entry with no side, an unknown side, or no path', () => {
		for (const entry of ['.claude/skills/a.md', '.claude/skills/a.md=theirs', '=copy', '.=copy']) {
			expect(refusal(() => parseResolutions(entry))).toEqual({ code: 'invalid-resolution', entries: [entry] })
		}
	})
})

describe('syncing (copy-sync R1 to R11, R19, R20)', () => {
	it('R1: works at the repository root when run from a nested package', () => {
		const root = agreedRepository()
		write(root, copy, '# Review, edited through the copy')
		mkdirSync(join(root, 'packages', 'nested'), { recursive: true })

		const result = sync(join(root, 'packages', 'nested'))

		expect(realpathSync(result.root)).toBe(realpathSync(root))
		expect(read(root, canonical)).toBe('# Review, edited through the copy')
	})

	it('R1: outside a repository, works on the directory it was given', () => {
		const root = plainDirectory()
		write(root, '.claude/skills/review/SKILL.md', '# Review')

		expect(sync(root)).toMatchObject({ root, copies: ['.claude/skills'], written: [], left: [] })
	})

	it('R2, R3: writes nothing for a link, a regular file, or an absent bridge, and succeeds', () => {
		const linked = agreedRepository()
		remove(linked, '.claude/skills')
		link(linked, '.claude/skills')
		write(linked, '.windsurf/skills', 'a regular file')
		const before = snapshot(linked)

		const result = sync(linked)

		expect(result).toMatchObject({ outcome: 'synced', copies: [], written: [], left: [], protected: [] })
		expect(changed(before, snapshot(linked))).toEqual([])

		const absent = plainDirectory()
		expect(sync(absent)).toMatchObject({ outcome: 'synced', copies: [] })
	})

	it('R4: writes nothing for a copy that already holds the same files', () => {
		const root = agreedRepository()
		const before = snapshot(root)

		expect(sync(root)).toMatchObject({ outcome: 'synced', copies: ['.claude/skills'], written: [], left: [] })
		expect(changed(before, snapshot(root))).toEqual([])
	})

	it('R5: carries an edit made through the copy into the canonical directory', () => {
		const root = agreedRepository()
		write(root, copy, '# Review, edited through the copy')

		const result = sync(root)

		expect(read(root, canonical)).toBe('# Review, edited through the copy')
		expect(result.written).toEqual([{ bridge: '.claude/skills', path: copy, side: 'copy' }])
		expect(result.outcome).toBe('synced')
	})

	it('R5: carries an edit made in the canonical directory into the copy', () => {
		const root = agreedRepository()
		write(root, canonical, '# Review, edited in place')

		const result = sync(root)

		expect(read(root, copy)).toBe('# Review, edited in place')
		expect(result.written).toEqual([{ bridge: '.claude/skills', path: copy, side: 'canonical' }])
	})

	it('R5: carries a file added or removed on one side to the other, removing what the removal emptied', () => {
		const root = agreedRepository({ 'review/SKILL.md': '# Review', 'old/SKILL.md': '# Old', 'gone/SKILL.md': '# Gone' })
		write(root, '.claude/skills/added/SKILL.md', '# Added through the copy')
		write(root, '.agents/skills/new/SKILL.md', '# New in place')
		remove(root, '.claude/skills/old')
		remove(root, '.agents/skills/gone/SKILL.md')

		const result = sync(root)

		expect(read(root, '.agents/skills/added/SKILL.md')).toBe('# Added through the copy')
		expect(read(root, '.claude/skills/new/SKILL.md')).toBe('# New in place')
		expect(read(root, '.agents/skills/old/SKILL.md')).toBeUndefined()
		expect(read(root, '.claude/skills/gone/SKILL.md')).toBeUndefined()
		expect(snapshot(root).has('.agents/skills/old')).toBe(false)
		expect(result.written).toEqual([
			{ bridge: '.claude/skills', path: '.claude/skills/added/SKILL.md', side: 'copy' },
			{ bridge: '.claude/skills', path: '.claude/skills/gone/SKILL.md', side: 'canonical' },
			{ bridge: '.claude/skills', path: '.claude/skills/new/SKILL.md', side: 'canonical' },
			{ bridge: '.claude/skills', path: '.claude/skills/old/SKILL.md', side: 'copy' },
		])
	})

	it('R6: leaves a file both sides changed unchanged on both sides, and reports it', () => {
		const root = agreedRepository()
		write(root, copy, '# Review, through the copy')
		write(root, canonical, '# Review, in place')

		const result = sync(root)

		expect(read(root, copy)).toBe('# Review, through the copy')
		expect(read(root, canonical)).toBe('# Review, in place')
		expect(result).toMatchObject({
			outcome: 'files-left',
			written: [],
			left: [{ bridge: '.claude/skills', path: copy }],
		})
	})

	describe('R7: with no last agreement, every differing file is left as it is', () => {
		function expectLeft(root: string): void {
			const before = snapshot(root)
			const result = sync(root)
			expect(result.left).toEqual([{ bridge: '.claude/skills', path: copy }])
			expect(result.written).toEqual([])
			expect(changed(before, snapshot(root))).toEqual([])
		}

		it('outside a git repository', () => {
			const root = plainDirectory()
			write(root, copy, '# Review, through the copy')
			expectLeft(root)
		})

		it('in a repository with no commits', () => {
			const root = emptyRepository()
			write(root, canonical, '# Review')
			write(root, copy, '# Review, through the copy')
			expectLeft(root)
		})

		it('when only one side is in history', () => {
			const root = emptyRepository()
			write(root, canonical, '# Review')
			commitAll(root)
			write(root, copy, '# Review, through the copy')
			expectLeft(root)
		})

		it('when the two sides were never committed holding the same files', () => {
			const root = emptyRepository()
			write(root, canonical, '# Review')
			write(root, copy, '# Review, through the copy')
			commitAll(root)
			write(root, copy, '# Review, through the copy, again')
			expectLeft(root)
		})

		it('when the bridge was committed as a symlink', () => {
			const root = emptyRepository()
			write(root, canonical, '# Review')
			link(root, '.claude/skills')
			commitAll(root)
			remove(root, '.claude/skills')
			write(root, copy, '# Review, through the copy')
			expectLeft(root)
		})
	})

	it('R8: a file left for the user stops no other file', () => {
		const root = agreedRepository({ 'review/SKILL.md': '# Review', 'lint/SKILL.md': '# Lint' })
		write(root, copy, '# Review, through the copy')
		write(root, canonical, '# Review, in place')
		write(root, '.claude/skills/lint/SKILL.md', '# Lint, through the copy')

		const result = sync(root)

		expect(read(root, '.agents/skills/lint/SKILL.md')).toBe('# Lint, through the copy')
		expect(result.left).toEqual([{ bridge: '.claude/skills', path: copy }])
		expect(result.written).toEqual([{ bridge: '.claude/skills', path: '.claude/skills/lint/SKILL.md', side: 'copy' }])
	})

	it('R9: a resolution writes the picked side to both sides', () => {
		const root = agreedRepository({ 'review/SKILL.md': '# Review', 'lint/SKILL.md': '# Lint' })
		write(root, copy, '# Review, through the copy')
		write(root, canonical, '# Review, in place')
		write(root, '.claude/skills/lint/SKILL.md', '# Lint, through the copy')
		write(root, '.agents/skills/lint/SKILL.md', '# Lint, in place')

		const result = sync(root, [
			{ path: copy, side: 'copy' },
			{ path: '.claude/skills/lint/SKILL.md', side: 'canonical' },
		])

		expect(read(root, canonical)).toBe('# Review, through the copy')
		expect(read(root, '.claude/skills/lint/SKILL.md')).toBe('# Lint, in place')
		expect(result).toMatchObject({ outcome: 'synced', left: [] })
		expect(result.written).toEqual([
			{ bridge: '.claude/skills', path: '.claude/skills/lint/SKILL.md', side: 'canonical' },
			{ bridge: '.claude/skills', path: copy, side: 'copy' },
		])
	})

	it('R9: a resolution removes the file from both sides when the picked side lacks it', () => {
		const root = plainDirectory()
		write(root, '.claude/skills/review/SKILL.md', '# Review')
		write(root, '.claude/skills/extra/SKILL.md', '# Only in the copy')
		write(root, '.agents/skills/kept/SKILL.md', '# Only in canonical')

		sync(root, [
			{ path: '.claude/skills/extra/SKILL.md', side: 'canonical' },
			{ path: '.claude/skills/kept/SKILL.md', side: 'copy' },
		])

		expect(read(root, '.claude/skills/extra/SKILL.md')).toBeUndefined()
		expect(read(root, '.agents/skills/kept/SKILL.md')).toBeUndefined()
	})

	describe('R10: a resolution for a file not left for the user is refused before anything is written', () => {
		function expectRefused(root: string, resolutions: SyncResolution[], entry: string): void {
			const before = snapshot(root)
			expect(refusal(() => sync(root, resolutions))).toEqual({ code: 'unneeded-resolution', entries: [entry] })
			expect(changed(before, snapshot(root))).toEqual([])
		}

		it('one the same on both sides', () => {
			const root = agreedRepository()
			write(root, '.claude/skills/lint/SKILL.md', '# Lint, through the copy')
			expectRefused(root, [{ path: copy, side: 'copy' }], copy)
		})

		it('one only one side changed', () => {
			const root = agreedRepository()
			write(root, copy, '# Review, through the copy')
			expectRefused(root, [{ path: copy, side: 'canonical' }], copy)
		})

		it('one in neither side, or through no copy bridge', () => {
			const root = agreedRepository()
			write(root, copy, '# Review, through the copy')
			expectRefused(root, [{ path: '.claude/skills/none.md', side: 'copy' }], '.claude/skills/none.md')
			expectRefused(
				root,
				[{ path: '.windsurf/skills/review/SKILL.md', side: 'copy' }],
				'.windsurf/skills/review/SKILL.md',
			)
		})

		it('any, when no bridge is a copy', () => {
			const root = plainDirectory()
			expectRefused(root, [{ path: copy, side: 'copy' }], copy)
		})
	})

	it('R11: writes nothing outside the copies and the canonical directory but the clone exclude file', () => {
		const root = agreedRepository()
		write(root, 'AGENTS.md', '# Instructions')
		write(root, '.gitignore', 'node_modules\n')
		commitAll(root)
		write(root, copy, '# Review, through the copy')
		const before = snapshot(root)

		sync(root)

		expect(changed(before, snapshot(root))).toEqual([canonical])
		expect(read(root, '.git/info/exclude')).toContain('/.claude/skills/\n')
	})

	describe('several copies', () => {
		function twoCopies(): string {
			const root = emptyRepository()
			for (const directory of ['.agents/skills', '.claude/skills', '.windsurf/skills'])
				write(root, `${directory}/review/SKILL.md`, '# Review')
			commitAll(root)
			return root
		}

		it('R19: leaves a file two copies changed differently unchanged in every copy and the canonical directory', () => {
			const root = twoCopies()
			write(root, copy, '# Review, through Claude Code')
			write(root, '.windsurf/skills/review/SKILL.md', '# Review, through Windsurf')
			const before = snapshot(root)

			const result = sync(root)

			expect(changed(before, snapshot(root))).toEqual([])
			expect(result.left).toEqual([
				{ bridge: '.claude/skills', path: copy },
				{ bridge: '.windsurf/skills', path: '.windsurf/skills/review/SKILL.md' },
			])
		})

		it('carries an edit made through one copy into the canonical directory and every other copy', () => {
			const root = twoCopies()
			write(root, copy, '# Review, through Claude Code')

			const result = sync(root)

			expect(read(root, canonical)).toBe('# Review, through Claude Code')
			expect(read(root, '.windsurf/skills/review/SKILL.md')).toBe('# Review, through Claude Code')
			expect(result.written).toEqual([
				{ bridge: '.claude/skills', path: copy, side: 'copy' },
				{ bridge: '.windsurf/skills', path: '.windsurf/skills/review/SKILL.md', side: 'canonical' },
			])
		})

		it('keeps a copy-side edit out of the canonical directory while another copy waits for a pick', () => {
			const root = twoCopies()
			write(root, copy, '# Review, through Claude Code')
			write(root, '.windsurf/skills/review/SKILL.md', '# Review, through Windsurf')
			write(root, canonical, '# Review, in place')
			const before = snapshot(root)

			expect(sync(root).left).toHaveLength(2)
			expect(changed(before, snapshot(root))).toEqual([])
		})

		it('lets one copy take the canonical version while another waits for a pick', () => {
			const root = twoCopies()
			write(root, canonical, '# Review, in place')
			write(root, '.windsurf/skills/review/SKILL.md', '# Review, through Windsurf')

			const result = sync(root)

			expect(read(root, copy)).toBe('# Review, in place')
			expect(read(root, '.windsurf/skills/review/SKILL.md')).toBe('# Review, through Windsurf')
			expect(result.left).toEqual([{ bridge: '.windsurf/skills', path: '.windsurf/skills/review/SKILL.md' }])
		})

		it('leaves a copy that already holds the canonical version untouched while another waits for a pick', () => {
			const root = twoCopies()
			write(root, canonical, '# Review, in place')
			write(root, '.windsurf/skills/review/SKILL.md', '# Review, in place')
			write(root, copy, '# Review, through Claude Code')

			const result = sync(root)

			expect(result.written).toEqual([])
			expect(result.left).toEqual([{ bridge: '.claude/skills', path: copy }])
		})

		it('applies one copy pick to the canonical directory and every copy that waits on it', () => {
			const root = twoCopies()
			write(root, copy, '# Review, through Claude Code')
			write(root, '.windsurf/skills/review/SKILL.md', '# Review, through Claude Code')
			write(root, canonical, '# Review, in place')

			sync(root, [
				{ path: copy, side: 'copy' },
				{ path: '.windsurf/skills/review/SKILL.md', side: 'copy' },
			])

			expect(read(root, canonical)).toBe('# Review, through Claude Code')
		})

		it('refuses picks that would leave the copies holding different versions', () => {
			const root = twoCopies()
			write(root, copy, '# Review, through Claude Code')
			write(root, '.windsurf/skills/review/SKILL.md', '# Review, through Windsurf')
			const windsurf = '.windsurf/skills/review/SKILL.md'
			const before = snapshot(root)

			for (const resolutions of [
				[{ path: copy, side: 'copy' as const }],
				[
					{ path: copy, side: 'copy' as const },
					{ path: windsurf, side: 'copy' as const },
				],
				[
					{ path: copy, side: 'copy' as const },
					{ path: windsurf, side: 'canonical' as const },
				],
			]) {
				expect(refusal(() => sync(root, resolutions)).code).toBe('conflicting-resolution')
			}
			expect(changed(before, snapshot(root))).toEqual([])
		})
	})

	it('R20: with the canonical directory missing, writes nothing and fails saying so', () => {
		const root = agreedRepository()
		remove(root, '.agents/skills')
		const before = snapshot(root)

		expect(refusal(() => sync(root))).toEqual({ code: 'canonical-missing', entries: ['.claude/skills'] })
		expect(changed(before, snapshot(root))).toEqual([])
	})

	it('R20: with the canonical directory missing and no copy, succeeds writing nothing', () => {
		const root = emptyRepository()
		const before = snapshot(root)

		expect(sync(root)).toMatchObject({ outcome: 'synced', copies: [] })
		expect(changed(before, snapshot(root))).toEqual([])
	})
})

describe('protecting a copy (copy-sync R12, R13)', () => {
	function expectHidden(root: string): void {
		expect(git(root, 'status', '--porcelain')).toBe('')
		git(root, 'add', '-A')
		expect(git(root, 'diff', '--cached', '--name-only')).toBe('')
	}

	it('R12: protects a tracked copy the sync wrote nothing into', () => {
		const root = agreedRepository()

		expect(diagnoseBridges({ root, cli: 'bah' }).findings.map((finding) => finding.problem)).toEqual(['unpinned-copy'])
		expect(sync(root).protected).toEqual(['.claude/skills'])
		expect(diagnoseBridges({ root, cli: 'bah' }).findings).toEqual([])
		write(root, '.claude/skills/scratch.md', 'not to be committed')
		write(root, copy, '# Review, edited later')
		expectHidden(root)
	})

	it('R12: protects a tracked copy it synced, so its writes show only in the canonical directory', () => {
		const root = agreedRepository({ 'review/SKILL.md': '# Review', 'old/SKILL.md': '# Old' })
		write(root, canonical, '# Review, in place')
		remove(root, '.agents/skills/old')
		commitAll(root, 'canonical moved')

		sync(root)

		expect(read(root, copy)).toBe('# Review, in place')
		expectHidden(root)
	})

	// Skip-worktree alone leaves the copy's files addable when the committed bridge is a symlink:
	// they are untracked paths under it.
	it('R12: protects a copy over a bridge committed as a symlink', () => {
		const root = emptyRepository()
		write(root, canonical, '# Review')
		link(root, '.claude/skills')
		commitAll(root)
		remove(root, '.claude/skills')
		write(root, copy, '# Review')

		expect(sync(root).protected).toEqual(['.claude/skills'])
		expectHidden(root)
	})

	it('R12: protects a copy in a linked worktree, through the exclude file its clone shares', () => {
		const main = agreedRepository()
		const worktree = `${main}-worktree`
		git(main, 'worktree', 'add', '-q', worktree)

		expect(sync(worktree).protected).toEqual(['.claude/skills'])
		write(worktree, '.claude/skills/scratch.md', 'not to be committed')
		expectHidden(worktree)
		expect(read(main, '.git/info/exclude')).toContain('/.claude/skills/\n')
	})

	it('R12: adds the exclude line once, on a line of its own', () => {
		const root = agreedRepository()
		writeFileSync(join(root, '.git', 'info', 'exclude'), '*.log')

		sync(root)
		sync(root)

		expect(read(root, '.git/info/exclude')).toBe('*.log\n/.claude/skills/\n')
	})

	it('R12: creates the exclude file when the clone has none', () => {
		const root = agreedRepository()
		remove(root, '.git/info')

		sync(root)

		expect(read(root, '.git/info/exclude')).toBe('/.claude/skills/\n')
	})

	it('R13: protects no untracked copy and never writes .gitignore', () => {
		const root = emptyRepository()
		write(root, canonical, '# Review')
		commitAll(root)
		write(root, copy, '# Review')

		expect(sync(root).protected).toEqual([])
		expect(read(root, '.gitignore')).toBeUndefined()
		expect(read(root, '.git/info/exclude') ?? '').not.toContain('.claude/skills')
	})
})

describe('syncCopyBridges', () => {
	it('syncs only the bridges it is given, once each', () => {
		const root = agreedRepository()
		write(root, copy, '# Review, through the copy')

		expect(syncCopyBridges({ root, bridges: ['.claude/skills', '.claude/skills'] }).copies).toEqual(['.claude/skills'])
		expect(syncCopyBridges({ root, bridges: [] }).copies).toEqual([])
	})
})
