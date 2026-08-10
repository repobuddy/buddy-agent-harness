import { lstatSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const mockedSymlinkSync = vi.hoisted(() => vi.fn())

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>()
	return { ...actual, symlinkSync: mockedSymlinkSync }
})

import { initializeHarnesses } from './harness.ts'

function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-'))
	mkdirSync(join(root, '.agents', 'skills', 'review'), { recursive: true })
	writeFileSync(join(root, '.agents', 'skills', 'review', 'SKILL.md'), '# Review')
	return root
}

describe('link fallback', () => {
	it('copies a skill when symbolic links are unavailable', () => {
		mockedSymlinkSync.mockImplementationOnce(() => {
			throw new Error('links unavailable')
		})

		const root = repository()
		initializeHarnesses({ root })

		expect(lstatSync(join(root, '.claude', 'skills', 'review')).isSymbolicLink()).toBe(false)
	})

	it('preserves a concurrent target instead of overwriting it after a link failure', () => {
		const root = repository()
		const target = join(root, '.claude', 'skills', 'review')
		const failure = new Error('target appeared')
		mockedSymlinkSync.mockImplementationOnce(() => {
			mkdirSync(join(root, '.claude', 'skills'), { recursive: true })
			writeFileSync(target, 'another process')
			throw failure
		})

		expect(() => initializeHarnesses({ root })).toThrow(failure)
	})
})
