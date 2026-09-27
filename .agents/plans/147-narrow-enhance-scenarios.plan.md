---
cr-ref: 147
source: https://github.com/repobuddy/buddy-agent-harness/issues/147
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Re-open skills/enhance — 27 scenarios narrowed, none added or removed
    status: completed
  - content: Spec gate — ALIGNED on round 5 (round 2 re-planned); self-asserted, auto-spec leash
    status: completed
  - content: Impl gate — all 27 pass (N=1, structural walk-through); paused for owner ratification
    status: completed
  - content: pnpm verify, PR referencing #147, report to operator
    status: completed
  - content: "#157 spec: destination-neutral place Thens, already-global state, ~/.agents/AGENTS.md destination"
    status: completed
  - content: "#157 spec gate — ALIGNED on scenarios after 3 rounds + 2 confirmations; self-asserted"
    status: completed
  - content: "#157 deliver: SKILL.md, both references, docs page, changeset"
    status: completed
  - content: "#157 impl gate — 8 in-scope scenarios pass (N=1, structural); pnpm verify; pushed to #156"
    status: completed
---

# 147 — narrow the enhance scenarios written when Delegation was the only addition

CR against `packages/buddy-agent-harness`, run headless. Seed intent is the issue body.

- Rule: whole-file Thens keep their frozen wording; the Given settles the other addition
  (its current text already in the file, or the run's only offer or question). A Then naming
  what is offered or replaced names the addition or section it means.
- Narrowing, not additive: a re-open of a frozen suite. Authorized by the issue and the dispatch brief.
- Spec-only: `.agents/` is outside the package allowlist, so no changeset unless SKILL.md changes.

- #157 continues on this branch, owner-directed (2026-09-26): P1 reword the two place Thens
  destination-neutral; P2 global stays recommended; P3 add an already-global state; P4 the global
  destination is `~/.agents/AGENTS.md`. Re-opens five frozen scenarios; the owner's answer is the ratification.

## NEXT

Landed on PR #156 against main, now covering #147 and #157. Owner to ratify both re-opens and
both impl gates. Two backlog follow-ups are recorded in the ledger shard for this session, not yet filed.
