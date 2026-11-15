---
'buddy-agent-harness': minor
---

Account for the git worktrees Claude Code creates under `.claude/worktrees/`, inside the repository.

The `init-buddy-agent-harness` and `enhance` skills now offer two settings, each on its own and written only on approval: ignoring `.claude/worktrees/` in `.gitignore` and in each tree-scanning tool's config the repository has (Biome, ESLint, Prettier, knip, tsconfig), and setting `worktree.baseRef` to `"head"` in `.claude/settings.json`, with the trade-off explained first. Each worktree is a whole checkout, so Biome in the main checkout stops on its nested root configuration, and without `"head"` an agent asked to build on a feature branch starts from the default branch.

`doctor` reports what is missing in a repository with a `.claude/` directory: `worktrees-untracked` for the `.gitignore` rule, `worktrees-scanned` for a `biome.json` that does not exclude the directory, and `worktree-base-unset` for a `.claude/settings.json` that leaves `worktree.baseRef` unset. An explicit `"fresh"` is the owner's choice and is not reported.
