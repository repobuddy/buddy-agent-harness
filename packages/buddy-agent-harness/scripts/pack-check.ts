/**
 * Packs the package as `npm publish` would and checks the tarball directly — the shipped skill
 * scripts are gitignored, so there's no committed copy to diff against. Confirms every one is
 * present, and that one runs standalone from a copied-out skill folder with no `node_modules` above it.
 *
 *   pnpm pack:check
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { doctorSkill, launcherFor } from '../src/diagnose-bridges/doctor-guidance.ts'
import { launchers } from '../src/skill-scripts/launchers.ts'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function fail(message: string): never {
	process.stdout.write(`error: ${message}\n`)
	process.exit(1)
}

const packDir = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-pack-'))
const runDir = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-run-'))

try {
	const tarballName = execFileSync('npm', ['pack', '--silent', '--ignore-scripts', '--pack-destination', packDir], {
		cwd: packageRoot,
		encoding: 'utf8',
	}).trim()
	execFileSync('tar', ['-xzf', join(packDir, tarballName), '-C', packDir])
	const pkgDir = join(packDir, 'package')

	const missing = launchers
		.map((entry) => ({ entry, path: join(pkgDir, 'skills', entry.skill, ...launcherFor(entry.subcommand).split('/')) }))
		.filter(({ path }) => !existsSync(path))

	if (missing.length > 0) {
		fail(
			`the packed tarball is missing ${missing.length} shipped script(s): ${missing
				.map(({ entry }) => `${entry.skill}/${launcherFor(entry.subcommand)}`)
				.join(', ')}\n` + 'help: run `pnpm build` before packing',
		)
	}

	const doctorSkillDir = join(runDir, doctorSkill.name)
	cpSync(join(pkgDir, 'skills', doctorSkill.name), doctorSkillDir, { recursive: true })
	const scriptPath = join(doctorSkillDir, ...launcherFor('doctor').split('/'))

	const stdout = execFileSync(process.execPath, [scriptPath, '--format', 'json'], {
		cwd: runDir,
		encoding: 'utf8',
	})
	try {
		JSON.parse(stdout)
	} catch {
		fail(`the standalone run of ${scriptPath} did not print parseable JSON:\n${stdout}`)
	}

	process.stdout.write('pack-check: every shipped script is packed\n')
	process.stdout.write('pack-check: doctor.mjs ran standalone from a copied-out skill folder\n')
} finally {
	rmSync(packDir, { recursive: true, force: true })
	rmSync(runDir, { recursive: true, force: true })
}
