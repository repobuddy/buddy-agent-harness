#!/usr/bin/env node
/**
 * Harness drift detector.
 *
 * Compares this repository's `harnessRegistry` against the `vercel-labs/skills` agent registry.
 * Covers the skills axis only — instructions, rules, MCP, and hooks have no machine-readable
 * source, so a clean run here doesn't mean the harness data overall is current.
 *
 * Usage:
 *   node scripts/harness-drift.mjs --json            # machine-readable report
 *   node scripts/harness-drift.mjs --issue-body      # markdown for a GitHub issue
 *   node scripts/harness-drift.mjs --update-baseline # accept current upstream as reviewed
 *
 * Exits 1 when drift is found, 0 when clean, 2 on a fetch or parse failure.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const baselinePath = join(here, 'harness-baseline.json')
const registryPath = join(root, 'packages', 'buddy-agent-harness', 'src', 'harness-registry', 'harness-registry.ts')

const UPSTREAM = 'https://raw.githubusercontent.com/vercel-labs/skills/main/src/agents.ts'
const CANONICAL = '.agents/skills'

/** Parse `skillsDir` per agent out of the upstream registry source. */
export function parseUpstream(source) {
	const agents = {}
	let current = null
	for (const line of source.split('\n')) {
		const key = line.match(/^ {2}'?([A-Za-z0-9_-]+)'?:\s*\{\s*$/)
		if (key) {
			current = key[1]
			continue
		}
		if (!current) continue
		const dir = line.match(/^ {4}skillsDir:\s*'([^']+)'/)
		if (dir) {
			agents[current] = dir[1]
			current = null
		}
	}
	return agents
}

/**
 * Reads whole entries (`name:` to the next `name:`), not lines — an entry spans several lines.
 * Only the `project` scope is compared; that's the scope whose `skillsDir` decides our projection.
 */
export function parseLocal(source) {
	const body = source.slice(source.indexOf('harnessRegistry'))
	const starts = [...body.matchAll(/\bname:\s*'([^']+)'/g)]
	return starts.map((start, index) => {
		const entry = body.slice(start.index, starts[index + 1]?.index ?? body.length)
		const project = entry.match(/project:\s*\{([^}]*)\}/)?.[1] ?? null
		return {
			name: start[1],
			detect: project?.match(/detect:\s*'([^']+)'/)?.[1] ?? null,
			skillsDirectory: project?.match(/skillsDirectory:\s*'([^']+)'/)?.[1] ?? null,
			deprecated: entry.match(/deprecated:\s*'([^']+)'/)?.[1] ?? null,
		}
	})
}

/**
 * Fails rather than reporting agreement when the registry's shape outruns the parser — a project
 * scope with no `detect` is unparseable.
 *
 * Counts `{` braces in the array literal rather than re-splitting on `name:`, so a dropped entry
 * can't agree with the count that dropped it.
 *
 * Deliberately excludes the wider `HarnessName` union, which names harnesses (see `mcp-inventory.ts`)
 * that have no registry entry.
 */
