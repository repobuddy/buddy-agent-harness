import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadReference } from './load-reference.ts'

function tempDir(): string {
	return mkdtempSync(join(tmpdir(), 'load-reference-'))
}

function write(root: string, relPath: string, content: string): void {
	const path = join(root, relPath)
	mkdirSync(dirname(path), { recursive: true })
	writeFileSync(path, content)
}

describe('loadReference', () => {
	it("applies a project override's merge-sections to the plugin's own copy", async () => {
		const root = tempDir()
		const plugin = tempDir()
		write(root, '.git/HEAD', 'ref: refs/heads/main\n')
		write(plugin, 'references/weights.md', '## Testing\n\nweight 3\n\n## Docs\n\nweight 1\n')
		write(root, '.agents/references/weights.md', '---\nmerge: merge-sections\n---\n\n## Docs\n\nweight 5\n')

		const resolved = await loadReference('weights', {
			root,
			home: tempDir(),
			platform: 'linux',
			env: {},
			plugin: { name: 'host', root: plugin },
		})

		expect(resolved.status).toBe('found')
		expect(resolved.content).toContain('weight 3')
		expect(resolved.content).toContain('weight 5')
		expect(resolved.content).not.toContain('weight 1')
		expect(resolved.layers.map(({ tier }) => tier)).toEqual(['project', 'plugin'])
	})

	it("reads the machine's home directory and platform when none is given", async () => {
		const resolved = await loadReference('no-such-reference-anywhere', { root: tempDir(), env: {} })

		expect(resolved.status).toBe('missing')
	})

	it('rejects a name that is a path', async () => {
		await expect(loadReference('../escape', { root: tempDir(), env: {} })).rejects.toThrow(/not a reference name/)
	})
})
