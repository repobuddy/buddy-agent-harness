import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cli, exitCodes } from 'clibuilder'
import { createReferenceCommands } from './reference.command.ts'

// A factory, not a module-level constant: `cli()` builds state, and state built at import time
// would be shared by every later call in the process.
function app() {
	const manifest = new URL('../package.json', import.meta.url)
	const { name, version } = JSON.parse(readFileSync(manifest, 'utf8')) as { name: string; version: string }
	const { show, list, search, where, create } = createReferenceCommands({
		plugin: { name, root: dirname(fileURLToPath(manifest)) },
	})
	return cli({
		name,
		version,
		description:
			'Read on-demand reference documents by name, layered across the managed, project, user, and plugin tiers.',
	})
		.command(show)
		.command(list)
		.command(search)
		.command(where)
		.command(create)
}

/** argv in, exit code out — returned rather than written, so a caller that is not the process can act on it. */
export async function run(argv: string[]): Promise<number> {
	try {
		const code = await app().parse<number | undefined>(argv)
		return typeof code === 'number' ? code : exitCodes.success
	} catch (error) {
		// stderr, not stdout — stdout carries TOON an agent parses.
		process.stderr.write(`error: ${error instanceof Error ? error.message : 'Invalid command.'}\n`)
		return exitCodes.usage
	}
}
