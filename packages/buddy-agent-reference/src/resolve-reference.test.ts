import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ReferenceLayer } from './reference-layers.ts'
import { layerNames, parseReferenceName, referenceNames, resolveReference } from './resolve-reference.ts'

function tempDir(prefix = 'resolve-reference-'): string {
	return mkdtempSync(join(tmpdir(), prefix))
}

function write(root: string, relPath: string, content: string): string {
	const path = join(root, relPath)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, content)
	return path
}

function layer(tier: ReferenceLayer['tier'], dir: string): ReferenceLayer {
	return { tier, dir, plugins: [], status: '' }
}

describe('resolveReference', () => {
	it('displays a path as-is when no display function is given', () => {
		const dir = tempDir()
		write(dir, 'name.md', '# doc\n')

		const resolved = resolveReference(parseReferenceName('name'), [layer('project', dir)])

		expect(resolved.status).toBe('found')
		expect(resolved.path).toBe(join(dir, 'name.md'))
	})
})

describe('layerNames and referenceNames', () => {
	it('skips an entry whose name is not a reference name', () => {
		const dir = tempDir()
		write(dir, 'name.md', '# doc\n')
		write(dir, '.hidden.md', '# hidden\n')

		expect(layerNames(dir)).toEqual(['name'])
	})

	it('skips a folder candidate that holds none of the folder file names', () => {
		const dir = tempDir()
		write(dir, 'name.md', '# doc\n')
		mkdirSync(join(dir, 'empty-folder'), { recursive: true })
		write(dir, 'a-folder/README.md', '# folder doc\n')

		const names = layerNames(dir)
		expect(names).toContain('a-folder')
		expect(names).not.toContain('empty-folder')
	})

	it('reads every name any layer holds, deduplicated and sorted', () => {
		const dirA = tempDir()
		const dirB = tempDir()
		write(dirA, 'b.md', '# b\n')
		write(dirB, 'a.md', '# a\n')
		write(dirB, 'b.md', '# b again\n')

		expect(referenceNames([layer('project', dirA), layer('user', dirB)])).toEqual(['a', 'b'])
	})
})
