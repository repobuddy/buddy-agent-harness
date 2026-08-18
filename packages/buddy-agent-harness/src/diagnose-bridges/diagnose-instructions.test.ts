import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { harnessRegistry } from '../harness-registry/harness-registry.ts'
import { diagnoseBridges } from './diagnose-bridges.ts'
import { diagnoseInstructions } from './diagnose-instructions.ts'

const cli = 'bah'
const initSkill = '/buddy-agent-harness:init'

/** A repository whose skills side is healthy, so only the instruction bridges can produce findings. */
function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-instructions-'))
	mkdirSync(join(root, '.agents', 'skills', 'review'), { recursive: true })
	writeFileSync(join(root, '.agents', 'skills', 'review', 'SKILL.md'), '# Review')
	mkdirSync(join(root, '.claude'), { recursive: true })
	symlinkSync('../.agents/skills', join(root, '.claude', 'skills'), 'junction')
	writeFileSync(join(root, 'AGENTS.md'), '# Instructions\n')
	return root
}

/** Enabling Gemini CLI adds a skills bridge too; link it so only the instruction side reports. */
function enableGemini(root: string): void {
	mkdirSync(join(root, '.gemini'), { recursive: true })
	symlinkSync('../.agents/skills', join(root, '.gemini', 'skills'), 'junction')
}

function write(root: string, path: string, content: string): void {
	mkdirSync(join(root, path, '..'), { recursive: true })
	writeFileSync(join(root, path), content)
}

function instructionsOf(root: string, harnesses?: ('gemini-cli' | 'codex')[]) {
	return diagnoseBridges({ root, cli, ...(harnesses ? { harnesses } : {}) }).instructions
}

function findingsOf(root: string, harnesses?: ('gemini-cli' | 'codex')[]) {
	return diagnoseBridges({ root, cli, ...(harnesses ? { harnesses } : {}) }).findings
}

describe('the import bridge', () => {
	it('accepts a file whose body is the import', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')

		expect(instructionsOf(root)).toEqual([{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'import', status: 'ok' }])
		expect(findingsOf(root)).toEqual([])
	})

	// The reference allows harness-specific notes below the import, so the import is read per line.
	it('accepts an import carrying Claude-specific notes below it', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n\nUse the plan mode here.\n')

		expect(instructionsOf(root)[0]).toMatchObject({ kind: 'import', status: 'ok' })
	})

	it('accepts a symlink to AGENTS.md and rejects one pointing elsewhere', () => {
		const root = repository()
		symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'))

		expect(instructionsOf(root)[0]).toMatchObject({ kind: 'symlink', status: 'ok' })

		rmSync(join(root, 'CLAUDE.md'))
		symlinkSync('docs/AGENTS.md', join(root, 'CLAUDE.md'))

		expect(instructionsOf(root)[0]).toMatchObject({ kind: 'symlink', status: 'unbridged' })
	})

	it('reports a missing bridge and hands the repair to the init skill', () => {
		const root = repository()

		expect(instructionsOf(root)).toEqual([
			{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'none', status: 'missing' },
		])
		expect(findingsOf(root)).toEqual([
			{
				path: 'CLAUDE.md',
				detail: 'no instruction bridge at this path — the harness reads none of AGENTS.md',
				repair: '/buddy-agent-harness:init',
			},
		])
	})

	// The quiet one: the file is present, so nothing looks wrong, and it bridges nothing.
	it('reports a bridge overwritten with real content as unbridged', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '# House rules\n\nUse pnpm.\n')

		expect(instructionsOf(root)[0]).toMatchObject({ kind: 'file', status: 'unbridged' })
		expect(findingsOf(root)[0]).toMatchObject({
			detail: 'the file is present but names AGENTS.md nowhere — the harness reads none of it',
			repair: '/buddy-agent-harness:init',
		})
	})

	it('checks one bridge per nested AGENTS.md, and none where there is no AGENTS.md', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')
		write(root, 'apps/web/AGENTS.md', '# Web\n')
		write(root, 'packages/core/AGENTS.md', '# Core\n')
		write(root, 'packages/core/CLAUDE.md', '@AGENTS.md\n')
		mkdirSync(join(root, 'apps', 'api'), { recursive: true })

		expect(instructionsOf(root)).toEqual([
			{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'import', status: 'ok' },
			{ harness: 'claude-code', path: 'apps/web/CLAUDE.md', kind: 'none', status: 'missing' },
			{ harness: 'claude-code', path: 'packages/core/CLAUDE.md', kind: 'import', status: 'ok' },
		])
		expect(findingsOf(root).map((finding) => finding.path)).toEqual(['apps/web/CLAUDE.md'])
	})

	// `.agents/AGENTS.md` is canonical shared instructions rather than a subtree-scoped file, and a
	// vendored `AGENTS.md` is not this repository's to bridge.
	it('ignores AGENTS.md under a dot-directory or node_modules', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')
		write(root, '.agents/AGENTS.md', '# Shared\n')
		write(root, 'node_modules/some-package/AGENTS.md', '# Vendored\n')

		expect(instructionsOf(root).map((report) => report.path)).toEqual(['CLAUDE.md'])
	})

	it('reports a repository with no AGENTS.md once, and checks no bridge into it', () => {
		const root = repository()
		rmSync(join(root, 'AGENTS.md'))

		expect(instructionsOf(root)).toEqual([])
		expect(findingsOf(root)).toEqual([
			{
				path: 'AGENTS.md',
				detail: 'no AGENTS.md at the repository root, so every instruction bridge points at nothing',
				repair: '/buddy-agent-harness:init',
			},
		])
	})
})

