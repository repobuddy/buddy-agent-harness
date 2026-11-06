import type { cli } from 'clibuilder'
import { type CliError, type Format, isCliError, printAnswer, result } from 'clibuilder/axi'

type Run = (this: { format: Format }, args: never) => unknown

function runOf(command: cli.Command): Run {
	return (command as unknown as { run: Run }).run
}

function finish(answer: unknown, format: Format): number {
	const text = printAnswer(answer, format)
	if (text !== undefined) process.stdout.write(text)
	return 0
}

/** What the cli prints on stdout for a thrown `CliError`: `error`, `code`, the details, then `help`. */
function printError(error: CliError, format: Format): void {
	const report = {
		error: error.message,
		code: error.code,
		...error.details,
		...(error.help.length ? { help: error.help } : {}),
	}
	const text = printAnswer(result(report), format)
	if (text !== undefined) process.stdout.write(text)
}

function reported(error: unknown, format: Format): number {
	if (!isCliError(error)) throw error
	// `CliError.reported()` carries the default code and renders nothing: its answer was already printed.
	if (error.code !== 'error') printError(error, format)
	return error.exitCode
}

/**
 * Runs a command's `run()` the way the cli does: with `this.format`, printing the answer it returns,
 * printing a thrown `CliError` as the cli does, and resolving to the exit code it carries. Tests that call `run` directly would
 * otherwise see neither.
 */
export async function runCommand(command: cli.Command, args: object, format: Format = 'json'): Promise<number> {
	try {
		return finish(await runOf(command).call({ format }, args as never), format)
	} catch (error) {
		return reported(error, format)
	}
}

/** `runCommand` for a command whose `run()` is synchronous. */
export function runCommandSync(command: cli.Command, args: object, format: Format = 'json'): number {
	try {
		return finish(runOf(command).call({ format }, args as never), format)
	} catch (error) {
		return reported(error, format)
	}
}
