import { lstatSync, readFileSync, readlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { globalInstructions, type HarnessName, harnessRegistry } from '../harness-registry/harness-registry.ts'
import type { InstructionBridge } from '../harness-registry/instruction-bridge.ts'
import type { BridgeFinding } from './diagnose-bridges.ts'
import { type GlobalInstructionProblem, repairFor } from './doctor-guidance.ts'

/** What is at a harness's user-scope instruction file. */
export type GlobalInstructionKind = 'import' | 'symlink' | 'file' | 'none'
/** `missing`: no file, so the harness loads no user instructions at all; `unbridged`: a file that loads its own content and not the global one. */
export type GlobalInstructionStatus = 'ok' | 'missing' | 'unbridged'

export type GlobalInstructionReport = {
	harness: HarnessName
	/** The harness's user-scope instruction file, written from `~` so the report is publishable. */
	path: string
	kind: GlobalInstructionKind
	status: GlobalInstructionStatus
}

type Inspection = { kind: GlobalInstructionKind; status: GlobalInstructionStatus; problem?: GlobalInstructionProblem }

function isDirectory(path: string): boolean {
	try {
		return lstatSync(path).isDirectory()
	} catch {
		return false
	}
}

function exists(path: string): boolean {
	try {
		lstatSync(path)
		return true
	} catch {
		return false
	}
}

/** The import a user wrote may spell the home directory either way; both load the same file. */
function importsGlobal(body: string, bridge: InstructionBridge, home: string): boolean {
	const spellings = bridge.kind === 'import' ? [bridge.line, `@${join(home, globalInstructions)}`] : []
	return body.split('\n').some((line) => spellings.includes(line.trim()))
}

function inspect(home: string, bridge: InstructionBridge): Inspection {
	const target = join(home, bridge.path)
	let stats: ReturnType<typeof lstatSync>
	try {
		stats = lstatSync(target)
	} catch {
		return { kind: 'none', status: 'missing', problem: 'global-instructions-missing' }
	}

	// A symlink loads the global file whatever the bridge kind: the harness reads the file it lands on.
	if (stats.isSymbolicLink())
		return resolve(dirname(target), readlinkSync(target)) === join(home, globalInstructions)
			? { kind: 'symlink', status: 'ok' }
			: { kind: 'symlink', status: 'unbridged', problem: 'global-instructions-unbridged' }

	let body: string
	try {
		body = readFileSync(target, 'utf8')
	} catch {
		return { kind: 'file', status: 'unbridged', problem: 'global-instructions-unbridged' }
	}
	return importsGlobal(body, bridge, home)
		? { kind: 'import', status: 'ok' }
		: { kind: 'file', status: 'unbridged', problem: 'global-instructions-unbridged' }
}

/**
 * Whether each harness the user has installed loads `~/.agents/AGENTS.md` through its own user-scope
 * file. Read-only: the repair is handed to the user, since nothing here writes outside the
 * repository.
 */
export function diagnoseGlobalInstructions(
	home: string,
	preferred: readonly HarnessName[],
	cli: string,
): { globalInstructions: GlobalInstructionReport[]; findings: BridgeFinding[] } {
	// Rows are reported with or without the global file, so `enhance` can say whether text handed over
	// for it would load; a finding needs a file that is going unread.
	const hasGlobal = exists(join(home, globalInstructions))
	const rows: GlobalInstructionReport[] = []
	const findings: BridgeFinding[] = []

	for (const harness of harnessRegistry) {
		const user = harness.user
		const bridge = user?.instructionBridge
		if (!user || !bridge) continue
		if (!preferred.includes(harness.name) && !isDirectory(join(home, user.detect))) continue

		const path = `~/${bridge.path}`
		const inspection = inspect(home, bridge)
		rows.push({ harness: harness.name, path, kind: inspection.kind, status: inspection.status })
		if (hasGlobal && inspection.problem) {
			const { detail, repair } = repairFor(inspection.problem)
			findings.push({ path, problem: inspection.problem, detail, repair: repair({ file: path }, cli) })
		}
	}

	return { globalInstructions: rows, findings }
}
