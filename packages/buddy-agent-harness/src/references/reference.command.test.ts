import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deprecatedManagedGovernancesDir, managedGovernancesDir } from '../governance-overrides/governance-overrides.ts'
import {
	type ReferenceListReport,
	type ReferenceSearchReport,
	type ReferenceShowEntry,
	referenceListCommand,
	referenceSearchCommand,
	referenceShowCommand,
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

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

type ShowArgs = { root?: string; format?: string; trace?: boolean }
type ListArgs = { root?: string; format?: string }
type SearchArgs = { root?: string; format?: string }

function show(names: string[], args: ShowArgs = {}): number {
	return (referenceShowCommand as unknown as { run(value: ShowArgs & { names: string[] }): number }).run({
		format: 'text',
		names,
		...args,
	})
}

function list(args: ListArgs = {}): number {
	return (referenceListCommand as unknown as { run(value: ListArgs): number }).run({ format: 'json', ...args })
}

function search(query: string, args: SearchArgs = {}): number {
	return (referenceSearchCommand as unknown as { run(value: SearchArgs & { query: string }): number }).run({
		format: 'json',
		query,
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

/** Marks a directory as the repository root the monorepo walk stops at. */
function markRoot(dir: string): void {
	writeFileSync(join(dir, 'pnpm-workspace.yaml'), '')
}

/** A fresh repository root, marked, with its own project reference layer ready to receive files. */
function repo(): string {
	const root = tempDir('reference-repo-')
	markRoot(root)
	return root
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

function withPlatform(platform: NodeJS.Platform, programData: string, run: () => void): void {
	const originalPlatform = process.platform
	const originalProgramData = process.env['ProgramData']
	Object.defineProperty(process, 'platform', { value: platform, configurable: true })
	process.env['ProgramData'] = programData
	try {
		run()
	} finally {
		Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
		if (originalProgramData === undefined) delete process.env['ProgramData']
		else process.env['ProgramData'] = originalProgramData
	}
}

beforeEach(() => {
	fakeHome.value = tempDir('reference-home-')
	failure.value = undefined
	stdout.mockClear()
	stderr.mockClear()
	process.exitCode = undefined
})

afterEach(() => {
	process.exitCode = undefined
})

// ── tiers ──

describe('tiers', () => {
	it('resolves managed over local over project over user over plugin', () => {
		const programData = tempDir('reference-programdata-')
		withPlatform('win32', programData, () => {
			const root = repo()
			declareDependency(root, 'dep-a')
			installDependency(root, 'dep-a', { name: 'plugin\n' })
			write(root, '.agents/references.local/name.md', 'local\n')
			write(root, '.agents/references/name.md', 'project\n')
			write(fakeHome.value, '.agents/references/name.md', 'user\n')
			const managedPath = write(managedReferencesDir('win32', programData), 'name.md', 'managed\n')

			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('managed\n')

			rmSync(managedPath)
			stdout.mockClear()
			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('local\n')

			rmSync(join(root, '.agents/references.local/name.md'))
			stdout.mockClear()
			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('project\n')

			rmSync(join(root, '.agents/references/name.md'))
			stdout.mockClear()
			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('user\n')

			rmSync(join(fakeHome.value, '.agents/references/name.md'))
			stdout.mockClear()
			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('plugin\n')
		})
	})

	it('falls through to the highest tier that holds the name', () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { name: 'plugin\n' })
		write(fakeHome.value, '.agents/references/name.md', 'user\n')

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toBe('user\n')
	})

	it('orders the managed layers references, then governances, then the deprecated one', () => {
		const programData = tempDir('reference-programdata-')
		withPlatform('win32', programData, () => {
			const root = repo()
			const referencesPath = write(managedReferencesDir('win32', programData), 'name.md', 'references-tier\n')
			const governancesPath = write(managedGovernancesDir('win32', programData), 'name.md', 'governances-tier\n')
			write(deprecatedManagedGovernancesDir('win32', programData), 'name.md', 'deprecated-tier\n')

			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('references-tier\n')

			rmSync(referencesPath)
			stdout.mockClear()
			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('governances-tier\n')

			rmSync(governancesPath)
			stdout.mockClear()
			expect(show(['name'], { root })).toBe(0)
			expect(written()).toBe('deprecated-tier\n')
		})
	})

	it('passes over a layer that is not a folder and asks the next', () => {
		const root = repo()
		mkdirSync(join(root, '.agents'), { recursive: true })
		writeFileSync(join(root, '.agents', 'references'), 'not a directory')
		write(fakeHome.value, '.agents/references/name.md', 'user\n')

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toBe('user\n')
	})

	it('reads the project tier at the root alone when no repository root is above it', () => {
		const base = tempDir('reference-base-')
		const root = join(base, 'level')
		mkdirSync(root, { recursive: true })
		write(base, '.agents/references/ancestor-doc.md', 'ancestor\n')

		expect(list({ root, format: 'json' })).toBe(0)

		const report = JSON.parse(written()) as ReferenceListReport
		const projectLayers = report.layers.filter((layer) => layer.tier === 'project')
		expect(projectLayers).toHaveLength(2)
		for (const layer of projectLayers) expect(layer.path.startsWith(root)).toBe(true)
		expect(JSON.stringify(report.references)).not.toContain('ancestor-doc')
	})

	it('walks from the root up to the repository root, nearest level first', () => {
		const root = repo()
		write(root, '.agents/references/name.md', 'workspace\n')
		const packageDir = join(root, 'packages', 'pkg-a')
		write(packageDir, '.agents/references/name.md', 'package\n')

		expect(show(['name'], { root: packageDir })).toBe(0)
		expect(written()).toBe('package\n')

		stdout.mockClear()
		expect(show(['name'], { root: packageDir, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		const shadowed = entry?.trace?.find((step) => step.path === join(root, '.agents', 'references', 'name.md'))
		expect(shadowed?.outcome).toBe('shadowed by project (first-wins)')
	})

	it('stops the walk at the repository root', () => {
		const base = tempDir('reference-base-')
		write(base, '.agents/references/ancestor-only.md', 'ancestor\n')
		const root = join(base, 'repo')
		mkdirSync(root, { recursive: true })
		markRoot(root)

		expect(list({ root, format: 'json' })).toBe(0)

		const report = JSON.parse(written()) as ReferenceListReport
		expect(JSON.stringify(report.references)).not.toContain('ancestor-only')
	})

	it('reads local overrides at every level of the walk', () => {
		const root = repo()
		write(root, '.agents/references.local/name.md', 'local\n')
		const packageDir = join(root, 'packages', 'pkg-a')
		write(packageDir, '.agents/references/name.md', 'project\n')

		expect(show(['name'], { root: packageDir })).toBe(0)
		expect(written()).toBe('local\n')
	})

	it("reads a declared dependency's references as a plugin", () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { testing: '# Testing\n' })

		expect(show(['testing'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('found')
		expect(entry?.tier).toBe('plugin')
		expect(entry?.plugin).toBe('dep-a')
		expect(entry?.content).toBe('# Testing\n')
	})

	it('never reads a package the repository did not declare', () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(JSON.stringify(report.references)).not.toContain('dep-b')
	})

	it('reports a name two plugins hold as ambiguous, naming both', () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' } }))
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(show(['testing'], { root, format: 'json' })).toBe(1)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('ambiguous')
		expect(entry?.plugins).toEqual(['dep-a/testing', 'dep-b/testing'])
	})

	it('resolves a qualified name at that plugin, with the tiers above still overriding it', () => {
		const root = repo()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0', 'dep-b': '1.0.0' } }))
		installDependency(root, 'dep-a', { testing: '# dep-a\n' })
		installDependency(root, 'dep-b', { testing: '# dep-b\n' })

		expect(show(['dep-a/testing'], { root })).toBe(0)
		expect(written()).toBe('# dep-a\n')

		write(root, '.agents/references/testing.md', '# project\n')
		stdout.mockClear()
		expect(show(['dep-a/testing'], { root })).toBe(0)
		expect(written()).toBe('# project\n')
	})

	it('answers a qualified name from the tiers above when the plugin is not a dependency', () => {
		const root = repo()
		write(root, '.agents/references/testing.md', '# project\n')

		expect(show(['other/testing'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('found')
		expect(entry?.content).toBe('# project\n')
		const pluginStep = entry?.trace?.find((step) => step.plugin === 'other')
		expect(pluginStep?.found).toBe(false)
	})
})

// ── file names ──

describe('file names', () => {
	it('resolves each file-name candidate', () => {
		const forms: [string, string][] = [
			['name.md', 'name.md'],
			['name/README.md', 'name/README.md'],
			['name/index.md', 'name/index.md'],
			['name/SKILL.md', 'name/SKILL.md'],
		]
		for (const [relPath, candidate] of forms) {
			const root = repo()
			write(root, join('.agents', 'references', relPath), '# doc\n')

			expect(show(['name'], { root, format: 'json', trace: true })).toBe(0)
			const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
			expect(entry?.content).toBe('# doc\n')
			const step = entry?.trace?.find((s) => s.found)
			expect(step?.candidate).toBe(candidate)
			stdout.mockClear()
		}
	})

	it('prefers the earlier candidate in one layer and warns', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# top level\n')
		write(root, '.agents/references/name/README.md', '# folder form\n')

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toBe('# top level\n')
		expect(stderrLines().some((line) => line.includes('is ignored'))).toBe(true)

		stdout.mockClear()
		stderr.mockClear()
		expect(list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.warnings?.some((warning) => warning.includes('is ignored'))).toBe(true)
	})
})

// ── merge modes ──

describe('merge modes', () => {
	it('returns the highest document whole and shadows the rest', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(show(['name'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.content).toBe('# project\n')
		const userStep = entry?.trace?.find((step) => step.tier === 'user' && step.found)
		expect(userStep?.outcome).toBe('shadowed by project (first-wins)')
	})

	it('returns every layer whole, labeled, highest first', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: combine\n---\n# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('Combined from 2 layers, highest precedence first')
		const projectIndex = content.indexOf('# project')
		const userIndex = content.indexOf('# user')
		expect(projectIndex).toBeGreaterThan(-1)
		expect(userIndex).toBeGreaterThan(projectIndex)
		expect(content).toMatch(/<!-- layer: project .*-->/)
		expect(content).toMatch(/<!-- layer: user .*-->/)
	})

	it('replaces a matched section and its subsections', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nproject body\n')
		write(
			fakeHome.value,
			'.agents/references/name.md',
			'## Testing\n\nuser body\n\n### Fixtures\n\nuser fixture\n\n## Other\n\nkept\n',
		)

		expect(show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('project body')
		expect(content).not.toContain('user body')
		expect(content).not.toContain('Fixtures')
		expect(content).toContain('## Other')
	})

	it('keeps both bodies and merges subsections when a section says combine', () => {
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

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toBe(
			'## Testing\n\nuser body\n\nproject body\n\n### Fixtures\n\nproject fixtures\n\n### Coverage\n\nuser coverage\n',
		)
	})

	it('drops a section marked remove', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Legacy\n<!-- merge: remove -->\n')
		write(fakeHome.value, '.agents/references/name.md', '## Legacy\n\nold content\n\n## Keep\n\nstays\n')

		expect(show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).not.toContain('## Legacy')
		expect(content).toContain('## Keep')
	})

	it('appends a new section after its last sibling, keeping base order', () => {
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

		expect(show(['name'], { root })).toBe(0)
		const content = written()
		const existingIndex = content.indexOf('### Existing')
		const newIndex = content.indexOf('### New')
		const laterIndex = content.indexOf('## Later')
		expect(existingIndex).toBeGreaterThan(-1)
		expect(newIndex).toBeGreaterThan(existingIndex)
		expect(laterIndex).toBeGreaterThan(newIndex)
	})

	it('ignores headings inside code fences', () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\n## Testing\n\n```\n## not a heading\n```\n\nproject body\n',
		)
		write(fakeHome.value, '.agents/references/name.md', '## Testing\n\nbase body\n\n## Not a heading\n\nbase kept\n')

		expect(show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('```\n## not a heading\n```\n\nproject body')
		expect(content).toContain('## Not a heading\n\nbase kept')
		expect(content).not.toContain('base body')
	})

	it('matches headings regardless of case and surrounding whitespace', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n##   testing  \n\noverlay body\n')
		write(fakeHome.value, '.agents/references/name.md', '## Testing\n\nbase body\n')

		expect(show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('overlay body')
		expect(content).not.toContain('base body')
	})

	it('treats text before the first heading as its own section', () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\noverlay preamble\n\n## Testing\n\nbody\n',
		)
		write(fakeHome.value, '.agents/references/name.md', 'base preamble\n\n## Testing\n\nbase body\n')

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toContain('overlay preamble')
		expect(written()).not.toContain('base preamble')

		stdout.mockClear()
		const root2 = repo()
		write(root2, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nbody\n')
		write(fakeHome.value, '.agents/references/name.md', 'base preamble\n\n## Testing\n\nbase body\n')

		expect(show(['name'], { root: root2 })).toBe(0)
		expect(written()).toContain('base preamble')
	})

	it('warns when a merge comment matches nothing or a heading path repeats', () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\nmerge: merge-sections\n---\n## Testing\n\noverlay body\n\n## Missing\n<!-- merge: remove -->\n',
		)
		write(fakeHome.value, '.agents/references/name.md', '## Testing\n\nfirst\n\n## Testing\n\nsecond\n')

		expect(show(['name'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		const warnings = (entry?.warnings ?? []).join(' ')
		expect(warnings).toContain('matches no section below')
		expect(warnings).toContain('appears more than once')
		expect(entry?.content).toBe('## Testing\n\noverlay body\n\n## Testing\n\nsecond\n')
	})

	it('applies layers bottom-up', () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { name: '## Testing\n\nplugin body\n' })
		write(fakeHome.value, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nuser body\n')
		write(root, '.agents/references/name.md', '---\nmerge: merge-sections\n---\n## Testing\n\nproject body\n')

		expect(show(['name'], { root })).toBe(0)
		const content = written()
		expect(content).toContain('project body')
		expect(content).not.toContain('plugin body')
		expect(content).not.toContain('user body')
	})

	it('blocks local overrides when a project reference is final', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nfinal: true\n---\n# project\n')
		write(root, '.agents/references.local/name.md', '# local\n')

		expect(show(['name'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.content).toBe('# project\n')
		const localStep = entry?.trace?.find((step) => step.tier === 'local' && step.found)
		expect(localStep?.outcome).toBe('blocked by final in project')
	})

	it('ignores final outside the project tier, with a warning', () => {
		const root = repo()
		declareDependency(root, 'dep-a')
		installDependency(root, 'dep-a', { name: '---\nfinal: true\n---\n# plugin\n' })
		write(root, '.agents/references/name.md', '# project\n')

		expect(show(['name'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.content).toBe('# project\n')
		expect((entry?.warnings ?? []).some((warning) => warning.includes('final is only honored in project'))).toBe(true)
	})

	it('adds a trailing newline when the document has none', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project')

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toBe('# project\n')
	})

	it('adds no second newline when the document has one', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toBe('# project\n')
	})

	it('strips frontmatter and merge comments from text output and returns frontmatter as metadata', () => {
		const root = repo()
		write(
			root,
			'.agents/references/name.md',
			'---\ndescription: about testing\n---\n## Testing\n<!-- merge: replace -->\n\nbody\n',
		)

		expect(show(['name'], { root })).toBe(0)
		const text = written()
		expect(text).not.toContain('description: about testing')
		expect(text).not.toContain('merge: replace')

		stdout.mockClear()
		expect(show(['name'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.metadata).toEqual({ description: 'about testing' })
	})

	it('treats an unknown merge mode as first-wins, with a warning', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nmerge: overlay\n---\n# project\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(show(['name'], { root, format: 'json' })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.content).toBe('# project\n')
		expect((entry?.warnings ?? []).some((warning) => warning.includes('unknown merge mode'))).toBe(true)
	})
})

// ── show output ──

describe('show output', () => {
	it('writes a single document and nothing else', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')

		expect(show(['name'], { root })).toBe(0)
		expect(written()).toBe('# doc\n')
	})

	it('writes several documents between delimiters in the order asked', () => {
		const root = repo()
		write(root, '.agents/references/a.md', '# a\n')
		write(root, '.agents/references/b.md', '# b\n')
		write(root, '.agents/references/c.md', '# c\n')

		expect(show(['c', 'a', 'b'], { root })).toBe(0)
		const content = written()
		expect(content.indexOf('name="c"')).toBeLessThan(content.indexOf('name="a"'))
		expect(content.indexOf('name="a"')).toBeLessThan(content.indexOf('name="b"'))
	})

	it('reports a missing name in place and exits non-zero', () => {
		const root = repo()
		write(root, '.agents/references/a.md', '# a\n')
		write(root, '.agents/references/b.md', '# b\n')

		expect(show(['a', 'missing', 'b'], { root })).toBe(1)
		const content = written()
		expect(content).toContain('name="a"')
		expect(content).toContain('name="b"')
		expect(content).toContain('name="missing" status="missing"')
		expect(content.indexOf('name="a"')).toBeLessThan(content.indexOf('name="missing"'))
		expect(content.indexOf('name="missing"')).toBeLessThan(content.indexOf('name="b"'))
		expect(stderrLines().some((line) => line.includes('no reference named "missing"'))).toBe(true)
	})

	it('returns an array in the order asked', () => {
		const root = repo()
		write(root, '.agents/references/a.md', '# a\n')

		expect(show(['a', 'missing'], { root, format: 'json' })).toBe(1)
		const entries = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entries.map((entry) => entry.status)).toEqual(['found', 'missing'])
	})

	it('suggests close names on a miss and never answers with one', () => {
		const root = repo()
		write(root, '.agents/references/testing.md', '# testing\n')

		expect(show(['testin'], { root, format: 'json' })).toBe(1)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.status).toBe('missing')
		expect(entry?.content).toBeUndefined()
		expect(entry?.suggestions).toContain('testing')
	})

	it('traces every path checked, the candidate, the merge mode, and why a layer was dropped', () => {
		const root = repo()
		write(root, '.agents/references.local/name.md', '# local\n')
		write(root, '.agents/references/name.md', '# project\n')

		expect(show(['name'], { root, format: 'json', trace: true })).toBe(0)
		const [entry] = JSON.parse(written()) as ReferenceShowEntry[]
		expect(entry?.trace?.length).toBeGreaterThan(1)
		const projectStep = entry?.trace?.find((step) => step.tier === 'project' && step.found)
		expect(projectStep?.outcome).toBe('shadowed by local (first-wins)')
		const localStep = entry?.trace?.find((step) => step.tier === 'local' && step.found)
		expect(localStep?.candidate).toBe('name.md')
		expect(localStep?.merge).toBe('first-wins')
		const emptyStep = entry?.trace?.find((step) => !step.found)
		expect(emptyStep).toBeDefined()
	})

	it('writes the trace to stderr in text so stdout stays the document', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')

		expect(show(['name'], { root, trace: true })).toBe(0)
		expect(written()).toBe('# doc\n')
		expect(stderrLines().some((line) => line.includes('trace name'))).toBe(true)
	})

	it('rejects a name that is a path', () => {
		const root = repo()

		expect(show(['../escape'], { root })).toBe(1)
		expect(stdout).not.toHaveBeenCalled()
		expect(stderrLines().some((line) => line.includes('is not a reference name'))).toBe(true)

		stderr.mockClear()
		expect(show(['a\\b'], { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('is not a reference name'))).toBe(true)

		stderr.mockClear()
		expect(show(['name.md'], { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('names a file'))).toBe(true)
	})

	it('rejects an unsupported output format', () => {
		const root = repo()

		expect(show(['name'], { root, format: 'yaml' })).toBe(1)
		expect(stderrLines()).toContain('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()

		stderr.mockClear()
		expect(list({ root, format: 'yaml' })).toBe(1)
		expect(stderrLines()).toContain('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()

		stderr.mockClear()
		expect(search('anything', { root, format: 'yaml' })).toBe(1)
		expect(stderrLines()).toContain('error: --format must be toon, json, or text.\n')
		expect(stdout).not.toHaveBeenCalled()
	})
})

// ── list ──

describe('list', () => {
	it('lists every layer in precedence order, with the legacy layers marked', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# project\n')

		expect(list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		const tiers = report.layers.map((layer) => layer.tier)
		const firstUser = tiers.indexOf('user')
		const firstPlugin = tiers.indexOf('plugin')
		expect(tiers[0]).toBe('managed')
		expect(tiers.indexOf('local')).toBeGreaterThan(tiers.lastIndexOf('managed'))
		expect(tiers.indexOf('project')).toBeGreaterThan(tiers.lastIndexOf('local'))
		expect(firstUser).toBeGreaterThan(tiers.lastIndexOf('project'))
		expect(firstPlugin).toBeGreaterThan(tiers.lastIndexOf('user'))

		const legacyStatuses = report.layers.filter((layer) => layer.status !== '').map((layer) => layer.status)
		expect(legacyStatuses.some((status) => status.includes('legacy'))).toBe(true)
		expect(legacyStatuses.some((status) => status.includes('deprecated'))).toBe(true)
	})

	it('marks shadowed and blocked layers in the listing', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '---\nfinal: true\n---\n# project\n')
		write(root, '.agents/references.local/name.md', '# local\n')
		write(fakeHome.value, '.agents/references/name.md', '# user\n')

		expect(list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		const rows = report.references as { tier: string; status: string }[]
		expect(rows.find((row) => row.tier === 'project')?.status).toBe('used')
		expect(rows.find((row) => row.tier === 'local')?.status).toBe('blocked by final in project')
		expect(rows.find((row) => row.tier === 'user')?.status).toBe('shadowed by project (first-wins)')
	})

	it('states the zero when no layer holds a reference', () => {
		const root = repo()

		expect(list({ root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.references).toBe('0 references — no layer holds one')
	})
})

// ── search ──

describe('search', () => {
	it('ranks exact name, prefix, close name, description, heading, then body', () => {
		const root = repo()
		write(root, '.agents/references/test.md', '# exact\n')
		write(root, '.agents/references/testing.md', '# prefix\n')
		write(root, '.agents/references/best.md', '# close name\n')
		write(root, '.agents/references/alpha.md', '---\ndescription: covers test coverage\n---\n# alpha\n')
		write(root, '.agents/references/beta.md', '# Testing checklist\n\nnothing else relevant here\n')
		write(root, '.agents/references/gamma.md', '# gamma\n\nthis paragraph mentions a test in passing\n')

		expect(search('test', { root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceSearchReport
		const matches = report.references as { name: string; match: string }[]
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

	it('states the zero when nothing matches', () => {
		const root = repo()
		write(root, '.agents/references/testing.md', '# testing\n\nabout testing\n')

		expect(search('unrelated-topic', { root, format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceSearchReport
		expect(report.references).toBe('0 references match "unrelated-topic"')
	})
})

// ── legacy ──

describe('legacy', () => {
	it('reads legacy governances folders below references in the same tier', () => {
		const alone = repo()
		write(alone, '.agents/governances/testing.md', '# governances alone\n')

		expect(show(['testing'], { root: alone })).toBe(0)
		expect(written()).toBe('# governances alone\n')

		stdout.mockClear()
		const both = repo()
		write(both, '.agents/references/testing.md', '# references wins\n')
		write(both, '.agents/governances/testing.md', '# governances loses\n')

		expect(show(['testing'], { root: both })).toBe(0)
		expect(written()).toBe('# references wins\n')
	})
})

// Not scenarios of their own: branches the feature's scenarios don't reach, needed for full
// statement/branch coverage of reference.command.ts.
describe('coverage: edge cases outside the feature', () => {
	it('resolves --root against the working directory when none is named', () => {
		expect(list({ format: 'json' })).toBe(0)
		const report = JSON.parse(written()) as ReferenceListReport
		expect(report.layers.length).toBeGreaterThan(0)
	})

	it('writes nothing to stdout for a single name that resolves to nothing', () => {
		const root = repo()

		expect(show(['missing'], { root })).toBe(1)
		expect(stdout).not.toHaveBeenCalled()
	})

	it('rejects an empty name list', () => {
		const root = repo()

		expect(show([], { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('Name at least one reference'))).toBe(true)
	})

	it('rejects a blank search query', () => {
		const root = repo()

		expect(search('   ', { root })).toBe(1)
		expect(stderrLines().some((line) => line.includes('Search needs a query'))).toBe(true)
	})

	it('reports a show failure it cannot read a message from', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')
		failure.value = 'unavailable'

		expect(show(['name'], { root })).toBe(1)
		expect(stderrLines()).toContain('error: Reference lookup failed.\n')
	})

	it('reports a list failure it cannot read a message from', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')
		failure.value = 'unavailable'

		expect(list({ root })).toBe(1)
		expect(stderrLines()).toContain('error: Reference listing failed.\n')
	})

	it('reports a search failure it cannot read a message from', () => {
		const root = repo()
		write(root, '.agents/references/name.md', '# doc\n')
		failure.value = 'unavailable'

		expect(search('name', { root })).toBe(1)
		expect(stderrLines()).toContain('error: Reference search failed.\n')
	})
})
