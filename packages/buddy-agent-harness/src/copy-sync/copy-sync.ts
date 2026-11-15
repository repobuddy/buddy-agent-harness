import { execFileSync } from 'node:child_process'
import {
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmdirSync,
	rmSync,
	statSync,
} from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { filesUnder } from '../diagnose-bridges/directory-files.ts'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { type Harness, selectHarnesses } from '../harness-registry/harness-registry.ts'

/** The side of a copy bridge whose version of a file both sides end up holding. */
export type SyncSide = 'canonical' | 'copy'

/** The owner's pick for one file of one copy bridge, named by its path through the bridge. */
export type SyncResolution = {
	/** Repository-relative and through the bridge, such as `.claude/skills/review/SKILL.md`. */
	path: string
	side: SyncSide
}

/** A file the sync wrote, and the side whose version it took. */
export type SyncWrite = {
	bridge: string
	/** The file's path through the bridge: the form `--resolve` takes. */
	path: string
	side: SyncSide
}

/** A file left as it is on both sides until the owner picks a side for it. */
export type SyncLeft = {
	bridge: string
	/** The file's path through the bridge: the form `--resolve` takes. */
	path: string
}

/** `files-left` when at least one file waits for the owner's pick, `synced` otherwise. */
export type SyncOutcome = 'synced' | 'files-left'

export type SyncResult = {
	root: string
	outcome: SyncOutcome
	/** Every copy bridge the sync synced or kept. */
	copies: string[]
	written: SyncWrite[]
	left: SyncLeft[]
	/** The copy bridges at a tracked path that carry both parts of copy protection after the run. */
	protected: string[]
}

/**
 * Each cause a sync refuses or fails for, stable so a caller branches on it rather than on the
 * message.
 */
export type SyncErrorCode =
	| 'invalid-resolution'
	| 'unneeded-resolution'
	| 'conflicting-resolution'
	| 'canonical-missing'
	| 'write-failed'

/** Thrown before anything is written, except `write-failed`. */
export class SyncError extends Error {
	override readonly name = 'SyncError'
	constructor(
		readonly code: SyncErrorCode,
		message: string,
		/** The resolution entries or paths the failure is about. */
		readonly entries: readonly string[] = [],
	) {
		super(message)
	}
}

export const canonicalSkillsPath = '.agents/skills'

const sides: readonly string[] = ['canonical', 'copy'] satisfies SyncSide[]

/**
 * Reads `<path>=<canonical|copy>,...`. The `=` is split at its last occurrence, so a path holding
 * one still parses.
 */
export function parseResolutions(value: string): SyncResolution[] {
	const resolutions: SyncResolution[] = []
	for (const entry of value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)) {
		const at = entry.lastIndexOf('=')
		const path = at > 0 ? normalizePath(entry.slice(0, at)) : ''
		const side = entry.slice(at + 1).trim()
		if (!path || at < 0 || !sides.includes(side)) {
			throw new SyncError(
				'invalid-resolution',
				`Resolution "${entry}" must name a file through its bridge and a side, canonical or copy.`,
				[entry],
			)
		}
		resolutions.push({ path, side: side as SyncSide })
	}
	return resolutions
}

