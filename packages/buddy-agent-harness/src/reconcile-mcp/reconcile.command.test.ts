import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mcpReconcileCommand } from './reconcile.command.ts'
import { reconcileMcp } from './reconcile-mcp.ts'

vi.mock('./reconcile-mcp.ts', () => ({ reconcileMcp: vi.fn() }))

const mockedReconcileMcp = vi.mocked(reconcileMcp)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

function run(args: { format?: string; accept?: string[]; root?: string }): number {
	return (mcpReconcileCommand as { run(value: typeof args): number }).run(args)
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

		expect(report()).toMatchObject({ mode: 'nothing to reconcile into', fields: '0 fields', record: 'not written' })
	})

	it('fails on an unreadable golden set by position, or without one it cannot name', () => {
		mockedReconcileMcp.mockReturnValue({ kind: 'unreadable', position: { line: 4, column: 9 } })
		expect(run({ format: 'json' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith(
			'error: .agents/buddy-agent-harness/mcp.toml does not parse at line 4, column 9.\n',
		)

		mockedReconcileMcp.mockReturnValue({ kind: 'unreadable' })
		expect(run({ format: 'json' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: .agents/buddy-agent-harness/mcp.toml does not parse.\n')
	})

	it('fails naming every rejected approval, having written nothing', () => {
		mockedReconcileMcp.mockReturnValue({ kind: 'rejected', reasons: ['a is skip', 'b names no importable field'] })

		expect(run({ format: 'json', accept: ['a', 'b'] })).toBe(1)

		expect(stderr).toHaveBeenCalledWith('error: nothing written.\n- a is skip\n- b names no importable field\n')
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

	it('rejects an invalid format, and reports a thrown error or a generic one', () => {
		expect(run({ format: 'yaml' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: --format must be toon, json, or text.\n')

		mockedReconcileMcp.mockImplementationOnce(() => {
			throw 'unavailable'
		})
		expect(run({ format: 'json' })).toBe(1)
		expect(stderr).toHaveBeenCalledWith('error: MCP reconcile failed.\n')
	})
})
