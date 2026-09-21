import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { filesUnder } from '../diagnose-bridges/directory-files.ts'
import { type ConfigurationProblem, type RepairAction, repairFor } from '../diagnose-bridges/doctor-guidance.ts'
import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { selectHarnesses } from '../harness-registry/harness-registry.ts'

/**
 * The configuration half of `doctor` — present-and-wrong findings about a harness's config, not
 * whether something is missing (`init`'s job) or an instruction bridge (`diagnose-instructions`'s).
 * Read-only.
 */
export type ConfigurationFinding = {
	/** Repository-relative path the finding is about. */
	path: string
	problem: ConfigurationProblem
	detail: string
	/**
	 * What repairs it, already carrying the path; `command` is always empty since every fault here
	 * is judgment.
	 */
	repair: RepairAction
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
 * The two frontmatter faults that make a harness skip a skill outright (see
 * `skills/init-buddy-agent-harness/references/frontmatter.md`): unparseable YAML, and a missing
 * `description`. A name/directory mismatch only warns and still loads, so it's not checked here.
 * Checked directly for an unquoted colon rather than by parsing YAML — the package ships no parser.
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
 * Takes no harness preference, unlike `diagnoseBridges`: every check here needs the projection to
 * already exist on disk, which already selects the harness — a preference could never add a finding.
 */
export function diagnoseConfiguration({ root, git, cli }: DiagnoseConfigurationOptions): ConfigurationFinding[] {
	const findings: ConfigurationFinding[] = []
	const add = (path: string, problem: ConfigurationProblem) => {
		const { detail, repair } = repairFor(problem)
		findings.push({ path, problem, detail, repair: repair({ file: path }, cli) })
	}

	const harnesses = selectHarnesses(root, [])

	// A superseded name whose projection still exists — `init` keeps projecting since the old path
	// still works, so nothing else flags it as stale.
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

	// `filesUnder` already confirmed these are readable files, so a failure here is a genuine IO
	// error, not a guard to add.
	for (const file of filesUnder(join(root, canonicalSkills)).filter((file) => file.endsWith('SKILL.md'))) {
		if (frontmatterFault(readFileSync(join(root, canonicalSkills, file), 'utf8')))
			add(`${canonicalSkills}/${file}`, 'unloadable-skill')
	}

	return findings
}
