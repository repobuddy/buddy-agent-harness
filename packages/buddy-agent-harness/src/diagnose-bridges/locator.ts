/**
 * Where a finding is, in parts.
 *
 * A locator addresses a place inside a file — `.cursor/mcp.json#servers.linear.command` — because a
 * file holding twenty servers is not an address. The parts are known wherever a finding is raised,
 * and only the report and the repairs need the string, so the parts are what travel and this module
 * is the one place they become one. Nothing ever recovers a part by splitting a locator back apart:
 * a server may be named `io.github.foo`, and no split of the rendered string tells where the server
 * name ends and the field begins.
 */

/**
 * Where a malformed file failed. **Position only.** A parser's own error message quotes the
 * offending line back, and in a file of MCP configuration that line is exactly the one holding a
 * credential — so neither the message nor the code block it carries is ever read. Line and column
 * are enough to fix the file and carry nothing out of it.
 */
export type Position = { line: number; column: number }

export type Locator = {
	/** Repository-relative path of the file the finding is about. */
	file: string
	/** The MCP server inside that file, when the finding is about one. */
	server?: string
	/** The field inside that server, dotted for the per-name fields — `command`, `env.LINEAR_TOKEN`. */
	field?: string
	/** Where a file that does not parse failed, when the parser gave a position. */
	position?: Position | undefined
}

/** The locator as one string: the finding's `path`, and what a repair names. */
export function locatorText({ file, server, field, position }: Locator): string {
	if (position) return `${file}#L${position.line}:${position.column}`
	if (server === undefined) return file
	return `${file}#servers.${server}${field === undefined ? '' : `.${field}`}`
}
