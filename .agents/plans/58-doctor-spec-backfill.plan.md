---
cr-ref: 58
source: https://github.com/repobuddy/buddy-agent-harness/issues/58
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Confirm node shape and decide where the shared report shape lives
    status: completed
  - content: Draft cli/bridge-resolution node and suite from source and tests
    status: completed
  - content: Draft cli/instruction-bridges node and suite from source and tests
    status: completed
  - content: Draft cli/diagnosis-report node and suite for the one shared output shape
    status: completed
  - content: Draft workflows/detect-and-repair and move the seam paragraph out of repair
    status: completed
  - content: Promote cli/ to a descriptive index over its children
    status: completed
  - content: Spec gate, including a seam pass over the nodes together
    status: pending
  - content: Deliver — a verification per frozen scenario; add tests where none exists
    status: pending
  - content: Impl gate
    status: pending
  - content: pnpm verify (coverage gated at 100%), changeset if packages/ changed
    status: pending
  - content: Handoff — PR against main linking issue #58, monitor CI, merge when green
    status: pending
---

# 58 — backfill doctor's bridge and instruction findings, and home the doctor→repair flow

CR against `packages/buddy-agent-harness`. Issue #58: `doctor` reports three families of
finding and only one — configuration, at `cli/configuration-diagnosis/` — has a spec node.
Bridge resolution and instruction bridges predate the corpus. One command, three families,
one output shape, and no node owns that shape.

**This is a backfill.** The behavior already ships. Derive the contract from
`src/diagnose-bridges/` and its tests; do not edit behavior to fit a cleaner spec. Where the
implementation and a sensible contract disagree, report it as a finding.

## Decisions already settled — do not relitigate

**Spec the report shape as it ships TODAY.** Issue #57 changes how `doctor` renders `help`
and is live in another worktree (`bah-57-help`); its shape is genuinely undecided among the
issue's three options. Operator confirmed: spec today's shape, isolate the report-shape
scenarios in one node so #57 lands as a single-node change, pre-spec no outcome. Whoever
lands second rebases.

**Grade the seam, not only each node.** CR 51's report found that grading two nodes
independently leaves the contract between them ungraded — how CR 35 failed twice. The spec
gate runs a seam pass over the four nodes together.

## Node shape

| Node | Owns |
| --- | --- |
| `cli/` | descriptive index over the three CLI capability nodes |
| `cli/bridge-resolution/` | `no-canonical`, `missing`, `degraded`, `stale`, the four `diverged-*`, `unpinned-copy` |
| `cli/instruction-bridges/` | `no-instructions`, `instructions-missing`, `instructions-unbridged`, `instructions-unreadable` |
| `cli/diagnosis-report/` | the one output shape all three families share |
| `workflows/detect-and-repair/` | the cross-surface contract: who detects, who repairs, what may be routed on |

## Findings to report, not to fix

This is a backfill. Where the shipped implementation and a tidier contract disagree, the
implementation wins and the disagreement is reported.

1. **Three bridge repairs name no skill.** `diverged-both`, `diverged-unknown` and
   `unpinned-copy` route to nobody — reconcile by hand, or a `git update-index` invocation.
   The bridge family is therefore the one family whose repair owner is not uniform.
2. **`skills/repair/` contradicts that.** Its non-goal says every bridge finding "is `init`'s
   repair" and its suite has `hands a two-sided divergence to init rather than picking a side`,
   which the guidance table does not support. Reported, not edited.
3. **`unpinned-copy` is filed as a bridge problem and is not one.** Its `BridgeReport` status is
   `ok` — the bridge resolves. What is wrong is the git index. Specified as it ships.

## NEXT

Spec gate: cold spec-judge plus a seam pass over the nodes together. Then rebase onto #57 once
`bah-57-help` merges, and respec `cli/diagnosis-report/`'s `help` scenarios against
`help[N]{command,instruction}`.
