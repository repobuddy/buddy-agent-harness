import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { depPluginsCommand } from './dep-plugins.command.ts'
import { CATALOG_PATH } from './generate.ts'
import type { PluginRuntime } from './harness-plugins.ts'

/**
 * The runtime table is replaced rather than spied on, so a test states the harness state it means
 * instead of inheriting whatever is installed on the machine running it.
 */
const detected = vi.hoisted(() => ({ value: [] as unknown[] }))

/**
 * `process.versions.pnp` is not writable, so the Plug'n'Play detector is replaced instead. It is the
 * one condition here that cannot be produced by arranging files.
 */
const pnp = vi.hoisted(() => ({ value: false }))

vi.mock('./resolve.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./resolve.ts')>()
	return { ...actual, isPnp: () => pnp.value }
})

vi.mock('./harness-plugins.ts', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./harness-plugins.ts')>()
	return {
		...actual,
		get runtimes() {
			return detected.value
		},
	}
})

let stdout: ReturnType<typeof vi.spyOn>
let stderr: ReturnType<typeof vi.spyOn>

function run(args: { root?: string; check?: boolean; format?: string }): number {
	return (depPluginsCommand as { run(value: typeof args): number }).run({ format: 'json', ...args })
}

/** The JSON report the last run wrote, parsed. */
function report(): Record<string, unknown> {
	const written = stdout.mock.calls.map(([value]: unknown[]) => String(value)).join('')
	return JSON.parse(written)
}

function repository(manifest: Record<string, unknown> = {}): string {
	const root = mkdtempSync(join(tmpdir(), 'dep-plugins-cmd-'))
	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@acme/consumer', ...manifest }))
	return root
}

function installDep(root: string, pkg: string, version = '1.0.0', plugin?: Record<string, unknown>) {
	const dir = join(root, 'node_modules', ...pkg.split('/'))
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: pkg, version }))
	if (plugin) writeFileSync(join(dir, 'plugin.json'), JSON.stringify(plugin))
}

/** No runtime detected, so a test states the catalog half without a machine's harness state leaking in. */
function noRuntimes() {
	detected.value = []
}

function useRuntimes(...list: PluginRuntime[]) {
	detected.value = list
}

function fakeRuntime(overrides: Partial<PluginRuntime> = {}): PluginRuntime {
	return {
		name: 'claude-code',
		scoped: true,
		present: () => true,
		state: () => ({ installed: [], marketplaces: [] }),
		register: (dir) => `register ${dir}`,
		install: (id) => `install ${id}`,
		update: (id) => `update ${id}`,
		uninstall: (id) => `uninstall ${id}`,
		refreshMarketplace: (name) => `refresh ${name}`,
		...overrides,
	}
}

