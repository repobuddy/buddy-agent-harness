#!/usr/bin/env node
// Build the two roster prompts for a candidate Delegation section.
//
//   node build-prompts.mjs --section <candidate.md> --out <dir>
//
// Everything below the `end AGENTS.md` marker is fixed. Only the candidate text varies, which
// is what makes two runs comparable. See ../references/method.md.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
	options: { section: { type: 'string' }, out: { type: 'string' } },
})

if (!values.section || !values.out) {
	process.stdout.write('usage: build-prompts.mjs --section <candidate.md> --out <dir>\n')
	process.exit(2)
}

const section = readFileSync(values.section, 'utf8').trim()

if (!/^##\s+\S/m.test(section)) {
	process.stdout.write(`error: ${values.section} has no section heading; pass the section as it ships\n`)
	process.exit(1)
}

const ROSTERS = {
	claude: {
		self: 'sonnet',
		models: '`haiku` (cheapest, fastest), `sonnet` (mid), `opus` (most capable, most expensive)',
	},
	drift: {
		self: 'atlas',
		models: '`atlas-mini` (cheapest, fastest), `atlas` (mid), `atlas-max` (most capable, most expensive)',
	},
}

// Fixed below this point. Editing any of it invalidates comparison with earlier runs.
const BACKLOG = [
	'T1. Rename the exported function `initHarness` to `initRepo` across the codebase (61 call sites) and update the tests that reference it.',
	'T2. Add `coverage/` to the repository root `.gitignore`.',
	'T3. Find every SKILL.md under `.agents/skills/` that references a path beginning with `.claude/`, and list them with line numbers.',
	'T4. Decide whether our new "Delegation" guidance belongs in AGENTS.md or in a separate loadable skill, and give the reasoning.',
	'T5. Review the 4 open dependency-update PRs and, for each, decide merge / hold / needs-work.',
]

function render(roster) {
	return `You are the lead agent starting a work session in the repository \`buddy-agent-harness\` (a TypeScript pnpm monorepo).

You are running as \`${roster.self}\` in this session.
Your harness can spawn subagents. Models you may spawn: ${roster.models}. You may also set a per-subagent reasoning effort of low / medium / high.

The repository's AGENTS.md reads:

---8<--- AGENTS.md ---8<---
# buddy-agent-harness

A CLI and skill set that links a canonical \`.agents/skills/\` directory into agent harnesses.

## Conventions

- Package manager is pnpm; \`pnpm -w test\` runs vitest across the workspace.
- Every published change needs a changeset in \`.changeset/\`.

${section}
---8<--- end AGENTS.md ---8<---

Here is today's backlog:

${BACKLOG.join('\n')}

Produce your execution plan. Do NOT do any of the work and do not read any files — plan only. Answer with exactly this markdown table and nothing else before it:

| Task | Who does it | Model + effort | Brief you would send (verbatim, <=2 sentences; write "n/a" if you keep it) |
| --- | --- | --- | --- |

After the table, add exactly two lines:
CONFIDENCE: <high|medium|low> — one clause on how sure you are about the who-does-it column.
UNCLEAR: <anything in AGENTS.md you could not apply to this session, or "none">
`
}

mkdirSync(values.out, { recursive: true })
for (const [name, roster] of Object.entries(ROSTERS)) {
	const path = join(values.out, `prompt-${name}.md`)
	writeFileSync(path, render(roster))
	process.stdout.write(`eval: wrote ${path}\n`)
}
process.stdout.write(
	'\nspawn 3 runs per prompt, same model for all six, each told only to read its prompt file.\n' +
		'never tell a runner it is being evaluated. score against references/backlog.md.\n',
)
