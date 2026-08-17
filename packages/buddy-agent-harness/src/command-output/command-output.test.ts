import { sep } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { binPath, parseFormat, writeResult } from './command-output.ts'

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

beforeEach(() => {
	stdout.mockClear()
})

describe('parseFormat', () => {
	it('accepts the two supported formats', () => {
		expect(parseFormat('toon')).toBe('toon')
		expect(parseFormat('json')).toBe('json')
	})

	it('rejects anything else rather than falling back silently', () => {
		expect(() => parseFormat('yaml')).toThrow('--format must be toon or json.')
		expect(() => parseFormat(undefined)).toThrow('--format must be toon or json.')
	})
})

describe('writeResult', () => {
	it('encodes TOON and JSON on stdout', () => {
		writeResult({ skills: 1 }, 'toon')
		expect(stdout).toHaveBeenCalledWith('skills: 1\n')

		writeResult({ skills: 1 }, 'json')
		expect(stdout).toHaveBeenCalledWith('{"skills":1}\n')
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
