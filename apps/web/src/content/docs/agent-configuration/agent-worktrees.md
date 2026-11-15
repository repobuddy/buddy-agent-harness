---
title: Agent Worktrees
description: Where Claude Code puts the git worktrees it creates for agents, why that breaks linters and git status, and the two settings a repository needs.
---

Claude Code runs a session started with `--worktree`, and a subagent set to `isolation: worktree`, in its own git worktree. This page explains what that does to the repository around it and what to add. `init` and `enhance` offer the additions and `doctor` reports the ones that are missing.

## Where the worktrees go

By default, Claude Code creates the worktree under `.claude/worktrees/<name>/` at the repository root, on a new branch named `worktree-<name>`. Subagent worktrees are the same kind. This is documented behavior, not a bug. The repository has to account for it. ([Claude Code worktrees](https://code.claude.com/docs/en/worktrees))

## Why tools that scan the tree break

Each worktree is a whole checkout nested inside the main one, config files included. A tool that walks the tree and reads its own config finds a second copy in every worktree.

Biome is the confirmed case. With agent worktrees present, Biome in the main checkout stopped with "Found a nested root configuration, but there's already a root configuration", and the pre-commit hook running it failed every commit until the worktrees were removed. This was observed in one repository ([issue #321](https://github.com/repobuddy/buddy-agent-harness/issues/321)); the worktrees page says nothing about linters.

ESLint, Prettier, knip, and a tsconfig `include` walk the same tree. They are untested here, so the skills offer an exclusion for each one the repository has, and `doctor` checks Biome only.

## Why `git status` is noisy

Claude Code does not ignore `.claude/worktrees/`. Its documentation tells you to add it to `.gitignore`, so that worktree contents do not appear as untracked files in the main checkout.

## What a worktree branches from

A worktree branches from the repository's default branch, not from your current `HEAD`, unless `worktree.baseRef` is `"head"`. The setting takes `"fresh"` (the default) or `"head"`, never a branch name. With no remote, a `"fresh"` worktree falls back to the local `HEAD`.

The symptom of the default: an agent asked to build on a feature branch starts from `main`, misses the branch's commits, and its work comes back as merge conflicts.

The trade-off is real. The default suits agents given tasks unrelated to what you are working on, since each starts from a clean tree. `"head"` suits agents asked to build on the branch in front of you, and it carries unpushed commits into the worktree. So this one is a choice, and an explicit `"fresh"` is a valid answer that `doctor` does not report.

## The location cannot be set

No setting changes the directory. Only a `WorktreeCreate` hook, which replaces Claude Code's git logic entirely, can place worktrees elsewhere. That is rarely worth it, so the skills do not offer it. Claude Code also refuses to create a worktree when `.claude` or `.claude/worktrees` is a symlink.

## What to add

| Where | Line |
| --- | --- |
| `.gitignore` | `.claude/worktrees/` |
| `biome.json` | `"!**/.claude/worktrees"` in `files.includes` |
| `.claude/settings.json` | `"worktree": { "baseRef": "head" }` |

For ESLint, Prettier, knip, and tsconfig, the skills offer the equivalent exclusion of `**/.claude/worktrees`. A tsconfig `exclude` replaces TypeScript's default, so the skill offers `["node_modules", "**/.claude/worktrees"]`, not a one-element list.

## Who offers and who reports

[`init-buddy-agent-harness`](/skills/init-buddy-agent-harness/) and [`enhance`](/skills/enhance/#agent-worktrees) offer each line on its own, only where Claude Code is in use, and write only what you approve. A decline writes nothing.

[`doctor`](/cli/doctor/#agent-worktree-findings) reports what is still missing, in a repository with a `.claude/` directory.
