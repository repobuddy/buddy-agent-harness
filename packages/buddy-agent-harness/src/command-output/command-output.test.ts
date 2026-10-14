import { sep } from 'node:path'
import { CliError, exitCodes, result } from 'clibuilder/axi'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { answerThenFail, collapseHome, displayBinPath, fail } from './command-output.ts'

const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

beforeEach(() => {
	stdout.mockClear()
	stderr.mockClear()
})

describe('fail', () => {
	it('writes the message to stderr and fails the cli with the error code, already reported', () => {
		const thrown = catchError(() => fail(new Error('boom'), 'fallback'))

		expect(stderr).toHaveBeenCalledWith('error: boom\n')
		expect(thrown).toBeInstanceOf(CliError)
		expect((thrown as CliError).exitCode).toBe(exitCodes.error)
		expect(stdout).not.toHaveBeenCalled()
	})

	it('falls back to its own message for a throw that is not an Error', () => {
		catchError(() => fail('boom', 'Diagnosis failed.'))

		expect(stderr).toHaveBeenCalledWith('error: Diagnosis failed.\n')
	})

	it('rethrows a CliError without writing it again', () => {
		const error = new CliError('already coded', { code: 'coded' })

		expect(catchError(() => fail(error, 'fallback'))).toBe(error)
		expect(stderr).not.toHaveBeenCalled()
	})
})

describe('answerThenFail', () => {
	it('prints the answer on stdout in the format, then fails with the error code', () => {
		const thrown = catchError(() => answerThenFail(result({ outcome: 'would-change' }), 'json'))

		expect(stdout).toHaveBeenCalledWith('{"outcome":"would-change"}\n')
		expect((thrown as CliError).exitCode).toBe(exitCodes.error)
		expect(stderr).not.toHaveBeenCalled()
	})
})

describe('answerThenFail without an answer to print', () => {
	it('still fails, and prints nothing', () => {
		const thrown = catchError(() => answerThenFail(undefined as never, 'json'))

		expect(stdout).not.toHaveBeenCalled()
		expect((thrown as CliError).exitCode).toBe(exitCodes.error)
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

function catchError(fn: () => unknown): unknown {
	try {
		fn()
	} catch (error) {
		return error
	}
	throw new Error('expected a throw')
}
