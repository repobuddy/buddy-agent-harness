import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'
import { GitBridgeState } from '../diagnose-bridges/git-bridge-state.ts'
import { parseJsonWithComments } from '../diagnose-bridges/json-with-comments.ts'
import { projectionRecordPath } from '../diagnose-mcp/mcp-baseline.ts'
import { goldenSetPath } from '../diagnose-mcp/mcp-sources.ts'
import { projectMcp } from './project-mcp.ts'

function write(root: string, path: string, body: string): void {
	mkdirSync(dirname(join(root, path)), { recursive: true })
	writeFileSync(join(root, path), body)
}

function read(root: string, path: string): string | undefined {
	const absolute = join(root, path)
	return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}

function repository(): string {
	return mkdtempSync(join(tmpdir(), 'buddy-agent-harness-project-mcp-'))
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

function project(root: string, options: { write?: boolean } = {}) {
	return projectMcp({ root, git: new GitBridgeState(root), write: options.write ?? false })
}

function planned(root: string, options: { write?: boolean } = {}) {
	const plan = project(root, options)
	if (plan.kind !== 'planned') throw new Error(`expected a plan, got ${plan.kind}`)
	return plan
}

/** A reference to a secret, assembled rather than written literally, matching `diagnose-mcp.test.ts`. */
const ref = (name: string) => `$\u007b${name}\u007d`

const golden = goldenSetPath
const record = projectionRecordPath
const claudeCode = '.mcp.json'
const cursor = '.cursor/mcp.json'
const gemini = '.gemini/settings.json'
const codex = '.codex/config.toml'

const goldenLinear = '[servers.linear]\ncommand = "npx"\nargs = ["-y", "linear-mcp"]\n'
const cursorLinear = JSON.stringify({ mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } } })

function row(plan: ReturnType<typeof planned>, target: string, server: string) {
	return plan.rows.find((entry) => entry.target === target && entry.server === server)
}

function recordFor(root: string): { targets: Record<string, Record<string, unknown>> } {
	return JSON.parse(read(root, record) as string)
}

