#!/usr/bin/env node
// Run every backlog task N times under one arm.
//
//   node run.mjs (--section <candidate.md> | --no-section) --arm <name> --out <dir> [--reps 6] [--model sonnet]
//
// Writes <out>/<arm>/<task>-<rep>.txt, and for a task with a revision round
// <out>/<arm>/<revision>-<rep>.txt from a second turn of the same session.

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
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
const sandbox = join(armDir, '.home')
const cwd = join(armDir, '.cwd')
mkdirSync(join(sandbox, '.claude'), { recursive: true })
mkdirSync(cwd, { recursive: true })
copyFileSync(join(homedir(), '.claude', '.credentials.json'), join(sandbox, '.claude', '.credentials.json'))

// claude loads every CLAUDE.md from cwd up to the root, so a run directory inside a repository
// would put that repository's instructions in every arm.
for (let dir = dirname(cwd); dir !== dirname(dir); dir = dirname(dir)) {
	for (const name of ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md']) {
		if (existsSync(join(dir, name))) {
			process.stdout.write(`error: ${join(dir, name)} would load into every run; put --out outside it\n`)
			process.exit(1)
		}
	}
}

writeFileSync(join(cwd, 'CLAUDE.md'), section ? `${PROJECT}\n${section}\n` : PROJECT)

function claude(prompt, sessionArgs) {
	return new Promise((done) => {
		const child = spawn(
			'claude',
			['-p', prompt, '--model', values.model, ...sessionArgs, '--tools', '', '--strict-mcp-config'],
			{ cwd, env: { ...process.env, HOME: sandbox }, stdio: ['ignore', 'pipe', 'pipe'], timeout: 300_000 },
		)
		let out = ''
		child.stdout.on('data', (d) => {
			out += d
		})
		child.on('close', (code) => done(code === 0 ? out : `${out}\nRUN FAILED (${code})\n`))
	})
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
