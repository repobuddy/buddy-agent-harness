import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { harnessRegistry } from '../harness-registry/harness-registry.ts'
import { diagnoseBridges } from './diagnose-bridges.ts'
import { diagnoseInstructions } from './diagnose-instructions.ts'

const cli = 'bah'
const initSkill = '/buddy-agent-harness:init-buddy-agent-harness'

/** A repository whose skills side is healthy, so only the instruction side can produce findings. */
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

/**
 * Claude Code reads `AGENTS.md` itself (E-CC-14), so there is nothing to bridge and one thing to
 * watch: a file it prefers, sitting where it would have read the canonical one.
 */
describe('the AGENTS.md shadow', () => {
	it('reports nothing where no shadowing file exists', () => {
		const root = repository()

		expect(instructionsOf(root)).toEqual([])
		expect(findingsOf(root)).toEqual([])
	})

	// The expensive one: nothing is missing, nothing looks wrong, and the canonical file is unread.
	it('reports a CLAUDE.md carrying its own content as shadowing', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '# House rules\n\nUse pnpm.\n')

		expect(instructionsOf(root)).toEqual([
			{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'file', status: 'shadowing' },
		])
		expect(findingsOf(root)).toEqual([
			{
				path: 'CLAUDE.md',
				problem: 'instructions-shadowing',
				detail: 'this file suppresses the AGENTS.md beside it — the harness reads this instead, and none of AGENTS.md',
				repair: {
					command: '',
					instruction:
						'hand CLAUDE.md to `/buddy-agent-harness:init-buddy-agent-harness`, which consolidates what it says into AGENTS.md, or adds an @AGENTS.md import above it where the file has to stay',
				},
			},
		])
	})

	it('reports a file whose body is the import as superseded rather than shadowing', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n')

		expect(instructionsOf(root)).toEqual([
			{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'import', status: 'superseded' },
		])
		expect(findingsOf(root)).toEqual([
			{
				path: 'CLAUDE.md',
				problem: 'instructions-superseded',
				detail: 'a bridge from before the harness read AGENTS.md itself — it still works, and nothing needs it',
				repair: {
					command: '',
					instruction:
						'remove CLAUDE.md, or keep it for sessions that cannot read AGENTS.md directly — `/buddy-agent-harness:init-buddy-agent-harness` offers the choice',
				},
			},
		])
	})

	// The import is what decides it, wherever it sits: the canonical file still reaches the harness.
	it('reads an import carrying Claude-specific notes below it as superseded', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '@AGENTS.md\n\nUse the plan mode here.\n')

		expect(instructionsOf(root)[0]).toMatchObject({ kind: 'import', status: 'superseded' })
	})

	it('separates a symlink to AGENTS.md from one pointing elsewhere', () => {
		const root = repository()
		symlinkSync('AGENTS.md', join(root, 'CLAUDE.md'))

		expect(instructionsOf(root)[0]).toMatchObject({ kind: 'symlink', status: 'superseded' })

		rmSync(join(root, 'CLAUDE.md'))
		symlinkSync('docs/AGENTS.md', join(root, 'CLAUDE.md'))

		expect(instructionsOf(root)[0]).toMatchObject({ kind: 'symlink', status: 'shadowing' })
	})

	// All three count for the check the harness makes, and the personal one counts the same way.
	it('checks .claude/CLAUDE.md and CLAUDE.local.md alongside CLAUDE.md', () => {
		const root = repository()
		write(root, '.claude/CLAUDE.md', '# Scoped\n')
		write(root, 'CLAUDE.local.md', '# Mine\n')

		expect(instructionsOf(root).map((report) => report.path)).toEqual(['.claude/CLAUDE.md', 'CLAUDE.local.md'])
		expect(findingsOf(root).map((finding) => finding.problem)).toEqual([
			'instructions-shadowing',
			'instructions-shadowing',
		])
	})

	// Per directory holding an `AGENTS.md`: a shadow in one subtree says nothing about another.
	it('checks every directory holding an AGENTS.md, and none without one', () => {
		const root = repository()
		write(root, 'apps/web/AGENTS.md', '# Web\n')
		write(root, 'apps/web/CLAUDE.md', '# Web rules\n')
		write(root, 'packages/core/AGENTS.md', '# Core\n')
		write(root, 'packages/cli/CLAUDE.md', '# CLI rules\n')

		expect(instructionsOf(root)).toEqual([
			{ harness: 'claude-code', path: 'apps/web/CLAUDE.md', kind: 'file', status: 'shadowing' },
		])
	})

	// A path that is there and cannot be read is not evidence either way, so it is reported as what
	// it is rather than guessed at. A directory sitting at the filename is the way this happens.
	it('reports a shadow path it cannot read as unreadable', () => {
		const root = repository()
		mkdirSync(join(root, 'CLAUDE.md'))

		expect(instructionsOf(root)).toEqual([
			{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'file', status: 'unreadable' },
		])
		expect(findingsOf(root)[0]).toMatchObject({ problem: 'instructions-unreadable' })
	})

	// `.agents/AGENTS.md` is canonical shared instructions rather than a subtree-scoped file, and a
	// vendored `AGENTS.md` is not this repository's to diagnose.
	it('ignores AGENTS.md under a dot-directory or node_modules', () => {
		const root = repository()
		write(root, '.agents/CLAUDE.md', '# Shared\n')
		write(root, '.agents/AGENTS.md', '# Shared\n')
		write(root, 'node_modules/some-package/AGENTS.md', '# Vendored\n')
		write(root, 'node_modules/some-package/CLAUDE.md', '# Vendored\n')

		expect(instructionsOf(root)).toEqual([])
	})

	// A shadowing file with no canonical file beside it is not shadowing anything — it is the only
	// instructions the repository has, in the one place a single harness reads. That is the missing
	// `AGENTS.md`, reported once for the repository.
	it('reports the missing AGENTS.md rather than the file standing in for it', () => {
		const root = repository()
		rmSync(join(root, 'AGENTS.md'))
		write(root, 'CLAUDE.md', '# House rules\n')

		expect(instructionsOf(root)).toEqual([])
		expect(findingsOf(root)).toEqual([
			{
				path: 'AGENTS.md',
				problem: 'no-instructions',
				detail:
					'no AGENTS.md at the repository root, so the instructions this repository has reach one harness at most',
				repair: {
					command: '',
					instruction:
						'hand this to `/buddy-agent-harness:init-buddy-agent-harness`, which consolidates what the repository has into AGENTS.md, or derives it',
				},
			},
		])
	})

	// Nothing canonical, and nothing standing in for it: no instructions exist to report on.
	it('says nothing about a repository with no instruction file at all', () => {
		const root = repository()
		rmSync(join(root, 'AGENTS.md'))

		expect(instructionsOf(root)).toEqual([])
		expect(findingsOf(root)).toEqual([])
	})
})

