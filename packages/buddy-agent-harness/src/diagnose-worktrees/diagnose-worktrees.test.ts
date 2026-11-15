import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { diagnoseWorktrees } from './diagnose-worktrees.ts'

const cli = 'bah'

function write(root: string, path: string, body: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), body)
}

const headSettings = '{\n\t"worktree": { "baseRef": "head" }\n}\n'

/** A git repository worked in with Claude Code, carrying every offer. */
function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-worktrees-'))
	execFileSync('git', ['init', '-q', '.'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
	write(root, '.gitignore', '.claude/worktrees/\n')
	write(root, '.claude/settings.json', headSettings)
	return root
}

function diagnose(root: string) {
	return diagnoseWorktrees({ root, git: new GitBridgeState(root), cli })
}

function problems(root: string): string[] {
	return diagnose(root).map((finding) => `${finding.problem} ${finding.path}`)
}

describe('diagnoseWorktrees', () => {
	it('reports nothing for a repository that ignores the worktrees and sets the base', () => {
		expect(diagnose(repository())).toEqual([])
	})

	it('reports nothing where no .claude directory exists', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-worktrees-'))
		write(root, 'biome.json', '{}\n')

		expect(diagnose(root)).toEqual([])
	})

	describe('worktrees-untracked', () => {
		it('reports a repository whose .gitignore leaves .claude/worktrees/ tracked', () => {
			const root = repository()
			write(root, '.gitignore', 'node_modules\n')

			const finding = diagnose(root).find((entry) => entry.problem === 'worktrees-untracked')

			expect(finding).toMatchObject({ path: '.gitignore', repair: { command: '' } })
			expect(finding?.repair.instruction).toContain('`.claude/worktrees/`')
		})

		it('accepts a rule on a parent directory', () => {
			const root = repository()
			write(root, '.gitignore', '.claude/\n')

			expect(problems(root)).toEqual([])
		})

		it('reports nothing outside a git repository, where no rule can be read', () => {
			const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-worktrees-'))
			write(root, '.claude/settings.json', headSettings)

			expect(problems(root)).toEqual([])
		})
	})

	describe('worktrees-in-repository', () => {
		it('reports each linked worktree under .claude/worktrees/', () => {
			const root = repository()
			write(root, '.claude/worktrees/bold-oak/.git', 'gitdir: elsewhere\n')
			write(root, '.claude/worktrees/agent-a1/.git', 'gitdir: elsewhere\n')
			const findings = diagnose(root)

			expect(problems(root)).toEqual([
				'worktrees-in-repository .claude/worktrees/agent-a1',
				'worktrees-in-repository .claude/worktrees/bold-oak',
			])
			expect(findings[0]?.repair).toMatchObject({ command: '' })
			expect(findings[0]?.repair.instruction).toContain('git worktree move')
		})

		it('skips an entry that is not a worktree', () => {
			const root = repository()
			write(root, '.claude/worktrees/notes.md', 'notes\n')
			mkdirSync(join(root, '.claude/worktrees/empty'))

			expect(problems(root)).toEqual([])
		})
	})

	describe('worktrees-self-ignored', () => {
		it('reports a biome.json that excludes the worktrees', () => {
			const root = repository()
			write(root, 'biome.json', '{ "files": { "includes": ["**", "!**/.claude/worktrees"] } }\n')

			expect(problems(root)).toEqual(['worktrees-self-ignored biome.json'])
			expect(diagnose(root)[0]?.repair.instruction).toContain('remove the `.claude/worktrees` exclusion')
		})

		it('reports a biome.jsonc the same way', () => {
			const root = repository()
			write(root, 'biome.jsonc', '// config\n{ "files": { "includes": ["!**/.claude/worktrees"] } }\n')

			expect(problems(root)).toEqual(['worktrees-self-ignored biome.jsonc'])
		})

		it('accepts a biome.json that does not mention the worktrees', () => {
			const root = repository()
			write(root, 'biome.json', '{ "files": { "includes": ["**", "!**/dist"] } }\n')

			expect(problems(root)).toEqual([])
		})
	})

	describe('worktree-base-unset', () => {
		const unhooked = ['worktree-base-unset .claude/settings.json']

		it('reports a .claude directory with no settings file', () => {
			const root = repository()
			rmSync(join(root, '.claude/settings.json'))
			mkdirSync(join(root, '.claude'), { recursive: true })
			const finding = diagnose(root).find((entry) => entry.problem === 'worktree-base-unset')

			expect(finding).toMatchObject({ path: '.claude/settings.json', repair: { command: '' } })
			expect(finding?.repair.instruction).toContain('"baseRef": "head"')
		})

		it('reports settings that do not parse, since no base is read from them', () => {
			const root = repository()
			write(root, '.claude/settings.json', '{ "worktree": ')

			expect(problems(root)).toEqual(unhooked)
		})

		it('reports settings that leave worktree.baseRef unset', () => {
			const root = repository()
			write(root, '.claude/settings.json', '{ "worktree": { "bgIsolation": "none" } }\n')

			expect(problems(root)).toEqual(unhooked)
		})

		it('reports settings with no worktree key', () => {
			const root = repository()
			write(root, '.claude/settings.json', '{ "enabledPlugins": {} }\n')

			expect(problems(root)).toEqual(unhooked)
		})

		it('leaves an explicit "fresh" alone, since it is the owner\'s choice', () => {
			const root = repository()
			write(root, '.claude/settings.json', '{ "worktree": { "baseRef": "fresh" } }\n')

			expect(problems(root)).toEqual([])
		})
	})

	it('reports all four at once', () => {
		const root = repository()
		write(root, '.gitignore', '')
		write(root, 'biome.json', '{ "files": { "includes": ["!**/.claude/worktrees"] } }\n')
		write(root, '.claude/settings.json', '{}\n')
		write(root, '.claude/worktrees/bold-oak/.git', 'gitdir: elsewhere\n')

		expect(problems(root)).toEqual([
			'worktrees-in-repository .claude/worktrees/bold-oak',
			'worktrees-untracked .gitignore',
			'worktrees-self-ignored biome.json',
			'worktree-base-unset .claude/settings.json',
		])
	})
})
