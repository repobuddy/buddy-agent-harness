# Is a Canonical MCP Configuration Location Standardizing? (August 2026)

## Question

Issue #54 proposes a user-authored golden set of MCP servers stored at a path this project
chooses. Before that path is committed to, one question has to be answered:

1. Does any standard — the MCP specification, the AGENTS.md standard, or a cross-vendor
   agreement — say where MCP server configuration lives on disk?
2. If not, is a filename converging in practice across vendors?
3. What does each supported harness read at **project** scope today, per its own documentation?

## Scope

**In**: where MCP configuration files live, and whether that location is standardizing. The
project-scope path, config key, and serialization format of each harness this project supports.

**Out**: the MCP wire protocol. Whether the mapping between host formats is lossless —
`.research/agent-install-implementation/` (E-MCP-01 through E-MCP-05, recorded in
`.research/agentic-configuration-standards/`) is the authority for that and is not re-derived
here.

## Source angles

- The MCP specification and its proposal repository, for a de jure answer.
- Vendor documentation, one page per host, for a de facto one. A vendor documenting a *rival's*
  filename is the strongest available signal that a name is converging.
- The AGENTS.md standard, since the proposed location sits under `.agents/`.

## Method

Direct reads of primary sources, dated. A claim reachable only through a secondary source is
recorded as unverified rather than presented as established.
