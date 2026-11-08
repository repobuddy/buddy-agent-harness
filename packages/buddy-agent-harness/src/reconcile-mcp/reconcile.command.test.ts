import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCommandSync } from '../command-output/run-command.test-helper.ts'
import { mcpReconcileCommand } from './reconcile.command.ts'
import { reconcileMcp } from './reconcile-mcp.ts'

vi.mock('./reconcile-mcp.ts', () => ({ reconcileMcp: vi.fn() }))

const mockedReconcileMcp = vi.mocked(reconcileMcp)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function run({
	format = 'json',
	...args
}: {
	format?: 'json' | 'toon' | 'text'
	accept?: string[]
	root?: string
}): number {
	return runCommandSync(mcpReconcileCommand, args, format)
}

const report = () => JSON.parse(stdout.mock.calls.map(([value]) => String(value)).join(''))

beforeEach(() => {
	mockedReconcileMcp.mockReset()
	stderr.mockClear()
	stdout.mockClear()
})

afterEach(() => {
	process.exitCode = undefined
})

describe('mcp reconcile command', () => {
	it('reports nothing to reconcile into without a golden set', () => {
		mockedReconcileMcp.mockReturnValue({ kind: 'absent' })

		expect(run({ format: 'json' })).toBe(0)

		expect(report()).toEqual({
			empty: '0 servers — no golden set at .agents/buddy-agent-harness/mcp.toml',
			help: [expect.stringContaining('nothing to reconcile into')],
		})
	})

	it('fails on an unreadable golden set by position, or without one it cannot name', () => {
		mockedReconcileMcp.mockReturnValue({ kind: 'unreadable', position: { line: 4, column: 9 } })
		expect(run({ format: 'json' })).toBe(1)
		expect(report()).toMatchObject({
			error: '.agents/buddy-agent-harness/mcp.toml does not parse at line 4, column 9.',
			code: 'golden-set-unreadable',
			help: [expect.stringContaining('Fix the TOML syntax')],
		})

		stdout.mockClear()
		mockedReconcileMcp.mockReturnValue({ kind: 'unreadable' })
		expect(run({ format: 'json' })).toBe(1)
		expect(report()).toMatchObject({
			error: '.agents/buddy-agent-harness/mcp.toml does not parse.',
			code: 'golden-set-unreadable',
		})
		expect(stderr).not.toHaveBeenCalled()
	})

	it('fails naming every rejected approval, having written nothing', () => {
		mockedReconcileMcp.mockReturnValue({ kind: 'rejected', reasons: ['a is skip', 'b names no importable field'] })

		expect(run({ format: 'json', accept: ['a', 'b'] })).toBe(1)

		expect(report()).toMatchObject({
			error: 'nothing written.',
			code: 'accept-rejected',
			reasons: ['a is skip', 'b names no importable field'],
			help: ['Run `mcp reconcile` to list the fields that can be approved'],
		})
		expect(stderr).not.toHaveBeenCalled()
	})

	it('reports a dry run, passing no approval through', () => {
		const rows = [{ path: '.mcp.json#servers.a.url', action: 'import' as const, detail: 'd', value: 'url = "u"' }]
		mockedReconcileMcp.mockReturnValue({ kind: 'planned', rows, written: false })

		expect(run({ format: 'json', root: '/workspace' })).toBe(0)

		expect(mockedReconcileMcp).toHaveBeenCalledWith(expect.objectContaining({ root: '/workspace', accept: [] }))
		expect(report()).toMatchObject({ fields: rows, record: 'not written — dry run' })
		expect(report().mode).toContain('dry run')
	})

	it('reports a written run, passing each approval through', () => {
		mockedReconcileMcp.mockReturnValue({ kind: 'planned', rows: [], written: true })

		run({ format: 'json', accept: ['.mcp.json#servers.a.url'] })

		expect(mockedReconcileMcp).toHaveBeenCalledWith(
			expect.objectContaining({ root: process.cwd(), accept: ['.mcp.json#servers.a.url'] }),
		)
		expect(report()).toMatchObject({
			mode: 'written — only the fields named by --accept',
			fields: '0 fields — no harness holds a change the golden set lacks',
			record: '.agents/buddy-agent-harness/mcp.projected.json',
		})
	})

	it('reports a thrown error or a generic one', () => {
		mockedReconcileMcp.mockImplementationOnce(() => {
			throw 'unavailable'
		})
		expect(run({ format: 'json' })).toBe(1)
		expect(report()).toMatchObject({ error: 'MCP reconcile failed.', code: 'command-failed' })
		stdout.mockClear()

		mockedReconcileMcp.mockImplementationOnce(() => {
			throw new Error('golden set locked')
		})
		expect(run({ format: 'json' })).toBe(1)
		expect(report()).toMatchObject({ error: 'golden set locked', code: 'command-failed' })
	})
})
