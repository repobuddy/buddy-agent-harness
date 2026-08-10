---
cr-ref: backfill-harness-init
target-project: buddy-agent-harness
blast: low
leash: auto-spec
todos:
  - content: "intake — scaffold the colocated project spec and harness-init behavioral stub"
    status: completed
  - content: "explore — backfill the harness-init contract and behavioral suite from source and tests"
    status: in_progress
  - content: "spec gate — judge and freeze the accepted harness-init suite"
    status: pending
  - content: "deliver — verify the implementation against the frozen suite"
    status: pending
  - content: "impl gate and handoff — record verification and reconcile the brief"
    status: pending
---

# CR backfill-harness-init

CR link: none (direct user request).

Target: `packages/buddy-agent-harness/skills/harness-init/` (skill artifact).

## NEXT

Reconcile the implementation with the settled repository-root contract, then run the spec gate after making the `check-suite` validator available.
