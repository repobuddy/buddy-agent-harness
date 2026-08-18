import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type DiagnoseResult, diagnoseBridges } from './diagnose-bridges.ts'
import { buildReport, doctorCommand } from './doctor.command.ts'

vi.mock('./diagnose-bridges.ts', () => ({ diagnoseBridges: vi.fn() }))

const mockedDiagnoseBridges = vi.mocked(diagnoseBridges)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function run(args: { format?: string; harness?: string; root?: string }): void {
	;(doctorCommand as { run(value: typeof args): void }).run(args)
}

const healthy: DiagnoseResult = {
	bridges: [{ harness: 'claude-code', path: '.claude/skills', kind: 'symlink', status: 'ok' }],
	instructions: [{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'import', status: 'ok' }],
	divergence: [],
	findings: [],
}

beforeEach(() => {
	mockedDiagnoseBridges.mockReset()
	mockedDiagnoseBridges.mockReturnValue(healthy)
	stderr.mockClear()
	stdout.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

describe('doctor command', () => {
	it('diagnoses the working directory in TOON by default', () => {
		run({ format: 'toon' })

		expect(mockedDiagnoseBridges).toHaveBeenCalledWith({ root: process.cwd(), cli: 'buddy-agent-harness' })
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('bridges[1]{harness,path,kind,status}'))
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('instructions[1]{harness,path,kind,status}'))
	})

	it('passes an explicit root and the requested harnesses through', () => {
		run({ format: 'json', harness: 'gemini-cli, codex', root: '/workspace' })

		expect(mockedDiagnoseBridges).toHaveBeenCalledWith({
			root: '/workspace',
			harnesses: ['gemini-cli', 'codex'],
			cli: 'buddy-agent-harness',
		})
	})

	// The diagnosis succeeded either way; a non-zero code reads to an agent as a broken command.
	it('exits 0 whether or not it found something', () => {
		run({ format: 'json' })
		expect(process.exitCode).toBeUndefined()

		mockedDiagnoseBridges.mockReturnValue({
			bridges: [{ harness: 'claude-code', path: '.claude/skills', kind: 'file', status: 'degraded' }],
			instructions: [],
			divergence: [],
			findings: [
				{
					path: '.claude/skills',
					problem: 'missing',
					detail: 'found a regular file',
					repair: 'bah init --copy --force',
				},
			],
		})
		run({ format: 'json' })
		expect(process.exitCode).toBeUndefined()
	})

	it('reports an invalid format, an unsupported harness, and a failed diagnosis', () => {
		run({ format: 'yaml' })
		expect(stderr).toHaveBeenCalledWith('error: --format must be toon, json, or text.\n')
		expect(process.exitCode).toBe(1)

		process.exitCode = undefined
		run({ format: 'json', harness: 'aider' })
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Unsupported harness: aider'))
		expect(process.exitCode).toBe(1)

		stderr.mockClear()
		process.exitCode = undefined
		mockedDiagnoseBridges.mockImplementationOnce(() => {
			throw 'unavailable'
		})
		run({ format: 'json' })
		expect(stderr).toHaveBeenCalledWith('error: Harness diagnosis failed.\n')
		expect(process.exitCode).toBe(1)
	})
})

describe('buildReport', () => {
	it('states the healthy answer outright rather than leaving findings empty', () => {
		expect(buildReport('~/bin/bah', { ...healthy, instructions: [] })).toEqual({
			bin: '~/bin/bah',
			bridges: healthy.bridges,
			instructions: [],
			findings: '0 problems found — the 1 bridge resolves and the configuration around them is current',
		})
	})

	// Both sections are bridges, so a reader is not left adding two counts together.
	it('counts the instruction bridges alongside the skills bridges', () => {
		const bridges: DiagnoseResult['bridges'] = [
			...healthy.bridges,
			{ harness: 'windsurf', path: '.windsurf/skills', kind: 'symlink', status: 'ok' },
		]

		expect(buildReport('~/bin/bah', { ...healthy, bridges })).toMatchObject({
			findings: '0 problems found — all 3 bridges resolve and the configuration around them is current',
		})
	})

	it('moves each repair into help and keeps findings to the diagnosis and its name', () => {
		const report = buildReport('~/bin/bah', {
			bridges: [
				{ harness: 'claude-code', path: '.claude/skills', kind: 'none', status: 'missing' },
				{ harness: 'windsurf', path: '.windsurf/skills', kind: 'none', status: 'missing' },
			],
			instructions: [],
			divergence: [],
			findings: [
				{ path: '.claude/skills', problem: 'missing', detail: 'no bridge at this path', repair: 'bah init' },
				{ path: '.windsurf/skills', problem: 'missing', detail: 'no bridge at this path', repair: 'bah init' },
			],
		})

		// `problem` survives into the row so a caller routes on the name rather than on `detail` prose.
		expect(report.findings).toEqual([
			{ path: '.claude/skills', problem: 'missing', detail: 'no bridge at this path' },
			{ path: '.windsurf/skills', problem: 'missing', detail: 'no bridge at this path' },
		])
		expect(report.help).toEqual(['Run `bah init`'])
		expect(report).not.toHaveProperty('divergence')
	})

	it('adds a divergence section only when a bridge has diverged', () => {
		const report = buildReport('~/bin/bah', {
			bridges: [{ harness: 'claude-code', path: '.claude/skills', kind: 'copy', status: 'diverged' }],
			instructions: [],
			divergence: [{ path: '.claude/skills', direction: 'bridge' }],
			findings: [
				{ path: '.claude/skills', problem: 'missing', detail: 'only the bridge changed', repair: 'reconcile by hand' },
			],
		})

		expect(report.divergence).toEqual([{ path: '.claude/skills', direction: 'bridge' }])
	})
})
