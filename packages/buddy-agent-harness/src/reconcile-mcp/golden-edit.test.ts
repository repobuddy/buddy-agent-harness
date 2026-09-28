import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'
import { appendGoldenServer, setGoldenField, tomlValue } from './golden-edit.ts'

const golden = `# Servers this repository uses.

# Linear: the team's tracker.
[servers.linear]
command = "npx" # pinned by the lockfile
args = ["-y", "linear-mcp"]

# Docs lookup.
[servers."io.github.docs"]
url = "https://docs.example"
`

describe('tomlValue', () => {
	it('renders a map inline, quoting a name that is not bare', () => {
		expect(tomlValue({ A: '1', 'x.y': '2' })).toBe('{ A = "1", "x.y" = "2" }')
	})

	it('renders scalars and arrays as TOML', () => {
		expect(tomlValue(['-y', 'a'])).toBe('[ "-y", "a" ]')
		expect(tomlValue(3000)).toBe('3000')
		expect(tomlValue(true)).toBe('true')
	})
})

describe('setGoldenField', () => {
	it('replaces a value and keeps every comment, including the one on its line', () => {
		const next = setGoldenField(golden, 'linear', 'command', 'bunx') as string

		expect(next).toBe(golden.replace('command = "npx"', 'command = "bunx"'))
	})

	it('finds a field whose key is quoted', () => {
		expect(setGoldenField('[servers.a]\n"url" = "u"\n', 'a', 'url', 'v')).toBe('[servers.a]\n"url" = "v"\n')
	})

	it('adds a field after the last one in the server table', () => {
		const next = setGoldenField(golden, 'io.github.docs', 'timeout', 3000) as string

		expect(next).toBe(`${golden.trimEnd()}\ntimeout = 3000\n`)
	})

	it('adds a field right after the header of an empty table', () => {
		const next = setGoldenField('[servers.a]\n[servers.b]\n', 'a', 'command', 'x')

		expect(next).toBe('[servers.a]\ncommand = "x"\n[servers.b]\n')
	})

	it('removes a field on a line of its own, with its trailing comment', () => {
		const next = setGoldenField(golden, 'linear', 'command', undefined) as string

		expect(next).toBe(golden.replace('command = "npx" # pinned by the lockfile\n', ''))
	})

	it('removes a field on the last line of a file without a trailing newline', () => {
		expect(setGoldenField('[servers.a]\nurl = "u"', 'a', 'url', undefined)).toBe('[servers.a]\n')
	})

	it('changes nothing when asked to remove a field that is not there', () => {
		expect(setGoldenField(golden, 'linear', 'timeout', undefined)).toBe(golden)
	})

	it('hands over a server not written as its own table', () => {
		expect(setGoldenField('[servers]\na = { url = "u" }\n', 'a', 'url', 'v')).toBeUndefined()
		expect(setGoldenField(golden, 'absent', 'url', 'v')).toBeUndefined()
	})

	it('hands over a field spread over a sub-table or dotted keys', () => {
		expect(setGoldenField('[servers.a]\nurl = "u"\n[servers.a.env]\nA = "1"\n', 'a', 'env', { A: '2' })).toBeUndefined()
		expect(setGoldenField('[servers.a]\nenv.A = "1"\n', 'a', 'env', { A: '2' })).toBeUndefined()
	})

	it('writes a map inline so it reads back as the same value', () => {
		const next = setGoldenField(golden, 'linear', 'env', { TEAM: 'core' }) as string

		expect(parseToml(next)).toMatchObject({ servers: { linear: { env: { TEAM: 'core' } } } })
	})
})

describe('appendGoldenServer', () => {
	it('appends a table after the file, separated by a blank line, quoting a dotted name', () => {
		const next = appendGoldenServer(golden, 'io.x', { command: 'npx', env: { A: '1' } })

		expect(next).toBe(`${golden}\n[servers."io.x"]\ncommand = "npx"\nenv = { A = "1" }\n`)
	})

	it('adds a line break before the table when the file ends without one', () => {
		expect(appendGoldenServer('# x', 'a', { url: 'u' })).toBe('# x\n\n[servers.a]\nurl = "u"\n')
	})

	it('writes the table alone into an empty file', () => {
		expect(appendGoldenServer('', 'a', { url: 'u' })).toBe('[servers.a]\nurl = "u"\n')
	})
})
