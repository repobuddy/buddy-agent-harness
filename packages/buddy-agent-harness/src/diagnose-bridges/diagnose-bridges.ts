import { lstatSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { type HarnessName, selectHarnesses } from '../harness-registry/harness-registry.ts'
import { linksTo } from '../skill-projection/skill-projection.ts'
import { diagnoseInstructions, type InstructionReport } from './diagnose-instructions.ts'
import { filesUnder } from './directory-files.ts'
import { type BridgeProblem, type DoctorProblem, repairFor } from './doctor-guidance.ts'
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
	 * Which problem this is. Emitted so a caller routes on a name rather than by matching `detail`
	 * prose, which would break the moment the wording is improved.
	 */
	problem: DoctorProblem
	detail: string
	/** The command that repairs this finding, already carrying the bridge path. */
	repair: string
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
	 * The instruction bridges into `AGENTS.md`, kept out of `bridges` on purpose: a different `kind`
	 * and `status` vocabulary, and a repair that is the `init` skill rather than a command.
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
		// The flagship Windows failure: git with `core.symlinks=false` writes the link out as a
		// regular file holding the target path, and the harness silently loads nothing.
		case 'file':
			return { kind: 'file', status: 'degraded', problem: 'degraded' }
		// The very test `init` uses to decide a projection is already correct, so a bridge `init` would
		// leave alone never reports as one `doctor` wants rebuilt.
		case 'symlink':
			return linksTo(target, canonical)
				? { kind: 'symlink', status: 'ok' }
				: { kind: 'symlink', status: 'stale', problem: 'stale' }
		default: {
			if (!sameContent(target, canonical)) {
				const direction = git.directionOf(path, canonicalPath)
				return { kind: 'copy', status: 'diverged', problem: `diverged-${direction}`, direction }
			}
			// A copy over a tracked symlink only stays out of `git status` while its skip-worktree bit
			// survives, and some checkout and merge operations clear it.
			return git.trackingOf(path) === 'tracked'
				? { kind: 'copy', status: 'ok', problem: 'unpinned-copy' }
				: { kind: 'copy', status: 'ok' }
		}
	}
}

/**
 * Reports whether every bridge this repository needs still resolves: the skills bridges into
 * `.agents/skills`, and the instruction bridges into `AGENTS.md`. Read-only: nothing is created,
 * moved, or repaired, so the caller decides what to run from the repair each finding carries.
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
		findings.push({ path: canonicalPath, problem: 'no-canonical', detail, repair: repair(canonicalPath, cli) })
	}

	for (const harness of bridged) {
		const path = harness.skillsDirectory
		const inspection = inspect(join(root, path), path, canonical, git)
		bridges.push({ harness: harness.name, path, kind: inspection.kind, status: inspection.status })
		if (inspection.direction) divergence.push({ path, direction: inspection.direction })
		if (inspection.problem) {
			const { detail, repair } = repairFor(inspection.problem)
			findings.push({ path, problem: inspection.problem, detail, repair: repair(path, cli) })
		}
	}

	const instructions = diagnoseInstructions(root, selected, cli)
	findings.push(...instructions.findings)

	return { bridges, instructions: instructions.instructions, divergence, findings }
}
