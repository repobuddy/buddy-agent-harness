import { lstatSync } from 'node:fs'
import { join } from 'node:path'

export type HarnessName =
	| 'claude-code'
	| 'cursor'
	| 'codex'
	| 'copilot-cli'
	| 'gemini-cli'
	| 'devin-desktop'
	| 'windsurf'

/**
 * `skillsDirectory` is the projection target a harness needs to see `.agents/skills`.
 * A harness that reads `.agents/skills` natively has none, and is never projected into.
 */
export type Harness = {
	name: HarnessName
	detect: string
	skillsDirectory?: string
	/** Set when this name has been superseded; the value is the name that replaces it. */
	deprecated?: HarnessName
}

/**
 * Codex, Cursor, Copilot CLI, and Devin Desktop read `.agents/skills` directly, so they need no
 * projection. Only Claude Code and Gemini CLI read solely their own directory.
 *
 * `windsurf` is the former name of Devin Desktop, rebranded 2026-06-02. It is retained as a
 * deprecated alias: Devin still scans the legacy `.windsurf/skills` path, so its projection keeps
 * working, but new repositories should enable `devin-desktop` and have nothing written for them.
 *
 * See `.research/agentic-configuration-standards/` for the per-harness sources.
 */
export const harnessRegistry: readonly Harness[] = [
	{ name: 'claude-code', detect: '.claude', skillsDirectory: '.claude/skills' },
	{ name: 'cursor', detect: '.cursor' },
	{ name: 'codex', detect: '.codex' },
	{ name: 'copilot-cli', detect: '.github/skills' },
	{ name: 'gemini-cli', detect: '.gemini', skillsDirectory: '.gemini/skills' },
	{ name: 'devin-desktop', detect: '.devin' },
	{ name: 'windsurf', detect: '.windsurf', skillsDirectory: '.windsurf/skills', deprecated: 'devin-desktop' },
]

/** Enabled whether or not the repository already contains their directories. */
const defaultHarnesses: readonly HarnessName[] = ['claude-code', 'cursor']

function directoryExists(path: string): boolean {
	try {
		return lstatSync(path).isDirectory()
	} catch {
		return false
	}
}

/** The default harnesses, plus the preferred ones, plus every harness whose directory is present. */
export function selectHarnesses(root: string, preferred: readonly HarnessName[]): Harness[] {
	const enabled = new Set<HarnessName>([...defaultHarnesses, ...preferred])
	return harnessRegistry.filter((harness) => enabled.has(harness.name) || directoryExists(join(root, harness.detect)))
}
