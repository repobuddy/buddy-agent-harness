import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { ReferenceLayer, ReferenceTier } from './reference-layers.ts'
import { layersFor, type ReferenceName, type ResolvedReference, resolveReference } from './resolve-reference.ts'

export type ReferenceWhereSlot = {
	/** The tier, `plugin <name>` for a plugin's copy, or `caller` for the calling skill's own copy. */
	layer: string
	path: string
	status: string
	scope: string
}

export type ReferenceWhereReport = {
	name: string
	/** What a project path is relative to. */
	root: string
	slots: ReferenceWhereSlot[]
	merge: string
	/** The `<plugin>/<name>` choices when two plugins hold the name. */
	plugins?: string[]
	warnings?: string[]
}

export type WhereOptions = {
	/** Absolute; what a project path in the report is relative to. */
	root: string
	/** Absolute folder of the skill that loads the reference, so its own copy is reported as Load reads it. */
	caller?: string | undefined
	/** How a path outside the project is shown, such as with the home directory collapsed to `~`. */
	display?: ((path: string) => string) | undefined
}

/** Managed is left out: writing there needs an admin, and most of it cannot be read locally. */
const slotScopes: Partial<Record<ReferenceTier, string>> = {
	project: 'everyone working in this repository',
	user: 'only you, in every repository',
	plugin: 'read-only; override it with the project or user file',
}

const callerScope = "read-only; the calling skill's own copy, read only when no layer holds the name"

const mergeNote =
	'The default, first-wins, makes the override replace the whole document. Set `merge: merge-sections` in its frontmatter to keep the sections it does not redefine.'

function slotStatus(outcome: string): string {
	if (outcome === 'missing') return 'empty'
	return outcome.startsWith('shadowed') ? 'shadowed' : outcome
}

/** Where Load reads the caller's copy when no layer holds the name, in the order it tries them. */
function callerCopy(caller: string, name: string): string | undefined {
	return [join(caller, 'references', `${name}.md`), join(caller, 'references', 'governances', `${name}.md`)].find(
		(path) => existsSync(path),
	)
}

function callerStatus(resolved: ResolvedReference): string {
	if (resolved.status === 'missing') return 'used'
	return resolved.status === 'ambiguous' ? 'not read — the name is ambiguous' : 'shadowed'
}

/** The project and user files an override of `name` can be written to, highest precedence first. */
export function whereReference(
	name: ReferenceName,
	layers: readonly ReferenceLayer[],
	{ root, caller, display = (path) => path }: WhereOptions,
): ReferenceWhereReport {
	const resolved = resolveReference(name, layers, { display })
	const traced = layersFor(name, layers)
	const slots: ReferenceWhereSlot[] = []
	for (const [index, step] of resolved.trace.entries()) {
		const layer = traced[index] as ReferenceLayer
		const scope = slotScopes[step.tier]
		// A legacy folder or a plugin is never a place to write, so it shows only while it holds a copy.
		if (!scope || ((layer.status || step.tier === 'plugin') && !step.found)) continue
		const path = step.found ? step.path : join(layer.dir, `${name.name}.md`)
		slots.push({
			layer: step.tier === 'plugin' ? `plugin ${step.plugin}` : step.tier,
			path: step.tier === 'project' ? relative(root, path) : display(path),
			status: slotStatus(step.outcome),
			scope,
		})
	}
	const copy = caller === undefined ? undefined : callerCopy(caller, name.name)
	if (copy) {
		slots.push({ layer: 'caller', path: display(copy), status: callerStatus(resolved), scope: callerScope })
	}
	const report: ReferenceWhereReport = { name: name.name, root: display(root), slots, merge: mergeNote }
	if (resolved.status === 'ambiguous') report.plugins = resolved.plugins
	if (resolved.warnings.length) report.warnings = resolved.warnings
	return report
}
