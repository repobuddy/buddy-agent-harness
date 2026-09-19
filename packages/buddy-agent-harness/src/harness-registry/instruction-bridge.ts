/**
 * What a harness needs in order to read the repository's `AGENTS.md`.
 *
 * A skills projection is one shape — a directory pointing at `.agents/skills` — so the registry
 * models it as a path. An instruction bridge is not: Gemini CLI needs `AGENTS.md` added to an array
 * inside a JSON settings file, and the Markdown-import bridge Claude Code needed until E-CC-14
 * needed a file per directory holding an `AGENTS.md`. The union is kept for that reason — the shape
 * is per harness, and the next harness to need one will not need Gemini's.
 *
 * The `init` command writes none of these. They are the `init-buddy-agent-harness` skill's work, which is why every
 * finding against one names the skill rather than a flag.
 */
export type InstructionBridge = {
	/** An `AGENTS.md` entry in an array inside a JSON settings file. */
	kind: 'settings-entry'
	/** Repository-relative path of the settings file. */
	path: string
	/** Dotted path to the array within it, as the harness documents it. */
	key: string
}
