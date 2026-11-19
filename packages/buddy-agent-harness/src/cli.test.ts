import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cli } from 'clibuilder'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultFormat, rootCommand, run } from './cli.ts'
import { syncSkillCopies } from './copy-sync/copy-sync.ts'
import { syncCommand } from './copy-sync/sync.command.ts'
import { buildDoctorReport, doctorCommand } from './diagnose-bridges/doctor.command.ts'
import { governanceCommand } from './governance-overrides/governance.command.ts'
import * as publicApi from './index.ts'
import { activate, initCommand } from './initialize-harnesses/init.command.ts'
import { referenceCommand } from './references/references.ts'

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
	const defaultRoute: ReturnType<typeof vi.fn> = vi.fn(() => ({ command }))
	mockedCli.mockReturnValue({ command, default: defaultRoute } as never)
	return Object.assign(command, { defaultRoute })
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
		expect(command).toHaveBeenCalledWith(referenceCommand)
		expect(command).toHaveBeenCalledWith(governanceCommand)
		expect(parse).toHaveBeenCalledWith(argv)
		expect(process.argv).toEqual(before)
	})

	it('routes a bare invocation to the doctor report under the home header', async () => {
		const command = stubApp(vi.fn(async () => undefined))

		await run(['node', 'buddy-agent-harness'])

		expect(command.defaultRoute).toHaveBeenCalledWith(
			expect.objectContaining({ options: doctorCommand.options, run: expect.any(Function) }),
		)
	})

	it('answers a bare invocation with the home header followed by the report, without the bin path twice', async () => {
		const command = stubApp(vi.fn(async () => undefined))
		await run(['node', 'buddy-agent-harness'])
		const [{ run: bare }] = command.defaultRoute.mock.calls[0] as [{ run(args: object): Promise<unknown> }]

		const answer = JSON.stringify(await bare({ root: process.cwd() }))

		expect(answer).toContain('"description":"Initialize agent harness')
		expect(answer).toContain('"findings"')
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

	it('answers a throw clibuilder did not handle with a coded error on stdout, and nothing on stderr', async () => {
		stubApp(vi.fn(async () => Promise.reject(new Error('bad options'))))

		await expect(run(['node', 'buddy-agent-harness', 'doctor'])).resolves.toBe(1)

		const written = stdout.mock.calls.map(([chunk]) => String(chunk)).join('')
		expect(written).toContain('error: bad options')
		expect(written).toContain('code: command-failed')
		expect(written).toContain('help')
		expect(stderr).not.toHaveBeenCalled()
	})

	it.each([['--format', 'json'], ['--format=json']])(
		'writes that error in the format the caller asked for (%s)',
		async (...format) => {
			stubApp(vi.fn(async () => Promise.reject(new Error('bad options'))))

			await run(['node', 'buddy-agent-harness', 'doctor', ...format])

			const answer = JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(''))
			expect(answer).toEqual({ error: 'bad options', code: 'command-failed', help: [expect.stringMatching(/\S/)] })
		},
	)

	it.each([
		['an unsupported format', ['--format', 'yaml']],
		['no format value', ['--format']],
	])('falls back to the default format when given %s', async (_case, format) => {
		stubApp(vi.fn(async () => Promise.reject(new Error('bad options'))))

		await run(['node', 'buddy-agent-harness', 'doctor', ...format])

		expect(stdout.mock.calls.map(([chunk]) => String(chunk)).join('')).toContain('code: command-failed')
	})

	it.each([
		['something that is not an Error', 'bad options'],
		['an Error with no message', new Error('')],
	])('still states a reason when the throw is %s', async (_case, thrown) => {
		stubApp(vi.fn(async () => Promise.reject(thrown)))

		await run(['node', 'buddy-agent-harness', 'doctor', '--format', 'json'])

		const answer = JSON.parse(stdout.mock.calls.map(([chunk]) => String(chunk)).join(''))
		expect(answer).toMatchObject({ error: 'buddy-agent-harness failed unexpectedly.', code: 'command-failed' })
	})

	// Runs against the real clibuilder rather than the stub: the code comes from clibuilder's own
	// usage reporting, which a stub could only re-assert.
	it('returns the usage code when clibuilder rejected the invocation', async () => {
		const { cli: actualCli } = await vi.importActual<typeof import('clibuilder')>('clibuilder')
		mockedCli.mockImplementation(actualCli as typeof cli)

		await expect(run(['node', 'buddy-agent-harness', 'doctor', '--nope'])).resolves.toBe(2)
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

	it.each([
		['reference', 'load'],
		['reference', 'create'],
		['reference', 'delete'],
		['governance', 'show'],
	])('answers `%s %s` in text unless --format says otherwise', async (group, subcommand) => {
		stubApp(vi.fn(async () => undefined))

		await run(['node', 'buddy-agent-harness', group, subcommand])
		expect(mockedCli).toHaveBeenLastCalledWith(expect.objectContaining({ format: 'text' }))

		await run(['node', 'buddy-agent-harness', group, subcommand, '--format', 'json'])
		expect(mockedCli).toHaveBeenLastCalledWith(expect.objectContaining({ format: 'toon' }))
	})

	it('answers every other command in TOON', async () => {
		stubApp(vi.fn(async () => undefined))

		await run(['node', 'buddy-agent-harness', 'doctor'])
		expect(mockedCli).toHaveBeenLastCalledWith(expect.objectContaining({ format: 'toon' }))
		await run(['node', 'buddy-agent-harness', 'reference', 'list'])
		expect(mockedCli).toHaveBeenLastCalledWith(expect.objectContaining({ format: 'toon' }))
		await run(['node', 'buddy-agent-harness'])
		expect(mockedCli).toHaveBeenLastCalledWith(expect.objectContaining({ format: 'toon' }))
	})

	it('reports the version the package manifest carries', async () => {
		stubApp(vi.fn(async () => undefined))

		await run(['node', 'buddy-agent-harness', '--version'])

		const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
		expect(mockedCli).toHaveBeenCalledWith(expect.objectContaining({ version: manifest.version }))
	})
})

describe('the commands', () => {
	type Node = { name: string; examples?: readonly unknown[]; commands?: readonly Node[] }
	const leaves = (node: Node): Node[] => (node.commands?.length ? node.commands.flatMap(leaves) : [node])

	// The `reference` subcommands are built by cyber-agentkit and carry no examples there, so the
	// commands this package defines are checked, not that group.
	it('gives every command in rootCommand this package defines at least one example', () => {
		const owned = (rootCommand.commands as readonly Node[]).filter(({ name }) => name !== referenceCommand.name)
		const missing = owned.flatMap(leaves).filter(({ examples }) => !examples?.length)

		expect(missing.map(({ name }) => name)).toEqual([])
	})
})

describe('defaultFormat', () => {
	it('reads --format given as `--format=json` as already chosen', () => {
		expect(defaultFormat(['node', 'bah', 'reference', 'load', '--format=json'])).toBe('toon')
	})
})

describe('the public entry point', () => {
	it('exports run, and does not export the application object', () => {
		expect(publicApi.run).toBe(run)
		expect(publicApi.activate).toBe(activate)
		expect(publicApi.initCommand).toBe(initCommand)
		expect(publicApi.doctorCommand).toBe(doctorCommand)
		expect(publicApi.governanceCommand).toBe(governanceCommand)
		expect(publicApi.referenceCommand).toBe(referenceCommand)
		expect(publicApi.syncCommand).toBe(syncCommand)
		expect(publicApi.syncSkillCopies).toBe(syncSkillCopies)
		expect(Object.keys(publicApi)).not.toContain('app')
		expect(Object.values(publicApi)).not.toContainEqual(expect.objectContaining({ parse: expect.any(Function) }))
	})
})

describe('the process boundary', () => {
	// The whole point of the entry point: the application reports its exit code, and one file turns
	// that into a process outcome. A second writer is the boundary leaking back out.
	it('writes process.exitCode nowhere but bin', () => {
		const shipped = globSync(['src/**/*.ts', 'bin/*.mjs', 'skills/*/scripts/*.mjs'], { cwd: packageRoot })
			.filter((file) => !file.endsWith('.test.ts'))
			.sort()
		const writers = shipped.filter((file) =>
			/process\.exitCode\s*=/.test(readFileSync(join(packageRoot, file), 'utf8')),
		)

		expect(writers).toEqual(['bin/buddy-agent-harness.mjs'])
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
