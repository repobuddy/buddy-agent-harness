---
cr-ref: 153
source: https://github.com/repobuddy/buddy-agent-harness/issues/153
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: New node cli/references — spec README + suite for show, list, search, tiers, merge modes, walk, trace
    status: completed
  - content: Spec gate — ALIGNED on round 3 (pre-flight, then a coverage gap); self-asserted, auto-spec leash
    status: completed
  - content: Build src/references (layers, documents, merge, resolve, search, command) with 100% coverage
    status: in_progress
  - content: Governance alias warns deprecation; legacy governances folders read by reference
    status: completed
  - content: Docs — references concept page, CLI reference page, glossary; changeset
    status: completed
  - content: Impl gate — cold impl-judge per scenario; pnpm verify
    status: pending
  - content: PR referencing #153; report the show contract to operator
    status: pending
---

# 153 — `reference show|list|search`

CR against `packages/buddy-agent-harness`, run headless. Seed intent is the issue body (P1–P8, S1–S8).
Scope: #153 only. No `load-reference` skill (#154). Plugin tier limited to this package and declared
dependencies; harness-managed folders and enabled-plugin discovery wait on harness detection.

Settled here (headless calls, reported to the owner):
- `governance list|show` keeps its own resolver and output unchanged; it only adds a deprecation line on stderr.
- A qualified `<plugin>/<name>` picks the plugin layer; every tier above still resolves the bare `<name>`.
- Project and local tiers both walk; legacy `governances/` sits below `references/` at the same level.
- `final` is honored only in project references; elsewhere it is ignored with a warning.
- One name in text: the bare document. Several: each wrapped in `<reference name="…">` tags. JSON/TOON: always an array.
- `--trace` in text goes to stderr, so stdout stays the document.

## NEXT

Suite frozen (48 scenarios). Finish per-scenario tests to 100% coverage, then the cold impl-judge and `pnpm verify`.