describe('the settings-entry bridge', () => {
	// No `.gemini` directory, so Gemini CLI is enabled only when the caller asks for it.
	it('is checked only for the harnesses this repository enables', () => {
		const root = repository()

		expect(instructionsOf(root)).toEqual([])
		expect(instructionsOf(root, ['gemini-cli']).map((report) => report.path)).toEqual(['.gemini/settings.json'])
	})

	it('accepts AGENTS.md in context.fileName beside the harness default', () => {
		const root = repository()
		enableGemini(root)
		write(root, '.gemini/settings.json', JSON.stringify({ context: { fileName: ['AGENTS.md', 'GEMINI.md'] } }))

		expect(instructionsOf(root, ['gemini-cli'])[0]).toMatchObject({ kind: 'settings-entry', status: 'ok' })
		expect(findingsOf(root, ['gemini-cli'])).toEqual([])
	})

	// A settings entry is a claim about which file to read, so it stays `ok` when that file is
	// absent — the absence is `no-instructions`, reported once for the repository rather than
	// again per bridge.
	it('keeps a settings entry ok when the file it names does not exist', () => {
		const root = repository()
		rmSync(join(root, 'AGENTS.md'))
		enableGemini(root)
		write(root, '.gemini/settings.json', JSON.stringify({ context: { fileName: ['AGENTS.md'] } }))

		const instructions = instructionsOf(root, ['gemini-cli'])

		expect(instructions).toContainEqual(
			expect.objectContaining({ path: '.gemini/settings.json', kind: 'settings-entry', status: 'ok' }),
		)
		expect(findingsOf(root, ['gemini-cli']).map((finding) => finding.problem)).toEqual(['no-instructions'])
	})

	// The Gemini loader strips comments before parsing, so a commented file is a working bridge.
	it('accepts a settings file carrying comments', () => {
		const root = repository()
		enableGemini(root)
		write(
			root,
			'.gemini/settings.json',
			'{\n  // canonical instructions\n  "context": { "fileName": ["AGENTS.md"] }\n}',
		)

		expect(instructionsOf(root, ['gemini-cli'])[0]).toMatchObject({ kind: 'settings-entry', status: 'ok' })
	})

	// The failure the Gemini reference names outright: without the entry it reads no instructions.
	it('reports a settings file another tool rewrote without the entry', () => {
		const root = repository()
		enableGemini(root)
		write(root, '.gemini/settings.json', JSON.stringify({ context: { fileName: ['GEMINI.md'] } }))

		expect(instructionsOf(root, ['gemini-cli'])[0]).toMatchObject({ kind: 'file', status: 'unbridged' })
	})

	it('reads a missing key, a missing file, and unparsable JSON without throwing', () => {
		const root = repository()
		enableGemini(root)

		expect(instructionsOf(root, ['gemini-cli'])[0]).toMatchObject({ kind: 'none', status: 'missing' })
		expect(findingsOf(root, ['gemini-cli'])[0]).toMatchObject({
			problem: 'instructions-missing',
			detail: 'no instruction bridge at this path — the harness reads none of AGENTS.md',
		})

		write(root, '.gemini/settings.json', JSON.stringify({ theme: 'dark' }))
		expect(instructionsOf(root, ['gemini-cli'])[0]).toMatchObject({ status: 'unbridged' })

		write(root, '.gemini/settings.json', '{ "context": ')
		expect(instructionsOf(root, ['gemini-cli'])[0]).toMatchObject({ kind: 'file', status: 'unreadable' })
		expect(findingsOf(root, ['gemini-cli'])[0]).toMatchObject({
			problem: 'instructions-unreadable',
			detail: 'the settings file does not parse, so the harness reads none of it',
		})
	})
})

