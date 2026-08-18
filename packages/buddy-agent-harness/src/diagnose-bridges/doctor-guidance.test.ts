import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	doctorRepairs,
	instructionRepairs,
	launcherFor,
	renderDoctorSkill,
	renderSkillLauncher,
	repairFor,
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
		const judgment = ['diverged-bridge', 'diverged-both', 'diverged-unknown'] as const

		for (const problem of judgment) {
			const repair = repairFor(problem).repair('<path>', 'bah')

			expect(repair.command, problem).toBe('')
			expect(repair.instruction, problem).not.toBe('')
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
