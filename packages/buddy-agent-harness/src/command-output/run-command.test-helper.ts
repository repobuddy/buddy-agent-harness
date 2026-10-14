import type { cli } from 'clibuilder'
import { type Format, isCliError, printAnswer } from 'clibuilder/axi'

type Run = (this: { format: Format }, args: never) => unknown

function runOf(command: cli.Command): Run {
	return (command as unknown as { run: Run }).run
}

function finish(answer: unknown, format: Format): number {
	const text = printAnswer(answer, format)
	if (text !== undefined) process.stdout.write(text)
	return 0
}

function reported(error: unknown): number {
	if (isCliError(error)) return error.exitCode
	throw error
}

/**
 * Runs a command's `run()` the way the cli does: with `this.format`, printing the answer it returns,
 * and resolving to the exit code a thrown `CliError` carries. Tests that call `run` directly would
 * otherwise see neither.
 */
export async function runCommand(command: cli.Command, args: object, format: Format = 'json'): Promise<number> {
	try {
		return finish(await runOf(command).call({ format }, args as never), format)
	} catch (error) {
		return reported(error)
	}
}

/** `runCommand` for a command whose `run()` is synchronous. */
export function runCommandSync(command: cli.Command, args: object, format: Format = 'json'): number {
	try {
		return finish(runOf(command).call({ format }, args as never), format)
	} catch (error) {
		return reported(error)
	}
}
