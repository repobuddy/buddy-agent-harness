import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cli } from 'clibuilder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { run } from './cli.ts'
import { buildDoctorReport, doctorCommand } from './diagnose-bridges/doctor.command.ts'
import * as publicApi from './index.ts'
import { activate, initCommand } from './initialize-harnesses/init.command.ts'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

vi.mock('clibuilder', async (importOriginal) => {
	const actual = await importOriginal<typeof import('clibuilder')>()
	return { ...actual, cli: vi.fn() }
})

const mockedCli = vi.mocked(cli)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

/** A stand-in for the built application, resolving `parse` to whatever the command would return. */
function stubApp(parse: ReturnType<typeof vi.fn>) {
	const command: ReturnType<typeof vi.fn> = vi.fn(() => ({ command, parse }))
	mockedCli.mockReturnValue({ command } as never)
	return command
}

beforeEach(() => {
	mockedCli.mockReset()
	stdout.mockClear()
	stderr.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

describe('run', () => {
	it('takes the whole argv, so a caller composes one instead of splicing the global', async () => {
		const parse = vi.fn(async () => undefined)
		const command = stubApp(parse)
		const argv = [...process.argv.slice(0, 2), 'doctor', '--format', 'json']
		const before = [...process.argv]

		await run(argv)

		expect(command).toHaveBeenCalledWith(initCommand)
		expect(command).toHaveBeenCalledWith(doctorCommand)
		expect(parse).toHaveBeenCalledWith(argv)
		expect(process.argv).toEqual(before)
	})

	it('builds the application per call, so one invocation cannot leak into the next', async () => {
		stubApp(vi.fn(async () => undefined))

		await run(['node', 'buddy-agent-harness', 'doctor'])
		await run(['node', 'buddy-agent-harness', 'init'])

		expect(mockedCli).toHaveBeenCalledTimes(2)
	})

	it('returns 0 when the command did what was asked', async () => {
		stubApp(vi.fn(async () => undefined))

		await expect(run(['node', 'buddy-agent-harness', 'doctor'])).resolves.toBe(0)
	})

	it('returns the code the command reported', async () => {
		stubApp(vi.fn(async () => 1))

		await expect(run(['node', 'buddy-agent-harness', 'doctor'])).resolves.toBe(1)
	})

	it('writes the failure to stderr, not to the stream the report is parsed from', async () => {
		stubApp(vi.fn(async () => Promise.reject(new Error('bad options'))))

		await run(['node', 'buddy-agent-harness', 'doctor'])

		expect(stderr).toHaveBeenCalledWith('error: bad options\n')
		expect(stdout).not.toHaveBeenCalled()
	})

	it('still reports a failure it cannot read a message from', async () => {
		stubApp(vi.fn(async () => Promise.reject('bad options')))

		await run(['node', 'buddy-agent-harness', 'doctor'])

		expect(stderr).toHaveBeenCalledWith('error: Invalid command.\n')
	})

	// The one exit path `run`'s return cannot carry, so it runs against the real clibuilder rather
	// than the stub: a stub could only re-assert the design instead of testing it.
	it('returns 0 when clibuilder rejected the invocation and recorded the code itself', async () => {
		const { cli: actualCli } = await vi.importActual<typeof import('clibuilder')>('clibuilder')
		mockedCli.mockImplementation(actualCli as typeof cli)

		await expect(run(['node', 'buddy-agent-harness', 'doctor', '--nope'])).resolves.toBe(0)
		expect(process.exitCode).toBe(2)
	})

	it('returns the usage code when the invocation could not be parsed', async () => {
		stubApp(vi.fn(async () => Promise.reject(new Error('bad options'))))

		await expect(run(['node', 'buddy-agent-harness', 'doctor'])).resolves.toBe(2)
	})

	it('neither reads process.argv nor writes process.exitCode', async () => {
		stubApp(vi.fn(async () => 1))

		await run(['node', 'buddy-agent-harness', 'doctor'])

		expect(process.exitCode).toBeUndefined()
		const source = readFileSync(new URL('./cli.ts', import.meta.url), 'utf8')
		// The prose above the code names both, so only the code is searched.
		const code = source.replaceAll(/\/\*\*[\s\S]*?\*\/|\/\/.*$/gm, '')
		expect(code).not.toContain('process.argv')
		expect(code).not.toContain('process.exitCode')
	})

	it('reports the version the package manifest carries', async () => {
		stubApp(vi.fn(async () => undefined))

		await run(['node', 'buddy-agent-harness', '--version'])

		const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
		expect(mockedCli).toHaveBeenCalledWith(expect.objectContaining({ version: manifest.version }))
	})
})

describe('the public entry point', () => {
	it('exports run, and does not export the application object', () => {
		expect(publicApi.run).toBe(run)
		expect(publicApi.activate).toBe(activate)
		expect(publicApi.initCommand).toBe(initCommand)
		expect(publicApi.doctorCommand).toBe(doctorCommand)
		expect(Object.keys(publicApi)).not.toContain('app')
		expect(Object.values(publicApi)).not.toContainEqual(expect.objectContaining({ parse: expect.any(Function) }))
	})
})

describe('the process boundary', () => {
	// The whole point of the entry point: the application reports its exit code, and one file turns
	// that into a process outcome. A second writer is the boundary leaking back out.
	it('writes process.exitCode nowhere but bin, the launchers, and the renderer that emits them', () => {
		const shipped = globSync(['src/**/*.ts', 'bin/*.mjs', 'skills/*/scripts/*.mjs'], { cwd: packageRoot })
			.filter((file) => !file.endsWith('.test.ts'))
			.sort()
		const writers = shipped.filter((file) =>
			/process\.exitCode\s*=/.test(readFileSync(join(packageRoot, file), 'utf8')),
		)

		expect(writers).toEqual([
			'bin/buddy-agent-harness.mjs',
			'skills/doctor/scripts/doctor.mjs',
			'skills/init/scripts/doctor.mjs',
			'skills/init/scripts/init.mjs',
			'skills/repair/scripts/doctor.mjs',
			// Not a writer itself: this is the renderer whose template emits the launchers above.
			'src/diagnose-bridges/doctor-guidance.ts',
		])
	})
})

describe('the reachable surface', () => {
	const healthy = {
		bridges: [{ harness: 'claude-code', path: '.claude/skills', kind: 'symlink', status: 'ok' }],
		instructions: [],
		divergence: [],
		findings: [],
	} as unknown as Parameters<typeof buildDoctorReport>[1]

	it('exports the report builder, so the report is reachable as a value', () => {
		expect(publicApi.buildDoctorReport).toBe(buildDoctorReport)
	})

	// The sentence is not an empty list dressed up: it is what lets a caller tell "nothing is wrong"
	// from "I asked the question wrongly". Flattening it into rows-plus-a-flag is what a refactor
	// reaches for, so the export is asserted rather than the internal call.
	it('carries the healthy sentence through the export, not an empty list', () => {
		const report = publicApi.buildDoctorReport('~/bin/bah', healthy)

		expect(typeof report.findings).toBe('string')
		expect(report.findings).not.toEqual([])
	})

	// A caller branches on presence. Normalizing either to an empty array changes the contract.
	it('leaves the sections that do not apply absent through the export, not empty', () => {
		const report = publicApi.buildDoctorReport('~/bin/bah', healthy)

		expect(report).not.toHaveProperty('divergence')
		expect(report).not.toHaveProperty('help')
	})
})
