import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	bridgeRepairs,
	commandInvocation,
	type DoctorProblem,
	doctorRepairs,
	initSkillInvocation,
	instructionRepairs,
	launcherFor,
	renderDoctorSkill,
	renderSkillLauncher,
	repairFor,
	repairSkillInvocation,
	skillInvocation,
} from './doctor-guidance.ts'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const version = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version as string

describe('doctor guidance', () => {
	it('has one repair for every problem it can report', () => {
		for (const entry of doctorRepairs) expect(repairFor(entry.problem)).toBe(entry)
	})

	// The contract `help` is read through: a non-empty `command` runs verbatim and finishes the job,
	// an empty one means judgment. `instruction` is the half that is always there.
	it('gives every repair an instruction, and leaves the command optional', () => {
		for (const entry of doctorRepairs) {
			const repair = entry.repair('<path>', 'bah')

			expect(repair.instruction, entry.problem).not.toBe('')
			expect(repair, entry.problem).toHaveProperty('command')
		}
	})

	// Nothing wraps a repair. The wrapper this replaced read `Run ` + the repair, which turned an
	// instruction to a person into an invitation to paste prose into a shell.
	it('wraps no repair in an imperative it does not carry itself', () => {
		for (const entry of doctorRepairs) {
			expect(entry.repair('<path>', 'bah').instruction, entry.problem).not.toMatch(/^Run /)
		}
	})

	// The data-loss guard. `git diff --no-index` is perfectly runnable, and running it reconciles
	// nothing — so it stays inside the prose. A caller that executes every `command` it is handed and
	// nothing else therefore never rebuilds a diverged bridge over the side holding the newer edit.
	it('offers no command for a repair no single invocation completes', () => {
		// Asserted as a closed set rather than spot-checked, so a bridge problem added later that no
		// single invocation repairs has to be listed here deliberately instead of passing unnoticed.
		const judgment = bridgeRepairs.filter((entry) => entry.repair('<path>', 'bah').command === '')

		expect(judgment.map((entry) => entry.problem)).toEqual(['diverged-bridge', 'diverged-both', 'diverged-unknown'])
		for (const entry of judgment) {
			expect(entry.repair('<path>', 'bah').instruction, entry.problem).not.toBe('')
		}
		expect(repairFor('diverged-both').repair('<path>', 'bah').instruction).toContain('git diff --no-index')
	})

	// A skill invocation is not a command: nothing in a shell runs `/buddy-agent-harness:init`. Every
	// instruction-bridge repair is one, which is why none of them offers a command either.
	it('never offers a skill invocation as a runnable command', () => {
		for (const entry of doctorRepairs) {
			expect(entry.repair('<path>', 'bah').command, entry.problem).not.toContain('/buddy-agent-harness:')
		}
		for (const entry of instructionRepairs) {
			expect(entry.repair('<path>', 'bah').command, entry.problem).toBe('')
		}
	})

	// A command that is real is always quoted in its own prose, so the two halves never disagree and
	// a person reading `--format text` sees the same invocation an agent would run.
	it('quotes every command it offers inside its own instruction', () => {
		for (const entry of doctorRepairs) {
			const { command, instruction } = entry.repair('<path>', 'bah')

			if (command) expect(instruction, entry.problem).toContain(`\`${command}\``)
		}
	})

	it('renders every repair into the skill, with the path parameterized', () => {
		const skill = renderDoctorSkill(version)

		for (const entry of doctorRepairs) {
			expect(skill).toContain(entry.detail)
			expect(skill).toContain(entry.skillRepair('<path>').replaceAll('|', '\\|'))
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
})

describe('skill launcher', () => {
	it.each(['doctor', 'init'])('matches the committed launcher for %s', (skill) => {
		expect(readFileSync(join(packageRoot, 'skills', skill, launcherFor(skill)), 'utf8')).toBe(
			renderSkillLauncher(skill),
		)
	})

	// The point of the launcher: it resolves the CLI from its own location, so it runs from a
	// repository root that is nowhere near the skill and downloads nothing.
	it('runs the shipped CLI against the working directory, not its own', () => {
		const launcher = join(packageRoot, 'skills', 'doctor', launcherFor('doctor'))
		const stdout = execFileSync(process.execPath, [launcher, '--format', 'json'], {
			cwd: packageRoot,
			encoding: 'utf8',
		})

		expect(() => JSON.parse(stdout)).not.toThrow()
	})
})

/** The configuration faults, which the module keeps private: everything in neither other family. */
const configurationRepairs = doctorRepairs.filter(
	(entry) => !bridgeRepairs.includes(entry) && !instructionRepairs.includes(entry),
)

/** The bridge problems a rebuilt bridge fixes — every one but the three that need a hand. */
const byHand = ['diverged-both', 'diverged-unknown', 'unpinned-copy']

describe('the detect-and-repair seam', () => {
	// One entry, two renderings, for two readers. A skill must not run `init` itself, so the skill
	// rendering hands the work to the `init` skill; a caller reading the command's output can just
	// run the invocation, so the command rendering gives it one and names no skill.
	it('renders every repair twice, and the two disagree about who acts', () => {
		for (const entry of doctorRepairs) expect(repairFor(entry.problem)).toBe(entry)

		const missing = repairFor('missing')
		expect(missing.repair('<path>', commandInvocation).command).toBe(`${commandInvocation} init`)
		expect(missing.skillRepair('<path>')).toContain(initSkillInvocation)

		// The bridge family is where the two part: no bridge repair names a skill in `help`.
		for (const entry of bridgeRepairs) {
			const { command, instruction } = entry.repair('<path>', commandInvocation)
			expect(`${command}${instruction}`).not.toContain(initSkillInvocation)
			expect(`${command}${instruction}`).not.toContain(repairSkillInvocation)
		}
	})

	it('carries a repair with every finding it reports', () => {
		for (const entry of doctorRepairs) {
			expect(entry.detail).not.toBe('')
			expect(entry.repair('.claude/skills', 'bah').instruction).not.toBe('')
			expect(entry.skillRepair('.claude/skills')).not.toBe('')
		}
	})

	it('sends a bridge finding to the init skill wherever rebuilding is the repair', () => {
		for (const entry of bridgeRepairs.filter((repair) => !byHand.includes(repair.problem)))
			expect(entry.skillRepair('<path>')).toContain(initSkillInvocation)
	})

	// Rebuilding is what destroys the work here, so no skill is named at all — an invented owner
	// would be `init`, which is the one thing that must not run.
	it('names no skill for a finding that rebuilding would not repair', () => {
		for (const entry of bridgeRepairs.filter((repair) => byHand.includes(repair.problem))) {
			const skillRepair = entry.skillRepair('<path>')
			expect(skillRepair).not.toContain(initSkillInvocation)
			expect(skillRepair).not.toContain(repairSkillInvocation)
			expect(skillRepair).toContain('git ')
		}
	})

	it('sends every instruction finding to the init skill', () => {
		for (const entry of instructionRepairs) expect(entry.skillRepair('<path>')).toContain(initSkillInvocation)
	})

	it('sends every configuration finding to the repair skill', () => {
		expect(configurationRepairs.length).toBeGreaterThan(0)
		for (const entry of configurationRepairs) expect(entry.skillRepair('<path>')).toContain(repairSkillInvocation)
	})

	// The name is what a consumer routes on, so it must not have to be recovered from the prose.
	it('keeps the routable name out of the prose detail', () => {
		for (const entry of doctorRepairs) expect(entry.detail).not.toContain(entry.problem)
	})

	// One repair per problem, never a set to choose from. Where more than one correction is valid,
	// the options come from the repairing skill's own reference, not from the report.
	it('states exactly one repair per problem, never a set to choose between', () => {
		for (const entry of doctorRepairs) {
			expect(repairFor(entry.problem)).toBe(entry)
			expect(Object.keys(entry.repair('.claude/skills', 'bah')).sort()).toEqual(['command', 'instruction'])
			expect(typeof entry.skillRepair('.claude/skills')).toBe('string')
		}
	})
})

/** The bridge problems a person must choose or reconcile through before anything is rebuilt. */
const needsAPersonFirst = ['diverged-bridge', 'diverged-both', 'diverged-unknown']

describe('the repair as a command and an instruction', () => {
	it('states a repair as a runnable command and a prose instruction', () => {
		const { command, instruction } = repairFor('degraded').repair('.claude/skills', commandInvocation)

		expect(command).toBe(`${commandInvocation} init --copy --force`)
		expect(instruction).toContain(command)
		expect(instruction).not.toMatch(/^Run `/)
	})

	it('leaves the command empty for a repair that is judgment', () => {
		const { command, instruction } = repairFor('unloadable-skill').repair('.agents/skills/x/SKILL.md', 'bah')

		expect(command).toBe('')
		expect(instruction).not.toBe('')
	})

	it('carries an instruction for every repair, and a command only where one completes it', () => {
		const rendered = doctorRepairs.map((entry) => ({
			problem: entry.problem,
			...entry.repair('.claude/skills', commandInvocation),
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
				'.claude/skills',
				commandInvocation,
			)

			expect(command).toBe('')
			expect(instruction).toContain('`')
		}

		const runnable = doctorRepairs
			.map((entry) => ({ problem: entry.problem, ...entry.repair('.claude/skills', commandInvocation) }))
			.filter((entry) => entry.command !== '')
			.map((entry) => entry.problem)
		expect(runnable.filter((problem) => needsAPersonFirst.includes(problem))).toEqual([])
	})
})
