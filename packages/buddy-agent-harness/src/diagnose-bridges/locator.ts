/**
 * Position only: a parser's own error message quotes the offending line, and in MCP configuration
 * that line holds a credential.
 */
export type Position = { line: number; column: number }

/**
 * Never recover a part by splitting a locator's rendered string back apart — no separator survives
 * a server named `io.github.foo`.
 */
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
