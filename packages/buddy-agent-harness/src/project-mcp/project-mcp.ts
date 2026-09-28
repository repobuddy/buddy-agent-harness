import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import type { Position } from '../diagnose-bridges/locator.ts'
import {
	formatProjectionRecord,
	McpBaseline,
	type McpDirection,
	parseProjectionRecord,
	projectionRecordPath,
} from '../diagnose-mcp/mcp-baseline.ts'
import { divergingFields, type McpServer } from '../diagnose-mcp/mcp-model.ts'
import { credentialFields } from '../diagnose-mcp/mcp-secrets.ts'
import { goldenSetPath, mcpTargets, parseGoldenSet, parseTarget } from '../diagnose-mcp/mcp-sources.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { mcpDialects } from '../mcp-dialects/mcp-dialects.ts'
import { appendServer, createFile, type McpEntry, renderEntry, replaceServer } from './mcp-edit.ts'

/**
 * `add` and `update` are what the command writes; `edit` is a change it will not make itself and
 * hands over as text; `skip` and `refuse` write nothing.
 */
export type ProjectionAction = 'add' | 'update' | 'edit' | 'skip' | 'refuse'

export type ProjectionRow = { target: string; server: string; action: ProjectionAction; detail: string }

/**
 * Every row that changes a server, with the entry as it would read in the target — the after to
 * show beside the file as it stands, and for an `edit` the text to apply by hand.
 */
export type ProjectionEntry = { target: string; server: string; action: ProjectionAction; entry: string }

export type ProjectionPlan =
	| { kind: 'absent' }
	| { kind: 'unreadable'; position?: Position | undefined }
	| { kind: 'planned'; rows: ProjectionRow[]; entries: ProjectionEntry[]; written: boolean }

export type ProjectMcpOptions = {
	root: string
	git: GitBridgeState
	/** Apply the plan and write the last-projected record; without it nothing on disk changes. */
	write: boolean
}

function read(root: string, path: string): string | undefined {
	const absolute = join(root, path)
	return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}

const moved: Record<Exclude<McpDirection, 'golden'>, string> = {
	target: 'the target changed since the last projection — reconcile it into the golden set first',
	both: 'both sides changed since the last projection — a three-way conflict for a person to settle',
	unknown: 'no baseline says which side changed — compare the two by hand',
}

/** The worst direction among the diverged fields: one field the target moved is enough to hold back. */
function heldBack(directions: McpDirection[]): Exclude<McpDirection, 'golden'> | undefined {
	return (['both', 'unknown', 'target'] as const).find((direction) => directions.includes(direction))
}

type TargetPlan = {
	config: McpConfig
	source: string | undefined
	servers: Map<string, McpServer>
	/** The file did not exist before this run; every server in it is part of creating it. */
	created: boolean
	/** Servers whose target copy agrees with the golden set once this plan is applied. */
	agreed: Map<string, McpServer>
}

/**
 * Projects the golden set into every enabled harness's MCP file. Only a server the golden set is
 * plainly ahead on is written — absent from the target, or changed on the golden side alone. A
 * target-side change is never overwritten: that is reconcile's, and needs a person.
 */
