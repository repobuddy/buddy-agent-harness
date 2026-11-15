import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Format } from 'clibuilder/axi'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCommandSync } from '../command-output/run-command.test-helper.ts'
import { repositoryRoot } from '../copy-sync/copy-sync.ts'
import { syncCommand } from '../copy-sync/sync.command.ts'
import { doctorCommand } from '../diagnose-bridges/doctor.command.ts'
import { governanceCommand } from '../governance-overrides/governance.command.ts'
import { referenceCommand } from '../references/references.ts'
import { activate, harnessCommand, initCommand } from './init.command.ts'
import { initializeHarnesses } from './initialize-harnesses.ts'

vi.mock('./initialize-harnesses.ts', () => ({ initializeHarnesses: vi.fn() }))

const mockedInitializeHarnesses = vi.mocked(initializeHarnesses)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

const stdoutText = () => stdout.mock.calls.map(([value]) => String(value)).join('')

function run({
	format = 'toon',
	...args
}: {
	copy?: boolean
	force?: string
	format?: Format
	harness?: string
	root?: string
}): number {
	return runCommandSync(initCommand, args, format)
}

beforeEach(() => {
	mockedInitializeHarnesses.mockReset()
	stderr.mockClear()
	stdout.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

describe('init command', () => {
	it('initializes harnesses with explicit options and emits JSON', () => {
		mockedInitializeHarnesses.mockReturnValue({
			root: '/workspace',
			harnesses: ['claude-code'],
			native: [],
			linked: ['claude-code'],
			skipped: [],
			deprecated: [],
			skills: 1,
			references: 0,
			copied: true,
			written: [],
			left: [],
		})

		run({ copy: true, force: 'true', format: 'json', root: '/workspace' })

		expect(mockedInitializeHarnesses).toHaveBeenCalledWith({
			root: '/workspace',
			copy: true,
			force: true,
		})
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('"copied":true'))
	})

	it('uses the working directory and TOON when options are omitted', () => {
		mockedInitializeHarnesses.mockReturnValue({
			root: process.cwd(),
			harnesses: ['claude-code'],
			native: [],
			linked: ['claude-code'],
			skipped: [],
			deprecated: [],
			skills: 0,
			references: 0,
			copied: false,
			written: [],
			left: [],
		})

		run({ format: 'toon' })

		expect(mockedInitializeHarnesses).toHaveBeenCalledWith({
			root: repositoryRoot(process.cwd()),
		})
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('copied'))
	})

	describe('the root it sets up', () => {
		const temp = () => realpathSync(mkdtempSync(join(tmpdir(), 'init-root-')))

		it('is the repository root when run from a nested directory of a Git repository', () => {
			const repository = temp()
			execFileSync('git', ['init', '-q'], { cwd: repository })
			const nested = join(repository, 'packages', 'app')
			mkdirSync(nested, { recursive: true })
			mockedInitializeHarnesses.mockReturnValue({} as ReturnType<typeof initializeHarnesses>)

			run({ root: nested })

			expect(mockedInitializeHarnesses).toHaveBeenCalledWith({ root: repository })
		})

		it('is a --root outside Git as given', () => {
			const folder = temp()
			mockedInitializeHarnesses.mockReturnValue({} as ReturnType<typeof initializeHarnesses>)

			run({ root: folder })

			expect(mockedInitializeHarnesses).toHaveBeenCalledWith({ root: folder })
		})
	})

	// Returned rather than written: a caller that is not the process learns of the failure too.
	it('reports initialization failures', () => {
		mockedInitializeHarnesses.mockImplementationOnce(() => {
			throw 'unavailable'
		})
		expect(run({ format: 'json', root: '/workspace' })).toBe(1)
		expect(JSON.parse(stdoutText())).toMatchObject({ error: 'Harness initialization failed.', code: 'command-failed' })
		expect(stderr).not.toHaveBeenCalled()
		expect(process.exitCode).toBeUndefined()
	})

	it('passes requested harnesses through and rejects unsupported names', () => {
		mockedInitializeHarnesses.mockReturnValue({
			root: '/workspace',
			harnesses: ['claude-code', 'cursor', 'windsurf'],
			native: ['cursor'],
			linked: ['claude-code', 'windsurf'],
			skipped: [],
			deprecated: [{ name: 'windsurf', replacedBy: 'devin-desktop' }],
			skills: 0,
			references: 0,
			copied: false,
			written: [],
			left: [],
		})

		expect(run({ format: 'json', harness: 'windsurf, codex', root: '/workspace' })).toBe(0)

		expect(mockedInitializeHarnesses).toHaveBeenCalledWith({
			root: '/workspace',
			harnesses: ['windsurf', 'codex'],
		})

		stdout.mockClear()
		expect(run({ format: 'json', harness: 'aider', root: '/workspace' })).toBe(2)
		expect(JSON.parse(stdoutText())).toMatchObject({
			error: expect.stringContaining('Unsupported harness: aider'),
			code: 'unsupported-harness',
		})
	})

	it('registers its command group', () => {
		const addCommand = vi.fn()

		activate({ addCommand })

		expect(addCommand).toHaveBeenCalledWith(harnessCommand)
		// The mounted name is what consumers type, so it is pinned here rather than left to the object.
		expect(harnessCommand.name).toBe('agent-harness')
		expect(harnessCommand.commands).toEqual([
			initCommand,
			syncCommand,
			doctorCommand,
			referenceCommand,
			governanceCommand,
		])
	})
})
