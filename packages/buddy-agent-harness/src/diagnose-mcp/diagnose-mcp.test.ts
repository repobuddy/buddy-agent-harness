import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { diagnoseMcp } from './diagnose-mcp.ts'
import { positionOf } from './mcp-sources.ts'

const cli = 'bah'

function write(root: string, path: string, body: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), body)
}

function repository(): string {
	return mkdtempSync(join(tmpdir(), 'buddy-agent-harness-mcp-'))
}

function git(root: string, args: string[]): void {
	execFileSync('git', args, { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
}

function gitRepository(): string {
	const root = repository()
	git(root, ['init', '-q', '.'])
	git(root, ['config', 'user.email', 'test@example.com'])
	git(root, ['config', 'user.name', 'Test'])
	return root
}

function commit(root: string, message: string): void {
	git(root, ['add', '-A'])
	git(root, ['commit', '-q', '-m', message])
}

function diagnose(root: string) {
	return diagnoseMcp({ root, git: new GitBridgeState(root), cli })
}

function problems(root: string): string[] {
	return diagnose(root).map((finding) => finding.problem)
}

/**
 * The assertion the whole secrets design exists to make: nothing the command emits carries the
 * value, or any part of it. Applied per field shape rather than once, because each shape reaches a
 * finding through a different code path and one instance would leave the others unpinned.
 */
function expectNoLeak(root: string, secret: string): void {
	const emitted = JSON.stringify(diagnose(root))

	expect(emitted).not.toContain(secret)
	for (const fragment of [secret.slice(0, 6), secret.slice(-6)]) expect(emitted).not.toContain(fragment)
}

function find(root: string, problem: string) {
	return diagnose(root).find((finding) => finding.problem === problem)
}

/**
 * A reference to a secret, assembled rather than written literally: a `${…}` inside a plain string
 * is what the lint rule for a mistyped template literal looks for, and every one here is deliberate.
 */
const ref = (name: string) => `$\u007b${name}\u007d`

const golden = '.agents/buddy-agent-harness/mcp.toml'
const cursor = '.cursor/mcp.json'

/** One stdio server, spelled the golden way and the Cursor way, from the same facts. */
const goldenLinear = '[servers.linear]\ncommand = "npx"\nargs = ["-y", "linear-mcp"]\n'
const cursorLinear = JSON.stringify({ mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } } })

