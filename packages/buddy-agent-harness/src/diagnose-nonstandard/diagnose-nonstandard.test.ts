import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diagnoseNonstandard } from './diagnose-nonstandard.ts'

function repository(files: Record<string, string> = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-'))
	for (const [path, body] of Object.entries(files)) {
		mkdirSync(join(root, dirname(path)), { recursive: true })
		writeFileSync(join(root, path), body)
	}
	return root
}

function diagnose(root: string) {
	return diagnoseNonstandard({ root, cli: 'bah' })
}

describe('diagnoseNonstandard', () => {
	it('finds nothing in a repository whose configuration is all canonical', () => {
		const root = repository({ 'AGENTS.md': '# Rules', '.agents/skills/review/SKILL.md': '# Review' })

		expect(diagnose(root)).toEqual([])
	})

	it('reports an instruction file only one harness reads', () => {
		const root = repository({ '.cursorrules': 'always prefer pnpm' })

		expect(diagnose(root)).toMatchObject([{ path: '.cursorrules', problem: 'nonstandard-instructions' }])
	})

	// The discriminator the family turns on. Always-on prose is what AGENTS.md holds verbatim; a
	// rule bound to globs has no AGENTS.md equivalent, so the two get different destinations.
	it('reads an always-on rule as instruction content and a globbed one as a rule', () => {
		const root = repository({
			'.cursor/rules/style.mdc': '---\nalwaysApply: true\n---\n\nUse tabs.',
			'.cursor/rules/api.mdc': '---\nglobs: src/api/**\n---\n\nValidate every input.',
		})

		expect(diagnose(root)).toMatchObject([
			{ path: '.cursor/rules/api.mdc', problem: 'nonstandard-rule' },
			{ path: '.cursor/rules/style.mdc', problem: 'nonstandard-instructions' },
		])
	})

	// An empty `globs:` is not scoping, and neither is `globs: []`. Treating either as scoped would
	// send always-on prose to the conversion that keeps it in one harness.
	it('reads an empty globs entry as no scoping at all', () => {
		const root = repository({
			'.cursor/rules/blank.mdc': '---\nglobs:\n---\n\nBe careful.',
			'.cursor/rules/empty.mdc': '---\nglobs: []\n---\n\nBe careful.',
		})

		for (const finding of diagnose(root)) expect(finding.problem).toBe('nonstandard-instructions')
	})

	it('reports a harness command as work a skill would carry everywhere', () => {
		const root = repository({ '.claude/commands/ship.md': '# Ship' })

		expect(diagnose(root)).toMatchObject([{ path: '.claude/commands/ship.md', problem: 'nonstandard-command' }])
	})

	it('reports a skill kept under a harness directory once, by its SKILL.md', () => {
		const root = repository({
			'.cursor/skills/review/SKILL.md': '# Review',
			'.cursor/skills/review/scripts/run.mjs': 'export {}',
		})

		expect(diagnose(root)).toMatchObject([{ path: '.cursor/skills/review/SKILL.md', problem: 'nonstandard-skill' }])
	})

	// The one finding with no owner. Naming a skill for it would promise a conversion that does not
	// exist, which is worse than reporting the gap.
	it('names no skill for a subagent, because no portable form exists', () => {
		const root = repository({ '.claude/agents/reviewer.md': '# Reviewer' })

		const [finding] = diagnose(root)
		expect(finding?.problem).toBe('nonstandard-subagent')
		expect(finding?.repair.instruction).not.toContain('/buddy-agent-harness:')
		expect(finding?.repair.command).toBe('')
	})

	// A projection is configuration that was already converted. Reporting it would tell a repository
	// to do again what it has done.
	it('reports no harness directory that is a symlink into the canonical one', () => {
		const root = repository({ '.agents/skills/review/SKILL.md': '# Review' })
		mkdirSync(join(root, '.cursor'), { recursive: true })
		symlinkSync('../.agents/skills', join(root, '.cursor', 'skills'), 'junction')

		expect(diagnose(root)).toEqual([])
	})

	// The projection targets `init` writes are not non-standard: they are the bridge, and the bridge
	// families already own them.
	it('reports no skills projection target', () => {
		const root = repository({ '.claude/skills/review/SKILL.md': '# Review', '.windsurf/skills/review/SKILL.md': '# R' })

		expect(diagnose(root)).toEqual([])
	})

	// Enablement is about which harness a repository uses; reach is about where content lands. A
	// `.cursorrules` nobody opens in Cursor is still prose AGENTS.md does not carry.
	it('reports an artifact whose harness the repository never enabled', () => {
		const root = repository({ '.windsurfrules': 'prefer small diffs' })

		expect(diagnose(root)).toMatchObject([{ path: '.windsurfrules', problem: 'nonstandard-instructions' }])
	})

	it('carries the reported path into the repair rather than a placeholder', () => {
		const root = repository({ '.cursorrules': 'always prefer pnpm' })

		const [finding] = diagnose(root)
		expect(finding?.repair.instruction).toContain('.cursorrules')
		expect(finding?.repair.instruction).not.toContain('<path>')
	})
})
