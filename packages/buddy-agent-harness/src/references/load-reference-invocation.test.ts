import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillInvocation } from '@cyberuni/agent-harness'
import { describe, expect, it } from 'vitest'
import { renderInvocationTable, renderLoadReferenceReadme } from './load-reference-invocation.ts'

const readmePath = join(import.meta.dirname, '..', '..', 'skills', 'load-reference', 'README.md')

describe('renderInvocationTable', () => {
	it('lists how each harness names the skill, generated from agent-harness', () => {
		const table = renderInvocationTable()
		const claude = skillInvocation('claude-code', { plugin: 'buddy-agent-harness', skill: 'load-reference' })
		const cursor = skillInvocation('cursor', { plugin: 'buddy-agent-harness', skill: 'load-reference' })
		expect(table).toContain(`| \`claude-code\` | \`${claude?.text}\` | yes |`)
		expect(table).toContain(`| \`cursor\` | \`${cursor?.text}\` | no |`)
		expect(table).toContain('| `opencode` | no typed form recorded | — |')
	})
})

describe('renderLoadReferenceReadme', () => {
	it('replaces only the generated region', () => {
		const current = 'before\n<!-- generated: harness invocations -->\nstale\n<!-- /generated -->\nafter\n'
		expect(renderLoadReferenceReadme(current)).toBe(`before\n${renderInvocationTable()}\nafter\n`)
	})

	it('returns nothing when the region is missing', () => {
		expect(renderLoadReferenceReadme('no markers')).toBeUndefined()
	})

	it('is what the shipped README carries', () => {
		const shipped = readFileSync(readmePath, 'utf8')
		expect(renderLoadReferenceReadme(shipped)).toBe(shipped)
		expect(shipped).toContain('with the `load-reference` skill in the `buddy-agent-harness` plugin.')
	})
})
