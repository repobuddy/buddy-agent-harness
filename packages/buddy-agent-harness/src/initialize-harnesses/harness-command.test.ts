import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cli } from 'clibuilder'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { activate } from './init.command.ts'

describe('the agent-harness group mounted under a host', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('renders a next step with the host command line', async () => {
		const out: string[] = []
		vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
			out.push(String(chunk))
			return true
		})
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
		const root = mkdtempSync(join(tmpdir(), 'bah-mount-'))
		try {
			const mounted: cli.Command[] = []
			activate({ addCommand: (command) => mounted.push(command) })
			const [group] = mounted as [cli.Command]
			const host = cli({ name: 'repobuddy', version: '0.0.0', description: 'host', format: 'json' }).command(group)
			const argv = ['node', 'repobuddy', 'agent-harness', 'governance', 'show', 'skill-design', '--root', root]

			expect(await host.parse([...argv, '--overrides-only'])).toBe(1)

			expect(JSON.parse(out.join('')).help).toEqual([
				'Run `repobuddy agent-harness reference list` to see what is available',
			])
		} finally {
			rmSync(root, { recursive: true, force: true })
		}
	})
})
