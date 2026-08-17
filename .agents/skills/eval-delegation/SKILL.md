---
name: eval-delegation
description: Use this skill before changing the wording of the Delegation section that the enhance skill ships, or before adding a section beside it. Measures whether a candidate wording actually changes agent behavior, instead of arguing about whether it reads well.
---

# Evaluate the Delegation wording

The `## Delegation` section in `packages/buddy-agent-harness/skills/enhance/references/delegation.md` ships into other people's repositories and is loaded on every session there. Its wording is a behavioral claim: it says agents will route work differently after reading it.

That claim is testable, and it has been wrong before. The version this section replaced read well, was in real use, and produced an unexecutable plan the first time it was measured. **Do not change this wording on taste.** Run the harness.

This skill is narrow on purpose — one section, one backlog, one scoring key. Generalizing it is tracked upstream; see `references/method.md`.

## When to run it

- Any edit to the shipped section, including a "small" one.
- Adding a second addition to `enhance` that gives an agent instructions about its own work.
- A report that the section is being misread in practice. A misread is a failing case; add it to the backlog first.

## Run it

1. **Write the candidate** to a file, section heading and all.

2. **Build the prompts.** Two roster conditions, from the same candidate:

   ```bash
   node .agents/skills/eval-delegation/scripts/build-prompts.mjs \
     --section <candidate.md> --out <workdir>
   ```

   This writes `prompt-claude.md` and `prompt-drift.md`. Everything downstream of the candidate text is byte-identical between them and across runs — that is what makes results comparable.

3. **Verify only the section varies.** Against a prior run's prompts:

   ```bash
   diff <(sed -n '/end AGENTS.md/,$p' <workdir>/prompt-claude.md) \
        <(sed -n '/end AGENTS.md/,$p' <prior>/prompt-claude.md)
   ```

   Any difference below that marker invalidates the comparison. Fix it before spawning anything.

4. **Spawn the runs.** Three per roster, six total, all on the same model, each a fresh subagent told only to read its prompt file and follow it. Never tell a runner it is being evaluated, and never mention delegation outside the prompt file.

5. **Score** each run against the key in `references/backlog.md`, then compare against the baseline recorded there.

## The bar

A candidate replaces the shipped wording only if it holds T1, T3, T4 and T5 at the baseline and does not drop T2 below 4 of 6.

Fix the decision rule before you look at the results. A rule chosen afterwards is a preference wearing a number.

Score differences of one or two runs are noise at this sample size — six runs per cell, one judge, one backlog. Treat a small win as a tie and keep the incumbent. The findings worth acting on are categorical: a plan that cannot execute, a rule read backwards, a task class that fails every time.

## Reading the results

The scores rank candidates. The **unclear field** in each run's output is what tells you where the wording is thin — a clause several runs cannot apply is a defect even when every score passes. Read those before the totals.

Watch for a run whose assignment contradicts its own stated reasoning ("delegate to the cheapest model" beside "cheaper to do myself"). That is a wording problem, not a scoring problem, and the totals hide it.

## Rules

- **Never let the candidate name a test case.** Writing "a one-line typo fix" into a section tested against a typo-fix task inflates that task and generalizes to nothing. `references/method.md` covers this and the other ways a run gets contaminated.
- **Never reuse a backlog whose key you have already tuned against.** Add cases; do not edit them to agree with a result you like.
- **Never pool runs across different backlogs** into one figure. Report them separately.
- Record what you ran, not just what you concluded — candidate text, run count, and per-task scores. The baseline in `references/backlog.md` is only useful if the next person can reproduce it.
