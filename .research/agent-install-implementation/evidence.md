# Evidence — `agent-install` Implementation

Status values: `confirmed`, `contested`, `thin`. Confidence: high / medium / low.

All claims are from `agent-install@0.0.8`, published 2026-06-24, read from the npm tarball on
2026-08-18. The package declares no `repository` field, so the tarball is the only source.
Citations name the `//#region src/<path>` marker in the bundled output.

## E-AI-01 — The section parser skips headings inside fenced code blocks

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: `dist/agents-md-DAu7ZRfo.js`, region `src/agents-md/sections.ts`
- **Notes**: `parseSections` tracks an active fence via `/^(\s{0,3})(`{3,}|~{3,})(.*)$/`, opening on
  the first fence and closing only on the same fence character at a length greater than or equal to
  the opener's. Lines inside a fence are skipped before the heading match is attempted. Each section
  records `{heading, level, body, start, end}` as byte offsets, `end` being the next heading's
  `start`, so a replace is a slice-splice that leaves the rest of the document untouched.
  `normalizeHeading` lowercases and trims before comparison, so `## delegation` matches
  `## Delegation`.
- **Why it matters here**: the text the `enhance` skill offers is itself a fenced block containing a
  literal `## Delegation` heading. Any heading scan that is not fence-aware can read that fence — in
  our own documentation, or in a user's — as the section being present.

## E-AI-02 — It implements the cross-harness MCP mapping `init` calls unsafe

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: `dist/mcp-D24Z3PhI.js`, regions `src/mcp/agents.ts` and `src/mcp/transforms/*.ts`
- **Notes**: Fourteen hosts, each carrying `globalConfigPath`, `projectConfigPath`, `configKey`,
  `format`, `supportedTransports`, and independent `detectGlobalInstall` / `detectProjectInstall`.
  The mapping is not uniform, and the per-host divergences are exactly the ones a naive
  implementation would get wrong: Codex keys on `mcp_servers` in TOML and honors `CODEX_HOME`;
  Copilot CLI keys on `mcpServers` globally but `servers` in `.vscode/mcp.json`, applying its
  transform only in the project case; Zed keys on `context_servers` and is remote-only; Claude
  Desktop is stdio-only; Goose keys on `extensions` in YAML at a per-platform path. Transforms
  reshape a common `{command, args, env}` / `{type, url, headers}` form into each host's schema.
- **Bearing on our claim**: `init`'s `references/detection.md` and `SKILL.md` classify MCP servers as
  canonical-only because "no safe cross-harness mapping exists". This is a working counterexample.
  It does not make the mapping lossless — see E-AI-06 — but it does refute the claim as written.

## E-AI-03 — JSON edits preserve comments and formatting

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: `dist/mcp-D24Z3PhI.js`, `jsonc-parser` `modify` + `applyEdits`
- **Notes**: Writes into a user's existing JSON config are computed as edits against the original
  text rather than parse-mutate-stringify, so comments, key order, and indentation survive. Eleven
  of the fourteen hosts are `format: "jsonc"`, several pointing at files that hold far more than MCP
  configuration (`~/.claude.json`, Zed and Gemini `settings.json`).

## E-AI-04 — The dotted-path writer refuses prototype-polluting segments

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: `dist/mcp-D24Z3PhI.js`, region `src/utils/set-nested-value.ts`
- **Notes**: `setNestedValue` throws on a `__proto__`, `prototype`, or `constructor` segment rather
  than writing it. The keys it walks come from the host registry's `configKey`, which is a dotted
  string.

## E-AI-05 — Skill metadata is stripped of terminal escapes before display

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: `dist/skill-DzD0NuUN.js`, regions `src/utils/strip-terminal-escapes.ts` and
  `src/utils/sanitize-metadata.ts`
- **Notes**: `stripTerminalEscapes` removes OSC, DCS/PM/APC, CSI, simple-escape, C1, and control
  sequences; `sanitizeMetadata` applies it and collapses newlines before a value is printed. The
  values guarded are `name` and `description` read from a fetched `SKILL.md` — attacker-controlled
  text on the install-from-URL path.
- **Applicability here**: none today. This package never reads skill frontmatter — `doctor` counts
  directories and prints bridge paths and statuses. The guard becomes necessary the moment anything
  here reads a value out of a `SKILL.md`, or out of a skill fetched from a remote source, and prints
  it. Recorded so the requirement is not rediscovered late.

## E-AI-06 — Its skill projection writes into harnesses that read `.agents/skills` natively

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: `dist/skill-DzD0NuUN.js`, region `src/skill/agents.ts` — target paths `.claude/skills`,
  `.codex/skills`, `.cursor/skills`, `.gemini/skills`, `.gemini/antigravity/skills`, `.github/skills`
- **Notes**: Four of those six are native readers of `.agents/skills` per
  `.research/agentic-configuration-standards/`, which this project treats as authoritative and which
  is why `harness-registry.ts` gives them no `skillsDirectory`. Its model therefore writes
  redundant projections. One path is new to us and worth checking against that research:
  `.gemini/antigravity/skills`.

## E-AI-07 — It compares resolved paths, not link text, and gates the junction type on Windows

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: `dist/skill-DzD0NuUN.js`, region `src/skill/installer.ts`; and
  `dist/agents-md-DAu7ZRfo.js`, region `src/agents-md/symlink-claude.ts`
- **Notes**: `createSymlink` treats a link as already correct when `realpath(link)` equals
  `realpath(target)`, with a second comparison that also resolves symbolic links in the parent
  directories. `isAlreadyLinkedToAgentsMd` does the same for the file case. The link type is
  `platform() === "win32" ? "junction" : undefined` rather than passed unconditionally.
- **Consequence for us**: this identified two defects in our own code, fixed in the change recorded
  in `changes.md`. Note that its Windows junction target is still relative, which Node resolves
  against the process directory rather than the link's — the same defect we fixed, unfixed there.

## E-AI-08 — Provenance is weak

- **Date**: 2026-08-18
- **Status**: confirmed
- **Confidence**: high
- **Source**: npm registry metadata for `agent-install`
- **Notes**: Eight releases, all `0.0.x`; latest `0.0.8` published 2026-06-24; single maintainer; no
  `repository` field, so the published source is not verifiable from the registry. Roughly 6.8M
  downloads in the month to 2026-08-15, which establishes that something depends on it heavily, not
  that its model matches ours.
