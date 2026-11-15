import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type RepairAction, repairFor, type WorktreeProblem } from '../diagnose-bridges/doctor-guidance.ts'
import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { isRecord } from '../is-record/is-record.ts'

/**
 * The agent-worktree half of `doctor`: where Claude Code puts a repository's agent worktrees, and
 * what the repository lacks, or carries, that breaks them. Read-only.
 */
export type WorktreeFinding = {
	/** Repository-relative path the finding is about. */
	path: string
	problem: WorktreeProblem
	detail: string
	/** Always an empty `command`: each repair is an offer the owner approves. */
	repair: RepairAction
}

export type DiagnoseWorktreesOptions = {
	root: string
	git: GitBridgeState
	/** How to name this tool in the repair commands. */
	cli: string
}

/** The trailing slash matters: `git check-ignore` matches a directory rule only against a directory path. */
export const worktreeDirectory = '.claude/worktrees/'

const biomeConfigs = ['biome.json', 'biome.jsonc']
const claudeSettings = '.claude/settings.json'

/** `undefined` when the file is missing or does not parse; either way Claude Code reads no base from it. */
function readJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, 'utf8'))
	} catch {
		return undefined
	}
}

/** A linked worktree's root holds a `.git` file pointing back at the main checkout. */
function worktreesInside(root: string): string[] {
	const directory = join(root, worktreeDirectory)
	if (!existsSync(directory)) return []
	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && existsSync(join(directory, entry.name, '.git')))
		.map((entry) => `${worktreeDirectory}${entry.name}`)
		.sort()
}

/**
 * Checked only where `.claude/` exists, the sign the repository is worked in with Claude Code.
 * Biome is the one tool checked for a self-matching exclusion: it is the confirmed failure.
 */
export function diagnoseWorktrees({ root, git, cli }: DiagnoseWorktreesOptions): WorktreeFinding[] {
	if (!existsSync(join(root, '.claude'))) return []

	const findings: WorktreeFinding[] = []
	const add = (path: string, problem: WorktreeProblem) => {
		const { detail, repair } = repairFor(problem)
		findings.push({ path, problem, detail, repair: repair({ file: path }, cli) })
	}

	for (const worktree of worktreesInside(root)) add(worktree, 'worktrees-in-repository')

	if (git.isRepository() && !git.isIgnored(worktreeDirectory)) add('.gitignore', 'worktrees-untracked')

	for (const config of biomeConfigs) {
		const path = join(root, config)
		if (existsSync(path) && readFileSync(path, 'utf8').includes('.claude/worktrees'))
			add(config, 'worktrees-self-ignored')
	}

	const settings = readJson(join(root, claudeSettings))
	const worktree = isRecord(settings) ? settings['worktree'] : undefined
	// An explicit `"fresh"` is the owner's choice; only an unset key is reported.
	if (!isRecord(worktree) || worktree['baseRef'] === undefined) add(claudeSettings, 'worktree-base-unset')

	return findings
}
