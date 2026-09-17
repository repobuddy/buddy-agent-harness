import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { launchers } from '../skill-scripts/launchers.ts'
import {
	bridgeRepairs,
	commandInvocation,
	type DoctorProblem,
	doctorRepairs,
	handWrittenPinTargets,
	initSkillInvocation,
	instructionRepairs,
	launcherFor,
	nonstandardRepairs,
	type RepairRow,
	renderDoctorReferences,
	renderDoctorSkill,
	repairFor,
	repairSkillInvocation,
	skillInvocation,
} from './doctor-guidance.ts'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const version = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version as string

describe('doctor guidance', () => {
	it('has one repair for every problem it can report', () => {
		for (const entry of doctorRepairs) expect(repairFor(entry.problem)).toEqual(entry)
	})

	// The half the assertion above cannot reach. Iterating the table and looking each entry back up
	// is the direction that cannot fail; the direction that can is a problem added to a union with no
	// row written for it, and a union is not enumerable at runtime. So the table is keyed by the
	// union and the compiler holds it, which makes a type error the only place this is assertable.
	it('does not type a repair table that leaves a problem without a row', () => {
		// @ts-expect-error - a table of one row is not a row for every DoctorProblem
		const incomplete: Record<DoctorProblem, RepairRow> = { stale: repairFor('stale') }

		expect(Object.keys(incomplete)).toEqual(['stale'])
	})

	// The contract `help` is read through: a non-empty `command` runs verbatim and finishes the job,
	// an empty one means judgment. `instruction` is the half that is always there.
	it('gives every repair an instruction, and leaves the command optional', () => {
		for (const entry of doctorRepairs) {
			const repair = entry.repair({ file: '<path>' }, 'bah')

			expect(repair.instruction, entry.problem).not.toBe('')
			expect(repair, entry.problem).toHaveProperty('command')
		}
	})

	// Nothing wraps a repair. The wrapper this replaced read `Run ` + the repair, which turned an
	// instruction to a person into an invitation to paste prose into a shell.
	it('wraps no repair in an imperative it does not carry itself', () => {
		for (const entry of doctorRepairs) {
			expect(entry.repair({ file: '<path>' }, 'bah').instruction, entry.problem).not.toMatch(/^Run /)
		}
	})

	// The data-loss guard. `git diff --no-index` is perfectly runnable, and running it reconciles
	// nothing — so it stays inside the prose. A caller that executes every `command` it is handed and
	// nothing else therefore never rebuilds a diverged bridge over the side holding the newer edit.
	it('offers no command for a repair no single invocation completes', () => {
		// Asserted as a closed set rather than spot-checked, so a bridge problem added later that no
		// single invocation repairs has to be listed here deliberately instead of passing unnoticed.
		const judgment = bridgeRepairs.filter((entry) => entry.repair({ file: '<path>' }, 'bah').command === '')

		expect(judgment.map((entry) => entry.problem)).toEqual(['diverged-bridge', 'diverged-both', 'diverged-unknown'])
		for (const entry of judgment) {
			expect(entry.repair({ file: '<path>' }, 'bah').instruction, entry.problem).not.toBe('')
		}
		expect(repairFor('diverged-both').repair({ file: '<path>' }, 'bah').instruction).toContain('git diff --no-index')
	})

	// A skill invocation is not a command: nothing in a shell runs `/buddy-agent-harness:init`. Every
	// instruction-bridge repair is one, which is why none of them offers a command either.
	it('never offers a skill invocation as a runnable command', () => {
		for (const entry of doctorRepairs) {
			expect(entry.repair({ file: '<path>' }, 'bah').command, entry.problem).not.toContain('/buddy-agent-harness:')
		}
		for (const entry of instructionRepairs) {
			expect(entry.repair({ file: '<path>' }, 'bah').command, entry.problem).toBe('')
		}
	})

	// A command that is real is always quoted in its own prose, so the two halves never disagree and
	// a person reading `--format text` sees the same invocation an agent would run.
	it('quotes every command it offers inside its own instruction', () => {
		for (const entry of doctorRepairs) {
			const { command, instruction } = entry.repair({ file: '<path>' }, 'bah')

			if (command) expect(instruction, entry.problem).toContain(`\`${command}\``)
		}
	})

	// Across the whole shipped skill, not just SKILL.md: the tables moved into the reference pages,
	// and a repair rendered into no page at all is a finding the reader can never route.
	it('renders every repair into the skill, with the path parameterized', () => {
		const pages = [renderDoctorSkill(version), ...renderDoctorReferences(initHarnessReferences()).map((d) => d.content)]

		for (const entry of doctorRepairs) {
			const detail = pages.filter((page) => page.includes(entry.detail))
			const repair = pages.filter((page) => page.includes(entry.skillRepair({ file: '<path>' }).replaceAll('|', '\\|')))
			// Exactly one page, not at least one: a repair on two pages is two homes for one fact, and
			// the reader who loads the other one acts on the copy that was not updated.
			expect(detail, `detail for ${entry.problem}`).toHaveLength(1)
			expect(repair.length, `repair for ${entry.problem}`).toBeGreaterThan(0)
		}
	})

	// A skill may be installed without the binary on PATH, so its fallback runs through npx.
	it('never points the skill at a bare binary invocation', () => {
		expect(renderDoctorSkill(version)).not.toMatch(/(?<!npx -y )buddy-agent-harness (init|doctor)/)
	})

	// Rebuilding a bridge can move user-authored skills, so the skill hands that back to `init`
	// rather than running the command itself.
	it('never tells the skill to run the init command', () => {
		expect(renderDoctorSkill(version)).not.toMatch(/buddy-agent-harness init/)
	})

	// An unpinned fallback resolves whatever npm calls latest, which can be a CLI whose findings
	// the table above it does not list.
	it('pins the npx fallback to the version that generated the skill', () => {
		expect(renderDoctorSkill(version)).toContain(skillInvocation(version))
		expect(skillInvocation('1.2.3')).toBe('npx -y buddy-agent-harness@^1.2.3')
	})

	// The build step that keeps them in step is `pnpm skill:gen:check`; this catches the drift
	// during an ordinary test run as well.
	it('matches the committed skill', () => {
		expect(readFileSync(join(packageRoot, 'skills', 'doctor', 'SKILL.md'), 'utf8')).toBe(renderDoctorSkill(version))
	})

	it('matches every committed reference page', () => {
		const docs = renderDoctorReferences(initHarnessReferences())
		expect(docs.length).toBeGreaterThan(0)
		for (const doc of docs) {
			expect(readFileSync(join(packageRoot, 'skills', 'doctor', ...doc.path.split('/')), 'utf8')).toBe(doc.content)
		}
	})

	// The split is only an improvement if the pointers land. A page named in SKILL.md that does not
	// exist costs the reader the whole lookup and teaches them to stop following the table.
	it('ships every reference page its own pointer table names', () => {
		for (const [, path] of renderDoctorSkill(version).matchAll(/`(references\/[a-z-]+\.md)`/g)) {
			expect(existsSync(join(packageRoot, 'skills', 'doctor', ...(path as string).split('/')))).toBe(true)
		}
	})

	// A harness page hands editorial judgment to the `init` skill by relative path. Resolved here
	// rather than eyeballed: the depth is three levels up and reads as plausible at any of them.
	it('resolves every cross-reference into the init skill', () => {
		const harnessPages = renderDoctorReferences(initHarnessReferences()).filter((doc) =>
			doc.path.startsWith('references/harnesses/'),
		)
		const links = harnessPages.flatMap((doc) =>
			[...doc.content.matchAll(/`((?:\.\.\/)+[^`]+\.md)`/g)].map((match) => ({ doc, target: match[1] as string })),
		)
		expect(links.length).toBeGreaterThan(0)
		for (const { doc, target } of links) {
			const from = dirname(join(packageRoot, 'skills', 'doctor', ...doc.path.split('/')))
			expect(existsSync(resolve(from, target))).toBe(true)
		}
	})
})

/** The same filesystem read the generator does, so the test is not a second copy of the list. */
function initHarnessReferences(): Set<string> {
	return new Set(
		readdirSync(join(packageRoot, 'skills', 'init', 'references', 'harnesses'))
			.filter((entry) => entry.endsWith('.md'))
			.map((entry) => entry.slice(0, -'.md'.length)),
	)
}

describe('hand-written skill pins', () => {
	// The hole this closes: a hand-written SKILL.md with a pin that nothing in the generator's
	// target list names goes stale silently, the way `skills/repair/SKILL.md`'s pin once did. This
	// walks the same directory the generator does and asserts nothing it finds is left uncovered.
	it('targets every shipped SKILL.md that names an npx invocation of this package, doctor excepted', () => {
		const skillsRoot = join(packageRoot, 'skills')
		const onDisk = readdirSync(skillsRoot, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && entry.name !== 'doctor')
			.map((entry) => join(skillsRoot, entry.name, 'SKILL.md'))
			.filter((path) => existsSync(path) && readFileSync(path, 'utf8').includes(`npx -y ${commandInvocation}`))

		expect(onDisk.length).toBeGreaterThan(0)
		expect(
			handWrittenPinTargets(skillsRoot, version)
				.map((target) => target.path)
				.sort(),
		).toEqual(onDisk.sort())
	})

	it('rewrites a stale pin to the given version, and leaves doctor and pin-free skills out', () => {
		const skillsRoot = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-pins-'))
		mkdirSync(join(skillsRoot, 'repair'), { recursive: true })
		writeFileSync(join(skillsRoot, 'repair', 'SKILL.md'), 'Fall back to `npx -y buddy-agent-harness@^0.1.0 doctor`.\n')
		mkdirSync(join(skillsRoot, 'doctor'), { recursive: true })
		writeFileSync(join(skillsRoot, 'doctor', 'SKILL.md'), 'Fall back to `npx -y buddy-agent-harness@^0.1.0 doctor`.\n')
		mkdirSync(join(skillsRoot, 'enhance'), { recursive: true })
		writeFileSync(join(skillsRoot, 'enhance', 'SKILL.md'), 'No npx fallback here.\n')
		mkdirSync(join(skillsRoot, 'no-skill-file'), { recursive: true })

		const targets = handWrittenPinTargets(skillsRoot, '9.9.9')

		expect(targets).toEqual([
			{
				path: join(skillsRoot, 'repair', 'SKILL.md'),
				expected: 'Fall back to `npx -y buddy-agent-harness@^9.9.9 doctor`.\n',
			},
		])
		// What `--check` reports as stale: the rewritten target's expected content differs from what
		// is still committed, so a check run that reads this file back would flag it.
		expect(readFileSync(targets[0]?.path as string, 'utf8')).not.toBe(targets[0]?.expected)
	})

	it('finds nothing under a skills directory that does not exist', () => {
		expect(handWrittenPinTargets(join(tmpdir(), 'buddy-agent-harness-pins-missing'), version)).toEqual([])
	})
})

describe('skill script', () => {
	// The source each skill's bundle is built from — not the built bundle itself, which is
	// minified and gitignored (see `tsdown.config.ts` and `scripts/pack-check.ts`, which check the
	// packed, runnable artifact instead of a byte-for-byte copy).
	function skillScriptSource(subcommand: string): string {
		return readFileSync(join(packageRoot, 'src', 'skill-scripts', `${subcommand}.ts`), 'utf8')
	}

	it('builds its argv with the subcommand inserted, mutating nothing', () => {
		const source = skillScriptSource('doctor')

		expect(source).toContain("[...process.argv.slice(0, 2), 'doctor', ...process.argv.slice(2)]")
		expect(source).not.toContain('process.argv.splice')
	})

	it('calls the entry point instead of importing the executable for its side effect', () => {
		const source = skillScriptSource('doctor')

		expect(source).toContain("import { run } from '../cli.ts'")
		expect(source).not.toContain(`'bin'`)
	})

	// One source file per subcommand, not one per skill: `repair` and `init` both ship `doctor`'s
	// bundle rather than hand-rolling a second way of reaching the CLI. A skill added to `launchers`
	// with no matching source under `src/skill-scripts/` has nothing for `tsdown.config.ts` to build.
	it('has a source file for every subcommand a shipped skill runs', () => {
		expect(launchers.length).toBeGreaterThan(0)
		for (const subcommand of new Set(launchers.map((entry) => entry.subcommand))) {
			expect(existsSync(join(packageRoot, 'src', 'skill-scripts', `${subcommand}.ts`))).toBe(true)
		}
	})

	// `pnpm build`, which copies the bundles, is expected to have run before this suite, the same way CI
	// orders it (see `turbo.json`). Confirms the copy landed and carries the generated header, not
	// that its bytes match some second rendering of it.
	it('copies the built bundle into every skill that runs it', () => {
		for (const { skill, subcommand } of launchers) {
			const script = readFileSync(join(packageRoot, 'skills', skill, launcherFor(subcommand)), 'utf8')

			expect(script).toContain('#!/usr/bin/env node')
			expect(script).toContain(`Generated from packages/buddy-agent-harness/src/skill-scripts/${subcommand}.ts by`)
		}
	})

	// The point of the bundle: it resolves the CLI from within itself, so it runs from a repository
	// root that is nowhere near the skill and downloads nothing. `scripts/pack-check.ts` covers the
	// stronger claim — that it also runs with no `node_modules` anywhere above it, once packed.
	it('runs the shipped CLI against the working directory, not its own', () => {
		const script = join(packageRoot, 'skills', 'doctor', launcherFor('doctor'))
		const stdout = execFileSync(process.execPath, [script, '--format', 'json'], {
			cwd: packageRoot,
			encoding: 'utf8',
		})

		expect(() => JSON.parse(stdout)).not.toThrow()
	})
})

/**
 * The two families the module keeps private. Named rather than derived by exclusion: deriving the
 * configuration family as "everything in neither exported family" silently swallowed the MCP family
 * the moment it landed, and the guard below is what makes the next one fail loudly instead.
 */
const configurationProblems = ['deprecated-harness', 'ignored-bridge', 'unread-local-override', 'unloadable-skill']
const configurationRepairs = doctorRepairs.filter((entry) => configurationProblems.includes(entry.problem))
const mcpRepairs = doctorRepairs.filter((entry) => entry.problem.startsWith('mcp-'))

/** The bridge problems a rebuilt bridge fixes — every one but the three that need a hand. */
const byHand = ['diverged-both', 'diverged-unknown', 'unpinned-copy']

describe('the detect-and-repair seam', () => {
	// One entry, two renderings, for two readers. A skill must not run `init` itself, so the skill
	// rendering hands the work to the `init` skill; a caller reading the command's output can just
	// run the invocation, so the command rendering gives it one and names no skill.
	it('renders every repair twice, and the two disagree about who acts', () => {
		for (const entry of doctorRepairs) expect(repairFor(entry.problem)).toEqual(entry)

		const missing = repairFor('missing')
		expect(missing.repair({ file: '<path>' }, commandInvocation).command).toBe(`${commandInvocation} init`)
		expect(missing.skillRepair({ file: '<path>' })).toContain(initSkillInvocation)

		// The bridge family is where the two part: no bridge repair names a skill in `help`.
		for (const entry of bridgeRepairs) {
			const { command, instruction } = entry.repair({ file: '<path>' }, commandInvocation)
			expect(`${command}${instruction}`).not.toContain(initSkillInvocation)
			expect(`${command}${instruction}`).not.toContain(repairSkillInvocation)
		}
	})

	it('carries a repair with every finding it reports', () => {
		for (const entry of doctorRepairs) {
			expect(entry.detail).not.toBe('')
			expect(entry.repair({ file: '.claude/skills' }, 'bah').instruction).not.toBe('')
			expect(entry.skillRepair({ file: '.claude/skills' })).not.toBe('')
		}
	})

	it('sends a bridge finding to the init skill wherever rebuilding is the repair', () => {
		for (const entry of bridgeRepairs.filter((repair) => !byHand.includes(repair.problem)))
			expect(entry.skillRepair({ file: '<path>' })).toContain(initSkillInvocation)
	})

	// Rebuilding is what destroys the work here, so no skill is named at all — an invented owner
	// would be `init`, which is the one thing that must not run.
	it('names no skill for a finding that rebuilding would not repair', () => {
		for (const entry of bridgeRepairs.filter((repair) => byHand.includes(repair.problem))) {
			const skillRepair = entry.skillRepair({ file: '<path>' })
			expect(skillRepair).not.toContain(initSkillInvocation)
			expect(skillRepair).not.toContain(repairSkillInvocation)
			expect(skillRepair).toContain('git ')
		}
	})

	it('sends every instruction finding to the init skill', () => {
		for (const entry of instructionRepairs) expect(entry.skillRepair({ file: '<path>' })).toContain(initSkillInvocation)
	})

	it('sends every configuration finding to the repair skill', () => {
		expect(configurationRepairs).toHaveLength(configurationProblems.length)
		for (const entry of configurationRepairs)
			expect(entry.skillRepair({ file: '<path>' })).toContain(repairSkillInvocation)
	})

	// Correcting a drifted server set is the user's judgment about which side is right, so no skill
	// is named in either rendering.
	it('names no skill for any MCP finding, in either rendering', () => {
		expect(mcpRepairs.length).toBeGreaterThan(0)
		for (const entry of mcpRepairs) {
			const { command, instruction } = entry.repair({ file: '<path>' }, commandInvocation)
			for (const text of [entry.skillRepair({ file: '<path>' }), command, instruction]) {
				expect(text).not.toContain(initSkillInvocation)
				expect(text).not.toContain(repairSkillInvocation)
			}
		}
	})

	// The families must partition the table. When a sixth arrives this fails, rather than letting an
	// exclusion-derived family quietly absorb it and assert the wrong owner for every one of its
	// problems — which is exactly what happened when the MCP family landed.
	it('accounts for every problem in exactly one family', () => {
		const families = [bridgeRepairs, instructionRepairs, configurationRepairs, mcpRepairs, nonstandardRepairs]
		const counted = families.flatMap((family) => family.map((entry) => entry.problem))

		expect(new Set(counted).size).toBe(counted.length)
		expect(counted.sort()).toEqual(doctorRepairs.map((entry) => entry.problem).sort())
	})

	// The name is what a consumer routes on, so it must not have to be recovered from the prose.
	it('keeps the routable name out of the prose detail', () => {
		for (const entry of doctorRepairs) expect(entry.detail).not.toContain(entry.problem)
	})

	// One repair per problem, never a set to choose from. Where more than one correction is valid,
	// the options come from the repairing skill's own reference, not from the report.
	it('states exactly one repair per problem, never a set to choose between', () => {
		for (const entry of doctorRepairs) {
			expect(repairFor(entry.problem)).toEqual(entry)
			expect(Object.keys(entry.repair({ file: '.claude/skills' }, 'bah')).sort()).toEqual(['command', 'instruction'])
			expect(typeof entry.skillRepair({ file: '.claude/skills' })).toBe('string')
		}
	})
})

/** The bridge problems a person must choose or reconcile through before anything is rebuilt. */
const needsAPersonFirst = ['diverged-bridge', 'diverged-both', 'diverged-unknown']

describe('the repair as a command and an instruction', () => {
	it('states a repair as a runnable command and a prose instruction', () => {
		const { command, instruction } = repairFor('degraded').repair({ file: '.claude/skills' }, commandInvocation)

		expect(command).toBe(`${commandInvocation} init --copy --force .claude/skills`)
		expect(instruction).toContain(command)
		expect(instruction).not.toMatch(/^Run `/)
	})

	it('leaves the command empty for a repair that is judgment', () => {
		const { command, instruction } = repairFor('unloadable-skill').repair({ file: '.agents/skills/x/SKILL.md' }, 'bah')

		expect(command).toBe('')
		expect(instruction).not.toBe('')
	})

	it('carries an instruction for every repair, and a command only where one completes it', () => {
		const rendered = doctorRepairs.map((entry) => ({
			problem: entry.problem,
			...entry.repair({ file: '.claude/skills' }, commandInvocation),
		}))

		for (const entry of rendered) expect(entry.instruction).not.toBe('')
		expect(rendered.filter((entry) => entry.command !== '').map((entry) => entry.problem)).toEqual([
			'no-canonical',
			'missing',
			'degraded',
			'stale',
			'diverged-canonical',
			'unpinned-copy',
		])
	})

	// The data-loss guard, and the reason the split is worth its cost. Each of these quotes a
	// genuinely runnable invocation inside its instruction — a diff, or an init after a manual
	// replace — and carries no command, because running that invocation is not the repair.
	it('gives a diverged bridge no command, so executing every command destroys nothing', () => {
		for (const problem of needsAPersonFirst) {
			const { command, instruction } = repairFor(problem as (typeof needsAPersonFirst)[number] & DoctorProblem).repair(
				{ file: '.claude/skills' },
				commandInvocation,
			)

			expect(command).toBe('')
			expect(instruction).toContain('`')
		}

		const runnable = doctorRepairs
			.map((entry) => ({ problem: entry.problem, ...entry.repair({ file: '.claude/skills' }, commandInvocation) }))
			.filter((entry) => entry.command !== '')
			.map((entry) => entry.problem)
		expect(runnable.filter((problem) => needsAPersonFirst.includes(problem))).toEqual([])
	})
})

