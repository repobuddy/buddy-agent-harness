import { sep } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collapseHome, displayBinPath, parseFormat, renderText, writeDocument, writeResult } from './command-output.ts'

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

		// Nothing else reaches the stream: one call per write, so a second writer would show up here.
		expect(stdout).toHaveBeenCalledTimes(3)
	})
})

describe('writeDocument', () => {
	// A rule set an agent is about to follow is the answer, not a value to encode: run through TOON or
	// through the text renderer it comes back as one escaped line.
	it('writes a document verbatim, with no encoding around it', () => {
		writeDocument('# Rules\n\nState the zero.\n')

		expect(stdout).toHaveBeenCalledWith('# Rules\n\nState the zero.\n')
		expect(stdout).toHaveBeenCalledTimes(1)
	})

	it('ends the stream on a newline even when the document does not', () => {
		writeDocument('# Rules')

		expect(stdout).toHaveBeenCalledWith('# Rules\n')
	})
})

describe('collapseHome', () => {
	it('collapses the home directory out of any path, not only the executable', () => {
		expect(collapseHome(`${sep}home${sep}dev`, `${sep}home${sep}dev${sep}.agents${sep}governances`)).toBe(
			`~${sep}.agents${sep}governances`,
		)
		expect(collapseHome(`${sep}home${sep}dev`, `${sep}etc${sep}governances`)).toBe(`${sep}etc${sep}governances`)
		expect(collapseHome('', `${sep}etc${sep}governances`)).toBe(`${sep}etc${sep}governances`)
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

describe('displayBinPath', () => {
	it('collapses the home directory', () => {
		expect(displayBinPath(`${sep}home${sep}dev`, `${sep}home${sep}dev${sep}.local${sep}bin${sep}bah`)).toBe(
			`~${sep}.local${sep}bin${sep}bah`,
		)
	})

	it('leaves a path outside the home directory alone', () => {
		expect(displayBinPath(`${sep}home${sep}dev`, `${sep}usr${sep}bin${sep}bah`)).toBe(`${sep}usr${sep}bin${sep}bah`)
		expect(displayBinPath('', `${sep}usr${sep}bin${sep}bah`)).toBe(`${sep}usr${sep}bin${sep}bah`)
	})

	it('falls back to the package name when the executable is unknown', () => {
		expect(displayBinPath(`${sep}home${sep}dev`, undefined)).toBe('buddy-agent-harness')
	})
})
