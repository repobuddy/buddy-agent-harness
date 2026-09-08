import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCatalog, declaredDependencies, isGenericName, marketplaceName } from './dep-plugins.ts'
import { CATALOG_PATH, catalogStatus, deriveCatalog, writeCatalog } from './generate.ts'
import { readDepPlugin } from './resolve.ts'

/**
 * A repository with a real `node_modules` tree. Dependencies are written as directories rather than
 * mocked so the resolver under test is the one that ships.
 */
function repository(manifest: Record<string, unknown> = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'dep-plugins-'))
	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'acme-web', ...manifest }))
	return root
}

type DepOptions = { version?: string; plugin?: Record<string, unknown> | null; exportsBlockManifest?: boolean }

function installDep(root: string, pkg: string, { version = '1.0.0', plugin, exportsBlockManifest }: DepOptions = {}) {
	const dir = join(root, 'node_modules', ...pkg.split('/'))
	mkdirSync(dir, { recursive: true })
	const manifest: Record<string, unknown> = { name: pkg, version }
	// A package whose `exports` map omits `./package.json` refuses `require.resolve('<pkg>/package.json')`.
	if (exportsBlockManifest) manifest['exports'] = { '.': './index.js' }
	writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest))
	if (plugin) writeFileSync(join(dir, 'plugin.json'), JSON.stringify(plugin))
	return dir
}

describe('declaredDependencies', () => {
	it('includes both runtime and development dependencies', () => {
		const names = declaredDependencies({ dependencies: { a: '^1' }, devDependencies: { b: '^2' } })
		expect(names).toEqual(['a', 'b'])
	})

	it('reports nothing for a manifest that declares nothing', () => {
		expect(declaredDependencies({})).toEqual([])
		expect(declaredDependencies(undefined)).toEqual([])
	})

	it('lists a dependency declared in both groups once', () => {
		expect(declaredDependencies({ dependencies: { a: '^1' }, devDependencies: { a: '^1' } })).toEqual(['a'])
	})
})

describe('marketplaceName', () => {
	it('folds a scope into the name rather than dropping it', () => {
		expect(marketplaceName('@acme/web')).toBe('acme-web')
	})

	it('passes an unscoped name through', () => {
		expect(marketplaceName('buddy-agent-harness')).toBe('buddy-agent-harness')
	})

	it('falls back when a name reduces to nothing usable', () => {
		expect(marketplaceName('@/')).toBe('agent-plugins')
	})
})

describe('isGenericName', () => {
	it.each(['deps', 'Local', 'plugins', 'marketplace'])('flags %s as collision-prone', (name) => {
		expect(isGenericName(name)).toBe(true)
	})

	it('accepts a repository-derived name', () => {
		expect(isGenericName('acme-web')).toBe(false)
	})
})

describe('buildCatalog', () => {
	it('emits an npm source rather than a path, so the catalog need not sit at the repository root', () => {
		const catalog = buildCatalog({
			name: 'acme-web',
			owner: '@acme/web',
			plugins: [{ package: 'some-plugin', plugin: 'some-plugin', version: '2.1.0' }],
		})
		expect(catalog.plugins[0]?.source).toEqual({ source: 'npm', package: 'some-plugin', version: '2.1.0' })
	})

	it('gives owner as an object, which the harness requires over a bare string', () => {
		const catalog = buildCatalog({ name: 'acme-web', owner: '@acme/web', plugins: [] })
		expect(catalog.owner).toEqual({ name: '@acme/web' })
	})

	it('sorts entries so unchanged inputs serialize identically', () => {
		const plugins = [
			{ package: 'z-pkg', plugin: 'zeta', version: '1.0.0' },
			{ package: 'a-pkg', plugin: 'alpha', version: '1.0.0' },
		]
		const forward = buildCatalog({ name: 'n', owner: 'o', plugins })
		const reversed = buildCatalog({ name: 'n', owner: 'o', plugins: [...plugins].reverse() })
		expect(JSON.stringify(forward)).toBe(JSON.stringify(reversed))
	})

	it('carries the plugin name, which need not match the package name', () => {
		const catalog = buildCatalog({
			name: 'n',
			owner: 'o',
			plugins: [{ package: '@acme/tooling', plugin: 'acme-review', version: '1.0.0' }],
		})
		expect(catalog.plugins[0]?.name).toBe('acme-review')
		expect(catalog.plugins[0]?.source.package).toBe('@acme/tooling')
	})
})

