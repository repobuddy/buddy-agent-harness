import { lstatSync, readFileSync, readlinkSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import {
	globalInstructions,
	type HarnessName,
	type HarnessScope,
	harnessRegistry,
} from '../harness-registry/harness-registry.ts'
import type { InstructionBridge } from '../harness-registry/instruction-bridge.ts'
import type { BridgeFinding } from './diagnose-bridges.ts'
import { type GlobalInstructionProblem, repairFor } from './doctor-guidance.ts'

/** What is at a harness's user-scope instruction file. */
export type GlobalInstructionKind = 'import' | 'symlink' | 'file' | 'none'
/**
 * `missing`: no file, so the harness loads no user instructions at all; `unbridged`: a file that
 * loads its own content and not the global one; `overridden`: a file the harness reads in its place,
 * such as Codex's `AGENTS.override.md`, that does not load the global one either.
 */
export type GlobalInstructionStatus = 'ok' | 'missing' | 'unbridged' | 'overridden'

export type GlobalInstructionReport = {
	harness: HarnessName
	/**
	 * The harness's user-scope instruction file, written from `~` so the report is publishable, or
	 * from the variable that moved it, such as `$CODEX_HOME`.
	 */
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

/** Where the harness reads one user-scope path from, absolute and as the report writes it. */
type Located = { absolute: string; display: string }

/** Follows `relocatedBy` the way the harnesses do: an empty value is no value (E-CODEX-06, E-CC-19, E-COPILOT-05). */
function locate(home: string, scope: HarnessScope, env: NodeJS.ProcessEnv, path: string): Located {
	const variable = scope.relocatedBy
	const moved = variable === undefined ? undefined : env[variable]
	if (!moved || (path !== scope.detect && !path.startsWith(`${scope.detect}/`)))
		return { absolute: join(home, path), display: `~/${path}` }
	const rest = path.slice(scope.detect.length)
	return { absolute: join(resolve(moved), rest), display: `$${variable}${rest}` }
}

/** A shadow is read only where it is a file holding more than whitespace (E-CODEX-06). */
function readsAsShadow(path: string): boolean {
	try {
		return statSync(path).isFile() && readFileSync(path, 'utf8').trim() !== ''
	} catch {
		return false
	}
}

function inspect(home: string, target: string, bridge: InstructionBridge): Inspection {
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

function finding(path: string, problem: GlobalInstructionProblem, cli: string): BridgeFinding {
	const { detail, repair } = repairFor(problem)
	return { path, problem, detail, repair: repair({ file: path }, cli) }
}

/**
 * Whether each harness the user has installed loads `~/.agents/AGENTS.md` through its own user-scope
 * file, read from wherever `env` moves it. Read-only: the repair is handed to the user, since
 * nothing here writes outside the repository.
 */
export function diagnoseGlobalInstructions(
	home: string,
	preferred: readonly HarnessName[],
	cli: string,
	env: NodeJS.ProcessEnv = {},
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
		if (!preferred.includes(harness.name) && !isDirectory(locate(home, user, env, user.detect).absolute)) continue

		const file = locate(home, user, env, bridge.path)
		const inspection = inspect(home, file.absolute, bridge)
		// The harness reads the first shadow that holds anything, and its own file only where none does.
		const shadow = (user.shadowedBy ?? [])
			.map((path) => locate(home, user, env, path))
			.find(({ absolute }) => readsAsShadow(absolute))

		if (shadow !== undefined) {
			const read = inspect(home, shadow.absolute, bridge)
			if (read.status === 'ok') {
				rows.push({ harness: harness.name, path: shadow.display, kind: read.kind, status: 'ok' })
				continue
			}
			rows.push({ harness: harness.name, path: file.display, kind: inspection.kind, status: 'overridden' })
			if (hasGlobal) findings.push(finding(shadow.display, 'global-instructions-overridden', cli))
		} else rows.push({ harness: harness.name, path: file.display, kind: inspection.kind, status: inspection.status })

		if (hasGlobal && inspection.problem) findings.push(finding(file.display, inspection.problem, cli))
	}

	return { globalInstructions: rows, findings }
}
