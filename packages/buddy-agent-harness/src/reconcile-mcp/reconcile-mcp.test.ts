import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { projectionRecordPath } from '../diagnose-mcp/mcp-baseline.ts'
import { goldenSetPath } from '../diagnose-mcp/mcp-sources.ts'
import { reconcileMcp } from './reconcile-mcp.ts'

function write(root: string, path: string, body: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), body)
}

function read(root: string, path: string): string | undefined {
	const absolute = join(root, path)
	return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}

function repository(): string {
	return mkdtempSync(join(tmpdir(), 'buddy-agent-harness-reconcile-mcp-'))
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

function reconcile(root: string, accept: string[] = []) {
	return reconcileMcp({ root, git: new GitBridgeState(root), accept })
}

function planned(root: string, accept: string[] = []) {
	const plan = reconcile(root, accept)
	if (plan.kind !== 'planned') throw new Error(`expected a plan, got ${JSON.stringify(plan)}`)
	return plan
}

function rejected(root: string, accept: string[]): string[] {
	const plan = reconcile(root, accept)
	if (plan.kind !== 'rejected') throw new Error(`expected a rejection, got ${plan.kind}`)
	return plan.reasons
}

function row(plan: ReturnType<typeof planned>, path: string) {
	return plan.rows.find((entry) => entry.path === path)
}

/** A reference to a secret, assembled rather than written literally, matching `diagnose-mcp.test.ts`. */
const ref = (name: string) => `$\u007b${name}\u007d`
const literalToken = ['sk', 'live', '9f3a2c7b1d'].join('-')

const golden = goldenSetPath
const record = projectionRecordPath
const claudeCode = '.mcp.json'
const cursor = '.cursor/mcp.json'
const gemini = '.gemini/settings.json'
const codex = '.codex/config.toml'

const goldenLinear = '# The tracker.\n[servers.linear]\ncommand = "npx" # pinned\nargs = ["-y", "linear-mcp"]\n'
const linearModel = { command: 'npx', args: ['-y', 'linear-mcp'] }

function recorded(root: string, targets: Record<string, Record<string, unknown>>): void {
	write(root, record, JSON.stringify({ targets }))
}

function mcpJson(servers: Record<string, unknown>): string {
	return JSON.stringify({ mcpServers: servers })
}

function recordFor(root: string): { targets: Record<string, Record<string, unknown>> } {
	return JSON.parse(read(root, record) as string)
}

describe('reconcileMcp', () => {
	it('reports nothing to reconcile into without a golden set', () => {
		expect(reconcile(repository())).toEqual({ kind: 'absent' })
	})

	it('fails on an unreadable golden set by position only', () => {
		const root = repository()
		write(root, golden, `[servers.linear]\ncommand = ${literalToken}\n`)

		const plan = reconcile(root)

		expect(plan).toEqual({ kind: 'unreadable', position: { line: 2, column: 11 } })
	})

	it('refuses a target that does not parse', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, cursor, '{ not json')

		expect(row(planned(root), cursor)).toEqual({ path: cursor, action: 'refuse', detail: 'the target does not parse' })
	})

	it('offers a field only the harness changed, and writes nothing without approval', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		recorded(root, { [claudeCode]: { linear: linearModel } })
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } }))

		const plan = planned(root)

		expect(plan).toEqual({
			kind: 'planned',
			written: false,
			rows: [
				{
					path: '.mcp.json#servers.linear.command',
					action: 'import',
					detail: 'only the harness changed it — approve to take it into the golden set',
					value: 'command = "bunx"',
				},
			],
		})
		expect(read(root, golden)).toBe(goldenLinear)
	})

	it('imports an approved field in place, keeping every comment, and records the agreement', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		recorded(root, { [claudeCode]: { linear: linearModel } })
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } }))

		const plan = planned(root, ['.mcp.json#servers.linear.command', '.mcp.json#servers.linear.command'])

		expect(plan.written).toBe(true)
		expect(row(plan, '.mcp.json#servers.linear.command')).toMatchObject({ action: 'imported' })
		expect(read(root, golden)).toBe(goldenLinear.replace('"npx"', '"bunx"'))
		expect(recordFor(root).targets[claudeCode]?.['linear']).toEqual({ ...linearModel, command: 'bunx' })
		expect(planned(root).rows).toEqual([])
	})

	it('imports only the approved field of several', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		recorded(root, { [claudeCode]: { linear: linearModel } })
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx', args: ['linear-mcp'] } }))

		planned(root, ['.mcp.json#servers.linear.args'])

		expect(read(root, golden)).toBe(goldenLinear.replace('["-y", "linear-mcp"]', '[ "linear-mcp" ]'))
	})

	it('imports a field the harness removed by removing it from the golden set', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		recorded(root, { [claudeCode]: { linear: linearModel } })
		write(root, claudeCode, mcpJson({ linear: { command: 'npx' } }))

		expect(row(planned(root), '.mcp.json#servers.linear.args')).toMatchObject({ value: '(unset)' })
		planned(root, ['.mcp.json#servers.linear.args'])

		expect(read(root, golden)).toBe('# The tracker.\n[servers.linear]\ncommand = "npx" # pinned\n')
		expect(recordFor(root).targets[claudeCode]?.['linear']).toEqual({ command: 'npx' })
	})

	it('takes only the names the golden set speaks for in a map', () => {
		const root = repository()
		write(root, golden, '[servers.docs]\nurl = "https://docs"\nenv = { A = "1", GONE = "x" }\n')
		recorded(root, { [claudeCode]: { docs: { url: 'https://docs', env: { A: '1', GONE: 'x' } } } })
		write(root, claudeCode, mcpJson({ docs: { type: 'http', url: 'https://docs', env: { A: '2', EXTRA: '3' } } }))

		expect(row(planned(root), '.mcp.json#servers.docs.env')).toMatchObject({ value: 'env = { A = "2" }' })
	})

	it('removes a map the harness emptied of every name the golden set speaks for', () => {
		const root = repository()
		write(root, golden, '[servers.docs]\nurl = "https://docs"\nenv = { A = "1" }\n')
		recorded(root, { [claudeCode]: { docs: { url: 'https://docs', env: { A: '1' } } } })
		write(root, claudeCode, mcpJson({ docs: { type: 'http', url: 'https://docs', env: { B: '2' } } }))

		expect(row(planned(root), '.mcp.json#servers.docs.env')).toMatchObject({ value: '(unset)' })
	})

	it('removes a map the harness dropped altogether', () => {
		const root = repository()
		write(root, golden, '[servers.docs]\nurl = "https://docs"\nenv = { A = "1" }\n')
		recorded(root, { [claudeCode]: { docs: { url: 'https://docs', env: { A: '1' } } } })
		write(root, claudeCode, mcpJson({ docs: { type: 'http', url: 'https://docs' } }))

		expect(row(planned(root), '.mcp.json#servers.docs.env')).toMatchObject({ value: '(unset)' })
	})

	it('leaves a change only the golden side made to mcp project', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		recorded(root, { [claudeCode]: { linear: { ...linearModel, command: 'bunx' } } })
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } }))

		expect(planned(root).rows).toEqual([])
	})

	it('keeps a three-way conflict report-only, and refuses its approval', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "pnpx"\n')
		recorded(root, { [claudeCode]: { linear: { command: 'npx' } } })
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx' } }))

		expect(row(planned(root), '.mcp.json#servers.linear.command')).toMatchObject({ action: 'skip' })
		const reasons = rejected(root, ['.mcp.json#servers.linear.command'])

		expect(reasons[0]).toContain('is skip, not importable: both sides changed')
		expect(read(root, golden)).toBe('[servers.linear]\ncommand = "pnpx"\n')
	})

	it('keeps a divergence no baseline can place report-only', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "pnpx"\n')
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx' } }))

		expect(row(planned(root), '.mcp.json#servers.linear.command')?.detail).toContain('no baseline says')
	})

	it('refuses an approval naming no field it offered', () => {
		const root = repository()
		write(root, golden, goldenLinear)

		expect(rejected(root, ['.mcp.json#servers.linear.url'])).toEqual([
			'.mcp.json#servers.linear.url names no importable field',
		])
	})

	it('offers each field of a server only the harness declares, without the transport it implies', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, mcpJson({ docs: { type: 'http', url: 'https://docs', timeout: 5000 } }))

		expect(planned(root).rows.map(({ path, value }) => [path, value])).toEqual([
			['.mcp.json#servers.docs.url', 'url = "https://docs"'],
			['.mcp.json#servers.docs.timeout', 'timeout = 5000'],
		])
	})

	it('offers a transport the harness states against what the golden set would infer', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, mcpJson({ docs: { type: 'sse', url: 'https://docs' } }))

		expect(row(planned(root), '.mcp.json#servers.docs.transport')).toMatchObject({ value: 'transport = "sse"' })
	})

	it('adds an approved server as a new table and records it', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, mcpJson({ docs: { type: 'http', url: 'https://docs', timeout: 5000 } }))

		const plan = planned(root, ['.mcp.json#servers.docs.url'])

		expect(row(plan, '.mcp.json#servers.docs.url')).toMatchObject({ action: 'imported' })
		expect(row(plan, '.mcp.json#servers.docs.timeout')).toMatchObject({ action: 'import' })
		expect(read(root, golden)).toBe(`${goldenLinear}\n[servers.docs]\nurl = "https://docs"\n`)
		expect(recordFor(root).targets[claudeCode]).toEqual({ docs: { transport: 'http', url: 'https://docs' } })
	})

	it('adds a server offered by two harnesses once, when they agree', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, mcpJson({ docs: { command: 'docs-mcp' } }))
		write(root, cursor, mcpJson({ docs: { command: 'docs-mcp' } }))

		planned(root, ['.mcp.json#servers.docs.command', '.cursor/mcp.json#servers.docs.command'])

		expect(read(root, golden)).toBe(`${goldenLinear}\n[servers.docs]\ncommand = "docs-mcp"\n`)
		expect(Object.keys(recordFor(root).targets)).toEqual([claudeCode, cursor])
	})

	it('refuses to add a server with nothing to run', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, mcpJson({ docs: { command: 'docs-mcp', args: ['--stdio'] } }))

		expect(rejected(root, ['.mcp.json#servers.docs.args'])).toEqual([
			'servers.docs would be added with nothing to run — approve its command or url too',
		])
	})

	it('refuses two approvals of one field with different values', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		recorded(root, { [claudeCode]: { linear: linearModel }, [cursor]: { linear: linearModel } })
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } }))
		write(root, cursor, mcpJson({ linear: { command: 'pnpx', args: ['-y', 'linear-mcp'] } }))

		const reasons = rejected(root, ['.mcp.json#servers.linear.command', '.cursor/mcp.json#servers.linear.command'])

		expect(reasons).toEqual([
			'servers.linear.command is approved from more than one target with different values — approve one',
		])
		expect(read(root, golden)).toBe(goldenLinear)
	})

	it('hands over a field the golden set spreads over a sub-table as an edit', () => {
		const root = repository()
		const source = '[servers.docs]\nurl = "https://docs"\n\n[servers.docs.headers]\nX-Team = "a"\n'
		write(root, golden, source)
		recorded(root, { [claudeCode]: { docs: { url: 'https://docs', headers: { 'X-Team': 'a' } } } })
		write(root, claudeCode, mcpJson({ docs: { type: 'http', url: 'https://docs', headers: { 'X-Team': 'b' } } }))

		const plan = planned(root, ['.mcp.json#servers.docs.headers'])

		expect(row(plan, '.mcp.json#servers.docs.headers')).toMatchObject({
			action: 'edit',
			value: 'headers = { X-Team = "b" }',
		})
		expect(read(root, golden)).toBe(source)
		expect(existsSync(join(root, record))).toBe(true)
	})

	it('hands over an added server as an edit when the golden set declares its servers inline', () => {
		const root = repository()
		const source = 'servers = { linear = { command = "npx" } }\n'
		write(root, golden, source)
		write(root, claudeCode, mcpJson({ linear: { command: 'npx' }, docs: { command: 'docs-mcp' } }))

		const plan = planned(root, ['.mcp.json#servers.docs.command'])

		expect(row(plan, '.mcp.json#servers.docs.command')).toMatchObject({ action: 'edit' })
		expect(read(root, golden)).toBe(source)
	})
})

