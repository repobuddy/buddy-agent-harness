# Agent-worktree settings

A repository that uses Claude Code accounts for its agent worktrees, one setting at a time, on the owner's word.

## What

Claude Code runs a worktree session, and a subagent isolated in a worktree, in a git worktree under
`.claude/worktrees/<name>/` inside the repository. A repository that does not account for that pays three ways: `git
status` lists the directory as untracked, a tool that walks the tree reads every worktree's own config, and agent
worktrees branch from the default branch, not from the commit the session started on, so they miss unpushed work.
Each fix is a line in a file the owner wrote, and the base is a trade-off only the owner can weigh.

The `init-buddy-agent-harness` skill offers each setting the repository lacks as its own item, explains the base
trade-off before it asks, and writes only the lines the owner approves, in place. It offers nothing where Claude Code
is not in use, and nothing for a setting already covered.

## Non-goals

- N1 **Detecting the missing settings for `doctor`.** That is [worktree-diagnosis](../worktree-diagnosis/README.md).
- N2 **The rest of the setup run.** Surveying, consolidating, bridging, and reporting are
  [init-buddy-agent-harness](../init-buddy-agent-harness/README.md)'s.
- N3 **Offering the settings from another skill.** The `enhance` skill does not offer them
  ([enhance](../enhance/README.md) N13).
- N4 **Moving the worktrees.** Their place is Claude Code's, and no setting moves it.
- N5 **Choosing the base for the owner.** Either value is the owner's answer.

## Key terms

- K1 **agent-worktree settings**: the settings that account for Claude Code's agent worktrees: ignoring
  `.claude/worktrees/` in `.gitignore` and in each tree-scanning tool config the repository has, and setting the base
  in `.claude/settings.json`. Their literal lines are the shipped skill's `references/agent-worktrees.md`.
- K2 **base**: the commit an agent worktree branches from: the repository's default branch unless
  `.claude/settings.json` sets it, or the current `HEAD` when it is set to that.
- K3 **Claude Code in use**: the repository has a `.claude/` directory, or the owner named Claude Code in this run.
- K4 **covered**: a setting the repository already has: `.claude/worktrees/` already ignored in that file, including
  by a rule on a parent directory, or the base already set to either value.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | repository owner | decide, per setting, how Claude Code's agent worktrees fit the repository |
| A1.2 | repository owner | nothing is offered for a harness nobody uses here, or for a setting already in place |
| A2.1 | later Claude Code session in an agent worktree | branch from the commit the owner chose, in a tree other tools do not scan |

## Use cases

### UC1 — Offer the agent-worktree settings (A1.1, A1.2, A2.1)

- **Trigger**: the owner sets up the repository's agent configuration, and Claude Code is in use.
- **Entry node**: `inuse`
- **Entry points**:
  - Skill (primary): `init-buddy-agent-harness`, in its confirm and apply phases.
- **Inputs**: `.gitignore`, the repository's tree-scanning tool configs, `.claude/settings.json`, and the harnesses the
  owner named in the run.
- **Success**: each uncovered setting is offered on its own, and each approved line is written in place.
- **Extensions**:
  - UC1.1 Claude Code is not in use: nothing is offered.
  - UC1.2 A setting is already covered: it is not offered, and the report says so.
  - UC1.3 The owner declines a setting, or does not answer: nothing is written for it.

## Criteria

Every criterion here belongs to a skill-instruction use case and is checked by an eval run of
`init-buddy-agent-harness`.

- R1 (UC1, E2, E4) With Claude Code in use, each uncovered agent-worktree setting is offered as its own item: the ignore
  line for `.gitignore`, one ignore line for each tree-scanning tool config the repository has, and the base set to
  the current `HEAD` in `.claude/settings.json`; the owner's answer to one decides nothing about the others.
- R2 (UC1.1, E1) In a repository with no `.claude/` directory, where the owner did not name Claude Code in the run, no
  agent-worktree setting is offered, though Claude Code is enabled by default.
- R3 (UC1.2, E3) A covered setting is not offered, and the report says it is covered: the directory already ignored in
  that file (a rule on a parent directory counts), a tool config that already excludes it, or a base already set to
  either value, which the report calls the owner's choice.
- R4 (UC1, E4) The base offer explains, before it asks, that agent worktrees branch from the default branch unless
  the base is set to the current `HEAD`, and that the current `HEAD` includes unpushed commits.
- R5 (UC1, E5) An approved setting adds exactly its line, as one key or array element, to its file in place, leaving
  every other byte (comments, key order, indentation) unchanged, and creates `.gitignore` or `.claude/settings.json`
  when it is missing.
- R6 (UC1.3, E6) A declined or unanswered setting creates or changes no file, a file whose only offer was declined is
  byte-identical after the run, and the report names the setting as declined.

## Open questions

None.

## References

- [graph.md](./graph.md): the decisions for each setting.
- [init-buddy-agent-harness](../init-buddy-agent-harness/README.md): the skill that delivers these offers, and its
  report.
- [worktree-diagnosis](../worktree-diagnosis/README.md): the `doctor` findings for the same three faults.
- The shipped skill's `skills/init-buddy-agent-harness/references/agent-worktrees.md`: the setting lines, the
  tree-scanning tools, and how each line is judged covered.
