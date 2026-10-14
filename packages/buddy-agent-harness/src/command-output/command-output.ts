import { sep } from 'node:path'
import { type Answer, CliError, exitCodes, type Format, isCliError, printAnswer } from 'clibuilder/axi'

/**
 * Reports a failure on stderr, not stdout — stdout carries what an agent parses — and fails the cli
 * with the exit code. A `CliError` the cli already reports is rethrown untouched.
 */
export function fail(error: unknown, fallback: string): never {
	if (isCliError(error)) throw error
	process.stderr.write(`error: ${error instanceof Error ? error.message : fallback}\n`)
	throw CliError.reported(exitCodes.error)
}

/**
 * An answer that comes with a failing exit code. The cli prints only an answer a command returns, and
 * a thrown error replaces the return, so the answer is printed first.
 */
export function answerThenFail<T>(answer: Answer<T>, format: Format): never {
	const text = printAnswer(answer, format)
	if (text !== undefined) process.stdout.write(text)
	throw CliError.reported(exitCodes.error)
}

/**
 * AXI §10: collapses the home directory to `~` so a path in a report is portable to another
 * machine.
 */
export function collapseHome(home: string, path: string): string {
	return home && path.startsWith(home + sep) ? `~${path.slice(home.length)}` : path
}

export function displayBinPath(home: string, executable: string | undefined): string {
	return executable ? collapseHome(home, executable) : 'buddy-agent-harness'
}
