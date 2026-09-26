---
name: eval-list-identifiers
description: Use this skill before changing the wording of the List identifiers section that the enhance skill ships, or when enhance needs to settle an existing List identifiers section by measurement. Measures whether a wording changes how an agent labels the lists it puts to the user, instead of arguing about whether it reads well.
---

# Evaluate the List identifiers wording

The `## List identifiers` text in `packages/buddy-agent-harness/skills/enhance/references/list-identifiers.md` ships into other people's instruction files and loads on every session there. Its wording is a behavioral claim: agents will label the lists they put to the user, and keep those labels through a revision. **Do not change this wording on taste.** Run the harness.

This is the `eval-delegation` method applied to a second section. Read `../eval-delegation/references/method.md` before a round; every contamination it records applies here.

## Run it

1. **Write each wording** to a file, section heading and all.

2. **Run every arm**, the empty control included, into one output directory outside any repository:

   ```bash
   node .agents/skills/eval-list-identifiers/scripts/run.mjs --no-section --arm control --out <workdir>
   node .agents/skills/eval-list-identifiers/scripts/run.mjs --section <shipped.md> --arm shipped --out <workdir>
   node .agents/skills/eval-list-identifiers/scripts/run.mjs --section <candidate.md> --arm <name> --out <workdir>
   ```

   Each task is a fresh `claude -p` session, six per task, with HOME pointed at a sandbox holding credentials only and a `CLAUDE.md` holding the project stub and the arm's section. The revision tasks resume their parent's session for a second turn. Every arm uses the same model.

3. **Score blind:**

   ```bash
   node .agents/skills/eval-list-identifiers/scripts/judge.mjs --out <workdir>
   ```

   Each reply goes to a fresh judge with the task and its key line from `scripts/backlog.mjs`, shuffled, with nothing naming the arm. It writes `scores.json` and prints the per-arm table.

4. **Read the failing verdicts** in `scores.json` against the replies before trusting a total. A judge misreading the key is a judge error, not a run failure; correct it by hand and say so.

5. **Apply the bar** in `references/backlog.md`, and record the round there: the wordings, the run count, the table.

## Rules

- Fix the decision rule before the runs. The bar in `references/backlog.md` is the rule; change it only in a commit that precedes the round it governs.
- Run the empty control in every round. A wording that does not beat it has not been shown to do anything.
- Never let a wording name a backlog task. State the behavior a clause must produce.
- Never edit a task or its key to agree with a result. Add a task instead, and report it on its own.
- Never pool rounds run on different backlogs.
