import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { run } from './cli.ts'

/** What `parse` throws on the next run; clibuilder reports a bad argv itself rather than throwing. */
const thrown = vi.hoisted(() => ({ value: undefined as unknown }))

vi.mock('clibuilder', async (importOriginal) => {
	const actual = await importOriginal<typeof import('clibuilder')>()
	return {
		...actual,
		cli: (...args: Parameters<typeof actual.cli>) => {
			if (thrown.value === undefined) return actual.cli(...args)
			const app = {
				command: () => app,
				parse: async () => {
					throw thrown.value
				},
			}
			return app
		},
	}
})

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

afterEach(() => {
	thrown.value = undefined
	stdout.mockClear()
	stderr.mockClear()
	process.exitCode = undefined
})

function tempRoot(): string {
	return mkdtempSync(join(tmpdir(), 'reference-cli-'))
}

describe('run', () => {
	it('runs a reference subcommand at the top level', async () => {
		const root = tempRoot()
		mkdirSync(join(root, '.agents', 'references'), { recursive: true })
		writeFileSync(join(root, '.agents', 'references', 'probe.md'), '# Probe\n')

		expect(await run(['node', 'buddy-agent-reference', 'show', 'probe', '--root', root])).toBe(0)
		expect(stdout).toHaveBeenCalledWith('# Probe\n')
	})

	it('returns the exit code a failing subcommand gives', async () => {
		expect(await run(['node', 'buddy-agent-reference', 'show', 'absent', '--root', tempRoot()])).toBe(1)
	})

	it('treats a run that returns no code as a success', async () => {
		expect(await run(['node', 'buddy-agent-reference', '--version'])).toBe(0)
	})

	it('reports a failure the parser throws on stderr, as a usage error', async () => {
		thrown.value = new Error('bad argv')
		expect(await run(['node', 'buddy-agent-reference', 'list'])).toBe(2)
		expect(stderr).toHaveBeenCalledWith('error: bad argv\n')

		thrown.value = 'not an error'
		expect(await run(['node', 'buddy-agent-reference', 'list'])).toBe(2)
		expect(stderr).toHaveBeenCalledWith('error: Invalid command.\n')
	})
})
