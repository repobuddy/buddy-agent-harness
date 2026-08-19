---
cr-ref: 69
source: https://github.com/unional/buddy-agent-harness/issues/69
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Derive the init skill's write behavior from SKILL.md and its references
    status: pending
  - content: Draft skills/init/ node and suite — consolidation, the invention line, the unattended writes
    status: pending
  - content: Draft cli/command-output/ node and suite from the encoder and its tests
    status: pending
  - content: Point skills/harness-init/ and the seam nodes at the new init-skill node
    status: pending
  - content: Spec gate over both nodes together, including the init/repair approval seam
    status: pending
  - content: Deliver — bridge every command-output scenario to a test title; inspect the init suite
    status: pending
  - content: Impl gate
    status: pending
  - content: Remove the two Backfill gap entries from spec.md and cli/README.md
    status: pending
  - content: pnpm verify; changeset only if a published file changed
    status: pending
  - content: Handoff — PR against main closing #69, CI green
    status: pending
---

# 69 — the `init` skill's write behavior, and the shared command output layer

CR against `packages/buddy-agent-harness`. Issue #69: two surfaces enumerated as gaps during
#58 still have no node.

**This is a backfill.** Both behaviors ship. Derive every claim from `skills/init/` and
`src/command-output/`; do not change shipped behavior to fit a cleaner spec. Where the
implementation and a tidier contract disagree, report the disagreement rather than fixing it.

## Node shape

| Node | Owns |
| --- | --- |
| `skills/init/` | the `init` **skill**'s conduct: what it consolidates, what it declines to invent, and which writes it makes without asking |
| `cli/command-output/` | how a command's result becomes bytes: the format set, the one stdout boundary, the text rendering, the `~` collapse |

`skills/harness-init/` keeps the `init` **command** — options, formats, conflicts. The two are
named apart in both nodes so neither restates the other.

## Decisions already settled — do not relitigate

**The load-bearing claim is the approval asymmetry.** `cli/instruction-bridges/` and
`workflows/detect-and-repair/` both route every instruction repair to the `init` skill, and
`skills/repair/` contrasts its own approval-gated corrections with `init` writing the
`CLAUDE.md` stub unasked. `skills/init/` states that side of the seam.

**Out of scope:** the CLI entry-point contract (#61, landed at `cli/entry-point/`).

## NEXT

Draft `skills/init/` from the shipped skill, then `cli/command-output/` from the encoder.
