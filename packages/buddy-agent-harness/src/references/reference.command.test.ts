import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deprecatedManagedGovernancesDir, managedGovernancesDir } from '../governance-overrides/governance-overrides.ts'
import {
	type ReferenceCreateReport,
	type ReferenceListReport,
	type ReferenceSearchReport,
	type ReferenceShowEntry,
	type ReferenceWhereReport,
	referenceCreateCommand,
	referenceListCommand,
	referenceSearchCommand,
	referenceShowCommand,
	referenceWhereCommand,
} from './reference.command.ts'
import { managedReferencesDir } from './reference-layers.ts'

/** The command reads the home directory itself; a fixture per test needs its own fake one. */
const fakeHome = vi.hoisted(() => ({ value: '' }))

vi.mock('node:os', async (importOriginal) => {
	const actual = await importOriginal<typeof import('node:os')>()
	return { ...actual, homedir: () => fakeHome.value }
})

/**
 * What the resolver throws on the next call, so the commands' own failure path — including the
 * branch where the thrown value is not an `Error` — can be reached. A layered file lookup has no
 * input that makes it throw on its own; the layers swallow what they cannot read.
 */
const failure = vi.hoisted(() => ({ value: undefined as unknown }))

vi.mock('./resolve-reference.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./resolve-reference.ts')>()
	const failing =
		<T extends (...args: never[]) => unknown>(fn: T) =>
		(...args: Parameters<T>) => {
			if (failure.value !== undefined) throw failure.value
			return fn(...args)
		}
	return { ...actual, resolveReference: failing(actual.resolveReference) }
})

/**
 * The harness the command sees, and where it keeps managed policy. The real ones read the process
 * environment and fixed system folders, which a test can neither choose nor write.
 */
const harness = vi.hoisted(() => ({
	candidates: [] as string[],
	managed: undefined as { kind: string; location: string; description: string; research: string }[] | undefined,
	/** Every policy source that can enable a plugin was read — true of no harness on record today. */
	allPolicyRead: false,
}))

vi.mock('@cyberuni/agent-harness', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@cyberuni/agent-harness')>()
	return {
		...actual,
		detectHarness: () => ({
			harness: harness.candidates.length === 1 ? harness.candidates[0] : 'unknown',
			evidence: [],
			candidates: harness.candidates,
		}),
		managedPolicyLocations: (...args: Parameters<typeof actual.managedPolicyLocations>) =>
			harness.managed ?? actual.managedPolicyLocations(...args),
		enabledPlugins: async (...args: Parameters<typeof actual.enabledPlugins>) => {
			const result = await actual.enabledPlugins(...args)
			return harness.allPolicyRead ? { ...result, unread: [] } : result
		},
	}
})

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

type ShowArgs = { root?: string; format?: string; trace?: boolean }
type ListArgs = { root?: string; format?: string }
type SearchArgs = { root?: string; format?: string }
type WhereArgs = { root?: string; caller?: string; format?: string }
type CreateArgs = { root?: string; template?: string; scope?: string; 'dry-run'?: boolean; format?: string }

function show(names: string[], args: ShowArgs = {}): Promise<number> {
	return (referenceShowCommand as unknown as { run(value: ShowArgs & { names: string[] }): Promise<number> }).run({
		format: 'text',
		names,
		...args,
	})
}

function list(args: ListArgs = {}): Promise<number> {
	return (referenceListCommand as unknown as { run(value: ListArgs): Promise<number> }).run({ format: 'json', ...args })
}

function search(query: string, args: SearchArgs = {}): Promise<number> {
	return (referenceSearchCommand as unknown as { run(value: SearchArgs & { query: string }): Promise<number> }).run({
		format: 'json',
		query,
		...args,
	})
}

function where(name: string, args: WhereArgs = {}): Promise<number> {
	return (referenceWhereCommand as unknown as { run(value: WhereArgs & { name: string }): Promise<number> }).run({
		format: 'json',
		name,
		...args,
	})
}

function create(name: string, args: CreateArgs = {}): Promise<number> {
	return (referenceCreateCommand as unknown as { run(value: CreateArgs & { name: string }): Promise<number> }).run({
		format: 'text',
		scope: 'project',
		name,
		...args,
	})
}

/** Everything the last run put on stdout, concatenated. */
function written(): string {
	return stdout.mock.calls.map(([value]: unknown[]) => String(value)).join('')
}

function stderrLines(): string[] {
	return stderr.mock.calls.map(([value]: unknown[]) => String(value))
}

function tempDir(prefix = 'reference-'): string {
	return mkdtempSync(join(tmpdir(), prefix))
}

/** Writes a file, creating its parent directories. */
function write(root: string, relPath: string, content: string): string {
	const path = join(root, relPath)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, content)
	return path
}

/** A workspace marker — the project tier must not climb to it. */
function markRoot(dir: string): void {
	writeFileSync(join(dir, 'pnpm-workspace.yaml'), '')
}

function repo(): string {
	return tempDir('reference-repo-')
}

/** Declares `dependencies` in a manifest at `root`, so the plugin tier picks it up. */
function declareDependency(root: string, pkg: string, version = '1.0.0'): void {
	write(root, 'package.json', JSON.stringify({ name: 'fixture', dependencies: { [pkg]: version } }))
}

/** A dependency installed under `root/node_modules`, shipping its own `references/`. */
function installDependency(root: string, pkg: string, documents: Record<string, string> = {}): void {
	write(root, join('node_modules', pkg, 'package.json'), JSON.stringify({ name: pkg, version: '1.0.0' }))
	for (const [name, content] of Object.entries(documents)) {
		write(root, join('node_modules', pkg, 'references', `${name}.md`), content)
	}
}

async function withPlatform(platform: NodeJS.Platform, programData: string, run: () => Promise<void>): Promise<void> {
	const originalPlatform = process.platform
	const originalProgramData = process.env['ProgramData']
	Object.defineProperty(process, 'platform', { value: platform, configurable: true })
	process.env['ProgramData'] = programData
	try {
		await run()
	} finally {
		Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
		if (originalProgramData === undefined) delete process.env['ProgramData']
		else process.env['ProgramData'] = originalProgramData
	}
}