function normalizePath(path: string): string {
	const normalized = posix.normalize(path.trim().replaceAll('\\', '/')).replace(/\/+$/, '')
	return normalized === '.' ? '' : normalized.replace(/^\.\//, '')
}

function isDirectory(path: string): boolean {
	try {
		return statSync(path).isDirectory()
	} catch {
		return false
	}
}

/** A directory that is not itself a link: what a skills bridge is when it is a copy. */
function isCopy(path: string): boolean {
	try {
		return lstatSync(path).isDirectory()
	} catch {
		return false
	}
}

function read(path: string): Buffer | undefined {
	try {
		return readFileSync(path)
	} catch {
		return undefined
	}
}

function same(left: Buffer | undefined, right: Buffer | undefined): boolean {
	return left === undefined || right === undefined ? left === right : left.equals(right)
}

/** Every repository-relative skills bridge path of the harnesses, once each. */
export function skillsBridgePaths(harnesses: readonly Harness[]): string[] {
	return [
		...new Set(
			harnesses.flatMap((harness) => (harness.project.skillsDirectory ? [harness.project.skillsDirectory] : [])),
		),
	]
}

type Status = 'copy' | 'canonical' | 'both' | 'no-agreement'

type Copy = {
	bridge: string
	/** Absent when no last agreement exists. */
	base: Map<string, string> | undefined
	hashes: Map<string, string>
}

type Plan = {
	canonical: { file: string; from: string | undefined }[]
	copies: { bridge: string; file: string }[]
	written: SyncWrite[]
	left: SyncLeft[]
}

function through(bridge: string, file: string): string {
	return `${bridge}/${file}`
}

/** Removes directories a deletion emptied, up to but never including `stop`. */
function prune(directory: string, stop: string): void {
	let current = directory
	while (current !== stop && readdirSync(current).length === 0) {
		rmdirSync(current)
		current = dirname(current)
	}
}

function writeFile(from: string | undefined, to: string, top: string): void {
	if (from === undefined) {
		rmSync(to, { force: true })
		prune(dirname(to), top)
		return
	}
	mkdirSync(dirname(to), { recursive: true })
	copyFileSync(from, to)
}

function plan(root: string, copies: readonly Copy[], resolutions: readonly SyncResolution[]): Plan {
	const canonicalDir = join(root, canonicalSkillsPath)
	const canonicalFiles = filesUnder(canonicalDir)
	const git = new GitBridgeState(root)
	const canonicalHashes = copies.some((copy) => copy.base)
		? git.hashFiles(canonicalSkillsPath, canonicalFiles)
		: new Map<string, string>()
	const pending = new Map(resolutions.map((resolution) => [resolution.path, resolution]))
	const result: Plan = { canonical: [], copies: [], written: [], left: [] }

	const files = [...new Set([...canonicalFiles, ...copies.flatMap((copy) => filesUnder(join(root, copy.bridge)))])]
	for (const file of files.sort()) {
		const current = read(join(canonicalDir, file))
		const contentOf = (copy: Copy) => read(join(root, copy.bridge, file))
		const differing = copies.filter((copy) => !same(contentOf(copy), current))
		if (!differing.length) continue

		const status = new Map<Copy, Status>()
		for (const copy of differing) {
			if (!copy.base) {
				status.set(copy, 'no-agreement')
				continue
			}
			const base = copy.base.get(file)
			const copyMoved = copy.hashes.get(file) !== base
			const canonicalMoved = canonicalHashes.get(file) !== base
			status.set(copy, copyMoved && canonicalMoved ? 'both' : copyMoved ? 'copy' : 'canonical')
		}
		// Two copies that each changed the file to different content changed it on both sides, and any
		// copy the owner must decide for keeps every copy-side edit of the file from reaching the
		// canonical directory without that pick.
		const changedContent = differing
			.filter((copy) => status.get(copy) === 'copy' || status.get(copy) === 'both')
			.map(contentOf)
		const disagree = changedContent.some((content) => !same(content, changedContent[0]))
		const anyUndecided = differing.some((copy) => status.get(copy) === 'both' || status.get(copy) === 'no-agreement')
		const undecided = (copy: Copy) => status.get(copy) !== 'canonical' && (disagree || anyUndecided)

		const picks = differing.flatMap((copy) => {
			const resolution = pending.get(through(copy.bridge, file))
			if (!resolution) return []
			if (!undecided(copy)) return []
			pending.delete(resolution.path)
			return [{ copy, side: resolution.side }]
		})
		const unresolved = differing.filter((copy) => undecided(copy) && !picks.some((pick) => pick.copy === copy))
		const copyPicks = picks.filter((pick) => pick.side === 'copy')
		const automatic = differing.filter((copy) => !undecided(copy) && status.get(copy) === 'copy')

		// A pick that moves the canonical file would change it under every copy that picked otherwise or
		// is still waiting for a pick.
		if (
			copyPicks.length &&
			(unresolved.length ||
				picks.length > copyPicks.length ||
				copyPicks.some((pick) => !same(contentOf(pick.copy), contentOf(copyPicks[0]?.copy as Copy))))
		) {
			const entries = picks.map((pick) => through(pick.copy.bridge, file))
			throw new SyncError(
				'conflicting-resolution',
				`The resolutions for ${file} would leave the copies holding different versions: pick the same side, and the same version, for it in every copy that waits on it.`,
				entries,
			)
		}

		const source = (copyPicks[0]?.copy ?? automatic[0]) as Copy | undefined
		const final = source ? contentOf(source) : current
		if (source) result.canonical.push({ file, from: final && join(root, source.bridge, file) })

		const sideTaken = (copy: Copy): SyncSide =>
			copyPicks.some((pick) => pick.copy === copy) || automatic.includes(copy) ? 'copy' : 'canonical'
		for (const copy of copies) {
			if (unresolved.includes(copy)) {
				result.left.push({ bridge: copy.bridge, path: through(copy.bridge, file) })
				continue
			}
			const content = contentOf(copy)
			if (!same(content, final)) result.copies.push({ bridge: copy.bridge, file })
			if (!same(content, final) || differing.includes(copy))
				result.written.push({ bridge: copy.bridge, path: through(copy.bridge, file), side: sideTaken(copy) })
		}
	}

	const unneeded = [...pending.keys()]
	if (unneeded.length) {
		throw new SyncError(
			'unneeded-resolution',
			`No file left for the user matches: ${unneeded.join(', ')}. A resolution names a file of a copy bridge that both sides changed, or that differs in a copy with no last agreement.`,
			unneeded,
		)
	}
	return result
}

export type SyncCopyBridgesOptions = {
	/** The directory the bridge paths and `.agents/skills` are relative to. */
	root: string
	/** Repository-relative skills bridge paths; only those that are copies are synced. */
	bridges: readonly string[]
	resolutions?: readonly SyncResolution[]
}

/**
 * Merges each copy bridge with `.agents/skills` file by file against their last agreement. Every
 * refusal is thrown before anything is written.
 */
export function syncCopyBridges({ root, bridges, resolutions = [] }: SyncCopyBridgesOptions): SyncResult {
	const copyPaths = [...new Set(bridges)].filter((bridge) => isCopy(join(root, bridge)))
	const result: SyncResult = { root, outcome: 'synced', copies: copyPaths, written: [], left: [], protected: [] }
	if (copyPaths.length && !isDirectory(join(root, canonicalSkillsPath))) {
		throw new SyncError(
			'canonical-missing',
			`${canonicalSkillsPath} does not exist, so the copies cannot be synced with it: ${copyPaths.join(', ')}.`,
			copyPaths,
		)
	}

	const git = new GitBridgeState(root)
	const copies = copyPaths.map((bridge): Copy => {
		const tree = git.lastAgreedTree(bridge, canonicalSkillsPath)
		return tree === undefined
			? { bridge, base: undefined, hashes: new Map() }
			: {
					bridge,
					base: git.treeFiles(tree),
					hashes: git.hashFiles(bridge, filesUnder(join(root, bridge))),
				}
	})
	const planned = plan(root, copies, resolutions)

	const canonicalDir = join(root, canonicalSkillsPath)
	try {
		for (const { file, from } of planned.canonical) writeFile(from, join(canonicalDir, file), canonicalDir)
		for (const { bridge, file } of planned.copies) {
			const canonicalFile = join(canonicalDir, file)
			writeFile(existsSync(canonicalFile) ? canonicalFile : undefined, join(root, bridge, file), join(root, bridge))
		}
	} catch (error) {
		throw new SyncError('write-failed', `The sync failed while writing: ${(error as Error).message}`)
	}

	result.written = planned.written
	result.left = planned.left
	result.outcome = planned.left.length ? 'files-left' : 'synced'
	result.protected = copyPaths.filter((bridge) => git.protect(bridge))
	return result
}

/** The top of the work tree `directory` is in, or `directory` itself outside a repository. */
export function repositoryRoot(directory: string): string {
	try {
		return execFileSync('git', ['rev-parse', '--show-toplevel'], {
			cwd: directory,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim()
	} catch {
		return directory
	}
}

export type SyncOptions = {
	/** Any directory of the repository; the sync works at the top of its work tree. */
	root: string
	resolutions?: readonly SyncResolution[]
}

/** The `sync` command's work: every copy bridge of the repository's enabled harnesses. */
export function syncSkillCopies({ root: start, resolutions = [] }: SyncOptions): SyncResult {
	const root = repositoryRoot(start)
	return syncCopyBridges({ root, bridges: skillsBridgePaths(selectHarnesses(root, [])), resolutions })
}