describe('a harness set with no instruction bridge and nothing to shadow it', () => {
	// Codex and Cursor read `AGENTS.md` where it lies and prefer no file over it, so there is
	// nothing to report against them either way.
	it('reports nothing at all, not even a missing AGENTS.md', () => {
		const root = repository()
		write(root, 'CLAUDE.md', '# House rules\n')
		const native = harnessRegistry.filter((harness) => harness.name === 'codex' || harness.name === 'cursor')

		expect(diagnoseInstructions(root, native, cli)).toEqual({ instructions: [], findings: [] })
	})
})

describe('the repair', () => {
	// A person at a shell cannot rebuild an instruction file, so the repair names the skill instead —
	// and, since nothing in a shell runs a skill, offers no command at all.
	it('is never a command, for any instruction finding', () => {
		const root = repository()
		enableGemini(root)
		write(root, '.gemini/settings.json', '{')
		write(root, 'CLAUDE.md', '# House rules\n')
		write(root, 'apps/web/AGENTS.md', '# Web\n')
		symlinkSync('AGENTS.md', join(root, 'apps', 'web', 'CLAUDE.md'))

		const findings = findingsOf(root, ['gemini-cli'])

		expect(findings.map((finding) => finding.path)).toEqual([
			'.gemini/settings.json',
			'CLAUDE.md',
			'apps/web/CLAUDE.md',
		])
		for (const finding of findings) {
			expect(finding.repair.command).toBe('')
			expect(finding.repair.instruction).toContain(initSkill)
			expect(finding.repair.instruction).not.toContain(`${cli} `)
		}
	})
})
