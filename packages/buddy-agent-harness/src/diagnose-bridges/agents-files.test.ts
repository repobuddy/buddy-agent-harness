import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { agentsFileDirectories } from './agents-files.ts'

describe('agentsFileDirectories', () => {
	// `doctor` reads whatever root it is pointed at, including one that is not there.
	it('reads a directory it cannot list as holding nothing', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-walk-'))

		expect(agentsFileDirectories(join(root, 'absent'))).toEqual([])
	})
})
