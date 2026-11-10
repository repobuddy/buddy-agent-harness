#!/usr/bin/env node
// Score every run under <out> against the key, blind to the arm.
//
//   node judge.mjs --out <dir> [--model sonnet]
//
// Each reply goes to a fresh judge with the task, the key line, and nothing naming its arm.
// Writes <out>/scores.json and prints the per-arm table.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { assertBlind, blindClaude } from '../../eval-delegation/scripts/blind-claude.mjs'
import { TASKS } from './backlog.mjs'
import { judgePrompt, readVerdict } from './judge-prompt.mjs'

const { values } = parseArgs({
	options: {
		out: { type: 'string' },
		model: { type: 'string', default: 'sonnet' },
		concurrency: { type: 'string', default: '8' },
	},
})
if (!values.out) {
	process.stdout.write('usage: judge.mjs --out <dir> [--model sonnet]\n')
	process.exit(2)
}

const out = resolve(values.out)
const cwd = join(out, '.judge-cwd')
mkdirSync(cwd, { recursive: true })
assertBlind(cwd)

const arms = readdirSync(out, { withFileTypes: true })
	.filter((d) => d.isDirectory() && !d.name.startsWith('.'))
	.map((d) => d.name)

const items = []
for (const arm of arms) {
	for (const task of TASKS) {
		for (let rep = 1; existsSync(join(out, arm, `${task.id}-${rep}.txt`)); rep++) {
			const reply = readFileSync(join(out, arm, `${task.id}-${rep}.txt`), 'utf8')
			items.push({ arm, rep, task: task.id, kind: task.kind, prompt: judgePrompt(task.prompt, task.key, reply) })
			if (!task.revision) continue
			const revised = readFileSync(join(out, arm, `${task.revision.id}-${rep}.txt`), 'utf8')
			items.push({
				arm,
				rep,
				task: task.revision.id,
				kind: 'revise',
				prompt: judgePrompt(task.revision.prompt, task.revision.key, revised, { user: task.prompt, reply }),
			})
		}
	}
}

async function claude(prompt) {
	const { out } = await blindClaude(['-p', prompt, '--model', values.model, '--tools', ''], { cwd })
	return out.trim()
}

// Shuffled so no judge sees one arm's runs in a block.
items.sort(() => Math.random() - 0.5)
let next = 0
await Promise.all(
	Array.from({ length: Number(values.concurrency) }, async () => {
		while (next < items.length) {
			const item = items[next++]
			item.verdict = await claude(item.prompt)
			item.pass = readVerdict(item.verdict)
		}
	}),
)

writeFileSync(
	join(out, 'scores.json'),
	`${JSON.stringify(
		items.map(({ prompt: _, ...rest }) => rest),
		null,
		'\t',
	)}\n`,
)

const ids = [...new Set(TASKS.flatMap((t) => (t.revision ? [t.id, t.revision.id] : [t.id])))]
const rows = [
	`| arm | ${ids.join(' | ')} | present | revise | near-miss |`,
	`| --- |${' --- |'.repeat(ids.length + 3)}`,
]
for (const arm of arms.sort()) {
	const mine = items.filter((i) => i.arm === arm)
	const cell = (pred) => {
		const hit = mine.filter(pred)
		return `${hit.filter((i) => i.pass).length}/${hit.length}`
	}
	rows.push(
		`| ${arm} | ${ids.map((id) => cell((i) => i.task === id)).join(' | ')} | ${['present', 'revise', 'near-miss'].map((k) => cell((i) => i.kind === k)).join(' | ')} |`,
	)
}
process.stdout.write(`${rows.join('\n')}\n`)
