import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { filesUnder } from '../diagnose-bridges/directory-files.ts'
import { type ConfigurationProblem, repairFor } from '../diagnose-bridges/doctor-guidance.ts'
import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { selectHarnesses } from '../harness-registry/harness-registry.ts'

/**
 * The configuration half of `doctor`. Where `diagnose-bridges` asks whether a bridge still
 * resolves, this asks whether the configuration around it is still *right* — a harness name that
 * has been superseded, an instruction file that never reaches `AGENTS.md`, a bridge git-ignores.
 *
 * Everything here is present-and-wrong rather than missing. Configuration that is absent is
 * `init`'s to create; configuration that is wrong is what the `repair` skill acts on, and this
 * module is where it reads its work from. Detection has one home so the two cannot drift.
 *
 * Instruction bridges are deliberately not here: `diagnose-instructions` owns them, and every one
 * of its repairs goes back to the `init` skill rather than to `repair`.
 *
 * Read-only, like every other part of `doctor`.
 */
export type ConfigurationFinding = {
	/** Repository-relative path the finding is about. */
	path: string
	problem: ConfigurationProblem
	detail: string
	/** What repairs it, already carrying the path. */
	repair: string
}

export type DiagnoseConfigurationOptions = {
	root: string
	git: GitBridgeState
	/** How to name this tool in the repair commands. */
	cli: string
}

const canonicalSkills = '.agents/skills'
const localOverride = 'AGENTS.local.md'

/**
 * The two frontmatter faults that make a harness skip a skill outright, per
 * `skills/init/references/frontmatter.md`: YAML that does not parse, and a missing `description`.
 * A `name` that mismatches the directory is a warning and still loads, so it is not reported here.
 *
 * The unquoted colon is the documented cause of the first, and is checked directly rather than by
 * parsing YAML: the package ships no parser, and a targeted check names the actual fault.
 */
function frontmatterFault(body: string): 'unparseable' | 'no-description' | undefined {
	const block = /^---\n([\s\S]*?)\n---/.exec(body)
	if (!block) return 'unparseable'
	const description = /^description:[ \t]*(.*)$/m.exec(block[1] as string)
	const value = description?.[1]?.trim()
	if (!value) return 'no-description'
	const quoted = /^(['"]).*\1$/.test(value)
	if (!quoted && /:\s/.test(value)) return 'unparseable'
	return undefined
}

/**
 * Unlike `diagnoseBridges`, this takes no harness preference. Every check here requires the
 * projection to exist on disk, and a projection cannot exist without its harness's detection
 * directory — which selects that harness anyway. A preference could therefore never add a finding,
 * so accepting one would be surface that does nothing.
 */
export function diagnoseConfiguration({ root, git, cli }: DiagnoseConfigurationOptions): ConfigurationFinding[] {
	const findings: ConfigurationFinding[] = []
	const add = (path: string, problem: ConfigurationProblem) => {
		const { detail, repair } = repairFor(problem)
		findings.push({ path, problem, detail, repair: repair(path, cli) })
	}

	const harnesses = selectHarnesses(root, [])

	// A superseded name whose projection still exists. `init` reports the deprecation and keeps
	// projecting, because the old path still works — so nothing else ever says it is stale.
	for (const harness of harnesses) {
		const projection = harness.project.skillsDirectory
		if (harness.deprecated && projection && existsSync(join(root, projection))) add(projection, 'deprecated-harness')
	}

	// An ignored bridge is untracked, and an untracked bridge swallows a real edit silently.
	for (const harness of harnesses) {
		const path = harness.project.skillsDirectory
		if (path && existsSync(join(root, path)) && git.isIgnored(path)) add(path, 'ignored-bridge')
	}

	// No harness reads this filename, so whatever it holds is invisible to every agent.
	if (existsSync(join(root, localOverride))) add(localOverride, 'unread-local-override')

	// `filesUnder` has already confirmed each of these is a readable file, so the read needs no guard
	// of its own; a failure here is a genuine IO error and belongs in the command's error path.
	for (const file of filesUnder(join(root, canonicalSkills)).filter((file) => file.endsWith('SKILL.md'))) {
		if (frontmatterFault(readFileSync(join(root, canonicalSkills, file), 'utf8')))
			add(`${canonicalSkills}/${file}`, 'unloadable-skill')
	}

	return findings
}
