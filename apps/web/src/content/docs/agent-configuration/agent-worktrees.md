---
title: Agent Worktrees
description: Where Claude Code puts the git worktrees it creates for agents, why that breaks commits and git status, and how to keep them out of the repository.
---

Claude Code runs a session started with `--worktree`, and a subagent set to `isolation: worktree`, in its own git worktree. This page explains what that does to the repository around it and what to change. `enhance` and `init` offer the changes and `doctor` reports what is still open.

## Where the worktrees go

By default, Claude Code creates the worktree under `.claude/worktrees/<name>/` at the repository root, on a new branch named `worktree-<name>`. Subagent worktrees are the same kind. This is documented behavior, not a bug. The repository has to account for it. ([Claude Code worktrees](https://code.claude.com/docs/en/worktrees))

## Why commits fail inside a worktree

Each worktree is a whole checkout nested inside the main one, config files included, so every tool config in the repository applies inside every worktree too.

Biome is the confirmed case, and it fails both ways. With no exclusion, Biome in the main checkout walks into each worktree and stops with "Found a nested root configuration, but there's already a root configuration" ([issue #321](https://github.com/repobuddy/buddy-agent-harness/issues/321)). With an exclusion of `!**/.claude/worktrees`, the main checkout is fine, but the worktree carries the same `biome.json`, and inside it every file sits under a path matching `.claude/worktrees`. Biome prints "No files were processed" and exits 1, so the pre-commit hook and `pnpm verify` fail, and an agent's only way past is `--no-verify` ([issue #329](https://github.com/repobuddy/buddy-agent-harness/issues/329)).

Ignoring nested worktrees is right for the main checkout and wrong for a checkout that is one of them. No config line serves both. Keeping the worktrees out of the repository does.

## Why `git status` is noisy

Claude Code does not ignore `.claude/worktrees/`. Its documentation tells you to add it to `.gitignore`, so that worktree contents do not appear as untracked files in the main checkout.

## What a worktree branches from

A worktree branches from the repository's default branch, not from your current `HEAD`, unless `worktree.baseRef` is `"head"`. The setting takes `"fresh"` (the default) or `"head"`, never a branch name. With no remote, a `"fresh"` worktree falls back to the local `HEAD`.

The symptom of the default: an agent asked to build on a feature branch starts from `main`, misses the branch's commits, and its work comes back as merge conflicts.

The trade-off is real. The default suits agents given tasks unrelated to what you are working on, since each starts from a clean tree. `"head"` suits agents asked to build on the branch in front of you, and it carries unpushed commits into the worktree. So this one is a choice, and an explicit `"fresh"` is a valid answer that `doctor` does not report.

## Keeping worktrees out of the repository

No setting changes the directory Claude Code uses. A `WorktreeCreate` hook can place worktrees elsewhere, but it replaces Claude Code's git logic outright: it receives no base, so `worktree.baseRef` stops applying, and Claude Code then removes neither a subagent's worktree nor its branch ([Claude Code hooks](https://code.claude.com/docs/en/hooks)). The skills do not offer one.

Instead, [`enhance`](/skills/enhance/#agent-worktrees) offers an Agent worktrees section for `AGENTS.md`. It tells the agent to create a worktree itself in a sibling directory, `../<repo>.worktrees/<name>`, branching from `HEAD`, and to hand a subagent that path rather than using `isolation: "worktree"`. The sibling layout is the one other worktree tools already use.

## What to add, and what to remove

| Where | Change |
| --- | --- |
| `AGENTS.md`, or your global `~/.agents/AGENTS.md` | add the Agent worktrees section |
| `.gitignore` | add `.claude/worktrees/` |
| `.claude/settings.json` | add `"worktree": { "baseRef": "head" }` |
| `biome.json` | replace a `.claude/worktrees` exclusion with `"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }` |
| the ESLint, Prettier, knip, and tsconfig configs | remove a `.claude/worktrees` exclusion, if an earlier version added one |

With the `.gitignore` line, reading `.gitignore` lets Biome skip worktrees from the main checkout without matching anything inside one: the rule is relative to the repository root. Tested with Biome 2.5.7, on a worktree under `.claude/worktrees/`, `biome check .` passes in both places. A bare removal fails the main checkout on the nested root configuration while a worktree exists.

The `.gitignore` line stays a backstop with the guidance in place: a session started with `--worktree`, or an agent that skips the guidance, still lands under `.claude/worktrees/`. The base setting still governs those worktrees.

## Who offers and who reports

[`enhance`](/skills/enhance/#agent-worktrees) offers the guidance, and [`init-buddy-agent-harness`](/skills/init-buddy-agent-harness/#agent-worktree-offers) offers each setting on its own, only where Claude Code is in use. Both write only what you approve. A decline writes nothing.

[`doctor`](/cli/doctor/#agent-worktree-findings) reports each worktree it finds inside the repository, a missing `.gitignore` line, a Biome exclusion that matches a worktree's own files, and an unset base, in a repository with a `.claude/` directory.
