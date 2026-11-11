import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

/**
 * Driven as a real process rather than by importing it: what these scenarios are about is the exit
 * code the operating system sees, and every in-process stand-in for that asserts the design back at
 * itself. Dropping `bin`'s assignment leaves the rest of the suite green, which is what this file
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
		const { status, stderr, stdout } = bah('doctor', '--harness', 'aider')

		expect(status).toBe(2)
		// AXI rule 6: the coded error is on stdout, where the report would be; stderr stays empty.
		expect(stdout).toContain('Unsupported harness: aider')
		expect(stdout).toContain('code: unsupported-harness')
		expect(stdout).toContain('help')
		expect(stderr).toBe('')
	})

	it('answers a bare invocation with the home header and the doctor report', () => {
		const { status, stdout } = bah('--format', 'json')

		expect(status).toBe(0)
		const home = JSON.parse(stdout)
		expect(home).toHaveProperty('bin')
		expect(home.description).toContain('agent harness')
		expect(home).toHaveProperty('findings')
	})

	it("applies a rejected invocation's usage code to the process", () => {
		expect(bah('doctor', '--nope').status).toBe(2)
		expect(bah('doctor', '--format', 'yaml').status).toBe(2)
		expect(bah('no-such-command').status).toBe(2)
	})

	it('renders a next step as the full command line, checked against the command tree', () => {
		const root = mkdtempSync(join(tmpdir(), 'bah-ref-'))
		try {
			const { status, stdout } = bah('mcp', 'project', '--root', root, '--format', 'json')

			expect(status).toBe(0)
			expect(JSON.parse(stdout).help).toContain('Run `buddy-agent-harness mcp project` to preview the projection')

			mkdirSync(join(root, '.agents', 'buddy-agent-harness'), { recursive: true })
			writeFileSync(join(root, '.agents', 'buddy-agent-harness', 'mcp.toml'), '[servers.a]\ncommand = "x"\n')
			const rejected = bah('mcp', 'reconcile', '--root', root, '--accept', 'nope', '--format', 'json')

			expect(rejected.status).toBe(1)
			expect(JSON.parse(rejected.stdout).help).toEqual([
				'Run `buddy-agent-harness mcp reconcile` to list the fields that can be approved',
			])
		} finally {
			rmSync(root, { recursive: true, force: true })
		}
	})

	it('succeeds when the command did what was asked', () => {
		const { status, stdout } = bah('--version')

		expect(status).toBe(0)
		expect(stdout.trim()).toBe(JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')).version)
	})
})

/**
 * The launchers carry the same assignment as `bin`, from the renderer rather than by hand. They
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
		const { status, stdout, stderr } = launcher('repair', 'doctor.mjs', '--harness', 'aider')

		expect(status).toBe(2)
		expect(stdout).toContain('code: unsupported-harness')
		expect(stderr).toBe('')
	})

	it("applies a rejected invocation's usage code to the process", () => {
		expect(launcher('doctor-buddy-agent-harness', 'doctor.mjs', '--nope').status).toBe(2)
		expect(launcher('doctor-buddy-agent-harness', 'doctor.mjs', '--format', 'yaml').status).toBe(2)
	})

	it('reports the diagnosis of the working directory when asked correctly', () => {
		const { status, stdout } = launcher('doctor-buddy-agent-harness', 'doctor.mjs', '--format', 'json')

		expect(status).toBe(0)
		expect(() => JSON.parse(stdout)).not.toThrow()
	})
})
