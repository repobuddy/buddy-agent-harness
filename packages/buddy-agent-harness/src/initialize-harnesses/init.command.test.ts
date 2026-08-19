import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { doctorCommand } from '../diagnose-bridges/doctor.command.ts'
import { activate, harnessCommand, initCommand } from './init.command.ts'
import { initializeHarnesses } from './initialize-harnesses.ts'

vi.mock('./initialize-harnesses.ts', () => ({ initializeHarnesses: vi.fn() }))

const mockedInitializeHarnesses = vi.mocked(initializeHarnesses)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function run(args: { copy?: boolean; force?: boolean; format?: string; harness?: string; root?: string }): number {
	return (initCommand as { run(value: typeof args): number }).run(args)
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
			deprecated: [],
			skills: 1,
			copied: true,
		})

		run({ copy: true, force: true, format: 'json', root: '/workspace' })

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
			deprecated: [],
			skills: 0,
			copied: false,
		})

		run({ format: 'toon' })

		expect(mockedInitializeHarnesses).toHaveBeenCalledWith({
			root: process.cwd(),
		})
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('copied'))
	})

	// Returned rather than written: a caller that is not the process learns of the failure too.
	it('reports invalid formats and initialization failures', () => {
		expect(run({ format: 'yaml', root: '/workspace' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: --format must be toon, json, or text.\n')

		stderr.mockClear()
		mockedInitializeHarnesses.mockImplementationOnce(() => {
			throw 'unavailable'
		})
		expect(run({ format: 'json', root: '/workspace' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: Harness initialization failed.\n')
		expect(process.exitCode).toBeUndefined()
	})

	it('passes requested harnesses through and rejects unsupported names', () => {
		mockedInitializeHarnesses.mockReturnValue({
			root: '/workspace',
			harnesses: ['claude-code', 'cursor', 'windsurf'],
			native: ['cursor'],
			linked: ['claude-code', 'windsurf'],
			deprecated: [{ name: 'windsurf', replacedBy: 'devin-desktop' }],
			skills: 0,
			copied: false,
		})

		expect(run({ format: 'json', harness: 'windsurf, codex', root: '/workspace' })).toBe(0)

		expect(mockedInitializeHarnesses).toHaveBeenCalledWith({
			root: '/workspace',
			harnesses: ['windsurf', 'codex'],
		})

		expect(run({ format: 'json', harness: 'aider', root: '/workspace' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Unsupported harness: aider'))
	})

	it('registers its command group', () => {
		const addCommand = vi.fn()

		activate({ addCommand })

		expect(addCommand).toHaveBeenCalledWith(harnessCommand)
		// The mounted name is what consumers type, so it is pinned here rather than left to the object.
		expect(harnessCommand.name).toBe('agent-harness')
		expect(harnessCommand.commands).toEqual([initCommand, doctorCommand])
	})
})
