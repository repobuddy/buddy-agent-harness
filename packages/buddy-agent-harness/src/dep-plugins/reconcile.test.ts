import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCatalog, type Catalog } from './dep-plugins.ts'
import { claudeCode, claudeConfigDir, codex, codexHome, readClaudeState, readCodexState } from './harness-plugins.ts'
import { reconcile } from './reconcile.ts'

const ROOT = '/repo/acme'
const CATALOG_DIR = join('.agents', 'buddy-agent-harness')

function catalog(plugins: { plugin: string; version: string }[] = []): Catalog {
	return buildCatalog({
		name: 'acme-web',
		owner: '@acme/web',
		plugins: plugins.map(({ plugin, version }) => ({ package: plugin, plugin, version })),
	})
}

function installed(entries: { id: string; version: string; scope?: string; projectPath?: string }[]) {
	return entries.map(({ id, version, scope = 'project', projectPath = ROOT }) => ({
		id,
		version,
		scope,
		projectPath,
	}))
}

const registered = [{ name: 'acme-web', path: `${ROOT}/.agents/buddy-agent-harness` }]

describe('reconcile', () => {
	it('asks for a registration when the marketplace is unknown to the harness', () => {
		const result = reconcile({
			catalog: catalog(),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: [],
			marketplaces: [],
		})
		expect(result.unregistered).toBe(true)
		expect(result.actions).toEqual([
			{ kind: 'register', subject: 'acme-web', detail: 'marketplace is not registered with this harness' },
		])
	})

	it('asks to install a catalog entry the harness does not have', () => {
		const result = reconcile({
			catalog: catalog([{ plugin: 'review', version: '1.0.0' }]),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: [],
			marketplaces: registered,
		})
		expect(result.actions).toEqual([
			{ kind: 'install', subject: 'review@acme-web', detail: 'not installed; catalog pins 1.0.0' },
		])
	})

	it('asks to update when the installed version differs from the pin', () => {
		const result = reconcile({
			catalog: catalog([{ plugin: 'review', version: '2.0.0' }]),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: installed([{ id: 'review@acme-web', version: '1.0.0' }]),
			marketplaces: registered,
		})
		expect(result.actions).toEqual([
			{ kind: 'update', subject: 'review@acme-web', detail: 'installed 1.0.0, catalog pins 2.0.0' },
		])
	})

	it('asks to update when the catalog pins an older version than is installed', () => {
		// A downgrade is as much a mismatch as an upgrade: the catalog is the pin, not a floor.
		const result = reconcile({
			catalog: catalog([{ plugin: 'review', version: '1.0.0' }]),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: installed([{ id: 'review@acme-web', version: '2.0.0' }]),
			marketplaces: registered,
		})
		expect(result.actions[0]?.kind).toBe('update')
	})

	it('asks to uninstall a plugin the catalog no longer lists', () => {
		// Nothing else removes it: the harness leaves it installed and failing to load, and `prune`
		// declines because it was never an auto-installed dependency.
		const result = reconcile({
			catalog: catalog(),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: installed([{ id: 'gone@acme-web', version: '1.0.0' }]),
			marketplaces: registered,
		})
		expect(result.actions).toEqual([
			{
				kind: 'uninstall',
				subject: 'gone@acme-web',
				detail: 'installed but no longer in the catalog; it will report a load failure until removed',
			},
		])
	})

	it('reports nothing to do when the harness already matches', () => {
		const result = reconcile({
			catalog: catalog([{ plugin: 'review', version: '1.0.0' }]),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: installed([{ id: 'review@acme-web', version: '1.0.0' }]),
			marketplaces: registered,
		})
		expect(result.actions).toEqual([])
		expect(result.collision).toBeUndefined()
	})

	it('does not count another project’s install as satisfying this one', () => {
		const result = reconcile({
			catalog: catalog([{ plugin: 'review', version: '1.0.0' }]),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: installed([{ id: 'review@acme-web', version: '1.0.0', projectPath: '/repo/other' }]),
			marketplaces: registered,
		})
		expect(result.actions[0]?.kind).toBe('install')
	})

	it('does not count a user-scoped install as satisfying a project', () => {
		// A user-scoped install is shared with every repository on the machine; letting it stand in
		// here is how one project's pin silently becomes another's.
		const result = reconcile({
			catalog: catalog([{ plugin: 'review', version: '1.0.0' }]),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: [{ id: 'review@acme-web', version: '1.0.0', scope: 'user' }],
			marketplaces: registered,
		})
		expect(result.actions[0]?.kind).toBe('install')
	})

	it('flags a marketplace registered against a different directory', () => {
		const result = reconcile({
			catalog: catalog(),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: [],
			marketplaces: [{ name: 'acme-web', path: '/somewhere/else/.agents/other-tool' }],
		})
		expect(result.collision).toBe('/somewhere/else/.agents/other-tool')
	})

	it('does not flag a collision when the registration points at this catalog', () => {
		const result = reconcile({
			catalog: catalog(),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: [],
			marketplaces: registered,
		})
		expect(result.collision).toBeUndefined()
	})
})

