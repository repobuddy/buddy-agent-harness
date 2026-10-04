import { describe, expect, it } from 'vitest'
import { isRecord } from './is-record.ts'

describe('isRecord', () => {
	it('accepts an object with named keys', () => {
		expect(isRecord({ servers: {} })).toBe(true)
	})

	// `typeof null` is `'object'`, and a JSON document whose whole content is `null` parses to it.
	it('rejects null', () => {
		expect(isRecord(null)).toBe(false)
	})

	// An array is an object too, and a TOML array of tables reaches these readers as one.
	it('rejects an array', () => {
		expect(isRecord([{ command: 'npx' }])).toBe(false)
	})

	it('rejects a scalar', () => {
		expect(isRecord('npx')).toBe(false)
	})
})
