import { cpSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { platform } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
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
 * Whether `target` is a symbolic link that resolves to `canonical`. Resolved paths are compared
 * rather than link text, so a link a user wrote as an absolute path, one this tool wrote as a
 * Windows junction, and one reached through a symbolic link in a parent directory all read as the
 * correct bridge. A link that no longer resolves is not.
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
 * A junction is the only link Windows grants an unprivileged process, and Node resolves a relative
 * junction target against the process directory rather than the link's own, so Windows is given the
 * absolute path. Every other platform keeps the link relative, so it survives the repository moving.
 */
function linkTarget(target: string, canonicalSkills: string): string {
	return platform() === 'win32' ? resolve(canonicalSkills) : relative(dirname(target), canonicalSkills)
}

/**
 * Which conflicting targets a run may replace. `true` is every one of them; a list names them
 * individually, so a run invoked to fix one bridge cannot reach past it to another. `false` and an
 * empty list both mean none, which is what makes a conflict stop the run.
 */
export type ForceSelection = boolean | readonly string[]

/**
 * Translates what the option parser hands back into a selection. A valueless `--force` arrives as
 * the literal string `true` — that is how the parser encodes a flag given no value — and means
 * every conflicting target, which is what keeps an existing `init --force` doing what it always did.
 * Anything else is a comma-separated list of targets.
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
	/** Harnesses whose target now points at the canonical directory. */
	linked: HarnessName[]
	/** Harnesses left untouched because their target conflicts and `--force` did not name it. */
	skipped: HarnessName[]
}

/**
 * Targets are matched against what the caller typed, resolved against the repository root, so the
 * repo-relative form the conflict message prints is the form that selects it back — and an absolute
 * path naming the same directory selects it too.
 */
function namesTarget(root: string, target: string, given: string): boolean {
	return resolve(root, given) === resolve(target)
}

/**
 * Points every harness that cannot read `.agents/skills` at the canonical directory. Symlinking is
 * preferred; a platform that refuses the link falls back to a copy.
 */
export function projectSkills({
	root,
	canonicalSkills,
	harnesses,
	copy,
	force,
}: ProjectSkillsOptions): ProjectSkillsResult {
	const projections = harnesses
		.filter((harness) => harness.project.skillsDirectory)
		.map((harness) => ({
			harness,
			target: join(root, harness.project.skillsDirectory as string),
		}))

	const named = Array.isArray(force) ? force : []
	// A name matching no projection target at all is a typo, not a narrower run: silently forcing
	// nothing would surface as the conflict error the flag was reached for, blaming the wrong thing.
	const unknown = named.filter((given) => !projections.some(({ target }) => namesTarget(root, target, given)))
	if (unknown.length) {
		throw new Error(
			`No skill target matches:\n${unknown.map((given) => `- ${given}`).join('\n')}\n` +
				`Targets for the enabled harnesses:\n${projections.map(({ target }) => `- ${relative(root, target)}`).join('\n')}`,
		)
	}

	const forces = (target: string): boolean => force === true || named.some((given) => namesTarget(root, target, given))

	const conflicts = projections.filter(({ target }) => pathOccupied(target) && !linksTo(target, canonicalSkills))
	const blocked = conflicts.filter(({ target }) => !forces(target))

	// Nothing was named, so nothing distinguishes one conflict from another: stop before writing.
	// Once a target IS named, the unnamed conflicts are the ones this run was told to leave alone,
	// so they are skipped and reported rather than turned into a refusal that writes nothing at all.
	if (blocked.length && named.length === 0) {
		throw new Error(
			`Refusing to replace existing skill targets:\n${blocked.map(({ target }) => `- ${relative(root, target)}`).join('\n')}`,
		)
	}

	const skipped = new Set(blocked.map(({ harness }) => harness.name))

	for (const { harness, target } of projections) {
		if (skipped.has(harness.name)) continue
		mkdirSync(dirname(target), { recursive: true })
		if (linksTo(target, canonicalSkills)) continue
		if (pathOccupied(target)) rmSync(target, { recursive: true, force: true })
		if (copy) {
			cpSync(canonicalSkills, target, { recursive: true })
			continue
		}
		try {
			symlinkSync(linkTarget(target, canonicalSkills), target, platform() === 'win32' ? 'junction' : undefined)
		} catch (error) {
			if (pathOccupied(target)) throw error
			cpSync(canonicalSkills, target, { recursive: true })
		}
	}

	return {
		linked: projections.filter(({ harness }) => !skipped.has(harness.name)).map(({ harness }) => harness.name),
		skipped: projections.filter(({ harness }) => skipped.has(harness.name)).map(({ harness }) => harness.name),
	}
}
