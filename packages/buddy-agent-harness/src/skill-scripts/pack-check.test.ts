import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

// Binds the entry-point spec's "ships every launcher a skill runs, and each runs standalone with
// no node_modules above it" scenario: `scripts/pack-check.ts` packs the package the way `npm
// publish` would, unpacks it, and asserts both halves directly against the real tarball rather than
// against a second, hand-maintained list of what it should contain.
//
// Slower than the rest of this suite — it shells out to `npm pack` and `tar` — so it is one test
// covering both halves rather than one per launcher; the launcher-by-launcher detail is in the
// script's own output on failure. Requires `pnpm build`, which copies the bundles into the skill
// folders; `test` and `coverage` depend on `build` in `turbo.json`.
describe('the packed tarball', () => {
	it('ships every launcher a shipped skill runs, and one runs standalone with no node_modules above it', () => {
		expect(() =>
			execFileSync(process.execPath, ['--import', 'tsx', join(packageRoot, 'scripts', 'pack-check.ts')], {
				cwd: packageRoot,
				encoding: 'utf8',
			}),
		).not.toThrow()
	}, 30_000)
})
