/**
 * What a harness needs to read `AGENTS.md`; a union because the shape is per harness — Gemini CLI's
 * project bridge is a settings entry, Claude Code's user bridge an import line, and a harness with
 * neither can only be given a symlink.
 */
export type InstructionBridge =
	| {
			/** An `AGENTS.md` entry in an array inside a JSON settings file. */
			kind: 'settings-entry'
			/** Path of the settings file, relative to the scope's root. */
			path: string
			/** Dotted path to the array within it, as the harness documents it. */
			key: string
	  }
	| {
			/** A line in the harness's own instruction file that pulls the canonical file in. */
			kind: 'import'
			/** Path of the instruction file, relative to the scope's root. */
			path: string
			/** The line itself, exactly as the harness documents the syntax. */
			line: string
	  }
	| {
			/** The harness's own instruction file, replaced by a symlink to the canonical file. */
			kind: 'symlink'
			/** Path of the instruction file, relative to the scope's root. */
			path: string
	  }
