import { join } from 'node:path'
import { type HarnessName, selectHarnesses } from '../harness-registry/harness-registry.ts'
import { writeConfig } from '../repobuddy-config/repobuddy-config.ts'
import { countSkills, projectSkills } from '../skill-projection/skill-projection.ts'

export type InitializeOptions = {
	root: string
	harnesses?: HarnessName[]
	copy?: boolean
	force?: boolean
}
export type InitializeResult = {
	root: string
	harnesses: HarnessName[]
	native: HarnessName[]
	linked: HarnessName[]
	/** Enabled harnesses whose name has been superseded, as `{ name, replacedBy }`. */
	deprecated: { name: HarnessName; replacedBy: HarnessName }[]
	skills: number
	copied: boolean
}

export function initializeHarnesses({
	root,
	harnesses: preferred = [],
	copy = false,
	force = false,
}: InitializeOptions): InitializeResult {
	const canonicalSkills = join(root, '.agents', 'skills')
	const skills = countSkills(canonicalSkills)
	const harnesses = selectHarnesses(root, preferred)
	const linked = projectSkills({ root, canonicalSkills, harnesses, copy, force })

	writeConfig(
		root,
		harnesses.map((harness) => harness.name),
	)
	return {
		root,
		harnesses: harnesses.map((harness) => harness.name),
		native: harnesses.filter((harness) => !harness.skillsDirectory).map((harness) => harness.name),
		linked,
		deprecated: harnesses
			.filter((harness) => harness.deprecated)
			.map((harness) => ({ name: harness.name, replacedBy: harness.deprecated as HarnessName })),
		skills,
		copied: copy,
	}
}
