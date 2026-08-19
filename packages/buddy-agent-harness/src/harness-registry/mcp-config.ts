/**
 * Where one harness keeps its MCP server configuration at one scope, as that harness's own vendor
 * documents it.
 *
 * Recorded per scope like everything else in a `HarnessScope`, and populated at **project** scope
 * only. Much of the world's MCP configuration lives at user scope — `~/.codex/config.toml`,
 * `~/.claude.json`, `claude_desktop_config.json` — and the registry records user scope as
 * described and diagnosable, never written. Reading a user's home directory into output that
 * lands in every session's transcript is a wider blast radius than diagnosis needs, so those paths
 * stay out until something needs them.
 *
 * A harness with no documented project-scope MCP file gets no entry. Copilot CLI is the case that
 * matters: its own documentation states that `.vscode/mcp.json` "is not read by Copilot CLI", and
 * names `~/.copilot/mcp-config.json` instead. That is a documented absence, not a gap — see
 * `.research/mcp-canonical-location/` (E-MCP-11).
 */
export type McpConfig = {
	/** Repository-relative path of the file, as the vendor documents it. */
	path: string
	/**
	 * The key the servers sit under. Not one key across hosts: `mcpServers` for Claude Code, Cursor,
	 * and Gemini CLI, `mcp_servers` for Codex, `servers` for VS Code. Reading the wrong one finds
	 * nothing and reports a repository as unconfigured.
	 */
	key: string
	/**
	 * How the file is serialized. It decides the parser, and it is also why comparison is semantic:
	 * the same server in TOML and in JSON shares no bytes.
	 */
	format: 'json' | 'toml'
	/**
	 * Set when the file holds far more than MCP configuration. `.gemini/settings.json` also carries
	 * the instruction bridge, so anything reading it must take its key and leave the rest alone —
	 * and anything writing it must never rewrite the file wholesale.
	 */
	shared?: true
}