beforeEach(() => {
	fakeHome.value = tempDir('reference-home-')
	failure.value = undefined
	harness.candidates = []
	harness.managed = undefined
	harness.allPolicyRead = false
	stdout.mockClear()
	stderr.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

// ── tiers ──

describe('tiers', () => {
	it('resolves managed over project over user over plugin', async () => {
		const programData = tempDir('reference-programdata-')
		await withPlatform('win32', programData, async () => {
			const root = repo()
			declareDependency(root, 'dep-a')
			installDependency(root, 'dep-a', { name: 'plugin\n' })
			write(root, '.agents/references/name.md', 'project\n')
			write(fakeHome.value, '.agents/references/name.md', 'user\n')
			const managedPath = write(managedReferencesDir('win32', programData), 'name.md', 'managed\n')

			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('managed\n')

			rmSync(managedPath)
			stdout.mockClear()
			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('project\n')

			rmSync(join(root, '.agents/references/name.md'))
			stdout.mockClear()
			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('user\n')

			rmSync(join(fakeHome.value, '.agents/references/name.md'))
			stdout.mockClear()
			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('plugin\n')
		})
	})

	it("reads references beside each detected harness's managed files, above the project tier", async () => {
		const claude = tempDir('reference-claude-managed-')
		const codex = tempDir('reference-codex-managed-')
		harness.candidates = ['claude-code', 'codex']
		harness.managed = [
			{ kind: 'file', location: join(claude, 'managed-settings.json'), description: '', research: '' },
			{ kind: 'directory', location: join(claude, 'managed-settings.d'), description: '', research: '' },
			{ kind: 'file', location: join(codex, 'requirements.toml'), description: '', research: '' },
		]
		const root = repo()
		const projectPath = write(root, '.agents/references/name.md', 'project\n')
		const claudePath = write(claude, 'references/name.md', 'claude\n')
		const codexPath = write(codex, 'references/name.md', 'codex\n')
		write(claude, 'managed-settings.d/references/name.md', 'drop-in\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('claude\n')

		rmSync(claudePath)
		stdout.mockClear()
		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('codex\n')

		rmSync(codexPath)
		stdout.mockClear()
		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('project\n')

		rmSync(projectPath)
		stdout.mockClear()
		expect(await show(['name'], { root })).toBe(1)
	})

	it('skips managed policy that cannot be read locally, and says so in the trace', async () => {
		harness.candidates = ['claude-code']
		harness.managed = [
			{ kind: 'macos-managed-preferences', location: 'com.anthropic.claudecode', description: '', research: '' },
			{ kind: 'server', location: 'claude.ai admin console', description: '', research: '' },
		]
		const root = repo()
		write(root, '.agents/references/name.md', 'project\n')

		expect(await show(['name'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		const skipped = entry?.trace?.filter((step) => step.outcome.startsWith('not read'))
		expect(skipped?.map((step) => step.path)).toEqual(
			expect.arrayContaining(['com.anthropic.claudecode', 'claude.ai admin console']),
		)
		expect(skipped?.find((step) => step.path === 'com.anthropic.claudecode')?.outcome).toMatch(
			/claude-code keeps this policy in a macOS managed-preferences domain delivered by MDM, which cannot be read locally/,
		)
		expect(skipped?.every((step) => !step.found)).toBe(true)
	})

	it('says in the trace that no harness was detected', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', 'project\n')

		expect(await show(['name'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.trace?.find((step) => step.path === '(no harness detected)')?.outcome).toMatch(
			/^not read — no harness detected/,
		)
	})

	it('reads references from each plugin the harness has enabled', async () => {
		harness.candidates = ['claude-code']
		const alpha = tempDir('reference-alpha-')
		const beta = tempDir('reference-beta-')
		write(alpha, 'references/testing.md', 'alpha\n')
		write(beta, 'references/style.md', 'beta\n')
		write(fakeHome.value, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'alpha@market': true } }))
		write(
			fakeHome.value,
			'.claude/plugins/installed_plugins.json',
			JSON.stringify({
				version: 2,
				plugins: {
					'alpha@market': [{ scope: 'user', installPath: alpha }],
					'beta@market': [{ scope: 'user', installPath: beta }],
				},
			}),
		)
		const root = repo()

		expect(await show(['testing'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry).toMatchObject({ tier: 'plugin', plugin: 'alpha', content: 'alpha\n' })

		stdout.mockClear()
		expect(await show(['alpha/testing'], { root })).toBe(0)
		expect(written()).toBe('alpha\n')
	})

	it('never reads a plugin the harness has installed but not enabled', async () => {
		harness.candidates = ['claude-code']
		const beta = tempDir('reference-beta-')
		write(beta, 'references/style.md', 'beta\n')
		write(fakeHome.value, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'gamma@market': false } }))
		write(
			fakeHome.value,
			'.claude/plugins/installed_plugins.json',
			JSON.stringify({ version: 2, plugins: { 'beta@market': [{ scope: 'user', installPath: beta }] } }),
		)
		const root = repo()

		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.layers.some((layer) => layer.plugin === 'beta')).toBe(false)
		expect(JSON.stringify(report.references)).not.toContain('style')

		stdout.mockClear()
		expect(await show(['style'], { root })).toBe(1)
	})

	it('adds no policy layer when every source that can enable a plugin was read', async () => {
		harness.candidates = ['claude-code']
		harness.allPolicyRead = true
		const root = repo()

		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.layers.some((layer) => layer.path === '(claude-code plugin policy)')).toBe(false)
	})

	it('skips an enabled plugin with no install folder, and says so in the trace', async () => {
		harness.candidates = ['claude-code']
		write(fakeHome.value, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'alpha@market': true } }))
		const root = repo()

		expect(await show(['alpha/testing'], { root, format: 'json', trace: true })).toBe(1)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.trace?.find((step) => step.plugin === 'alpha')).toMatchObject({
			path: '(alpha@market)',
			found: false,
			outcome: 'not read — enabled in claude-code, but no install folder for this project is recorded',
		})
	})

	it('falls through to the highest tier that holds the name', async () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { name: 'plugin\n' })
		write(fakeHome.value, '.agents/references/name.md', 'user\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('user\n')
	})

	it('orders the managed layers references, then governances, then the deprecated one', async () => {
		const programData = tempDir('reference-programdata-')
		await withPlatform('win32', programData, async () => {
			const root = repo()
			const referencesPath = write(managedReferencesDir('win32', programData), 'name.md', 'references-tier\n')
			const governancesPath = write(managedGovernancesDir('win32', programData), 'name.md', 'governances-tier\n')
			write(deprecatedManagedGovernancesDir('win32', programData), 'name.md', 'deprecated-tier\n')

			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('references-tier\n')

			rmSync(referencesPath)
			stdout.mockClear()
			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('governances-tier\n')

			rmSync(governancesPath)
			stdout.mockClear()
			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('deprecated-tier\n')
		})
	})

	it('passes over a layer that is not a folder and asks the next', async () => {
		const root = repo()
		mkdirSync(join(root, '.agents'), { recursive: true })
		writeFileSync(join(root, '.agents', 'references'), 'not a directory')
		write(fakeHome.value, '.agents/references/name.md', 'user\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('user\n')
	})

	it('walks the project tier up to the workspace root, the nearest layer first', async () => {
		const outside = tempDir('reference-outside-')
		const base = join(outside, 'repo')
		mkdirSync(base)
		markRoot(base)
		const root = join(base, 'packages', 'pkg-a')
		write(outside, '.agents/references/name.md', 'outside\n')
		write(outside, '.agents/references/outside-only.md', 'outside\n')
		write(base, '.agents/references/name.md', 'workspace\n')
		const nearest = write(root, '.agents/references/name.md', 'package\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('package\n')

		rmSync(nearest)
		stdout.mockClear()
		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('workspace\n')

		stdout.mockClear()
		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.layers.filter((layer) => layer.tier === 'project').map((layer) => layer.path)).toEqual([
			join(root, '.agents', 'references'),
			join(root, '.agents', 'governances'),
			join(base, 'packages', '.agents', 'references'),
			join(base, 'packages', '.agents', 'governances'),
			join(base, '.agents', 'references'),
			join(base, '.agents', 'governances'),
		])
		expect(JSON.stringify(report.references)).not.toContain('outside-only')
	})

	it('stops the walk at the git root or a package.json declaring workspaces', async () => {
		for (const mark of [
			(dir: string) => mkdirSync(join(dir, '.git')),
			(dir: string) => write(dir, 'package.json', JSON.stringify({ workspaces: ['packages/*'] })),
		]) {
			const outside = tempDir('reference-outside-')
			const base = join(outside, 'repo')
			mkdirSync(base)
			mark(base)
			const root = join(base, 'pkg')
			mkdirSync(root)
			write(outside, '.agents/references/outside-only.md', 'outside\n')
			write(base, '.agents/references/name.md', 'repository\n')

			stdout.mockClear()
			expect(await show(['name'], { root })).toBe(0)
			expect(written()).toBe('repository\n')
			stdout.mockClear()
			expect(await show(['outside-only'], { root })).toBe(1)
		}
	})

	it('reads the root alone when no repository root is above it', async () => {
		const outside = tempDir('reference-outside-')
		const root = join(outside, 'pkg')
		mkdirSync(root)
		write(outside, '.agents/references/name.md', 'outside\n')

		expect(await show(['name'], { root })).toBe(1)
		expect(written()).toBe('')
	})

	it("reads a declared dependency's references as a plugin", async () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { testing: '# Testing\n' })

		expect(await show(['testing'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('found')
		expect(entry?.tier).toBe('plugin')
		expect(entry?.plugin).toBe('dep-a')
		expect(entry?.content).toBe('# Testing\n')
	})

	it('never reads a package the repository did not declare', async () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(JSON.stringify(report.references)).not.toContain('dep-b')
	})

	it('reports a name two plugins hold as ambiguous, naming both', async () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' } }))
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(await show(['testing'], { root, format: 'json' })).toBe(1)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('ambiguous')
		expect(entry?.plugins).toEqual(['dep-a/testing', 'dep-b/testing'])
	})

	it('resolves a qualified name at that plugin, with the tiers above still overriding it', async () => {
		const root = repo()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' } }))
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(await show(['dep-a/testing'], { root })).toBe(0)
		expect(written()).toBe('# dep-a\n')

		write(root, '.agents/references/testing.md', '# project\n')
		stdout.mockClear()
		expect(await show(['dep-a/testing'], { root })).toBe(0)
		expect(written()).toBe('# project\n')
	})

	it('answers a qualified name from the tiers above when the plugin is not a dependency', async () => {
		const root = repo()
		write(root, '.agents/references/testing.md', '# project\n')

		expect(await show(['other/testing'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('found')
		expect(entry?.content).toBe('# project\n')
		const pluginStep = entry?.trace?.find((step) => step.plugin === 'other')
		expect(pluginStep?.found).toBe(false)
	})
})

// ── file names ──

describe('file names', () => {
	it('resolves each file-name candidate', async () => {
		const forms: [string, string][] = [
			['name.md', 'name.md'],
			['name/README.md', 'name/README.md'],
			['name/index.md', 'name/index.md'],
			['name/SKILL.md', 'name/SKILL.md'],
		]
		for (const [relPath, candidate] of forms) {
			const root = repo()
			write(root, join('.agents', 'references', relPath), '# doc\n')

			expect(await show(['name'], { root, format: 'json', trace: true })).toBe(0)
			const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
			expect(entry?.content).toBe('# doc\n')
			const step = entry?.trace?.find((s) => s.found)
			expect(step?.candidate).toBe(candidate)
			stdout.mockClear()
		}
	})

	it('prefers the earlier candidate in one layer and warns', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# top level\n')
		write(root, '.agents/references/name/README.md', '# folder form\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('# top level\n')
		expect(stderrLines().some((line) => line.includes('is ignored'))).toBe(true)

		stdout.mockClear()
		stderr.mockClear()
		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.warnings?.some((warning) => warning.includes('is ignored'))).toBe(true)
	})
})

