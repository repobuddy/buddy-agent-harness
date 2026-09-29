import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const skillDir = join(packageRoot, 'skills', 'reference')
const load = readFileSync(join(skillDir, 'references', 'load.md'), 'utf8')

describe("the reference skill's Load mode", () => {
	it('runs the bundled launcher and no package runner', () => {
		const commands = [...load.matchAll(/```sh\n([\s\S]*?)```/g)].map((match) => match[1])

		expect(commands).toEqual([
			"node <this skill's folder>/scripts/reference.mjs show <name>... --root <repository root>\n",
		])
	})

	it('carries a Validate section checking the four report-and-read rules', () => {
		const checks = (load.split('## Validate\n')[1] ?? '').split('\n').filter((line) => line.startsWith('- '))

		expect(checks).toHaveLength(4)
		expect(checks[0]).toMatch(/Every name .* loaded, .* or named in the report/)
		expect(checks[1]).toMatch(/No `npx`, `pnpm dlx`, `upx`, or download/)
		expect(checks[2]).toMatch(/No file under a tier folder, and no rejected path/)
		expect(checks[3]).toMatch(/report is empty when every name came from the command/)
	})

	it('ships a caller line naming the skill and the plugin in words', () => {
		const readme = readFileSync(join(skillDir, 'README.md'), 'utf8')
		const line = readme.match(/```text\n(Load .*)\n```/)?.[1]

		expect(line).toBe(
			'Load `skill-design` and `agent-tool-output` with the `reference` skill in the `buddy-agent-harness` plugin.',
		)
		expect(line).not.toMatch(/\/[\w-]+:|\/reference/)
	})
})

// Requires `pnpm build`, which copies the bundle into the skill folder; `scripts/pack-check.ts`
// covers the packed copy with no `node_modules` above it.
describe('the reference launcher', () => {
	let root: string | undefined

	afterEach(() => {
		if (root) rmSync(root, { recursive: true, force: true })
	})

	function repository(documents: Record<string, string>): string {
		root = mkdtempSync(join(tmpdir(), 'reference-launcher-'))
		mkdirSync(join(root, '.agents', 'references'), { recursive: true })
		for (const [name, content] of Object.entries(documents)) {
			writeFileSync(join(root, '.agents', 'references', `${name}.md`), content)
		}
		return root
	}

	function show(cwd: string, ...args: string[]) {
		return spawnSync(process.execPath, [join(skillDir, 'scripts', 'reference.mjs'), 'show', ...args], {
			cwd,
			encoding: 'utf8',
		})
	}

	it('prints one reference by name', () => {
		const dir = repository({ testing: '# Testing\n' })
		const { status, stdout } = show(dir, 'testing', '--root', dir)

		expect(status).toBe(0)
		expect(stdout).toBe('# Testing\n')
	})

	it('prints several references in the order named, and marks a missing one in place', () => {
		const dir = repository({ style: '# Style\n', testing: '# Testing\n' })
		const { status, stdout, stderr } = show(packageRoot, 'testing', 'nothing-here', 'style', '--root', dir)

		expect(status).toBe(1)
		expect(stdout).toBe(
			'<reference name="testing" tier="project">\n# Testing\n</reference>\n\n' +
				'<reference name="nothing-here" status="missing" />\n\n' +
				'<reference name="style" tier="project">\n# Style\n</reference>\n',
		)
		expect(stderr).toContain('"nothing-here"')
	})
})
