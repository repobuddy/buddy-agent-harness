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

## E-MCP-12 — Claude Code's per-entry field shape: `type`-gated transport, `${VAR}`/`${VAR:-default}` expansion, millisecond timeout

- **Date**: 2026-09-27
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs — https://code.claude.com/docs/en/mcp — vendor's own documentation,
  fetched 2026-09-27
- **Notes**: An `mcpServers` entry carries `type`, whose documented values are `stdio`, `http`
  (`streamable-http` accepted as an alias — *"the MCP specification uses the name
  `streamable-http` for this transport, so configurations copied from server documentation work
  without modification"*), `sse` (*"deprecated. Use HTTP servers instead, where available"*),
  `ws`, and `sdk` (in-process, SDK hosts only). `type` is required whenever `url` is present:
  *"A JSON entry that has a `url` but no `type` is a configuration error, because Claude Code
  reads an entry with no `type` as a stdio server"* — so `type` defaults to `stdio` only in the
  absence of `url`. Stdio fields: `command` (required), `args`, `env`, `cwd`. Remote fields:
  `url` (required), `headers`, `headersHelper` (a command that prints headers at connection
  time). Common optional fields: `timeout` (per-tool execution limit, **milliseconds**; "values
  below 1000 are ignored"), `alwaysLoad` (HTTP/SSE only, force startup connection), `description`,
  and an `oauth` object (`clientId`, `callbackPort`, `scopes`, `authServerMetadataUrl`). No
  top-level enable/disable field is documented; there is no MCP-specific auth-from-env-var field
  analogous to Codex's `bearer_token_env_var` — bearer tokens go directly in `headers` as an
  expanded `${VAR}` value. Expansion syntax `${VAR}` and `${VAR:-default}` is documented as
  supported in `command`, `args`, `env` (stdio) and `url`, `headers`, `headersHelper` (remote);
  expansion happens "before the server starts." The docs also warn that specific credential-shaped
  variable names (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `AWS_BEARER_TOKEN_BEDROCK`,
  `HTTPS_PROXY`, `NPM_TOKEN`, others) resolve to empty inside `url`/`headers` specifically to
  block credential leakage, so a custom variable name is the documented workaround.
- **Why it matters here**: this is the reference shape a forward converter into `.mcp.json` must
  produce and a reverse converter must parse — including the required-`type`-with-`url` rule,
  which is the one place an entry lacking `type` is silently misread rather than rejected.

## E-MCP-13 — Cursor's per-entry field shape: `type: "stdio"` documented, no equivalent field named for remote transport selection; `${env:VAR}` syntax; no timeout/enable/description fields found

- **Date**: 2026-09-27
- **Status**: confirmed for what is documented; **unverified** for transport-selection field on
  remote entries and for timeout/enable/description (absence from a fetched page is evidence of
  non-documentation, not proof the field does not exist)
- **Confidence**: medium
- **Source**: Cursor docs — https://cursor.com/docs/context/mcp — vendor's own documentation,
  fetched 2026-09-27
- **Notes**: Stdio entries: `command` (required), `type: "stdio"` (documented as required
  alongside `command`), `args`, `env`, `envFile` (path to an env file to load additional
  variables — a field none of the other three targets document). Remote entries: `url`
  (required), `headers` ("supports interpolation"), `auth` (an OAuth object with `CLIENT_ID`,
  `CLIENT_SECRET`, `scopes`). The page states Cursor "supports three transport methods" in a
  table but the fetch could not surface a documented field that selects among them for a remote
  entry, or confirm whether `type` takes values like `sse`/`http`/`streamable-http` there; treat
  transport selection for remote Cursor entries as **unverified** pending a closer read of that
  table. Variable interpolation is documented for `command`, `args`, `env`, `url`, `headers`, and
  `auth`, with syntax `${env:NAME}` (environment variables), plus non-env placeholders
  `${userHome}`, `${workspaceFolder}`, `${workspaceFolderBasename}`, `${pathSeparator}`/`${/}`.
  No `timeout`, enable/disable, or `description` field appears anywhere on the fetched page;
  recorded as **not found in this source**, not as "documented absent" (Cursor's docs do not
  state these fields don't exist, they simply aren't mentioned here).
- **Why it matters here**: `envFile` and the `${env:VAR}` spelling (vs. Claude Code's bare
  `${VAR}`) are both mapping hazards for a converter — a value carrying `${env:VAR}` cannot be
  copied verbatim into a Claude Code `${VAR}` field or vice versa without a syntax rewrite. The
  unresolved remote-transport-selection field and the unfound timeout/enable/description fields
  are gaps a reverse converter must treat as "may lose no data" only provisionally, pending
  confirmation.

## E-MCP-14 — Codex's `mcp_servers.<id>` table: transport is inferred from `command` vs. `url`, no SSE, second-based timeouts, explicit env-var-to-header/bearer-token fields, no `${VAR}` expansion documented

- **Date**: 2026-09-27
- **Status**: confirmed
- **Confidence**: high
- **Source**: OpenAI's Codex config reference — https://learn.chatgpt.com/docs/config-file/config-reference
  (reached via the documented redirect chain from https://developers.openai.com/codex/config-reference,
  itself linked from https://github.com/openai/codex/blob/main/docs/config.md, which as of
  2026-09-27 only points to the developers.openai.com pages rather than stating the fields
  in-repo) — vendor's own documentation, fetched 2026-09-27
- **Notes**: There is no `type` field. `mcp_servers.<id>.command` ("Launcher command for an MCP
  stdio server") and `mcp_servers.<id>.url` ("Endpoint for an MCP streamable HTTP server") are
  each documented on their own transport and are how Codex distinguishes stdio from remote — one
  table means one transport, selected by which of `command`/`url` is present. Stdio fields:
  `command`, `args`, `cwd`, `env` (map, "forwarded to the MCP stdio server"), `env_vars` (array or
  table, "additional environment variables to whitelist"). Remote (HTTP) fields: `url`,
  `bearer_token_env_var` ("environment variable sourcing the bearer token"), `http_headers`
  (static map), `env_http_headers` (map of header name to **environment variable name**, not an
  interpolation syntax inside a string value), `http_headers_helper` (a command printing a JSON
  header object), `auth` (`oauth` or `chatgpt`, "authentication fallback ... after configured
  bearer tokens and authorization headers"), plus an `oauth` sub-table (`client_id`,
  `callback_url`, `callback_port`), `scopes`, `oauth_resource`. Transport-agnostic fields:
  `startup_timeout_sec` (default 10s) with an alias `startup_timeout_ms` ("Alias for
  startup_timeout_sec in milliseconds"), `tool_timeout_sec` (default 60s), `enabled` (boolean,
  disables without deleting config — this is Codex's enable/disable field), `required` (boolean,
  fail startup if an enabled server can't initialize), `enabled_tools`/`disabled_tools`
  (allow/deny lists), `default_tools_approval_mode` and `tools.<tool>.approval_mode`
  (`auto`/`prompt`/`writes`/`approve`), `tools.<tool>.output_token_limit`, and
  `experimental_environment` (`local`/`remote`). No `description` field is documented. **SSE is
  not documented as a supported transport** — the reference names only "MCP stdio server" and
  "MCP streamable HTTP server"; this is a documented absence (the terms are used consistently and
  deliberately throughout, not merely missing from an example), so record SSE support for Codex
  as **documented not supported**, not unverified. No `${VAR}`-style expansion syntax is
  documented for values inside `env`, `args`, `url`, or header maps — `env_http_headers` supplies
  an environment variable's value into a header by naming the variable in a dedicated field, not
  by interpolating a token inside a string, and no evidence of runtime interpolation inside
  ordinary string fields was found.
- **Why it matters here**: Codex is the one target with no free-form `${VAR}` expansion syntax
  and no SSE support — both are hard converter constraints, not stylistic ones. A canonical entry
  carrying an `${VAR}` reference or an SSE transport has no direct Codex projection; the forward
  converter must either resolve/reject the `${VAR}` case and reject (or flag) the SSE case rather
  than emit an unsupported shape.

## E-MCP-15 — Gemini CLI's `mcpServers` entry: `url` (SSE) vs. `httpUrl` (streamable HTTP) as separate fields, POSIX-and-Windows env syntax, milliseconds default 600000, `trust`/`includeTools`/`excludeTools`

- **Date**: 2026-09-27
- **Status**: confirmed
- **Confidence**: high
- **Source**: gemini-cli docs —
  https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md — vendor's own
  documentation, fetched 2026-09-27 (same page as E-MCP-10, re-fetched for field-level detail)
- **Notes**: There is no single `type` field; transport is selected by which mutually-exclusive
  field is present: `command` (stdio), `url` (SSE transport), or `httpUrl` (streamable HTTP
  transport) — Gemini CLI is the only one of the four targets that names SSE and streamable HTTP
  as two distinct fields rather than two values of one field. Stdio-only fields: `args`, `cwd`.
  `env` is a map whose values documented as supporting `$VAR` and `${VAR}` (POSIX syntax, "on all
  platforms") and `%VAR%` (Windows syntax, Windows only) — no `${VAR:-default}` default-value
  form is documented, and no `${env:VAR}` form either. `headers` is a map for HTTP-transport
  servers. `timeout` (milliseconds; default 600000 = 10 minutes) is transport-agnostic. `trust`
  (boolean, default false, bypasses tool-confirmation prompts) is Gemini-specific. `includeTools`
  / `excludeTools` filter exposed tools, with `excludeTools` taking precedence. An OAuth-adjacent
  set (`authProviderType`, `targetAudience`, `targetServiceAccount`) supports service-account
  impersonation. No `description` field is documented. Enable/disable is **not** a config-file
  field: enablement state lives in a separate file, `~/.gemini/mcp-server-enablement.json`,
  toggled by the `/mcp disable` and `/mcp enable` commands rather than by editing
  `.gemini/settings.json` — a converter that only reads/writes `settings.json` cannot see or
  change this state.
- **Why it matters here**: the `url`/`httpUrl` split is the one transport-selection scheme
  incompatible with all three other targets' single-field approach, so a forward converter must
  map canonical "SSE" to `url` and canonical "streamable HTTP" to `httpUrl` specifically, never to
  a shared field. The enablement file outside `settings.json` means "disabled" has no in-file
  representation to round-trip for this target.

## E-MCP-16 — Environment-variable reference syntax differs across all four targets; none round-trips into another verbatim

- **Date**: 2026-09-27
- **Status**: confirmed (as a comparison of what each of E-MCP-12 through E-MCP-15 already
  documents; no new source)
- **Confidence**: high
- **Source**: same four vendor pages as E-MCP-12 through E-MCP-15
- **Notes**: Claude Code: `${VAR}`, `${VAR:-default}`, expands in `command`/`args`/`env` and
  `url`/`headers`/`headersHelper`, resolved before server start, with named credential variables
  forced empty in `url`/`headers`. Cursor: `${env:NAME}` for environment variables specifically
  (distinguishable from its own `${userHome}`/`${workspaceFolder}` placeholders, which are not
  environment variables), expands in `command`/`args`/`env`/`url`/`headers`/`auth`; no
  default-value form documented. Codex: no interpolation syntax documented in any string field;
  environment access instead goes through dedicated fields (`env`, `env_vars`,
  `env_http_headers`, `bearer_token_env_var`) that name a variable rather than embed a token in a
  value. Gemini CLI: `$VAR`/`${VAR}` (POSIX, cross-platform) and `%VAR%` (Windows-only), in `env`
  values; no default-value form and no `${env:VAR}` form documented for headers/url specifically
  (the page's examples show it only in `env`; whether it also expands in `url`/`headers` is
  **unverified**, not confirmed either way, from this fetch).
- **Why it matters here**: four different syntaxes for the same concept mean a reverse converter
  reading, say, a Claude Code `${VAR:-default}` value cannot copy it into a Cursor, Codex, or
  Gemini entry unverbatim — the default-value form has no target to receive it at all (only
  Claude Code documents it), and the token spelling itself (`${VAR}` vs `${env:VAR}` vs a
  named-field reference vs `%VAR%`) must be rewritten per target rather than passed through.

## E-MCP-17 — Cursor still names no field that selects SSE vs streamable HTTP for a remote server

- **Date**: 2026-09-27
- **Status**: confirmed (as documented absence on the vendor's page; unchanged from E-MCP-13)
- **Confidence**: medium
- **Source**: Cursor docs — https://cursor.com/docs/context/mcp — vendor's own documentation,
  re-fetched 2026-09-27 for this question alone (the `.md` variant returns 404); Cursor's
  changelog was not found to say otherwise
- **Notes**: The page's transport table reads, row by row: `stdio` — "Local", "shell command";
  `SSE` — "Local/Remote", "URL to an SSE endpoint"; `Streamable HTTP` — "Local/Remote", "URL to an
  HTTP endpoint". Its only remote-server example is `{"url": "http://localhost:3000/mcp",
  "headers": {"API_KEY": "value"}}`, with no `type`. No field, value, or auto-detection rule is
  stated for choosing between the two remote transports. The only documented `type` value is
  `"stdio"`.
- **Why it matters here**: the Cursor dialect keeps writing a remote server with `url` alone and
  keeps leaving transport out of the comparison. Writing an undocumented `type: "sse"` or
  `type: "http"` would be a guess. Absence from the vendor page is not proof that no such field
  exists, so this is the fact to re-check if Cursor publishes a config schema.

## E-MCP-18 — Gemini CLI expands `$VAR`, `${VAR}`, and `${VAR:-default}` in every string of its settings file, not only in `env`

- **Date**: 2026-09-27
- **Status**: confirmed (documented, and matched in source)
- **Confidence**: high
- **Source**: gemini-cli configuration reference —
  https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md —
  vendor's own documentation; gemini-cli source at commit
  `2fe7c2d3f065dc40ad573d50b2091116f8a4aa18` (2026-09-25):
  `packages/cli/src/config/settings.ts` (`load`), `packages/cli/src/utils/envVarResolver.ts`,
  `packages/core/src/tools/mcp-client.ts` — primary
- **Notes**: The configuration reference states: *"String values within your `settings.json` and
  `gemini-extension.json` files can reference environment variables using `$VAR_NAME`,
  `${VAR_NAME}`, or `${VAR_NAME:-DEFAULT_VALUE}` syntax. These variables will be automatically
  resolved when the settings are loaded."* The source matches: `load()` passes the whole parsed
  file through `resolveEnvVarsInObject` before validation, and that function recurses into every
  string, array, and object. `load()` is called for the user file and for the workspace file
  (`.gemini/settings.json`), so `mcpServers.*.url`, `httpUrl`, `headers`, `command`, and `args`
  are all expanded. A variable that is unset and has no default is left as the literal
  placeholder. The MCP client then expands `headers` and `env` a second time at connection time
  (`expandEnvVars`, via `dotenv-expand`) against a sanitized environment. The MCP server page
  (E-MCP-15) documents expansion only under `env`; that page is narrower than the product, not
  in conflict with it.
- **Why it matters here**: this supersedes the "unverified" note in E-MCP-16 for Gemini CLI. A
  golden-set reference, with or without a default, can be written into Gemini CLI as written in
  any field, so the dialect no longer refuses one.

## E-MCP-19 — Copilot CLI now reads project-scope MCP servers from `.mcp.json` and `.github/mcp.json`

- **Date**: 2026-09-27
- **Status**: confirmed
- **Confidence**: high
- **Source**: GitHub Docs —
  https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers —
  primary, re-fetched 2026-09-27 (same page as E-MCP-11)
- **Notes**: Under "Adding per-repository MCP servers": *"Copilot CLI looks for project-level
  configuration in the following locations"* — `.mcp.json` *"(in any directory from your working
  directory up to the repository root)"*, and `.github/mcp.json`, *"Shared configuration that is
  committed to the repository"*. *"If both `.mcp.json` and `.github/mcp.json` exist in the same
  directory, `.mcp.json` takes precedence"*, and *"Project-level definitions also take precedence
  over those in `~/.copilot/mcp-config.json`."* Project files accept either the `mcpServers`
  object or a bare top-level map of server names. They load only after folder trust is confirmed.
  Entry `type` values documented on the same page are `local`/`stdio`, `http`, and `sse`, with
  `tools` and a millisecond `timeout`. No environment-variable expansion syntax for project files
  is documented on this page. The date the feature landed was not established from a primary
  source.
- **Why it matters here**: this supersedes E-MCP-11. Copilot CLI's absence from the registry is no
  longer a documented absence. Adding it is a design decision rather than a lookup: its
  higher-precedence file is `.mcp.json`, which is Claude Code's projection target, so Copilot CLI
  already reads whatever is projected for Claude Code, and a `.github/mcp.json` entry of the same
  name would be shadowed by it.

## E-MCP-20 — SEP-2633 is still an open draft, and discussion #2218 was closed without an answer; neither states a location

- **Date**: 2026-09-27
- **Status**: confirmed
- **Confidence**: high
- **Source**: SEP-2633 —
  https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2633; discussion #2218 —
  https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/2218 — primary, read
  through the GitHub API on 2026-09-27
- **Notes**: SEP-2633: `state: OPEN`, `isDraft: true`, `mergedAt: null`, last updated
  2026-07-28. Discussion #2218: closed, `stateReason: OUTDATED`, no accepted answer; a maintainer
  closed it because Discussions in that repository are now limited to meeting notes, and a
  comment points to issue #2219 for tracking. Issue #2219, "RFC: Standardize MCP Configuration
  File Schema Across Tools", is itself closed (last updated 2026-02-06); it tabulates each tool's
  existing path and proposes no new one. None of the three states a directory convention.
- **Why it matters here**: the watch trigger in the conclusion, a ratified proposal with a stated
  location, has not fired. `.agents/buddy-agent-harness/mcp.toml` stands, and SEP-2633 is the one
  proposal still open.
