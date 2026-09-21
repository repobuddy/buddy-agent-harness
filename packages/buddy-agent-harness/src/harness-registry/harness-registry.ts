import { lstatSync } from 'node:fs'
import { join } from 'node:path'
import type { InstructionBridge } from './instruction-bridge.ts'
import type { McpConfig } from './mcp-config.ts'
import type { NonstandardArtifact } from './nonstandard-artifact.ts'

export type HarnessName =
	| 'claude-code'
	| 'cursor'
	| 'codex'
	| 'copilot-cli'
	| 'gemini-cli'
	| 'devin-desktop'
	| 'windsurf'
	/**
	 * No `harnessRegistry` entry — recognized by `listMcpServers` only, so `McpServerEntry.harness`
	 * can name them.
	 */
	| 'vscode'
	| 'opencode'
	| 'zed'

/** The two scopes a harness reads configuration at. Their roots differ; their shape does not. */
export type HarnessScopeName = 'project' | 'user'

/** What one harness does at one scope; paths are relative to that scope's root. */
export type HarnessScope = {
	/** The directory whose presence means this harness is configured at this scope. */
	detect: string
	/** The projection target for `.agents/skills`; absent when the harness reads it there natively. */
	skillsDirectory?: string
	/**
	 * What the harness needs at this scope to read `AGENTS.md`; diagnosed and gated, never written
	 * by `init`.
	 */
	instructionBridge?: InstructionBridge
	/** Files whose presence beside `AGENTS.md` stop the harness reading it. */
	shadowedBy?: readonly string[]
	/** Where this harness keeps its own MCP servers; `doctor` compares against it and never writes. */
	mcpConfig?: McpConfig
	/** What this harness reads that no other can, reported so it can be converted to canonical form. */
	nonstandard?: readonly NonstandardArtifact[]
}

export type Harness = {
	name: HarnessName
	/** What this harness does inside a repository. `init` and `doctor` act only here. */
	project: HarnessScope
	/**
	 * Outside any repository; absent when no user-scope path is documented (e.g. Devin).
	 * Diagnosable, never written.
	 */
	user?: HarnessScope
	/** Set when this name has been superseded; the value is the name that replaces it. */
	deprecated?: HarnessName
}

/** See `.research/agentic-configuration-standards/` for the per-harness sources. */
export const harnessRegistry: readonly Harness[] = [
	{
		name: 'claude-code',
		project: {
			detect: '.claude',
			skillsDirectory: '.claude/skills',
			shadowedBy: ['CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md'],
			mcpConfig: { path: '.mcp.json', key: 'mcpServers', format: 'json' },
			nonstandard: [
				{ path: '.claude/commands', shape: 'directory', kind: 'command' },
				{ path: '.claude/rules', shape: 'directory', kind: 'rule' },
				{ path: '.claude/agents', shape: 'directory', kind: 'subagent' },
			],
		},
		user: { detect: '.claude', skillsDirectory: '.claude/skills' },
	},
	{
		name: 'cursor',
		project: {
			detect: '.cursor',
			mcpConfig: { path: '.cursor/mcp.json', key: 'mcpServers', format: 'json' },
			nonstandard: [
				{ path: '.cursorrules', shape: 'file', kind: 'instructions' },
				{ path: '.cursor/rules', shape: 'directory', kind: 'rule' },
				{ path: '.cursor/commands', shape: 'directory', kind: 'command' },
				{ path: '.cursor/skills', shape: 'directory', kind: 'skill' },
			],
		},
		user: { detect: '.cursor' },
	},
	{
		name: 'codex',
		project: {
			detect: '.codex',
			mcpConfig: { path: '.codex/config.toml', key: 'mcp_servers', format: 'toml' },
			nonstandard: [{ path: '.codex/skills', shape: 'directory', kind: 'skill' }],
		},
		user: { detect: '.codex' },
	},
	{
		name: 'copilot-cli',
		project: {
			detect: '.github/skills',
			nonstandard: [
				{ path: '.github/copilot-instructions.md', shape: 'file', kind: 'instructions' },
				{ path: '.github/instructions', shape: 'directory', kind: 'instructions' },
				{ path: '.github/skills', shape: 'directory', kind: 'skill' },
			],
		},
		user: { detect: '.copilot' },
	},
	{
		name: 'gemini-cli',
		project: {
			detect: '.gemini',
			instructionBridge: { kind: 'settings-entry', path: '.gemini/settings.json', key: 'context.fileName' },
			mcpConfig: { path: '.gemini/settings.json', key: 'mcpServers', format: 'json', shared: true },
			nonstandard: [
				{ path: 'GEMINI.md', shape: 'file', kind: 'instructions' },
				{ path: '.gemini/skills', shape: 'directory', kind: 'skill' },
			],
		},
		user: { detect: '.gemini' },
	},
	{ name: 'devin-desktop', project: { detect: '.devin' } },
	{
		name: 'windsurf',
		project: {
			detect: '.windsurf',
			skillsDirectory: '.windsurf/skills',
			nonstandard: [
				{ path: '.windsurfrules', shape: 'file', kind: 'instructions' },
				{ path: '.windsurf/rules', shape: 'directory', kind: 'rule' },
			],
		},
		deprecated: 'devin-desktop',
	},
]

const harnessNames = new Set<string>(harnessRegistry.map((harness) => harness.name))

function isHarnessName(value: string): value is HarnessName {
	return harnessNames.has(value)
}

/**
 * An unknown name throws rather than being dropped — silently falling back to the defaults would
 * misreport what was diagnosed.
 */
export function parseHarnesses(value: string | undefined): HarnessName[] {
	const requested = (value ?? '')
		.split(',')
		.map((name) => name.trim())
		.filter(Boolean)
	const unsupported = requested.filter((name) => !isHarnessName(name))
	if (unsupported.length)
		throw new Error(
			`Unsupported harness: ${unsupported.join(', ')}. Supported: ${harnessRegistry
				.map((harness) => harness.name)
				.join(', ')}.`,
		)
	return requested.filter(isHarnessName)
}

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
