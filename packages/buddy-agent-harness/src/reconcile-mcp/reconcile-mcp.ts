import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { appendInlineTomlTable, renderTomlInline, setTomlKey } from '../config-edit/toml-edit.ts'
import type { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { locatorText, type Position } from '../diagnose-bridges/locator.ts'
import {
	formatProjectionRecord,
	McpBaseline,
	parseProjectionRecord,
	projectionRecordPath,
} from '../diagnose-mcp/mcp-baseline.ts'
import { divergingFields, type McpField, type McpServer, mcpFields, sameField } from '../diagnose-mcp/mcp-model.ts'
import { credentialFields, nonSecretArgs } from '../diagnose-mcp/mcp-secrets.ts'
import { goldenSetPath, mcpTargets, parseGoldenSet, parseTarget } from '../diagnose-mcp/mcp-sources.ts'
import type { McpConfig } from '../harness-registry/mcp-config.ts'
import { isRecord } from '../is-record/is-record.ts'
import { mcpDialects } from '../mcp-dialects/mcp-dialects.ts'

/**
 * `import` is offered and waits for approval; `imported` was approved and written; `edit` was
 * approved but cannot be spliced in byte-safely, so `value` is for a person to apply; `skip` and
 * `refuse` are never importable, whatever is approved.
 */
export type ReconcileAction = 'import' | 'imported' | 'edit' | 'skip' | 'refuse'

export type ReconcileRow = {
	/** The locator `doctor` reports, and what `--accept` names to approve this one field. */
	path: string
	action: ReconcileAction
	detail: string
	/** The field as it would read in the golden set; never set on a row refusing a credential. */
	value?: string
}

export type ReconcilePlan =
	| { kind: 'absent' }
	| { kind: 'unreadable'; position?: Position | undefined }
	/** An approval named something not importable; nothing was written. */
	| { kind: 'rejected'; reasons: string[] }
	| { kind: 'planned'; rows: ReconcileRow[]; written: boolean }

export type ReconcileMcpOptions = {
	root: string
	git: GitBridgeState
	/** The locators approved, one field each. Empty is a dry run. */
	accept: readonly string[]
}

type Offer = {
	row: ReconcileRow
	config: McpConfig
	server: string
	field: McpField
	/** `undefined` removes the field from the golden set. */
	value: unknown
	carried: McpServer
	/** The golden server does not exist yet: approving adds it. */
	adds: boolean
}

function read(root: string, path: string): string | undefined {
	const absolute = join(root, path)
	return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}

const held = {
	both: 'both sides changed since the last projection — a three-way conflict for a person to settle, never imported',
	unknown: 'no baseline says which side changed — compare the two by hand; never imported',
}

/** Transport the golden set would infer anyway: stating it would record the harness's spelling, not a choice. */
function inferredTransport(server: McpServer): McpServer['transport'] {
	return server.url === undefined ? 'stdio' : 'http'
}

/** Only the names the golden set speaks for: a name only the harness carries is never compared, so never pulled. */
function mapValue(declared: unknown, carried: unknown): Record<string, string> | undefined {
	const kept = Object.entries(declared as Record<string, string>).flatMap(([name]) => {
		const value = isRecord(carried) ? carried[name] : undefined
		return typeof value === 'string' ? [[name, value]] : []
	})
	return kept.length ? Object.fromEntries(kept) : undefined
}

export function reconcileMcp({ root, git, accept }: ReconcileMcpOptions): ReconcilePlan {
	const goldenSource = read(root, goldenSetPath)
	const golden = parseGoldenSet(goldenSource)
	if (golden.kind !== 'servers') return golden

	const record = parseProjectionRecord(read(root, projectionRecordPath))
	const baseline = new McpBaseline({ git, record })
	const rows: ReconcileRow[] = []
	const offers: Offer[] = []

	for (const config of mcpTargets(root)) {
		const parsed = parseTarget(config, read(root, config.path))
		if (parsed.kind === 'unreadable') {
			rows.push({ path: config.path, action: 'refuse', detail: 'the target does not parse' })
			continue
		}
		if (parsed.kind === 'absent') continue
		const dialect = mcpDialects[config.dialect]

		for (const [server, carried] of parsed.servers) {
			const declared = golden.servers.get(server)
			const at = (field: string) => locatorText({ file: config.path, server, field })
			const offer = (field: McpField, proposed: unknown) => {
				const literals = literalsIn(field, proposed)
				for (const literal of literals)
					rows.push({
						path: at(literal),
						action: 'refuse',
						detail: `${literal} holds a literal credential, which never enters the golden set — set it in the environment and reference it as \${VAR}`,
					})
				const value = withoutLiterals(field, proposed, literals, declared)
				if (literals.length && (value === undefined || sameField(field, { [field]: value }, declared))) return
				const fallback = dialect.defaults?.[field]
				if (fallback !== undefined && sameField(field, { [field]: value }, { [field]: fallback })) {
					rows.push({
						path: at(field),
						action: 'skip',
						detail: `${config.dialect} fills this in by default, so it may not be the user's — set it in the golden set by hand if it is`,
					})
					return
				}
				const row: ReconcileRow = {
					path: at(field),
					action: 'import',
					detail: declared
						? 'only the harness changed it — approve to take it into the golden set'
						: 'the golden set does not declare this server — approve each field to add it',
					value: value === undefined ? '(unset)' : `${field} = ${renderTomlInline(value)}`,
				}
				rows.push(row)
				offers.push({ row, config, server, field, value, carried, adds: !declared })
			}

			if (!declared) {
				for (const field of mcpFields) {
					if (!dialect.fields.has(field) || carried[field] === undefined) continue
					if (field === 'transport' && carried.transport === inferredTransport(carried)) continue
					offer(field, carried[field])
				}
				continue
			}
			for (const field of divergingFields(declared, carried, dialect.fields)) {
				const direction = baseline.directionOf(config, server, field, declared, carried)
				// The golden side ahead is `mcp project`'s to write, not this command's.
				if (direction === 'golden') continue
				if (direction === 'target')
					offer(
						field,
						field === 'env' || field === 'headers' ? mapValue(declared[field], carried[field]) : carried[field],
					)
				else rows.push({ path: at(field), action: 'skip', detail: held[direction] })
			}
		}
	}

	if (!accept.length) return { kind: 'planned', rows, written: false }
	const approved = approve(offers, rows, accept)
	if (approved.kind === 'rejected') return approved

	let source = goldenSource as string
	const imported: Offer[] = []
	for (const [server, group] of groupByServer(approved.offers)) {
		if (group[0]?.adds) {
			const added: McpServer = Object.fromEntries(
				mcpFields.flatMap((field) => {
					const offer = group.find((item) => item.field === field)
					return offer ? [[field, offer.value]] : []
				}),
			)
			source = land(source, appendInlineTomlTable(source, ['servers', server], added), server, added, group, imported)
			continue
		}
		for (const offer of group) {
			const current = parseGoldenSet(source) as { kind: 'servers'; servers: Map<string, McpServer> }
			const expected = { ...current.servers.get(server), [offer.field]: offer.value }
			if (offer.value === undefined) delete expected[offer.field]
			const edit = setTomlKey(source, ['servers', server], offer.field, offer.value)
			source = land(source, edit.kind === 'edited' ? edit.text : undefined, server, expected, [offer], imported)
		}
	}

	if (source !== goldenSource) {
		writeFileSync(join(root, goldenSetPath), source)
		writeRecord(
			root,
			record,
			baseline,
			imported,
			parseGoldenSet(source) as { kind: 'servers'; servers: Map<string, McpServer> },
		)
	}
	return { kind: 'planned', rows, written: true }
}

function literalsIn(field: McpField, value: unknown): string[] {
	if (value === undefined) return []
	if (field === 'args') return nonSecretArgs(value as string[]).length === (value as string[]).length ? [] : ['args']
	if (field !== 'env' && field !== 'headers' && field !== 'url') return []
	return credentialFields({ [field]: value })
}

/**
 * A map keeps its other names, and a refused name keeps what the golden set already says for it;
 * any other field holding a literal is refused whole.
 */
function withoutLiterals(
	field: McpField,
	value: unknown,
	literals: string[],
	declared: McpServer | undefined,
): unknown {
	if (!literals.length) return value
	if (field !== 'env' && field !== 'headers') return undefined
	const kept = { ...(value as Record<string, string>) }
	for (const literal of literals) {
		const name = literal.slice(field.length + 1)
		const golden = declared?.[field]?.[name]
		if (golden === undefined) delete kept[name]
		else kept[name] = golden
	}
	return Object.keys(kept).length ? kept : undefined
}

function approve(
	offers: Offer[],
	rows: ReconcileRow[],
	accept: readonly string[],
): { kind: 'rejected'; reasons: string[] } | { kind: 'approved'; offers: Offer[] } {
	const reasons: string[] = []
	const chosen: Offer[] = []
	for (const path of new Set(accept)) {
		const offer = offers.find((item) => item.row.path === path)
		if (offer) chosen.push(offer)
		else {
			const row = rows.find((item) => item.path === path)
			reasons.push(
				row ? `${path} is ${row.action}, not importable: ${row.detail}` : `${path} names no importable field`,
			)
		}
	}
	for (const [server, group] of groupByServer(chosen)) {
		for (const field of new Set(group.map((offer) => offer.field))) {
			const values = group.filter((offer) => offer.field === field)
			if (values.some((offer) => !sameField(field, { [field]: offer.value }, { [field]: values[0]?.value })))
				reasons.push(
					`servers.${server}.${field} is approved from more than one target with different values — approve one`,
				)
		}
		if (group[0]?.adds && !group.some((offer) => offer.field === 'command' || offer.field === 'url'))
			reasons.push(`servers.${server} would be added with nothing to run — approve its command or url too`)
	}
	return reasons.length ? { kind: 'rejected', reasons } : { kind: 'approved', offers: chosen }
}

function groupByServer(offers: Offer[]): Map<string, Offer[]> {
	const groups = new Map<string, Offer[]>()
	for (const offer of offers) groups.set(offer.server, [...(groups.get(offer.server) ?? []), offer])
	return groups
}

/**
 * Accepts the new text only when it reads back as the expected server with every other server
 * untouched; anything else is handed over as an `edit`, never written on trust.
 */
function land(
	source: string,
	next: string | undefined,
	server: string,
	expected: McpServer,
	offers: Offer[],
	imported: Offer[],
): string {
	const before = parseGoldenSet(source) as { kind: 'servers'; servers: Map<string, McpServer> }
	const after = next === undefined ? undefined : parseGoldenSet(next)
	const holds =
		after?.kind === 'servers' &&
		// A transport the text leaves unstated reads back inferred.
		mcpFields.every(
			(field) =>
				(field === 'transport' && expected.transport === undefined) ||
				sameField(field, after.servers.get(server), expected),
		) &&
		[...before.servers].every(
			([name, kept]) => name === server || JSON.stringify(after.servers.get(name)) === JSON.stringify(kept),
		)
	for (const offer of offers) {
		offer.row.action = holds ? 'imported' : 'edit'
		offer.row.detail = holds
			? 'written into the golden set'
			: 'the golden set writes this server in a shape that cannot be edited byte-safely — apply the value by hand'
	}
	if (!holds) return source
	imported.push(...offers)
	return next as string
}

/**
 * The imported field now agrees on both sides. A server the record has no entry for is recorded
 * only when every other field's baseline is known, so the record never asserts an agreement no
 * baseline supports.
 */
function writeRecord(
	root: string,
	record: Map<string, Map<string, McpServer>>,
	baseline: McpBaseline,
	imported: Offer[],
	golden: { servers: Map<string, McpServer> },
): void {
	for (const offer of imported) {
		const servers = record.get(offer.config.path) ?? new Map<string, McpServer>()
		const recorded = servers.get(offer.server)
		const entry = recorded
			? { ...recorded, [offer.field]: offer.value }
			: baseEntry(offer, baseline, golden.servers.get(offer.server) as McpServer)
		if (!entry) continue
		if (offer.value === undefined) delete entry[offer.field]
		servers.set(offer.server, entry)
		record.set(offer.config.path, servers)
	}
	const absolute = join(root, projectionRecordPath)
	mkdirSync(dirname(absolute), { recursive: true })
	writeFileSync(absolute, formatProjectionRecord(record))
}

function baseEntry(offer: Offer, baseline: McpBaseline, golden: McpServer): McpServer | undefined {
	if (offer.adds) return { ...golden }
	const entry: Record<string, unknown> = {}
	for (const field of mcpDialects[offer.config.dialect].fields) {
		if (golden[field] === undefined) continue
		if (sameField(field, golden, offer.carried)) {
			entry[field] = golden[field]
			continue
		}
		const base = baseline.baseFor(offer.config, offer.server, field)
		if (!base) return undefined
		entry[field] = base[field]
	}
	return entry as McpServer
}
