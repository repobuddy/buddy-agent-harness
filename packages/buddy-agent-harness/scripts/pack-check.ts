/**
 * Packs the package as `npm publish` would and checks the tarball directly: every forwarder
 * `plugin.json` declares, and `llms.txt`, must be in it, since an installed skill runs the CLI
 * through the forwarder in its own folder.
 *
 *   pnpm pack:check
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function fail(message: string): never {
	process.stdout.write(`error: ${message}\n`)
	process.exit(1)
}

const scripts = Object.keys(
	JSON.parse(readFileSync(join(packageRoot, 'plugin.json'), 'utf8')).extensions['org.cyberuni.universal-plugin']
		.scripts,
)
const packDir = mkdtempSync(join(tmpdir(), 'buddy-agent-harness-pack-'))

try {
	const tarballName = execFileSync('npm', ['pack', '--silent', '--ignore-scripts', '--pack-destination', packDir], {
		cwd: packageRoot,
		encoding: 'utf8',
	}).trim()
	execFileSync('tar', ['-xzf', join(packDir, tarballName), '-C', packDir])
	const pkgDir = join(packDir, 'package')

	const missing = scripts.filter((path) => !existsSync(join(pkgDir, ...path.split('/'))))
	if (missing.length > 0) {
		fail(
			`the packed tarball is missing ${missing.length} forwarder(s): ${missing.join(', ')}\n` +
				'help: run `universal-plugin plugin build` and commit the result',
		)
	}

	if (!existsSync(join(pkgDir, 'llms.txt'))) fail('the packed tarball is missing llms.txt')

	process.stdout.write('pack-check: every forwarder and llms.txt is packed\n')
} finally {
	rmSync(packDir, { recursive: true, force: true })
}
