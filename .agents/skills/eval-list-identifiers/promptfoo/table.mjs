#!/usr/bin/env node
// Print the per-arm table from a promptfoo results file, in the layout ../references/backlog.md records.
//
//   node table.mjs <results.json> [--failing]
//
// --failing also lists every failing verdict with the reply file it scored, to read before trusting a total.

import { readFileSync } from 'node:fs'
import { TASKS } from '../scripts/backlog.mjs'

const [file, flag] = process.argv.slice(2)
if (!file) {
	process.stdout.write('usage: table.mjs <results.json> [--failing]\n')
	process.exit(2)
}

const kindOf = Object.fromEntries(
	TASKS.flatMap((t) => [[t.id, t.kind], ...(t.revision ? [[t.revision.id, 'revise']] : [])]),
)
const ids = Object.keys(kindOf)
const kinds = ['present', 'revise', 'near-miss']

const scores = []
const errors = []
for (const result of JSON.parse(readFileSync(file, 'utf8')).results.results) {
	const arm = result.provider.label
	const rep = (result.repeatIndex ?? 0) + 1
	const parts = result.gradingResult?.componentResults ?? []
	if (result.error || parts.length === 0) errors.push(`${arm} ${result.vars.task}-${rep}: ${result.error}`)
	for (const part of parts) scores.push({ arm, rep, task: part.assertion.metric, pass: part.pass, reason: part.reason })
}

const arms = [...new Set(scores.map((s) => s.arm))]
const count = (pred) => scores.filter((s) => pred(s) && s.pass).length
const rows = [
	`| arm | ${ids.join(' | ')} | ${kinds.join(' | ')} | total |`,
	`| --- |${' --- |'.repeat(ids.length + kinds.length + 1)}`,
	...arms.map(
		(arm) =>
			`| ${arm} | ${ids.map((id) => count((s) => s.arm === arm && s.task === id)).join(' | ')} | ${kinds
				.map((k) => count((s) => s.arm === arm && kindOf[s.task] === k))
				.join(' | ')} | ${count((s) => s.arm === arm)} |`,
	),
]
process.stdout.write(`${rows.join('\n')}\n`)
if (errors.length > 0)
	process.stdout.write(`\n${errors.length} runs errored and score nothing:\n${errors.join('\n')}\n`)
if (flag === '--failing') {
	for (const s of scores.filter((s) => !s.pass))
		process.stdout.write(`\n${s.arm}/${s.task}-${s.rep}.txt\n  ${s.reason}\n`)
}
