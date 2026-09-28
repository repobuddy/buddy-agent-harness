import { parse as parseToml } from 'smol-toml'
import { describe, expect, it } from 'vitest'
import { appendTomlTable, renderTomlTable, replaceTomlTable } from './toml-edit.ts'

const path = ['mcp_servers', 'a']

function edited(source: string, value: Record<string, unknown>, at = path): string {
	const edit = replaceTomlTable(source, at, value)
	if (edit.kind !== 'edited') throw new Error(`expected an edit, got ${edit.reason}`)
	return edit.text
}

describe('renderTomlTable', () => {
	it('renders the table under its full path, without a header for the parents', () => {
		expect(renderTomlTable(path, { command: 'npx' })).toBe('[mcp_servers.a]\ncommand = "npx"\n')
	})
})

describe('appendTomlTable', () => {
	it('appends after a blank line, keeping the source as it is', () => {
		expect(appendTomlTable('model = "gpt"\n', path, { command: 'npx' })).toBe(
			'model = "gpt"\n\n[mcp_servers.a]\ncommand = "npx"\n',
		)
	})
})

describe('replaceTomlTable', () => {
	it('replaces the table in place, keeping every byte around it, comments included', () => {
		const head = 'model = "gpt" # the model\n\n# servers\n'
		const tail = '\n\n# about b\n[mcp_servers.b]\nurl = "https://example.com"\n'
		const source = `${head}[mcp_servers.a]\ncommand = "npx"\nargs = ["-y"]${tail}`

		expect(edited(source, { command: 'bunx' })).toBe(`${head}[mcp_servers.a]\ncommand = "bunx"${tail}`)
	})

	it('replaces the sub-tables with the table, wherever they sit', () => {
		const source = [
			'[mcp_servers.a]',
			'command = "npx"',
			'',
			'[mcp_servers.b]',
			'url = "https://example.com"',
			'',
			'[mcp_servers.a.env]',
			'KEY = "old"',
			'',
			'[profiles.x]',
			'model = "gpt"',
			'',
		].join('\n')

		expect(edited(source, { command: 'bunx', env: { KEY: 'new' } })).toBe(
			[
				'[mcp_servers.a]',
				'command = "bunx"',
				'',
				'[mcp_servers.a.env]',
				'KEY = "new"',
				'',
				'[mcp_servers.b]',
				'url = "https://example.com"',
				'',
				'[profiles.x]',
				'model = "gpt"',
				'',
			].join('\n'),
		)
	})

	it('removes a sub-table at the end of the file', () => {
		const source = '[mcp_servers.a]\ncommand = "npx"\n\n[mcp_servers.a.env]\nKEY = "old"'

		expect(parseToml(edited(source, { command: 'bunx' }))).toEqual({ mcp_servers: { a: { command: 'bunx' } } })
	})

	it('removes a sub-table packed between others without a blank line', () => {
		const source =
			'[mcp_servers.a]\ncommand = "npx"\n[mcp_servers.b]\ncommand = "x"\n[mcp_servers.a.env]\nKEY = "old"\n[profiles.x]\nmodel = "gpt"\n'

		expect(edited(source, { command: 'bunx' })).toBe(
			'[mcp_servers.a]\ncommand = "bunx"\n[mcp_servers.b]\ncommand = "x"\n[profiles.x]\nmodel = "gpt"\n',
		)
	})

	it('finds a table whose name is quoted', () => {
		const source = '[mcp_servers."my server"]\ncommand = "npx"\n'

		expect(parseToml(edited(source, { command: 'bunx' }, ['mcp_servers', 'my server']))).toEqual({
			mcp_servers: { 'my server': { command: 'bunx' } },
		})
	})

	it('keeps a header-like line inside a multi-line string elsewhere', () => {
		const source = 'note = """\n[mcp_servers.a]\n"""\n\n[mcp_servers.a]\ncommand = "npx"\n'

		expect(edited(source, { command: 'bunx' })).toBe(
			'note = """\n[mcp_servers.a]\n"""\n\n[mcp_servers.a]\ncommand = "bunx"\n',
		)
	})

	it('refuses a table holding a comment', () => {
		const source = '[mcp_servers.a]\ncommand = "npx" # pinned\n'

		expect(replaceTomlTable(source, path, { command: 'bunx' })).toEqual({ kind: 'refused', reason: 'comment' })
	})

	it('refuses a sub-table holding a comment', () => {
		const source = '[mcp_servers.a]\ncommand = "npx"\n\n[mcp_servers.a.env]\n# rotated monthly\nKEY = "old"\n'

		expect(replaceTomlTable(source, path, { command: 'bunx' })).toEqual({ kind: 'refused', reason: 'comment' })
	})

	it('reports a table that is not there as absent', () => {
		expect(replaceTomlTable('[mcp_servers.b]\ncommand = "npx"\n', path, {})).toEqual({
			kind: 'refused',
			reason: 'absent',
		})
	})

	it('refuses a source that does not parse', () => {
		expect(replaceTomlTable('[mcp_servers.a', path, {})).toEqual({ kind: 'refused', reason: 'unreadable' })
	})

	it.each([
		['an inline table under the parent', '[mcp_servers]\na = { command = "npx" }\n'],
		['dotted keys under the parent', '[mcp_servers]\na.command = "npx"\n'],
		['quoted dotted keys under the parent', '[mcp_servers]\n"a".command = "npx"\n'],
		['an inline table at the root', 'mcp_servers = { a = { command = "npx" } }\n'],
		['a header implied only by a sub-table', '[mcp_servers.a.env]\nKEY = "v"\n'],
		['an array of tables inside it', '[mcp_servers.a]\ncommand = "npx"\n\n[[mcp_servers.a.tools]]\nname = "x"\n'],
	])('refuses %s as shape', (_, source) => {
		expect(replaceTomlTable(source, path, { command: 'bunx' })).toEqual({ kind: 'refused', reason: 'shape' })
	})
})
