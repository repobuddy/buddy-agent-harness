import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { referenceLayers } from './reference-layers.ts'

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
	it('never treats a dependency without a `references/` folder as a plugin', () => {
		const root = tempDir()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-c': '1.0.0' } }))
		write(root, 'node_modules/dep-c/package.json', JSON.stringify({ name: 'dep-c', version: '1.0.0' }))

		const layers = referenceLayers({ root, home: tempDir(), platform: 'linux' })
		expect(layers.some((layer) => layer.plugins.includes('dep-c'))).toBe(false)
	})

	it("skips a dependency that resolves to the package's own root", () => {
		const root = tempDir()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0' } }))
		write(root, 'node_modules/dep-a/package.json', JSON.stringify({ name: 'dep-a', version: '1.0.0' }))
		write(root, 'node_modules/dep-a/references/testing.md', '# dep-a\n')

		const layers = referenceLayers({
			root,
			home: tempDir(),
			platform: 'linux',
			packageRoot: join(root, 'node_modules', 'dep-a'),
		})
		expect(layers.some((layer) => layer.plugins.includes('dep-a'))).toBe(false)
	})

	it('tolerates a packageRoot that does not exist on disk', () => {
		const root = tempDir()
		const packageRoot = join(root, 'does-not-exist')

		const layers = referenceLayers({ root, home: tempDir(), platform: 'linux', packageRoot })

		expect(layers.some((layer) => layer.dir === join(packageRoot, 'references'))).toBe(true)
	})

	it('names a plugin by both its package name and its plugin.json name, when they differ', () => {
		const root = tempDir()
		write(root, 'package.json', JSON.stringify({ dependencies: { 'dep-a': '1.0.0' } }))
		write(root, 'node_modules/dep-a/package.json', JSON.stringify({ name: 'dep-a', version: '1.0.0' }))
		write(root, 'node_modules/dep-a/plugin.json', JSON.stringify({ name: 'other-name' }))
		write(root, 'node_modules/dep-a/references/testing.md', '# dep-a\n')

		const layers = referenceLayers({ root, home: tempDir(), platform: 'linux' })
		const layer = layers.find((candidate) => candidate.plugins.includes('dep-a'))
		expect(layer?.plugins).toEqual(['dep-a', 'other-name'])
	})
})
