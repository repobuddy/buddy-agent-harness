/**
 * Writes `skills/doctor/SKILL.md` from the guidance the `doctor` command itself prints, so the
 * shipped skill cannot drift from the CLI (AXI §7).
 *
 *   pnpm skill:doctor          rewrite the committed skill
 *   pnpm skill:doctor --check  fail when the committed skill is stale (the CI step)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderDoctorSkill } from '../src/diagnose-bridges/doctor-guidance.ts'

const target = join(dirname(dirname(fileURLToPath(import.meta.url))), 'skills', 'doctor', 'SKILL.md')
const expected = renderDoctorSkill()

if (process.argv.includes('--check')) {
	let actual: string | undefined
	try {
		actual = readFileSync(target, 'utf8')
	} catch {
		actual = undefined
	}
	if (actual !== expected) {
		process.stdout.write(
			'error: skills/doctor/SKILL.md is out of date with src/diagnose-bridges/doctor-guidance.ts\n' +
				'help: Run `pnpm --filter buddy-agent-harness skill:doctor` and commit the result\n',
		)
		process.exit(1)
	}
	process.stdout.write('skill: skills/doctor/SKILL.md is up to date\n')
} else {
	mkdirSync(dirname(target), { recursive: true })
	writeFileSync(target, expected)
	process.stdout.write(`skill: wrote ${target}\n`)
}
