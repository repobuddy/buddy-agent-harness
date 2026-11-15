import { execFileSync } from 'node:child_process'
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'

export function git(root: string, ...args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

export function write(root: string, path: string, content: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), content)
}

export function read(root: string, path: string): string | undefined {
	return existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : undefined
}

export function remove(root: string, path: string): void {
	rmSync(join(root, path), { recursive: true, force: true })
}

export function link(root: string, path: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	symlinkSync(relative(dirname(join(root, path)), join(root, '.agents', 'skills')), join(root, path), 'junction')
}

/** A directory outside any repository holding `.agents/skills` with one skill. */
export function plainDirectory(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-sync-'))
	write(root, '.agents/skills/review/SKILL.md', '# Review')
	return root
}

/** An empty repository with an identity, so commits need nothing from the user's own config. */
export function emptyRepository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-sync-'))
	git(root, 'init', '-q', '.')
	git(root, 'config', 'user.email', 'sync@example.com')
	git(root, 'config', 'user.name', 'sync')
	git(root, 'config', 'commit.gpgsign', 'false')
	return root
}

export function commitAll(root: string, message = 'commit'): void {
	git(root, 'add', '-A')
	git(root, 'commit', '-qm', message)
}

/**
 * A repository whose `.claude/skills` copy and `.agents/skills` are committed holding the same
 * files, so that commit is their last agreement.
 */
export function agreedRepository(files: Record<string, string> = { 'review/SKILL.md': '# Review' }): string {
	const root = emptyRepository()
	for (const [file, content] of Object.entries(files)) {
		write(root, `.agents/skills/${file}`, content)
		write(root, `.claude/skills/${file}`, content)
	}
	commitAll(root, 'agreed')
	return root
}

/** Every file under `root` but `.git`, with its content, so a test can see exactly what a run wrote. */
export function snapshot(root: string): Map<string, string> {
	const files = new Map<string, string>()
	for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
		const path = relative(root, join(entry.parentPath, entry.name)).split(sep).join('/')
		if (path === '.git' || path.startsWith('.git/') || !entry.isFile()) continue
		files.set(path, readFileSync(join(root, path), 'utf8'))
	}
	return files
}

/** The paths whose content differs between two snapshots, added and removed ones included. */
export function changed(before: Map<string, string>, after: Map<string, string>): string[] {
	return [...new Set([...before.keys(), ...after.keys()])].filter((path) => before.get(path) !== after.get(path)).sort()
}
