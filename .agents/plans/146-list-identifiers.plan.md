---
cr-ref: 146
source: https://github.com/repobuddy/buddy-agent-harness/issues/146
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Author references/list-identifiers.md and its empty history file
    status: completed
  - content: Revise skills/enhance node — additive scenarios only, freeze preserved
    status: completed
  - content: Spec gate — ALIGNED on round 5 (4 blocked rounds); self-asserted, auto-spec leash
    status: completed
  - content: SKILL.md names two additions, each offered on its own
    status: completed
  - content: Impl gate — all touched scenarios pass (3 rounds, N=1); paused for owner ratification
    status: completed
  - content: Docs page, changeset, pnpm verify, PR referencing #146
    status: pending
---

# 146 — `enhance` offers a List identifiers addition

CR against `packages/buddy-agent-harness`, run headless. Seed intent is the issue body.

- New addition `## List identifiers`: label every presented list (A/B/C or 1/2/3; typed lists
  take a kind prefix, P1/Q1/S1); labels stay stable across revisions, new items continue the sequence.
- Destination follows the skill's rule for a subject about how the agent works: recommend the
  owner's global file, `AGENTS.md` the alternative. The issue argues for `AGENTS.md`; flagged for the owner.
- No retired wording yet, so the current text stands in for one at the provenance check: edited
  copy → replacement offer, neither survives → owner's own, disagreement → ask with two answers.
- Wording not A/B-evaluated, unlike Delegation; flagged for the owner.

## NEXT

Landed on a PR against main. Owner to ratify the impl gate (status stays `approved` until then)
and to decide the destination question above. Follow-ups filed: #147, #148, #149.
