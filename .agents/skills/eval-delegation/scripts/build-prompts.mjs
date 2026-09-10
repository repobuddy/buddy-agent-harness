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
	options: {
		section: { type: 'string' },
		out: { type: 'string' },
		// The empty control: an AGENTS.md with no Delegation section at all. Without it a score is
		// uninterpretable — 6/6 means nothing until you know what 6/6 looks like with no guidance.
		'no-section': { type: 'boolean' },
		// v1 is the original five tasks, frozen. An empty control scores 30/30 on them, so they
		// cannot show what a wording does; v2 is the discriminating set. See ../references/backlog.md.
		backlog: { type: 'string', default: 'v2' },
	},
})

if ((!values.section && !values['no-section']) || !values.out) {
	process.stdout.write('usage: build-prompts.mjs (--section <candidate.md> | --no-section) --out <dir>\n')
	process.exit(2)
}

const section = values['no-section'] ? '' : readFileSync(values.section, 'utf8').trim()

if (section && !/^##\s+\S/m.test(section)) {
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
	// The unforced condition. Same roster as `claude`; the only difference is that the required
	// output table has no model column, so leaving a subagent on the parent's model is an
	// available answer instead of an unfillable cell. Added 2026-09-10 — the two conditions above
	// cannot measure whether a wording makes an agent *reach* the model question, only which tier
	// it picks once asked. See the unforced axis in ../references/backlog.md.
	unforced: {
		self: 'sonnet',
		models: '`haiku` (cheapest, fastest), `sonnet` (mid), `opus` (most capable, most expensive)',
		askModel: false,
	},
}

// Fixed below this point. Editing any of it invalidates comparison with earlier runs.
const BACKLOG_V2 = [
	'U1. Update the import specifier `@buddy/core` to `@buddy/kernel` in the 140 files that import it.',
	'U2. Bump the `engines.node` field in the root package.json from `>=20` to `>=22`.',
	'U3. CHANGELOG.md is 4,200 lines. Find which released version dropped support for Node 18.',
	'U4. Decide whether we move the whole org onto the new lockfile format this quarter.',
	'U5. Triage the 23 open issues into bug / feature / question, and flag the 3 most urgent.',
	'U6. Rotate the CI cache key in the 6 workflow files under `.github/workflows/`.',
	'U7. Work out why the release job intermittently publishes an empty tarball.',
	'U8. List every package in the workspace whose package.json has no `test` script.',
]

const BACKLOG_V1 = [
	'T1. Rename the exported function `initHarness` to `initRepo` across the codebase (61 call sites) and update the tests that reference it.',
	'T2. Add `coverage/` to the repository root `.gitignore`.',
	'T3. Find every SKILL.md under `.agents/skills/` that references a path beginning with `.claude/`, and list them with line numbers.',
	'T4. Decide whether our new "Delegation" guidance belongs in AGENTS.md or in a separate loadable skill, and give the reasoning.',
	'T5. Review the 4 open dependency-update PRs and, for each, decide merge / hold / needs-work.',
]

const TABLE_FORCED = `| Task | Who does it | Model + effort | Brief you would send (verbatim, <=2 sentences; write "n/a" if you keep it) |
| --- | --- | --- | --- |`

const TABLE_UNFORCED = `| Task | Who does it | Brief you would send (verbatim, <=2 sentences; write "n/a" if you keep it) |
| --- | --- | --- |`

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

${section ? `${section}\n` : ''}---8<--- end AGENTS.md ---8<---

Here is today's backlog:

${(roster.backlog === 'v1' ? BACKLOG_V1 : BACKLOG_V2).join('\n')}

Produce your execution plan. Do NOT do any of the work and do not read any files — plan only. Answer with exactly this markdown table and nothing else before it:

${roster.askModel === false ? TABLE_UNFORCED : TABLE_FORCED}

After the table, add exactly two lines:
CONFIDENCE: <high|medium|low> — one clause on how sure you are about the who-does-it column.
UNCLEAR: <anything in AGENTS.md you could not apply to this session, or "none">
`
}

mkdirSync(values.out, { recursive: true })
for (const [name, roster] of Object.entries(ROSTERS)) {
	const path = join(values.out, `prompt-${name}.md`)
	writeFileSync(path, render({ ...roster, backlog: values.backlog }))
	process.stdout.write(`eval: wrote ${path}\n`)
}
process.stdout.write(
	'\nspawn 3 runs per prompt, same model for all six, each told only to read its prompt file.\n' +
		'never tell a runner it is being evaluated. score against references/backlog.md.\n',
)
