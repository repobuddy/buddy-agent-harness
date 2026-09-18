import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	countProjectGovernances,
	deprecatedManagedGovernancesDir,
	type GovernanceLayer,
	governanceLayers,
	listGovernances,
	managedGovernancesDir,
	overrideLayers,
	packageGovernancesDir,
	parseGovernanceName,
	projectGovernancesDir,
	resolveGovernance,
	userGovernancesDir,
} from './governance-overrides.ts'

/** A layer on disk, with the documents it holds written into it. */
function layer(scope: GovernanceLayer['scope'], documents: Record<string, string> = {}): GovernanceLayer {
	const dir = mkdtempSync(join(tmpdir(), `governance-${scope}-`))
	for (const [name, content] of Object.entries(documents)) writeFileSync(join(dir, `${name}.md`), content)
	return { scope, dir }
}

describe('the machine-wide directories', () => {
	it('names a machine-wide directory this package owns, per platform', () => {
		expect(managedGovernancesDir('linux')).toBe('/etc/buddy-agent-harness/governances')
		expect(managedGovernancesDir('darwin')).toBe('/Library/Application Support/BuddyAgentHarness/governances')
		expect(managedGovernancesDir('win32', 'D:\\ProgramData')).toBe(
			join('D:\\ProgramData', 'BuddyAgentHarness', 'governances'),
		)
	})

	// Pinned so a machine already carrying one keeps working: these are the paths `universal-plugin`
	// wrote, and they are still read, below the layer above.
	it('still names the directory universal-plugin wrote, per platform', () => {
		expect(deprecatedManagedGovernancesDir('linux')).toBe('/etc/universal-plugin/governances')
		expect(deprecatedManagedGovernancesDir('darwin')).toBe('/Library/Application Support/UniPlugin/governances')
		expect(deprecatedManagedGovernancesDir('win32', 'D:\\ProgramData')).toBe(
			join('D:\\ProgramData', 'UniPlugin', 'governances'),
		)
	})

	it('falls back to the default program data directory when Windows does not name one', () => {
		expect(managedGovernancesDir('win32', undefined)).toBe(join('C:\\ProgramData', 'BuddyAgentHarness', 'governances'))
		expect(managedGovernancesDir('win32', '')).toBe(join('C:\\ProgramData', 'BuddyAgentHarness', 'governances'))
		expect(deprecatedManagedGovernancesDir('win32', undefined)).toBe(
			join('C:\\ProgramData', 'UniPlugin', 'governances'),
		)
		expect(deprecatedManagedGovernancesDir('win32', '')).toBe(join('C:\\ProgramData', 'UniPlugin', 'governances'))
	})
})

describe('the layer directories', () => {
	it('puts the project layer in the canonical .agents tree and the user layer under the home directory', () => {
		expect(projectGovernancesDir(join(sep, 'repo'))).toBe(join(sep, 'repo', '.agents', 'governances'))
		expect(userGovernancesDir(join(sep, 'home', 'dev'))).toBe(join(sep, 'home', 'dev', '.agents', 'governances'))
	})

	it('finds the package layer beside the nearest manifest, from src and from a bundle alike', () => {
		expect(packageGovernancesDir()).toBe(join(process.cwd(), 'governances'))
		expect(
			packageGovernancesDir(join(process.cwd(), 'skills', 'doctor-buddy-agent-harness', 'scripts', 'doctor.mjs')),
		).toBe(join(process.cwd(), 'governances'))
	})

	it('ships nothing from a tree with no manifest above it at all', () => {
		expect(packageGovernancesDir(sep)).toBe(join(sep, 'governances'))
	})
})

describe('governanceLayers', () => {
	const options = { root: join(sep, 'repo'), home: join(sep, 'home', 'dev'), platform: 'linux' as const }

	it('searches the directory this package owns before the one universal-plugin wrote', () => {
		expect(governanceLayers(options).map((entry) => entry.scope)).toEqual([
			'project',
			'user',
			'managed',
			'managed-deprecated',
			'package',
		])
		expect(governanceLayers(options).map((entry) => entry.dir)).toEqual([
			join(sep, 'repo', '.agents', 'governances'),
			join(sep, 'home', 'dev', '.agents', 'governances'),
			'/etc/buddy-agent-harness/governances',
			'/etc/universal-plugin/governances',
			packageGovernancesDir(),
		])
	})

	// The whole promise of `--overrides-only`: the package's own copy is not in the set, so an answer
	// can only be one somebody set.
	it('drops the package layer from the override set, leaving the ones someone can write to', () => {
		expect(overrideLayers(governanceLayers(options)).map((entry) => entry.scope)).toEqual([
			'project',
			'user',
			'managed',
			'managed-deprecated',
		])
	})
})

