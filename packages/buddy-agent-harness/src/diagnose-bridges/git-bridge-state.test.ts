import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GitBridgeState } from './git-bridge-state.ts'

/**
 * The history readers, outside a repository. Every method here degrades to "cannot tell" rather
 * than throwing, so `doctor` still reports on a tarball or an export.
 */
describe('GitBridgeState outside a repository', () => {
	const root = () => mkdtempSync(join(tmpdir(), 'buddy-agent-harness-git-'))

	it('finds no commits touching a path', () => {
		expect(new GitBridgeState(root()).commitsTouching(['AGENTS.md'])).toEqual([])
	})

	it('reads no content at a commit', () => {
		expect(new GitBridgeState(root()).contentAt('HEAD', 'AGENTS.md')).toBeUndefined()
	})
})
