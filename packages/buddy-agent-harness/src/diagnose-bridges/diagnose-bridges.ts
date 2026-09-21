import { lstatSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { type HarnessName, selectHarnesses } from '../harness-registry/harness-registry.ts'
import { linksTo } from '../skill-projection/skill-projection.ts'
import { diagnoseInstructions, type InstructionReport } from './diagnose-instructions.ts'
import { filesUnder } from './directory-files.ts'
import { type BridgeProblem, type DoctorProblem, type RepairAction, repairFor } from './doctor-guidance.ts'
import { type DivergenceDirection, GitBridgeState } from './git-bridge-state.ts'

export type BridgeKind = 'symlink' | 'copy' | 'file' | 'none'
export type BridgeStatus = 'ok' | 'missing' | 'degraded' | 'stale' | 'diverged'

export type BridgeReport = {
	harness: HarnessName
	/** Repository-relative, as the harness registry declares it. */
	path: string
	kind: BridgeKind
	status: BridgeStatus
}

export type BridgeFinding = {
	path: string
	/**
	 * Emitted so a caller routes on a name rather than matching `detail` prose, which would break
	 * when the wording changes.
	 */
	problem: DoctorProblem
	detail: string
	/** What repairs this finding, already carrying the bridge path. Empty `command` means judgment. */
	repair: RepairAction
}

export type DivergenceReport = {
	path: string
	direction: DivergenceDirection
}

export type DiagnoseOptions = {
	root: string
	harnesses?: HarnessName[]
	/** How to name this tool in the repair commands. */
	cli: string
}

export type DiagnoseResult = {
	bridges: BridgeReport[]
	/**
	 * Kept out of `bridges` on purpose: a different `kind`/`status` vocabulary, and a repair that
	 * is never a command.
	 */
	instructions: InstructionReport[]
	divergence: DivergenceReport[]
	findings: BridgeFinding[]
}

const canonicalPath = '.agents/skills'

function pathState(target: string): 'missing' | 'symlink' | 'directory' | 'file' {
	try {
		const stats = lstatSync(target)
		if (stats.isSymbolicLink()) return 'symlink'
		return stats.isDirectory() ? 'directory' : 'file'
	} catch {
		return 'missing'
	}
}

function isDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory()
	} catch {
		return false
	}
}

function sameContent(left: string, right: string): boolean {
	const leftFiles = filesUnder(left)
	const rightFiles = filesUnder(right)
	return (
		leftFiles.length === rightFiles.length &&
		leftFiles.every(
			(file, index) =>
				rightFiles[index] === file && readFileSync(join(left, file)).equals(readFileSync(join(right, file))),
		)
	)
}

type Inspection = {
	kind: BridgeKind
	status: BridgeStatus
	problem?: BridgeProblem
	direction?: DivergenceDirection
}

function inspect(target: string, path: string, canonical: string, git: GitBridgeState): Inspection {
	switch (pathState(target)) {
		case 'missing':
			return { kind: 'none', status: 'missing', problem: 'missing' }
		// git with `core.symlinks=false` writes the link out as a regular file holding the target path.
		case 'file':
			return { kind: 'file', status: 'degraded', problem: 'degraded' }
		// The same test `init` uses to decide a projection is already correct.
		case 'symlink':
			return linksTo(target, canonical)
				? { kind: 'symlink', status: 'ok' }
				: { kind: 'symlink', status: 'stale', problem: 'stale' }
		default: {
			if (!sameContent(target, canonical)) {
				const direction = git.directionOf(path, canonicalPath)
				return { kind: 'copy', status: 'diverged', problem: `diverged-${direction}`, direction }
			}
			// Stays out of `git status` only while the skip-worktree bit survives.
			return git.trackingOf(path) === 'tracked'
				? { kind: 'copy', status: 'ok', problem: 'unpinned-copy' }
				: { kind: 'copy', status: 'ok' }
		}
	}
}

/**
 * Read-only: nothing is created, moved, or repaired — the caller decides what to run from the
 * repair each finding carries.
 */
export function diagnoseBridges({ root, harnesses: preferred = [], cli }: DiagnoseOptions): DiagnoseResult {
	const canonical = join(root, '.agents', 'skills')
	const git = new GitBridgeState(root)
	const selected = selectHarnesses(root, preferred)
	const bridged = selected
		.map((harness) => ({ name: harness.name, skillsDirectory: harness.project.skillsDirectory }))
		.filter((harness): harness is { name: HarnessName; skillsDirectory: string } => Boolean(harness.skillsDirectory))

	const bridges: BridgeReport[] = []
	const divergence: DivergenceReport[] = []
	const findings: BridgeFinding[] = []

	if (!isDirectory(canonical)) {
		const { detail, repair } = repairFor('no-canonical')
		findings.push({
			path: canonicalPath,
			problem: 'no-canonical',
			detail,
			repair: repair({ file: canonicalPath }, cli),
		})
	}

	for (const harness of bridged) {
		const path = harness.skillsDirectory
		const inspection = inspect(join(root, path), path, canonical, git)
		bridges.push({ harness: harness.name, path, kind: inspection.kind, status: inspection.status })
		if (inspection.direction) divergence.push({ path, direction: inspection.direction })
		if (inspection.problem) {
			const { detail, repair } = repairFor(inspection.problem)
			findings.push({ path, problem: inspection.problem, detail, repair: repair({ file: path }, cli) })
		}
	}

	const instructions = diagnoseInstructions(root, selected, cli)
	findings.push(...instructions.findings)

	return { bridges, instructions: instructions.instructions, divergence, findings }
}
