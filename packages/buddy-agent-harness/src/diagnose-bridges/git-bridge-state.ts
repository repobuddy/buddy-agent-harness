import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { filesUnder } from './directory-files.ts'

/** Which side of a diverged bridge moved since the last commit where the two agreed. */
export type DivergenceDirection = 'bridge' | 'canonical' | 'both' | 'unknown'

/** Whether a path is tracked, and if so whether its skip-worktree bit is still set. */
export type TrackingState = 'untracked' | 'tracked' | 'skip-worktree'

function git(root: string, args: string[], input?: string): string | undefined {
	try {
		return execFileSync('git', args, {
			cwd: root,
			encoding: 'utf8',
			...(input === undefined ? {} : { input }),
			stdio: ['pipe', 'pipe', 'pipe'],
		})
	} catch {
		return undefined
	}
}

function lines(output: string | undefined): string[] {
	return (output ?? '').split('\n').filter(Boolean)
}

/**
 * Reads git state for the two sides of a bridge. Every method degrades to "cannot tell" rather than
 * throwing, so `doctor` still reports on a tarball, a worktree without git, or a repository with no
 * commits.
 */
export class GitBridgeState {
	/** Path of `root` relative to the repository root, `''` at the top, `undefined` outside a repository. */
	private readonly prefix: string | undefined

	constructor(private readonly root: string) {
		this.prefix = git(root, ['rev-parse', '--show-prefix'])?.trim()
	}

	/**
	 * `init --copy` marks a bridge skip-worktree so a machine-local copy over a tracked symlink stops
	 * showing as a pending change. The bit is a hint that some checkouts clear, so it is verified
	 * rather than assumed.
	 */
	trackingOf(path: string): TrackingState {
		if (this.prefix === undefined) return 'untracked'
		const entries = lines(git(this.root, ['ls-files', '-v', '--', path]))
		if (!entries.length) return 'untracked'
		return entries.every((entry) => entry.startsWith('S')) ? 'skip-worktree' : 'tracked'
	}

	/**
	 * Whether a `.gitignore` rule matches this path. Asked of git rather than matched against the
	 * file, so a rule on a parent directory — the common way a bridge gets ignored — is caught.
	 * Outside a repository nothing is ignored, which is the same "cannot tell" degradation the rest
	 * of this class uses.
	 */
	isIgnored(path: string): boolean {
		if (this.prefix === undefined) return false
		return git(this.root, ['check-ignore', '-q', '--', path]) !== undefined
	}

	/**
	 * The newest commits that touched any of these paths, newest first. Empty outside a repository,
	 * which is the same "cannot tell" degradation as everything else here.
	 *
	 * Bounded like `lastAgreedTree` is: a baseline that is not in the recent history of the two files
	 * is not a baseline anyone can act on, and walking a whole repository to prove its absence costs
	 * more than the answer is worth.
	 */
	commitsTouching(paths: readonly string[]): string[] {
		if (this.prefix === undefined) return []
		return lines(git(this.root, ['rev-list', '-n', '200', 'HEAD', '--', ...paths]))
	}

	/** One file's content at one commit, or `undefined` when it did not exist there. */
	contentAt(commit: string, path: string): string | undefined {
		if (this.prefix === undefined) return undefined
		return git(this.root, ['show', `${commit}:${this.prefix}${path}`])
	}

	/**
	 * Names the side that moved by finding the newest commit whose two trees agreed, then asking which
	 * of the working directories still matches it.
	 */
	directionOf(bridge: string, canonical: string): DivergenceDirection {
		if (this.prefix === undefined) return 'unknown'
		const base = this.lastAgreedTree(bridge, canonical)
		if (base === undefined) return 'unknown'
		const bridgeMoved = !this.matchesTree(bridge, base)
		const canonicalMoved = !this.matchesTree(canonical, base)
		if (bridgeMoved && canonicalMoved) return 'both'
		if (bridgeMoved) return 'bridge'
		return 'canonical'
	}

	/** The tree of the newest commit where both paths held identical content. */
	private lastAgreedTree(bridge: string, canonical: string): string | undefined {
		for (const commit of lines(git(this.root, ['rev-list', '-n', '200', 'HEAD', '--', bridge, canonical]))) {
			const bridgeObject = git(this.root, ['rev-parse', '-q', '--verify', `${commit}:${this.prefix}${bridge}`])?.trim()
			if (!bridgeObject) continue
			const canonicalObject = git(this.root, [
				'rev-parse',
				'-q',
				'--verify',
				`${commit}:${this.prefix}${canonical}`,
			])?.trim()
			if (bridgeObject === canonicalObject) return bridgeObject
		}
		return undefined
	}

	/**
	 * Compares a working directory against a git tree by object id. `hash-object` is used rather than
	 * hashing in-process so the comparison follows whatever object format the repository uses.
	 */
	private matchesTree(directory: string, tree: string): boolean {
		const expected = new Map(
			lines(git(this.root, ['ls-tree', '-r', tree])).map((entry) => {
				const [meta, path] = entry.split('\t')
				return [path, (meta as string).split(' ')[2] as string] as const
			}),
		)
		const files = filesUnder(join(this.root, directory))
		if (files.length !== expected.size || files.some((file) => !expected.has(file))) return false
		const hashed = lines(
			git(this.root, ['hash-object', '--stdin-paths'], files.map((file) => join(directory, file)).join('\n')),
		)
		return hashed.length === files.length && files.every((file, index) => expected.get(file) === hashed[index])
	}
}