describe('readDepPlugin', () => {
	it('reads a dependency that ships a root plugin manifest', () => {
		const root = repository()
		installDep(root, 'some-plugin', { version: '2.1.0', plugin: { name: 'some-plugin', description: 'A plugin' } })

		const outcome = readDepPlugin('some-plugin', join(root, 'package.json'))
		expect(outcome).toEqual({
			ok: true,
			plugin: { package: 'some-plugin', plugin: 'some-plugin', version: '2.1.0', description: 'A plugin' },
		})
	})

	it('takes the version from the installed package, not the plugin manifest', () => {
		const root = repository()
		installDep(root, 'drifted', { version: '2.0.0', plugin: { name: 'drifted', version: '9.9.9' } })

		const outcome = readDepPlugin('drifted', join(root, 'package.json'))
		expect(outcome.ok && outcome.plugin.version).toBe('2.0.0')
	})

	it('resolves a scoped dependency', () => {
		const root = repository()
		installDep(root, '@acme/tooling', { plugin: { name: 'acme-review' } })

		const outcome = readDepPlugin('@acme/tooling', join(root, 'package.json'))
		expect(outcome.ok && outcome.plugin.plugin).toBe('acme-review')
	})

	it('resolves a package whose exports map blocks ./package.json', () => {
		const root = repository()
		installDep(root, 'guarded', { plugin: { name: 'guarded' }, exportsBlockManifest: true })

		// Roughly one package in seven is shaped this way; without the walk-up fallback it is invisible.
		const outcome = readDepPlugin('guarded', join(root, 'package.json'))
		expect(outcome.ok && outcome.plugin.plugin).toBe('guarded')
	})

	it('reports a dependency that ships no plugin manifest', () => {
		const root = repository()
		installDep(root, 'plain')

		expect(readDepPlugin('plain', join(root, 'package.json'))).toEqual({
			ok: false,
			package: 'plain',
			reason: 'no-manifest',
		})
	})

	it('reports a manifest with no name rather than inventing one', () => {
		const root = repository()
		installDep(root, 'nameless', { plugin: { description: 'no name' } })

		expect(readDepPlugin('nameless', join(root, 'package.json'))).toEqual({
			ok: false,
			package: 'nameless',
			reason: 'unnamed',
		})
	})

	it('reports a dependency that is declared but not installed', () => {
		const root = repository()
		expect(readDepPlugin('absent', join(root, 'package.json'))).toEqual({
			ok: false,
			package: 'absent',
			reason: 'unresolved',
		})
	})
})

describe('deriveCatalog', () => {
	it('includes only declared dependencies that ship a plugin', () => {
		const root = repository({ dependencies: { 'with-plugin': '^1' }, devDependencies: { plain: '^1' } })
		installDep(root, 'with-plugin', { plugin: { name: 'with-plugin' } })
		installDep(root, 'plain')
		// Present on disk but declared by nobody: scanning would find it, resolution must not.
		installDep(root, 'transitive-plugin', { plugin: { name: 'transitive-plugin' } })

		const derived = deriveCatalog(root)
		expect(derived.plugins.map((p) => p.plugin)).toEqual(['with-plugin'])
	})

	it('finds a plugin declared as a development dependency', () => {
		const root = repository({ devDependencies: { 'dev-plugin': '^1' } })
		installDep(root, 'dev-plugin', { plugin: { name: 'dev-plugin' } })

		expect(deriveCatalog(root).plugins.map((p) => p.plugin)).toEqual(['dev-plugin'])
	})

	it('names the marketplace after the repository so two repositories do not collide', () => {
		const root = repository({ name: '@acme/web' })
		const derived = deriveCatalog(root)
		expect(derived.catalog.name).toBe('acme-web')
		expect(derived.genericName).toBe(false)
	})

	it('reports a declared dependency that is not installed', () => {
		const root = repository({ dependencies: { absent: '^1' } })
		expect(deriveCatalog(root).unresolved).toEqual([{ package: 'absent', reason: 'unresolved' }])
	})

	it('does not report a dependency that merely ships no plugin', () => {
		const root = repository({ dependencies: { plain: '^1' } })
		installDep(root, 'plain')
		expect(deriveCatalog(root).unresolved).toEqual([])
	})
})

