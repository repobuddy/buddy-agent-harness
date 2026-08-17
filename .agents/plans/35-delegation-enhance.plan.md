---
cr-ref: 35
source: https://github.com/repobuddy/buddy-agent-harness/issues/35
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Draft spec node and suite for harness-enhance
    status: completed
  - content: Spec gate rounds 1 and 2 — both returned ALIGNED false, round 2 a regression
    status: completed
  - content: SDD paused by owner; spec drafts preserved to the sibling design file
    status: completed
  - content: Write skills/enhance/SKILL.md and its references
    status: completed
  - content: Add the Phase 5 offer to skills/init/SKILL.md
    status: completed
  - content: Docs pages for enhance under apps/web, via technical-writer
    status: completed
  - content: Changeset
    status: completed
  - content: Handoff — PR, merge, rebase, cut next branch
    status: completed
---

# 35 — Delegation section via a new `enhance` skill

CR against `packages/buddy-agent-harness`. Issue #35 asked `init` to emit a `## Delegation`
section into `AGENTS.md`. The owner reshaped it: `init` gains no opinions; a new opt-in skill
owns opinionated additions to an existing `AGENTS.md`, and `init` only offers to run it.

## Decisions already settled — do not relitigate

The section text is **frozen**. It was settled by 54 blind A/B evaluation runs comparing the
issue's original table against successive prose candidates, scored against a fixed key across
two harness conditions. Do not reword it.

Three findings drove the wording, and each is a property the suite guards:

- **No model, vendor, or version names.** The issue's table assigned work to a model absent
  from the session's roster and produced an unexecutable plan — on the current roster, before
  any drift. This is the regression guard.
- **Self-gating opening clause.** Makes the section inert where the harness has no subagents,
  which is what lets one shared file serve every harness without variants.
- **Three behavioral clauses**, each added to fix a measured failure: the floor (do it
  yourself when briefing costs more), keep-the-call (keep the decision, delegate the
  gathering), and blast radius (how cheap an agent the work can take).

Architecture, decided with the owner:

- The section ships from a new `enhance` skill, never from `init`.
- The offer is gated on **detection**, judged semantically against `AGENTS.md` as it stands
  **after** consolidation — Cursor always-on rules and other harness instruction files already
  merged in. Offer only when equivalent guidance is absent; report the finding either way.
- **Re-run is not a special case.** Same path, same detection, every run. Idempotency comes
  from detection, not from remembering a decline.
- Approval-gated. The section is material under the discriminator in
  `references/agents-md.md` — it holds whether or not `init` ran — so it is written only on
  explicit approval, never into the `buddy-agent-harness:begin/end` managed region.
- Root `AGENTS.md` only. Never a nested file.

## Out of scope

PR2 covers a separate skill codifying the A/B evaluation harness, plus a feature request to
`cyberuni/cyberplace` proposing a generic A/B eval layer for ACED.

## Observations routed from the spec gate

Raised by the cold spec-judge, held out of this CR. Each is the plan's or the owner's call, not
something this mission acts on silently.

- **architect** — the material/non-material discriminator now governs two capabilities but lives
  only in `skills/init/references/agents-md.md`, which is shipped implementation prose. The root
  spec says a project-wide rule lives under `design/`, still a stub. Wants a spec home.
- **architect** — node paths skew from the declared `mirror-source` map: `skills/<skill>/` should
  mirror `skills/init/` and `skills/enhance/`, but the nodes are `harness-init` and
  `harness-enhance`. This CR is consistent with the corpus and inconsistent with the map. Fix the
  map's stated rule or rename both, in a separate CR.
- **architect** — `skills/harness-init/` conflates two subjects: eighteen scenarios describe the
  `buddy-agent-harness init` CLI, while consolidation and the hand-off are skill behavior. Under
  `mirror-source` the CLI scenarios belong under `cli/`, still a stub. Pre-existing; this CR
  exposed it rather than creating it.
- **strategist** — the plural `addition` abstraction is unbought. One addition exists and every
  scenario hardcodes it. Costs nothing today; collapse the abstraction if a second never arrives.
- **process** — `check-spec-state` surfaces two pre-existing unresolved references to
  `.agents/AGENTS.md` in the `harness-init` node. The repository has no such file; the reference
  describes the convention, not an artifact here.

## Gate record

Round 1 of the spec gate returned `ALIGNED: false` on all three lenses, and its preflight could
not run because the conductor dispatched the judge without relaying
`producer_governances_declared` — the spec-producer had been run inline without loading its
governances. Recorded as **unverified for round 1**, not as a pass. Round 2 loads
`sdd:spec-producer-governance`, `sdd:spec-format-governance`, and `sdd:suite-format-governance`
before authoring, runs `check-suite` and `check-spec-state` clean, and relays the declaration.

## SDD is paused for this CR

The owner chose to ship the implementation plainly rather than keep grinding the spec gate. No
spec node landed: the drafted `README.md` and `.feature`, both judge verdicts, and the five
outstanding blocking findings are preserved in `35-delegation-enhance.design.md` beside this
brief. The spec corpus is untouched by this CR.

Picking the spec work back up is a separate mission. Start from the design file, and load all
seven governances before authoring — both failed rounds trace to authoring without the oracle,
builder, and architect bars.

## NEXT

Nothing. The mission landed.

`enhance` shipped in #36 with the delegation addition, the `init` hand-off, the docs, and a minor
changeset; issue #35 closed on merge. The eval harness that settled the wording shipped in #38 as
the repo-private `eval-delegation` skill, and `cyberuni/cyberplace#493` proposes the generic
version for ACED.

What did **not** land is the spec node. It failed the spec gate twice and was deliberately kept
out of the corpus; `35-delegation-enhance.design.md` holds the drafted node, both verdicts, and
the five outstanding blocking findings. Resuming that is a separate mission, and this brief is
not its handoff — start from the design file.
