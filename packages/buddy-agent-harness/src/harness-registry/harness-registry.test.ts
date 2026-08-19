import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { type HarnessName, harnessRegistry, parseHarnesses, selectHarnesses } from './harness-registry.ts'

function entry(name: HarnessName) {
	const harness = harnessRegistry.find((candidate) => candidate.name === name)
	if (!harness) throw new Error(`No registry entry for ${name}`)
	return harness
}

describe('harnessRegistry', () => {
	it('records Gemini CLI as reading the canonical directory at both scopes', () => {
		const gemini = entry('gemini-cli')

		expect(gemini.project.skillsDirectory).toBeUndefined()
		expect(gemini.user?.skillsDirectory).toBeUndefined()
	})

	it('leaves Claude Code as the only harness projected into', () => {
		const projected = harnessRegistry
			.filter((harness) => !harness.deprecated && harness.project.skillsDirectory)
			.map((harness) => harness.name)

		expect(projected).toEqual(['claude-code'])
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

describe('parseHarnesses', () => {
	it('reads a comma-separated option as registry names', () => {
		expect(parseHarnesses('windsurf, codex')).toEqual(['windsurf', 'codex'])
	})

	it('reads an absent option as no preference', () => {
		expect(parseHarnesses(undefined)).toEqual([])
	})

	it('drops the empty segments a trailing comma leaves', () => {
		expect(parseHarnesses('codex,,')).toEqual(['codex'])
	})

	// Named once here rather than in each command's own test. Both commands take the option, neither
	// owns what a name means, and a rejection asserted per command is the same sentence written twice
	// more than it is true.
	it('rejects a name the registry does not know, and names every one it does', () => {
		expect(() => parseHarnesses('aider')).toThrow(
			`Unsupported harness: aider. Supported: ${harnessRegistry.map((harness) => harness.name).join(', ')}.`,
		)
	})

	// Every requested name is reported, so a caller fixing a list of four does not learn of the
	// second bad one only after fixing the first.
	it('names every unsupported harness at once', () => {
		expect(() => parseHarnesses('aider,codex,continue')).toThrow('Unsupported harness: aider, continue.')
	})
})
