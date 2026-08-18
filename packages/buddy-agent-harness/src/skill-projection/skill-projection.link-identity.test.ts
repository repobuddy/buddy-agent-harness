import { lstatSync, mkdirSync, mkdtempSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { initializeHarnesses } from '../initialize-harnesses/initialize-harnesses.ts'
import { linksTo } from './skill-projection.ts'

function repository(): string {
	const root = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-link-'))
	mkdirSync(join(root, '.agents', 'skills', 'review'), { recursive: true })
	writeFileSync(join(root, '.agents', 'skills', 'review', 'SKILL.md'), '# Review')
	return root
}

describe('linksTo', () => {
	it('accepts a link written as an absolute path', () => {
		const root = repository()
		const canonical = join(root, '.agents', 'skills')
		mkdirSync(join(root, '.claude'), { recursive: true })
		symlinkSync(canonical, join(root, '.claude', 'skills'), 'junction')

		expect(linksTo(join(root, '.claude', 'skills'), canonical)).toBe(true)
	})

	it('rejects a link to somewhere else, a directory, and a path that does not exist', () => {
		const root = repository()
		const canonical = join(root, '.agents', 'skills')
		mkdirSync(join(root, 'elsewhere'), { recursive: true })
		mkdirSync(join(root, '.claude'), { recursive: true })
		symlinkSync(join(root, 'elsewhere'), join(root, '.claude', 'skills'), 'junction')

		expect(linksTo(join(root, '.claude', 'skills'), canonical)).toBe(false)
		expect(linksTo(join(root, 'elsewhere'), canonical)).toBe(false)
		expect(linksTo(join(root, 'absent'), canonical)).toBe(false)
	})
})

describe('projectSkills', () => {
	// Refusing here would demand --force to rebuild a bridge that already resolves, and rebuilding
	// moves skills a user wrote.
	it('leaves a resolving bridge alone even when it spells its target differently', () => {
		const root = repository()
		const canonical = join(root, '.agents', 'skills')
		mkdirSync(join(root, '.claude'), { recursive: true })
		symlinkSync(canonical, join(root, '.claude', 'skills'), 'junction')

		expect(() => initializeHarnesses({ root })).not.toThrow()
		expect(readlinkSync(join(root, '.claude', 'skills'))).toBe(canonical)
	})

	// Windows resolves a relative junction target against the process directory rather than the
	// link's own, so only there is the target written absolute.
	it('writes a target the platform resolves against the link', () => {
		const root = repository()
		initializeHarnesses({ root })

		const target = readlinkSync(join(root, '.claude', 'skills'))

		expect(lstatSync(join(root, '.claude', 'skills')).isSymbolicLink()).toBe(true)
		expect(isAbsolute(target)).toBe(process.platform === 'win32')
		expect(linksTo(join(root, '.claude', 'skills'), join(root, '.agents', 'skills'))).toBe(true)
	})
})
