import { homedir } from 'node:os'
import { resolve } from 'node:path'
import type { cli } from 'clibuilder'
import { command, exitCodes, z } from 'clibuilder'
import { parseFormat, writeResult } from '../command-output/command-output.ts'
import { CATALOG_DIR, CATALOG_PATH, catalogStatus, deriveCatalog, type WriteOutcome, writeCatalog } from './generate.ts'
import { COPILOT_LIMITATION, type PluginRuntime, runtimes } from './harness-plugins.ts'
import { type Action, reconcile } from './reconcile.ts'

export type DepPluginsReport = {
	catalog: string
	marketplace: string
	outcome: WriteOutcome | 'would-change' | 'current'
	/** Always emitted, so a healthy run states its zero rather than leaving a reader to infer it. */
	plugins: { name: string; package: string; version: string }[] | string
	/** Every runtime detected on this machine, and whether it matches the catalog. */
	harness: { runtime: string; status: string }[] | string
	/**
	 * What each runtime needs in order to match the catalog, and the command that does it. Reported
	 * rather than run: this writes outside the repository, and a generation step should not reach into
	 * a developer's harness state without being asked.
	 *
	 * One flat row per action rather than actions nested under each runtime: a uniform record renders
	 * as a table in both TOON and text, where a nested array collapses into a JSON blob.
	 */
	actions: { runtime: string; do: string; subject: string; why: string }[] | string
	notes?: string[]
	help?: string[]
}

/** The command that performs one action, so a reader is not left to look the verb up per runtime. */
function commandFor(runtime: PluginRuntime, action: Action, marketplace: string): string {
	switch (action.kind) {
		case 'register':
			return runtime.register(CATALOG_DIR)
		case 'install':
			return runtime.install(action.subject)
		case 'update': {
			// Where a runtime caches the catalog it has to be refreshed first, or the update reinstalls
			// the version already cached rather than the one the catalog now pins. Codex re-reads a local
			// catalog on every add and needs no such step, so it declares no refresh command.
			const refresh = runtime.refreshMarketplace(marketplace)
			const update = runtime.update(action.subject)
			return refresh ? `${refresh} && ${update}` : update
		}
		case 'uninstall':
			return runtime.uninstall(action.subject)
	}
}

/**
 * Notes name the conditions a caller cannot see from the entry list and would otherwise discover as a
 * failure later — a dependency that is declared but absent, a marketplace name two repositories are
 * likely to share, a resolver under which no dependency has a directory at all.
 */
function notesFor(derived: ReturnType<typeof deriveCatalog>): string[] {
	const notes: string[] = []
	if (derived.pnp) {
		notes.push(
			'Yarn Plug’n’Play is active: dependencies live inside zip archives, so no harness can install from them. Set nodeLinker: node-modules, or unplug the plugin dependencies.',
		)
	}
	if (derived.genericName) {
		notes.push(
			`Marketplace name "${derived.catalog.name}" is generic. Registering a second marketplace under a name already in use replaces the first silently, and the install that follows reports "already installed" — the repository then runs the other one's versions.`,
		)
	}
	for (const { package: pkg } of derived.unresolved) {
		notes.push(`Declared dependency "${pkg}" is not installed; install dependencies before generating.`)
	}
	return notes
}

export const depPluginsCommand: cli.Command = command({
	name: 'dep-plugins',
	description:
		'Derive the marketplace catalog for plugins shipped by this repository’s dependencies, so a harness can install them. Writes the catalog; installing is the harness’s own job.',
	options: {
		root: {
			description: 'Repository directory. Defaults to the current directory.',
			type: z.optional(z.string()),
		},
		check: {
			description: 'Report whether the catalog is current without writing it. For CI and postinstall.',
			type: z.optional(z.boolean()),
		},
		format: {
			description: 'Output format: toon (default), json, or text for a human-readable report.',
			type: z.optional(z.string()),
			default: 'toon',
		},
	},
	run(args) {
		try {
			const format = parseFormat(args.format)
			const root = args.root ?? process.cwd()
			const derived = deriveCatalog(root)

			// `--check` compares without touching the disk, so it is safe from a postinstall hook and from
			// CI, where the question is only whether the committed catalog still matches the declared
			// dependencies.
			const outcome = args.check
				? catalogStatus(root, derived.catalog) === 'unchanged'
					? ('current' as const)
					: ('would-change' as const)
				: writeCatalog(root, derived.catalog)

			// Read-only, and against each harness's own state files rather than its CLI: asking a runtime
			// what it has should not depend on that runtime being launchable from here. Only runtimes
			// actually set up on this machine are reported, so a report names work a reader can do.
			const home = homedir()
			const notes = notesFor(derived)
			const detected = runtimes.filter((candidate) => candidate.present(home))
			const harness: { runtime: string; status: string }[] = []
			const actions: { runtime: string; do: string; subject: string; why: string }[] = []

			for (const runtime of detected) {
				const state = runtime.state(home)
				const delta = reconcile({
					catalog: derived.catalog,
					catalogDir: CATALOG_DIR,
					root: resolve(root),
					installed: state.installed,
					marketplaces: state.marketplaces,
					scoped: runtime.scoped,
				})
				if (delta.collision) {
					notes.push(
						`${runtime.name}: marketplace "${derived.catalog.name}" is already registered against ${delta.collision}. Registering over it replaces the other repository's silently, and the install that follows reports "already installed" — rename this repository's marketplace instead.`,
					)
				}
				harness.push({
					runtime: runtime.name,
					status: delta.actions.length ? `${delta.actions.length} to apply` : 'in sync',
				})
				for (const action of delta.actions) {
					actions.push({
						runtime: runtime.name,
						do: commandFor(runtime, action, derived.catalog.name),
						subject: action.subject,
						why: action.detail,
					})
				}
			}
			if (derived.plugins.length) notes.push(COPILOT_LIMITATION)

			const report: DepPluginsReport = {
				catalog: CATALOG_PATH,
				marketplace: derived.catalog.name,
				outcome,
				plugins: derived.plugins.length
					? derived.plugins.map(({ plugin, package: pkg, version }) => ({ name: plugin, package: pkg, version }))
					: '0 dependencies ship a plugin — nothing to install',
				harness: harness.length ? harness : 'no supported harness detected on this machine',
				actions: actions.length ? actions : '0 actions — every detected harness matches the catalog',
				...(notes.length ? { notes } : {}),
			}
			writeResult(report, format)

			// A stale catalog under `--check` is the one failure this command reports through its exit
			// code, because that is the whole question the flag asks. Everything else the report carries.
			return outcome === 'would-change' ? exitCodes.error : exitCodes.success
		} catch (error) {
			process.stderr.write(`error: ${error instanceof Error ? error.message : 'Catalog generation failed.'}\n`)
			return exitCodes.error
		}
	},
})
