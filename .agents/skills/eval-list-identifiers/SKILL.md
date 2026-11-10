---
name: eval-list-identifiers
description: Use this skill before changing the wording of the List identifiers section that the enhance skill ships, or when enhance needs to settle an existing List identifiers section by measurement. Measures whether a wording changes how an agent labels the lists it puts to the user, instead of arguing about whether it reads well.
---

# Evaluate the List identifiers wording

The `## List identifiers` text in `packages/buddy-agent-harness/skills/enhance/references/list-identifiers.md` ships into other people's instruction files and loads on every session there. Its wording is a behavioral claim: agents will label the lists they put to the user, and keep those labels through a revision. **Do not change this wording on taste.** Run the harness.

This is the `eval-delegation` method applied to a second section. Read `../eval-delegation/references/method.md` before a round; every contamination it records applies here.

## Run it

The harness runs in [promptfoo](https://www.promptfoo.dev/), pinned to `0.125.1`. `promptfoo/promptfooconfig.yaml` lists the arms, one provider each. It reads the tasks and key lines from `scripts/backlog.mjs`, and the shipped arm's text from `list-identifiers.md` itself.

1. **Write each candidate wording** to a file under `promptfoo/arms/`, section heading and all, and add it to `providers` in the config. Keep the control (`section: none`) and shipped (`section: shipped`) arms in every round.

2. **Run and score every arm** into one output directory outside any repository:

   ```bash
   LISTID_OUT=<workdir> PROMPTFOO_DISABLE_TELEMETRY=1 pnpm dlx promptfoo@0.125.1 eval \
     -c .agents/skills/eval-list-identifiers/promptfoo/promptfooconfig.yaml \
     -o <workdir>/results.json --no-cache --no-table --no-write
   ```

   Each task is a fresh `claude -p` session, six per task (`repeat: 6`), launched through `../eval-delegation/scripts/blind-claude.mjs` so none of the host's user-scope instructions load. Each runs from a directory whose `CLAUDE.md` holds the project stub and the arm's section, and nothing else. The revision tasks resume their parent's session for a second turn. Every arm uses the same model. Replies are also written to `<workdir>/<arm>/<task>-<rep>.txt`.

   Each reply goes to a fresh blind judge with the task and its key line, and nothing naming the arm. That is the prompt `scripts/judge-prompt.mjs` builds, so `scripts/judge.mjs` can rescore the same replies.

   A full round is 240 runner turns and 240 judge turns. Run it in the background.

3. **Print the table and the failing verdicts:**

   ```bash
   node .agents/skills/eval-list-identifiers/promptfoo/table.mjs <workdir>/results.json --failing
   ```

4. **Read the failing verdicts** against the replies before trusting a total. A judge misreading the key is a judge error, not a run failure; correct it by hand and say so.

5. **Apply the bar** in `references/backlog.md`, and record the round there: the wordings, the run count, the table.

Rounds 1 to 3 ran on `scripts/run.mjs` and `scripts/judge.mjs`, which still work and share the judge prompt with promptfoo.

## Rules

- Fix the decision rule before the runs. The bar in `references/backlog.md` is the rule; change it only in a commit that precedes the round it governs.
- Run the empty control in every round. A wording that does not beat it has not been shown to do anything.
- Never let a wording name a backlog task. State the behavior a clause must produce.
- Never edit a task or its key to agree with a result. Add a task instead, and report it on its own.
- Never pool rounds run on different backlogs.
