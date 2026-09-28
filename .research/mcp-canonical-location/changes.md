# Changes Forced by This Research

## The golden set keeps the filename issue #54 proposed

E-MCP-06 through E-MCP-09 settle the open question the issue flagged: no standard names a location,
and the filename converging in practice (`<repo-root>/.mcp.json`) is already Claude Code's. The
golden set is written at `.agents/buddy-agent-harness/mcp.toml` as proposed. No rename.

## The harness registry gains primary-sourced project-scope MCP targets

E-MCP-10 supplies the Gemini CLI project-scope path and key, which no prior entry recorded.
E-MCP-11 records that Copilot CLI has no documented project-scope MCP file, so its absence from the
registry is a finding rather than a gap.

## Field-level groundwork for the MCP converters

E-MCP-12 through E-MCP-16 record, per harness, the primary-sourced field names, transport-
selection mechanism, environment-variable reference syntax, timeout units, and enable/disable/
description fields needed before a forward or reverse MCP converter can be written. The two
sharpest constraints they surface: Codex documents no `${VAR}`-style expansion syntax in any
string field and no SSE transport (E-MCP-14), and Gemini CLI splits SSE and streamable HTTP into
two separate fields, `url` and `httpUrl`, rather than one field with two values (E-MCP-15). Every
other target uses a single field (or, for Cursor's remote entries, an unconfirmed one — see
E-MCP-13) to select transport. E-MCP-16 collects the four environment-variable syntaxes side by
side; none is a superset of another, so no field can be copied verbatim between any two targets
without a syntax rewrite.

## No published claim moved

The site's standing claim is that `init` reports MCP configuration rather than converting it,
because conversion would have to invent values the user did not write. Nothing here contradicts it,
and this change converts nothing: it reads a golden set the user authored and reports drift. The
claim is narrowed by a later change only if something starts writing. Per `CONTRIBUTING.md`, that
makes this an expansion rather than a correction, and it takes no Corrections entry.

## Gemini CLI takes a reference in any field

E-MCP-18 confirms that Gemini CLI expands `$VAR`, `${VAR}`, and `${VAR:-default}` in every string
of `.gemini/settings.json`, not only in `env`. The Gemini CLI dialect stops refusing a reference in
`url`, `headers`, `command`, or `args`, and stops refusing the default form in `env`. A remote
server with `Authorization = "Bearer ${TOKEN}"` is now written for Gemini CLI as it stands. The
site's claim that Gemini CLI expands only inside `env` was wrong and takes a Corrections entry.

## Cursor's remote transport stays out of the comparison

E-MCP-17 re-checks E-MCP-13 and finds no documented field. The Cursor dialect is unchanged.

## Copilot CLI has a project-scope file, and it is not projected yet

E-MCP-19 supersedes E-MCP-11: Copilot CLI documents `.mcp.json` and `.github/mcp.json`. The site's
statement that its absence is documented was wrong and takes a Corrections entry. The registry does
not gain a Copilot CLI target in this change, because the higher-precedence file is Claude Code's
`.mcp.json` and choosing a target is a design decision.

## No standard location yet

E-MCP-20: SEP-2633 is still a draft and discussion #2218 is closed. The golden set's path stands.
