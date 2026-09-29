import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { skillInvocation } from '@cyberuni/agent-harness'
import { describe, expect, it } from 'vitest'
import { renderInvocationTable, renderReferenceReadme } from './reference-invocation.ts'

const readmePath = join(import.meta.dirname, '..', '..', 'skills', 'reference', 'README.md')

describe('renderInvocationTable', () => {
	it('lists how each harness names the skill, generated from agent-harness', () => {
		const table = renderInvocationTable()
		const claude = skillInvocation('claude-code', { plugin: 'buddy-agent-harness', skill: 'reference' })
		const cursor = skillInvocation('cursor', { plugin: 'buddy-agent-harness', skill: 'reference' })
		expect(table).toContain(`| \`claude-code\` | \`${claude?.text}\` | yes |`)
		expect(table).toContain(`| \`cursor\` | \`${cursor?.text}\` | no |`)
		expect(table).toContain('| `opencode` | no typed form recorded | — |')
	})
})

describe('renderReferenceReadme', () => {
	it('replaces only the generated region', () => {
		const current = 'before\n<!-- generated: harness invocations -->\nstale\n<!-- /generated -->\nafter\n'
		expect(renderReferenceReadme(current)).toBe(`before\n${renderInvocationTable()}\nafter\n`)
	})

	it('returns nothing when the region is missing', () => {
		expect(renderReferenceReadme('no markers')).toBeUndefined()
	})

	it('is what the shipped README carries', () => {
		const shipped = readFileSync(readmePath, 'utf8')
		expect(renderReferenceReadme(shipped)).toBe(shipped)
		expect(shipped).toContain('with the `reference` skill in the `buddy-agent-harness` plugin.')
	})
})