describe('writeCatalog', () => {
	it('creates the catalog in its own directory, away from the repository’s public one', () => {
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', { plugin: { name: 'with-plugin' } })

		expect(writeCatalog(root, deriveCatalog(root).catalog)).toBe('created')
		const written = JSON.parse(readFileSync(join(root, CATALOG_PATH), 'utf8'))
		expect(written.plugins).toHaveLength(1)
	})

	it('reports an unchanged catalog as unchanged, so a check mode can compare rather than interpret', () => {
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', { plugin: { name: 'with-plugin' } })

		writeCatalog(root, deriveCatalog(root).catalog)
		expect(writeCatalog(root, deriveCatalog(root).catalog)).toBe('unchanged')
	})

	it('reports an updated catalog when a dependency version moves', () => {
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', { version: '1.0.0', plugin: { name: 'with-plugin' } })
		writeCatalog(root, deriveCatalog(root).catalog)

		installDep(root, 'with-plugin', { version: '1.1.0', plugin: { name: 'with-plugin' } })
		expect(writeCatalog(root, deriveCatalog(root).catalog)).toBe('updated')
	})

	it('drops a plugin whose dependency was removed, without reconciliation logic', () => {
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', { plugin: { name: 'with-plugin' } })
		writeCatalog(root, deriveCatalog(root).catalog)

		writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'acme-web' }))
		expect(writeCatalog(root, deriveCatalog(root).catalog)).toBe('updated')
		expect(JSON.parse(readFileSync(join(root, CATALOG_PATH), 'utf8')).plugins).toEqual([])
	})
})

describe('catalogStatus', () => {
	it('reports what a write would do without creating anything', () => {
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', { plugin: { name: 'with-plugin' } })

		// The whole point of the check mode: safe to run from a postinstall hook and from CI.
		expect(catalogStatus(root, deriveCatalog(root).catalog)).toBe('created')
		expect(existsSync(join(root, CATALOG_PATH))).toBe(false)
	})

	it('reports a written catalog as unchanged', () => {
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', { plugin: { name: 'with-plugin' } })
		writeCatalog(root, deriveCatalog(root).catalog)

		expect(catalogStatus(root, deriveCatalog(root).catalog)).toBe('unchanged')
	})
})

describe('edge cases the report has to name rather than guess', () => {
	it('treats a dependency with no version as shipping nothing installable', () => {
		const root = repository()
		const dir = join(root, 'node_modules', 'versionless')
		mkdirSync(dir, { recursive: true })
		// A package.json without a version: the catalog installs by version, so there is nothing to pin.
		writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'versionless' }))
		writeFileSync(join(dir, 'plugin.json'), JSON.stringify({ name: 'versionless' }))

		expect(readDepPlugin('versionless', join(root, 'package.json'))).toEqual({
			ok: false,
			package: 'versionless',
			reason: 'no-manifest',
		})
	})

	it('falls back to a placeholder owner when the repository manifest is unnamed', () => {
		const root = mkdtempSync(join(tmpdir(), 'dep-plugins-'))
		writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true }))

		const derived = deriveCatalog(root)
		expect(derived.catalog.owner).toEqual({ name: 'unknown' })
		expect(derived.catalog.name).toBe('unknown')
	})
})
