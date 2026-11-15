# Evidence — Where Claude Code puts agent worktrees, and what they branch from

Status values: `confirmed`, `contested`, `thin`. Confidence: high / medium / low.

## E-WT-01 — Worktrees are created under `.claude/worktrees/<name>/`, inside the repository

- **Date**: 2026-11-14
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code, "Run parallel sessions with worktrees" — https://code.claude.com/docs/en/worktrees — primary
- **Notes**: "By default, the worktree is created under `.claude/worktrees/<name>/` at your repository root, on a new branch named `worktree-<name>`." Subagents with `isolation: worktree` get the same kind of worktree: "Subagent worktrees use the same base branch as `--worktree`".
- **Why it matters here**: every agent worktree is a whole checkout nested inside the main one, config files included.

## E-WT-02 — The documentation tells users to git-ignore the directory; Claude Code does not

- **Date**: 2026-11-14
- **Status**: confirmed
- **Confidence**: high
- **Source**: https://code.claude.com/docs/en/worktrees — primary
- **Notes**: "Add `.claude/worktrees/` to your `.gitignore` so worktree contents don't appear as untracked files in your main checkout." Nothing on the page says Claude Code adds the rule itself.
- **Why it matters here**: the repository has to carry the rule, so `init` and `enhance` offer it and `doctor` reports it missing.

## E-WT-03 — Worktrees branch from the default branch unless `worktree.baseRef` is `"head"`

- **Date**: 2026-11-14
- **Status**: confirmed
- **Confidence**: high
- **Source**: https://code.claude.com/docs/en/worktrees, "Choose the base branch" — primary
- **Notes**: "Subagent worktrees use the same base branch as `--worktree`, so they branch from your repository's default branch unless `worktree.baseRef` is set to `"head"`." The setting accepts two values: `"fresh"` (default), "branch from the repository's default branch on the remote", and `"head"`, "branch from your current local `HEAD`, so the worktree carries your unpushed commits and feature-branch state". "You can't set `worktree.baseRef` to a branch name." With no remote, or no cached `origin/HEAD`, a `"fresh"` worktree "falls back to your current local `HEAD`".
- **Why it matters here**: an agent asked to build on a feature branch starts without its commits unless the setting is `"head"`, which is the trade-off P2 explains.

## E-WT-04 — Only a `WorktreeCreate` hook moves worktrees out of `.claude/worktrees/`

- **Date**: 2026-11-14
- **Status**: confirmed
- **Confidence**: high
- **Source**: https://code.claude.com/docs/en/worktrees, "Replace worktree creation with a hook" — primary
- **Notes**: "Configure a `WorktreeCreate` hook to replace the default `git worktree` logic entirely, including placing worktrees somewhere other than `.claude/worktrees/`." The page names no setting that changes the directory. Claude Code also refuses to create a worktree when `.claude` or `.claude/worktrees` is a symlink.
- **Why it matters here**: the location is fixed for practical purposes, so the repository adapts to it rather than moving it.

## E-WT-05 — Biome stops on a worktree's nested root configuration

- **Date**: 2026-11-14
- **Status**: confirmed
- **Confidence**: medium
- **Source**: observed in `cyberuni/cyber-asana` on 2026-11-14, reported in https://github.com/repobuddy/buddy-agent-harness/issues/321 — secondary
- **Notes**: With agent worktrees present under `.claude/worktrees/`, Biome in the main checkout stopped with "Found a nested root configuration, but there's already a root configuration", and the pre-commit hook failed every commit until the worktrees were removed. Adding `"!**/.claude/worktrees"` to `files.includes` in `biome.json` fixed it. The worktrees page says nothing about linters. ESLint, Prettier, knip, and a tsconfig `include` walk the same tree and are untested here.
- **Why it matters here**: Biome is the one tool `doctor` checks; the others are offered by the skills without a finding.
