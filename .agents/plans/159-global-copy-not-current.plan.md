---
cr: "159"
source: https://github.com/repobuddy/buddy-agent-harness/issues/159
status: active
todos:
  - id: design
    content: Decide report and offer for the three cases where the global copy and the repository copy disagree
    status: completed
  - id: spec
    content: Add scenarios for the three cases to skills/enhance, update the node README and scenario map
    status: completed
  - id: spec-gate
    content: Cold spec-judge until aligned; self-assert within leash
    status: completed
  - id: build
    content: Update enhance SKILL.md, the docs page, and add a changeset
    status: completed
  - id: impl-gate
    content: Cold impl-judge over the new scenarios; pnpm verify
    status: completed
  - id: handoff
    content: PR referencing #159, report to operator
    status: completed
---

# CR 159: the global copy is not the current text

Node: `packages/buddy-agent-harness/.agents/spec/skills/enhance/`. Additive scenarios only; no frozen scenario narrowed.

Design:
- Case 1 (repository uncovered; global covers the subject in another form): run the provenance check on the global copy. Retired: offer nothing here, hand over the replacement for the global copy. Owner's own: offer nothing, name the global coverage. Cannot tell: put to the owner. Team copy only on request.
- Case 2 (retired wording in the root `AGENTS.md`; global carries the current text): offer the replacement, saying the owner would read it twice, with removal as the other answer. A retired global copy is handed the current text whatever the repository holds.
- Case 3 (owner's own words in the repository; global carries the current text): offer nothing; report both, and that the owner reads the subject twice.
- Destination recommendation (#157) untouched.

## NEXT

Landed on a PR against main. Owner review applied: replacement stays the default beside a current global copy, a retired global copy is always handed the current text. Owner to ratify the impl gate.
