import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { doctorCommand } from '../diagnose-bridges/doctor.command.ts'
import { activate, harnessCommand, initCommand } from './init.command.ts'
import { initializeHarnesses } from './initialize-harnesses.ts'

vi.mock('./initialize-harnesses.ts', () => ({ initializeHarnesses: vi.fn() }))

const mockedInitializeHarnesses = vi.mocked(initializeHarnesses)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function run(args: { copy?: boolean; force?: boolean; format?: string; harness?: string; root?: string }): void {
	;(initCommand as { run(value: typeof args): void }).run(args)
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
		expect(process.exitCode).toBeUndefined()
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

	it('reports invalid formats and initialization failures', () => {
		run({ format: 'yaml', root: '/workspace' })
		expect(stderr).toHaveBeenCalledWith('error: --format must be toon, json, or text.\n')
		expect(process.exitCode).toBe(1)

		stderr.mockClear()
		process.exitCode = undefined
		mockedInitializeHarnesses.mockImplementationOnce(() => {
			throw 'unavailable'
		})
		run({ format: 'json', root: '/workspace' })
		expect(stderr).toHaveBeenCalledWith('error: Harness initialization failed.\n')
		expect(process.exitCode).toBe(1)
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

		run({ format: 'json', harness: 'windsurf, codex', root: '/workspace' })

		expect(mockedInitializeHarnesses).toHaveBeenCalledWith({
			root: '/workspace',
			harnesses: ['windsurf', 'codex'],
		})

		process.exitCode = undefined
		run({ format: 'json', harness: 'aider', root: '/workspace' })
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Unsupported harness: aider'))
		expect(process.exitCode).toBe(1)
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
