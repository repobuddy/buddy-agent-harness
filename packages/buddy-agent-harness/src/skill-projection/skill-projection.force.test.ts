import { describe, expect, it } from 'vitest'
import { parseForce } from './skill-projection.ts'

describe('parseForce', () => {
	// The option parser hands a valueless flag back as the literal string `true`, so this is what
	// an unadorned `--force` looks like by the time it reaches here — and it must keep meaning
	// every conflicting target, or every shipped `init --force` repair changes meaning.
	it('reads a valueless flag as every conflicting target', () => {
		expect(parseForce('true')).toBe(true)
		expect(parseForce('false')).toBe(false)
	})

	it('reads a comma-separated value as the targets to replace', () => {
		expect(parseForce('.claude/skills,.windsurf/skills')).toEqual(['.claude/skills', '.windsurf/skills'])
	})

	it('ignores the spacing and the empty entries a hand-typed list picks up', () => {
		expect(parseForce(' .claude/skills , , .windsurf/skills ')).toEqual(['.claude/skills', '.windsurf/skills'])
	})

	// An empty selection is not a force at all: it must leave the conflict stopping the run rather
	// than degrading into the replace-every-target case the flag exists to narrow.
	it('reads an empty value as no force rather than as every target', () => {
		expect(parseForce('')).toEqual([])
	})
})
