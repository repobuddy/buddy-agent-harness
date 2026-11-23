import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

describe('the enhance additions this package ships', () => {
	// enhance spec R92: the Retrospectives text directs the agent to the retro skill.
	it('ships the retro skill wherever it ships the Retrospectives addition (R92)', () => {
		const retrospectives = existsSync(join(packageRoot, 'skills/enhance/references/retrospectives.md'))
		const retro = existsSync(join(packageRoot, 'skills/retro/SKILL.md'))

		expect(
			retrospectives && !retro,
			'skills/enhance/references/retrospectives.md ships without skills/retro/SKILL.md',
		).toBe(false)
	})
})
