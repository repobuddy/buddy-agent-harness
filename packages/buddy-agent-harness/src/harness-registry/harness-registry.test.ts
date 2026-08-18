import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type HarnessName, harnessRegistry, selectHarnesses } from './harness-registry.ts'

function entry(name: HarnessName) {
	const harness = harnessRegistry.find((candidate) => candidate.name === name)
	if (!harness) throw new Error(`No registry entry for ${name}`)
	return harness
}

describe('harnessRegistry', () => {
	it('records Gemini CLI as needing a projection in a repository and none at user scope', () => {
		const gemini = entry('gemini-cli')

		expect(gemini.project.skillsDirectory).toBe('.gemini/skills')
		expect(gemini.user?.skillsDirectory).toBeUndefined()
	})

	it('records Claude Code as needing a projection at both scopes', () => {
		const claude = entry('claude-code')

		expect(claude.project.skillsDirectory).toBe('.claude/skills')
		expect(claude.user?.skillsDirectory).toBe('.claude/skills')
	})

	it('leaves user scope absent where no vendor path is documented', () => {
		expect(entry('devin-desktop').user).toBeUndefined()
	})

	it('detects each scope by its own directory, because the questions differ', () => {
		const copilot = entry('copilot-cli')

		expect(copilot.project.detect).toBe('.github/skills')
		expect(copilot.user?.detect).toBe('.copilot')
	})
})

describe('selectHarnesses', () => {
	it('detects on the project directory and ignores user scope', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-'))
		mkdirSync(join(root, '.gemini'), { recursive: true })

		expect(selectHarnesses(root, []).map((harness) => harness.name)).toEqual(['claude-code', 'cursor', 'gemini-cli'])
	})
})
