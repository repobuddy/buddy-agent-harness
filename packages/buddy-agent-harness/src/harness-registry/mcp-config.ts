/**
 * Where one harness keeps its MCP servers at project scope, as its vendor documents it. A harness
 * with no documented project-scope file gets no entry (E-MCP-11, `.research/mcp-canonical-location/`).
 */
export type McpConfig = {
	/** Repository-relative path of the file, as the vendor documents it. */
	path: string
	/** Differs per host; the wrong key reads as an unconfigured repository. */
	key: string
	format: 'json' | 'toml'
	/** The file holds more than MCP configuration: touch only `key`, never rewrite it wholesale. */
	shared?: true
}
