import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { filesUnder } from '../diagnose-bridges/directory-files.ts'
import { type NonstandardProblem, type RepairAction, repairFor } from '../diagnose-bridges/doctor-guidance.ts'
import { harnessRegistry } from '../harness-registry/harness-registry.ts'
import type { NonstandardArtifact, NonstandardKind } from '../harness-registry/nonstandard-artifact.ts'

/**
 * The fifth section of `doctor`: configuration that works for exactly one harness.
 *
 * The other four ask whether something is broken. This one asks how far what is there reaches, and
 * reports the answer when it is "one harness". Nothing here is a fault — a Cursor rule does what it
 * says — so nothing here is repaired by correcting it. Each finding names the canonical form it
 * would convert to, so a repository can be walked toward one where every harness file is generated
 * from a canonical source rather than authored beside it.
 *
 * Read-only, like every other part of `doctor`.
 */
export type NonstandardFinding = {
	/** Repository-relative path of the artifact, POSIX-separated. */
	path: string
	problem: NonstandardProblem
	detail: string
	/** The conversion. `command` is always empty: every one of these is judgment about content. */
	repair: RepairAction
}

export type DiagnoseNonstandardOptions = {
	root: string
	/** How to name this tool in the repair commands. */
	cli: string
}

const problemOf: Record<NonstandardKind, NonstandardProblem> = {
	instructions: 'nonstandard-instructions',
	rule: 'nonstandard-rule',
	command: 'nonstandard-command',
	skill: 'nonstandard-skill',
	subagent: 'nonstandard-subagent',
}

/**
 * A `.mdc` rule splits on whether its scoping is load-bearing. `globs:` with a value binds the rule
 * to paths, and `AGENTS.md` has no equivalent — it scopes by directory nesting only — so that one
 * converts to a skill, or stays. Without it the rule is always-on prose, which `AGENTS.md` holds
 * verbatim. Read from frontmatter rather than assumed, because the two need different conversions
 * and guessing wrong sends prose to the wrong destination.
 */
function scopedByGlobs(body: string): boolean {
	const block = /^---\n([\s\S]*?)\n---/.exec(body)
	if (!block) return false
	const globs = /^globs:[ \t]*(.*)$/m.exec(block[1] as string)
	const value = globs?.[1]?.trim()
	return value !== undefined && value.length > 0 && value !== '[]'
}

/** Every skill directory below `directory`, named by its `SKILL.md`. */
function skillFiles(directory: string): string[] {
	return filesUnder(directory).filter((file) => file.endsWith('SKILL.md'))
}

/**
 * A harness directory that is a symlink is a projection someone already made, not configuration
 * authored here — reporting it would tell a repository to convert what it already converted.
 */
function authoredHere(path: string): boolean {
	try {
		return !lstatSync(path).isSymbolicLink()
	} catch {
		return false
	}
}

function artifactFiles(root: string, artifact: NonstandardArtifact): string[] {
	const absolute = join(root, artifact.path)
	if (!authoredHere(absolute)) return []
	if (artifact.shape === 'file') return existsSync(absolute) ? [artifact.path] : []
	const below = artifact.kind === 'skill' ? skillFiles(absolute) : filesUnder(absolute)
	return below.map((file) => posix.join(artifact.path, file))
}

/**
 * Unlike the other detectors this takes no harness preference and no enabled set. An artifact is
 * reachable by one harness whether or not that harness is enabled here — a `.cursorrules` in a
 * repository nobody opens in Cursor is still instruction content `AGENTS.md` does not carry — so
 * filtering by the enabled set would hide exactly the drift worth converting.
 */
export function diagnoseNonstandard({ root, cli }: DiagnoseNonstandardOptions): NonstandardFinding[] {
	const findings: NonstandardFinding[] = []
	const seen = new Set<string>()

	for (const harness of harnessRegistry) {
		for (const artifact of harness.project.nonstandard ?? []) {
			for (const path of artifactFiles(root, artifact)) {
				// Two harnesses can name the same path — a deprecated alias and its replacement, or a
				// directory two of them read. The artifact is one artifact, so it is one finding.
				if (seen.has(path)) continue
				seen.add(path)

				const kind =
					artifact.kind === 'rule' && path.endsWith('.mdc') && !scopedByGlobs(readFileSync(join(root, path), 'utf8'))
						? 'instructions'
						: artifact.kind
				const problem = problemOf[kind]
				const { detail, repair } = repairFor(problem)
				findings.push({ path, problem, detail, repair: repair({ file: path }, cli) })
			}
		}
	}

	return findings.sort((left, right) => left.path.localeCompare(right.path))
}
