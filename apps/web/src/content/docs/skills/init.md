---
title: 'Skill: init'
description: What the init skill does, what it asks you to approve, and what it leaves alone.
---

The `init` skill is the primary way to adopt canonical agent configuration. It is an agent skill, not a script: it reads what you already have, proposes a plan, and only then writes. The [CLI](/cli/init/) performs the mechanical linking step at the end.

## Run it

In Claude Code, invoke the skill directly:

```text
/buddy-agent-harness:init
```

Any agent that reads `.agents/skills/` can also be asked in prose, from the repository root:

```text
Initialize this repository's agent configuration.
```

The skill locates the Git repository root first. Canonical configuration always lives there, including in a monorepo.

## The five phases

### 1. Survey

The skill inventories two surfaces and writes nothing.

The **canonical surface**: `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/`.

The **existing harness surface**: instruction files, skill directories, commands, subagents, rules, MCP servers, and hooks across every supported harness. See [Migrating Existing Configuration](/getting-started/migrating/) for the full detection table.

For each finding it records which of three states it is in: a real user-authored file, a symlink already resolving into `.agents/` (a previous run), or something occupying a projection target that is neither (a conflict).

### 2. Classify

Every finding goes into exactly one bucket:

| Bucket | Meaning | Action |
| --- | --- | --- |
| already canonical | lives in `.agents/` or root `AGENTS.md` | left alone |
| already linked | a symlink resolving into `.agents/` | skipped, which is what makes re-runs idempotent |
| consolidatable | harness instruction files whose content belongs in `AGENTS.md` | merged, with approval |
| portable | skill and command directories | moved into `.agents/skills/` |
| canonical-only | MCP servers, rules, subagents, hooks, output styles | reported and left in place |

The canonical-only bucket is the important one. No safe cross-harness mapping exists for those formats, so the skill reports them rather than converting them.

### 3. Confirm

Nothing you authored is touched before you see the plan. The skill presents:

- what will be created,
- which content moves into `AGENTS.md`,
- which harness files would become pointers,
- any frontmatter to be added, showing the derived `name` and `description` verbatim,
- which harnesses will be enabled,
- what is being left alone, and why.

Explicit approval is required before any step that deletes, replaces, or rewrites a user-authored file. Creating a missing directory or a missing `AGENTS.md` does not need approval.

### 4. Apply

1. Scaffold the baseline: `.agents/`, `.agents/skills/`, and a root `AGENTS.md` if absent. An existing `AGENTS.md` is never rewritten.
2. Move approved skills and commands to `.agents/skills/<name>/SKILL.md`, preferring `git mv` so history follows, and fix frontmatter per [Portable Skills](/agent-configuration/portable-skills/).
3. Merge approved instruction content into `AGENTS.md`, preserving your wording. Content is appended, not restructured.
4. Run the `init` command to create the projections and report the enabled harnesses.
5. Resolve any reported conflict and retry. `--force` replaces one named projection; `--copy` is only for environments without symlinks.
6. Apply the instruction bridges the CLI does not write. [Claude Code](/agent-configuration/harnesses/claude-code/) needs a `CLAUDE.md`; [Gemini CLI](/agent-configuration/harnesses/gemini-cli/) needs a `.gemini/settings.json` edit.

### 5. Verify and report

Each projection is checked to resolve into `.agents/skills`, and every migrated `SKILL.md` is checked to parse with valid frontmatter. The report states what was created, consolidated, linked, and left canonical-only.

## Rules the skill follows

These hold regardless of what you ask for mid-run:

- Never invent project policy, and never rewrite your `AGENTS.md`.
- Never convert tool settings between formats without a documented mapping. Unmapped settings stay canonical.
- Symlinks belong in version control. They stay tracked and are not added to `.gitignore`.
- Only `.agents/skills/` is an established convention. `.agents/rules/`, `.agents/commands/`, and `.agents/agents/` are not invented and presented as standard.
- Local agent configuration only: no workflows, Actions, repository settings, security scanning, branch rules, or unrelated project files.

## Which harnesses get enabled

The enabled set is the union of three sources: Claude Code and Cursor unconditionally, any harness whose directory already exists in the repository, and any you name explicitly with `--harness codex,gemini-cli`.

A detected harness directory means there is existing configuration to reconcile. It is a starting point for the conversation, not a standing instruction to maintain that harness. The run reports which harnesses it enabled and why.

There is no way to disable a harness, and enabling one is not the same as writing files for it. Most enabled harnesses read `.agents/skills/` natively and receive nothing at all; only the projections are a real diff. See [Harness Differences](/agent-configuration/harness-differences/).

## Re-running

Re-run after adding or changing a skill only if you need a new harness enabled. A directory-level symlink is live: a skill added to `.agents/skills/` afterwards appears in every enabled harness with no further action. A `--copy` fallback is a snapshot instead, and does need a re-run.

A projection can also stop resolving later, most often on a clone that could not create the symlink. The [`doctor` skill](/skills/doctor/) is what reports that.