describe('diagnoseMcp', () => {
	it('reports no drift for a repository with no golden set', () => {
		const root = repository()
		write(root, cursor, cursorLinear)

		expect(diagnose(root)).toEqual([])
	})

	it('reports nothing when a target matches the golden set', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, cursor, cursorLinear)

		expect(diagnose(root)).toEqual([])
	})

	it('reports nothing for a harness whose MCP file does not exist yet', () => {
		const root = repository()
		write(root, golden, goldenLinear)

		expect(diagnose(root)).toEqual([])
	})

	describe('the golden set itself', () => {
		it('reports an unreadable golden set by position', () => {
			const root = repository()
			write(root, golden, '[servers.linear]\ncommand = npx\n')

			const finding = find(root, 'mcp-golden-unreadable')

			expect(finding?.path).toBe(`${golden}#L2:11`)
		})

		it('never puts the offending line into the finding', () => {
			const root = repository()
			write(root, golden, '[servers.linear]\ncommand = sk-live-9f3a2c7b1d\n')

			const finding = find(root, 'mcp-golden-unreadable')

			expect(JSON.stringify(finding)).not.toContain('sk-live')
			expect(JSON.stringify(finding)).not.toContain('9f3a')
		})

		it('compares nothing once the golden set is unreadable', () => {
			const root = repository()
			write(root, golden, 'not = = toml\n')
			write(root, cursor, cursorLinear)

			expect(problems(root)).toEqual(['mcp-golden-unreadable'])
		})

		it('reports a literal credential in the golden set itself', () => {
			const root = repository()
			write(root, golden, `${goldenLinear}\n[servers.linear.env]\nLINEAR_TOKEN = "lin_api_9f3a"\n`)

			expect(find(root, 'mcp-literal-secret')?.path).toBe(`${golden}#servers.linear.env.LINEAR_TOKEN`)
		})
	})

	describe('membership', () => {
		it('reports a golden server a target does not carry', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, cursor, JSON.stringify({ mcpServers: { sentry: { command: 'sentry-mcp' } } }))

			expect(find(root, 'mcp-unprojected')?.path).toBe(`${cursor}#servers.linear`)
		})

		it('reports a target server the golden set does not carry', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, cursor, JSON.stringify({ mcpServers: { sentry: { command: 'sentry-mcp' } } }))

			expect(find(root, 'mcp-undeclared')?.path).toBe(`${cursor}#servers.sentry`)
		})

		// `io.github.*` is a common way to name an MCP server, and a repair that recovered the name by
		// splitting the locator on `.` named `foo` — a server neither file has. The parts travel with
		// the finding for this reason, and only the locator is ever assembled from them.
		it('names a dotted server in full in the repair for one the target does not carry', () => {
			const root = repository()
			write(root, golden, '[servers."io.github.foo"]\ncommand = "npx"\n')
			write(root, cursor, JSON.stringify({ mcpServers: {} }))

			const finding = find(root, 'mcp-unprojected')

			expect(finding?.path).toBe(`${cursor}#servers.io.github.foo`)
			expect(finding?.repair.instruction).toBe(
				`add the server io.github.foo to ${cursor}, or drop it from the golden set`,
			)
		})

		it('names a dotted server in full in the repair for one the golden set does not declare', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, cursor, JSON.stringify({ mcpServers: { 'io.github.foo': { command: 'npx' } } }))

			const finding = find(root, 'mcp-undeclared')

			expect(finding?.path).toBe(`${cursor}#servers.io.github.foo`)
			expect(finding?.repair.instruction).toBe(`add the server io.github.foo to ${golden}, or drop it from ${cursor}`)
		})
	})

	describe('divergence', () => {
		const record = '.agents/buddy-agent-harness/mcp.projected.json'
		const recorded = (server: object) => JSON.stringify({ targets: { [cursor]: { linear: server } } })

		it('reports the target as the side that moved', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, record, recorded({ command: 'npx', args: ['-y', 'linear-mcp'] }))
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } } }))

			expect(find(root, 'mcp-diverged-target')?.path).toBe(`${cursor}#servers.linear.command`)
		})

		it('reports the golden set as the side that moved', () => {
			const root = repository()
			write(root, golden, '[servers.linear]\ncommand = "bunx"\nargs = ["-y", "linear-mcp"]\n')
			write(root, record, recorded({ command: 'npx', args: ['-y', 'linear-mcp'] }))
			write(root, cursor, cursorLinear)

			expect(find(root, 'mcp-diverged-golden')?.path).toBe(`${cursor}#servers.linear.command`)
		})

		it('reports a three-way conflict without merging it', () => {
			const root = repository()
			write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
			write(root, record, recorded({ command: 'npx' }))
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'pnpx' } } }))

			const finding = find(root, 'mcp-diverged-both')

			expect(finding?.path).toBe(`${cursor}#servers.linear.command`)
			expect(finding?.repair.instruction).toContain('by hand')
		})

		it('reports an unknown direction when no baseline can answer', () => {
			const root = repository()
			write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'npx' } } }))

			expect(find(root, 'mcp-diverged-unknown')?.path).toBe(`${cursor}#servers.linear.command`)
		})

		it('ignores a projection record that does not parse', () => {
			const root = repository()
			write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
			write(root, record, '{ not json')
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'npx' } } }))

			expect(problems(root)).toContain('mcp-diverged-unknown')
		})

		it('falls back to git history for a tracked target', () => {
			const root = gitRepository()
			write(root, golden, goldenLinear)
			write(root, cursor, cursorLinear)
			commit(root, 'agree')
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } } }))

			expect(find(root, 'mcp-diverged-target')?.path).toBe(`${cursor}#servers.linear.command`)
		})

		it('walks past a commit where the golden set did not parse', () => {
			const root = gitRepository()
			write(root, golden, goldenLinear)
			write(root, cursor, cursorLinear)
			commit(root, 'agree')
			write(root, golden, 'broken = = toml\n')
			commit(root, 'golden broken')
			write(root, golden, goldenLinear)
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } } }))

			expect(problems(root)).toContain('mcp-diverged-target')
		})

		it('walks past a commit where the target did not parse', () => {
			const root = gitRepository()
			write(root, golden, goldenLinear)
			write(root, cursor, cursorLinear)
			commit(root, 'agree')
			write(root, cursor, '{ not json')
			commit(root, 'target broken')
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } } }))

			expect(problems(root)).toContain('mcp-diverged-target')
		})

		it('reports an unknown direction when no commit ever agreed', () => {
			const root = gitRepository()
			write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'npx' } } }))
			commit(root, 'never agreed')

			expect(problems(root)).toContain('mcp-diverged-unknown')
		})

		it('treats a field the golden set leaves unset as no difference', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'], timeout: 30000 } } }),
			)

			expect(diagnose(root)).toEqual([])
		})
	})

	describe('credentials', () => {
		it('reports a literal credential with no golden set present', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { API_KEY: 'sk-live-9f3a' } } } }),
			)

			expect(problems(root)).toEqual(['mcp-literal-secret'])
		})

		it('reports a literal credential at untracked severity outside a git repository', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { API_KEY: 'sk-live-9f3a' } } } }),
			)

			expect(problems(root)).not.toContain('mcp-committed-secret')
		})

		it('accepts the other documented reference forms', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({
					mcpServers: {
						linear: { command: 'npx', env: { API_KEY: '$LINEAR_TOKEN', AUTH_TOKEN: ref('env:LINEAR_TOKEN') } },
						sentry: { command: 'npx', env: { SENTRY_SECRET: ref('input:sentry-token') } },
					},
				}),
			)

			expect(diagnose(root)).toEqual([])
		})

		it('reports a value that looks like a reference but names no variable', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { API_KEY: '$ {LINEAR}' } } } }),
			)

			expect(problems(root)).toContain('mcp-literal-secret')
		})

		it('leaves a URL with no credential in it alone', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { url: 'https://mcp.linear.app/sse?workspace=acme' } } }),
			)

			expect(diagnose(root)).toEqual([])
		})

		it('reports a credential carried in a URL query parameter', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { url: 'https://mcp.linear.app/sse?api_key=lin_9f3a' } } }),
			)

			expect(find(root, 'mcp-literal-secret')?.path).toBe(`${cursor}#servers.linear.url`)
		})

		it('accepts a URL query parameter holding a reference', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({
					mcpServers: { linear: { url: `https://mcp.linear.app/sse?api_key=${ref('LINEAR_TOKEN')}` } },
				}),
			)

			expect(diagnose(root)).toEqual([])
		})

		it('leaves a url that does not parse alone, because it is malformed rather than leaky', () => {
			const root = repository()
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { url: 'mcp.linear.app' } } }))

			expect(diagnose(root)).toEqual([])
		})
	})

	describe('credentials, continued', () => {
		it('reports a literal credential in an MCP config', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { LINEAR_TOKEN: 'lin_api_9f3a' } } } }),
			)

			const finding = find(root, 'mcp-literal-secret')

			expect(finding?.path).toBe(`${cursor}#servers.linear.env.LINEAR_TOKEN`)
			expect(finding?.repair.instruction).toContain('environment variable')
		})

		it('reports a committed credential, whose repair is to rotate it', () => {
			const root = gitRepository()
			write(
				root,
				cursor,
				JSON.stringify({
					mcpServers: { linear: { url: 'https://mcp.linear.app', headers: { Authorization: 'Bearer lin_api_9f3a' } } },
				}),
			)
			commit(root, 'committed')

			const finding = find(root, 'mcp-committed-secret')

			expect(finding?.path).toBe(`${cursor}#servers.linear.headers.Authorization`)
			expect(finding?.repair.instruction).toContain('rotate')
		})

		it('accepts a reference in a credential-bearing field', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({
					mcpServers: {
						linear: { url: 'https://mcp.linear.app', headers: { Authorization: `Bearer ${ref('LINEAR_TOKEN')}` } },
					},
				}),
			)

			expect(diagnose(root)).toEqual([])
		})

		it('leaves a name that merely contains a credential word inside another word alone', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({
					mcpServers: {
						linear: { command: 'npx', env: { MONKEY_PATCH: 'on', AUTHOR: 'ada', KEYSTONE_URL: 'https://k' } },
					},
				}),
			)

			expect(diagnose(root)).toEqual([])
		})

		it('reports a credential word run together with the rest of the name', () => {
			const root = repository()
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { MYTOKEN: 'lin_9f3a' } } } }))

			expect(find(root, 'mcp-literal-secret')?.path).toBe(`${cursor}#servers.linear.env.MYTOKEN`)
		})

		it('reports a credential segment spelled run together in lower case', () => {
			const root = repository()
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { apikey: 'lin_9f3a' } } } }))

			expect(find(root, 'mcp-literal-secret')?.path).toBe(`${cursor}#servers.linear.env.apikey`)
		})

		it('reports a credential segment spelled in camel case', () => {
			const root = repository()
			write(root, cursor, JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { apiKey: 'lin_9f3a' } } } }))

			expect(find(root, 'mcp-literal-secret')?.path).toBe(`${cursor}#servers.linear.env.apiKey`)
		})

		it('leaves an ordinary environment value alone', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { NODE_ENV: 'production' } } } }),
			)

			expect(diagnose(root)).toEqual([])
		})

		it('reports a credential carried in a URL', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { url: 'https://user:lin_api_9f3a@mcp.linear.app' } } }),
			)

			expect(find(root, 'mcp-literal-secret')?.path).toBe(`${cursor}#servers.linear.url`)
		})

		it('never carries an env credential into the finding', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { command: 'npx', env: { API_KEY: 'sk-live-9f3a2c7b1d' } } } }),
			)

			expect(find(root, 'mcp-literal-secret')).toBeDefined()
			expectNoLeak(root, 'sk-live-9f3a2c7b1d')
		})

		it('never carries a header credential into the finding', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({
					mcpServers: {
						linear: { url: 'https://mcp.linear.app', headers: { Authorization: 'Bearer lin_api_7c4e11d9' } },
					},
				}),
			)

			expect(find(root, 'mcp-literal-secret')).toBeDefined()
			expectNoLeak(root, 'lin_api_7c4e11d9')
		})

		it("never carries a URL's userinfo credential into the finding", () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { url: 'https://user:pw_5b3d81ac@mcp.linear.app' } } }),
			)

			expect(find(root, 'mcp-literal-secret')).toBeDefined()
			expectNoLeak(root, 'pw_5b3d81ac')
		})

		it('never carries a URL query parameter credential into the finding', () => {
			const root = repository()
			write(
				root,
				cursor,
				JSON.stringify({ mcpServers: { linear: { url: 'https://mcp.linear.app/sse?api_key=qp_2f8c60be' } } }),
			)

			expect(find(root, 'mcp-literal-secret')).toBeDefined()
			expectNoLeak(root, 'qp_2f8c60be')
		})

		it('never carries a golden-set credential into the finding', () => {
			const root = repository()
			write(root, golden, `${goldenLinear}\n[servers.linear.env]\nLINEAR_TOKEN = "gs_4d19ae72"\n`)

			expect(find(root, 'mcp-literal-secret')).toBeDefined()
			expectNoLeak(root, 'gs_4d19ae72')
		})

		it('never carries a credential into a divergence finding', () => {
			const root = repository()
			write(
				root,
				golden,
				`[servers.linear]\nurl = "https://mcp.linear.app"\n\n[servers.linear.headers]\nAuthorization = "Bearer ${ref('LINEAR_TOKEN')}"\n`,
			)
			write(
				root,
				cursor,
				JSON.stringify({
					mcpServers: {
						linear: { url: 'https://mcp.linear.app', headers: { Authorization: 'Bearer dv_8a2e37fb' } },
					},
				}),
			)

			expect(find(root, 'mcp-diverged-unknown')).toBeDefined()
			expectNoLeak(root, 'dv_8a2e37fb')
		})

		it('never carries an unreadable file’s content into the finding', () => {
			const root = repository()
			write(root, cursor, '{ "mcpServers": { "linear": { "env": { "API_KEY": ur_6c50f2b8 } } }')

			expect(find(root, 'mcp-target-unreadable')).toBeDefined()
			expectNoLeak(root, 'ur_6c50f2b8')
		})
	})

	describe('targets', () => {
		it('reports an unreadable target and compares nothing in it', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, cursor, '{ not json')

			expect(problems(root)).toEqual(['mcp-target-unreadable'])
			expect(find(root, 'mcp-target-unreadable')?.path).toBe(cursor)
		})

		it('reports nothing for a harness with no project-scope MCP file', () => {
			const root = repository()
			mkdirSync(join(root, '.github/skills'), { recursive: true })
			write(root, golden, goldenLinear)

			expect(diagnose(root).some((finding) => finding.path.includes('copilot'))).toBe(false)
		})

		it('reads only the MCP key from a file that holds other settings', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(
				root,
				'.gemini/settings.json',
				JSON.stringify({
					context: { fileName: ['AGENTS.md'] },
					mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } },
				}),
			)

			expect(diagnose(root)).toEqual([])
		})

		it('compares a TOML target against the golden set semantically', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, '.codex/config.toml', '[mcp_servers.linear]\ncommand = "npx"\nargs = ["-y", "linear-mcp"]\n')

			expect(diagnose(root)).toEqual([])
		})

		it('reports an unreadable TOML target', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, '.codex/config.toml', 'broken = = toml\n')

			expect(find(root, 'mcp-target-unreadable')?.path).toBe('.codex/config.toml')
		})
	})

	describe('the report', () => {
		it('names each MCP fault and locates it beyond the file', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, cursor, JSON.stringify({ mcpServers: {} }))

			const finding = diagnose(root)[0]

			expect(finding?.problem).toBe('mcp-unprojected')
			expect(finding?.path).toBe(`${cursor}#servers.linear`)
		})

		it('offers every MCP repair as an instruction rather than a command', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, cursor, JSON.stringify({ mcpServers: {} }))

			// Not one of these is a shell invocation that completes the repair. Editing a config the
			// user wrote, and rotating a credential at its issuer, are both judgment; a `command` here
			// would invite an agent to run prose.
			expect(diagnose(root).map((finding) => finding.repair.command)).toEqual(diagnose(root).map(() => ''))
		})

		it('carries the repair for every MCP finding it reports', () => {
			const root = repository()
			write(root, golden, goldenLinear)
			write(root, cursor, JSON.stringify({ mcpServers: {} }))

			for (const finding of diagnose(root)) {
				expect(finding.detail).not.toBe('')
				expect(finding.repair.instruction).not.toBe('')
			}
		})
	})
})

describe('positionOf', () => {
	it('reads the line and column a TOML error carries', () => {
		expect(positionOf({ line: 4, column: 11, codeblock: 'token = sk-live-9f3a\n' })).toEqual({ line: 4, column: 11 })
	})

	it('reads no position from an error that carries none, rather than reaching for its message', () => {
		expect(positionOf(new Error('Invalid TOML document: token = sk-live-9f3a'))).toBeUndefined()
	})

	it('reads no position from a thrown value that is not an object', () => {
		expect(positionOf('sk-live-9f3a')).toBeUndefined()
	})
})
