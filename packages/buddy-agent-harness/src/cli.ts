import { readFileSync } from 'node:fs'
import { cli } from 'clibuilder'
import { encode, errorOutput, exitCodes, type Format, formats, homeHeader, result } from 'clibuilder/axi'
import { syncCommand } from './copy-sync/sync.command.ts'
import { depPluginsCommand } from './dep-plugins/dep-plugins.command.ts'
import { diagnoseReport, doctorCommand } from './diagnose-bridges/doctor.command.ts'
import { governanceCommand } from './governance-overrides/governance.command.ts'
import { initCommand } from './initialize-harnesses/init.command.ts'
import { mcpCommand } from './project-mcp/mcp.command.ts'
import { referenceCommand } from './references/references.ts'

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
	commands: [
		initCommand,
		syncCommand,
		doctorCommand,
		mcpCommand,
		depPluginsCommand,
		referenceCommand,
		governanceCommand,
	],
}

// A factory, not a module-level constant: `cli()` builds state, and state built at import time
// would be shared by every later call in the process.
function app(format: 'toon' | 'text') {
	const [first, ...rest] = rootCommand.commands
	// AXI §8: a bare invocation shows live data, not a manual — the doctor report, under the home header.
	return rest.reduce(
		(builder, command) => builder.command(command),
		cli({ name: rootCommand.name, version, description: rootCommand.description, format })
			.default({
				description: "Report whether this repository's harness bridges resolve (the same as `doctor`).",
				options: doctorCommand.options as NonNullable<typeof doctorCommand.options>,
				async run(args) {
					const { bin: _bin, ...report } = await diagnoseReport({ root: args['root'], harness: args['harness'] })
					return result({ ...homeHeader({ description: rootCommand.description }), ...report })
				},
			})
			.command(first),
	)
}

const textByDefault: Record<string, readonly string[]> = {
	reference: ['load', 'create', 'delete'],
	governance: ['show'],
}

/**
 * `reference load|create|delete` and `governance show` answer in `text` unless `--format` says
 * otherwise; every other command answers in `toon`. clibuilder has one global `--format` default,
 * so it is chosen from the command the argv names.
 */
export function defaultFormat(argv: string[]): 'toon' | 'text' {
	const args = argv.slice(2)
	if (args.some((arg) => arg === '--format' || arg.startsWith('--format='))) return 'toon'
	const [group, subcommand] = args
	return group !== undefined && subcommand !== undefined && textByDefault[group]?.includes(subcommand) ? 'text' : 'toon'
}

/** The format the caller asked for, or the command's default where `--format` names none clibuilder accepts. */
function callerFormat(argv: string[]): Format {
	const args = argv.slice(2)
	const index = args.findIndex((arg) => arg === '--format' || arg.startsWith('--format='))
	const flag = args[index]
	const value = flag?.startsWith('--format=') ? flag.slice('--format='.length) : args[index + 1]
	return formats.find((format) => format === value) ?? defaultFormat(argv)
}

/**
 * The application boundary: argv in, exit code out — returned rather than written, so a caller that
 * is not the process (a skill launcher, a test) can act on it.
 */
export async function run(argv: string[]): Promise<number> {
	try {
		const code = await app(defaultFormat(argv)).parse<number | undefined>(argv)
		return typeof code === 'number' ? code : exitCodes.success
	} catch (error) {
		// A throw clibuilder did not handle still answers as every command's failure does: coded, on
		// stdout, in the caller's format, so a program parsing stdout never meets one it cannot read.
		const message = error instanceof Error && error.message ? error.message : `${rootCommand.name} failed unexpectedly.`
		const report = errorOutput({
			message,
			code: 'command-failed',
			help: [
				'Re-run the command; if it fails again, report it at https://github.com/repobuddy/buddy-agent-harness/issues with the command you ran.',
			],
		})
		process.stdout.write(`${encode(report, callerFormat(argv))}\n`)
		return exitCodes.error
	}
}
