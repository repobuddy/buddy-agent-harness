import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { doctorRepairs, renderDoctorSkill, repairFor, skillInvocation } from './doctor-guidance.ts'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

describe('doctor guidance', () => {
	it('has one repair for every problem it can report', () => {
		for (const entry of doctorRepairs) expect(repairFor(entry.problem)).toBe(entry)
	})

	it('renders every repair into the skill, with the path parameterized', () => {
		const skill = renderDoctorSkill()

		for (const entry of doctorRepairs) {
			expect(skill).toContain(entry.detail)
			expect(skill).toContain(entry.repair('<path>', skillInvocation).replaceAll('|', '\\|'))
		}
	})

	// A skill may be installed without the binary on PATH, so its examples must run through npx.
	it('never points the skill at a bare binary invocation', () => {
		expect(renderDoctorSkill()).not.toMatch(/(?<!npx -y )buddy-agent-harness (init|doctor)/)
	})

	// The build step that keeps them in step is `pnpm skill:doctor:check`; this catches the drift
	// during an ordinary test run as well.
	it('matches the committed skill', () => {
		expect(readFileSync(join(packageRoot, 'skills', 'doctor', 'SKILL.md'), 'utf8')).toBe(renderDoctorSkill())
	})
})
