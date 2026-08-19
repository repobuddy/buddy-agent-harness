import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { diagnoseConfiguration } from './diagnose-configuration.ts'

const cli = 'bah'

function write(root: string, path: string, body: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), body)
}

/** A consolidated repository: canonical instructions, one canonical skill, a resolving bridge. */
function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-config-'))
	write(root, 'AGENTS.md', '# Agents\n')
	write(root, '.agents/skills/review/SKILL.md', '---\nname: review\ndescription: Reviews things.\n---\n')
	write(root, 'CLAUDE.md', '@AGENTS.md\n')
	return root
}

function link(root: string, target: string): void {
	mkdirSync(dirname(join(root, target)), { recursive: true })
	symlinkSync('../.agents/skills', join(root, target), 'junction')
}

function diagnose(root: string) {
	return diagnoseConfiguration({ root, git: new GitBridgeState(root), cli })
}

function problems(root: string): string[] {
	return diagnose(root).map((finding) => finding.problem)
}

function gitRepository(): string {
	const root = repository()
	execFileSync('git', ['init', '-q', '.'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
	return root
}

describe('diagnoseConfiguration', () => {
	it('reports nothing for a repository whose configuration is current', () => {
		const root = repository()
		link(root, '.claude/skills')

		expect(diagnose(root)).toEqual([])
	})

	describe('deprecated-harness', () => {
		it('reports a projection under a harness name that has been superseded', () => {
			const root = repository()
			link(root, '.windsurf/skills')

			const finding = diagnose(root).find((entry) => entry.problem === 'deprecated-harness')

			expect(finding).toMatchObject({ path: '.windsurf/skills' })
			expect(finding?.repair.instruction).toContain('.windsurf/skills')
		})

		it('leaves a superseded harness alone when it has no projection on disk', () => {
			const root = repository()
			mkdirSync(join(root, '.windsurf'), { recursive: true })

			expect(problems(root)).not.toContain('deprecated-harness')
		})
	})

	describe('ignored-bridge', () => {
		it('reports a bridge a .gitignore rule on its parent directory swallows', () => {
			const root = gitRepository()
			link(root, '.claude/skills')
			write(root, '.gitignore', '.claude/\n')

			expect(diagnose(root).find((entry) => entry.problem === 'ignored-bridge')).toMatchObject({
				path: '.claude/skills',
			})
		})

		it('leaves a tracked bridge alone', () => {
			const root = gitRepository()
			link(root, '.claude/skills')

			expect(problems(root)).not.toContain('ignored-bridge')
		})

		it('reports nothing outside a git repository, where no rule can be read', () => {
			const root = repository()
			link(root, '.claude/skills')
			write(root, '.gitignore', '.claude/\n')

			expect(problems(root)).not.toContain('ignored-bridge')
		})
	})

	describe('unread-local-override', () => {
		it('reports an AGENTS.local.md, which no harness reads', () => {
			const root = repository()
			write(root, 'AGENTS.local.md', '# Personal notes\n')

			expect(diagnose(root).find((entry) => entry.problem === 'unread-local-override')).toMatchObject({
				path: 'AGENTS.local.md',
			})
		})
	})

	describe('unloadable-skill', () => {
		it('reports a skill whose description carries an unquoted colon', () => {
			const root = repository()
			write(root, '.agents/skills/pdf/SKILL.md', '---\nname: pdf\ndescription: Use when: the user asks\n---\n')

			expect(diagnose(root).find((entry) => entry.problem === 'unloadable-skill')).toMatchObject({
				path: '.agents/skills/pdf/SKILL.md',
			})
		})

		it('accepts a description that quotes its colon', () => {
			const root = repository()
			write(root, '.agents/skills/pdf/SKILL.md', '---\nname: pdf\ndescription: "Use when: the user asks"\n---\n')

			expect(problems(root)).not.toContain('unloadable-skill')
		})

		it('reports a skill with no description', () => {
			const root = repository()
			write(root, '.agents/skills/pdf/SKILL.md', '---\nname: pdf\n---\n')

			expect(problems(root)).toContain('unloadable-skill')
		})

		it('reports a skill whose description key is present but empty', () => {
			const root = repository()
			write(root, '.agents/skills/pdf/SKILL.md', '---\nname: pdf\ndescription:\n---\n')

			expect(problems(root)).toContain('unloadable-skill')
		})

		it('reports a skill with no frontmatter block at all', () => {
			const root = repository()
			write(root, '.agents/skills/pdf/SKILL.md', '# PDF\n')

			expect(problems(root)).toContain('unloadable-skill')
		})

		// The skill still loads: a mismatched name is a warning, not a reason to skip it.
		it('leaves a name that does not match its directory alone', () => {
			const root = repository()
			write(root, '.agents/skills/pdf/SKILL.md', '---\nname: something-else\ndescription: Reads PDFs.\n---\n')

			expect(problems(root)).not.toContain('unloadable-skill')
		})

		it('ignores files under the canonical directory that are not a SKILL.md', () => {
			const root = repository()
			write(root, '.agents/skills/review/references/notes.md', 'no frontmatter here\n')

			expect(problems(root)).not.toContain('unloadable-skill')
		})
	})

	// Universal over the family, so the fixture has to span the family: a fault whose detail or
	// instruction came out empty would otherwise hide behind the one fault a narrower fixture reports.
	it('carries the repair for every finding it reports', () => {
		const root = gitRepository()
		link(root, '.windsurf/skills')
		link(root, '.claude/skills')
		write(root, '.gitignore', '.claude/\n')
		write(root, 'AGENTS.local.md', '# Personal\n')
		write(root, '.agents/skills/pdf/SKILL.md', '---\nname: pdf\n---\n')

		const findings = diagnose(root)

		expect(findings.map((finding) => finding.problem).sort()).toEqual([
			'deprecated-harness',
			'ignored-bridge',
			'unloadable-skill',
			'unread-local-override',
		])
		expect(findings.every((finding) => finding.repair.instruction.length > 0 && finding.detail.length > 0)).toBe(true)
	})

	// Every fault here is present-and-wrong configuration a person wrote, so correcting one is a
	// judgment call the `repair` skill offers rather than anything a shell can carry out. A caller
	// that runs each `command` it is handed must therefore run nothing at all for these.
	//
	// All four families are present at once on purpose: the claim is universal over the family, so
	// exercising three of them would leave the fourth free to grow a command nothing would catch.
	it('offers no runnable command for any of the four faults, because correcting one is judgment', () => {
		const root = gitRepository()
		link(root, '.windsurf/skills')
		link(root, '.claude/skills')
		write(root, '.gitignore', '.claude/\n')
		write(root, 'AGENTS.local.md', '# Personal\n')
		write(root, '.agents/skills/pdf/SKILL.md', '---\nname: pdf\n---\n')

		const findings = diagnose(root)

		expect(findings.map((finding) => finding.problem).sort()).toEqual([
			'deprecated-harness',
			'ignored-bridge',
			'unloadable-skill',
			'unread-local-override',
		])
		expect(findings.map((finding) => finding.repair.command)).toEqual(findings.map(() => ''))
	})

	// The wrapper this replaced read `Run ` + the repair, which turned every one of these into an
	// invitation to paste prose into a shell.
	it('carries each repair as a bare imperative, with nothing wrapping it', () => {
		const root = repository()
		write(root, 'AGENTS.local.md', '# Personal\n')

		const [finding] = diagnose(root)

		expect(finding?.repair.instruction).toBe(
			'move AGENTS.local.md to CLAUDE.local.md, or consolidate it into AGENTS.md — `/buddy-agent-harness:repair` offers the correction',
		)
	})

	it('reports every fault it finds in one pass, across families', () => {
		const root = gitRepository()
		link(root, '.windsurf/skills')
		write(root, 'AGENTS.local.md', '# Personal\n')
		write(root, '.agents/skills/pdf/SKILL.md', '---\nname: pdf\n---\n')

		expect(problems(root)).toEqual(
			expect.arrayContaining(['deprecated-harness', 'unread-local-override', 'unloadable-skill']),
		)
	})
})