describe('readClaudeState', () => {
	function configDir(installedPlugins?: unknown, knownMarketplaces?: unknown): string {
		const dir = mkdtempSync(join(tmpdir(), 'harness-state-'))
		mkdirSync(join(dir, 'plugins'), { recursive: true })
		if (installedPlugins) {
			writeFileSync(join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify(installedPlugins))
		}
		if (knownMarketplaces) {
			writeFileSync(join(dir, 'plugins', 'known_marketplaces.json'), JSON.stringify(knownMarketplaces))
		}
		return dir
	}

	it('flattens the per-id array, which holds one entry per scope and project', () => {
		const dir = configDir({
			version: 2,
			plugins: {
				'review@acme-web': [
					{ scope: 'project', version: '1.0.0', projectPath: '/repo/a' },
					{ scope: 'project', version: '2.0.0', projectPath: '/repo/b' },
				],
			},
		})
		expect(readClaudeState(dir).installed).toEqual([
			{ id: 'review@acme-web', version: '1.0.0', scope: 'project', projectPath: '/repo/a' },
			{ id: 'review@acme-web', version: '2.0.0', scope: 'project', projectPath: '/repo/b' },
		])
	})

	it('reads registered marketplaces and where they point', () => {
		const dir = configDir(undefined, { 'acme-web': { source: { source: 'directory', path: '/repo/a/.agents' } } })
		expect(readClaudeState(dir).marketplaces).toEqual([{ name: 'acme-web', path: '/repo/a/.agents' }])
	})

	it('reports empty state for a harness that has never installed anything', () => {
		const dir = configDir()
		expect(readClaudeState(dir)).toEqual({ installed: [], marketplaces: [] })
	})

	it('skips a malformed entry rather than failing the whole read', () => {
		const dir = configDir({
			plugins: { 'broken@m': [{ scope: 'project' }], 'ok@m': [{ scope: 'user', version: '1' }] },
		})
		expect(readClaudeState(dir).installed).toEqual([{ id: 'ok@m', version: '1', scope: 'user' }])
	})
})

describe('claudeConfigDir', () => {
	it('prefers CLAUDE_CONFIG_DIR, which is what keeps a test off the real configuration', () => {
		expect(claudeConfigDir('/home/u', { CLAUDE_CONFIG_DIR: '/sandbox' })).toBe('/sandbox')
	})

	it('falls back to .claude under the home directory', () => {
		expect(claudeConfigDir('/home/u', {})).toBe(join('/home/u', '.claude'))
	})
})

describe('claudeCode verbs', () => {
	// Every verb defaults to user scope. An update or uninstall that omits `--scope project` fails
	// with "not installed at scope user" against a plugin that is installed — verified against the
	// shipped CLI, not inferred.
	it.each([
		['install', claudeCode.install('review@acme-web')],
		['update', claudeCode.update('review@acme-web')],
		['uninstall', claudeCode.uninstall('review@acme-web')],
	])('%s targets project scope explicitly', (_verb, command) => {
		expect(command).toContain('--scope project')
	})

	it('registers the catalog at project scope, which is what isolates two repositories', () => {
		expect(claudeCode.register('.agents/buddy-agent-harness')).toContain('--scope project')
	})
})

describe('readCodexState', () => {
	function codexHomeFixture(cache: Record<string, Record<string, string[]>> = {}, config = ''): string {
		const dir = mkdtempSync(join(tmpdir(), 'codex-home-'))
		for (const [marketplace, plugins] of Object.entries(cache)) {
			for (const [plugin, versions] of Object.entries(plugins)) {
				for (const version of versions) {
					mkdirSync(join(dir, 'plugins', 'cache', marketplace, plugin, version), { recursive: true })
				}
			}
		}
		if (config) writeFileSync(join(dir, 'config.toml'), config)
		return dir
	}

	it('reads the installed version from the cache layout, which is the only place Codex records it', () => {
		// Its config.toml says a plugin is enabled and never which version.
		const dir = codexHomeFixture({ 'acme-web': { review: ['1.2.0'] } })
		expect(readCodexState(dir).installed).toEqual([{ id: 'review@acme-web', version: '1.2.0', scope: 'user' }])
	})

	it('reads registered marketplaces and their local source', () => {
		const dir = codexHomeFixture(
			{},
			'[marketplaces.acme-web]\nsource_type = "local"\nsource = "/repo/a/.agents/buddy-agent-harness"\n',
		)
		expect(readCodexState(dir).marketplaces).toEqual([
			{ name: 'acme-web', path: '/repo/a/.agents/buddy-agent-harness' },
		])
	})

	it('does not attribute a later table’s source to a marketplace', () => {
		const dir = codexHomeFixture(
			{},
			'[marketplaces.acme-web]\nsource = "/repo/a"\n\n[plugins."review@acme-web"]\nenabled = true\n',
		)
		expect(readCodexState(dir).marketplaces).toEqual([{ name: 'acme-web', path: '/repo/a' }])
	})

	it('reports empty state for a Codex that has installed nothing', () => {
		expect(readCodexState(codexHomeFixture())).toEqual({ installed: [], marketplaces: [] })
	})
})

