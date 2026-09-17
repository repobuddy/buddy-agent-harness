/**
 * Verifies what `skill:gen:check` no longer can: the per-skill script bundles are gitignored and
 * ship through the npm package rather than through git (see `.gitignore` and `tsdown.config.ts`), so
 * there is no committed copy left to diff against. Instead this packs the package the way `npm
 * publish` would, unpacks the tarball, and checks the result directly:
 *
 *   - every shipped skill's script is present in the tarball, at the path its `SKILL.md` documents
 *   - one of them runs standalone from a copy of its skill folder alone, with no `node_modules`
 *     anywhere above it — the state an installer that copies only that folder leaves it in
 *
 * Run after `pnpm build`, which puts the bundles on disk for `npm pack` to pick up; `--ignore-scripts` skips the `prepack` lifecycle script so this does not redo that work
 * (and does not need `pnpm` on PATH inside the child process).
 *
 *   pnpm pack:check
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launcherFor } from '../src/diagnose-bridges/doctor-guidance.ts'
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

	// Copy one skill folder out on its own — no `dist/`, no `node_modules` anywhere above it — the
	// state an installer that copies only that folder leaves it in, and run its script from there.
	const doctorSkillDir = join(runDir, 'doctor')
	cpSync(join(pkgDir, 'skills', 'doctor'), doctorSkillDir, { recursive: true })
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
