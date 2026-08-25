/**
 * Configuration a harness reads that no other harness can, declared per harness beside the paths
 * `doctor` already knows about it.
 *
 * These are not faults. Every one of them works — for exactly one harness — which is the whole
 * problem: the guidance in a Cursor rule reaches Cursor and nothing else, and nobody finds out
 * except by noticing an agent behaving differently in another tool. `doctor` surfaces them so they
 * can be converted, one at a time, toward a repository whose agent configuration is canonical and
 * whose harness files are generated from it. Zero of these is the north star, not a release gate.
 *
 * `kind` carries the conversion, because the canonical form differs per kind and nothing else about
 * the artifact does. It is what a finding routes on.
 */
export type NonstandardKind =
	/** Prose an `AGENTS.md` can hold verbatim. The harness file becomes a generated bridge. */
	| 'instructions'
	/**
	 * A rule scoped to paths. A skill is the portable form *where the scoping is incidental* — a
	 * skill is loaded on relevance rather than by glob, so guidance whose whole point is "these
	 * files and no others" has no equivalent yet, and converting it would lose the scoping.
	 */
	| 'rule'
	/** A harness command. Claude Code merged commands into skills, so a skill is the portable form. */
	| 'command'
	/** A skill kept under a harness directory rather than the canonical one. */
	| 'skill'
	/** A subagent. No cross-harness format exists, so surfacing it *is* reporting that gap. */
	| 'subagent'

export type NonstandardArtifact = {
	/**
	 * Repository-relative path. A file is reported as itself; a directory is reported per file
	 * below it, so each one can be converted on its own rather than as an all-or-nothing batch.
	 */
	path: string
	/** Whether `path` names one file or a directory to walk. */
	shape: 'file' | 'directory'
	kind: NonstandardKind
}
