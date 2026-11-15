import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { filesUnder } from './directory-files.ts'

/** Which side of a diverged bridge moved since the last commit where the two agreed. */
export type DivergenceDirection = 'bridge' | 'canonical' | 'both' | 'unknown'

/** Whether a path is tracked, and if so whether its skip-worktree bit is still set. */
export type TrackingState = 'untracked' | 'tracked' | 'skip-worktree'

/**
 * Whether a copy over a tracked path is kept out of commits: `protected` needs both parts, the
 * skip-worktree bit on every tracked entry and the path in the clone's own exclude file.
 */
export type CopyProtection = 'untracked' | 'protected' | 'unprotected'

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

/** A file that cannot be read reads as empty, as a missing exclude file means no rule. */
function readText(path: string): string {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return ''
	}
}

function lines(output: string | undefined): string[] {
	return (output ?? '').split('\n').filter(Boolean)
}

/**
 * Every method degrades to "cannot tell" rather than throwing, so `doctor` still reports on a
 * tarball or a repository with no commits.
 */
export class GitBridgeState {
	/** `''` at the top, `undefined` outside a repository. */
	private readonly repoRootPrefix: string | undefined

	constructor(private readonly root: string) {
		this.repoRootPrefix = git(root, ['rev-parse', '--show-prefix'])?.trim()
	}

	/** Whether `root` is inside a git work tree at all; a check that needs git's answer skips when not. */
	isRepository(): boolean {
		return this.repoRootPrefix !== undefined
	}

	/** The skip-worktree bit is a hint some checkouts clear, so it is verified rather than assumed. */
	trackingOf(path: string): TrackingState {
		if (this.repoRootPrefix === undefined) return 'untracked'
		const entries = lines(git(this.root, ['ls-files', '-v', '--', path]))
		if (!entries.length) return 'untracked'
		return entries.every((entry) => entry.startsWith('S')) ? 'skip-worktree' : 'tracked'
	}

	/**
	 * Skip-worktree alone is not enough: when the committed bridge is a symlink, the copied files
	 * are untracked paths under it, which `git add -A` still adds unless the exclude file lists them.
	 */
	protectionOf(path: string): CopyProtection {
		const tracking = this.trackingOf(path)
		if (tracking === 'untracked') return 'untracked'
		return tracking === 'skip-worktree' && this.isExcluded(path) ? 'protected' : 'unprotected'
	}

	/**
	 * Puts both parts of copy protection on a tracked copy, writing the clone's exclude file and
	 * never `.gitignore`. Returns whether the copy is protected afterwards.
	 */
	protect(path: string): boolean {
		const entries = git(this.root, ['ls-files', '-z', '--', path])
		if (!entries) return false
		git(this.root, ['update-index', '-z', '--skip-worktree', '--stdin'], entries)
		if (!this.isExcluded(path)) {
			const exclude = this.excludeFile()
			const text = readText(exclude)
			mkdirSync(dirname(exclude), { recursive: true })
			appendFileSync(exclude, `${text && !text.endsWith('\n') ? '\n' : ''}/${this.repoRootPrefix}${path}/\n`)
		}
		return this.protectionOf(path) === 'protected'
	}

	/**
	 * Resolved through git, so a linked worktree finds the exclude file its clone shares. Asked only
	 * once a tracked entry has shown the repository exists.
	 */
	private excludeFile(): string {
		return resolve(this.root, (git(this.root, ['rev-parse', '--git-path', 'info/exclude']) as string).trim())
	}

	/** Matched as a line rather than asked of `check-ignore`, which would also count `.gitignore`. */
	private isExcluded(path: string): boolean {
		const bare = `${this.repoRootPrefix}${path}`
		const spellings = [`/${bare}/`, `/${bare}`, `${bare}/`, bare]
		return readText(this.excludeFile())
			.split('\n')
			.some((line) => spellings.includes(line.trim()))
	}

	/**
	 * Asked of git rather than matched against the file, so a rule on a parent directory is caught
	 * too.
	 */
	isIgnored(path: string): boolean {
		if (this.repoRootPrefix === undefined) return false
		return git(this.root, ['check-ignore', '-q', '--', path]) !== undefined
	}

	/**
	 * Bounded to the last 200 commits: a baseline outside that range costs more to find than it's
	 * worth acting on.
	 */
	commitsTouching(paths: readonly string[]): string[] {
		if (this.repoRootPrefix === undefined) return []
		return lines(git(this.root, ['rev-list', '-n', '200', 'HEAD', '--', ...paths]))
	}

	/** One file's content at one commit, or `undefined` when it did not exist there. */
	contentAt(commit: string, path: string): string | undefined {
		if (this.repoRootPrefix === undefined) return undefined
		return git(this.root, ['show', `${commit}:${this.repoRootPrefix}${path}`])
	}

	directionOf(bridge: string, canonical: string): DivergenceDirection {
		const base = this.lastAgreedTree(bridge, canonical)
		if (base === undefined) return 'unknown'
		const bridgeMoved = !this.matchesTree(bridge, base)
		const canonicalMoved = !this.matchesTree(canonical, base)
		if (bridgeMoved && canonicalMoved) return 'both'
		if (bridgeMoved) return 'bridge'
		return 'canonical'
	}

	/**
	 * The tree of the newest commit where both paths held identical content. A commit that holds the
	 * bridge as a symlink never counts: the link says nothing about what a copy made from it held.
	 */
	lastAgreedTree(bridge: string, canonical: string): string | undefined {
		if (this.repoRootPrefix === undefined) return undefined
		for (const commit of lines(git(this.root, ['rev-list', '-n', '200', 'HEAD', '--', bridge, canonical]))) {
			const bridgeObject = git(this.root, [
				'rev-parse',
				'-q',
				'--verify',
				`${commit}:${this.repoRootPrefix}${bridge}`,
			])?.trim()
			if (!bridgeObject) continue
			const canonicalObject = git(this.root, [
				'rev-parse',
				'-q',
				'--verify',
				`${commit}:${this.repoRootPrefix}${canonical}`,
			])?.trim()
			if (bridgeObject === canonicalObject) return bridgeObject
		}
		return undefined
	}

	/** Each file of a tree `lastAgreedTree` found, by its path inside the tree, mapped to its blob id. */
	treeFiles(tree: string): Map<string, string> {
		const entries = (git(this.root, ['ls-tree', '-r', '-z', tree]) as string).split('\0').filter(Boolean)
		return new Map(
			entries.map((entry) => {
				const [meta, path] = entry.split('\t')
				return [path as string, (meta as string).split(' ')[2] as string] as const
			}),
		)
	}

	/**
	 * The blob id each file under `directory` would get, by its path inside the directory. Asked of
	 * `hash-object` rather than hashed in-process, so it follows whatever object format and clean
	 * filters the repository uses.
	 */
	hashFiles(directory: string, files: readonly string[]): Map<string, string> {
		const hashed = lines(
			git(this.root, ['hash-object', '--stdin-paths'], files.map((file) => join(directory, file)).join('\n')),
		)
		return new Map(files.map((file, index) => [file, hashed[index] as string]))
	}

	private matchesTree(directory: string, tree: string): boolean {
		const expected = this.treeFiles(tree)
		const files = filesUnder(join(this.root, directory))
		if (files.length !== expected.size || files.some((file) => !expected.has(file))) return false
		const hashed = this.hashFiles(directory, files)
		return files.every((file) => expected.get(file) === hashed.get(file))
	}
}
