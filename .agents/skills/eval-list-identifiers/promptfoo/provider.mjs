// One arm: every task is a fresh blind `claude -p` session from a directory whose CLAUDE.md holds
// the project stub and the arm's section. A task with a revision resumes that session for a second
// turn. Both replies are also written to <LISTID_OUT>/<arm>/<task>-<rep>.txt, the layout judge.mjs reads.

import { randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blindClaude } from '../../eval-delegation/scripts/blind-claude.mjs'
import { NO_ACCESS, PROJECT, TASKS } from '../scripts/backlog.mjs'
import { blindDir } from './env.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const SHIPPED = resolve(here, '../../../../packages/buddy-agent-harness/skills/enhance/references/list-identifiers.md')

// The shipped arm reads the text enhance offers, so it can never drift from what ships.
function readSection(section) {
	if (section === 'none') return ''
	if (section === 'shipped') {
		const match = readFileSync(SHIPPED, 'utf8').match(/## Offer this text verbatim\s+```markdown\n([\s\S]*?)\n```/)
		if (!match) throw new Error(`no verbatim block in ${SHIPPED}`)
		return match[1].trim()
	}
	const text = readFileSync(resolve(here, section), 'utf8').trim()
	if (!/^##\s+\S/m.test(text)) throw new Error(`${section} has no section heading; pass the section as it ships`)
	return text
}

export default class ListIdentifiersArm {
	constructor({ config }) {
		this.arm = config.arm
		this.out = config.out
		this.model = config.model
		const section = readSection(config.section)
		this.cwd = blindDir(this.out, this.arm, '.cwd')
		writeFileSync(join(this.cwd, 'CLAUDE.md'), section ? `${PROJECT}\n${section}\n` : PROJECT)
	}

	id() {
		return `list-identifiers:${this.arm}`
	}

	async turn(prompt, sessionArgs) {
		const { code, out } = await blindClaude(['-p', prompt, '--model', this.model, ...sessionArgs, '--tools', ''], {
			cwd: this.cwd,
		})
		if (code !== 0) throw new Error(`claude exited ${code}: ${out.slice(0, 200)}`)
		return out
	}

	async callApi(_prompt, { vars, repeatIndex = 0 }) {
		const task = TASKS.find((t) => t.id === vars.task)
		const rep = repeatIndex + 1
		const armDir = join(this.cwd, '..')
		try {
			const session = randomUUID()
			const first = await this.turn(`${task.prompt}\n\n${NO_ACCESS}`, ['--session-id', session])
			writeFileSync(join(armDir, `${task.id}-${rep}.txt`), first)
			if (!task.revision) return { output: JSON.stringify({ first }) }
			const second = await this.turn(task.revision.prompt, ['--resume', session])
			writeFileSync(join(armDir, `${task.revision.id}-${rep}.txt`), second)
			return { output: JSON.stringify({ first, second }) }
		} catch (error) {
			return { error: String(error) }
		}
	}
}
