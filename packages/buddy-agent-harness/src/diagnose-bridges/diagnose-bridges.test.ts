import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diagnoseConfiguration } from '../diagnose-configuration/diagnose-configuration.ts'
import { diagnoseBridges } from './diagnose-bridges.ts'
import { GitBridgeState } from './git-bridge-state.ts'

const cli = 'bah'

/** Canonical on both axes: `.agents/skills` for skills, `AGENTS.md` bridged into `CLAUDE.md`. */
function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-doctor-'))
	writeSkill(join(root, '.agents', 'skills'), '# Review')
	writeFileSync(join(root, 'AGENTS.md'), '# Instructions\n')
	writeFileSync(join(root, 'CLAUDE.md'), '@AGENTS.md\n')
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
			instructions: [{ harness: 'claude-code', path: 'CLAUDE.md', kind: 'import', status: 'ok' }],
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
				problem: 'degraded',
				detail: 'expected a directory but found a regular file — checkout without core.symlinks',
				repair: {
					command: 'bah init --copy --force .claude/skills',
					instruction: 'run `bah init --copy --force .claude/skills` to rebuild .claude/skills as a real directory',
				},
			},
		])
	})

	it('reports an absent bridge as missing', () => {
		const root = repository()

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges).toEqual([
			{ harness: 'claude-code', path: '.claude/skills', kind: 'none', status: 'missing' },
		])
		expect(result.findings[0]).toMatchObject({
			path: '.claude/skills',
			repair: { command: 'bah init', instruction: 'run `bah init` to create the bridge at .claude/skills' },
		})
	})

	it('reports a symlink pointing somewhere other than the canonical directory', () => {
		const root = repository()
		mkdirSync(join(root, '.claude'), { recursive: true })
		symlinkSync('../elsewhere', join(root, '.claude', 'skills'), 'junction')

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges).toEqual([
			{ harness: 'claude-code', path: '.claude/skills', kind: 'symlink', status: 'stale' },
		])
		expect(result.findings[0]).toMatchObject({
			repair: {
				command: 'bah init --force .claude/skills',
				instruction: 'run `bah init --force .claude/skills` to repoint .claude/skills at .agents/skills',
			},
		})
	})

	// A link a user wrote by hand, or one Windows wrote as a junction, spells its target differently
	// from the relative path `init` writes. It still resolves, so it is still a healthy bridge.
	it('reports a symlink written as an absolute path as resolving', () => {
		const root = repository()
		mkdirSync(join(root, '.claude'), { recursive: true })
		symlinkSync(join(root, '.agents', 'skills'), join(root, '.claude', 'skills'), 'junction')

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges).toEqual([{ harness: 'claude-code', path: '.claude/skills', kind: 'symlink', status: 'ok' }])
		expect(result.findings).toEqual([])
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
			problem: 'no-canonical',
			detail: 'the canonical skill directory does not exist, so no bridge can resolve',
			repair: { command: 'bah init', instruction: 'run `bah init` to create .agents/skills and the bridges into it' },
		})
	})

	it('reads a bridge against a canonical directory that is not there', () => {
		const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-doctor-'))
		writeSkill(join(root, '.claude', 'skills'), '# Review')

		const result = diagnoseBridges({ root, cli })

		expect(result.bridges[0]).toMatchObject({ kind: 'copy', status: 'diverged' })
		// Skills first, then instructions, each section led by the canonical target it resolves into.
		// No `CLAUDE.md` row follows: with no AGENTS.md anywhere there is nothing for one to import.
		expect(result.findings.map((finding) => finding.path)).toEqual(['.agents/skills', '.claude/skills', 'AGENTS.md'])
	})

	it('checks every bridge the requested harnesses add', () => {
		const root = repository()

		const result = diagnoseBridges({ root, harnesses: ['windsurf'], cli })

		expect(result.bridges.map((bridge) => bridge.path)).toEqual(['.claude/skills', '.windsurf/skills'])
	})

	it('adds no bridge for a harness that reads the canonical directory itself', () => {
		const root = repository()

		const result = diagnoseBridges({ root, harnesses: ['gemini-cli'], cli })

		expect(result.bridges.map((bridge) => bridge.path)).toEqual(['.claude/skills'])
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
				problem: 'unpinned-copy',
				detail:
					'tracked copy without the skip-worktree bit — the tree is dirty with content that must not be committed',
				repair: {
					command: 'git ls-files -z .claude/skills | xargs -0 git update-index --skip-worktree',
					instruction:
						'run `git ls-files -z .claude/skills | xargs -0 git update-index --skip-worktree` to restore the skip-worktree bit',
				},
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
				repair: {
					command: '',
					instruction:
						'replace .agents/skills with .claude/skills to keep the newer edit, then run `bah init --force .claude/skills`',
				},
			})
		})

		it('names the canonical directory when only it moved', () => {
			const root = committedCopy()
			writeFileSync(canonicalSkill(root), '# Review revised')

			const result = diagnoseBridges({ root, cli })

			expect(result.divergence).toEqual([{ path: '.claude/skills', direction: 'canonical' }])
			expect(result.findings[0]).toMatchObject({
				repair: {
					command: 'bah init --copy --force .claude/skills',
					instruction:
						'run `bah init --copy --force .claude/skills` to rebuild .claude/skills from the newer .agents/skills',
				},
			})
		})

		it('refuses to guess when both sides moved', () => {
			const root = committedCopy()
			writeFileSync(bridgeSkill(root), '# Review through the bridge')
			writeFileSync(canonicalSkill(root), '# Review revised')

			const result = diagnoseBridges({ root, cli })

			expect(result.divergence).toEqual([{ path: '.claude/skills', direction: 'both' }])
			expect(result.findings[0]).toMatchObject({
				problem: 'diverged-both',
				detail: 'both sides changed since they last agreed — rebuilding would discard one of them',
				// The diff is a diagnostic, not the repair, so it stays in the prose and offers no command.
				repair: {
					command: '',
					instruction:
						'reconcile .agents/skills with .claude/skills by hand — rebuilding would discard one of them; `git diff --no-index .agents/skills .claude/skills` shows what differs',
				},
			})
		})

		it('reports an unknown direction when git records no commit where the two agreed', () => {
			const root = repository()
			writeSkill(join(root, '.claude', 'skills'), '# Review through the bridge')

			const result = diagnoseBridges({ root, cli })

			expect(result.divergence).toEqual([{ path: '.claude/skills', direction: 'unknown' }])
			expect(result.findings[0]).toMatchObject({
				problem: 'diverged-unknown',
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

		// The section exists so a caller reads which side moved without parsing the repair prose.
		it('names which side moved for every diverged bridge', () => {
			const root = committedCopy()
			writeFileSync(bridgeSkill(root), '# Review through the bridge')

			const diverged = diagnoseBridges({ root, cli })

			expect(diverged.divergence).toEqual([{ path: '.claude/skills', direction: 'bridge' }])
			expect(diverged.findings).toHaveLength(diverged.divergence.length)
			expect(diagnoseBridges({ root: repository(), cli }).divergence).toEqual([])
		})

		it('detects an added file in the bridge as movement on the bridge side', () => {
			const root = committedCopy()
			writeFileSync(join(root, '.claude', 'skills', 'review', 'extra.md'), 'extra')

			expect(diagnoseBridges({ root, cli }).divergence).toEqual([{ path: '.claude/skills', direction: 'bridge' }])
		})
	})
})

