import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

const mockedSymlinkSync = vi.hoisted(() => vi.fn())
const mockedPlatform = vi.hoisted(() => vi.fn(() => 'win32'))

vi.mock('node:fs', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:fs')>()
	return { ...actual, symlinkSync: mockedSymlinkSync }
})

vi.mock('node:os', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:os')>()
	return { ...actual, platform: mockedPlatform }
})

import { initializeHarnesses } from '../initialize-harnesses/initialize-harnesses.ts'

function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-win-'))
	mkdirSync(join(root, '.agents', 'skills', 'review'), { recursive: true })
	writeFileSync(join(root, '.agents', 'skills', 'review', 'SKILL.md'), '# Review')
	return root
}

describe('on Windows', () => {
	it('writes a junction to an absolute target', () => {
		const root = repository()

		initializeHarnesses({ root })

		expect(mockedSymlinkSync).toHaveBeenCalled()
		const [target, path, type] = mockedSymlinkSync.mock.calls[0] as [string, string, string]
		// Node resolves a relative junction target against the process directory rather than the
		// link's own, so a relative target would point somewhere else entirely.
		expect(isAbsolute(target)).toBe(true)
		expect(target).toBe(join(root, '.agents', 'skills'))
		expect(path).toBe(join(root, '.claude', 'skills'))
		expect(type).toBe('junction')
	})
})
