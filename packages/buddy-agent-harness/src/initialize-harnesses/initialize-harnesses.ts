import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectReferencesDir, referenceNames } from 'cyber-agentkit'
import { type HarnessName, selectHarnesses } from '../harness-registry/harness-registry.ts'
import { countSkills, type ForceSelection, projectSkills } from '../skill-projection/skill-projection.ts'

export type InitializeOptions = {
	root: string
	harnesses?: HarnessName[]
	copy?: boolean
	force?: ForceSelection
}
export type InitializeResult = {
	root: string
	harnesses: HarnessName[]
	native: HarnessName[]
	linked: HarnessName[]
	/**
	 * Enabled harnesses left untouched because their target conflicts and `--force` did not name
	 * it.
	 */
	skipped: HarnessName[]
	/** Enabled harnesses whose name has been superseded, as `{ name, replacedBy }`. */
	deprecated: { name: HarnessName; replacedBy: HarnessName }[]
	skills: number
	/**
	 * References the project tier holds, legacy `governances/` included; `.agents/references` is
	 * created when absent and counted, like `skills`, so a fresh repo reports zero rather than
	 * leaving it unclear.
	 */
	references: number
	copied: boolean
}

/** Git does not track an empty directory, so an empty one gets a `.gitkeep` to survive a commit and clone. */
function keepWhenEmpty(directory: string): void {
	if (readdirSync(directory).length === 0) writeFileSync(join(directory, '.gitkeep'), '')
}

export function initializeHarnesses({
	root,
	harnesses: preferred = [],
	copy = false,
	force = false,
}: InitializeOptions): InitializeResult {
	const canonicalSkills = join(root, '.agents', 'skills')
	const skills = countSkills(canonicalSkills)
	mkdirSync(projectReferencesDir(root), { recursive: true })
	const references = referenceNames([{ tier: 'project', dir: projectReferencesDir(root) }]).length
	keepWhenEmpty(canonicalSkills)
	keepWhenEmpty(projectReferencesDir(root))
	const harnesses = selectHarnesses(root, preferred)
	const { linked, skipped } = projectSkills({ root, canonicalSkills, harnesses, copy, force })

	return {
		root,
		harnesses: harnesses.map((harness) => harness.name),
		native: harnesses.filter((harness) => !harness.project.skillsDirectory).map((harness) => harness.name),
		linked,
		skipped,
		deprecated: harnesses
			.filter((harness) => harness.deprecated)
			.map((harness) => ({ name: harness.name, replacedBy: harness.deprecated as HarnessName })),
		skills,
		references,
		copied: copy,
	}
}
