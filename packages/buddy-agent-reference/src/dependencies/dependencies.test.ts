import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { declaredDependencies, packageDir } from './dependencies.ts'

/** A repository with a real `node_modules` tree, so the resolver under test is the one that ships. */
function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'dependencies-'))
	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'acme-web' }))
	return root
}

function installDep(root: string, pkg: string, manifest: Record<string, unknown> = {}): string {
	const dir = join(root, 'node_modules', ...pkg.split('/'))
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: pkg, version: '1.0.0', ...manifest }))
	return dir
}

describe('declaredDependencies', () => {
	it('includes both runtime and development dependencies', () => {
		expect(declaredDependencies({ dependencies: { a: '^1' }, devDependencies: { b: '^2' } })).toEqual(['a', 'b'])
	})

	it('reports nothing for a manifest that declares nothing', () => {
		expect(declaredDependencies({})).toEqual([])
		expect(declaredDependencies(undefined)).toEqual([])
	})

	it('lists a dependency declared in both groups once', () => {
		expect(declaredDependencies({ dependencies: { a: '^1' }, devDependencies: { a: '^1' } })).toEqual(['a'])
	})
})

describe('packageDir', () => {
	it('resolves a scoped dependency', () => {
		const root = repository()
		const dir = installDep(root, '@acme/tooling')

		expect(packageDir('@acme/tooling', join(root, 'package.json'))).toBe(dir)
	})

	it('resolves a package whose exports map blocks ./package.json', () => {
		const root = repository()
		const dir = installDep(root, 'guarded', { exports: { '.': './index.js' } })

		expect(packageDir('guarded', join(root, 'package.json'))).toBe(dir)
	})

	it('reports a dependency that is declared but not installed', () => {
		expect(packageDir('absent', join(repository(), 'package.json'))).toBeUndefined()
	})
})