export function projectMcp({ root, git, write }: ProjectMcpOptions): ProjectionPlan {
	const golden = parseGoldenSet(read(root, goldenSetPath))
	if (golden.kind !== 'servers') return golden

	const record = parseProjectionRecord(read(root, projectionRecordPath))
	const baseline = new McpBaseline({ git, record })
	const rows: ProjectionRow[] = []
	const entries: ProjectionEntry[] = []
	const plans: TargetPlan[] = []

	for (const config of mcpTargets(root)) {
		const source = read(root, config.path)
		const parsed = parseTarget(config, source)
		if (parsed.kind === 'unreadable') {
			rows.push({ target: config.path, server: '', action: 'refuse', detail: 'the target does not parse' })
			continue
		}
		const plan: TargetPlan = {
			config,
			source,
			created: source === undefined,
			servers: parsed.kind === 'servers' ? parsed.servers : new Map(),
			agreed: new Map(),
		}
		plans.push(plan)
		const dialect = mcpDialects[config.dialect]

		for (const [name, declared] of golden.servers) {
			const row = (action: ProjectionAction, detail: string) =>
				rows.push({ target: config.path, server: name, action, detail })
			const literal = credentialFields(declared)[0]
			if (literal) {
				row('refuse', `the golden set holds a literal credential at ${literal} — reference it as \${VAR} first`)
				continue
			}
			const rendering = dialect.write(declared)
			if (rendering.kind === 'refused') {
				row('refuse', `${rendering.field}: ${rendering.reason}`)
				continue
			}
			const carried = plan.servers.get(name)
			if (!carried) {
				const next =
					plan.source === undefined
						? createFile(config, name, rendering.entry)
						: appendServer(config, plan.source, name, rendering.entry)
				apply(
					plan,
					name,
					declared,
					rendering.entry,
					next,
					plan.created ? 'creates the file' : 'appends the server',
					row,
					entries,
				)
				continue
			}
			const diverged = divergingFields(declared, carried, dialect.fields)
			if (!diverged.length) {
				plan.agreed.set(name, declared)
				continue
			}
			const direction = heldBack(diverged.map((field) => baseline.directionOf(config, name, field, declared, carried)))
			if (direction) {
				row('skip', moved[direction])
				continue
			}
			const next = replaceServer(config, plan.source as string, name, rendering.entry)
			apply(plan, name, declared, rendering.entry, next, `replaces ${diverged.join(', ')}`, row, entries)
		}
	}

	if (write) {
		for (const plan of plans)
			if (plan.source !== undefined && plan.source !== read(root, plan.config.path)) writeTarget(root, plan)
		writeRecord(root, record, plans)
	}
	return { kind: 'planned', rows, entries, written: write }
}

/**
 * Accepts the new text only when it reads back as the golden server with every other server
 * untouched; anything else becomes an `edit` for a person, rather than a write this command
 * cannot vouch for.
 */
function apply(
	plan: TargetPlan,
	name: string,
	declared: McpServer,
	entry: McpEntry,
	next: string | undefined,
	detail: string,
	row: (action: ProjectionAction, detail: string) => void,
	entries: ProjectionEntry[],
): void {
	const adding = !plan.servers.has(name)
	const accepted = next !== undefined && readsBack(plan, name, declared, next)
	const action: ProjectionAction = accepted ? (adding ? 'add' : 'update') : 'edit'
	entries.push({ target: plan.config.path, server: name, action, entry: renderEntry(plan.config, name, entry) })
	if (!accepted) {
		row(
			'edit',
			adding
				? 'the file has no safe place to add it — apply the entry by hand'
				: 'an in-place change here is applied by hand',
		)
		return
	}
	plan.source = next
	plan.servers = (parseTarget(plan.config, next) as { kind: 'servers'; servers: Map<string, McpServer> }).servers
	plan.agreed.set(name, declared)
	row(action, detail)
}

function readsBack(plan: TargetPlan, name: string, declared: McpServer, next: string): boolean {
	const parsed = parseTarget(plan.config, next)
	if (parsed.kind !== 'servers') return false
	const written = parsed.servers.get(name)
	const fields = mcpDialects[plan.config.dialect].fields
	if (!written || divergingFields(declared, written, fields).length) return false
	return [...plan.servers].every(([other, server]) => {
		if (other === name) return true
		const kept = parsed.servers.get(other)
		return kept !== undefined && JSON.stringify(kept) === JSON.stringify(server)
	})
}

function writeTarget(root: string, plan: TargetPlan): void {
	const absolute = join(root, plan.config.path)
	mkdirSync(dirname(absolute), { recursive: true })
	writeFileSync(absolute, plan.source as string)
}

/** What each target last agreed on, kept per server so a server this run did not touch keeps its entry. */
function writeRecord(root: string, record: Map<string, Map<string, McpServer>>, plans: TargetPlan[]): void {
	for (const plan of plans) {
		const servers = record.get(plan.config.path) ?? new Map<string, McpServer>()
		for (const [name, server] of plan.agreed) servers.set(name, server)
		if (servers.size) record.set(plan.config.path, servers)
	}
	const absolute = join(root, projectionRecordPath)
	mkdirSync(dirname(absolute), { recursive: true })
	writeFileSync(absolute, formatProjectionRecord(record))
}
