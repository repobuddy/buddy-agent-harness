---
cr-ref: 149
source: https://github.com/repobuddy/buddy-agent-harness/issues/149
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Move the generic stale-check procedure from references/delegation.md into the enhance SKILL.md body
    status: completed
  - content: Leave each addition's ## Stale when with only its own history file and specifics
    status: completed
  - content: Impl gate — 22 of 22 stale-check scenarios pass (1 round, N=1); paused for owner ratification
    status: completed
  - content: Changeset, pnpm verify, PR referencing #149
    status: completed
  - content: Rebase onto main after #156 and #158; reconcile the already-current and already-global checks
    status: completed
---

# 149 — one home for the `enhance` stale-check procedure

CR against `packages/buddy-agent-harness`, run headless. Seed intent is the issue body.

- The already-current check, the two provenance questions and their table live in `references/delegation.md`;
  `references/list-identifiers.md` borrows them by pointer. Move them into `skills/enhance/SKILL.md` step 3.
- Each `## Stale when` keeps its history file, its heading, and what is specific to that addition.
- No suite change: the frozen scenarios pin only that each `## Stale when` directs the comparison at its
  own history file, which still holds. #147 edits the same suite in parallel; this diff stays out of it.

- Rebased after #156 (CR 147, issue 157) added an already-global check to step 3. Both checks are
  one containment test applied to two texts: the covered section (already current) and the
  instructions loaded from outside the repository (already global). Step 3 states the test once as
  "carries the current text" and each check names it; already global sits on the uncovered branch,
  where the spec flowchart puts `EG`. Still no suite change: #156 left the two `## Stale when`
  scenarios as they were, and its new scenarios are behavioral.

## NEXT

Landed on a PR against main. Owner to ratify the impl gate (status stays `approved` until then).
