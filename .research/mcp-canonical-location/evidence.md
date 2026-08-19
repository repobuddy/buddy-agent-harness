# Evidence — Where MCP Configuration Lives

Status values: `confirmed`, `contested`, `thin`. Confidence: high / medium / low.

The `E-MCP-NN` series continues from `.research/agentic-configuration-standards/evidence.md`,
which holds E-MCP-01 through E-MCP-05. Same subject, same numbering.

## E-MCP-06 — The MCP specification does not say where configuration lives

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: Model Context Protocol specification —
  https://modelcontextprotocol.io/specification/2025-06-18/basic — primary
- **Notes**: The specification covers the JSON-RPC message shapes, the lifecycle, authorization,
  and the schema of the wire protocol. It names no client configuration file, no filename, and no
  directory. There is nothing to quote because the subject is absent: the specification is scoped
  to how a client and a server talk, not to how a host stores which servers to start.
- **Why it matters here**: the de jure answer is that there is no answer. A location chosen by
  this project cannot contradict a standard that does not address the question.

## E-MCP-07 — Proposals to standardize the config format are open and unratified, and none of them fixes a location

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: SEP-2633, "Standard Client-Side Configuration Format – mcp.json" —
  https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2633 (draft, marked
  2026-04-22); issue #292, "Define a Standard MCP Configuration Schema" —
  https://github.com/modelcontextprotocol/modelcontextprotocol/issues/292; discussion #2218,
  "Proposal: Universal MCP Configuration File Standard" —
  https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2218 — primary
- **Notes**: All three are live and none is accepted. SEP-2633 proposes a **schema** for a file
  named `mcp.json` and explicitly leaves directory placement out; a maintainer argued it belongs
  in an Extension rather than in the core specification, and its open questions include the one
  that matters most for a converter — whether the top-level key is `mcpServers` or `servers`.
  Issue #292 documents the fragmentation without proposing a canonical home.
- **Why it matters here**: the standards track is working on the *shape* of the file, not on
  where it sits. Even if SEP-2633 lands, it would not by itself claim a path.

## E-MCP-08 — What is converging in practice is `<repo-root>/.mcp.json`, and it is already claimed

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: Visual Studio —
  https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers?view=visualstudio (page updated
  2026-07-30); Claude Code — https://code.claude.com/docs/en/mcp — both primary vendor
  documentation
- **Notes**: Visual Studio documents reading MCP configuration from five locations in order:
  `%USERPROFILE%\.mcp.json`, `<SOLUTIONDIR>\.vs\mcp.json`, `<SOLUTIONDIR>\.mcp.json`,
  `<SOLUTIONDIR>\.vscode\mcp.json`, and `<SOLUTIONDIR>\.cursor\mcp.json` — naming two rival
  vendors' paths outright. Claude Code documents `.mcp.json` at the project root as its
  project-scope file, "shared with everyone in the project".
- **Why it matters here**: one vendor reading another's filename by name is the strongest de facto
  convergence available, and it converges on `.mcp.json` at the repository root — a path already
  holding Claude Code's own project config in Claude Code's own shape. It is therefore not
  available to a superset file, which settles the question in the opposite direction from the one
  that would have forced a rename.

## E-MCP-09 — The only proposal that puts MCP config under `.agents/` is unaffiliated

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: medium
- **Source**: "the .agents Protocol" — https://dotagentsprotocol.com/ (marked DRAFT, 2026-02-24),
  repository `github.com/aj47/dotagentsprotocol-website`
- **Notes**: A single-author draft proposing `mcp.json` directly under `.agents/` at both
  `~/.agents/` and `./.agents/`. Its own page lists Anthropic, OpenAI, and Zed as existing
  stewards being converged rather than as endorsers, and no vendor adoption was found.
  Confidence is medium on significance, not on existence: the draft plainly exists, but nothing
  establishes that anyone reads it.
- **Why it matters here**: it is corroboration for the namespacing decision rather than a
  competitor. The one concrete outside proposal for an `.agents/`-rooted MCP file wants exactly
  `.agents/mcp.json`, which is the path this project declined to take.

## E-MCP-10 — Gemini CLI reads MCP servers from `.gemini/settings.json` at project scope

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: gemini-cli docs —
  https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md — vendor's own
  documentation
- **Notes**: *"Based on the scope (`-s, --scope`), it will be added to either the user config
  `~/.gemini/settings.json` or the project config `.gemini/settings.json` file."* The key is
  `mcpServers` at both scopes.
- **Why it matters here**: this is the same file the instruction bridge already targets
  (E-GEM-01), so one harness's settings file now carries two unrelated concerns. Anything reading
  it for MCP must not assume the file is about MCP.

## E-MCP-11 — Copilot CLI has no documented project-scope MCP file

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: GitHub Docs —
  https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers —
  primary, already recorded as part of E-MCP-02
- **Notes**: Copilot CLI reads `mcpServers` from `~/.copilot/mcp-config.json`, relocatable with
  `COPILOT_HOME`, and the page states directly that `.vscode/mcp.json` "is not read by Copilot
  CLI. It uses the unsupported top-level key `servers`." A community report of a migration to a
  project-scope `.mcp.json` or `.github/mcp.json` could not be confirmed against a reachable
  primary source and is **not** recorded as established.
- **Why it matters here**: Copilot CLI is a supported harness with no project-scope MCP target,
  so it takes no MCP entry in the registry. That is a documented absence, not an omission, and
  the unverified migration report is the thing to re-check before it changes.
