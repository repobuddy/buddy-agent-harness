import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { doctorRepairs, renderDoctorSkill, repairFor } from './doctor-guidance.ts'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

describe('doctor guidance', () => {
	it('has one repair for every problem it can report', () => {
		for (const entry of doctorRepairs) expect(repairFor(entry.problem)).toBe(entry)
	})

	it('renders every repair into the skill, with the path parameterized', () => {
		const skill = renderDoctorSkill()

		for (const entry of doctorRepairs) {
			expect(skill).toContain(entry.detail)
			expect(skill).toContain(entry.skillRepair('<path>').replaceAll('|', '\\|'))
		}
	})

	// A skill may be installed without the binary on PATH, so its examples must run through npx.
	it('never points the skill at a bare binary invocation', () => {
		expect(renderDoctorSkill()).not.toMatch(/(?<!npx -y )buddy-agent-harness (init|doctor)/)
	})

	// Rebuilding a bridge can move user-authored skills, so the skill hands that back to `init`
	// rather than running the command itself.
	it('never tells the skill to run the init command', () => {
		expect(renderDoctorSkill()).not.toMatch(/buddy-agent-harness init/)
	})

	// The build step that keeps them in step is `pnpm skill:doctor:check`; this catches the drift
	// during an ordinary test run as well.
	it('matches the committed skill', () => {
		expect(readFileSync(join(packageRoot, 'skills', 'doctor', 'SKILL.md'), 'utf8')).toBe(renderDoctorSkill())
	})
})
