import { describe, expect, it } from 'vitest'
import { locatorText } from './locator.ts'

const golden = '.agents/buddy-agent-harness/mcp.toml'
const cursor = '.cursor/mcp.json'

describe('locatorText', () => {
	it('names the file alone for a finding about a whole file', () => {
		expect(locatorText({ file: cursor })).toBe(cursor)
	})

	it('names the server inside the file', () => {
		expect(locatorText({ file: cursor, server: 'linear' })).toBe(`${cursor}#servers.linear`)
	})

	it('names the field inside the server', () => {
		expect(locatorText({ file: cursor, server: 'linear', field: 'command' })).toBe(`${cursor}#servers.linear.command`)
	})

	// The dotted name is the case a locator cannot be split back apart on: `io.github.foo.command`
	// has no separator that says where the server ends. Rendering is one-way for that reason.
	it('names a dotted server without escaping or eliding any of it', () => {
		expect(locatorText({ file: cursor, server: 'io.github.foo', field: 'command' })).toBe(
			`${cursor}#servers.io.github.foo.command`,
		)
	})

	it('names the line and column when a parser gave them', () => {
		expect(locatorText({ file: golden, position: { line: 2, column: 9 } })).toBe(`${golden}#L2:9`)
	})
})
