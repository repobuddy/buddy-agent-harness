---
cr-ref: 63
source: https://github.com/repobuddy/buddy-agent-harness/issues/63
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Intake — read issue #63, verify its claims against the post-#60/#65 tree, scaffold this brief
    status: completed
  - content: Explore — settle the replacement routing rule by behavioural evidence, not argument
    status: completed
  - content: Revise the skills/repair spec node and its frozen suite (routing on problem, MCP family)
    status: completed
  - content: Spec gate
    status: completed
  - content: Rewrite SKILL.md step 2 and the classes.md "Not yours" tail
    status: completed
  - content: Correct the same claim on the docs site page
    status: completed
  - content: Impl gate
    status: completed
  - content: Changeset and pnpm verify
    status: completed
  - content: Handoff — PR against main closing issue #63
    status: pending
---

# 63 — route the repair family split on `problem`, not on a skill name in `help`

CR against `packages/buddy-agent-harness`. Issue #63: the shipped `repair` skill's step 2 asserts
*"Every finding's repair in `help` names a skill"* and routes the init/repair split on that name.
It does not hold, and it contradicts the rule two paragraphs above it — **route on `problem`,
never on `detail`**.

## Verified against the tree at 99db013 — the issue's counts are stale, its diagnosis is not

The issue was filed pre-#60 and pre-#65. Re-counted against `src/diagnose-bridges/doctor-guidance.ts`:

| Family | Problems | Does the `help` instruction name a skill? |
| --- | --- | --- |
| bridge resolution | 9 | no — `buddy-agent-harness init`, a `git diff`, a `git update-index` |
| instruction bridges | 4 | yes — `/buddy-agent-harness:init` |
| configuration | 4 | yes — `/buddy-agent-harness:repair` (added by #60; the issue predates it) |
| MCP | 10 | no — none, in either rendering |

So the rule now matches **8 of 27**, not 4 of 17. The issue's sharpest example (no configuration
finding names `repair`) is out of date; its **conclusion is not** — 19 findings still name no skill,
and the MCP family added in #65 made the gap larger, not smaller. Under the rule as written an
agent meeting any of those 19 has no match and no stated fallback.

## Decisions already settled — do not relitigate

**The spec already says the right thing.** `workflows/detect-and-repair/` (landed in #66) states it
outright: *"an owner is not something a consumer can always read off the report … Route on
`problem`, which every finding carries, rather than on a skill name in `help`."* This CR is
implementation drift against a spec that is already correct — not a spec change on that seam.

**The one routable field is `problem`.** `detect-and-repair`'s Surface section names exactly one.
`skills/repair/`'s own README contradicts it (*"routes on the `problem` name and on the skill the
repair names"*) and is corrected here.

**The replacement rule is membership in `references/classes.md`,** keyed by `problem`: a `problem`
with an entry there is this skill's; one without is not. It holds for all 27 today and for anything
added tomorrow, and it fails **safe** — an unlisted finding is reported, never improvised on.

**The "hand-kept list drifts" objection is answered, not ignored.** `classes.md` is not a routing
table bolted on beside the command's; it is the list of corrections this skill *has*. A finding it
holds no correction for is not one it can repair, so membership and ownership are the same fact.

**The skill name in `help` keeps one job:** naming who to hand a finding *to* when reporting it.
It is not what decides ownership.

## Touched surfaces

- `packages/buddy-agent-harness/skills/repair/SKILL.md` — step 2
- `packages/buddy-agent-harness/skills/repair/references/classes.md` — the "Not yours" tail, which
  says "every bridge finding" (silent on the 10 MCP problems) and repeats the false claim
- `packages/buddy-agent-harness/.agents/spec/skills/repair/README.md` + `repair.feature`
- `apps/web/src/content/docs/skills/repair.md` — carries the same claim

## NEXT

Landed. Both gates passed and are self-asserted in the ledger shard; the suite is frozen at
feature level. What shipped: routing on `problem` via membership in `references/classes.md`, the
handoff decided by whether a repair names `init` in either form, the MCP family named for the
first time, three new scenarios, a test pinning the `init`-owned set to the guidance table, and
the same corrections on the docs page. Four follow-ups recorded in the ledger, none blocking.

## Evidence — eight blind runs, four text variants

A fixture repository carrying faults from all four `doctor` families produced a real 9-finding
report. Cold agents were each given a skill body, its `references/classes.md`, and that report,
asked for the sorting step only, and asked to flag where they inferred rather than applied a
stated rule.

| Text | Sorted correctly | Inference reported |
| --- | --- | --- |
| shipped | 2/2 | both: nothing covers a repair naming no skill; MCP never mentioned |
| candidate | 2/2 | none on the routing decision |
| + matching rule | 2/2 | both: "match by path" ties on two findings at one path |
| pre-gate | 2/2 | none — but see below |
| pre-gate, `degraded` added | 0/1 | routed a rebuildable bridge to a person |
| final, `degraded` added | 2/2 | none on the routing decision or the pairing |

Two of those rows are the method catching this mission's own work. The third row is a sentence
added here that was under-determined in the same way the shipped rule was. The fifth is the one
that matters: **the first four rows were clean because the hard case was absent from the
fixture, not because the rule held.** Every bridge fault in it was `diverged-unknown`, one of the
three a rebuild would not fix, so no run ever met a bridge repair carrying an `init` command
line. The impl gate found it by reading the table instead. A fixture that does not carry the
case cannot report on it, and eight clean runs said nothing about the nine problems they never
saw.
