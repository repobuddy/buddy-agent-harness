/**
 * Configuration a harness reads that no other can. Not faults — each works for exactly one harness,
 * which is why `doctor` surfaces them for conversion toward one canonical, generated source. `kind`
 * decides the conversion a finding routes to.
 */
export type NonstandardKind =
	/** Prose an `AGENTS.md` can hold verbatim. The harness file becomes a generated bridge. */
	| 'instructions'
	/**
	 * A rule scoped to paths — a skill would lose that scoping, since skills load by relevance, not
	 * by glob.
	 */
	| 'rule'
	/** A harness command. Claude Code merged commands into skills, so a skill is the portable form. */
	| 'command'
	/** A skill kept under a harness directory rather than the canonical one. */
	| 'skill'
	/** A subagent. No cross-harness format exists, so surfacing it *is* reporting that gap. */
	| 'subagent'

export type NonstandardArtifact = {
	/** Repository-relative path; a directory is reported per file below it, converted one at a time. */
	path: string
	/** Whether `path` names one file or a directory to walk. */
	shape: 'file' | 'directory'
	kind: NonstandardKind
}