// ── merge modes ──

describe('merge modes', () => {
	it('returns the highest document whole and shadows the rest', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(await show(['name'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.content).toBe('# project\n')
		const userStep = entry?.trace?.find((step) => step.tier === 'user' && step.found)
		expect(userStep?.outcome).toBe('shadowed by project (first-wins)')
	})

	it('returns every layer whole, labeled, highest first', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: combine\n---\n# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(await show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain(
			'Combined from 2 layers, highest precedence first. Where they conflict, the first layer wins.',
		)
		const projectIndex = content.indexOf('# project')
		const userIndex = content.indexOf('# user')
		expect(projectIndex).toBeGreaterThan(-1)
		expect(userIndex).toBeGreaterThan(projectIndex)
		expect(content).toMatch(/<!-- layer: project .*-->/)
		expect(content).toMatch(/<!-- layer: user .*-->/)
	})

	it('replaces a matched section and its subsections', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nproject body\n')
		write(
			fakeHome.value,
			'.agents/references/name.md',
			'## Testing\n\nuser body\n\n### Fixtures\n\nuser fixture\n\n## Other\n\nkept\n',
		)

		expect(await show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('project body')
		expect(content).not.toContain('user body')
		expect(content).not.toContain('Fixtures')
		expect(content).toContain('## Other')
	})

	it('keeps both bodies and merges subsections when a section says combine', async () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\n## Testing\n<!-- merge: combine -->\n\nproject body\n\n### Fixtures\n\nproject fixtures\n\n### Mocks\n<!-- merge: remove -->\n',
		)
		write(
			fakeHome.value,
			'.agents/references/name.md',
			'## Testing\n\nuser body\n\n### Fixtures\n\nuser fixtures\n\n### Mocks\n\nuser mocks\n\n### Coverage\n\nuser coverage\n',
		)

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe(
			'## Testing\n\nuser body\n\nproject body\n\n### Fixtures\n\nproject fixtures\n\n### Coverage\n\nuser coverage\n',
		)
	})

	it('drops a section marked remove', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Legacy\n<!-- merge: remove -->\n')
		write(fakeHome.value, '.agents/references/name.md', '## Legacy\n\nold content\n\n## Keep\n\nstays\n')

		expect(await show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).not.toContain('## Legacy')
		expect(content).toContain('## Keep')
	})

	it('appends a new section after its last sibling, keeping base order', async () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\n## Testing\n<!-- merge: combine -->\n\n### New\n\nadded\n',
		)
		write(
			fakeHome.value,
			'.agents/references/name.md',
			'## Testing\n\nbase\n\n### Existing\n\nkept\n\n## Later\n\nafter\n',
		)

		expect(await show(['name'], { root })).toBe(0)
		const content = written()
		const existingIndex = content.indexOf('### Existing')
		const newIndex = content.indexOf('### New')
		const laterIndex = content.indexOf('## Later')
		expect(existingIndex).toBeGreaterThan(-1)
		expect(newIndex).toBeGreaterThan(existingIndex)
		expect(laterIndex).toBeGreaterThan(newIndex)
	})

	it('ignores headings inside code fences', async () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\n## Testing\n\n```\n## not a heading\n```\n\nproject body\n',
		)
		write(fakeHome.value, '.agents/references/name.md', '## Testing\n\nbase body\n\n## Not a heading\n\nbase kept\n')

		expect(await show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('```\n## not a heading\n```\n\nproject body')
		expect(content).toContain('## Not a heading\n\nbase kept')
		expect(content).not.toContain('base body')
	})

	it('matches headings regardless of case and surrounding whitespace', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n##   testing  \n\noverlay body\n')
		write(fakeHome.value, '.agents/references/name.md', '## Testing\n\nbase body\n')

		expect(await show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('overlay body')
		expect(content).not.toContain('base body')
	})

	it('treats text before the first heading as its own section', async () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\noverlay preamble\n\n## Testing\n\nbody\n',
		)
		write(fakeHome.value, '.agents/references/name.md', 'base preamble\n\n## Testing\n\nbase body\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toContain('overlay preamble')
		expect(written()).not.toContain('base preamble')

		stdout.mockClear()
		const root2 = repo()
		write(root2, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nbody\n')
		write(fakeHome.value, '.agents/references/name.md', 'base preamble\n\n## Testing\n\nbase body\n')

		expect(await show(['name'], { root: root2 })).toBe(0)
		expect(written()).toContain('base preamble')
	})

	it('warns when a merge comment matches nothing or a heading path repeats', async () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\n## Testing\n\noverlay body\n\n## Missing\n<!-- merge: remove -->\n',
		)
		write(fakeHome.value, '.agents/references/name.md', '## Testing\n\nfirst\n\n## Testing\n\nsecond\n')

		expect(await show(['name'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		const warnings = (entry?.warnings ?? []).join(' ')
		expect(warnings).toContain('matches no section below')
		expect(warnings).toContain('appears more than once')
		expect(entry?.content).toBe('## Testing\n\noverlay body\n\n## Testing\n\nsecond\n')
	})

	it('applies layers bottom-up', async () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { name: '## Testing\n\nplugin body\n' })
		write(fakeHome.value, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nuser body\n')
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nproject body\n')

		expect(await show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('project body')
		expect(content).not.toContain('plugin body')
		expect(content).not.toContain('user body')
	})

	it('adds a trailing newline when the document has none', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('# project\n')
	})

	it('adds no second newline when the document has one', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('# project\n')
	})

	it('strips frontmatter and merge comments from text output and returns frontmatter as metadata', async () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\ndescription: about testing\n---\n## Testing\n<!-- merge: replace -->\n\nbody\n',
		)

		expect(await show(['name'], { root })).toBe(0)
		const text = written()
		expect(text).not.toContain('description: about testing')
		expect(text).not.toContain('merge: replace')

		stdout.mockClear()
		expect(await show(['name'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.metadata).toEqual({ description: 'about testing' })
	})

	it('treats an unknown merge mode as first-wins, with a warning', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: overlay\n---\n# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(await show(['name'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.content).toBe('# project\n')
		expect((entry?.warnings ?? []).some((warning) => warning.includes('unknown merge mode'))).toBe(true)
	})
})

