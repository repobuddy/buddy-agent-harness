<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Agent worktree findings

Claude Code runs a session started with `--worktree`, and a subagent isolated in a worktree, in a git worktree under `.claude/worktrees/<name>/` inside the repository. Each one is a whole checkout, config files included, so a tool exclusion that keeps the main checkout from scanning `.claude/worktrees` also matches every file of the worktree itself. `doctor` checks these findings only where a `.claude` directory exists.

| Finding | What it means | Repair |
| --- | --- | --- |
| `worktrees-in-repository` | this agent worktree is inside the repository, so it carries the repository config, and a tool exclusion meant to skip nested worktrees matches every file in it | run `/buddy-agent-harness:enhance` (pnpm install: `pnpm-buddy-agent-harness-enhance`), which offers the Agent worktrees guidance |
| `worktrees-untracked` | .claude/worktrees/ is not git-ignored, so every agent worktree Claude Code creates there shows up as untracked in git status | run `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which offers the .gitignore line |
| `worktrees-self-ignored` | this config excludes .claude/worktrees, and an agent worktree under .claude/worktrees/ carries the same config, so inside one every file matches the exclusion and Biome processes nothing | run `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which offers the replacement |
| `worktree-base-unset` | worktree.baseRef is unset, so agent worktrees branch from the default branch rather than the current HEAD — work on a feature branch starts without its commits | run `/buddy-agent-harness:init-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-init-buddy-agent-harness`), which explains the trade-off and offers the setting |

Each is an offer, written only on approval: `enhance` offers the Agent worktrees guidance, which has agents create worktrees in a sibling `<repository>.worktrees/` directory instead, and `init-buddy-agent-harness` offers each of the other lines, one at a time.

`worktrees-in-repository` is reported once per worktree found under `.claude/worktrees/`. Moving one is safe only when no session is working in it, so ask before running `git worktree move`; the finding carries no command.

`worktree-base-unset` is a choice, not an error. The default branch suits agents given unrelated tasks; `"head"` suits agents asked to build on the branch in front of them. Put the trade-off to the owner, and report an explicit `"fresh"` as their answer rather than as a finding — `doctor` already does.

`worktrees-untracked` stays a backstop with the guidance in place: an agent that skips it, or a session started with `--worktree`, still lands under `.claude/worktrees/`.

`worktrees-self-ignored` is checked for Biome only, the tool whose exclusion is confirmed to match a worktree's own files. The skill also offers to remove the same exclusion from ESLint, Prettier, knip, and TypeScript configuration, where an earlier version of the skill added it.
