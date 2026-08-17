import { cli } from 'clibuilder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { main } from './cli.ts'
import { doctorCommand } from './diagnose-bridges/doctor.command.ts'
import * as publicApi from './index.ts'
import { activate, initCommand } from './initialize-harnesses/init.command.ts'

vi.mock('clibuilder', async (importOriginal) => {
	const actual = await importOriginal<typeof import('clibuilder')>()
	return { ...actual, cli: vi.fn() }
})

const mockedCli = vi.mocked(cli)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

beforeEach(() => {
	mockedCli.mockReset()
	stdout.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

describe('CLI and public entry point', () => {
	it('exports the plugin API and parses the command line', async () => {
		const parse = vi.fn(async () => undefined)
		const command: ReturnType<typeof vi.fn> = vi.fn(() => ({ command, parse }))
		mockedCli.mockReturnValue({ command } as never)

		await main()

		expect(publicApi.activate).toBe(activate)
		expect(publicApi.initCommand).toBe(initCommand)
		expect(publicApi.doctorCommand).toBe(doctorCommand)
		expect(command).toHaveBeenCalledWith(initCommand)
		expect(command).toHaveBeenCalledWith(doctorCommand)
		expect(parse).toHaveBeenCalledWith(process.argv)
	})

	it('reports Error and non-Error command-line failures', async () => {
		const parse = vi.fn(async () => Promise.reject(new Error('bad options')))
		const command: ReturnType<typeof vi.fn> = vi.fn(() => ({ command, parse }))
		mockedCli.mockReturnValue({ command } as never)

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
