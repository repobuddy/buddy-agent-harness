import { describe, expect, it } from 'vitest'
import { nonSecretArgs } from './mcp-secrets.ts'

/**
 * A reference to a secret, assembled rather than written literally: a `${…}` inside a plain string
 * is what the lint rule for a mistyped template literal looks for, and every one here is deliberate.
 */
const ref = (name: string) => '$' + '{' + name + '}'

describe('nonSecretArgs', () => {
	it('reads no args from an absent list', () => {
		expect(nonSecretArgs(undefined)).toEqual([])
	})

	it('passes positional args through unfiltered', () => {
		expect(nonSecretArgs(['-y', '@upstash/context7-mcp'])).toEqual(['-y', '@upstash/context7-mcp'])
	})

	it('passes a flag with no `=` through unfiltered', () => {
		expect(nonSecretArgs(['--verbose'])).toEqual(['--verbose'])
	})

	it('drops a `--flag=value` pair whose flag names a credential and whose value is a literal', () => {
		expect(nonSecretArgs(['--token=sk-live-abc123'])).toEqual([])
	})

	it('keeps a `--flag=value` pair whose value is a reference rather than a literal', () => {
		const arg = `--token=${ref('LINEAR_TOKEN')}`
		expect(nonSecretArgs([arg])).toEqual([arg])
	})

	it('keeps a `--flag=value` pair whose flag does not name a credential', () => {
		expect(nonSecretArgs(['--project=demo'])).toEqual(['--project=demo'])
	})
})
