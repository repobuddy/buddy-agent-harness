# Agent-worktree settings

A repository that uses Claude Code accounts for its agent worktrees, one setting at a time, on the owner's word.

## What

Claude Code runs a worktree session, and a subagent isolated in a worktree, in a git worktree under
`.claude/worktrees/<name>/` inside the repository. A repository that does not account for that pays three ways: `git
status` lists the directory as untracked, a tool exclusion meant to skip nested worktrees matches every file of the
worktree itself, so its pre-commit hook fails, and agent worktrees branch from the default branch, not from the
commit the session started on, so they miss unpushed work. Each fix is a line in a file the owner wrote, and the base
is a trade-off only the owner can weigh.

A `.claude/worktrees` exclusion in a tree-scanning tool config is the second cost above, so where one exists the offer
is to remove it. Keeping agent worktrees out of
the repository is guidance for `AGENTS.md`, the `enhance-buddy-agent-harness` skill's Agent worktrees addition, not a setting.

The `init-buddy-agent-harness` skill offers each setting the repository lacks as its own item, explains the base
trade-off before it asks, and writes only the lines the owner approves, in place. It offers nothing where Claude Code
is not in use, and nothing for a setting already covered.

## Non-goals

- N1 **Detecting the missing settings for `doctor`.** That is [worktree-diagnosis](../worktree-diagnosis/README.md).
- N2 **The rest of the setup run.** Surveying, consolidating, bridging, and reporting are
  [init-buddy-agent-harness](../init-buddy-agent-harness/README.md)'s.
- N3 **Offering the settings from another skill.** The `enhance-buddy-agent-harness` skill does not offer them
  ([enhance](../enhance-buddy-agent-harness/README.md) N13).
- N4 **Moving the worktrees.** No setting moves Claude Code's place for them. Telling agents to create worktrees
  outside the repository is [enhance](../enhance-buddy-agent-harness/README.md)'s Agent worktrees addition.
- N5 **Choosing the base for the owner.** Either value is the owner's answer.
- N6 **A tool exclusion of the worktrees.** Inside an agent worktree it matches every file, so it is never offered.

## Key terms

- K1 **agent-worktree settings**: the settings that account for Claude Code's agent worktrees: ignoring
  `.claude/worktrees/` in `.gitignore`, setting the base in `.claude/settings.json`, and removing a `.claude/worktrees`
  exclusion from each tree-scanning tool config that has one. Their literal lines are the shipped skill's
  `references/agent-worktrees.md`.
- K2 **base**: the commit an agent worktree branches from: the repository's default branch unless
  `.claude/settings.json` sets it, or the current `HEAD` when it is set to that.
- K3 **Claude Code in use**: the repository has a `.claude/` directory, or the owner named Claude Code in this run.
- K4 **covered**: a setting the repository already has: `.claude/worktrees/` already ignored in `.gitignore`,
  including by a rule on a parent directory, the base already set to either value, or a tool config that does not
  mention `.claude/worktrees`.
- K5 **tree-scanning tool config**: a Biome, ESLint, Prettier, knip, or TypeScript config at the repository root, as
  the shipped skill's `references/agent-worktrees.md` lists them.

## Actors and goals

| ID | Actor | Goal |
| --- | --- | --- |
| A1.1 | repository owner | decide, per setting, how Claude Code's agent worktrees fit the repository |
| A1.2 | repository owner | nothing is offered for a harness nobody uses here, or for a setting already in place |
| A2.1 | later Claude Code session in an agent worktree | branch from the commit the owner chose, and commit with the repository's hooks running |

## Use cases

### UC1 — Offer the agent-worktree settings (A1.1, A1.2, A2.1)

- **Trigger**: the owner sets up the repository's agent configuration, and Claude Code is in use.
- **Entry node**: `inuse`
- **Entry points**:
  - Skill (primary): `init-buddy-agent-harness`, in its confirm and apply phases.
- **Inputs**: `.gitignore`, the repository's tree-scanning tool configs, `.claude/settings.json`, and the harnesses the
  owner named in the run.
- **Success**: each uncovered setting is offered on its own, and each approved line is written or removed in place.
- **Extensions**:
  - UC1.1 Claude Code is not in use: nothing is offered.
  - UC1.2 A setting is already covered: it is not offered, and the report says so.
  - UC1.3 The owner declines a setting, or does not answer: nothing is written for it.

## Criteria

Every criterion here belongs to a skill-instruction use case and is checked by an eval run of
`init-buddy-agent-harness`.

- R1 (UC1, E2, E4) With Claude Code in use, each uncovered agent-worktree setting is offered as its own item: the ignore
  line for `.gitignore`, the base set to the current `HEAD` in `.claude/settings.json`, and the removal of the
  `.claude/worktrees` exclusion from each tree-scanning tool config that has one; the owner's answer to one decides
  nothing about the others.
- R8 (UC1, E4) For a Biome config, the removal is offered together with reading `.gitignore` (`vcs.useIgnoreFile`),
  unless the config already reads it, and the offer says that without it a worktree inside the repository stops Biome
  in the main checkout.
- R7 (UC1, E4) No run offers to add a `.claude/worktrees` exclusion to a tree-scanning tool config.
- R2 (UC1.1, E1) In a repository with no `.claude/` directory, where the owner did not name Claude Code in the run, no
  agent-worktree setting is offered, though Claude Code is enabled by default.
- R3 (UC1.2, E3) A covered setting is not offered, and the report says it is covered: the directory already ignored in
  `.gitignore` (a rule on a parent directory counts), or a base already set to either value, which the report calls
  the owner's choice. A tool config with no `.claude/worktrees` exclusion needs no removal and is not reported.
- R4 (UC1, E4) The base offer explains, before it asks, that agent worktrees branch from the default branch unless
  the base is set to the current `HEAD`, and that the current `HEAD` includes unpushed commits.
- R5 (UC1, E5) An approved setting adds or removes exactly its line, as one key or array element, in its file in
  place, leaving every other byte (comments, key order, indentation) unchanged, and an addition creates `.gitignore`
  or `.claude/settings.json` when it is missing.
- R6 (UC1.3, E6) A declined or unanswered setting creates or changes no file, a file whose only offer was declined is
  byte-identical after the run, and the report names the setting as declined.

## Open questions

None.

## References

- [graph.md](./graph.md): the decisions for each setting.
- [init-buddy-agent-harness](../init-buddy-agent-harness/README.md): the skill that delivers these offers, and its
  report.
- [worktree-diagnosis](../worktree-diagnosis/README.md): the `doctor` findings for the same faults.
- [enhance](../enhance-buddy-agent-harness/README.md): the Agent worktrees addition, which keeps agents from creating worktrees inside the
  repository.
- The shipped skill's `skills/init-buddy-agent-harness/references/agent-worktrees.md`: the setting lines, the
  tree-scanning tools, and how each line is judged covered.
