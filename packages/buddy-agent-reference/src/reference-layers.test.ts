import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	deprecatedManagedGovernancesDir,
	managedGovernancesDir,
	managedReferencesDir,
	referenceLayers,
} from './reference-layers.ts'

function tempDir(prefix = 'reference-layers-'): string {
	return mkdtempSync(join(tmpdir(), prefix))
}

function write(root: string, relPath: string, content: string): string {
	const path = join(root, relPath)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, content)
	return path
}

describe('referenceLayers', () => {
	it('never treats a dependency without a `references/` folder as a plugin', async () => {
		const root = tempDir()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-c': '1.0.0' } }))
		write(root, 'node_modules/dep-c/package.json', JSON.stringify({ name: 'dep-c', version: '1.0.0' }))

		const layers = await referenceLayers({ root, home: tempDir(), platform: 'linux' })
		expect(layers.some((layer) => layer.plugins.includes('dep-c'))).toBe(false)
	})

	it("skips a dependency that resolves to the package's own root", async () => {
		const root = tempDir()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0' } }))
		write(root, 'node_modules/dep-a/package.json', JSON.stringify({ name: 'dep-a', version: '1.0.0' }))
		write(root, 'node_modules/dep-a/references/testing.md', '# dep-a\n')

		const layers = await referenceLayers({
			root,
			home: tempDir(),
			platform: 'linux',
			plugin: { name: 'host', root: join(root, 'node_modules', 'dep-a') },
		})
		expect(layers.some((layer) => layer.plugins.includes('dep-a'))).toBe(false)
	})

	it('tolerates a plugin root that does not exist on disk', async () => {
		const root = tempDir()
		const packageRoot = join(root, 'does-not-exist')

		const layers = await referenceLayers({
			root,
			home: tempDir(),
			platform: 'linux',
			plugin: { name: 'host', root: packageRoot },
		})

		expect(layers.find((layer) => layer.dir === join(packageRoot, 'references'))?.plugins).toEqual(['host'])
	})

	it('reads no plugin layer of its own when no plugin runs the resolver', async () => {
		const layers = await referenceLayers({ root: tempDir(), home: tempDir(), platform: 'linux', env: {} })

		expect(layers.filter(({ tier }) => tier === 'plugin')).toEqual([])
	})

	it('names a plugin by both its package name and its plugin.json name, when they differ', async () => {
		const root = tempDir()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0' } }))
		write(root, 'node_modules/dep-a/package.json', JSON.stringify({ name: 'dep-a', version: '1.0.0' }))
		write(root, 'node_modules/dep-a/plugin.json', JSON.stringify({ name: 'other-name' }))
		write(root, 'node_modules/dep-a/references/testing.md', '# dep-a\n')

		const layers = await referenceLayers({ root, home: tempDir(), platform: 'linux' })
		const layer = layers.find((candidate) => candidate.plugins.includes('dep-a'))
		expect(layer?.plugins).toEqual(['dep-a', 'other-name'])
	})

	it("ranks a harness folder below this package's own references and above its governances", async () => {
		const layers = await referenceLayers({
			root: tempDir(),
			home: tempDir(),
			platform: 'linux',
			env: { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 'session' },
		})
		const managed = layers.filter(({ tier, skipped }) => tier === 'managed' && !skipped).map(({ dir }) => dir)
		expect(managed).toEqual([
			'/etc/buddy-agent-harness/references',
			'/etc/claude-code/references',
			'/etc/buddy-agent-harness/governances',
			'/etc/universal-plugin/governances',
		])
	})

	it('drops an enabled plugin whose folder is the plugin running the resolver', async () => {
		const home = tempDir()
		const packageRoot = tempDir()
		write(packageRoot, 'references/testing.md', '# own\n')
		write(home, '.claude/settings.json', JSON.stringify({ enabledPlugins: { 'buddy-agent-harness@market': true } }))
		write(
			home,
			'.claude/plugins/installed_plugins.json',
			JSON.stringify({ plugins: { 'buddy-agent-harness@market': [{ scope: 'user', installPath: packageRoot }] } }),
		)

		const layers = await referenceLayers({
			root: tempDir(),
			home,
			platform: 'linux',
			plugin: { name: 'buddy-agent-harness', root: packageRoot },
			env: { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 'session' },
		})
		expect(layers.filter(({ dir }) => dir === join(packageRoot, 'references'))).toHaveLength(1)
	})
})

describe('the managed folders', () => {
	it('names the managed folders per platform', () => {
		expect(managedReferencesDir('linux')).toBe('/etc/buddy-agent-harness/references')
		expect(managedGovernancesDir('linux')).toBe('/etc/buddy-agent-harness/governances')
		expect(managedGovernancesDir('darwin')).toBe('/Library/Application Support/BuddyAgentHarness/governances')
		expect(managedGovernancesDir('win32', 'D:\\ProgramData')).toBe(
			join('D:\\ProgramData', 'BuddyAgentHarness', 'governances'),
		)
	})

	// Pinned so a machine already carrying one keeps working: these are the paths `universal-plugin`
	// wrote, and they are still read.
	it('still names the folder universal-plugin wrote, per platform', () => {
		expect(deprecatedManagedGovernancesDir('linux')).toBe('/etc/universal-plugin/governances')
		expect(deprecatedManagedGovernancesDir('darwin')).toBe('/Library/Application Support/UniPlugin/governances')
		expect(deprecatedManagedGovernancesDir('win32', 'D:\\ProgramData')).toBe(
			join('D:\\ProgramData', 'UniPlugin', 'governances'),
		)
	})

	it('falls back to the default program data folder when Windows does not name one', () => {
		expect(managedGovernancesDir('win32', '')).toBe(join('C:\\ProgramData', 'BuddyAgentHarness', 'governances'))
		expect(deprecatedManagedGovernancesDir('win32', undefined)).toBe(
			join('C:\\ProgramData', 'UniPlugin', 'governances'),
		)
	})
})
