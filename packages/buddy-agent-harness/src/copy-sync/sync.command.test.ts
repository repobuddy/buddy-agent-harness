import { basename, dirname } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from '../cli.ts'
import { runCommandSync } from '../command-output/run-command.test-helper.ts'
import { agreedRepository, changed, plainDirectory, read, remove, snapshot, write } from './copy-sync.test-helper.ts'
import { syncCommand } from './sync.command.ts'

const unforeseen = vi.hoisted(() => ({ throw: false }))
const home = vi.hoisted(() => ({ directory: undefined as string | undefined }))

vi.mock('node:os', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:os')>()
	return { ...actual, homedir: () => home.directory ?? actual.homedir() }
})

vi.mock('./copy-sync.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./copy-sync.ts')>()
	return {
		...actual,
		syncSkillCopies: (options: Parameters<typeof actual.syncSkillCopies>[0]) => {
			if (unforeseen.throw) throw 'not an error'
			return actual.syncSkillCopies(options)
		},
	}
})

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

const stdoutText = () => stdout.mock.calls.map(([value]) => String(value)).join('')
const copy = '.claude/skills/review/SKILL.md'

function bah(...args: string[]): Promise<number> {
	return run(['node', 'buddy-agent-harness', 'sync', ...args])
}

beforeEach(() => {
	stdout.mockClear()
	stderr.mockClear()
})

afterEach(() => {
	process.exitCode = undefined
})

describe('the sync command', () => {
	it('R16: answers in TOON when no format is named', async () => {
		const root = agreedRepository()
		write(root, copy, '# Review, through the copy')

		expect(await bah('--root', root)).toBe(0)

		const text = stdoutText()
		expect(text).toContain('outcome: synced')
		expect(text).toMatch(/written\[1\]\{bridge,path,side\}:/)
		expect(text).toContain('.claude/skills,.claude/skills/review/SKILL.md,copy')
		expect(() => JSON.parse(text)).toThrow()
	})

	it('R14, R18: names each file written with its side, and each left, telling the two outcomes apart', async () => {
		const root = agreedRepository({ 'review/SKILL.md': '# Review', 'lint/SKILL.md': '# Lint' })
		write(root, copy, '# Review, through the copy')
		write(root, '.agents/skills/review/SKILL.md', '# Review, in place')
		write(root, '.agents/skills/lint/SKILL.md', '# Lint, in place')

		expect(await bah('--root', root, '--format', 'json')).toBe(0)
		expect(JSON.parse(stdoutText())).toMatchObject({
			outcome: 'files-left',
			written: [{ bridge: '.claude/skills', path: '.claude/skills/lint/SKILL.md', side: 'canonical' }],
			left: [{ bridge: '.claude/skills', path: copy }],
		})

		stdout.mockClear()
		expect(await bah('--root', root, '--resolve', `${copy}=copy`, '--format', 'json')).toBe(0)
		expect(JSON.parse(stdoutText())).toMatchObject({ outcome: 'synced', left: [] })
		expect(read(root, '.agents/skills/review/SKILL.md')).toBe('# Review, through the copy')
	})

	it('R10, R17, R18: refuses a resolution before writing, naming it, in the requested format', async () => {
		const root = agreedRepository()
		write(root, copy, '# Review, through the copy')
		const before = snapshot(root)

		expect(await bah('--root', root, '--resolve', `${copy}=theirs`, '--format', 'json')).toBe(2)
		expect(JSON.parse(stdoutText())).toMatchObject({
			code: 'invalid-resolution',
			entries: [`${copy}=theirs`],
			help: [expect.stringContaining('<bridge>/<file>=<canonical|copy>')],
		})

		stdout.mockClear()
		expect(await bah('--root', root, '--resolve', `${copy}=copy`, '--format', 'json')).toBe(2)
		expect(JSON.parse(stdoutText())).toMatchObject({ code: 'unneeded-resolution', entries: [copy] })
		expect(changed(before, snapshot(root))).toEqual([])
		expect(stderr).not.toHaveBeenCalled()
	})

	it('R18, R20: fails with its own code when the canonical directory is missing', async () => {
		const root = agreedRepository()
		remove(root, '.agents/skills')

		expect(await bah('--root', root, '--format', 'json')).toBe(1)
		expect(JSON.parse(stdoutText())).toMatchObject({ code: 'canonical-missing', entries: ['.claude/skills'] })
	})

	it('R15: refuses an output form it does not support before writing anything', async () => {
		const root = agreedRepository()
		write(root, copy, '# Review, through the copy')
		const before = snapshot(root)

		expect(await bah('--root', root, '--format', 'yaml')).toBe(2)
		expect(changed(before, snapshot(root))).toEqual([])
	})

	it('works from the current directory when no root is given', () => {
		const root = plainDirectory()
		const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root)
		try {
			expect(runCommandSync(syncCommand, {})).toBe(0)
		} finally {
			cwd.mockRestore()
		}
		expect(JSON.parse(stdoutText())).toMatchObject({ root, copies: [] })
	})

	it('writes a root under the home directory from ~', () => {
		const root = plainDirectory()
		home.directory = dirname(root)
		try {
			expect(runCommandSync(syncCommand, { root })).toBe(0)
		} finally {
			home.directory = undefined
		}
		expect(JSON.parse(stdoutText())).toMatchObject({ root: `~/${basename(root)}` })
	})

	it('answers an unforeseen failure with the shared code', () => {
		unforeseen.throw = true
		try {
			expect(runCommandSync(syncCommand, { root: plainDirectory() })).toBe(1)
		} finally {
			unforeseen.throw = false
		}
		expect(JSON.parse(stdoutText())).toMatchObject({ code: 'command-failed', error: 'Skills copy sync failed.' })
	})
})
