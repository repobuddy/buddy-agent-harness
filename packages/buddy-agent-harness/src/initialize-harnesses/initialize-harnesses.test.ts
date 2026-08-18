import { existsSync, lstatSync, mkdirSync, mkdtempSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { initializeHarnesses } from './initialize-harnesses.ts'

function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-'))
	mkdirSync(join(root, '.agents', 'skills', 'review'), { recursive: true })
	writeFileSync(join(root, '.agents', 'skills', 'review', 'SKILL.md'), '# Review')
	return root
}

describe('initializeHarnesses', () => {
	it('links the canonical directory for Claude Code and leaves Cursor to read it natively', () => {
		const root = repository()

		const result = initializeHarnesses({ root })

		const target = join(root, '.claude', 'skills')
		expect(result).toMatchObject({
			harnesses: ['claude-code', 'cursor'],
			native: ['cursor'],
			linked: ['claude-code'],
			skills: 1,
		})
		expect(lstatSync(target).isSymbolicLink()).toBe(true)
		expect(readlinkSync(target)).toBe('../.agents/skills')
		expect(existsSync(join(target, 'review', 'SKILL.md'))).toBe(true)
		expect(existsSync(join(root, '.cursor', 'skills'))).toBe(false)
	})

	it('adds detected harnesses and projects only those that cannot read the canonical directory', () => {
		const root = repository()
		for (const directory of ['.codex', '.github/skills', '.gemini', '.windsurf'])
			mkdirSync(join(root, directory), { recursive: true })

		const result = initializeHarnesses({ root })

		expect(result).toMatchObject({
			harnesses: ['claude-code', 'cursor', 'codex', 'copilot-cli', 'gemini-cli', 'windsurf'],
			native: ['cursor', 'codex', 'copilot-cli', 'gemini-cli'],
			linked: ['claude-code', 'windsurf'],
		})
		for (const target of ['.claude/skills', '.windsurf/skills'])
			expect(lstatSync(join(root, target)).isSymbolicLink()).toBe(true)
		for (const untouched of ['.codex/skills', '.gemini/skills']) expect(existsSync(join(root, untouched))).toBe(false)
	})

	it('enables an explicitly requested harness that the repository does not already contain', () => {
		const root = repository()

		const result = initializeHarnesses({ root, harnesses: ['windsurf'] })

		expect(result.harnesses).toEqual(['claude-code', 'cursor', 'windsurf'])
		expect(lstatSync(join(root, '.windsurf', 'skills')).isSymbolicLink()).toBe(true)
	})

	it('treats Devin Desktop as native and writes nothing for it', () => {
		const root = repository()

		const result = initializeHarnesses({ root, harnesses: ['devin-desktop'] })

		expect(result).toMatchObject({
			harnesses: ['claude-code', 'cursor', 'devin-desktop'],
			native: ['cursor', 'devin-desktop'],
			linked: ['claude-code'],
			deprecated: [],
		})
		expect(existsSync(join(root, '.devin', 'skills'))).toBe(false)
	})

	it('reports the legacy windsurf name as deprecated while keeping its projection', () => {
		const root = repository()

		const result = initializeHarnesses({ root, harnesses: ['windsurf'] })

		expect(result.deprecated).toEqual([{ name: 'windsurf', replacedBy: 'devin-desktop' }])
		expect(lstatSync(join(root, '.windsurf', 'skills')).isSymbolicLink()).toBe(true)
	})

	it('copies the canonical directory when copying is requested', () => {
		const root = repository()

		const result = initializeHarnesses({ root, copy: true })

		expect(result.copied).toBe(true)
		const target = join(root, '.claude', 'skills')
		expect(lstatSync(target).isSymbolicLink()).toBe(false)
		expect(existsSync(join(target, 'review', 'SKILL.md'))).toBe(true)
	})

	it('preflights every conflict before writing and replaces them only with --force', () => {
		const root = repository()
		mkdirSync(join(root, '.windsurf'), { recursive: true })
		mkdirSync(join(root, '.claude', 'skills', 'review'), { recursive: true })
		writeFileSync(join(root, '.claude', 'skills', 'review', 'SKILL.md'), 'custom')

		expect(() => initializeHarnesses({ root })).toThrow(/\.claude\/skills/)
		expect(existsSync(join(root, '.windsurf', 'skills'))).toBe(false)

		initializeHarnesses({ root, force: true })
		expect(lstatSync(join(root, '.claude', 'skills')).isSymbolicLink()).toBe(true)
		expect(lstatSync(join(root, '.windsurf', 'skills')).isSymbolicLink()).toBe(true)
	})

	it('preserves a canonical link on re-run and rejects a link to another directory', () => {
		const root = repository()
		initializeHarnesses({ root })
		initializeHarnesses({ root })
		expect(lstatSync(join(root, '.claude', 'skills')).isSymbolicLink()).toBe(true)

		const conflictingRoot = repository()
		mkdirSync(join(conflictingRoot, '.claude'), { recursive: true })
		symlinkSync('../not-skills', join(conflictingRoot, '.claude', 'skills'), 'junction')

		expect(() => initializeHarnesses({ root: conflictingRoot })).toThrow(/\.claude\/skills/)
	})

	it('scaffolds the canonical directory even when no skills exist', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-'))

		const result = initializeHarnesses({ root })

		expect(result.skills).toBe(0)
		expect(existsSync(join(root, '.agents', 'skills'))).toBe(true)
	})

	// The enabled set is recomputed from detection on every run, so persisting it would be a second
	// source of truth that can only ever disagree. The result object is the only report.
	it('records nothing about the run on disk', () => {
		const root = repository()

		initializeHarnesses({ root })

		expect(existsSync(join(root, '.agents', 'repobuddy'))).toBe(false)
	})
})
