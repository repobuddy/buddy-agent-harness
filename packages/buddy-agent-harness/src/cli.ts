import { readFileSync } from 'node:fs'
import { cli, exitCodes } from 'clibuilder'
import { depPluginsCommand } from './dep-plugins/dep-plugins.command.ts'
import { doctorCommand } from './diagnose-bridges/doctor.command.ts'
import { governanceCommand } from './governance-overrides/governance.command.ts'
import { initCommand } from './initialize-harnesses/init.command.ts'

/**
 * `../package.json` resolves from both `src/cli.ts` and the bundled `dist/cli.mjs` — one directory
 * under the package root — but not from a skill-script bundle, shipped deeper with no package tree
 * beside it; that build defines `__PACKAGE_VERSION__` as a literal instead. `typeof` is safe against
 * an identifier no other build declares — it reads `'undefined'` rather than throwing.
 */
declare const __PACKAGE_VERSION__: string | undefined
const version =
	typeof __PACKAGE_VERSION__ !== 'undefined'
		? __PACKAGE_VERSION__
		: (JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version as string)

// A factory, not a module-level constant: `cli()` builds state, and state built at import time
// would be shared by every later call in the process.
function app() {
	return cli({
		name: 'buddy-agent-harness',
		version,
		description: 'Initialize agent harness skill compatibility in consumer repositories.',
	})
		.command(initCommand)
		.command(doctorCommand)
		.command(depPluginsCommand)
		.command(governanceCommand)
}

/**
 * The application boundary: argv in, exit code out — returned rather than written, so a caller that
 * is not the process (a skill launcher, a test) can act on it.
 */
export async function run(argv: string[]): Promise<number> {
	try {
		const code = await app().parse<number | undefined>(argv)
		// clibuilder answers an unknown option/command by printing help and writing `process.exitCode`
		// itself, returning nothing — `run` reports 0 there, so a caller applies this only when
		// non-zero.
		return typeof code === 'number' ? code : exitCodes.success
	} catch (error) {
		// stderr, not stdout — stdout carries TOON an agent parses; an error there would land
		// mid-parse.
		process.stderr.write(`error: ${error instanceof Error ? error.message : 'Invalid command.'}\n`)
		return exitCodes.usage
	}
}
