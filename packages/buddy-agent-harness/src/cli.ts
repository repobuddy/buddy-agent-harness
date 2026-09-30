import { readFileSync } from 'node:fs'
import { cli, exitCodes } from 'clibuilder'
import { depPluginsCommand } from './dep-plugins/dep-plugins.command.ts'
import { doctorCommand } from './diagnose-bridges/doctor.command.ts'
import { governanceCommand } from './governance-overrides/governance.command.ts'
import { initCommand } from './initialize-harnesses/init.command.ts'
import { mcpCommand } from './project-mcp/mcp.command.ts'
import { referenceCommand } from './references/reference.command.ts'

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

/** Exported for `scripts/generate-llms-txt.ts`, which lists the CLI from it; `app()` must stay built from it. */
export const rootCommand: { name: string; description: string; commands: readonly [cli.Command, ...cli.Command[]] } = {
	name: 'buddy-agent-harness',
	description: 'Initialize agent harness skill compatibility in consumer repositories.',
	commands: [initCommand, doctorCommand, mcpCommand, depPluginsCommand, referenceCommand, governanceCommand],
}

// A factory, not a module-level constant: `cli()` builds state, and state built at import time
// would be shared by every later call in the process.
function app() {
	const [first, ...rest] = rootCommand.commands
	return rest.reduce(
		(builder, command) => builder.command(command),
		cli({ name: rootCommand.name, version, description: rootCommand.description }).command(first),
	)
}

/**
 * The application boundary: argv in, exit code out — returned rather than written, so a caller that
 * is not the process (a skill launcher, a test) can act on it.
 */
export async function run(argv: string[]): Promise<number> {
	try {
		const code = await app().parse<number | undefined>(argv)
		return typeof code === 'number' ? code : exitCodes.success
	} catch (error) {
		// stderr, not stdout — stdout carries TOON an agent parses; an error there would land
		// mid-parse.
		process.stderr.write(`error: ${error instanceof Error ? error.message : 'Invalid command.'}\n`)
		return exitCodes.usage
	}
}
