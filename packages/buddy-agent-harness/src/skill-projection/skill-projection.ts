import { cpSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
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

function isCorrectLink(target: string, source: string): boolean {
	return lstatSync(target).isSymbolicLink() && readlinkSync(target) === relative(dirname(target), source)
}

/** Creates the canonical directory when absent, so a fresh repository reports zero skills. */
export function countSkills(canonicalSkills: string): number {
	mkdirSync(canonicalSkills, { recursive: true })
	return skillNames(canonicalSkills).length
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
		.filter((harness) => harness.skillsDirectory)
		.map((harness) => ({
			harness,
			target: join(root, harness.skillsDirectory as string),
		}))

	const conflicts = projections
		.filter(({ target }) => pathOccupied(target) && !isCorrectLink(target, canonicalSkills))
		.map(({ target }) => target)

	if (conflicts.length && !force) {
		throw new Error(
			`Refusing to replace existing skill targets:\n${conflicts.map((target) => `- ${target}`).join('\n')}`,
		)
	}

	for (const { target } of projections) {
		mkdirSync(dirname(target), { recursive: true })
		if (pathOccupied(target) && isCorrectLink(target, canonicalSkills)) continue
		if (pathOccupied(target)) rmSync(target, { recursive: true, force: true })
		if (copy) {
			cpSync(canonicalSkills, target, { recursive: true })
			continue
		}
		try {
			symlinkSync(relative(dirname(target), canonicalSkills), target, 'junction')
		} catch (error) {
			if (pathOccupied(target)) throw error
			cpSync(canonicalSkills, target, { recursive: true })
		}
	}

	return projections.map(({ harness }) => harness.name)
}