describe('projectMcp', () => {
	it('reports nothing to project without a golden set', () => {
		const root = repository()

		const plan = project(root)

		expect(plan).toEqual({ kind: 'absent' })
	})

	it('fails on an unreadable golden set by position only', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = sk-live-9f3a2c7b1d\n')

		const plan = project(root, { write: true }) as { kind: 'unreadable'; position?: { line: number; column: number } }

		expect(plan.kind).toBe('unreadable')
		expect(plan.position).toEqual({ line: 2, column: 11 })
		expect(JSON.stringify(plan)).not.toContain('sk-live')
		expect(existsSync(join(root, claudeCode))).toBe(false)
	})

	it('refuses a target that does not parse and leaves it alone', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, cursor, '{ not json')

		const plan = planned(root, { write: true })

		expect(row(plan, cursor, '')).toMatchObject({ action: 'refuse', detail: 'the target does not parse' })
		expect(read(root, cursor)).toBe('{ not json')
		expect(JSON.parse(read(root, claudeCode) as string).mcpServers.linear).toBeDefined()
	})

	it('creates the MCP file of an enabled harness', () => {
		const root = repository()
		write(root, golden, goldenLinear)

		const plan = planned(root, { write: true })

		const created = JSON.parse(read(root, claudeCode) as string)
		expect(created.mcpServers.linear).toEqual({ type: 'stdio', command: 'npx', args: ['-y', 'linear-mcp'] })
		expect(row(plan, claudeCode, 'linear')).toMatchObject({ action: 'add', detail: 'creates the file' })
	})

	it('creates nothing for a harness that is not enabled', () => {
		const root = repository()
		write(root, golden, goldenLinear)

		planned(root, { write: true })

		expect(existsSync(join(root, codex))).toBe(false)
	})

	it('appends a server to a JSON file without touching a byte of the rest', () => {
		const root = repository()
		write(root, golden, '[servers.a]\ncommand = "npx"\n\n[servers.b]\ncommand = "bunx"\n')
		const source = '{\n  "mcpServers": {\n    "a": { "command": "npx" } // comment\n  }\n}'
		write(root, cursor, source)

		planned(root, { write: true })

		const next = read(root, cursor) as string
		const before = source.slice(0, source.indexOf('"npx" }') + '"npx" }'.length)
		expect(next.startsWith(before)).toBe(true)
		expect(parseJsonWithComments(next)).toMatchObject({ mcpServers: { a: { command: 'npx' }, b: { command: 'bunx' } } })
	})

	it('adds the MCP key to a shared settings file and keeps its comments', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		const source = '{\n  // keep me\n  "context": { "fileName": ["AGENTS.md"] }\n}'
		write(root, gemini, source)

		planned(root, { write: true })

		const next = read(root, gemini) as string
		expect(next).toContain('// keep me')
		const parsed = parseJsonWithComments(next) as { context: unknown; mcpServers: { linear: unknown } }
		expect(parsed.context).toEqual({ fileName: ['AGENTS.md'] })
		expect(parsed.mcpServers.linear).toBeDefined()
	})

	it('appends a server table to a Codex file without touching a byte of the rest', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		const source = '# a comment\nmodel = "gpt"\n'
		write(root, codex, source)

		planned(root, { write: true })

		const next = read(root, codex) as string
		expect(next.startsWith(source)).toBe(true)
		expect(parseToml(next)).toMatchObject({ model: 'gpt', mcp_servers: { linear: { command: 'npx' } } })
	})

	it('writes nothing without --write', () => {
		const root = repository()
		write(root, golden, goldenLinear)

		const plan = planned(root)

		expect(row(plan, claudeCode, 'linear')?.action).toBe('add')
		expect(row(plan, cursor, 'linear')?.action).toBe('add')
		expect(existsSync(join(root, claudeCode))).toBe(false)
		expect(existsSync(join(root, cursor))).toBe(false)
		expect(existsSync(join(root, record))).toBe(false)
	})

	it('records what it projected', () => {
		const root = repository()
		write(root, golden, goldenLinear)

		planned(root, { write: true })

		const projected = recordFor(root)
		expect(projected.targets[claudeCode]?.['linear']).toMatchObject({ command: 'npx', args: ['-y', 'linear-mcp'] })
		expect(projected.targets[cursor]?.['linear']).toMatchObject({ command: 'npx', args: ['-y', 'linear-mcp'] })
	})

	it('keeps what the record holds for servers it did not touch', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, record, JSON.stringify({ targets: { [claudeCode]: { gone: { command: 'old' } } } }))

		planned(root, { write: true })

		const projected = recordFor(root)
		expect(projected.targets[claudeCode]?.['gone']).toEqual({ command: 'old' })
		expect(projected.targets[claudeCode]?.['linear']).toBeDefined()
	})

	it('reports nothing for a server already in agreement', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, cursorLinear)

		const plan = planned(root)

		expect(row(plan, claudeCode, 'linear')).toBeUndefined()
	})

	it('refuses a server whose golden entry holds a literal credential, without the value', () => {
		const root = repository()
		write(root, golden, `${goldenLinear}\n[servers.linear.env]\nLINEAR_TOKEN = "lin_api_9f3a"\n`)

		const plan = planned(root, { write: true })

		expect(row(plan, claudeCode, 'linear')).toMatchObject({ action: 'refuse' })
		expect(row(plan, claudeCode, 'linear')?.detail).toContain('env.LINEAR_TOKEN')
		expect(JSON.stringify(plan)).not.toContain('lin_api_9f3a')
		expect(existsSync(join(root, claudeCode))).toBe(false)
	})

	it('refuses an SSE server for Codex', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ntransport = "sse"\nurl = "https://mcp.example.com"\n')
		mkdirSync(join(root, '.codex'), { recursive: true })

		const plan = planned(root)

		expect(row(plan, codex, 'linear')?.action).toBe('refuse')
		expect(row(plan, codex, 'linear')?.detail).toContain('transport')
	})

	it('refuses a server with nothing to run', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ndescription = "nothing to run"\n')

		const plan = planned(root)

		const refusal = row(plan, claudeCode, 'linear')
		expect(refusal?.action).toBe('refuse')
		expect(refusal?.detail).toMatch(/command|url/)
	})

	it('writes a header reference into Gemini CLI as written', () => {
		const root = repository()
		write(
			root,
			golden,
			`[servers.linear]\nurl = "https://mcp.example.com"\n\n[servers.linear.headers]\nAuthorization = "Bearer ${ref('TOKEN')}"\n`,
		)
		mkdirSync(join(root, '.gemini'), { recursive: true })

		const plan = planned(root)

		expect(row(plan, gemini, 'linear')).toMatchObject({ action: 'add' })
		const entry = plan.entries.find((entry) => entry.target === gemini && entry.server === 'linear')
		expect(JSON.parse(entry?.entry as string).linear.headers).toEqual({ Authorization: `Bearer ${ref('TOKEN')}` })
	})

	it('refuses a variable Codex would have to rename', () => {
		const root = repository()
		write(root, golden, `[servers.linear]\ncommand = "npx"\n\n[servers.linear.env]\nAPI = "${ref('OTHER')}"\n`)
		mkdirSync(join(root, '.codex'), { recursive: true })

		const plan = planned(root)

		expect(row(plan, codex, 'linear')).toMatchObject({ action: 'refuse' })
		expect(row(plan, codex, 'linear')?.detail).toContain('env')
	})

	it('holds back a server the target changed', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(
			root,
			record,
			JSON.stringify({ targets: { [claudeCode]: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } } } }),
		)
		const source = JSON.stringify({ mcpServers: { linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } } })
		write(root, claudeCode, source)

		const plan = planned(root, { write: true })

		expect(row(plan, claudeCode, 'linear')).toMatchObject({ action: 'skip' })
		expect(row(plan, claudeCode, 'linear')?.detail).toContain('the target changed')
		expect(read(root, claudeCode)).toBe(source)
	})

	it('holds back a three-way conflict', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "pnpx"\n')
		write(root, record, JSON.stringify({ targets: { [claudeCode]: { linear: { command: 'npx' } } } }))
		write(root, claudeCode, JSON.stringify({ mcpServers: { linear: { command: 'bunx' } } }))

		const plan = planned(root)

		expect(row(plan, claudeCode, 'linear')?.detail).toContain('both sides changed')
	})

	it('holds back a server when no baseline can say which side moved', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "pnpx"\n')
		write(root, claudeCode, JSON.stringify({ mcpServers: { linear: { command: 'bunx' } } }))

		const plan = planned(root)

		expect(row(plan, claudeCode, 'linear')?.detail).toContain('no baseline says which side changed')
	})

	it('updates in place a field only the golden set changed', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "bunx"\nargs = ["-y", "linear-mcp"]\n')
		write(
			root,
			record,
			JSON.stringify({ targets: { [claudeCode]: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } } } }),
		)
		const source =
			'{\n  "mcpServers": {\n    "linear": { "command": "npx", "args": ["-y", "linear-mcp"] },\n    "other": { "command": "kept" }\n  }\n}'
		write(root, claudeCode, source)

		planned(root, { write: true })

		const next = read(root, claudeCode) as string
		const parsed = JSON.parse(next)
		expect(parsed.mcpServers.linear.command).toBe('bunx')
		// The entry for `linear` is free to reformat; everything around it — here `other`'s entry
		// verbatim — is not.
		expect(next).toContain('"other": { "command": "kept" }')
		expect(parsed.mcpServers.other).toEqual({ command: 'kept' })
	})

	it('updates a server in place in a shared settings file and keeps its comments', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
		write(root, record, JSON.stringify({ targets: { [gemini]: { linear: { command: 'npx' } } } }))
		const head =
			'{\n  // the instruction bridge\n  "context": { "fileName": ["AGENTS.md"] },\n  "mcpServers": {\n    "linear": '
		const tail = ', // linear\n    "other": { "command": "kept" }\n  }\n}\n'
		write(root, gemini, `${head}{ "command": "npx" }${tail}`)

		const plan = planned(root, { write: true })

		expect(row(plan, gemini, 'linear')).toMatchObject({ action: 'update', detail: 'replaces command' })
		const next = read(root, gemini) as string
		expect(next.startsWith(head)).toBe(true)
		expect(next.endsWith(tail)).toBe(true)
		expect(parseJsonWithComments(next)).toMatchObject({ mcpServers: { linear: { command: 'bunx' } } })
	})

	it('updates a server table in place in a Codex file, byte-preserving outside it', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "bunx"\nargs = ["-y", "linear-mcp"]\n')
		write(
			root,
			record,
			JSON.stringify({ targets: { [codex]: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } } } }),
		)
		const head = '# project settings\nmodel = "gpt" # pinned\n\n'
		const tail = '\n\n# the other one\n[mcp_servers.other]\ncommand = "kept"\n'
		write(root, codex, `${head}[mcp_servers.linear]\ncommand = "npx"\nargs = ["-y", "linear-mcp"]${tail}`)

		const plan = planned(root, { write: true })

		expect(row(plan, codex, 'linear')).toMatchObject({ action: 'update', detail: 'replaces command' })
		expect(read(root, codex)).toBe(
			`${head}[mcp_servers.linear]\ncommand = "bunx"\nargs = [ "-y", "linear-mcp" ]${tail}`,
		)
	})

	it('hands over a change to a Codex table holding a comment as an edit', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
		write(root, record, JSON.stringify({ targets: { [codex]: { linear: { command: 'npx' } } } }))
		const source = '[mcp_servers.linear]\ncommand = "npx" # pinned for now\n'
		write(root, codex, source)

		const plan = planned(root, { write: true })

		expect(row(plan, codex, 'linear')?.action).toBe('edit')
		const entry = plan.entries.find((entry) => entry.target === codex && entry.server === 'linear')
		expect(parseToml(entry?.entry as string)).toEqual({ mcp_servers: { linear: { command: 'bunx' } } })
		expect(read(root, codex)).toBe(source)
	})

	it('hands over a change to a Codex server written as an inline table as an edit', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
		write(root, record, JSON.stringify({ targets: { [codex]: { linear: { command: 'npx' } } } }))
		const source = '[mcp_servers]\nlinear = { command = "npx" }\n'
		write(root, codex, source)

		const plan = planned(root, { write: true })

		expect(row(plan, codex, 'linear')?.action).toBe('edit')
		expect(read(root, codex)).toBe(source)
	})

	it('hands over a change that would drop a comment as an edit', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "bunx"\n')
		write(root, record, JSON.stringify({ targets: { [claudeCode]: { linear: { command: 'npx' } } } }))
		const source = '{ "mcpServers": { "linear": { "command": "npx" /* keep */ } } }'
		write(root, claudeCode, source)

		const plan = planned(root, { write: true })

		expect(row(plan, claudeCode, 'linear')?.action).toBe('edit')
		expect(read(root, claudeCode)).toBe(source)
	})

	it('hands over an add it cannot place safely as an edit', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, '[]')

		const plan = planned(root, { write: true })

		expect(row(plan, claudeCode, 'linear')?.action).toBe('edit')
		const entry = plan.entries.find((entry) => entry.target === claudeCode && entry.server === 'linear')
		expect(entry?.action).toBe('edit')
		expect(read(root, claudeCode)).toBe('[]')
	})

	it('drops a field the target cannot hold rather than refusing', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ncommand = "npx"\ndescription = "the Linear server"\ntimeout = 30000\n')

		planned(root, { write: true })

		const written = JSON.parse(read(root, cursor) as string)
		expect(written.mcpServers.linear).not.toHaveProperty('description')
		expect(written.mcpServers.linear).not.toHaveProperty('timeout')

		const second = planned(root)
		expect(row(second, cursor, 'linear')).toBeUndefined()
	})

	it('writes a Claude Code entry with its transport and timeout', () => {
		const root = repository()
		write(root, golden, '[servers.linear]\ntransport = "http"\nurl = "https://mcp.example.com"\ntimeout = 5000\n')

		planned(root, { write: true })

		const written = JSON.parse(read(root, claudeCode) as string)
		expect(written.mcpServers.linear).toMatchObject({ type: 'http', timeout: 5000 })
	})

	it('writes a Cursor reference in its own syntax', () => {
		const root = repository()
		write(
			root,
			golden,
			`[servers.linear]\nurl = "https://mcp.example.com"\n\n[servers.linear.headers]\nAuthorization = "Bearer ${ref('TOKEN')}"\n`,
		)

		planned(root, { write: true })

		const written = JSON.parse(read(root, cursor) as string)
		expect(written.mcpServers.linear.headers.Authorization).toBe('Bearer $\u007benv:TOKEN\u007d')
	})

	it('writes Codex headers and variables through its named fields', () => {
		const root = repository()
		write(
			root,
			golden,
			[
				'[servers.linear]',
				'command = "npx"',
				'timeout = 30000',
				'',
				'[servers.linear.headers]',
				`Authorization = "Bearer ${ref('TOKEN')}"`,
				`X-Key = "${ref('KEY')}"`,
				'',
				'[servers.linear.env]',
				`HOME_DIR = "${ref('HOME_DIR')}"`,
				'',
			].join('\n'),
		)
		mkdirSync(join(root, '.codex'), { recursive: true })

		planned(root, { write: true })

		const written = parseToml(read(root, codex) as string) as {
			mcp_servers: { linear: Record<string, unknown> }
		}
		const linear = written.mcp_servers.linear
		expect(linear['bearer_token_env_var']).toBe('TOKEN')
		expect(linear['env_http_headers']).toEqual({ 'X-Key': 'KEY' })
		expect(linear['env_vars']).toEqual(['HOME_DIR'])
		expect(linear['tool_timeout_sec']).toBe(30)
	})

	it('writes a Gemini CLI remote server under the field its transport needs', () => {
		const root = repository()
		write(
			root,
			golden,
			[
				'[servers.streamable]',
				'transport = "http"',
				'url = "https://mcp.example.com/http"',
				'',
				'[servers.eventing]',
				'transport = "sse"',
				'url = "https://mcp.example.com/sse"',
				'',
			].join('\n'),
		)
		mkdirSync(join(root, '.gemini'), { recursive: true })

		planned(root, { write: true })

		const written = JSON.parse(read(root, gemini) as string)
		expect(written.mcpServers.streamable.httpUrl).toBe('https://mcp.example.com/http')
		expect(written.mcpServers.streamable).not.toHaveProperty('url')
		expect(written.mcpServers.eventing.url).toBe('https://mcp.example.com/sse')
		expect(written.mcpServers.eventing).not.toHaveProperty('httpUrl')
	})
})