describe('credentials', () => {
	it('imports the server and refuses the literal, never showing its value', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(
			root,
			claudeCode,
			mcpJson({
				docs: {
					type: 'http',
					url: 'https://docs',
					headers: { Authorization: `Bearer ${literalToken}`, 'X-Team': 'a' },
				},
			}),
		)

		const plan = planned(root)

		expect(row(plan, '.mcp.json#servers.docs.headers.Authorization')).toEqual({
			path: '.mcp.json#servers.docs.headers.Authorization',
			action: 'refuse',
			detail: `headers.Authorization holds a literal credential, which never enters the golden set — set it in the environment and reference it as ${ref('VAR')}`,
		})
		expect(row(plan, '.mcp.json#servers.docs.headers')).toMatchObject({ value: 'headers = { X-Team = "a" }' })
		expect(JSON.stringify(plan)).not.toContain(literalToken)
	})

	it('offers nothing for a map holding only a literal', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, mcpJson({ docs: { command: 'docs-mcp', env: { API_KEY: literalToken } } }))

		const paths = planned(root).rows.map((entry) => `${entry.path} ${entry.action}`)

		expect(paths).toEqual(['.mcp.json#servers.docs.command import', '.mcp.json#servers.docs.env.API_KEY refuse'])
	})

	it('keeps the golden reference where the harness pasted a literal over it', () => {
		const root = repository()
		const source = `[servers.docs]\ncommand = "docs-mcp"\nenv = { API_KEY = "${ref('DOCS_KEY')}", A = "1" }\n`
		write(root, golden, source)
		recorded(root, { [claudeCode]: { docs: { command: 'docs-mcp', env: { API_KEY: ref('DOCS_KEY'), A: '1' } } } })
		write(root, claudeCode, mcpJson({ docs: { command: 'docs-mcp', env: { API_KEY: literalToken, A: '2' } } }))

		const plan = planned(root)

		expect(row(plan, '.mcp.json#servers.docs.env.API_KEY')).toMatchObject({ action: 'refuse' })
		expect(row(plan, '.mcp.json#servers.docs.env')).toMatchObject({
			value: `env = { API_KEY = "${ref('DOCS_KEY')}", A = "2" }`,
		})
	})

	it('offers nothing when the literal was the only change', () => {
		const root = repository()
		write(root, golden, `[servers.docs]\ncommand = "docs-mcp"\nenv = { API_KEY = "${ref('DOCS_KEY')}" }\n`)
		recorded(root, { [claudeCode]: { docs: { command: 'docs-mcp', env: { API_KEY: ref('DOCS_KEY') } } } })
		write(root, claudeCode, mcpJson({ docs: { command: 'docs-mcp', env: { API_KEY: literalToken } } }))

		expect(planned(root).rows.map((entry) => entry.action)).toEqual(['refuse'])
	})

	it('refuses a url or an argument holding a literal whole', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(
			root,
			claudeCode,
			mcpJson({
				docs: { type: 'http', url: `https://user:${literalToken}@docs` },
				tool: { command: 'tool', args: [`--token=${literalToken}`] },
			}),
		)

		const plan = planned(root)

		expect(row(plan, '.mcp.json#servers.docs.url')).toMatchObject({ action: 'refuse' })
		expect(row(plan, '.mcp.json#servers.tool.args')).toMatchObject({ action: 'refuse' })
		expect(JSON.stringify(plan)).not.toContain(literalToken)
	})
})

