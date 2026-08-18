---
cr-ref: 57
source: https://github.com/repobuddy/buddy-agent-harness/issues/57
project-path: packages/buddy-agent-harness
status: active
todos:
  - content: Settle the option on the consumer axis and mail bah-58-spec the decision
    status: completed
  - content: Revise cli/configuration-diagnosis spec + suite for the split repair field
    status: pending
  - content: Spec gate
    status: pending
  - content: Split Repair.repair into { command, instruction } across all 17 entries
    status: pending
  - content: Make buildReport emit help as rows, no `Run` wrapper anywhere
    status: pending
  - content: Regenerate the doctor skill and update its "Reading the report" prose
    status: pending
  - content: Impl gate
    status: pending
  - content: Changeset, then pnpm verify green under the 100% coverage gate
    status: pending
  - content: Handoff — PR against main linking #57, then monitor CI and merge
    status: pending
---

# 57 — doctor: split the repair field into a runnable command and a prose instruction

## CR

[Issue #57](https://github.com/repobuddy/buddy-agent-harness/issues/57). `buildReport` wraps every
finding's repair in ``Run `…` ``. Most repairs are not commands, so the wrapper invites an agent to
paste prose into a shell. `diverged-both` has always rendered half inside the backticks and half
outside.

Revise, not add: the behavior exists and is wrong.

## Decision

**Option 2 of the three the issue lists — split the field.** Decided on the consumer axis, which is
what the issue and the brief both name as deciding.

TOON is the default format and an agent is the default consumer. The question a consumer must answer
is *"can I execute this, or is this judgment I hand to a skill?"* Option 1 (drop the wrapper, prose
carries its own imperative) fixes the misleading text and leaves that question unanswerable without
parsing English. Option 3 (wrap only real invocations) answers it but encodes the answer in prose
*formatting*, so the consumer recovers the classification by scanning for backticks — the same guess
with extra steps, made by a heuristic inside `doctor` on the agent's behalf. Only option 2 puts the
distinction in the data, where a program reads it as a field. The person reading `--format text`
loses nothing: the instruction column is the self-contained imperative option 1 would have produced.

```
type RepairAction = {
  command: string      // runs verbatim and COMPLETES the repair; empty when no single invocation does
  instruction: string  // the imperative in prose, always present, self-contained
}
```

Both keys always present. Empty string, not an absent key: with an optional key the TOON encoder
degrades the whole array from the tabular form to a nested list, which is worse for exactly the
consumer the default format exists for.

`command` non-empty ⇔ safe to run as given, and running it finishes the repair.
`command` empty ⇔ judgment; act on `instruction`, do not synthesize a command from it.

The safety property that falls out: `diverged-both` and `diverged-unknown` carry **no** command even
though `git diff --no-index …` is genuinely runnable — the diff is a diagnostic step, not the repair.
An agent that blindly executes every non-empty `command` therefore never rebuilds a diverged bridge
over the side holding the newer edit.

## Coordination

`bah-58-spec` is backfilling `doctor`'s bridge-resolution and instruction-bridge nodes concurrently
and owns the node for the shared report shape. The decision above was mailed to it before any code
was written. This CR creates **no** new spec node: it revises `cli/configuration-diagnosis/`, which
it genuinely changes, and hands the cross-family `diverged-*`-carries-no-command scenario to #58 if
that node is not registered before this spec gate. Whoever lands second rebases.

## NEXT

Revise `cli/configuration-diagnosis/` — the `carries the repair for every finding it reports`
scenario asserts a non-empty repair string today and must bind the two-field shape instead.
