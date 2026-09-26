#!/usr/bin/env node
// Score every run under <out> against the key, blind to the arm.
//
//   node judge.mjs --out <dir> [--model sonnet]
//
// Each reply goes to a fresh judge with the task, the key line, and nothing naming its arm.
// Writes <out>/scores.json and prints the per-arm table.

import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { TASKS } from './backlog.mjs'

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
const sandbox = join(out, '.judge-home')
const cwd = join(out, '.judge-cwd')
mkdirSync(join(sandbox, '.claude'), { recursive: true })
mkdirSync(cwd, { recursive: true })
copyFileSync(join(homedir(), '.claude', '.credentials.json'), join(sandbox, '.claude', '.credentials.json'))

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

function judgePrompt(user, key, reply, earlier) {
	const history = earlier
		? `<first_user_message>\n${earlier.user}\n</first_user_message>\n<first_reply>\n${earlier.reply}\n</first_reply>\n`
		: ''
	return `Score one assistant reply against one criterion. Judge only the criterion, not the quality of the reply.

${history}<user_message>
${user}
</user_message>
<reply>
${reply}
</reply>

Criterion: ${key}

Answer with exactly one line: PASS or FAIL, then " - ", then a reason of at most 25 words.`
}

function claude(prompt) {
	return new Promise((done) => {
		const child = spawn('claude', ['-p', prompt, '--model', values.model, '--tools', '', '--strict-mcp-config'], {
			cwd,
			env: { ...process.env, HOME: sandbox },
			stdio: ['ignore', 'pipe', 'pipe'],
			timeout: 300_000,
		})
		let text = ''
		child.stdout.on('data', (d) => {
			text += d
		})
		child.on('close', () => done(text.trim()))
	})
}

// Shuffled so no judge sees one arm's runs in a block.
items.sort(() => Math.random() - 0.5)
let next = 0
await Promise.all(
	Array.from({ length: Number(values.concurrency) }, async () => {
		while (next < items.length) {
			const item = items[next++]
			item.verdict = await claude(item.prompt)
			// A judge sometimes reverses itself on a later line; its last verdict line is its answer.
			item.pass = item.verdict
				.match(/^(?:\w+:\s*)?(PASS|FAIL)\b/gm)
				?.at(-1)
				?.endsWith('PASS')
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
