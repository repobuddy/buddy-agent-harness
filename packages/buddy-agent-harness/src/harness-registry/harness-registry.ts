import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import type { InstructionBridge } from './instruction-bridge.ts'

export type HarnessName =
	| 'claude-code'
	| 'cursor'
	| 'codex'
	| 'copilot-cli'
	| 'gemini-cli'
	| 'devin-desktop'
	| 'windsurf'

/** The two scopes a harness reads configuration at. Their roots differ; their shape does not. */
export type HarnessScopeName = 'project' | 'user'

/**
 * What one harness does at one scope. Paths are relative to that scope's root: the repository root
 * at project scope, the user's home directory at user scope.
 *
 * `detect` is the directory whose presence means this harness is configured at this scope — a
 * different question per scope, which is why it is recorded per scope rather than once.
 *
 * `skillsDirectory` is the projection target the harness needs to see `.agents/skills` at this
 * scope. A harness that reads `.agents/skills` natively there has none, and is never projected into.
 *
 * `instructionBridge` is the same question for `AGENTS.md`: what the harness needs at this scope in
 * order to read it. It belongs per scope for the same reason `skillsDirectory` does — the file
 * differs. Unlike `skillsDirectory`, the `init` command does not write it; the `init` skill does. It
 * is recorded here to be diagnosed and gated per harness, not to be projected.
 */
export type HarnessScope = {
	detect: string
	skillsDirectory?: string
	instructionBridge?: InstructionBridge
}

export type Harness = {
	name: HarnessName
	/** What this harness does inside a repository. `init` and `doctor` act only here. */
	project: HarnessScope
	/**
	 * What this harness does for the user, outside any repository. Absent when no user-scope path is
	 * primary-sourced — Devin documents none. Described and diagnosable; never written to.
	 */
	user?: HarnessScope
	/** Set when this name has been superseded; the value is the name that replaces it. */
	deprecated?: HarnessName
}

/**
 * The two scopes disagree in general, and a single answer per harness could only record one of them:
 * Copilot CLI is `.github/skills` in a repository and `~/.copilot` for the user. Claude Code is the
 * only harness that needs a skills projection, and it needs one at both scopes. Codex, Cursor,
 * Copilot CLI, Gemini CLI, and Devin Desktop read `.agents/skills` themselves and are never
 * projected into.
 *
 * Gemini CLI carried a `.gemini/skills` projection until E-GEM-02: it reads the `.agents/skills`
 * alias at project scope too, where that alias takes precedence over `.gemini/skills`. It still
 * needs an instruction bridge, which is a separate axis and unaffected.
 *
 * Instruction bridges are recorded at project scope only. The user-scope equivalents exist, but
 * nothing writes or reads them yet: `init` works inside a repository, and so does `doctor`.
 *
 * `windsurf` is the former name of Devin Desktop, rebranded 2026-06-02. It is retained as a
 * deprecated alias: Devin still scans the legacy `.windsurf/skills` path, so its projection keeps
 * working, but new repositories should enable `devin-desktop` and have nothing written for them.
 *
 * See `.research/agentic-configuration-standards/` for the per-harness sources.
 */
export const harnessRegistry: readonly Harness[] = [
	{
		name: 'claude-code',
		project: {
			detect: '.claude',
			skillsDirectory: '.claude/skills',
			instructionBridge: { kind: 'import', path: 'CLAUDE.md' },
		},
		user: { detect: '.claude', skillsDirectory: '.claude/skills' },
	},
	{ name: 'cursor', project: { detect: '.cursor' }, user: { detect: '.cursor' } },
	{ name: 'codex', project: { detect: '.codex' }, user: { detect: '.codex' } },
	{ name: 'copilot-cli', project: { detect: '.github/skills' }, user: { detect: '.copilot' } },
	{
		name: 'gemini-cli',
		project: {
			detect: '.gemini',
			instructionBridge: { kind: 'settings-entry', path: '.gemini/settings.json', key: 'context.fileName' },
		},
		user: { detect: '.gemini' },
	},
	{ name: 'devin-desktop', project: { detect: '.devin' } },
	{
		name: 'windsurf',
		project: { detect: '.windsurf', skillsDirectory: '.windsurf/skills' },
		deprecated: 'devin-desktop',
	},
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
	return harnessRegistry.filter(
		(harness) => enabled.has(harness.name) || directoryExists(join(root, harness.project.detect)),
	)
}
