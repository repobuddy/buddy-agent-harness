import { sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { displayBinPath } from './command-output.ts'

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
