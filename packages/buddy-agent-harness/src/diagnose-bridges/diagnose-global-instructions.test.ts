import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diagnoseBridges } from './diagnose-bridges.ts'
import { diagnoseGlobalInstructions } from './diagnose-global-instructions.ts'
import { repairFor } from './doctor-guidance.ts'

const cli = 'bah'
const handOver = 'hand the user this step, since nothing here writes outside the repository:'

/** A home directory with the given harnesses installed, and the global file when asked for. */
function home(installed: string[], { global = true } = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-home-'))
	for (const directory of installed) mkdirSync(join(root, directory), { recursive: true })
	if (global) write(root, '.agents/AGENTS.md', '# Mine\n')
	return root
}

function write(root: string, path: string, content: string): void {
	mkdirSync(join(root, path, '..'), { recursive: true })
	writeFileSync(join(root, path), content)
}

function diagnose(root: string, preferred: ('codex' | 'gemini-cli')[] = [], env: NodeJS.ProcessEnv = {}) {
	return diagnoseGlobalInstructions(root, preferred, cli, env)
}

/** A directory outside the home directory, standing in for one a variable moved a harness to. */
function elsewhere(): string {
	return mkdtempSync(join(tmpdir(), 'buddy-agent-harness-moved-'))
}

describe('diagnoseGlobalInstructions', () => {
	it('reports nothing for a harness the user has not installed', () => {
		expect(diagnose(home([]))).toEqual({ globalInstructions: [], findings: [] })
	})

	// Cursor's user rules are a settings panel; there is no file to check.
	it('reports no row for a harness whose user rules are not a file', () => {
		expect(diagnose(home(['.cursor'])).globalInstructions).toEqual([])
	})

	it('reports a harness named on the command line even where it is not installed', () => {
		expect(diagnose(home([]), ['codex']).globalInstructions).toEqual([
			{ harness: 'codex', path: '~/.codex/AGENTS.md', kind: 'none', status: 'missing' },
		])
	})

	it('reports a missing user file, and hands over the import that bridges it', () => {
		expect(diagnose(home(['.claude']))).toEqual({
			globalInstructions: [{ harness: 'claude-code', path: '~/.claude/CLAUDE.md', kind: 'none', status: 'missing' }],
			findings: [
				{
					path: '~/.claude/CLAUDE.md',
					problem: 'global-instructions-missing',
					detail: 'no user-scope instruction file at this path — the harness loads none of ~/.agents/AGENTS.md',
					repair: {
						command: '',
						instruction: `${handOver} add the line \`@~/.agents/AGENTS.md\` to ~/.claude/CLAUDE.md`,
					},
				},
			],
		})
	})

	// `enhance` reads the rows to say whether text handed over would load, before the file exists.
	it('reports the rows without findings where there is no global file to go unread', () => {
		expect(diagnose(home(['.claude'], { global: false }))).toEqual({
			globalInstructions: [{ harness: 'claude-code', path: '~/.claude/CLAUDE.md', kind: 'none', status: 'missing' }],
			findings: [],
		})
	})

	it("accepts the import among the file's own content, written either way", () => {
		const tilde = home(['.claude'])
		write(tilde, '.claude/CLAUDE.md', '# Mine\n\n  @~/.agents/AGENTS.md\n')
		const absolute = home(['.claude'])
		write(absolute, '.claude/CLAUDE.md', `@${join(absolute, '.agents', 'AGENTS.md')}\n`)

		for (const root of [tilde, absolute])
			expect(diagnose(root)).toEqual({
				globalInstructions: [{ harness: 'claude-code', path: '~/.claude/CLAUDE.md', kind: 'import', status: 'ok' }],
				findings: [],
			})
	})

	it('reports a user file with content of its own and no import as unbridged', () => {
		const root = home(['.claude'])
		write(root, '.claude/CLAUDE.md', '# Mine\n\nUse pnpm.\n')

		expect(diagnose(root)).toEqual({
			globalInstructions: [{ harness: 'claude-code', path: '~/.claude/CLAUDE.md', kind: 'file', status: 'unbridged' }],
			findings: [
				{
					path: '~/.claude/CLAUDE.md',
					problem: 'global-instructions-unbridged',
					detail:
						'the file holds its own content and does not load ~/.agents/AGENTS.md — text placed there reaches no session of this harness',
					repair: {
						command: '',
						instruction: `${handOver} add the line \`@~/.agents/AGENTS.md\` to ~/.claude/CLAUDE.md`,
					},
				},
			],
		})
	})

	it('separates a symlink to the global file from one pointing elsewhere', () => {
		const linked = home(['.claude'])
		symlinkSync('../.agents/AGENTS.md', join(linked, '.claude', 'CLAUDE.md'))
		const elsewhere = home(['.claude'])
		write(elsewhere, 'notes.md', '# Notes\n')
		symlinkSync(join(elsewhere, 'notes.md'), join(elsewhere, '.claude', 'CLAUDE.md'))

		expect(diagnose(linked).globalInstructions).toEqual([
			{ harness: 'claude-code', path: '~/.claude/CLAUDE.md', kind: 'symlink', status: 'ok' },
		])
		expect(diagnose(elsewhere).globalInstructions).toEqual([
			{ harness: 'claude-code', path: '~/.claude/CLAUDE.md', kind: 'symlink', status: 'unbridged' },
		])
	})

	// Codex has no import syntax, so a line that would bridge Claude Code loads nothing there.
	it('hands over a symlink, and the move before it, for a harness that cannot import', () => {
		const root = home(['.codex'])
		write(root, '.codex/AGENTS.md', '# Mine\n\n@~/.agents/AGENTS.md\n')

		expect(diagnose(root).findings).toEqual([
			expect.objectContaining({
				path: '~/.codex/AGENTS.md',
				problem: 'global-instructions-unbridged',
				repair: {
					command: '',
					instruction: `${handOver} move what ~/.codex/AGENTS.md says into ~/.agents/AGENTS.md and remove it, then run \`ln -s ~/.agents/AGENTS.md ~/.codex/AGENTS.md\``,
				},
			}),
		])
	})

	it('reads a user file it cannot read as unbridged rather than failing the run', () => {
		const root = home(['.copilot'])
		mkdirSync(join(root, '.copilot', 'copilot-instructions.md'))

		expect(diagnose(root).globalInstructions).toEqual([
			{ harness: 'copilot-cli', path: '~/.copilot/copilot-instructions.md', kind: 'file', status: 'unbridged' },
		])
	})

	// At user scope `context.fileName` names files inside `~/.gemini/` only, so the settings entry
	// that bridges a repository cannot bridge the global file.
	it('checks GEMINI.md rather than the settings file at user scope', () => {
		const root = home(['.gemini'])
		write(root, '.gemini/settings.json', '{ "context": { "fileName": ["AGENTS.md"] } }')

		expect(diagnose(root).findings).toEqual([
			expect.objectContaining({
				path: '~/.gemini/GEMINI.md',
				problem: 'global-instructions-missing',
				repair: { command: '', instruction: `${handOver} run \`ln -s ~/.agents/AGENTS.md ~/.gemini/GEMINI.md\`` },
			}),
		])
	})

	// ── a home directory moved by a variable ──

	it('reads the user file from the directory a variable moves it to, and names the variable', () => {
		const root = home([])
		const codex = elsewhere()
		symlinkSync(join(root, '.agents', 'AGENTS.md'), join(codex, 'AGENTS.md'))

		expect(diagnose(root, [], { CODEX_HOME: codex })).toEqual({
			globalInstructions: [{ harness: 'codex', path: '$CODEX_HOME/AGENTS.md', kind: 'symlink', status: 'ok' }],
			findings: [],
		})
	})

	it('hands over the bridge at the moved path', () => {
		const root = home(['.claude', '.copilot'])
		const claude = elsewhere()
		const copilot = elsewhere()

		expect(
			diagnose(root, [], { CLAUDE_CONFIG_DIR: claude, COPILOT_HOME: copilot }).findings.map(({ path, repair }) => ({
				path,
				instruction: repair.instruction,
			})),
		).toEqual([
			{
				path: '$CLAUDE_CONFIG_DIR/CLAUDE.md',
				instruction: `${handOver} add the line \`@~/.agents/AGENTS.md\` to $CLAUDE_CONFIG_DIR/CLAUDE.md`,
			},
			{
				path: '$COPILOT_HOME/copilot-instructions.md',
				instruction: `${handOver} run \`ln -s ~/.agents/AGENTS.md $COPILOT_HOME/copilot-instructions.md\``,
			},
		])
	})

	it('reads an empty variable as unset', () => {
		expect(diagnose(home(['.codex']), [], { CODEX_HOME: '' }).globalInstructions).toEqual([
			{ harness: 'codex', path: '~/.codex/AGENTS.md', kind: 'none', status: 'missing' },
		])
	})

	// ── a file read in place of the user file ──

	it('reports a bridged user file as overridden where an override beside it holds content', () => {
		const root = home(['.codex'])
		symlinkSync('../.agents/AGENTS.md', join(root, '.codex', 'AGENTS.md'))
		write(root, '.codex/AGENTS.override.md', '# Mine\n')

		expect(diagnose(root)).toEqual({
			globalInstructions: [{ harness: 'codex', path: '~/.codex/AGENTS.md', kind: 'symlink', status: 'overridden' }],
			findings: [
				{
					path: '~/.codex/AGENTS.override.md',
					problem: 'global-instructions-overridden',
					detail:
						'the harness reads this file in place of its own user-scope file, so whatever that file loads goes unread, and this one does not load ~/.agents/AGENTS.md',
					repair: {
						command: '',
						instruction: `${handOver} move what ~/.codex/AGENTS.override.md says into ~/.agents/AGENTS.md and remove it`,
					},
				},
			],
		})
	})

	it('reports the user file under an override too, so both steps are handed over at once', () => {
		const root = home([])
		const codex = elsewhere()
		write(codex, 'AGENTS.override.md', '# Mine\n')

		expect(diagnose(root, [], { CODEX_HOME: codex }).findings.map(({ path, problem }) => ({ path, problem }))).toEqual([
			{ path: '$CODEX_HOME/AGENTS.override.md', problem: 'global-instructions-overridden' },
			{ path: '$CODEX_HOME/AGENTS.md', problem: 'global-instructions-missing' },
		])
	})

	it('reports an override without a finding where there is no global file to go unread', () => {
		const root = home(['.codex'], { global: false })
		write(root, '.codex/AGENTS.override.md', '# Mine\n')

		expect(diagnose(root)).toEqual({
			globalInstructions: [{ harness: 'codex', path: '~/.codex/AGENTS.md', kind: 'none', status: 'overridden' }],
			findings: [],
		})
	})

	// Codex skips a file that is empty once trimmed, and reads the next one.
	it('ignores an override that holds only whitespace', () => {
		const root = home(['.codex'])
		symlinkSync('../.agents/AGENTS.md', join(root, '.codex', 'AGENTS.md'))
		write(root, '.codex/AGENTS.override.md', '  \n')

		expect(diagnose(root).globalInstructions).toEqual([
			{ harness: 'codex', path: '~/.codex/AGENTS.md', kind: 'symlink', status: 'ok' },
		])
	})

	it('accepts an override that is itself a symlink to the global file', () => {
		const root = home(['.codex'])
		symlinkSync('../.agents/AGENTS.md', join(root, '.codex', 'AGENTS.override.md'))

		expect(diagnose(root)).toEqual({
			globalInstructions: [{ harness: 'codex', path: '~/.codex/AGENTS.override.md', kind: 'symlink', status: 'ok' }],
			findings: [],
		})
	})

	it('names where the step is written for a path no harness registers', () => {
		expect(repairFor('global-instructions-unbridged').repair({ file: '<path>' }, cli).instruction).toBe(
			`${handOver} add the bridge the harness page names for <path>`,
		)
	})
})

describe('diagnoseBridges', () => {
	function repository(): string {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-global-'))
		mkdirSync(join(root, '.agents', 'skills'), { recursive: true })
		mkdirSync(join(root, '.claude'), { recursive: true })
		symlinkSync('../.agents/skills', join(root, '.claude', 'skills'), 'junction')
		return root
	}

	it('checks the user-scope files only when given a home directory', () => {
		const root = repository()

		expect(diagnoseBridges({ root, cli }).globalInstructions).toEqual([])
		const result = diagnoseBridges({ root, cli, home: home(['.claude']) })
		expect(result.globalInstructions).toEqual([
			{ harness: 'claude-code', path: '~/.claude/CLAUDE.md', kind: 'none', status: 'missing' },
		])
		expect(result.findings.map(({ problem }) => problem)).toEqual(['global-instructions-missing'])
	})
})
