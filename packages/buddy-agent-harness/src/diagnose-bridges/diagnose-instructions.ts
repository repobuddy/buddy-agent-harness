import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { join, posix } from 'node:path'
import type { Harness, HarnessName } from '../harness-registry/harness-registry.ts'
import type { InstructionBridge } from '../harness-registry/instruction-bridge.ts'
import { agentsFileDirectories } from './agents-files.ts'
import type { BridgeFinding } from './diagnose-bridges.ts'
import { type InstructionProblem, repairFor } from './doctor-guidance.ts'
import { parseJsonWithComments } from './json-with-comments.ts'

/** What is on disk where an instruction bridge belongs. */
export type InstructionKind = 'import' | 'symlink' | 'settings-entry' | 'file' | 'none'
/**
 * `unbridged` is the case a skills bridge has no equivalent of: the file is there, so nothing looks
 * wrong, and it names `AGENTS.md` nowhere — a `CLAUDE.md` overwritten with real content, or a
 * settings file another tool rewrote.
 */
export type InstructionStatus = 'ok' | 'missing' | 'unbridged' | 'unreadable'

export type InstructionReport = {
	harness: HarnessName
	/** Repository-relative path of the file that carries the bridge. */
	path: string
	kind: InstructionKind
	status: InstructionStatus
}

export const canonicalInstructions = 'AGENTS.md'

type Inspection = {
	kind: InstructionKind
	status: InstructionStatus
	problem?: InstructionProblem
}

/**
 * An import bridges the `AGENTS.md` beside it and nothing else, so the check is per directory
 * holding one rather than per harness. A line of its own is enough: the harness reference allows
 * Claude-specific notes below the import, and a file that carries the import plus notes still
 * bridges.
 */
function inspectImport(target: string): Inspection {
	let stats: ReturnType<typeof lstatSync>
	try {
		stats = lstatSync(target)
	} catch {
		return { kind: 'none', status: 'missing', problem: 'instructions-missing' }
	}

	if (stats.isSymbolicLink()) {
		return readlinkSync(target) === canonicalInstructions
			? { kind: 'symlink', status: 'ok' }
			: { kind: 'symlink', status: 'unbridged', problem: 'instructions-unbridged' }
	}

	const imported = readFileSync(target, 'utf8')
		.split('\n')
		.some((line) => line.trim() === `@${canonicalInstructions}`)
	return imported
		? { kind: 'import', status: 'ok' }
		: { kind: 'file', status: 'unbridged', problem: 'instructions-unbridged' }
}

/** Reads a dotted key out of parsed JSON without asserting anything about the rest of the file. */
function valueAt(settings: unknown, key: string): unknown {
	return key.split('.').reduce<unknown>((value, segment) => {
		if (typeof value !== 'object' || value === null) return undefined
		return (value as Record<string, unknown>)[segment]
	}, settings)
}

function inspectSettingsEntry(target: string, key: string): Inspection {
	let source: string
	try {
		source = readFileSync(target, 'utf8')
	} catch {
		return { kind: 'none', status: 'missing', problem: 'instructions-missing' }
	}

	const settings = parseJsonWithComments(source)
	if (settings === undefined) return { kind: 'file', status: 'unreadable', problem: 'instructions-unreadable' }

	const entry = valueAt(settings, key)
	return Array.isArray(entry) && entry.includes(canonicalInstructions)
		? { kind: 'settings-entry', status: 'ok' }
		: { kind: 'file', status: 'unbridged', problem: 'instructions-unbridged' }
}

/** Every path an instruction bridge of this kind belongs at, in report order. */
function pathsFor(root: string, bridge: InstructionBridge): string[] {
	if (bridge.kind !== 'import') return [bridge.path]
	return agentsFileDirectories(root).map((directory) => (directory ? posix.join(directory, bridge.path) : bridge.path))
}

function inspect(target: string, bridge: InstructionBridge): Inspection {
	return bridge.kind === 'import' ? inspectImport(target) : inspectSettingsEntry(target, bridge.key)
}

/**
 * Reports whether every enabled harness can still read `AGENTS.md`.
 *
 * Losing one of these is quieter than losing a skills bridge and costs more: a harness with no
 * instruction bridge reads none of the repository's instructions, and says nothing about it. The
 * checks are read-only, and no repair is a command — rewriting an instruction file is the `init`
 * skill's judgment.
 */
export function diagnoseInstructions(
	root: string,
	harnesses: readonly Harness[],
	cli: string,
): { instructions: InstructionReport[]; findings: BridgeFinding[] } {
	// Project scope only: `doctor` diagnoses a repository, and the user-scope bridges are neither
	// written nor read by this tool.
	const bridged = harnesses
		.map((harness) => ({ name: harness.name, bridge: harness.project.instructionBridge }))
		.filter((harness): harness is { name: HarnessName; bridge: InstructionBridge } => Boolean(harness.bridge))

	const instructions: InstructionReport[] = []
	const findings: BridgeFinding[] = []
	if (!bridged.length) return { instructions, findings }

	// Only reported when something bridges into it. Every other harness reads `AGENTS.md` where it
	// lies, so its absence is a repository that has not run `init` rather than a broken bridge.
	if (!agentsFileDirectories(root).includes('')) {
		const { detail, repair } = repairFor('no-instructions')
		findings.push({ path: canonicalInstructions, detail, repair: repair(canonicalInstructions, cli) })
	}

	for (const { name, bridge } of bridged) {
		for (const path of pathsFor(root, bridge)) {
			const inspection = inspect(join(root, path), bridge)
			instructions.push({ harness: name, path, kind: inspection.kind, status: inspection.status })
			if (inspection.problem) {
				const { detail, repair } = repairFor(inspection.problem)
				findings.push({ path, detail, repair: repair(path, cli) })
			}
		}
	}

	return { instructions, findings }
}
