import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { detectedHarnesses, enabledPluginLayers, harnessManagedLayers } from './harness-layers.ts'

function tempDir(prefix = 'harness-layers-'): string {
	return mkdtempSync(join(tmpdir(), prefix))
}

function write(root: string, relPath: string, content: string): string {
	const path = join(root, relPath)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, content)
	return path
}

const claudeCode = { CLAUDECODE: '1', CLAUDE_CODE_SESSION_ID: 'session' }
const codex = { CODEX_THREAD_ID: 'thread' }

describe('detectedHarnesses', () => {
	it('returns the harness the environment names', () => {
		expect(detectedHarnesses(claudeCode)).toEqual(['claude-code'])
	})

	it('returns every harness when they are nested', () => {
		expect(detectedHarnesses({ ...claudeCode, ...codex })).toEqual(['claude-code', 'codex'])
	})

	it('returns none outside a harness', () => {
		expect(detectedHarnesses({})).toEqual([])
	})
})

describe('harnessManagedLayers', () => {
	it('treats a drop-in folder as part of the harness folder above it', () => {
		const layers = harnessManagedLayers(['claude-code'], 'linux', {})
		const read = layers.filter(({ skipped }) => !skipped).map(({ dir }) => dir)
		expect(read).toEqual(['/etc/claude-code/references'])
	})

	it('skips Claude Code policy held on the server, and says why', () => {
		const layers = harnessManagedLayers(['claude-code'], 'linux', {})
		const skipped = layers.filter(({ skipped }) => skipped)
		expect(skipped).toHaveLength(1)
		expect(skipped[0]?.skipped).toMatch(/^not read — claude-code keeps this policy in server-side settings/)
		expect(skipped[0]?.status).toBe(skipped[0]?.skipped)
	})

	it('skips the macOS managed-preferences domain', () => {
		const layers = harnessManagedLayers(['claude-code'], 'darwin', {})
		expect(layers.filter(({ skipped }) => !skipped).map(({ dir }) => dir)).toEqual([
			'/Library/Application Support/ClaudeCode/references',
		])
		expect(layers.find(({ dir }) => dir === 'com.anthropic.claudecode')?.skipped).toMatch(
			/macOS managed-preferences domain delivered by MDM/,
		)
	})

	it('skips the Windows registry and joins Windows paths on win32', () => {
		const layers = harnessManagedLayers(['claude-code'], 'win32', {})
		expect(layers.filter(({ skipped }) => !skipped).map(({ dir }) => dir)).toEqual([
			'C:\\Program Files\\ClaudeCode\\references',
		])
		expect(layers.filter(({ skipped }) => skipped?.includes('Windows registry'))).toHaveLength(2)
	})

	it('reads a managed directory itself when the harness keeps no file beside it', () => {
		const layers = harnessManagedLayers(['opencode'], 'linux', {})
		expect(layers.filter(({ skipped }) => !skipped).map(({ dir }) => dir)).toEqual(['/etc/opencode/references'])
	})

	it.each([
		['codex', '/etc/codex/references'],
		['copilot-cli', '/etc/github-copilot/references'],
		['cursor', '/etc/cursor/references'],
	] as const)('reads references/ beside the %s managed files', (harness, dir) => {
		const layers = harnessManagedLayers([harness], 'linux', {})
		expect(layers.filter(({ skipped }) => !skipped).map(({ dir }) => dir)).toEqual([dir])
	})

	it('reads the managed folder of every nested harness', () => {
		const layers = harnessManagedLayers(['claude-code', 'codex'], 'linux', {})
		expect(layers.filter(({ skipped }) => !skipped).map(({ dir }) => dir)).toEqual([
			'/etc/claude-code/references',
			'/etc/codex/references',
		])
	})

	it('says so when no harness is detected', () => {
		const [layer, ...rest] = harnessManagedLayers([], 'linux', {})
		expect(rest).toEqual([])
		expect(layer).toMatchObject({ tier: 'managed', dir: '(no harness detected)' })
		expect(layer?.skipped).toMatch(/no harness detected/)
	})
})

type Install = { scope: string; installPath: string; projectPath?: string }

/** A Claude Code home with the given plugins enabled in user settings and recorded as installed. */
function claudeHome(enabled: Record<string, boolean>, installs: Record<string, Install[]>): string {
	const home = tempDir('harness-layers-home-')
	write(home, '.claude/settings.json', JSON.stringify({ enabledPlugins: enabled }))
	write(home, '.claude/plugins/installed_plugins.json', JSON.stringify({ version: 2, plugins: installs }))
	return home
}

