/**
 * Where one harness keeps its MCP servers at project scope, as its vendor documents it. A harness
 * with no entry is never read or written: Devin Desktop documents no project-scope file, and Copilot
 * CLI's (E-MCP-19, `.research/mcp-canonical-location/`) is not chosen yet.
 */
import type { McpDialectName } from '../mcp-dialects/mcp-dialects.ts'

export type McpConfig = {
	/** Repository-relative path of the file, as the vendor documents it. */
	path: string
	/** Differs per host; the wrong key reads as an unconfigured repository. */
	key: string
	format: 'json' | 'toml'
	/** Which harness's entry shape the file holds; the same key can hold different fields. */
	dialect: McpDialectName
	/** The file holds more than MCP configuration: touch only `key`, never rewrite it wholesale. */
	shared?: true
}
