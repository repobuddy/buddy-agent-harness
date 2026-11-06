import { sep } from 'node:path'
import { type Answer, CliError, exitCodes, type Format, isCliError, printAnswer } from 'clibuilder/axi'
import { type HarnessName, parseHarnesses } from '../harness-registry/harness-registry.ts'

/**
 * AXI §6: a failure is a coded error on stdout, in the caller's format, with a `help` line saying
 * what to do next. A `CliError` the command already built is rethrown untouched; anything else
 * becomes `command-failed`, exit code 1.
 */
export function fail(error: unknown, fallback: string, help?: string): never {
	if (isCliError(error)) throw error
	throw new CliError(error instanceof Error ? error.message : fallback, {
		code: 'command-failed',
		exitCode: exitCodes.error,
		...(help ? { help } : {}),
		cause: error,
	})
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

/**
 * `parseHarnesses` for a command's `--harness`: an unsupported name is a usage error, exit code 2.
 * The registry stays free of clibuilder, which the library entry treats as an optional peer.
 */
export function parseHarnessOption(value: string | undefined): HarnessName[] {
	try {
		return parseHarnesses(value)
	} catch (error) {
		throw new CliError((error as Error).message, {
			code: 'unsupported-harness',
			exitCode: exitCodes.usage,
			help: 'Pass --harness as a comma-separated list of the supported names.',
			cause: error,
		})
	}
}