describe('the monorepo walk', () => {
	it('merges project layers farthest first', async () => {
		const base = repo()
		markRoot(base)
		const root = join(base, 'pkg')
		write(base, '.agents/references/name.md', '## A\n\nworkspace A\n\n## B\n\nworkspace B\n\n## C\n\nworkspace C\n')
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\n## A\n\npackage A\n\n## B\n\npackage B\n',
		)

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('## A\n\npackage A\n\n## B\n\npackage B\n\n## C\n\nworkspace C\n')
	})
})

// ── show output ──

describe('show output', () => {
	it('writes a single document and nothing else', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')

		expect(await show(['name'], { root })).toBe(0)
		expect(written()).toBe('# doc\n')
	})

	it('writes several documents between delimiters in the order asked', async () => {
		const root = repo()
		write(root, '.agents/references/a.md', '# a\n')
		write(root, '.agents/references/b.md', '# b\n')
		write(root, '.agents/references/c.md', '# c\n')

		expect(await show(['c', 'a', 'b'], { root })).toBe(0)
		const content = written()
		expect(content.indexOf('name="c"')).toBeLessThan(content.indexOf('name="a"'))
		expect(content.indexOf('name="a"')).toBeLessThan(content.indexOf('name="b"'))
	})

	it('reports a missing name in place and exits non-zero', async () => {
		const root = repo()
		write(root, '.agents/references/a.md', '# a\n')
		write(root, '.agents/references/b.md', '# b\n')

		expect(await show(['a', 'missing', 'b'], { root })).toBe(1)
		const content = written()
		expect(content).toContain('name="a"')
		expect(content).toContain('name="b"')
		expect(content).toContain('name="missing" status="missing"')
		expect(content.indexOf('name="a"')).toBeLessThan(content.indexOf('name="missing"'))
		expect(content.indexOf('name="missing"')).toBeLessThan(content.indexOf('name="b"'))
		expect(stderrLines().some((line) => line.includes('no reference named "missing"'))).toBe(true)
	})

	it('returns an array in the order asked', async () => {
		const root = repo()
		write(root, '.agents/references/a.md', '# a\n')

		expect(await show(['a', 'missing'], { root, format: 'json' })).toBe(1)
		const entries = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entries.map((entry) => entry.status)).toEqual(['found', 'missing'])
	})

	it('suggests close names on a miss and never answers with one', async () => {
		const root = repo()
		write(root, '.agents/references/testing.md', '# testing\n')

		expect(await show(['testin'], { root, format: 'json' })).toBe(1)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('missing')
		expect(entry?.content).toBeUndefined()
		expect(entry?.suggestions).toContain('testing')
	})

	it('traces every path checked, the candidate, the merge mode, and why a layer was dropped', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(await show(['name'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.trace?.length).toBeGreaterThan(1)
		const userStep = entry?.trace?.find((step) => step.tier === 'user' && step.found)
		expect(userStep?.outcome).toBe('shadowed by project (first-wins)')
		const projectStep = entry?.trace?.find((step) => step.tier === 'project' && step.found)
		expect(projectStep?.candidate).toBe('name.md')
		expect(projectStep?.merge).toBe('first-wins')
		expect(projectStep?.outcome).toBe('used')
		const emptyStep = entry?.trace?.find((step) => !step.found)
		expect(emptyStep).toBeDefined()
	})

	it('writes the trace to stderr in text so stdout stays the document', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')

		expect(await show(['name'], { root, trace: true })).toBe(0)
		expect(written()).toBe('# doc\n')
		expect(stderrLines().some((line) => line.includes('trace name'))).toBe(true)
	})

	it('rejects a name that is a path', async () => {
		const root = repo()

		expect(await show(['../escape'], { root })).toBe(1)
		expect(stdout).not.toHaveBeenCalled()
		expect(stderrLines().some((line) => line.includes('is not a reference name'))).toBe(true)

		stderr.mockClear()
		expect(await show(['a\\b'], { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('is not a reference name'))).toBe(true)

		stderr.mockClear()
		expect(await show(['name.md'], { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('names a file'))).toBe(true)
	})

	it('rejects an unsupported output format', async () => {
		const root = repo()

		expect(await show(['name'], { root, format: 'yaml' })).toBe(1)
		expect(stderrLines()).toContain('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()

		stderr.mockClear()
		expect(await list({ root, format: 'yaml' })).toBe(1)
		expect(stderrLines()).toContain('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()

		stderr.mockClear()
		expect(await search('anything', { root, format: 'yaml' })).toBe(1)
		expect(stderrLines()).toContain('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()
	})
})

// ── list ──

describe('list', () => {
	it('lists every layer in precedence order, with the legacy layers marked', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')

		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		const tiers = report.layers.map((layer) => layer.tier)
		const firstUser = tiers.indexOf('user')
		const firstPlugin = tiers.indexOf('plugin')
		expect(tiers[0]).toBe('managed')
		expect(tiers.indexOf('project')).toBeGreaterThan(tiers.lastIndexOf('managed'))
		expect(firstUser).toBeGreaterThan(tiers.lastIndexOf('project'))
		expect(firstPlugin).toBeGreaterThan(tiers.lastIndexOf('user'))

		for (const layer of report.layers) {
			if (layer.path.endsWith('universal-plugin/governances') || layer.path.endsWith('UniPlugin/governances')) {
				expect(layer.status).toContain('deprecated')
			} else if (layer.path.endsWith('governances')) expect(layer.status).toContain('legacy')
			else if (layer.path === '(no harness detected)') expect(layer.status).toMatch(/^not read/)
			else expect(layer.status).toBe('')
		}
		expect(report.layers.filter((layer) => layer.status.includes('legacy')).map((layer) => layer.tier)).toEqual(
			expect.arrayContaining(['managed', 'project', 'user', 'plugin']),
		)
		expect(report.layers.filter((layer) => layer.status.includes('deprecated'))).toHaveLength(1)
	})

	it('marks shadowed layers in the listing', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		const rows = report.references as { tier: string; status: string }[]
		expect(rows.find((row) => row.tier === 'project')?.status).toBe('used')
		expect(rows.find((row) => row.tier === 'user')?.status).toBe('shadowed by project (first-wins)')
	})

	it('states the zero when no layer holds a reference', async () => {
		const root = repo()

		expect(await list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.references).toBe('0 references — no layer holds one')
	})
})

// ── search ──

describe('search', () => {
	it('ranks exact name, prefix, close name, description, heading, then body', async () => {
		const root = repo()
		write(root, '.agents/references/test.md', '# exact\n')
		write(root, '.agents/references/testing.md', '# prefix\n')
		write(root, '.agents/references/best.md', '# close name\n')
		write(root, '.agents/references/alpha.md', '---\ndescription: covers test coverage\n---\n# alpha\n')
		write(root, '.agents/references/beta.md', '# Testing checklist\n\nnothing else relevant here\n')
		write(root, '.agents/references/gamma.md', '# gamma\n\nthis paragraph mentions a test in passing\n')

		expect(await search('test', { root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceSearchReport
		const matches = report.references as { name: string; tier: string; match: string; description: string }[]
		expect(matches.every((match) => match.tier === 'project')).toBe(true)
		expect(matches.map((match) => match.description)).toEqual(['', '', '', 'covers test coverage', '', ''])
		expect(matches.map((match) => match.name)).toEqual(['test', 'testing', 'best', 'alpha', 'beta', 'gamma'])
		expect(matches.map((match) => match.match)).toEqual([
			'name',
			'prefix',
			'close name',
			'description',
			'heading',
			'body',
		])
	})

	it('states the zero when nothing matches', async () => {
		const root = repo()
		write(root, '.agents/references/testing.md', '# testing\n\nabout testing\n')

		expect(await search('unrelated-topic', { root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceSearchReport
		expect(report.references).toBe('0 references match "unrelated-topic"')
	})
})

// ── legacy ──

describe('legacy', () => {
	it('reads legacy governances folders below references in the same tier', async () => {
		const alone = repo()
		write(alone, '.agents/governances/testing.md', '# governances alone\n')

		expect(await show(['testing'], { root: alone })).toBe(0)
		expect(written()).toBe('# governances alone\n')

		stdout.mockClear()
		const both = repo()
		write(both, '.agents/references/testing.md', '# references wins\n')
		write(both, '.agents/governances/testing.md', '# governances loses\n')

		expect(await show(['testing'], { root: both })).toBe(0)
		expect(written()).toBe('# references wins\n')
	})
})

// Not scenarios of their own: branches the feature's scenarios don't reach, needed for full
// statement/branch coverage of reference.command.ts.
describe('coverage: edge cases outside the feature', () => {
	it('resolves --root against the working directory when none is named', async () => {
		expect(await list({ format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.layers.length).toBeGreaterThan(0)
	})

	it('writes nothing to stdout for a single name that resolves to nothing', async () => {
		const root = repo()

		expect(await show(['missing'], { root })).toBe(1)
		expect(stdout).not.toHaveBeenCalled()
	})

	it('rejects an empty name list', async () => {
		const root = repo()

		expect(await show([], { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('Name at least one reference'))).toBe(true)
	})

	it('rejects a blank search query', async () => {
		const root = repo()

		expect(await search('   ', { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('Search needs a query'))).toBe(true)
	})

	it('reports a show failure it cannot read a message from', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')
		failure.value = 'unavailable'

		expect(await show(['name'], { root })).toBe(1)
		expect(stderrLines()).toContain('error: Reference lookup failed.\n')
	})

	it('reports a list failure it cannot read a message from', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')
		failure.value = 'unavailable'

		expect(await list({ root })).toBe(1)
		expect(stderrLines()).toContain('error: Reference listing failed.\n')
	})

	it('reports a search failure it cannot read a message from', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')
		failure.value = 'unavailable'

		expect(await search('name', { root })).toBe(1)
		expect(stderrLines()).toContain('error: Reference search failed.\n')
	})
})

// ── where ──

describe('where', () => {
	it('lists the project and user slots, in precedence order, marking used and shadowed', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(await where('name', { root })).toBe(0)
		const report = JSON.parse(written()) as ReferenceWhereReport
		expect(report.root).toBe(root)
		expect(report.slots).toEqual([
			{
				layer: 'project',
				path: '.agents/references/name.md',
				status: 'used',
				scope: 'everyone working in this repository',
			},
			{
				layer: 'user',
				path: '~/.agents/references/name.md',
				status: 'shadowed',
				scope: 'only you, in every repository',
			},
		])
		expect(report.merge).toContain('merge-sections')
	})

	it('names the file in an empty slot and leaves out superseded layers', async () => {
		const root = repo()

		expect(await where('name', { root })).toBe(0)
		const report = JSON.parse(written()) as ReferenceWhereReport
		const empty = report.slots.find((slot) => slot.layer === 'project')
		expect(empty).toMatchObject({ status: 'empty', path: '.agents/references/name.md' })
		expect(report.slots.some((slot) => slot.path.includes('governances'))).toBe(false)
		expect(report.warnings).toBeUndefined()
	})

	it('shows a legacy folder while a copy there is still read', async () => {
		const root = repo()
		const legacy = write(root, '.agents/governances/name.md', '# legacy\n')

		expect(await where('name', { root })).toBe(0)
		const report = JSON.parse(written()) as ReferenceWhereReport
		expect(report.slots.find((slot) => slot.path === relative(root, legacy))?.status).toBe('used')
	})

	it('shows a plugin only while it ships the name, and leaves out the managed tier', async () => {
		const root = repo()
		harness.allPolicyRead = false
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' } }))
		installDependency(root, 'dep-a', { name: '# dep-a\n' })
		installDependency(root, 'dep-b', { other: '# dep-b\n' })

		expect(await where('name', { root })).toBe(0)
		const report = JSON.parse(written()) as ReferenceWhereReport
		expect(report.slots.map((slot) => [slot.layer, slot.status])).toEqual([
			['project', 'empty'],
			['user', 'empty'],
			['plugin dep-a', 'used'],
		])
	})

	it('reports a name nothing holds as success, and a warning the resolution raised', async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: bogus\n---\n# doc\n')

		expect(await where('name', { root })).toBe(0)
		expect((JSON.parse(written()) as ReferenceWhereReport).warnings?.length).toBeGreaterThan(0)
	})

	it('names the choices and fails for an ambiguous name', async () => {
		const root = repo()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' } }))
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(await where('testing', { root })).toBe(1)
		expect((JSON.parse(written()) as ReferenceWhereReport).plugins).toEqual(['dep-a/testing', 'dep-b/testing'])
		expect(stderrLines().some((line) => line.includes('dep-a/testing'))).toBe(true)
	})

	it('accepts a qualified name and rejects a path', async () => {
		const root = repo()
		expect(await where('dep-a/testing', { root })).toBe(0)
		expect((JSON.parse(written()) as ReferenceWhereReport).name).toBe('testing')

		expect(await where('../name', { root })).toBe(1)
	})

	it("follows each copy's merge metadata: a merging override leaves the copy below it used", async () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## A\nproject\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0' } }))
		installDependency(root, 'dep-a', { name: '# dep-a\n' })

		expect(await where('name', { root })).toBe(0)
		const report = JSON.parse(written()) as ReferenceWhereReport
		expect(report.slots.map((slot) => [slot.layer, slot.status])).toEqual([
			['project', 'used'],
			['user', 'used'],
			['plugin dep-a', 'shadowed'],
		])
	})

	it("reports the caller's copy as Load reads it: used only when no layer holds the name", async () => {
		const root = repo()
		const caller = join(root, 'skills', 'caller')
		const own = write(caller, 'references/own.md', '# own\n')
		const legacy = write(caller, 'references/governances/old.md', '# old\n')
		write(caller, 'references/held.md', '# held\n')
		write(root, '.agents/references/held.md', '# project\n')
		const callerSlot = async (name: string) => {
			stdout.mockClear()
			expect(await where(name, { root, caller })).toBe(0)
			return (JSON.parse(written()) as ReferenceWhereReport).slots.find((slot) => slot.layer === 'caller')
		}

		expect(await callerSlot('own')).toMatchObject({ path: own, status: 'used' })
		expect(await callerSlot('old')).toMatchObject({ path: legacy, status: 'used' })
		expect(await callerSlot('held')).toMatchObject({ path: join(caller, 'references/held.md'), status: 'shadowed' })
		expect(await callerSlot('none')).toBeUndefined()
	})

	it("does not read the caller's copy of an ambiguous name", async () => {
		const root = repo()
		const caller = join(root, 'skills', 'caller')
		write(caller, 'references/testing.md', '# own\n')
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' } }))
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(await where('testing', { root, caller })).toBe(1)
		const report = JSON.parse(written()) as ReferenceWhereReport
		expect(report.slots.find((slot) => slot.layer === 'caller')?.status).toBe('not read — the name is ambiguous')
	})

	it('reports a failure it cannot read a message from, and resolves --root against the working directory', async () => {
		expect(await where('name')).toBe(0)
		stdout.mockClear()
		failure.value = 'unavailable'

		expect(await where('name')).toBe(1)
		expect(stderrLines()).toContain('error: Reference placement lookup failed.\n')
	})
})

// ── create ──

describe('create', () => {
	/** A template file outside every layer, so reading it never changes what resolves. */
	function template(content: string): string {
		return write(tempDir('reference-template-'), 'template.md', content)
	}

	function report(): ReferenceCreateReport {
		return JSON.parse(written()) as ReferenceCreateReport
	}

	it('writes a project reference from the default template, with no title and top-level sections', async () => {
		const root = repo()

		expect(await create('onboarding', { root })).toBe(0)
		const target = join(root, '.agents/references/onboarding.md')
		const content = readFileSync(target, 'utf8')
		const [, frontmatter = '', body = ''] = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content) ?? []
		expect(frontmatter).toMatch(/^description: /m)
		expect(frontmatter).toMatch(/^tags: /m)
		expect(frontmatter).not.toMatch(/^merge:/m)
		expect(body).toMatch(/^## /m)
		expect(body).not.toMatch(/^# /m)
		expect(stderrLines()).toEqual([])
	})

	it('writes the user tier file with --scope user', async () => {
		const root = repo()

		expect(await create('onboarding', { root, scope: 'user' })).toBe(0)
		expect(existsSync(join(fakeHome.value, '.agents/references/onboarding.md'))).toBe(true)
		expect(existsSync(join(root, '.agents'))).toBe(false)
	})

	it('copies a template verbatim, frontmatter included', async () => {
		const root = repo()
		const source =
			'---\ndescription: Payments terms.\ntags: [payments]\nowner: finance\n---\n\n## Terms\n\nA\n\n## Rules\n\nB\n'

		expect(await create('payments.glossary', { root, template: template(source) })).toBe(0)
		expect(readFileSync(join(root, '.agents/references/payments.glossary.md'), 'utf8')).toBe(source)
	})

	it('marks the new file merge-sections when a lower layer holds the name', async () => {
		const root = repo()
		declareDependency(root, 'ledgerkit')
		installDependency(root, 'ledgerkit', { 'ledgerkit.glossary': '## Terms\n\nplugin\n' })
		const source = '---\ndescription: Our terms.\n---\n\n## Terms\n\nours\n'

		expect(await create('ledgerkit.glossary', { root, template: template(source) })).toBe(0)
		const content = readFileSync(join(root, '.agents/references/ledgerkit.glossary.md'), 'utf8')
		expect(content).toMatch(/^merge: merge-sections$/m)
		expect(content.replace('merge: merge-sections\n', '')).toBe(source)
	})

	it('counts a farther folder of the walk as a layer below', async () => {
		const workspace = repo()
		markRoot(workspace)
		const root = join(workspace, 'packages', 'app')
		mkdirSync(root, { recursive: true })
		write(workspace, '.agents/references/release-notes.md', '## Format\n\nworkspace\n')

		expect(
			await create('release-notes', { root, template: template('---\ndescription: Notes.\n---\n## Format\n') }),
		).toBe(0)
		expect(readFileSync(join(root, '.agents/references/release-notes.md'), 'utf8')).toMatch(/^merge: merge-sections$/m)
	})

	it('puts merge-sections in a frontmatter block of its own when the template has none', async () => {
		const root = repo()
		write(fakeHome.value, '.agents/references/release-notes.md', '## Format\n\nuser\n')
		const source = '## Format\n\nproject\n'

		expect(await create('release-notes', { root, template: template(source) })).toBe(0)
		expect(readFileSync(join(root, '.agents/references/release-notes.md'), 'utf8')).toBe(
			`---\nmerge: merge-sections\n---\n\n${source}`,
		)
	})

	it('adds merge-sections to empty frontmatter, and keeps its line endings', async () => {
		const root = repo()
		write(fakeHome.value, '.agents/references/release-notes.md', '## Format\n\nuser\n')
		const source = '---\r\n\r\n---\r\n## Format\r\n'

		expect(await create('release-notes', { root, template: template(source) })).toBe(0)
		expect(readFileSync(join(root, '.agents/references/release-notes.md'), 'utf8')).toBe(
			'---\r\n\r\nmerge: merge-sections\r\n---\r\n## Format\r\n',
		)
	})

	it("keeps the template's own merge value", async () => {
		const root = repo()
		write(fakeHome.value, '.agents/references/release-notes.md', '## Format\n\nuser\n')
		const source = '---\ndescription: Notes.\nmerge: first-wins\n---\n## Format\n'

		expect(await create('release-notes', { root, template: template(source) })).toBe(0)
		expect(readFileSync(join(root, '.agents/references/release-notes.md'), 'utf8')).toBe(source)
	})

	it('warns on a heading with one hash and still writes', async () => {
		const root = repo()
		const source = '---\ndescription: Payments.\n---\n# Payments\n\n## Terms\n'

		expect(await create('payments', { root, template: template(source) })).toBe(0)
		expect(stderrLines().some((line) => line.startsWith('warning: ') && line.includes('# Payments'))).toBe(true)
		expect(existsSync(join(root, '.agents/references/payments.md'))).toBe(true)
	})

	it('does not warn on a one-hash line inside a code fence', async () => {
		const root = repo()
		const source = '---\ndescription: Shell.\n---\n## Usage\n\n```sh\n# a comment\n```\n'

		expect(await create('shell', { root, template: template(source) })).toBe(0)
		expect(stderrLines()).toEqual([])
		expect(existsSync(join(root, '.agents/references/shell.md'))).toBe(true)
	})

	it('warns on a missing description and still writes', async () => {
		const root = repo()

		expect(await create('bare', { root, template: template('## Only\n') })).toBe(0)
		expect(stderrLines().some((line) => line.startsWith('warning: ') && line.includes('description'))).toBe(true)
		expect(existsSync(join(root, '.agents/references/bare.md'))).toBe(true)
	})

	it('prints the target path and the exact content on --dry-run and writes nothing', async () => {
		const root = repo()
		write(fakeHome.value, '.agents/references/release-notes.md', '## Format\n\nuser\n')
		const path = template('---\ndescription: Notes.\n---\n## Format\n')
		const target = join(root, '.agents/references/release-notes.md')

		expect(await create('release-notes', { root, template: path, 'dry-run': true })).toBe(0)
		const [first, blank, ...rest] = written().split('\n')
		expect(first).toBe(target)
		expect(blank).toBe('')
		expect(existsSync(target)).toBe(false)
		const shown = rest.join('\n')

		stdout.mockClear()
		expect(await create('release-notes', { root, template: path })).toBe(0)
		expect(shown).toBe(readFileSync(target, 'utf8'))
		expect(shown).toContain('merge: merge-sections')
	})

	it('reports the path, content, warnings, and a trace with the new file used', async () => {
		const root = repo()
		const user = write(fakeHome.value, '.agents/references/release-notes.md', '## Format\n\nuser\n')
		const source = '---\ndescription: Notes.\n---\n# Notes\n\n## Format\n'
		const target = join(root, '.agents/references/release-notes.md')

		expect(await create('release-notes', { root, template: template(source), format: 'json' })).toBe(0)
		const created = report()
		expect(created).toMatchObject({
			name: 'release-notes',
			scope: 'project',
			path: target,
			dryRun: false,
			content: readFileSync(target, 'utf8'),
		})
		expect(created.warnings).toEqual([expect.stringContaining('# Notes')])
		expect(created.trace?.find((step) => step.path === target)).toMatchObject({ found: true, outcome: 'used' })
		expect(created.trace?.find((step) => step.path === `~${user.slice(fakeHome.value.length)}`)).toMatchObject({
			outcome: 'used',
		})
		expect(stderrLines()).toEqual([])
	})

	it('reports a dry run as JSON without a trace', async () => {
		const root = repo()

		expect(await create('onboarding', { root, 'dry-run': true, format: 'json' })).toBe(0)
		expect(report()).toMatchObject({ dryRun: true, warnings: [] })
		expect(report().trace).toBeUndefined()
	})

	it('writes the path and then the trace in text, with home collapsed', async () => {
		const root = repo()

		expect(await create('onboarding', { root, scope: 'user' })).toBe(0)
		const [first, ...rest] = written().split('\n')
		expect(first).toBe('~/.agents/references/onboarding.md')
		const traceLine = rest.find((line) => line.includes('~/.agents/references/onboarding.md'))
		expect(rest.some((line) => line.startsWith('trace'))).toBe(true)
		expect(traceLine).toContain('used')
	})

	it('refuses an existing target, naming Update, with or without --dry-run', async () => {
		const root = repo()
		const existing = write(root, '.agents/references/onboarding.md', 'mine\n')

		for (const dryRun of [false, true]) {
			stdout.mockClear()
			stderr.mockClear()
			expect(await create('onboarding', { root, 'dry-run': dryRun })).toBe(1)
			expect(stderrLines().some((line) => line.startsWith('error: ') && line.includes('Update'))).toBe(true)
			expect(stdout).not.toHaveBeenCalled()
		}
		expect(readFileSync(existing, 'utf8')).toBe('mine\n')
	})

	it('refuses a folder-form copy of the name in the target folder', async () => {
		const root = repo()
		write(root, '.agents/references/onboarding/README.md', 'mine\n')

		expect(await create('onboarding', { root })).toBe(1)
		expect(existsSync(join(root, '.agents/references/onboarding.md'))).toBe(false)
	})

	it('refuses when a copy above would shadow the new file', async () => {
		const root = repo()
		write(root, '.agents/references/onboarding.md', '## A\n')

		expect(await create('onboarding', { root, scope: 'user' })).toBe(1)
		expect(stderrLines().some((line) => line.startsWith('error: ') && line.includes('project'))).toBe(true)
		expect(existsSync(join(fakeHome.value, '.agents'))).toBe(false)
	})

	it('writes under a copy above that merges', async () => {
		const root = repo()
		write(root, '.agents/references/onboarding.md', '---\nmerge: merge-sections\n---\n## A\n')

		expect(await create('onboarding', { root, scope: 'user', format: 'json' })).toBe(0)
		const target = join(fakeHome.value, '.agents/references/onboarding.md')
		expect(existsSync(target)).toBe(true)
		expect(report().trace?.find((step) => step.path === '~/.agents/references/onboarding.md')?.outcome).toBe('used')
	})

	it('refuses a missing or unreadable template', async () => {
		const root = repo()
		const missing = join(tempDir('reference-template-'), 'nope.md')
		const folder = tempDir('reference-template-')

		for (const path of [missing, folder]) {
			stderr.mockClear()
			expect(await create('onboarding', { root, template: path })).toBe(1)
			expect(stderrLines().some((line) => line.startsWith('error: ') && line.includes(path))).toBe(true)
		}
		expect(existsSync(join(root, '.agents'))).toBe(false)
	})

	it('refuses a template whose frontmatter is not a YAML mapping', async () => {
		const root = repo()

		expect(await create('onboarding', { root, template: template('---\n- a\n- b\n---\n## A\n') })).toBe(1)
		expect(stderrLines().some((line) => line.includes('not a YAML mapping'))).toBe(true)
		expect(existsSync(join(root, '.agents'))).toBe(false)
	})

	it('refuses a create name that is a path', async () => {
		const root = repo()

		for (const name of ['../onboarding', 'onboarding.md']) {
			expect(await create(name, { root })).toBe(1)
		}
		expect(existsSync(join(root, '.agents'))).toBe(false)
	})

	it('refuses a plugin-qualified name', async () => {
		const root = repo()

		expect(await create('ledgerkit/glossary', { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('bare name'))).toBe(true)
		expect(existsSync(join(root, '.agents'))).toBe(false)
	})

	it('refuses a scope other than project or user', async () => {
		const root = repo()

		for (const scope of ['plugin', 'managed']) {
			stderr.mockClear()
			expect(await create('onboarding', { root, scope })).toBe(1)
			expect(stderrLines().some((line) => line.includes('project') && line.includes('user'))).toBe(true)
		}
		expect(existsSync(join(root, '.agents'))).toBe(false)
	})

	it('rejects an unsupported output format on create', async () => {
		const root = repo()

		expect(await create('onboarding', { root, format: 'yaml' })).toBe(1)
		expect(stdout).not.toHaveBeenCalled()
		expect(existsSync(join(root, '.agents'))).toBe(false)
	})

	it('refuses when the target folder cannot be created', async () => {
		const root = repo()
		write(root, '.agents/references', 'a file\n')

		expect(await create('onboarding', { root })).toBe(1)
		expect(stderrLines().some((line) => line.startsWith('error: '))).toBe(true)
	})

	it('reports a failure it cannot read a message from, and resolves --root against the working directory', async () => {
		expect(await create('never-created', { 'dry-run': true })).toBe(0)
		stdout.mockClear()
		failure.value = 'unavailable'

		expect(await create('never-created', { 'dry-run': true })).toBe(1)
		expect(stderrLines()).toContain('error: Reference creation failed.\n')
	})
})
