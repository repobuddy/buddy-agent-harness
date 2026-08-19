import { readFileSync } from 'node:fs'
import { cli, exitCodes } from 'clibuilder'
import { doctorCommand } from './diagnose-bridges/doctor.command.ts'
import { initCommand } from './initialize-harnesses/init.command.ts'

/**
 * Read from the manifest rather than restated here: a version written into this call is a second
 * home for a number that already has one, and it stayed at `0.1.0` for five minor releases.
 *
 * `../package.json` resolves from `src/cli.ts` and from the bundled `dist/cli.mjs` alike — both sit
 * one directory under the package root.
 */
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version as string

/**
 * A factory rather than a module-level constant: `cli()` builds state, and state built at import
 * time is shared by every later call in the process.
 */
function app() {
	return cli({
		name: 'buddy-agent-harness',
		version,
		description: 'Initialize agent harness skill compatibility in consumer repositories.',
	})
		.command(initCommand)
		.command(doctorCommand)
}

/**
 * The application boundary: argv in, exit code out, nothing read from or written to the process.
 *
 * The exit code is returned rather than written so that a caller which is not the process — a skill
 * launcher, a test — can run a command and learn how it went. `bin/buddy-agent-harness.mjs` is the
 * only place that turns the returned code back into a process outcome.
 *
 * One exit path this return cannot carry: `clibuilder` answers an unknown option or an unknown
 * command by printing help and writing `process.exitCode` itself, returning nothing. `run` reports
 * `0` there, which is why `bin` and the launchers apply the returned code only when it is non-zero.
 */
export async function run(argv: string[]): Promise<number> {
	try {
		const code = await app().parse<number | undefined>(argv)
		return typeof code === 'number' ? code : exitCodes.success
	} catch (error) {
		// stderr, not stdout: `doctor`'s default output is TOON that an agent parses, and an error
		// line on that stream lands in the middle of what it is parsing.
		process.stderr.write(`error: ${error instanceof Error ? error.message : 'Invalid command.'}\n`)
		return exitCodes.usage
	}
}
