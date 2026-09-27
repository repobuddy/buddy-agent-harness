---
cr: "159"
source: https://github.com/repobuddy/buddy-agent-harness/issues/159
status: active
todos:
  - id: design
    content: Decide report and offer for the three cases where the global copy and the repository copy disagree
    status: pending
  - id: spec
    content: Add scenarios for the three cases to skills/enhance, update the node README and scenario map
    status: pending
  - id: spec-gate
    content: Cold spec-judge until aligned; self-assert within leash
    status: pending
  - id: build
    content: Update enhance SKILL.md, the docs page, and add a changeset
    status: pending
  - id: impl-gate
    content: Cold impl-judge over the new scenarios; pnpm verify
    status: pending
  - id: handoff
    content: PR referencing #159, report to operator
    status: pending
---

# CR 159: the global copy is not the current text

Node: `packages/buddy-agent-harness/.agents/spec/skills/enhance/`. Additive scenarios only; no frozen scenario narrowed.

Design:
- Case 1 (repository uncovered; global covers the subject in another form): run the provenance check on the global copy. Retired: offer nothing here, hand over the replacement for the global copy. Owner's own: offer nothing, name the global coverage. Cannot tell: put to the owner. Team copy only on request.
- Case 2 (retired wording in the root `AGENTS.md`; global carries the current text): offer removal of the stale section; the replacement is the owner's to ask for, and costs a second copy.
- Case 3 (owner's own words in the repository; global carries the current text): offer nothing; report both, and that the owner reads the subject twice.
- Destination recommendation (#157) untouched.

## NEXT

Draft the scenarios.