describe('harness defaults and dialects', () => {
	it('does not take a timeout Gemini CLI fills in by default for the user’s', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		mkdirSync(join(root, '.gemini'), { recursive: true })
		write(root, gemini, mcpJson({ docs: { command: 'docs-mcp', timeout: 600000 } }))

		expect(row(planned(root), '.gemini/settings.json#servers.docs.timeout')).toMatchObject({
			action: 'skip',
			detail:
				"gemini-cli fills this in by default, so it may not be the user's — set it in the golden set by hand if it is",
		})
	})

	it('translates a Cursor reference back into the golden form', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, cursor, mcpJson({ docs: { command: 'docs-mcp', env: { HOME_DIR: '$\u007benv:HOME\u007d' } } }))

		expect(row(planned(root), '.cursor/mcp.json#servers.docs.env')).toMatchObject({
			value: `env = { HOME_DIR = "${ref('HOME')}" }`,
		})
	})

	it('translates a Codex bearer token and its default timeout', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(
			root,
			codex,
			'[mcp_servers.docs]\nurl = "https://docs"\nbearer_token_env_var = "DOCS_TOKEN"\ntool_timeout_sec = 60\n',
		)

		const plan = planned(root)

		expect(row(plan, '.codex/config.toml#servers.docs.headers')).toMatchObject({
			value: `headers = { Authorization = "Bearer ${ref('DOCS_TOKEN')}" }`,
		})
		expect(row(plan, '.codex/config.toml#servers.docs.timeout')).toMatchObject({ action: 'skip' })
	})
})

