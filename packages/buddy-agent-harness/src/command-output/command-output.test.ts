import { sep } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { binPath, parseFormat, renderText, writeResult } from './command-output.ts'

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

beforeEach(() => {
	stdout.mockClear()
})

describe('parseFormat', () => {
	it('accepts every supported format', () => {
		expect(parseFormat('toon')).toBe('toon')
		expect(parseFormat('json')).toBe('json')
		expect(parseFormat('text')).toBe('text')
	})

	it('rejects anything else rather than falling back silently', () => {
		expect(() => parseFormat('yaml')).toThrow('--format must be toon, json, or text.')
		expect(() => parseFormat(undefined)).toThrow('--format must be toon, json, or text.')
	})
})

describe('writeResult', () => {
	it('encodes TOON, JSON, and text on stdout', () => {
		writeResult({ skills: 1 }, 'toon')
		expect(stdout).toHaveBeenCalledWith('skills: 1\n')

		writeResult({ skills: 1 }, 'json')
		expect(stdout).toHaveBeenCalledWith('{"skills":1}\n')

		writeResult({ skills: 1 }, 'text')
		expect(stdout).toHaveBeenCalledWith('skills: 1\n')
	})
})

describe('renderText', () => {
	it('aligns a list of records into a table under its key', () => {
		expect(
			renderText({
				bridges: [
					{ harness: 'claude-code', path: '.claude/skills', status: 'ok' },
					{ harness: 'gemini-cli', path: '.gemini/skills', status: 'degraded' },
				],
			}),
		).toBe(
			[
				'bridges:',
				'  harness      path            status',
				'  claude-code  .claude/skills  ok',
				'  gemini-cli   .gemini/skills  degraded',
			].join('\n'),
		)
	})

	it('leaves a cell blank where a record is missing that column', () => {
		expect(renderText({ rows: [{ a: 'one', b: 'two' }, { a: 'three' }] })).toBe(
			['rows:', '  a      b', '  one    two', '  three'].join('\n'),
		)
	})

	it('bullets a list of primitives and marks an empty one', () => {
		expect(renderText({ linked: ['claude-code', 'gemini-cli'], deprecated: [] })).toBe(
			['linked:', '  - claude-code', '  - gemini-cli', '', 'deprecated: (none)'].join('\n'),
		)
	})

	it('renders scalars as key and value, and a nested object as JSON', () => {
		expect(renderText({ skills: 0, copied: false, meta: { a: 1 } })).toBe(
			['skills: 0', 'copied: false', 'meta: {"a":1}'].join('\n'),
		)
	})

	// Without the gap a following scalar reads as one more row of the table above it.
	it('separates a multi-line block from its neighbours but keeps scalars together', () => {
		expect(renderText({ bin: '~/bin/bah', help: ['run this'], done: true })).toBe(
			['bin: ~/bin/bah', '', 'help:', '  - run this', '', 'done: true'].join('\n'),
		)
	})
})

describe('binPath', () => {
	it('collapses the home directory', () => {
		expect(binPath(`${sep}home${sep}dev`, `${sep}home${sep}dev${sep}.local${sep}bin${sep}bah`)).toBe(
			`~${sep}.local${sep}bin${sep}bah`,
		)
	})

	it('leaves a path outside the home directory alone', () => {
		expect(binPath(`${sep}home${sep}dev`, `${sep}usr${sep}bin${sep}bah`)).toBe(`${sep}usr${sep}bin${sep}bah`)
		expect(binPath('', `${sep}usr${sep}bin${sep}bah`)).toBe(`${sep}usr${sep}bin${sep}bah`)
	})

	it('falls back to the package name when the executable is unknown', () => {
		expect(binPath(`${sep}home${sep}dev`, undefined)).toBe('buddy-agent-harness')
	})
})
