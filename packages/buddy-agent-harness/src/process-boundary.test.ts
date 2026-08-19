import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Driven as a real process rather than by importing it: what these scenarios are about is the exit
 * code the operating system sees, and every in-process stand-in for that asserts the design back at
 * itself. Inverting `bin`'s condition leaves the rest of the suite green, which is what this file
 * exists to stop.
 */
function bah(...args: string[]): { status: number | null; stdout: string; stderr: string } {
	const { status, stdout, stderr } = spawnSync(
		process.execPath,
		[join(packageRoot, 'bin', 'buddy-agent-harness.mjs'), ...args],
		{ cwd: packageRoot, encoding: 'utf8' },
	)
	return { status, stdout, stderr }
}

describe('the process boundary', () => {
	it('applies a reported failure to the process', () => {
		const { status, stderr, stdout } = bah('doctor', '--format', 'yaml')

		expect(status).toBe(1)
		expect(stderr).toContain('--format must be toon, json, or text.')
		// The failure belongs on stderr alone: the report is what stdout carries.
		expect(stdout).toBe('')
	})

	// The one code `run` cannot report through its return. `bin` applies its zero unconditionally and
	// this becomes 0, which is the regression the condition exists to prevent.
	it('leaves a usage code clibuilder recorded on the process alone', () => {
		expect(bah('doctor', '--nope').status).toBe(2)
		expect(bah('no-such-command').status).toBe(2)
	})

	it('succeeds when the command did what was asked', () => {
		const { status, stdout } = bah('--version')

		expect(status).toBe(0)
		expect(stdout.trim()).toBe(JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version)
	})
})

/**
 * The launchers carry the same two-line rule as `bin`, from the renderer rather than by hand. They
 * are driven here too, so the generated copy cannot drift away from the one above unnoticed.
 */
describe('a generated launcher', () => {
	function launcher(skill: string, file: string, ...args: string[]) {
		return spawnSync(process.execPath, [join(packageRoot, 'skills', skill, 'scripts', file), ...args], {
			cwd: packageRoot,
			encoding: 'utf8',
		})
	}

	it('applies a reported failure to the process', () => {
		const { status, stdout } = launcher('repair', 'doctor.mjs', '--format', 'yaml')

		expect(status).toBe(1)
		expect(stdout).toBe('')
	})

	it('leaves a usage code clibuilder recorded on the process alone', () => {
		expect(launcher('doctor', 'doctor.mjs', '--nope').status).toBe(2)
	})

	it('reports the diagnosis of the working directory when asked correctly', () => {
		const { status, stdout } = launcher('doctor', 'doctor.mjs', '--format', 'json')

		expect(status).toBe(0)
		expect(() => JSON.parse(stdout)).not.toThrow()
	})
})
