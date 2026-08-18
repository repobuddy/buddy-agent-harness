import { homedir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { binPath, renderText } from '../command-output/command-output.ts'
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
					repair: { command: 'bah init --copy --force', instruction: 'run `bah init --copy --force`' },
				},
			],
		})
		run({ format: 'json' })
		expect(process.exitCode).toBeUndefined()
	})

	// The default is TOON, so nothing else confirms the command honors what it was asked for.
	it('encodes the report in the requested format and nothing else', () => {
		run({ format: 'json' })
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('"bridges":['))

		stdout.mockClear()
		run({ format: 'text' })
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining('bridges:'))
		expect(stdout).not.toHaveBeenCalledWith(expect.stringContaining('"bridges":['))
	})

	// A report a caller cannot trace back to the binary that wrote it cannot be reproduced, and the
	// home directory is collapsed so the path is publishable.
	it('names the executable that produced the report, with the home directory collapsed', () => {
		run({ format: 'json' })

		const bin = binPath(homedir(), process.argv[1])
		expect(bin).not.toContain(homedir())
		expect(stdout).toHaveBeenCalledWith(expect.stringContaining(`"bin":${JSON.stringify(bin)}`))
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
				{
					path: '.claude/skills',
					problem: 'missing',
					detail: 'no bridge at this path',
					repair: { command: 'bah init', instruction: 'run `bah init` to create the bridge' },
				},
				{
					path: '.windsurf/skills',
					problem: 'missing',
					detail: 'no bridge at this path',
					repair: { command: 'bah init', instruction: 'run `bah init` to create the bridge' },
				},
			],
		})

		// `problem` survives into the row so a caller routes on the name rather than on `detail` prose.
		expect(report.findings).toEqual([
			{ path: '.claude/skills', problem: 'missing', detail: 'no bridge at this path' },
			{ path: '.windsurf/skills', problem: 'missing', detail: 'no bridge at this path' },
		])
		expect(report.help).toEqual([{ command: 'bah init', instruction: 'run `bah init` to create the bridge' }])
		expect(report).not.toHaveProperty('divergence')
	})

	// The wrapper this replaced read `Run ` + the repair, so a repair that was an instruction to a
	// person came out as an invitation to paste prose into a shell.
	it('wraps no repair, and keeps a judgment repair apart from a runnable one', () => {
		const report = buildReport('~/bin/bah', {
			bridges: [{ harness: 'claude-code', path: '.claude/skills', kind: 'copy', status: 'diverged' }],
			instructions: [],
			divergence: [{ path: '.claude/skills', direction: 'both' }],
			findings: [
				{
					path: '.claude/skills',
					problem: 'diverged-both',
					detail: 'both sides changed',
					repair: { command: '', instruction: 'reconcile .agents/skills with .claude/skills by hand' },
				},
				{
					path: '.cursor/skills',
					problem: 'missing',
					detail: 'no bridge at this path',
					repair: { command: 'bah init', instruction: 'run `bah init` to create the bridge' },
				},
			],
		})

		expect(report.help).toEqual([
			{ command: '', instruction: 'reconcile .agents/skills with .claude/skills by hand' },
			{ command: 'bah init', instruction: 'run `bah init` to create the bridge' },
		])
		// Nothing prefixes a repair any more, and both keys are emitted even when there is no command,
		// so TOON renders `help` as one tabular section rather than degrading to a nested list.
		expect(report.help?.some((entry) => entry.instruction.startsWith('Run '))).toBe(false)
		expect(report.help?.every((entry) => 'command' in entry && 'instruction' in entry)).toBe(true)
	})

	// Two findings can only collapse when both templates ignore the path, which is what makes the
	// pair — rather than either field alone — the right dedupe key.
	it('dedupes on the whole repair, not on either field', () => {
		const report = buildReport('~/bin/bah', {
			bridges: [],
			instructions: [],
			divergence: [],
			findings: [
				{
					path: '.agents/skills',
					problem: 'no-canonical',
					detail: 'no canonical directory',
					repair: { command: 'bah init', instruction: 'run `bah init` to create .agents/skills' },
				},
				{
					path: '.claude/skills',
					problem: 'missing',
					detail: 'no bridge at this path',
					repair: { command: 'bah init', instruction: 'run `bah init` to create the bridge' },
				},
				{
					path: '.cursor/skills',
					problem: 'missing',
					detail: 'no bridge at this path',
					repair: { command: 'bah init', instruction: 'run `bah init` to create the bridge' },
				},
			],
		})

		// The two `missing` findings share a repair and collapse; `no-canonical` shares the command and
		// survives on its instruction alone.
		expect(report.help).toEqual([
			{ command: 'bah init', instruction: 'run `bah init` to create .agents/skills' },
			{ command: 'bah init', instruction: 'run `bah init` to create the bridge' },
		])
	})

	// The person's view of the same two-field repair: an aligned table, and a judgment repair simply
	// leaves the command column blank rather than saying anything untrue in it.
	it('renders help as a two-column table for a person, blank where there is no command', () => {
		const text = renderText(
			buildReport('~/bin/bah', {
				bridges: [],
				instructions: [],
				divergence: [],
				findings: [
					{
						path: '.claude/skills',
						problem: 'missing',
						detail: 'no bridge at this path',
						repair: { command: 'bah init', instruction: 'run `bah init`' },
					},
					{
						path: 'AGENTS.local.md',
						problem: 'unread-local-override',
						detail: 'no harness reads this filename',
						repair: { command: '', instruction: 'move AGENTS.local.md to CLAUDE.local.md' },
					},
				],
			}),
		)

		expect(text).toContain('  command   instruction')
		expect(text).toContain('  bah init  run `bah init`')
		expect(text).toContain('            move AGENTS.local.md to CLAUDE.local.md')
	})

	it('adds a divergence section only when a bridge has diverged', () => {
		const report = buildReport('~/bin/bah', {
			bridges: [{ harness: 'claude-code', path: '.claude/skills', kind: 'copy', status: 'diverged' }],
			instructions: [],
			divergence: [{ path: '.claude/skills', direction: 'bridge' }],
			findings: [
				{
					path: '.claude/skills',
					problem: 'missing',
					detail: 'only the bridge changed',
					repair: { command: '', instruction: 'reconcile by hand' },
				},
			],
		})

		expect(report.divergence).toEqual([{ path: '.claude/skills', direction: 'bridge' }])
	})
})
