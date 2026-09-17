/**
 * Keeps the shipped skills in step with the code and the version they ship with (AXI §7).
 *
 * Jobs, all driven by `package.json`'s version:
 *   - `skills/<skill>/scripts/<subcommand>.mjs` is the bundle each skill runs in preference to `npx`
 *     — copied from `dist/skill-scripts/<subcommand>.mjs`, which `pnpm build` produces. The bundle
 *     is never committed (see `.gitignore`) and ships through the npm package instead, so it is
 *     copied on every run rather than compared for staleness the way the targets below are.
 *   - `skills/doctor/SKILL.md` is written whole from the guidance the `doctor` command prints.
 *   - `skills/doctor/references/**` is written whole from the same guidance and the harness registry,
 *     so an agent loads one finding family rather than all of them.
 *   - every other `skills/<skill>/SKILL.md` is hand-written prose, so only its `npx` fallback is
 *     rewritten, if it has one. Which files those are is read off the `skills/` directory rather than
 *     listed here, so a new hand-written skill with a pin is covered with no edit to this script.
 *
 * The fallback is pinned to the caret range of the version that shipped the skill. Unpinned, a
 * skill from an old install drives whatever `npx` resolves as latest, and its flags and findings
 * stop describing the command it just ran.
 *
 *   pnpm skill:gen          rewrite the committed skills and copy the built bundles
 *   pnpm skill:gen --check  fail when a committed skill is stale (the CI step)
 *
 * `--check` does not touch the bundles at all: whether the packed tarball carries every one of them,
 * and whether one runs standalone, is `scripts/pack-check.ts`'s job, not this one's.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	handWrittenPinTargets,
	launcherFor,
	renderDoctorReferences,
	renderDoctorSkill,
} from '../src/diagnose-bridges/doctor-guidance.ts'
import { launchers } from '../src/skill-scripts/launchers.ts'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const version = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version as string

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

function bundlePath(subcommand: string): string {
	return join(packageRoot, 'dist', 'skill-scripts', `${subcommand}.mjs`)
}

const targets: { path: string; expected: string | undefined }[] = []

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

// Every other hand-written SKILL.md that names an `npx` fallback. Only the pin is generated, so an
// edit to the surrounding prose survives.
targets.push(...handWrittenPinTargets(skillPath(''), version))

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

// The bundles are copied only in write mode. They are gitignored and shipped through the npm
// package rather than committed, so `--check` has nothing to compare them against — that coverage
// is `scripts/pack-check.ts`'s, run after `npm pack`.
if (!check) {
	const subcommands = [...new Set(launchers.map((entry) => entry.subcommand))]
	for (const subcommand of subcommands) {
		const bundle = read(bundlePath(subcommand))
		if (bundle === undefined) {
			process.stdout.write(
				`error: ${bundlePath(subcommand).slice(packageRoot.length + 1)} is missing — run \`pnpm build\` first\n`,
			)
			process.exit(1)
		}
		for (const { skill, subcommand: target } of launchers) {
			if (target !== subcommand) continue
			const path = skillPath(skill, launcherFor(subcommand))
			mkdirSync(dirname(path), { recursive: true })
			writeFileSync(path, bundle)
			process.stdout.write(`skill: wrote ${path.slice(packageRoot.length + 1)}\n`)
		}
	}
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
