import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
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
		expect(JSON.parse(readFileSync(join(root, '.agents', 'repobuddy', 'config.json'), 'utf8'))).toEqual({
			harnesses: ['claude-code', 'cursor'],
		})
		expect(existsSync(join(root, '.cursor', 'skills'))).toBe(false)
	})

	it('adds detected harnesses and projects only those that cannot read the canonical directory', () => {
		const root = repository()
		for (const directory of ['.codex', '.github/skills', '.gemini', '.windsurf'])
			mkdirSync(join(root, directory), { recursive: true })

		const result = initializeHarnesses({ root })

		expect(result).toMatchObject({
			harnesses: ['claude-code', 'cursor', 'codex', 'copilot-cli', 'gemini-cli', 'windsurf'],
			native: ['cursor', 'codex', 'copilot-cli'],
			linked: ['claude-code', 'gemini-cli', 'windsurf'],
		})
		for (const target of ['.claude/skills', '.gemini/skills', '.windsurf/skills'])
			expect(lstatSync(join(root, target)).isSymbolicLink()).toBe(true)
		expect(existsSync(join(root, '.codex', 'skills'))).toBe(false)
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

	it('preserves configuration owned by other repobuddy plugins', () => {
		const root = repository()
		mkdirSync(join(root, '.agents', 'repobuddy'), { recursive: true })
		writeFileSync(
			join(root, '.agents', 'repobuddy', 'config.json'),
			JSON.stringify({ plugins: ['buddy-agent-harness'], harnesses: ['codex'] }),
		)

		initializeHarnesses({ root })

		expect(JSON.parse(readFileSync(join(root, '.agents', 'repobuddy', 'config.json'), 'utf8'))).toEqual({
			plugins: ['buddy-agent-harness'],
			harnesses: ['claude-code', 'cursor'],
		})
	})

	it('refuses to overwrite configuration it cannot parse', () => {
		const root = repository()
		mkdirSync(join(root, '.agents', 'repobuddy'), { recursive: true })
		writeFileSync(join(root, '.agents', 'repobuddy', 'config.json'), '{ not json')

		expect(() => initializeHarnesses({ root })).toThrow(/unparseable/)
	})

	it('refuses to overwrite configuration that is not an object', () => {
		const root = repository()
		mkdirSync(join(root, '.agents', 'repobuddy'), { recursive: true })
		writeFileSync(join(root, '.agents', 'repobuddy', 'config.json'), '["claude-code"]')
		expect(() => initializeHarnesses({ root })).toThrow(/non-object/)

		writeFileSync(join(root, '.agents', 'repobuddy', 'config.json'), 'null')
		expect(() => initializeHarnesses({ root })).toThrow(/non-object/)
	})

	it('treats an empty configuration file as absent', () => {
		const root = repository()
		mkdirSync(join(root, '.agents', 'repobuddy'), { recursive: true })
		const file = join(root, '.agents', 'repobuddy', 'config.json')
		writeFileSync(file, '  \n')

		initializeHarnesses({ root })

		expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ harnesses: ['claude-code', 'cursor'] })
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

	it('records enabled harnesses even when no canonical skills exist', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-'))

		const result = initializeHarnesses({ root })

		expect(result.skills).toBe(0)
		expect(existsSync(join(root, '.agents', 'skills'))).toBe(true)
		expect(JSON.parse(readFileSync(join(root, '.agents', 'repobuddy', 'config.json'), 'utf8'))).toEqual({
			harnesses: ['claude-code', 'cursor'],
		})
	})
})
