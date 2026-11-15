import { describe, expect, it, vi } from 'vitest'

const failingCopy = vi.hoisted(() => vi.fn())

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>()
	return { ...actual, copyFileSync: failingCopy }
})

import { agreedRepository, read, write } from './copy-sync.test-helper.ts'
import { SyncError, syncSkillCopies } from './copy-sync.ts'

describe('a write that fails (copy-sync UC1.6)', () => {
	it('fails the run with its own code, saying what stopped it', () => {
		failingCopy.mockImplementation(() => {
			throw new Error('EACCES: permission denied')
		})
		const root = agreedRepository()
		write(root, '.claude/skills/review/SKILL.md', '# Review, through the copy')

		const failure = (() => {
			try {
				syncSkillCopies({ root })
			} catch (error) {
				return error
			}
			return undefined
		})()

		expect(failure).toBeInstanceOf(SyncError)
		expect(failure).toMatchObject({ code: 'write-failed', message: expect.stringContaining('EACCES') })
		expect(read(root, '.agents/skills/review/SKILL.md')).toBe('# Review')
	})
})