describe('git-backed baselines', () => {
	it('reads the last-agreed value from git history when no record exists', () => {
		const root = gitRepository()
		write(root, golden, goldenLinear)
		write(root, claudeCode, JSON.stringify({ mcpServers: { linear: { command: 'npx', args: ['-y', 'linear-mcp'] } } }))
		commit(root, 'agree')
		write(root, claudeCode, JSON.stringify({ mcpServers: { linear: { command: 'bunx', args: ['-y', 'linear-mcp'] } } }))

		const plan = planned(root)

		expect(row(plan, claudeCode, 'linear')?.detail).toContain('the target changed')
	})

	it('hands over an add as an edit when the appended text would not parse', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		mkdirSync(join(root, '.codex'))
		const before = 'mcp_servers = { other = { command = "x" } }\n'
		write(root, codex, before)

		const plan = planned(root, { write: true })

		expect(row(plan, codex, 'linear')?.action).toBe('edit')
		expect(read(root, codex)).toBe(before)
	})

	it('hands over an add as an edit when the server would not read back', () => {
		const root = repository()
		write(root, golden, goldenLinear)
		const before = '{ "mcpServers": {}, "mcpServers": { "other": { "command": "x" } } }\n'
		write(root, claudeCode, before)

		const plan = planned(root, { write: true })

		expect(row(plan, claudeCode, 'linear')?.action).toBe('edit')
		expect(read(root, claudeCode)).toBe(before)
	})
})