describe('parseGovernanceName', () => {
	it('accepts a file stem', () => {
		expect(parseGovernanceName('agent-tool-output')).toBe('agent-tool-output')
		expect(parseGovernanceName('skill.design')).toBe('skill.design')
		expect(parseGovernanceName('cli2')).toBe('cli2')
	})

	// Rejected rather than sanitized: a name built from somebody else's input must not be able to
	// reach a file outside the layer, and a caller that meant a path asked the wrong question.
	it('rejects anything that is a path rather than a name', () => {
		for (const value of ['../etc/passwd', 'a/b', `${sep}etc${sep}passwd`, '..', '', 'has space']) {
			expect(() => parseGovernanceName(value)).toThrow('is not a governance name')
		}
	})

	// It would otherwise pass the pattern and send the lookup after `<name>.md.md`.
	it('rejects a file name, naming the extension it does not want', () => {
		expect(() => parseGovernanceName('skill-design.md')).toThrow('without the .md extension')
	})
})

describe('resolveGovernance', () => {
	it('stops at the first layer that holds the name', () => {
		const layers = [layer('project', { shared: 'project copy' }), layer('user', { shared: 'user copy' })]

		const found = resolveGovernance('shared', layers)

		expect(found).toMatchObject({ name: 'shared', scope: 'project', content: 'project copy' })
		expect(found?.path).toBe(join(layers[0]?.dir as string, 'shared.md'))
	})

	it('falls through to a later layer', () => {
		const layers = [layer('project'), layer('user', { only: 'user copy' })]

		expect(resolveGovernance('only', layers)).toMatchObject({ scope: 'user', content: 'user copy' })
	})

	// The whole point of reading both machine-wide directories: a machine that never moved its
	// documents keeps resolving them, one layer further down.
	it('reads the deprecated machine-wide layer when the one above it is empty', () => {
		const layers = [layer('managed'), layer('managed-deprecated', { 'agent-tool-output': 'the old location' })]

		expect(resolveGovernance('agent-tool-output', layers)).toMatchObject({
			scope: 'managed-deprecated',
			content: 'the old location',
		})
	})

	it('prefers the layer this package owns over the deprecated one', () => {
		const layers = [
			layer('managed', { 'agent-tool-output': 'the new location' }),
			layer('managed-deprecated', { 'agent-tool-output': 'the old location' }),
		]

		expect(resolveGovernance('agent-tool-output', layers)).toMatchObject({
			scope: 'managed',
			content: 'the new location',
		})
	})

	it('answers with nothing when no layer holds it', () => {
		expect(resolveGovernance('missing', [layer('project'), layer('user')])).toBeUndefined()
	})

	// One unreadable entry is not the end of the search: the next layer is still asked.
	it('passes over an entry it cannot read and asks the next layer', () => {
		const project = layer('project')
		mkdirSync(join(project.dir, 'shadowed.md'))

		expect(resolveGovernance('shadowed', [project, layer('user', { shadowed: 'user copy' })])).toMatchObject({
			scope: 'user',
			content: 'user copy',
		})
	})
})

describe('listGovernances', () => {
	it('reports each governance at the layer that would win', () => {
		const entries = listGovernances([
			layer('project', { shared: 'project copy' }),
			layer('user', { shared: 'user copy' }),
		])

		expect(entries.map(({ name, scope }) => ({ name, scope }))).toEqual([{ name: 'shared', scope: 'project' }])
	})

	// Sorted by name rather than by layer: a reader scanning for a name should not have to know which
	// layer it came from first.
	it('sorts the names rather than reporting them in layer order', () => {
		const entries = listGovernances([layer('project', { zzz: '' }), layer('user', { aaa: '' })])

		expect(entries.map((entry) => entry.name)).toEqual(['aaa', 'zzz'])
	})

	it('counts only Markdown files as governances', () => {
		const project = layer('project', { real: 'yes' })
		writeFileSync(join(project.dir, 'notes.txt'), 'no')
		mkdirSync(join(project.dir, 'nested.md'))

		expect(listGovernances([project]).map((entry) => entry.name)).toEqual(['real'])
	})

	// A missing managed directory is the ordinary case, and an unreadable one must not end the run.
	it('treats a layer it cannot read as empty', () => {
		const project = layer('project')
		const file = join(project.dir, 'not-a-directory')
		writeFileSync(file, '')

		expect(listGovernances([{ scope: 'managed', dir: join(project.dir, 'absent') }])).toEqual([])
		expect(listGovernances([{ scope: 'managed', dir: file }])).toEqual([])
	})
})

describe('countProjectGovernances', () => {
	it('creates the project layer when it is absent, so there is one place to put an override', () => {
		const root = mkdtempSync(join(tmpdir(), 'governance-root-'))

		expect(countProjectGovernances(root)).toBe(0)
		expect(existsSync(projectGovernancesDir(root))).toBe(true)
	})

	it('counts the documents an existing layer holds', () => {
		const root = mkdtempSync(join(tmpdir(), 'governance-root-'))
		mkdirSync(projectGovernancesDir(root), { recursive: true })
		writeFileSync(join(projectGovernancesDir(root), 'agent-tool-output.md'), '# Rules')

		expect(countProjectGovernances(root)).toBe(1)
	})
})