/** Reported once per repository rather than once per path, so neither can recur within a run. */
const reportedOncePerRepository = ['no-canonical', 'no-instructions']

// The `help` deduplication is a guard, not a behavior a caller sees: every repair that can arise
// at two paths names its path, so two findings never produce the same pair. Asserted against the
// real table rather than a fixture, because a hand-built finding can hold any repair at all and so
// cannot notice a template that stopped naming its path.
it('gives two findings of one problem at two paths their own help entry each', () => {
	const collides = doctorRepairs
		.filter((entry) => {
			const left = entry.repair({ file: '.claude/skills' }, commandInvocation)
			const right = entry.repair({ file: '.windsurf/skills' }, commandInvocation)
			return left.command === right.command && left.instruction === right.instruction
		})
		.map((entry) => entry.problem)

	expect(collides).toEqual(reportedOncePerRepository)
})

/**
 * The repairs `init` owns: every instruction bridge, every skills bridge a rebuild fixes, and every
 * non-standard artifact with a canonical form to convert to. The rest name no owner and are work
 * for a person — including `nonstandard-subagent`, which has no portable form to convert into.
 */
const initOwned: DoctorProblem[] = [
	'no-canonical',
	'missing',
	'degraded',
	'stale',
	'diverged-bridge',
	'diverged-canonical',
	'no-instructions',
	'instructions-missing',
	'instructions-unbridged',
	'instructions-unreadable',
	'nonstandard-instructions',
	'nonstandard-rule',
	'nonstandard-command',
	'nonstandard-skill',
]

// The `repair` skill decides who to hand a finding to by asking whether its repair names `init` at
// all — the `/buddy-agent-harness:init` skill or a `buddy-agent-harness init` command line, since
// the command rendering uses the second form for every bridge repair and the first for every
// instruction repair. That question is only answerable from the report if the two sets coincide
// exactly, so the shipped guidance is pinned to the table here: a repair that stopped naming `init`
// would silently reroute its finding to a person, which is the drift this asserts against.
it('names init in every repair init owns, and in no other', () => {
	const namesInit = doctorRepairs
		.filter((entry) => {
			const { command, instruction } = entry.repair({ file: '<path>' }, commandInvocation)
			const text = `${command}\n${instruction}`
			return text.includes(initSkillInvocation) || text.includes(`${commandInvocation} init`)
		})
		.map((entry) => entry.problem)

	expect(namesInit).toEqual(initOwned)
})
