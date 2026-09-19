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
 * `unbridged` is the case a skills bridge has no equivalent of: the file is there, so nothing looks
 * wrong, and it names `AGENTS.md` nowhere — a settings file another tool rewrote.
 *
 * `shadowing` and `superseded` are the two states of a file that suppresses an `AGENTS.md` a
 * harness would otherwise read. They are reported here rather than as bridges because the file is
 * the opposite of one: nothing has to be written for the harness to read `AGENTS.md`, and something
 * has to be dealt with before it can.
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

/**
 * What a file sitting where a harness would otherwise read `AGENTS.md` does to it.
 *
 * Three outcomes, and the split is the whole point of the check. A symlink to `AGENTS.md`, or a
 * body carrying an `@AGENTS.md` import, still delivers the canonical file — it is the bridge this
 * tool used to write, now redundant but not harmful, and removing it is a decision about a file
 * someone may be keeping on purpose. Anything else carries its own content and delivers none of
 * `AGENTS.md`: the harness reads this file *instead*, and says nothing about the one it skipped.
 *
 * A file that imports `AGENTS.md` and then adds harness-specific notes is still the first case. The
 * import is what decides it, wherever it sits in the body.
 */
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
 * Reports whether every enabled harness can still read `AGENTS.md`.
 *
 * Two questions, not one. A harness with an instruction bridge reads `AGENTS.md` only once the
 * bridge is there, so the check is whether it resolves. A harness that reads `AGENTS.md` natively
 * needs nothing written and can still be stopped from reading it, so the check is whether anything
 * on disk suppresses it.
 *
 * Losing either is quieter than losing a skills bridge and costs more: the harness reads none of
 * the repository's instructions, and says nothing about it. The checks are read-only, and no repair
 * is a command — rewriting an instruction file is the `init` skill's judgment.
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
	const directories = agentsFileDirectories(root)

	// Reported when something in the repository depends on the file: a bridge pointing at it, or an
	// instruction file only one harness reads and nothing canonical beside it. A repository with
	// neither has no instructions at all, which is `init`'s to create rather than a fault here.
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

	// Per directory holding an `AGENTS.md`, not per repository. A nested `AGENTS.md` is read where it
	// lies and suppressed where it lies, so a `CLAUDE.md` in one subtree says nothing about another.
	for (const harness of harnesses) {
		for (const shadow of harness.project.shadowedBy ?? []) {
			for (const directory of directories) {
				const path = directory ? posix.join(directory, shadow) : shadow
				const inspection = inspectShadow(join(root, path))
				if (!inspection) continue
				// Every shadow that is there is a finding — a fault where it carries content, and an
				// offer to remove it where it does not. Only its absence is silent.
				instructions.push({ harness: harness.name, path, kind: inspection.kind, status: inspection.status })
				const { detail, repair } = repairFor(inspection.problem)
				findings.push({ path, problem: inspection.problem, detail, repair: repair({ file: path }, cli) })
			}
		}
	}

	return { instructions, findings }
}
