---
cr-ref: 154
source: https://github.com/repobuddy/buddy-agent-harness/issues/154
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: New node skills/load-reference — spec README + suite for loading, missing names, fallback, caller prose
    status: completed
  - content: Spec gate — ALIGNED on round 3 (20 scenarios, frozen); self-asserted, auto-spec leash
    status: completed
  - content: Ship skills/load-reference with a bundled scripts/reference.mjs launcher; pack-check runs it standalone
    status: pending
  - content: Docs — load-reference page, CLI reference page pointer, glossary; changeset
    status: pending
  - content: Impl gate — aced-impl-judge over the frozen suite, vitest for the launcher scenarios
    status: pending
  - content: S4 — skill-design (cyberuni/cyberplace) names load-reference as the only lookup; separate PR
    status: pending
  - content: PR referencing #154; report to operator
    status: pending
---

# 154 — `load-reference` skill

CR against `packages/buddy-agent-harness`, run headless. Seed intent is the issue body (P1–P5, S1–S4).
Contract it builds on: `reference show` from #153 as merged (no local tier, no monorepo walk, no `final`).
Out of scope: harness detection, retiring the universal-plugin governance copy step.

Settled here (headless calls, reported to the owner):
- Launcher bundled at `skills/load-reference/scripts/reference.mjs`, not `<skill dir>/../../bin/`: the folder works copied out alone, like the other shipped launchers.
- A name the command reports missing also falls back to the caller's copy (P4 widened); an ambiguous one never does.
- Caller copies: `references/<name>.md`, then legacy `references/governances/<name>.md`.
- Description `By name only`; the caller line names skill and plugin in words, never as a slash command (`.research/plugin-skill-naming/`: only Claude Code namespaces plugin skills).
- A name rejected as a path is dropped and the command re-run for the rest.
- Launcher bundles now keep names: minifying broke clibuilder's array argument detection, so `reference show` failed from any bundle.

## NEXT

Deliver: skill, launcher and docs built; run the impl gate (aced-impl-judge + vitest).
