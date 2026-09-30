import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const skillDir = join(packageRoot, 'skills', 'reference')
const skill = readFileSync(join(skillDir, 'SKILL.md'), 'utf8')

function section(heading: string): string {
	return skill.split(`## ${heading}\n`)[1]?.split('\n## ')[0] ?? ''
}

describe('the reference skill', () => {
	it('is named for the command it routes to', () => {
		const frontmatter = parse(skill.split('---\n')[1] as string)

		expect(frontmatter.name).toBe('reference')
		expect(frontmatter.description).toMatch(/^Use this skill when /)
		expect(frontmatter.description.length).toBeLessThanOrEqual(120)
	})

	it('runs the bundled launcher, with a pinned npx fallback', () => {
		expect(section('Run the command')).toContain(
			"node <this skill's folder>/scripts/reference.mjs <subcommand> ... --root <repository root>",
		)
		expect(section('Run the command')).toMatch(/npx -y buddy-agent-harness@\^\d+\.\d+\.\d+ reference/)
	})

	it('routes to every subcommand of the reference command', () => {
		for (const subcommand of ['show', 'list', 'search', 'where']) {
			expect(skill).toMatch(new RegExp(`run \`${subcommand}\\b`, 'i'))
		}
	})

	it('has a section for every mode in its routing table', () => {
		const modes = [
			...new Set([...section('Route').matchAll(/\[([\w ]+)\]\(#[\w-]+\)/g)].map((match) => match[1] as string)),
		]

		expect(modes).toEqual(['Load', 'Create', 'Update', 'Find', 'Inspect', 'Wire a skill'])
		for (const mode of modes) expect(skill).toContain(`\n## ${mode}\n`)
	})

	it('ships the procedures it loads', () => {
		for (const [mode, file] of [
			['Load', 'load.md'],
			['Create', 'create.md'],
		] as const) {
			expect(section(mode)).toContain(`\`references/${file}\``)
			expect(existsSync(join(skillDir, 'references', file))).toBe(true)
		}
	})

	it('never falls back to a package runner when loading', () => {
		expect(section('Run the command')).toContain('Load never falls back to a package runner.')
	})

	it('tells a plugin to prefix the names it ships', () => {
		const create = readFileSync(join(skillDir, 'references', 'create.md'), 'utf8')

		expect(create).toContain(
			"| every user of a plugin | the plugin's `references/` folder, next to its `skills/` | `<plugin name>.<reference>.md` |",
		)
		expect(create).toMatch(/\*\*A plugin prefixes every name it ships\*\* with its own name and a dot/)
	})
})
