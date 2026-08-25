/**
 * Keeps the shipped skills in step with the code and the version they ship with (AXI §7).
 *
 * Three jobs, all driven by `package.json`'s version:
 *   - `skills/<name>/scripts/<name>.mjs` is the launcher each skill runs in preference to `npx`.
 *   - `skills/doctor/SKILL.md` is written whole from the guidance the `doctor` command prints.
 *   - `skills/doctor/references/**` is written whole from the same guidance and the harness registry,
 *     so an agent loads one finding family rather than all of them.
 *   - `skills/init/SKILL.md` is hand-written prose, so only its `npx` fallback is rewritten.
 *
 * The fallback is pinned to the caret range of the version that shipped the skill. Unpinned, a
 * skill from an old install drives whatever `npx` resolves as latest, and its flags and findings
 * stop describing the command it just ran.
 *
 *   pnpm skill:gen          rewrite the committed skills
 *   pnpm skill:gen --check  fail when a committed skill is stale (the CI step)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	launcherFor,
	renderDoctorReferences,
	renderDoctorSkill,
	renderSkillLauncher,
	skillInvocation,
} from '../src/diagnose-bridges/doctor-guidance.ts'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const version = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version as string

/** Any `npx` invocation of this CLI, pinned or not, so a stale pin is rewritten rather than doubled. */
const anyNpxInvocation = /npx -y buddy-agent-harness(@[^\s`]+)?/g

function read(path: string): string | undefined {
	try {
		return readFileSync(path, 'utf8')
	} catch {
		return undefined
	}
}

function skillPath(skill: string, ...rest: string[]): string {
	return join(packageRoot, 'skills', skill, ...rest)
}

const targets: { path: string; expected: string | undefined }[] = []

/**
 * Which subcommand each skill's launcher runs. Keyed by skill rather than assumed equal to it:
 * `repair` runs `doctor` to find what it repairs, and while that launcher was labelled generated it
 * was not on this list, so nothing rewrote it and nothing caught it going stale.
 */
const launchers: { skill: string; subcommand: string }[] = [
	{ skill: 'doctor', subcommand: 'doctor' },
	{ skill: 'init', subcommand: 'init' },
	{ skill: 'repair', subcommand: 'doctor' },
]

for (const { skill, subcommand } of launchers) {
	targets.push({ path: skillPath(skill, launcherFor(subcommand)), expected: renderSkillLauncher(subcommand) })
}

targets.push({ path: skillPath('doctor', 'SKILL.md'), expected: renderDoctorSkill(version) })

/**
 * Which harnesses the `init` skill has a hand-written page for, read off the filesystem rather than
 * listed here: a page added there is then linked from `doctor`'s own harness page with no second
 * edit, and a list written down here could only go stale against the directory it describes.
 */
function initHarnessReferences(): Set<string> {
	try {
		return new Set(
			readdirSync(skillPath('init', 'references', 'harnesses'))
				.filter((entry) => entry.endsWith('.md'))
				.map((entry) => entry.slice(0, -'.md'.length)),
		)
	} catch {
		return new Set()
	}
}

for (const doc of renderDoctorReferences(initHarnessReferences())) {
	targets.push({ path: skillPath('doctor', ...doc.path.split('/')), expected: doc.content })
}

// Hand-written prose. Only the pinned fallback is generated, so an edit to the body survives.
const initSkill = read(skillPath('init', 'SKILL.md'))
targets.push({
	path: skillPath('init', 'SKILL.md'),
	expected: initSkill?.replaceAll(anyNpxInvocation, skillInvocation(version)),
})

const check = process.argv.includes('--check')
const stale: string[] = []

for (const target of targets) {
	if (target.expected === undefined) {
		process.stdout.write(`error: ${target.path} is missing\n`)
		process.exit(1)
	}
	const relative = target.path.slice(packageRoot.length + 1)
	if (check) {
		if (read(target.path) !== target.expected) stale.push(relative)
		continue
	}
	mkdirSync(dirname(target.path), { recursive: true })
	writeFileSync(target.path, target.expected)
	process.stdout.write(`skill: wrote ${relative}\n`)
}

if (!check) process.exit(0)

if (stale.length > 0) {
	process.stdout.write(
		`error: out of date with src/diagnose-bridges/doctor-guidance.ts or version ${version}: ${stale.join(', ')}\n` +
			'help: Run `pnpm --filter buddy-agent-harness skill:gen` and commit the result\n',
	)
	process.exit(1)
}

process.stdout.write(`skill: shipped skills are up to date at ${version}\n`)