/** Every file below `root`, with its bytes, so a write of any kind shows as a difference. */
function snapshot(root: string): Record<string, string> {
	return Object.fromEntries(
		readdirSync(root, { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) => {
				const path = join(entry.parentPath, entry.name)
				return [path.slice(root.length), readFileSync(path, 'base64')] as const
			})
			.sort(([left], [right]) => left.localeCompare(right)),
	)
}

// Read-only is what makes the command safe to run from a session-start hook, and the property is
// worth asserting rather than inferring from the absence of a write call.
describe('the detect-and-repair seam', () => {
	it('writes nothing while detecting, whatever it finds', () => {
		const root = committedCopy()
		writeFileSync(bridgeSkill(root), '# Review through the bridge')
		writeFileSync(join(root, 'AGENTS.local.md'), 'a local note\n')
		mkdirSync(join(root, '.windsurf', 'skills'), { recursive: true })
		writeFileSync(join(root, '.windsurf', 'skills', 'kept.md'), 'projected\n')
		const before = snapshot(root)

		const result = diagnoseBridges({ root, cli })
		const configuration = diagnoseConfiguration({ root, git: new GitBridgeState(root), cli })

		expect(result.findings.length + configuration.length).toBeGreaterThan(1)
		expect(snapshot(root)).toEqual(before)
	})
})
