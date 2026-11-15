import { cpSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { type SyncLeft, type SyncWrite, syncCopyBridges } from '../copy-sync/copy-sync.ts'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import type { Harness, HarnessName } from '../harness-registry/harness-registry.ts'

function skillNames(skillsDirectory: string): string[] {
	return readdirSync(skillsDirectory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()
}

function pathOccupied(path: string): boolean {
	try {
		lstatSync(path)
		return true
	} catch {
		return false
	}
}

/**
 * Compares resolved paths, not link text, so an absolute link, a Windows junction, or a link
 * reached through a parent symlink all read as correct.
 */
export function linksTo(target: string, canonical: string): boolean {
	try {
		if (!lstatSync(target).isSymbolicLink()) return false
		return realpathSync(target) === realpathSync(canonical)
	} catch {
		return false
	}
}

/** Creates the canonical directory when absent, so a fresh repository reports zero skills. */
export function countSkills(canonicalSkills: string): number {
	mkdirSync(canonicalSkills, { recursive: true })
	return skillNames(canonicalSkills).length
}

/**
 * Windows junctions resolve a relative target against the process directory, not the link's own, so
 * Windows gets an absolute path; everywhere else stays relative to survive the repository moving.
 */
function linkTarget(target: string, canonicalSkills: string): string {
	return platform() === 'win32' ? resolve(canonicalSkills) : relative(dirname(target), canonicalSkills)
}

/**
 * `true` = every conflicting target; a list names them individually so a run can't reach past what
 * it named; `false`/empty = none, which is what stops the run on conflict.
 */
export type ForceSelection = boolean | readonly string[]

/**
 * A valueless `--force` arrives as the literal string `"true"` — the parser's flag encoding — and
 * means every target; anything else is a comma-separated list.
 */
export function parseForce(value: string): ForceSelection {
	if (value === 'true') return true
	if (value === 'false') return false
	return value
		.split(',')
		.map((target) => target.trim())
		.filter((target) => target.length > 0)
}

export type ProjectSkillsOptions = {
	root: string
	canonicalSkills: string
	harnesses: readonly Harness[]
	copy: boolean
	force: ForceSelection
}

export type ProjectSkillsResult = {
	linked: HarnessName[]
	skipped: HarnessName[]
	/** Each file the sync of an existing copy wrote, and the side it took. */
	written: SyncWrite[]
	/** Each file of an existing copy the sync left for the user. */
	left: SyncLeft[]
}

/** A directory, not a link, already at the projection path. */
function isExistingCopy(target: string): boolean {
	try {
		return lstatSync(target).isDirectory()
	} catch {
		return false
	}
}

type Projection = { harness: Harness; target: string }

function projectionsOf(root: string, harnesses: readonly Harness[]): Projection[] {
	return harnesses
		.filter((harness) => harness.project.skillsDirectory)
		.map((harness) => ({ harness, target: join(root, harness.project.skillsDirectory as string) }))
}

function forcing(root: string, force: ForceSelection): (target: string) => boolean {
	const named = Array.isArray(force) ? force : []
	return (target) => force === true || named.some((given) => namesTarget(root, target, given))
}

/** The existing copies a run syncs rather than replaces: every one no request to replace covers. */
export function copiesToSync(root: string, harnesses: readonly Harness[], force: ForceSelection): string[] {
	const forces = forcing(root, force)
	return projectionsOf(root, harnesses)
		.filter(({ target }) => isExistingCopy(target) && !forces(target))
		.map(({ harness }) => harness.project.skillsDirectory as string)
}

/**
 * Resolves both sides so the repo-relative path a conflict message prints also selects it back, and
 * so does an absolute path naming the same directory.
 */
function namesTarget(root: string, target: string, given: string): boolean {
	return resolve(root, given) === resolve(target)
}

/** Symlinks by default; falls back to a copy where the platform refuses the link. */
export function projectSkills({
	root,
	canonicalSkills,
	harnesses,
	copy,
	force,
}: ProjectSkillsOptions): ProjectSkillsResult {
	const projections = projectionsOf(root, harnesses)

	const named = Array.isArray(force) ? force : []
	// An unmatched force target is a typo, not a narrower run — ignoring it would misattribute the
	// conflict error it was meant to avoid.
	const unknown = named.filter((given) => !projections.some(({ target }) => namesTarget(root, target, given)))
	if (unknown.length) {
		throw new Error(
			`No skill target matches:\n${unknown.map((given) => `- ${given}`).join('\n')}\n` +
				`Targets for the enabled harnesses:\n${projections.map(({ target }) => `- ${relative(root, target)}`).join('\n')}`,
		)
	}

	const forces = forcing(root, force)

	// An existing copy is synced, not a conflict, unless a request to replace covers it.
	const syncing = new Set(copiesToSync(root, harnesses, force))
	const conflicts = projections.filter(
		({ target }) => pathOccupied(target) && !linksTo(target, canonicalSkills) && !isExistingCopy(target),
	)
	const blocked = conflicts.filter(({ target }) => !forces(target))

	// No target named: nothing distinguishes one conflict from another, so refuse before writing.
	// A target named: the unnamed conflicts are what this run was told to leave alone, so skip and
	// report them instead of refusing.
	if (blocked.length && named.length === 0) {
		throw new Error(
			`Refusing to replace existing skill targets:\n${blocked.map(({ target }) => `- ${relative(root, target)}`).join('\n')}`,
		)
	}

	const skipped = new Set(blocked.map(({ harness }) => harness.name))
	const git = new GitBridgeState(root)

	for (const { harness, target } of projections) {
		const path = harness.project.skillsDirectory as string
		if (skipped.has(harness.name) || syncing.has(path)) continue
		mkdirSync(dirname(target), { recursive: true })
		if (linksTo(target, canonicalSkills)) continue
		if (pathOccupied(target)) rmSync(target, { recursive: true, force: true })
		if (!copy) {
			try {
				symlinkSync(linkTarget(target, canonicalSkills), target, platform() === 'win32' ? 'junction' : undefined)
				continue
			} catch (error) {
				if (pathOccupied(target)) throw error
			}
		}
		cpSync(canonicalSkills, target, { recursive: true })
		git.protect(path)
	}

	const synced = syncCopyBridges({ root, bridges: [...syncing] })

	return {
		linked: projections.filter(({ harness }) => !skipped.has(harness.name)).map(({ harness }) => harness.name),
		skipped: projections.filter(({ harness }) => skipped.has(harness.name)).map(({ harness }) => harness.name),
		written: synced.written,
		left: synced.left,
	}
}
