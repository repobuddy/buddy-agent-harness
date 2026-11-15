<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Agent worktree findings

Claude Code runs a session started with `--worktree`, and a subagent isolated in a worktree, in a git worktree under `.claude/worktrees/<name>/` inside the repository. That place is by design, and no setting moves it. These findings are what a repository needs so the worktrees there do no harm. `doctor` checks them only where a `.claude` directory exists.

| Finding | What it means | Repair |
| --- | --- | --- |
| `worktrees-untracked` | .claude/worktrees/ is not git-ignored, so every agent worktree Claude Code creates there shows up as untracked in git status | run `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`) or `/buddy-agent-harness:enhance` (pnpm install: `pnpm-buddy-agent-harness-enhance`), which offers the .gitignore line |
| `worktrees-scanned` | this config does not exclude .claude/worktrees, so the tool walks into each agent worktree, a whole checkout with its own config, and Biome stops on the nested root configuration | run `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`) or `/buddy-agent-harness:enhance` (pnpm install: `pnpm-buddy-agent-harness-enhance`), which offers the exclusion |
| `worktree-base-unset` | worktree.baseRef is unset, so agent worktrees branch from the default branch rather than the current HEAD — work on a feature branch starts without its commits | run `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`) or `/buddy-agent-harness:enhance` (pnpm install: `pnpm-buddy-agent-harness-enhance`), which explains the trade-off and offers the setting |

None of these is a fault in a file the owner wrote, and none is a `repair` correction. Each is an offer the `init-buddy-agent-harness` and `enhance` skills make, one at a time, and write only on approval.

`worktree-base-unset` is a choice, not an error. The default branch suits agents given unrelated tasks; `"head"` suits agents asked to build on the branch in front of them. Put the trade-off to the owner, and report an explicit `"fresh"` as their answer rather than as a finding — `doctor` already does.

`worktrees-scanned` is checked for Biome only, the one tool with a confirmed failure. A repository whose ESLint, Prettier, knip, or TypeScript configuration walks the tree can hit the same thing; the skills look for those when they make the offer.
