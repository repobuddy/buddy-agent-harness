import { cli } from 'clibuilder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { main } from './cli.ts'
import { initializeHarnesses } from './harness.ts'
import * as publicApi from './index.ts'
import { activate, harnessCommand, initCommand } from './plugin.ts'

vi.mock('./harness.ts', () => ({ initializeHarnesses: vi.fn() }))

vi.mock('clibuilder', async (importOriginal) => {
	const actual = await importOriginal<typeof import('clibuilder')>()
	return { ...actual, cli: vi.fn() }
})

const mockedCli = vi.mocked(cli)
const mockedInitializeHarnesses = vi.mocked(initializeHarnesses)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function run(args: { copy?: boolean; force?: boolean; format?: string; root?: string }): void {
	;(initCommand as { run(value: typeof args): void }).run(args)
}

beforeEach(() => {
	mockedCli.mockReset()
	mockedInitializeHarnesses.mockReset()
	stderr.mockClear()
	stdout.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

describe('plugin command', () => {
	it('initializes harnesses with explicit options and emits JSON', () => {
		mockedInitializeHarnesses.mockReturnValue({
			root: '/workspace',
			harnesses: ['claude-code'],
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
		expect(stderr).toHaveBeenCalledWith('error: --format must be toon or json.\n')
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

	it('registers its command group', () => {
		const addCommand = vi.fn()

		activate({ addCommand })

		expect(addCommand).toHaveBeenCalledWith(harnessCommand)
		expect(harnessCommand.commands).toEqual([initCommand])
	})
})

describe('CLI and public entry point', () => {
	it('exports the plugin API and parses the command line', async () => {
		const parse = vi.fn(async () => undefined)
		const command = vi.fn(() => ({ parse }))
		mockedCli.mockReturnValue({ command } as never)

		await main()

		expect(publicApi.activate).toBe(activate)
		expect(publicApi.initCommand).toBe(initCommand)
		expect(command).toHaveBeenCalledWith(initCommand)
		expect(parse).toHaveBeenCalledWith(process.argv)
	})

	it('reports Error and non-Error command-line failures', async () => {
		const parse = vi.fn(async () => Promise.reject(new Error('bad options')))
		mockedCli.mockReturnValue({ command: vi.fn(() => ({ parse })) } as never)

		await main()

		expect(stdout).toHaveBeenCalledWith('error: bad options\n')
		expect(process.exitCode).toBe(2)

		stdout.mockClear()
		process.exitCode = undefined
		parse.mockImplementationOnce(async () => Promise.reject('bad options'))
		await main()
		expect(stdout).toHaveBeenCalledWith('error: Invalid command.\n')
		expect(process.exitCode).toBe(2)
	})
})
