import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
	doctorRepairs,
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
