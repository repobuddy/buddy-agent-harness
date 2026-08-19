---
cr-ref: 54
source: https://github.com/repobuddy/buddy-agent-harness/issues/54
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Settle the canonical-MCP-location open question against primary sources
    status: completed
  - content: Record the evidence in .research/ and correct any published claim it moves
    status: completed
  - content: Draft the spec node and suite for MCP golden-set diagnosis
    status: completed
  - content: Spec gate
    status: completed
  - content: Implement the golden-set reader, reverse converters, and drift detection
    status: completed
  - content: Implement secret detection that never carries a value into a finding
    status: completed
  - content: Wire the findings into doctor and regenerate the doctor skill
    status: completed
  - content: Impl gate
    status: completed
  - content: Docs pages under apps/web
    status: completed
  - content: Changeset and pnpm verify
    status: completed
  - content: Handoff — PR against main linking issue #54, then merge it
    status: pending
---

# 54 — a golden MCP server set, diagnosed both directions

CR against `packages/buddy-agent-harness`. Issue #54: `init` reports MCP configuration and
never converts it, because converting a config someone already wrote for harness A into
harness B has to invent values they never wrote. A **golden set the user authors** changes
that premise — emitting a superset field the user filled in is transcription, not invention.

## Decisions already settled — do not relitigate

- Golden set lives under `.agents/buddy-agent-harness/`, following the `.agents/<tool>/`
  convention already on disk. Not `.agents/mcp.json` — that squats the shared standard surface.
- Machine-readable is a hard constraint: `doctor` is a read-only CLI whose output is parsed and
  which is safe to run from a session-start hook. Prose goes in comments or a sibling `.md`.
- Project scope only. User scope stays described and diagnosable, never written.
- Converters are bidirectional; comparison is semantic, not byte.
- Two baselines: git history where the target is tracked, a last-projected record where it is not.
- Reconcile is approval-gated, per server and per field, never auto-merged on three-way conflict,
  and distinguishes a user edit from a harness restating its own defaults.
- `doctor` reports literal secrets and never lets the value enter the finding object. Redact at
  source, not at the formatter. Parse errors by position, never content. No truncated previews.

## Sequencing

The issue is scoped as one go. This CR lands the **read-only detection half** — the golden-set
reader, the bidirectional converters, the two baselines, the semantic comparison, and the
`doctor` findings. It needs only readers, it de-risks the schema before anything writes against
it, and it keeps `doctor` read-only. The **forward projection writers** and the **approval-gated
reconcile writer** are the second CR, filed as a follow-up: they need a write-capable home,
which issue #51's `repair` skill is the candidate for.

## NEXT

Both gates approved and the suite is frozen. The detection half is landing; the forward
projection writers and the approval-gated reconcile writer stay open under #54, which this
PR therefore references without closing.
