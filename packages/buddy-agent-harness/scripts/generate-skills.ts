/**
 * Keeps the shipped skills in step with the code and the version they ship with (AXI §7).
 *
 * Hand-written `SKILL.md`s are found by reading the `skills/` directory rather than listed here, so
 * a new one needs no edit to this script. `--check` doesn't verify the bundles themselves — that's
 * `scripts/pack-check.ts`'s job.
 *
 *   pnpm skill:gen          rewrite the committed skills and copy the built bundles
 *   pnpm skill:gen --check  fail when a committed skill is stale (the CI step)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	doctorSkill,
	handWrittenPinTargets,
	initSkillName,
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

targets.push({ path: skillPath(doctorSkill.name, 'SKILL.md'), expected: renderDoctorSkill(version) })

// Read off the filesystem rather than listed here, so a new harness page needs no second edit and
// can't drift against the directory it describes.
function initHarnessReferences(): Set<string> {
	try {
		return new Set(
			readdirSync(skillPath(initSkillName, 'references', 'harnesses'))
				.filter((entry) => entry.endsWith('.md'))
				.map((entry) => entry.slice(0, -'.md'.length)),
		)
	} catch {
		return new Set()
	}
}

for (const doc of renderDoctorReferences(initHarnessReferences())) {
	targets.push({ path: skillPath(doctorSkill.name, ...doc.path.split('/')), expected: doc.content })
}

// A skill may be linked or copied out of the package alone, so it cannot read a sibling skill's
// references. Each page one skill reads from another is copied in whole; the copy is checked against
// its source like any other generated file.
const mirrors: { from: string[]; to: string[] }[] = [
	{ from: [initSkillName, 'references', 'agents-md.md'], to: ['repair', 'references', 'agents-md.md'] },
	{ from: [initSkillName, 'references', 'agents-md.md'], to: ['enhance', 'references', 'agents-md.md'] },
	{ from: [initSkillName, 'references', 'detection.md'], to: ['enhance', 'references', 'detection.md'] },
	{
		from: [doctorSkill.name, 'references', 'global-instructions.md'],
		to: ['enhance', 'references', 'global-instructions.md'],
	},
	...[...initHarnessReferences()].sort().map((name) => ({
		from: [initSkillName, 'references', 'harnesses', `${name}.md`],
		to: [doctorSkill.name, 'references', 'judgment', `${name}.md`],
	})),
]
for (const { from, to } of mirrors) {
	const generated = targets.find((target) => target.path === skillPath(from[0] as string, ...from.slice(1)))
	targets.push({
		path: skillPath(to[0] as string, ...to.slice(1)),
		expected: generated?.expected ?? read(skillPath(from[0] as string, ...from.slice(1))),
	})
}

// Every hand-written SKILL.md with an `npx` fallback: only the pin is regenerated, so edited prose
// survives.
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

// Bundles are copied only in write mode — gitignored, so `--check` has nothing to diff them against;
// `scripts/pack-check.ts` covers that, run after `npm pack`.
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
