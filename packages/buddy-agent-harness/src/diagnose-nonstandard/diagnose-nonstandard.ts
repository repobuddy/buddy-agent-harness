import { lstatSync, readFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { filesUnder } from '../diagnose-bridges/directory-files.ts'
import { type NonstandardProblem, type RepairAction, repairFor } from '../diagnose-bridges/doctor-guidance.ts'
import { harnessRegistry } from '../harness-registry/harness-registry.ts'
import type { NonstandardArtifact, NonstandardKind } from '../harness-registry/nonstandard-artifact.ts'

/**
 * Configuration that works for exactly one harness — not a fault to fix, since e.g. a Cursor rule
 * does what it says; each finding just names the canonical form to convert to. Read-only.
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
 * `globs:` with a value binds a `.mdc` rule to paths — `AGENTS.md` has no equivalent, so that rule
 * converts to a skill; without it, the rule is always-on prose that `AGENTS.md` holds verbatim.
 * Read from frontmatter rather than assumed, since guessing wrong sends prose to the wrong destination.
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
 * A symlinked path is already a projection, not authored config — reporting it would tell a repo to
 * convert what it already converted.
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
	// A path that is not there fails this too — `lstat` throws and the catch reads as "not ours".
	if (!authoredHere(absolute)) return []
	if (artifact.shape === 'file') return [artifact.path]
	const below = artifact.kind === 'skill' ? skillFiles(absolute) : filesUnder(absolute)
	return below.map((file) => posix.join(artifact.path, file))
}

/**
 * Takes no harness preference or enabled set, unlike the other detectors — an artifact matters
 * whether or not its harness is enabled here, so filtering by the enabled set would hide it.
 */
export function diagnoseNonstandard({ root, cli }: DiagnoseNonstandardOptions): NonstandardFinding[] {
	const findings: NonstandardFinding[] = []

	for (const harness of harnessRegistry) {
		for (const artifact of harness.project.nonstandard ?? []) {
			for (const path of artifactFiles(root, artifact)) {
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

	// No dedupe — one artifact is declared by one harness (enforced by `harness-registry.test.ts`);
	// collapsing a duplicate would hide a registry mistake.
	return findings.sort((left, right) => left.path.localeCompare(right.path))
}
