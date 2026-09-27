#!/usr/bin/env node
// Run every backlog task N times under one arm.
//
//   node run.mjs (--section <candidate.md> | --no-section) --arm <name> --out <dir> [--reps 6] [--model sonnet]
//
// Writes <out>/<arm>/<task>-<rep>.txt, and for a task with a revision round
// <out>/<arm>/<revision>-<rep>.txt from a second turn of the same session.

import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { assertBlind, blindClaude } from '../../eval-delegation/scripts/blind-claude.mjs'
import { NO_ACCESS, PROJECT, TASKS } from './backlog.mjs'

const { values } = parseArgs({
	options: {
		section: { type: 'string' },
		'no-section': { type: 'boolean' },
		arm: { type: 'string' },
		out: { type: 'string' },
		reps: { type: 'string', default: '6' },
		model: { type: 'string', default: 'sonnet' },
		concurrency: { type: 'string', default: '8' },
	},
})

if ((!values.section && !values['no-section']) || !values.arm || !values.out) {
	process.stdout.write(
		'usage: run.mjs (--section <candidate.md> | --no-section) --arm <name> --out <dir> [--reps 6] [--model sonnet]\n',
	)
	process.exit(2)
}

const section = values['no-section'] ? '' : readFileSync(values.section, 'utf8').trim()
if (section && !/^##\s+\S/m.test(section)) {
	process.stdout.write(`error: ${values.section} has no section heading; pass the section as it ships\n`)
	process.exit(1)
}

const armDir = resolve(values.out, values.arm)
const cwd = join(armDir, '.cwd')
mkdirSync(cwd, { recursive: true })
assertBlind(cwd)

writeFileSync(join(cwd, 'CLAUDE.md'), section ? `${PROJECT}\n${section}\n` : PROJECT)

async function claude(prompt, sessionArgs) {
	const { code, out } = await blindClaude(['-p', prompt, '--model', values.model, ...sessionArgs, '--tools', ''], {
		cwd,
	})
	return code === 0 ? out : `${out}\nRUN FAILED (${code})\n`
}

const jobs = []
for (const task of TASKS) {
	for (let rep = 1; rep <= Number(values.reps); rep++) {
		jobs.push(async () => {
			const id = randomUUID()
			const first = await claude(`${task.prompt}\n\n${NO_ACCESS}`, ['--session-id', id])
			writeFileSync(join(armDir, `${task.id}-${rep}.txt`), first)
			if (!task.revision) return
			const second = await claude(task.revision.prompt, ['--resume', id])
			writeFileSync(join(armDir, `${task.revision.id}-${rep}.txt`), second)
		})
	}
}

let next = 0
await Promise.all(
	Array.from({ length: Number(values.concurrency) }, async () => {
		while (next < jobs.length) await jobs[next++]()
	}),
)
process.stdout.write(`eval: ${jobs.length} runs -> ${armDir}\n`)
