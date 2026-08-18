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

export type ProjectSkillsOptions = {
	root: string
	canonicalSkills: string
	harnesses: readonly Harness[]
	copy: boolean
	force: boolean
}

/**
 * Points every harness that cannot read `.agents/skills` at the canonical directory. Symlinking is
 * preferred; a platform that refuses the link falls back to a copy. Returns the projected harnesses.
 */
export function projectSkills({ root, canonicalSkills, harnesses, copy, force }: ProjectSkillsOptions): HarnessName[] {
	const projections = harnesses
		.filter((harness) => harness.project.skillsDirectory)
		.map((harness) => ({
			harness,
			target: join(root, harness.project.skillsDirectory as string),
		}))

	const conflicts = projections
		.filter(({ target }) => pathOccupied(target) && !linksTo(target, canonicalSkills))
		.map(({ target }) => target)

	if (conflicts.length && !force) {
		throw new Error(
			`Refusing to replace existing skill targets:\n${conflicts.map((target) => `- ${target}`).join('\n')}`,
		)
	}

	for (const { target } of projections) {
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

	return projections.map(({ harness }) => harness.name)
}
