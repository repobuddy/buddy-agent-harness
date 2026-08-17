import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diagnoseBridges } from './diagnose-bridges.ts'

const cli = 'bah'

function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-doctor-'))
	writeSkill(join(root, '.agents', 'skills'), '# Review')
	return root
}

function writeSkill(directory: string, body: string): void {
	mkdirSync(join(directory, 'review'), { recursive: true })
	writeFileSync(join(directory, 'review', 'SKILL.md'), body)
}

function git(root: string, ...args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

/** A repository whose bridge and canonical directory are committed as identical copies. */
function committedCopy(): string {
	const root = repository()
	git(root, 'init', '-q', '.')
	git(root, 'config', 'user.email', 'doctor@example.com')
	git(root, 'config', 'user.name', 'doctor')
	writeSkill(join(root, '.claude', 'skills'), '# Review')
	git(root, 'add', '-A')
	git(root, 'commit', '-qm', 'agreed')
	return root
}

function bridgeSkill(root: string): string {
	return join(root, '.claude', 'skills', 'review', 'SKILL.md')
}

function canonicalSkill(root: string): string {
	return join(root, '.agents', 'skills', 'review', 'SKILL.md')
}

function link(root: string, target: string): void {
	mkdirSync(dirname(join(root, target)), { recursive: true })
	symlinkSync('../.agents/skills', join(root, target), 'junction')
}

describe('diagnoseBridges', () => {
	it('reports a resolving symlink and leaves harnesses that read the canonical directory out', () => {
		const root = repository()
		link(root, '.claude/skills')

		const result = diagnoseBridges({ root, cli })

		expect(result).toEqual({
			bridges: [{ harness: 'claude-code', path: '.claude/skills', kind: 'symlink', status: 'ok' }],
			divergence: [],
			findings: [],
		})
	})

	// The flagship failure: a checkout with core.symlinks=false leaves a regular file behind.
	it('detects a symlink checked out as a regular file and names the copy repair', () => {
		const root = repository()
		mkdirSync(join(root, '.claude'), { recursive: true })
		writeFileSync(join(root, '.claude', 'skills'), '../.agents/skills')

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges).toEqual([
			{ harness: 'claude-code', path: '.claude/skills', kind: 'file', status: 'degraded' },
		])
		expect(result.findings).toEqual([
			{
				path: '.claude/skills',
				detail: 'expected a directory but found a regular file — checkout without core.symlinks',
				repair: 'bah init --copy --force',
			},
		])
	})

	it('reports an absent bridge and points at a plain init', () => {
		const root = repository()

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges).toEqual([
			{ harness: 'claude-code', path: '.claude/skills', kind: 'none', status: 'missing' },
		])
		expect(result.findings[0]).toMatchObject({ path: '.claude/skills', repair: 'bah init' })
	})

	it('reports a symlink pointing somewhere other than the canonical directory', () => {
		const root = repository()
		mkdirSync(join(root, '.claude'), { recursive: true })
		symlinkSync('../elsewhere', join(root, '.claude', 'skills'), 'junction')

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges).toEqual([
			{ harness: 'claude-code', path: '.claude/skills', kind: 'symlink', status: 'stale' },
		])
		expect(result.findings[0]).toMatchObject({ repair: 'bah init --force' })
	})

	it('reports a correctly named symlink whose target no longer exists', () => {
		const root = repository()
		link(root, '.claude/skills')
		rmSync(join(root, '.agents', 'skills'), { recursive: true })

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges[0]).toMatchObject({ kind: 'symlink', status: 'stale' })
	})

	it('reports a missing canonical directory once, before the bridges', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-doctor-'))

		const result = diagnoseBridges({ root, cli })

		expect(result.findings[0]).toEqual({
			path: '.agents/skills',
			detail: 'the canonical skill directory does not exist, so no bridge can resolve',
			repair: 'bah init',
		})
	})

	it('reads a bridge against a canonical directory that is not there', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-doctor-'))
		writeSkill(join(root, '.claude', 'skills'), '# Review')

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges[0]).toMatchObject({ kind: 'copy', status: 'diverged' })
		expect(result.findings.map((finding) => finding.path)).toEqual(['.agents/skills', '.claude/skills'])
	})

	it('checks every bridge the requested harnesses add', () => {
		const root = repository()

		const result = diagnoseBridges({ root, harnesses: ['gemini-cli'], cli })

		expect(result.bridges.map((bridge) => bridge.path)).toEqual(['.claude/skills', '.gemini/skills'])
	})

	it('accepts an in-sync copy outside a repository without flagging the skip-worktree bit', () => {
		const root = repository()
		writeSkill(join(root, '.claude', 'skills'), '# Review')

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges).toEqual([{ harness: 'claude-code', path: '.claude/skills', kind: 'copy', status: 'ok' }])
		expect(result.findings).toEqual([])
	})

	it('flags a copy that differs only in file names', () => {
		const root = repository()
		mkdirSync(join(root, '.claude', 'skills', 'review'), { recursive: true })
		writeFileSync(join(root, '.claude', 'skills', 'review', 'OTHER.md'), '# Review')

		expect(diagnoseBridges({ root, cli }).bridges[0]).toMatchObject({ status: 'diverged' })
	})

	it('flags a copy holding a different number of files', () => {
		const root = repository()
		writeSkill(join(root, '.claude', 'skills'), '# Review')
		writeFileSync(join(root, '.claude', 'skills', 'review', 'extra.md'), 'extra')

		expect(diagnoseBridges({ root, cli }).bridges[0]).toMatchObject({ status: 'diverged' })
	})

	it('reports a tracked copy whose skip-worktree bit has been lost, and clears it once set', () => {
		const root = committedCopy()

		expect(diagnoseBridges({ root, cli }).findings).toEqual([
			{
				path: '.claude/skills',
				detail:
					'tracked copy without the skip-worktree bit — the tree is dirty with content that must not be committed',
				repair: 'git ls-files -z .claude/skills | xargs -0 git update-index --skip-worktree',
			},
		])

		git(root, 'update-index', '--skip-worktree', '.claude/skills/review/SKILL.md')
		expect(diagnoseBridges({ root, cli }).findings).toEqual([])
	})

	it('leaves an untracked copy inside a repository alone', () => {
		const root = repository()
		git(root, 'init', '-q', '.')
		writeSkill(join(root, '.claude', 'skills'), '# Review')

		expect(diagnoseBridges({ root, cli }).findings).toEqual([])
	})

	describe('divergence direction', () => {
		it('names the bridge when only the bridge moved', () => {
			const root = committedCopy()
			writeFileSync(bridgeSkill(root), '# Review through the bridge')

			const result = diagnoseBridges({ root, cli })

			expect(result.divergence).toEqual([{ path: '.claude/skills', direction: 'bridge' }])
			expect(result.findings[0]).toMatchObject({
				repair: 'replace .agents/skills with .claude/skills to keep the newer edit and then run bah init --force',
			})
		})

		it('names the canonical directory when only it moved', () => {
			const root = committedCopy()
			writeFileSync(canonicalSkill(root), '# Review revised')

			const result = diagnoseBridges({ root, cli })

			expect(result.divergence).toEqual([{ path: '.claude/skills', direction: 'canonical' }])
			expect(result.findings[0]).toMatchObject({ repair: 'bah init --copy --force' })
		})

		it('refuses to guess when both sides moved', () => {
			const root = committedCopy()
			writeFileSync(bridgeSkill(root), '# Review through the bridge')
			writeFileSync(canonicalSkill(root), '# Review revised')

			const result = diagnoseBridges({ root, cli })

			expect(result.divergence).toEqual([{ path: '.claude/skills', direction: 'both' }])
			expect(result.findings[0]).toMatchObject({
				detail: 'both sides changed since they last agreed — rebuilding would discard one of them',
				repair: 'git diff --no-index .agents/skills .claude/skills and reconcile by hand',
			})
		})

		it('reports an unknown direction when git records no commit where the two agreed', () => {
			const root = repository()
			writeSkill(join(root, '.claude', 'skills'), '# Review through the bridge')

			const result = diagnoseBridges({ root, cli })

			expect(result.divergence).toEqual([{ path: '.claude/skills', direction: 'unknown' }])
			expect(result.findings[0]).toMatchObject({
				detail: 'contents differ and no commit where they agreed was found — which side moved is unknown',
			})
		})

		it('reports an unknown direction in a repository with no commits at all', () => {
			const root = repository()
			git(root, 'init', '-q', '.')
			writeSkill(join(root, '.claude', 'skills'), '# Review through the bridge')

			expect(diagnoseBridges({ root, cli }).divergence).toEqual([{ path: '.claude/skills', direction: 'unknown' }])
		})

		it('reports an unknown direction when the two paths were never committed together', () => {
			const root = repository()
			git(root, 'init', '-q', '.')
			git(root, 'config', 'user.email', 'doctor@example.com')
			git(root, 'config', 'user.name', 'doctor')
			writeSkill(join(root, '.claude', 'skills'), '# Review through the bridge')
			git(root, 'add', '-A')
			git(root, 'commit', '-qm', 'never agreed')

			expect(diagnoseBridges({ root, cli }).divergence).toEqual([{ path: '.claude/skills', direction: 'unknown' }])
		})

		it('reports an unknown direction when only one side is present in history', () => {
			const root = repository()
			git(root, 'init', '-q', '.')
			git(root, 'config', 'user.email', 'doctor@example.com')
			git(root, 'config', 'user.name', 'doctor')
			git(root, 'add', '-A')
			git(root, 'commit', '-qm', 'canonical only')
			writeSkill(join(root, '.claude', 'skills'), '# Review through the bridge')

			expect(diagnoseBridges({ root, cli }).divergence).toEqual([{ path: '.claude/skills', direction: 'unknown' }])
		})

		it('detects an added file in the bridge as movement on the bridge side', () => {
			const root = committedCopy()
			writeFileSync(join(root, '.claude', 'skills', 'review', 'extra.md'), 'extra')

			expect(diagnoseBridges({ root, cli }).divergence).toEqual([{ path: '.claude/skills', direction: 'bridge' }])
		})
	})
})