describe('git-backed baselines', () => {
	it('records a server the record lacks from the baseline of each field', () => {
		const root = gitRepository()
		write(root, golden, '[servers.linear]\ncommand = "npx"\nargs = ["a"]\ntimeout = 100\n')
		write(root, claudeCode, mcpJson({ linear: { command: 'npx', args: ['a'], timeout: 100 } }))
		commit(root, 'agree')
		write(root, golden, '[servers.linear]\ncommand = "npx"\nargs = ["a"]\ntimeout = 200\n')
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx', args: ['a'], timeout: 100 } }))

		planned(root, ['.mcp.json#servers.linear.command'])

		expect(recordFor(root).targets[claudeCode]?.['linear']).toEqual({
			transport: 'stdio',
			command: 'bunx',
			args: ['a'],
			timeout: 100,
		})
	})

	it('leaves the record alone for a server another field of which no baseline can place', () => {
		const root = gitRepository()
		write(root, golden, '[servers.linear]\ncommand = "npx"\nargs = ["a"]\n')
		write(root, claudeCode, mcpJson({ linear: { command: 'npx', args: ['b'] } }))
		commit(root, 'agree on command only')
		write(root, claudeCode, mcpJson({ linear: { command: 'bunx', args: ['b'] } }))

		planned(root, ['.mcp.json#servers.linear.command'])

		expect(read(root, golden)).toBe('[servers.linear]\ncommand = "bunx"\nargs = ["a"]\n')
		expect(recordFor(root).targets).toEqual({})
	})
})
