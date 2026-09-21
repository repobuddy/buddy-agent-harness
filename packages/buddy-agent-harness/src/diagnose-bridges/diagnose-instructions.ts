import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { join, posix } from 'node:path'
import type { Harness, HarnessName } from '../harness-registry/harness-registry.ts'
import type { InstructionBridge } from '../harness-registry/instruction-bridge.ts'
import { agentsFileDirectories } from './agents-files.ts'
import type { BridgeFinding } from './diagnose-bridges.ts'
import { type InstructionProblem, repairFor } from './doctor-guidance.ts'
import { parseJsonWithComments } from './json-with-comments.ts'

/** What is on disk where an instruction bridge belongs, or where a shadowing file may sit. */
export type InstructionKind = 'import' | 'symlink' | 'settings-entry' | 'file' | 'none'
/**
 * `shadowing` and `superseded` describe a file suppressing `AGENTS.md`, not a missing bridge;
 * `unbridged` is a bridge file present but not wired to it.
 */
export type InstructionStatus = 'ok' | 'missing' | 'unbridged' | 'unreadable' | 'shadowing' | 'superseded'

export type InstructionReport = {
	harness: HarnessName
	/** Repository-relative path of the file that carries the bridge, or that shadows `AGENTS.md`. */
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

/** A shadow that is on disk always carries a problem: it is a fault, or an offer to remove it. */
type ShadowInspection = Inspection & { problem: InstructionProblem }

/** Reads a dotted key out of parsed JSON without asserting anything about the rest of the file. */
function valueAt(settings: unknown, key: string): unknown {
	return key.split('.').reduce<unknown>((value, segment) => {
		if (typeof value !== 'object' || value === null) return undefined
		return (value as Record<string, unknown>)[segment]
	}, settings)
}

function exists(target: string): boolean {
	try {
		lstatSync(target)
		return true
	} catch {
		return false
	}
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

function inspectShadow(target: string): ShadowInspection | undefined {
	let stats: ReturnType<typeof lstatSync>
	try {
		stats = lstatSync(target)
	} catch {
		return undefined
	}

	if (stats.isSymbolicLink())
		return readlinkSync(target) === canonicalInstructions
			? { kind: 'symlink', status: 'superseded', problem: 'instructions-superseded' }
			: { kind: 'symlink', status: 'shadowing', problem: 'instructions-shadowing' }

	let body: string
	try {
		body = readFileSync(target, 'utf8')
	} catch {
		return { kind: 'file', status: 'unreadable', problem: 'instructions-unreadable' }
	}

	const imported = body.split('\n').some((line) => line.trim() === `@${canonicalInstructions}`)
	return imported
		? { kind: 'import', status: 'superseded', problem: 'instructions-superseded' }
		: { kind: 'file', status: 'shadowing', problem: 'instructions-shadowing' }
}

/**
 * Checks two things: whether each instruction bridge resolves, and whether anything suppresses a
 * harness that reads `AGENTS.md` natively.
 */
export function diagnoseInstructions(
	root: string,
	harnesses: readonly Harness[],
	cli: string,
): { instructions: InstructionReport[]; findings: BridgeFinding[] } {
	// Project scope only: the user-scope bridges are neither written nor read by this tool.
	const bridged = harnesses
		.map((harness) => ({ name: harness.name, bridge: harness.project.instructionBridge }))
		.filter((harness): harness is { name: HarnessName; bridge: InstructionBridge } => Boolean(harness.bridge))

	const instructions: InstructionReport[] = []
	const findings: BridgeFinding[] = []
	const directories = agentsFileDirectories(root)

	// Reported only when something depends on the file: a bridge pointing at it, or a shadow with
	// no canonical file beside it.
	const shadowsAtRoot = harnesses.some((harness) =>
		(harness.project.shadowedBy ?? []).some((shadow) => exists(join(root, shadow))),
	)
	if ((bridged.length || shadowsAtRoot) && !directories.includes('')) {
		const { detail, repair } = repairFor('no-instructions')
		findings.push({
			path: canonicalInstructions,
			problem: 'no-instructions',
			detail,
			repair: repair({ file: canonicalInstructions }, cli),
		})
	}

	for (const { name, bridge } of bridged) {
		const inspection = inspectSettingsEntry(join(root, bridge.path), bridge.key)
		instructions.push({ harness: name, path: bridge.path, kind: inspection.kind, status: inspection.status })
		if (inspection.problem) {
			const { detail, repair } = repairFor(inspection.problem)
			findings.push({
				path: bridge.path,
				problem: inspection.problem,
				detail,
				repair: repair({ file: bridge.path }, cli),
			})
		}
	}

	// Per directory holding an `AGENTS.md`, not per repository: a `CLAUDE.md` in one subtree says
	// nothing about another.
	for (const harness of harnesses) {
		for (const shadow of harness.project.shadowedBy ?? []) {
			for (const directory of directories) {
				const path = directory ? posix.join(directory, shadow) : shadow
				const inspection = inspectShadow(join(root, path))
				if (!inspection) continue
				// Every shadow that is there is a finding; only its absence is silent.
				instructions.push({ harness: harness.name, path, kind: inspection.kind, status: inspection.status })
				const { detail, repair } = repairFor(inspection.problem)
				findings.push({ path, problem: inspection.problem, detail, repair: repair({ file: path }, cli) })
			}
		}
	}

	return { instructions, findings }
}
