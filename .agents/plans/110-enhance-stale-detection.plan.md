---
cr-ref: 110
source: https://github.com/repobuddy/buddy-agent-harness/issues/110
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Scaffold the skills/enhance/ spec node and suite, carrying the stale path
    status: completed
  - content: Spec gate — round 1 blocked at governance pre-flight, round 2 ALIGNED; suite frozen
    status: completed
  - content: Author `## Stale when` in references/delegation.md
    status: completed
  - content: Add the replacement-offer path to skills/enhance/SKILL.md
    status: completed
  - content: Behavioral evidence — blind runs, before/after plus two adversarial fixtures
    status: completed
  - content: Impl gate — ACED judge passes 43/43; ratified by the owner
    status: completed
  - content: Docs, changeset, draft PR updated to the shipped design
    status: completed
---

# 110 — `enhance` detects stale addition prose and offers the replacement

CR against `packages/buddy-agent-harness`. `/enhance` judges coverage by meaning, so a section
carrying an **outdated** version of a canonical addition reads as covered and the current wording
in `references/` is never surfaced. `## Delegation` is the live case: rewritten in `a5d5ddc`,
still single-paragraph in repos that took the earlier form.

## Shape of the change

- Each addition reference gains a `## Stale when` criterion beside `## Covered when`.
- The skill's coverage judgment gains a third outcome: **absent** → offer, **stale** → offer the
  replacement, **covered** → nothing. Meaning-based coverage is unchanged for the covered case.
- A replacement is offered under the same approval gate as an addition. Never silently overwritten.

## The discriminator that has to hold

Stale means **a recognizable earlier form of this addition**, not "semantically close prose".
A repository's own delegation guidance under its own heading is covered, never stale — replacing
a person's words with the canonical ones is the failure this criterion exists to prevent. When
the two cannot be told apart, it is the user's.

## Spec position

`skills/enhance/` has no node; the root spec lists it as an outstanding backfill gap. CR 35
drafted one, failed the spec gate twice, and preserved it at `35-delegation-enhance.design.md`
with five blocking findings. This CR scaffolds the node from that draft, resolves those five, and
carries the stale path.

Blocking finding 1 (consolidation had no home) is resolved by CR 69 — `skills/init/` now
specifies the write side, so this node references it rather than restating it.

## Out of scope

`## Stale when` for additions other than delegation. One addition ships today.

## Evidence

Five blind runs during explore, each subagent given one skill directory and one fixture repository
and told only that an owner asked it to improve the repository's agent configuration.

| Fixture `AGENTS.md` | Skill | Verdict | Offered |
| --- | --- | --- | --- |
| the earlier single-paragraph `## Delegation` | before | covered | nothing |
| the earlier single-paragraph `## Delegation` | after | earlier form | replacement |
| the current two-paragraph `## Delegation` | after | covered | nothing |
| the owner's own `## Working with subagents` prose | after | covered | nothing |
| no delegation guidance | after | absent | addition |
| owner-written `## Delegation` opening with the same clause | after | covered | nothing |
| owner-written `## Delegation` paraphrasing that clause | after | covered | nothing |

The before run named the drift in its own report and still offered nothing, which is the bug
stated by the thing it happened to. The last two fixtures are the impl-judge's counter-examples.

## Two defects the gate caught

Both are recorded as corrections in the sibling log, and both generalize.

1. **A criterion an agent applies must state whether its listed conditions are decisive.** A prose
   preamble above a condition list reads as necessary-but-not-sufficient and hands the call back to
   freehand comparison, which for a rewritten text always concludes "different prose".
2. **A criterion claiming a text descends from a known source must test for something nobody writes
   independently**, not for a reusable phrasing plus a missing detail. The self-gating clause opens
   the current wording too, and silence about model inheritance is the default for unrelated prose.

The criterion is now three conditions: a character-for-character span present in both the outgoing
and incoming wording establishes provenance, and the remaining two select the version.

## The design, after the owner redirected it

The provenance question is answered against a **stored artifact**, not a description of one. Each
addition keeps every wording it has retired, verbatim, in a sibling history file; a present section
is compared against those and never against the text that would be offered.

Two structural predicates decide it, and neither is a proportion. Whole sentences surviving verbatim
say the text passed through here. The retired wording's structure surviving says the section still
is that text. Both, and it is stale. Neither, and it is the owner's. Sentences but not structure,
and the skill says it cannot tell and asks.

The ask carries three answers: it is theirs, it came from here, or settle it by measurement. The
third is put only where the repository has a harness that can score wordings, is never run unasked,
and is the only path in the feature that can conclude **keep yours** — a section that scores level
or better is kept and said to be kept.

## Why the earlier mechanism was abandoned

Four impl-gate rounds, each defeated by a plausible owner-written section. Each produced a rule:

1. A criterion must state whether its listed conditions are decisive.
2. A provenance test must key on something nobody writes independently.
3. A provenance test must ask whether text is asserted or shown.
4. A provenance test is only as strong as its weakest accepted match.

Narrowing to the single most distinctive phrase did not save it. The argument generalizes: any phrase
short enough to write into a rule is short enough for someone to reach independently, having read the
docs or worked in a repository this skill enhanced. Storing the wording sidesteps all four, and
collapses the author's duty to keeping the outgoing text.

## History: where the earlier attempt stopped

The spec node landed clean: the spec gate returned ALIGNED on round 2 with all three lenses passing,
and the suite is frozen at 26 scenarios. The corpus gap CR 35 left open is closed, with all five of
its blocking findings resolved.

The implementation passes 25 of those 26. The one that fails is the safety scenario —
`leaves alone a section it cannot tell from the owner's own words` — and it failed in every impl-gate
round from 2 to 5. Each round the judge constructed an owner-voiced `## Delegation` section that
satisfied the criterion as it then stood; each fix was re-verified against every earlier
counter-example, so no hole was traded for another. Nine fixtures pass today.

Round 5 classified its finding a **second consecutive recurrence** of the provenance class and
argued the mechanism, not the chosen span, is unsound: a distinctive phrase is reproducible by
anyone who has read this package's documentation or worked in another repository it enhanced. That
premise was checked against a hand-maintained instruction file outside this repository, which
carries the currently chosen span verbatim. It holds. The loop stopped rather than running a
round 6.

**The open question is how a shipped addition proves a section descends from it.** Three candidates
were reached, and choosing between them is a product decision about who this feature serves:

1. **Accept the verbatim-span match as it stands.** Catches the real case; can mis-offer against an
   owner who reuses the phrase. The offer is still approval-gated, so the cost is a bad ask rather
   than a silent overwrite.
2. **Write a provenance marker when the skill writes an addition**, and key staleness on that.
   Sound, and closes the class outright — but it does nothing for the repositories that already
   carry the earlier wording, who are the population issue #110 is about.
3. **Drop the provenance claim.** Show the difference and let the owner say whose text it is. This
   contradicts the frozen safety scenario, so it needs Clearance and a return to `draft`.

## NEXT

Landed pending merge. Both gates ratified by the owner; PR #111 is ready for review and the merge is
the owner's. Nothing to resume. Backlog follow-ups are in the ledger: a tripwire enforcing the
revision-time duty, a rule for combining results across two or more retired wordings, and an error
band on the measurement tiebreak.
