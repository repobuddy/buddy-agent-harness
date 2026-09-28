import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'
import type { ConfigEdit } from './config-edit.ts'
import { appendInlineTomlTable, renderTomlInline, setTomlKey } from './toml-edit.ts'

const golden = `# Servers this repository uses.

# Linear: the team's tracker.
[servers.linear]
command = "npx" # pinned by the lockfile
args = ["-y", "linear-mcp"]

# Docs lookup.
[servers."io.github.docs"]
url = "https://docs.example"
`

/** The edited text, or the refusal's reason for a test to assert on. */
function text(edit: ConfigEdit): string {
	return edit.kind === 'edited' ? edit.text : `refused: ${edit.reason}`
}

describe('renderTomlInline', () => {
	it('renders a map inline, quoting a name that is not bare', () => {
		expect(renderTomlInline({ A: '1', 'x.y': '2' })).toBe('{ A = "1", "x.y" = "2" }')
	})

	it('renders scalars and arrays as TOML', () => {
		expect(renderTomlInline(['-y', 'a'])).toBe('[ "-y", "a" ]')
		expect(renderTomlInline(3000)).toBe('3000')
		expect(renderTomlInline(true)).toBe('true')
	})
})

describe('setTomlKey', () => {
	it('replaces a value and keeps every comment, including the one on its line', () => {
		const next = text(setTomlKey(golden, ['servers', 'linear'], 'command', 'bunx'))

		expect(next).toBe(golden.replace('command = "npx"', 'command = "bunx"'))
	})

	it('finds a field whose key is quoted', () => {
		expect(text(setTomlKey('[servers.a]\n"url" = "u"\n', ['servers', 'a'], 'url', 'v'))).toBe(
			'[servers.a]\n"url" = "v"\n',
		)
	})

	it('adds a field after the last one in the server table', () => {
		const next = text(setTomlKey(golden, ['servers', 'io.github.docs'], 'timeout', 3000))

		expect(next).toBe(`${golden.trimEnd()}\ntimeout = 3000\n`)
	})

	it('adds a field right after the header of an empty table', () => {
		const next = text(setTomlKey('[servers.a]\n[servers.b]\n', ['servers', 'a'], 'command', 'x'))

		expect(next).toBe('[servers.a]\ncommand = "x"\n[servers.b]\n')
	})

	it('removes a field on a line of its own, with its trailing comment', () => {
		const next = text(setTomlKey(golden, ['servers', 'linear'], 'command', undefined))

		expect(next).toBe(golden.replace('command = "npx" # pinned by the lockfile\n', ''))
	})

	it('removes a field on the last line of a file without a trailing newline', () => {
		expect(text(setTomlKey('[servers.a]\nurl = "u"', ['servers', 'a'], 'url', undefined))).toBe('[servers.a]\n')
	})

	it('changes nothing when asked to remove a field that is not there', () => {
		expect(text(setTomlKey(golden, ['servers', 'linear'], 'timeout', undefined))).toBe(golden)
	})

	it('hands over a server not written as its own table', () => {
		expect(text(setTomlKey('[servers]\na = { url = "u" }\n', ['servers', 'a'], 'url', 'v'))).toBe('refused: absent')
		expect(text(setTomlKey(golden, ['servers', 'absent'], 'url', 'v'))).toBe('refused: absent')
	})

	it('hands over a field spread over a sub-table or dotted keys', () => {
		expect(
			text(setTomlKey('[servers.a]\nurl = "u"\n[servers.a.env]\nA = "1"\n', ['servers', 'a'], 'env', { A: '2' })),
		).toBe('refused: shape')
		expect(text(setTomlKey('[servers.a]\nenv.A = "1"\n', ['servers', 'a'], 'env', { A: '2' }))).toBe('refused: shape')
	})

	it('refuses a source that does not parse', () => {
		expect(text(setTomlKey('[servers.a', ['servers', 'a'], 'url', 'v'))).toBe('refused: unreadable')
	})

	it('writes a map inline so it reads back as the same value', () => {
		const next = text(setTomlKey(golden, ['servers', 'linear'], 'env', { TEAM: 'core' }))

		expect(parseToml(next)).toMatchObject({ servers: { linear: { env: { TEAM: 'core' } } } })
	})
})

describe('appendInlineTomlTable', () => {
	it('appends a table after the file, separated by a blank line, quoting a dotted name', () => {
		const next = appendInlineTomlTable(golden, ['servers', 'io.x'], { command: 'npx', env: { A: '1' } })

		expect(next).toBe(`${golden}\n[servers."io.x"]\ncommand = "npx"\nenv = { A = "1" }\n`)
	})

	it('adds a line break before the table when the file ends without one', () => {
		expect(appendInlineTomlTable('# x', ['servers', 'a'], { url: 'u' })).toBe('# x\n\n[servers.a]\nurl = "u"\n')
	})

	it('starts an empty file with the same blank line as appendTomlTable', () => {
		expect(appendInlineTomlTable('', ['servers', 'a'], { url: 'u' })).toBe('\n[servers.a]\nurl = "u"\n')
	})
})
