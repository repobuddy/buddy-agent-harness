/**
 * What a harness needs to read `AGENTS.md`; a union because the shape is per harness — Gemini CLI's
 * is a settings entry, and the next harness to need one may need a different shape.
 */
export type InstructionBridge = {
	/** An `AGENTS.md` entry in an array inside a JSON settings file. */
	kind: 'settings-entry'
	/** Repository-relative path of the settings file. */
	path: string
	/** Dotted path to the array within it, as the harness documents it. */
	key: string
}