function claudeLayers(home: string, chain: string[] = [tempDir()]) {
	return enabledPluginLayers(['claude-code'], chain, {
		env: claudeCode,
		homedir: home,
		cwd: chain[0] as string,
		platform: 'linux',
	})
}

describe('enabledPluginLayers', () => {
	it('reads references/ from each plugin Claude Code has enabled, named by the plugin', async () => {
		const home = claudeHome(
			{ 'alpha@market': true },
			{ 'alpha@market': [{ scope: 'user', installPath: '/plugins/alpha/1.0.0' }] },
		)
		const layers = (await claudeLayers(home)).filter(({ skipped }) => !skipped)
		expect(layers).toEqual([{ tier: 'plugin', dir: '/plugins/alpha/1.0.0/references', plugins: ['alpha'], status: '' }])
	})

	it('never reads a plugin that is installed but not enabled', async () => {
		const home = claudeHome(
			{ 'alpha@market': false },
			{
				'alpha@market': [{ scope: 'user', installPath: '/plugins/alpha' }],
				'beta@market': [{ scope: 'user', installPath: '/plugins/beta' }],
			},
		)
		const layers = await claudeLayers(home)
		expect(layers.some(({ dir }) => dir.startsWith('/plugins/'))).toBe(false)
		expect(layers.some(({ plugins }) => plugins.includes('alpha') || plugins.includes('beta'))).toBe(false)
	})

	it('reads the install scoped to the nearest folder of the walk', async () => {
		const near = tempDir()
		const far = tempDir()
		const home = claudeHome(
			{ 'alpha@market': true },
			{
				'alpha@market': [
					{ scope: 'user', installPath: '/plugins/alpha/user' },
					{ scope: 'project', installPath: '/plugins/alpha/far', projectPath: far },
					{ scope: 'local', installPath: '/plugins/alpha/near', projectPath: near },
				],
			},
		)
		const layers = await claudeLayers(home, [near, far])
		expect(layers.find(({ plugins }) => plugins.includes('alpha'))?.dir).toBe('/plugins/alpha/near/references')
	})

	it('skips an enabled plugin installed only for another project, and says why', async () => {
		const home = claudeHome(
			{ 'alpha@market': true },
			{ 'alpha@market': [{ scope: 'project', installPath: '/plugins/alpha', projectPath: '/elsewhere' }] },
		)
		const layer = (await claudeLayers(home)).find(({ plugins }) => plugins.includes('alpha'))
		expect(layer).toMatchObject({ tier: 'plugin', dir: '(alpha@market)' })
		expect(layer?.skipped).toMatch(/enabled in claude-code, but no install folder/)
	})

	it('reports the Claude Code policy it cannot read as one skipped layer', async () => {
		const layers = await claudeLayers(claudeHome({}, {}))
		const policy = layers.find(({ dir }) => dir === '(claude-code plugin policy)')
		expect(policy?.skipped).toMatch(/server-managed settings/)
	})

	it('reads a plugin Codex has enabled in config.toml, at its active cached version', async () => {
		const home = tempDir('harness-layers-home-')
		write(home, '.codex/config.toml', '[plugins."alpha@market"]\nenabled = true\n')
		write(home, '.codex/plugins/cache/market/alpha/1.0.0/plugin.json', '{}')
		write(home, '.codex/plugins/cache/market/alpha/2.0.0/plugin.json', '{}')
		const root = tempDir()
		const layers = await enabledPluginLayers(['codex'], [root], {
			env: codex,
			homedir: home,
			cwd: root,
			platform: 'linux',
		})
		expect(layers.find(({ plugins }) => plugins.includes('alpha'))?.dir).toBe(
			join(home, '.codex/plugins/cache/market/alpha/2.0.0/references'),
		)
	})

	it('says in the trace when a harness keeps no record of enabled plugins', async () => {
		const root = tempDir()
		const layers = await enabledPluginLayers(['cursor'], [root], { env: {}, homedir: tempDir(), cwd: root })
		expect(layers).toEqual([
			{
				tier: 'plugin',
				dir: '(cursor enabled plugins)',
				plugins: [],
				status: 'not read — cursor keeps no readable record of enabled plugins',
				skipped: 'not read — cursor keeps no readable record of enabled plugins',
			},
		])
	})

	it('reads nothing outside a harness', async () => {
		expect(await enabledPluginLayers([], [tempDir()], {})).toEqual([])
	})
})