describe('the settings-entry bridge', () => {
	// No `.gemini` directory, so Gemini CLI is enabled only when the caller asks for it.
	it('is checked only for the harnesses this repository enables', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')

		expect(instructionsOf(root).map((report) => report.harness)).toEqual(['claude-code'])
		expect(instructionsOf(root, ['gemini-cli']).map((report) => report.path)).toEqual([
			'CLAUDE.md',
			'.gemini/settings.json',
		])
	})

	it('accepts AGENTS.md in context.fileName beside the harness default', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')
		enableGemini(root)
		write(root, '.gemini/settings.json', JSON.stringify({ context: { fileName: ['AGENTS.md', 'GEMINI.md'] } }))

		expect(instructionsOf(root, ['gemini-cli'])[1]).toMatchObject({ kind: 'settings-entry', status: 'ok' })
		expect(findingsOf(root, ['gemini-cli'])).toEqual([])
	})

	// The Gemini loader strips comments before parsing, so a commented file is a working bridge.
	it('accepts a settings file carrying comments', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')
		enableGemini(root)
		write(
			root,
			'.gemini/settings.json',
			'{\n  // canonical instructions\n  "context": { "fileName": ["AGENTS.md"] }\n}',
		)

		expect(instructionsOf(root, ['gemini-cli'])[1]).toMatchObject({ kind: 'settings-entry', status: 'ok' })
	})

	// The failure the Gemini reference names outright: without the entry it reads no instructions.
	it('reports a settings file another tool rewrote without the entry', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')
		enableGemini(root)
		write(root, '.gemini/settings.json', JSON.stringify({ context: { fileName: ['GEMINI.md'] } }))

		expect(instructionsOf(root, ['gemini-cli'])[1]).toMatchObject({ kind: 'file', status: 'unbridged' })
	})

	it('reads a missing key, a missing file, and unparsable JSON without throwing', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')
		enableGemini(root)

		expect(instructionsOf(root, ['gemini-cli'])[1]).toMatchObject({ kind: 'none', status: 'missing' })

		write(root, '.gemini/settings.json', JSON.stringify({ theme: 'dark' }))
		expect(instructionsOf(root, ['gemini-cli'])[1]).toMatchObject({ status: 'unbridged' })

		write(root, '.gemini/settings.json', '{ "context": ')
		expect(instructionsOf(root, ['gemini-cli'])[1]).toMatchObject({ kind: 'file', status: 'unreadable' })
		expect(findingsOf(root, ['gemini-cli'])[0]).toMatchObject({
			detail: 'the settings file does not parse, so the harness reads none of it',
		})
	})
})

describe('a harness set with no instruction bridge', () => {
	// Codex and Cursor read `AGENTS.md` where it lies, so its absence is not a broken bridge and
	// there is nothing to report against them either way.
	it('reports nothing at all, not even a missing AGENTS.md', () => {
		const root = repository()
		const native = harnessRegistry.filter((harness) => harness.name === 'codex' || harness.name === 'cursor')

		expect(diagnoseInstructions(root, native, cli)).toEqual({ instructions: [], findings: [] })
	})
})

describe('the repair', () => {
	// A person at a shell cannot rebuild an instruction file, so `help` names the skill instead.
	it('is never a command, for any instruction finding', () => {
		const root = repository()
		enableGemini(root)
		write(root, '.gemini/settings.json', '{')

		const findings = findingsOf(root, ['gemini-cli'])

		expect(findings.map((finding) => finding.path)).toEqual(['CLAUDE.md', '.gemini/settings.json'])
		for (const finding of findings) {
			expect(finding.repair).toBe(initSkill)
			expect(finding.repair).not.toContain(cli)
		}
	})
})
