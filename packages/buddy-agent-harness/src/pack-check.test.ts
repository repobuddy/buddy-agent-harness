import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

// Binds the entry-point spec's "the published package holds every forwarder a shipped skill runs"
// criterion: `scripts/pack-check.ts` packs the package the way `npm publish` would and checks the
// real tarball against the forwarders `plugin.json` declares.
//
// Slower than the rest of this suite: it shells out to `npm pack` and `tar`.
describe('the packed tarball', () => {
	it('ships every forwarder a shipped skill runs', () => {
		expect(() =>
			execFileSync(process.execPath, ['--import', 'tsx', join(packageRoot, 'scripts', 'pack-check.ts')], {
				cwd: packageRoot,
				encoding: 'utf8',
			}),
		).not.toThrow()
	}, 30_000)
})
