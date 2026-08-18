/**
 * What a harness needs in order to read the repository's `AGENTS.md`.
 *
 * A skills projection is one shape — a directory pointing at `.agents/skills` — so the registry
 * models it as a path. Instruction bridges are not one shape: Claude Code needs a Markdown file
 * whose body imports `AGENTS.md`, and Gemini CLI needs `AGENTS.md` added to an array inside a JSON
 * settings file. A second bare path field would describe the first and lie about the second, so the
 * variant carries what its own check needs.
 *
 * The `init` command writes none of these. They are the `init` skill's work, which is why every
 * finding against one names the skill rather than a flag.
 */
export type InstructionBridge =
	| {
			/**
			 * A Markdown file whose body is an `@AGENTS.md` import, or a symlink to `AGENTS.md`. One is
			 * needed beside every `AGENTS.md` in the tree, not only the root file: an import bridges the
			 * one file next to it, so a nested `AGENTS.md` is invisible until it has its own.
			 */
			kind: 'import'
			/** Repository-relative name, the same in every directory that holds an `AGENTS.md`. */
			path: string
	  }
	| {
			/** An `AGENTS.md` entry in an array inside a JSON settings file. */
			kind: 'settings-entry'
			/** Repository-relative path of the settings file. */
			path: string
			/** Dotted path to the array within it, as the harness documents it. */
			key: string
	  }
