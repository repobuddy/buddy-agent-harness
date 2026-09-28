import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mcpProjectCommand } from './mcp.command.ts'
import { type ProjectionPlan, projectMcp } from './project-mcp.ts'

vi.mock('./project-mcp.ts', () => ({ projectMcp: vi.fn() }))

const mockedProjectMcp = vi.mocked(projectMcp)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function run(args: { format?: string; write?: boolean; root?: string }): number {
	return (mcpProjectCommand as { run(value: typeof args): number }).run(args)
}

const stdoutText = () => stdout.mock.calls.map(([value]) => String(value)).join('')

beforeEach(() => {
	mockedProjectMcp.mockReset()
	stderr.mockClear()
	stdout.mockClear()
})

afterEach(() => {
	process.exitCode = undefined
})

describe('mcp project command', () => {
	it('reports nothing to project when there is no golden set', () => {
		mockedProjectMcp.mockReturnValue({ kind: 'absent' })

		expect(run({ format: 'json' })).toBe(0)

		const report = JSON.parse(stdoutText())
		expect(report.mode).toBe('nothing to project')
		expect(report.record).toBe('not written')
	})

	it('fails with the line and column when the golden set does not parse at a known position', () => {
		mockedProjectMcp.mockReturnValue({ kind: 'unreadable', position: { line: 4, column: 9 } })

		expect(run({ format: 'json' })).toBe(1)

		expect(stderr).toHaveBeenCalledWith(
			'error: .agents/buddy-agent-harness/mcp.toml does not parse at line 4, column 9.\n',
		)
	})

	it('fails with no position when the golden set does not parse at a position it cannot name', () => {
		mockedProjectMcp.mockReturnValue({ kind: 'unreadable' })

		expect(run({ format: 'json' })).toBe(1)

		expect(stderr).toHaveBeenCalledWith('error: .agents/buddy-agent-harness/mcp.toml does not parse.\n')
	})

	it('reports a dry run by default, naming the record as not written', () => {
		const plan: ProjectionPlan = {
			kind: 'planned',
			rows: [{ target: '.mcp.json', server: 'linear', action: 'add', detail: 'creates the file' }],
			entries: [],
			written: false,
		}
		mockedProjectMcp.mockReturnValue(plan)

		expect(run({ format: 'json' })).toBe(0)

		const report = JSON.parse(stdoutText())
		expect(report.mode).toContain('dry run')
		expect(report.record).toBe('not written — dry run')
		expect(report.actions).toEqual(plan.rows)
		expect(report).not.toHaveProperty('entries')
	})

	it('reports a written run, naming the record path, and passes --write through', () => {
		const plan: ProjectionPlan = {
			kind: 'planned',
			rows: [{ target: '.mcp.json', server: 'linear', action: 'add', detail: 'creates the file' }],
			entries: [{ target: '.mcp.json', server: 'linear', action: 'add', entry: '{ "linear": {} }' }],
			written: true,
		}
		mockedProjectMcp.mockReturnValue(plan)

		expect(run({ format: 'json', write: true })).toBe(0)

		expect(mockedProjectMcp).toHaveBeenCalledWith(expect.objectContaining({ root: process.cwd(), write: true }))
		const report = JSON.parse(stdoutText())
		expect(report.mode).toBe('written')
		expect(report.record).toBe('.agents/buddy-agent-harness/mcp.projected.json')
		expect(report.entries).toEqual(plan.entries)
	})

	it('states the zero outright when a plan changes nothing', () => {
		mockedProjectMcp.mockReturnValue({ kind: 'planned', rows: [], entries: [], written: false })

		run({ format: 'json' })

		const report = JSON.parse(stdoutText())
		expect(report.actions).toBe('0 changes — every enabled harness already carries the golden set')
	})

	it('passes an explicit root through and defaults write to false', () => {
		mockedProjectMcp.mockReturnValue({ kind: 'absent' })

		run({ format: 'json', root: '/workspace' })

		expect(mockedProjectMcp).toHaveBeenCalledWith(expect.objectContaining({ root: '/workspace', write: false }))
	})

	it('encodes the report in the requested format and nothing else', () => {
		mockedProjectMcp.mockReturnValue({ kind: 'absent' })

		run({ format: 'json' })
		expect(stdoutText()).toContain('"golden":')

		stdout.mockClear()
		run({ format: 'text' })
		expect(stdoutText()).toContain('golden:')
		expect(stdoutText()).not.toContain('"golden":')
	})

	it('rejects an invalid format before calling projectMcp', () => {
		expect(run({ format: 'yaml' })).toBe(1)

		expect(stderr).toHaveBeenCalledWith('error: --format must be toon, json, or text.\n')
		expect(mockedProjectMcp).not.toHaveBeenCalled()
	})

	it('reports a thrown Error message and a generic one for a non-Error throw', () => {
		mockedProjectMcp.mockImplementationOnce(() => {
			throw new Error('git failed')
		})
		expect(run({ format: 'json' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: git failed\n')

		stderr.mockClear()
		mockedProjectMcp.mockImplementationOnce(() => {
			throw 'unavailable'
		})
		expect(run({ format: 'json' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: MCP projection failed.\n')
	})
})