describe('codex verbs', () => {
	it('installs and refreshes with the same command, because there is no update verb', () => {
		// Re-running `plugin add` re-reads the local catalog and replaces the cached copy.
		expect(codex.update('review@acme-web')).toBe(codex.install('review@acme-web'))
	})

	it('declares no marketplace refresh, since add already re-reads a local catalog', () => {
		expect(codex.refreshMarketplace('acme-web')).toBe('')
	})

	it('takes no scope, because Codex installs once per machine', () => {
		expect(codex.scoped).toBe(false)
		expect(codex.install('review@acme-web')).not.toContain('--scope')
	})
})

describe('reconcile on an unscoped runtime', () => {
	it('counts an install under this marketplace as ours, having nothing to tell repositories apart', () => {
		const result = reconcile({
			catalog: catalog([{ plugin: 'review', version: '1.0.0' }]),
			catalogDir: CATALOG_DIR,
			root: ROOT,
			installed: [{ id: 'review@acme-web', version: '1.0.0', scope: 'user' }],
			marketplaces: registered,
			scoped: false,
		})
		expect(result.actions).toEqual([])
	})
})

describe('runtime detection and paths', () => {
	function home(withDirs: string[]): string {
		const dir = mkdtempSync(join(tmpdir(), 'home-'))
		for (const name of withDirs) mkdirSync(join(dir, name), { recursive: true })
		return dir
	}

	it('detects a runtime by the presence of its configuration directory', () => {
		const configured = home(['.claude', '.codex'])
		expect(claudeCode.present(configured, {})).toBe(true)
		expect(codex.present(configured, {})).toBe(true)

		const bare = home([])
		expect(claudeCode.present(bare, {})).toBe(false)
		expect(codex.present(bare, {})).toBe(false)
	})

	it('honours CODEX_HOME, which is what keeps a test off the real configuration', () => {
		expect(codexHome('/home/u', { CODEX_HOME: '/sandbox' })).toBe('/sandbox')
		expect(codexHome('/home/u', {})).toBe(join('/home/u', '.codex'))
	})

	it('reads each runtime’s state through its own configuration directory', () => {
		const configured = home(['.claude', '.codex'])
		expect(claudeCode.state(configured, {})).toEqual({ installed: [], marketplaces: [] })
		expect(codex.state(configured, {})).toEqual({ installed: [], marketplaces: [] })
	})

	it('registers and uninstalls with each runtime’s own verb', () => {
		expect(claudeCode.register('.agents/x')).toBe('claude plugin marketplace add ./.agents/x --scope project')
		expect(codex.register('.agents/x')).toBe('codex plugin marketplace add ./.agents/x')
		expect(codex.uninstall('a@b')).toBe('codex plugin remove a@b')
		expect(claudeCode.refreshMarketplace('m')).toBe('claude plugin marketplace update m')
	})
})

describe('malformed harness state is skipped, not fatal', () => {
	function claudeDir(installedPlugins?: unknown, knownMarketplaces?: unknown): string {
		const dir = mkdtempSync(join(tmpdir(), 'claude-malformed-'))
		mkdirSync(join(dir, 'plugins'), { recursive: true })
		if (installedPlugins)
			writeFileSync(join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify(installedPlugins))
		if (knownMarketplaces)
			writeFileSync(join(dir, 'plugins', 'known_marketplaces.json'), JSON.stringify(knownMarketplaces))
		return dir
	}

	it('skips a non-object entry', () => {
		expect(readClaudeState(claudeDir({ plugins: { 'a@m': [null, 'text'] } })).installed).toEqual([])
	})

	it('skips an entry with no scope', () => {
		expect(readClaudeState(claudeDir({ plugins: { 'a@m': [{ version: '1' }] } })).installed).toEqual([])
	})

	it('skips a per-id value that is not an array', () => {
		expect(readClaudeState(claudeDir({ plugins: { 'a@m': { version: '1' } } })).installed).toEqual([])
	})

	it('reads a marketplace whose source carries no path as pointing nowhere', () => {
		// A git- or url-sourced marketplace has no path; it still occupies the name.
		expect(readClaudeState(claudeDir(undefined, { m: { source: { source: 'github' } } })).marketplaces).toEqual([
			{ name: 'm', path: '' },
		])
	})

	it('ignores a Codex source line that precedes any marketplace table', () => {
		const dir = mkdtempSync(join(tmpdir(), 'codex-malformed-'))
		writeFileSync(join(dir, 'config.toml'), 'source = "/orphan"\n[marketplaces.m]\nsource = "/real"\n')
		expect(readCodexState(dir).marketplaces).toEqual([{ name: 'm', path: '/real' }])
	})

	it('reads a quoted Codex marketplace name', () => {
		const dir = mkdtempSync(join(tmpdir(), 'codex-quoted-'))
		writeFileSync(join(dir, 'config.toml'), '[marketplaces."scoped-name"]\nsource = "/p"\n')
		expect(readCodexState(dir).marketplaces).toEqual([{ name: 'scoped-name', path: '/p' }])
	})
})