export function assertParsed(local, source) {
	const literal = source.match(/harnessRegistry: readonly Harness\[\] = \[\n([\s\S]*?)\n\]/)?.[1]
	const entries = (literal?.match(/^\t\{/gm) ?? []).length
	const blind = local.filter((harness) => harness.detect === null).map((harness) => harness.name)
	if (blind.length) return `could not read the project scope of: ${blind.join(', ')}`
	if (local.length === 0) return 'parsed zero harnesses'
	if (entries === 0) return 'could not find the harnessRegistry array literal'
	if (local.length !== entries) return `parsed ${local.length} harnesses but the registry holds ${entries} entries`
	return null
}

/**
 * Our criteria differ from upstream's: it calls an agent universal only when `skillsDir` alone is
 * canonical, while we ask whether a harness reads the canonical path at all. So a mismatch here is
 * a prompt to research, not a verdict.
 */
export function compare({ upstream, local, baseline }) {
	const findings = []
	const isUniversal = (dir) => dir === CANONICAL

	for (const [agent, dir] of Object.entries(upstream)) {
		const previous = baseline.agents[agent]
		if (previous === undefined) {
			findings.push({
				kind: 'new-agent',
				agent,
				detail: `New upstream agent with skillsDir \`${dir}\`${isUniversal(dir) ? ' (canonical)' : ''}.`,
			})
			continue
		}
		if (previous !== dir) {
			findings.push({
				kind: 'path-changed',
				agent,
				detail: `skillsDir changed from \`${previous}\` to \`${dir}\`.`,
			})
		}
	}

	for (const agent of Object.keys(baseline.agents)) {
		if (upstream[agent] === undefined)
			findings.push({ kind: 'agent-removed', agent, detail: 'Present in baseline, absent upstream.' })
	}

	for (const harness of local) {
		const dir = upstream[harness.name]
		if (dir === undefined) continue
		if (isUniversal(dir) && harness.skillsDirectory && !harness.deprecated)
			findings.push({
				kind: 'projection-may-be-redundant',
				agent: harness.name,
				detail: `We project into \`${harness.skillsDirectory}\`, but upstream now treats it as canonical-reading. Confirm against vendor docs before removing the projection.`,
			})
		if (!isUniversal(dir) && !harness.skillsDirectory)
			findings.push({
				kind: 'projection-may-be-missing',
				agent: harness.name,
				detail: `We treat it as native, but upstream still uses \`${dir}\`. Confirm which is current.`,
			})
	}

	return findings
}

async function main() {
	const args = process.argv.slice(2)
	const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))

	let source
	try {
		const response = await fetch(UPSTREAM)
		if (!response.ok) throw new Error(`HTTP ${response.status}`)
		source = await response.text()
	} catch (error) {
		process.stderr.write(`error: could not fetch upstream registry: ${error.message}\n`)
		process.exit(2)
	}

	const upstream = parseUpstream(source)
	if (Object.keys(upstream).length === 0) {
		process.stderr.write('error: parsed zero agents upstream; the source layout probably changed.\n')
		process.exit(2)
	}

	if (args.includes('--update-baseline')) {
		const next = { source: UPSTREAM, reviewed: new Date().toISOString().slice(0, 10), agents: upstream }
		writeFileSync(baselinePath, `${JSON.stringify(next, null, '\t')}\n`)
		process.stdout.write(`Baseline updated: ${Object.keys(upstream).length} agents.\n`)
		return
	}

	const registrySource = readFileSync(registryPath, 'utf8')
	const local = parseLocal(registrySource)
	const unreadable = assertParsed(local, registrySource)
	if (unreadable) {
		process.stderr.write(`error: could not parse the harness registry: ${unreadable}.\n`)
		process.exit(2)
	}

	const findings = compare({ upstream, local, baseline })
	const universal = Object.values(upstream).filter((dir) => dir === CANONICAL).length

	if (args.includes('--json')) {
		process.stdout.write(`${JSON.stringify({ agents: Object.keys(upstream).length, universal, findings }, null, 2)}\n`)
	} else if (args.includes('--issue-body')) {
		process.stdout.write(issueBody({ findings, total: Object.keys(upstream).length, universal }))
	} else {
		process.stdout.write(
			findings.length
				? `${findings.length} finding(s):\n${findings.map((f) => `- [${f.kind}] ${f.agent}: ${f.detail}`).join('\n')}\n`
				: `No drift. ${Object.keys(upstream).length} upstream agents, ${universal} canonical-reading.\n`,
		)
	}

	process.exit(findings.length ? 1 : 0)
}

function issueBody({ findings, total, universal }) {
	const groups = findings.reduce((acc, finding) => {
		;(acc[finding.kind] ??= []).push(finding)
		return acc
	}, {})
	const titles = {
		'new-agent': 'New agents upstream',
		'path-changed': 'Skill path changed',
		'agent-removed': 'Agents removed upstream',
		'projection-may-be-redundant': 'Our projection may now be redundant',
		'projection-may-be-missing': 'We may be missing a projection',
	}
	return [
		`The [\`vercel-labs/skills\`](${UPSTREAM}) agent registry has drifted from our reviewed baseline.`,
		'',
		`Upstream now lists **${total}** agents, **${universal}** of which read \`${CANONICAL}\` as their primary path.`,
		'',
		...Object.entries(groups).flatMap(([kind, items]) => [
			`## ${titles[kind] ?? kind}`,
			'',
			...items.map((item) => `- **${item.agent}** — ${item.detail}`),
			'',
		]),
		'## What this does and does not tell you',
		'',
		'Upstream classifies an agent by whether its **single** `skillsDir` is `.agents/skills`. We ask a',
		'different question — whether a harness reads the canonical path *at all*, and separately whether it',
		'reads `AGENTS.md` — so a mismatch here is a prompt to research, not a verdict.',
		'',
		'This check covers the skills axis only. Instructions, rules, MCP servers, and hooks have no',
		'machine-readable source and are not compared.',
		'',
		'## Next',
		'',
		'Run the `harness-update` skill to research each finding against primary vendor documentation, record',
		'the outcome in `.research/agentic-configuration-standards/`, then accept the new upstream state with',
		'`node scripts/harness-drift.mjs --update-baseline`.',
		'',
	].join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
