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
---

# 147 — narrow the enhance scenarios written when Delegation was the only addition

CR against `packages/buddy-agent-harness`, run headless. Seed intent is the issue body.

- Rule: whole-file Thens keep their frozen wording; the Given settles the other addition
  (its current text already in the file, or the run's only offer or question). A Then naming
  what is offered or replaced names the addition or section it means.
- Narrowing, not additive: a re-open of a frozen suite. Authorized by the issue and the dispatch brief.
- Spec-only: `.agents/` is outside the package allowlist, so no changeset unless SKILL.md changes.

## NEXT

Landed on a PR against main. Owner to ratify the spec re-open and the impl gate
(status stays as is until then). Follow-up filed: #157.