beforeEach(() => {
	stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
	stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
	detected.value = []
	pnp.value = false
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe('dep-plugins command', () => {
	it('writes the catalog and reports what it found', () => {
		noRuntimes()
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.2.0', { name: 'with-plugin', description: 'A plugin' })

		expect(run({ root })).toBe(0)
		const result = report()
		expect(result['outcome']).toBe('created')
		expect(result['marketplace']).toBe('acme-consumer')
		expect(result['plugins']).toEqual([{ name: 'with-plugin', package: 'with-plugin', version: '1.2.0' }])
		expect(existsSync(join(root, CATALOG_PATH))).toBe(true)
	})

	it('states the zero when no dependency ships a plugin', () => {
		noRuntimes()
		const root = repository({ dependencies: { plain: '^1' } })
		installDep(root, 'plain')

		run({ root })
		expect(result(report()['plugins'])).toContain('0 dependencies ship a plugin')
	})

	it('reports a stale catalog under --check and exits non-zero, without writing', () => {
		noRuntimes()
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.0.0', { name: 'with-plugin' })

		expect(run({ root, check: true })).not.toBe(0)
		expect(report()['outcome']).toBe('would-change')
		expect(existsSync(join(root, CATALOG_PATH))).toBe(false)
	})

	it('reports a current catalog under --check and exits zero', () => {
		noRuntimes()
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.0.0', { name: 'with-plugin' })
		run({ root })
		stdout.mockClear()

		expect(run({ root, check: true })).toBe(0)
		expect(report()['outcome']).toBe('current')
	})

	it('notes a declared dependency that is not installed', () => {
		noRuntimes()
		const root = repository({ dependencies: { absent: '^1' } })

		run({ root })
		expect(String(report()['notes'])).toContain('"absent" is not installed')
	})

	it('notes a generic marketplace name, which collides silently', () => {
		noRuntimes()
		const root = repository({ name: 'deps' })

		run({ root })
		expect(String(report()['notes'])).toContain('is generic')
	})

	it('notes that Copilot CLI cannot consume the catalog, but only when there is one to consume', () => {
		noRuntimes()
		const withPlugin = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(withPlugin, 'with-plugin', '1.0.0', { name: 'with-plugin' })
		run({ root: withPlugin })
		expect(String(report()['notes'])).toContain('Copilot CLI')

		stdout.mockClear()
		run({ root: repository() })
		expect(String(report()['notes'] ?? '')).not.toContain('Copilot CLI')
	})

	it('notes that Yarn Plug’n’Play leaves no directory for a harness to install from', () => {
		noRuntimes()
		pnp.value = true

		run({ root: repository() })
		expect(String(report()['notes'])).toContain('Plug’n’Play')
	})

	it('says so when no supported harness is set up on this machine', () => {
		noRuntimes()
		run({ root: repository() })
		expect(result(report()['harness'])).toContain('no supported harness detected')
	})

	it('reports the register and install a cold harness needs', () => {
		useRuntimes(fakeRuntime())
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.0.0', { name: 'with-plugin' })

		run({ root })
		const actions = report()['actions'] as { do: string; runtime: string }[]
		expect(actions.map((action) => action.do)).toEqual([
			'register .agents/buddy-agent-harness',
			'install with-plugin@acme-consumer',
		])
		expect(report()['harness']).toEqual([{ runtime: 'claude-code', status: '2 to apply' }])
	})

	it('pairs a refresh with the update where a runtime caches the catalog', () => {
		useRuntimes(
			fakeRuntime({
				state: () => ({
					installed: [{ id: 'with-plugin@acme-consumer', version: '0.9.0', scope: 'project', projectPath: '' }],
					marketplaces: [{ name: 'acme-consumer', path: '.agents/buddy-agent-harness' }],
				}),
				scoped: false,
			}),
		)
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.0.0', { name: 'with-plugin' })

		run({ root })
		const actions = report()['actions'] as { do: string }[]
		expect(actions[0]?.do).toBe('refresh acme-consumer && update with-plugin@acme-consumer')
	})

	it('omits the refresh where a runtime re-reads the catalog on install', () => {
		useRuntimes(
			fakeRuntime({
				refreshMarketplace: () => '',
				state: () => ({
					installed: [{ id: 'with-plugin@acme-consumer', version: '0.9.0', scope: 'user' }],
					marketplaces: [{ name: 'acme-consumer', path: '.agents/buddy-agent-harness' }],
				}),
				scoped: false,
			}),
		)
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.0.0', { name: 'with-plugin' })

		run({ root })
		expect((report()['actions'] as { do: string }[])[0]?.do).toBe('update with-plugin@acme-consumer')
	})

	it('reports an uninstall for a plugin the catalog no longer lists', () => {
		useRuntimes(
			fakeRuntime({
				refreshMarketplace: () => '',
				state: () => ({
					installed: [{ id: 'gone@acme-consumer', version: '1.0.0', scope: 'user' }],
					marketplaces: [{ name: 'acme-consumer', path: '.agents/buddy-agent-harness' }],
				}),
				scoped: false,
			}),
		)

		run({ root: repository() })
		expect((report()['actions'] as { do: string }[])[0]?.do).toBe('uninstall gone@acme-consumer')
	})

	it('states the zero when every detected harness matches', () => {
		useRuntimes(
			fakeRuntime({
				state: () => ({
					installed: [],
					marketplaces: [{ name: 'acme-consumer', path: '.agents/buddy-agent-harness' }],
				}),
			}),
		)

		run({ root: repository() })
		expect(result(report()['actions'])).toContain('0 actions')
		expect(report()['harness']).toEqual([{ runtime: 'claude-code', status: 'in sync' }])
	})

	it('notes a marketplace registered against another directory rather than overwriting it', () => {
		useRuntimes(
			fakeRuntime({
				state: () => ({ installed: [], marketplaces: [{ name: 'acme-consumer', path: '/elsewhere/other' }] }),
			}),
		)

		run({ root: repository() })
		expect(String(report()['notes'])).toContain('already registered against /elsewhere/other')
	})

	it('skips a runtime that is not set up on this machine', () => {
		useRuntimes(fakeRuntime({ present: () => false }))

		run({ root: repository() })
		expect(result(report()['harness'])).toContain('no supported harness detected')
	})

	it('derives the working directory when no root is given', () => {
		noRuntimes()
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.0.0', { name: 'with-plugin' })
		const previous = process.cwd()
		try {
			process.chdir(root)
			expect(run({})).toBe(0)
		} finally {
			process.chdir(previous)
		}
		expect(report()['marketplace']).toBe('acme-consumer')
	})

	it('reports a failure that is not an Error with a stated message', () => {
		noRuntimes()
		const thrown = vi.spyOn(process, 'cwd').mockImplementation(() => {
			throw 'not an Error'
		})
		try {
			expect(run({})).not.toBe(0)
		} finally {
			thrown.mockRestore()
		}
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Catalog generation failed.'))
	})

	it('reports a failure on stderr and returns non-zero', () => {
		noRuntimes()
		// A directory with no package.json at all: the manifest read is the first thing that can fail.
		expect(run({ root: mkdtempSync(join(tmpdir(), 'empty-')) })).not.toBe(0)
		expect(stderr).toHaveBeenCalledWith(expect.stringContaining('error:'))
	})

	it('renders a human-readable report under --format text', () => {
		noRuntimes()
		const root = repository({ dependencies: { 'with-plugin': '^1' } })
		installDep(root, 'with-plugin', '1.0.0', { name: 'with-plugin' })

		run({ root, format: 'text' })
		const written = stdout.mock.calls.map(([value]: unknown[]) => String(value)).join('')
		expect(written).toContain('marketplace: acme-consumer')
		expect(written).not.toContain('{"')
	})
})

/** Narrows a report field that is either a table or the string that states its zero. */
function result(value: unknown): string {
	return typeof value === 'string' ? value : JSON.stringify(value)
}
