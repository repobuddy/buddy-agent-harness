---
"buddy-agent-harness": minor
---

Keep agent worktrees out of the repository instead of excluding them from each tool.

A `.claude/worktrees` exclusion in a tool config matches every file inside an agent worktree there, so Biome processed nothing and every commit in the worktree failed its pre-commit hook.

- `enhance` offers a new Agent worktrees addition for `AGENTS.md`. It tells agents to create worktrees in a sibling `<repo>.worktrees/` directory, branching from `HEAD`, rather than with `isolation: "worktree"`.
- `init-buddy-agent-harness` no longer offers a `.claude/worktrees` exclusion for Biome, ESLint, Prettier, knip, or tsconfig. It offers to remove one an earlier version added, and for Biome to replace it with `vcs.useIgnoreFile`, which skips the worktrees through `.gitignore` without matching inside one, and keeps the `.gitignore` line and the `worktree.baseRef` offer.
- `doctor` reports `worktrees-in-repository` for each agent worktree under `.claude/worktrees/`, routed to `enhance`, and `worktrees-self-ignored` for a Biome config that excludes `.claude/worktrees`. `worktrees-scanned` is removed.
- `repair` hands a finding whose repair names `enhance` to that skill.
