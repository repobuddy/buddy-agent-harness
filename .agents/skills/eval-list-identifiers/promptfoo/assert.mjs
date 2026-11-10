// The blind judge: a fresh `claude -p` gets the task, its key line, and the reply, and nothing
// naming the arm.

import { blindClaude } from '../../eval-delegation/scripts/blind-claude.mjs'
import { TASKS } from '../scripts/backlog.mjs'
import { judgePrompt, readVerdict } from '../scripts/judge-prompt.mjs'
import { blindDir } from './env.mjs'

// The judge uses the run's model and output directory, read off the arm's provider; nothing else of the arm.
async function judge(prompt, { out, model }) {
	const result = await blindClaude(['-p', prompt, '--model', model, '--tools', ''], {
		cwd: blindDir(out, '.judge-cwd'),
	})
	const verdict = result.out.trim()
	const pass = readVerdict(verdict)
	return { pass, score: pass ? 1 : 0, reason: verdict }
}

const taskOf = (vars) => TASKS.find((t) => t.id === vars.task)

export async function first(output, { vars, provider }) {
	const task = taskOf(vars)
	return judge(judgePrompt(task.prompt, task.key, JSON.parse(output).first), provider)
}

export async function second(output, { vars, provider }) {
	const task = taskOf(vars)
	const { first, second } = JSON.parse(output)
	return judge(
		judgePrompt(task.revision.prompt, task.revision.key, second, { user: task.prompt, reply: first }),
		provider,
	)
}
