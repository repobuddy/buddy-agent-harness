import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ReferenceLayer } from './reference-layers.ts'
import { whereReference } from './reference-where.ts'
import { parseReferenceName } from './resolve-reference.ts'

describe('whereReference', () => {
	it('shows a path outside the project as it is when no display is given', () => {
		const root = mkdtempSync(join(tmpdir(), 'reference-where-'))
		const home = mkdtempSync(join(tmpdir(), 'reference-where-home-'))
		mkdirSync(join(home, '.agents', 'references'), { recursive: true })
		writeFileSync(join(home, '.agents', 'references', 'guide.md'), '# Guide\n')
		const layers: ReferenceLayer[] = [
			{ tier: 'project', dir: join(root, '.agents', 'references'), plugins: [], status: '' },
			{ tier: 'user', dir: join(home, '.agents', 'references'), plugins: [], status: '' },
		]

		const report = whereReference(parseReferenceName('guide'), layers, { root })

		expect(report.root).toBe(root)
		expect(report.slots).toEqual([
			expect.objectContaining({ layer: 'project', path: join('.agents', 'references', 'guide.md'), status: 'empty' }),
			expect.objectContaining({ layer: 'user', path: join(home, '.agents', 'references', 'guide.md'), status: 'used' }),
		])
	})
})
