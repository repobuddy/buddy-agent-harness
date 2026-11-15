---
title: 'Skill: init'
description: What the init skill does, what it asks you to approve, and what it leaves alone.
---

The `init-buddy-agent-harness` skill is the primary way to adopt canonical agent configuration. It is an agent skill, not a script: it reads what you already have, proposes a plan, and only then writes. The [CLI](/cli/init/) performs the mechanical linking step at the end.

## Run it

In Claude Code, invoke the skill directly:

```text
/buddy-agent-harness:init-buddy-agent-harness
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

The canonical-only bucket is the important one. The skill reports those formats rather than converting them: subagents, rules, hooks, and output styles have no cross-harness format to convert into, and MCP servers have one that cannot be applied without inventing values you did not write. [What stays canonical](/reference/configuration-layout/#what-stays-canonical) has the reasoning.

### 3. Confirm

Nothing you authored is touched before you see the plan. The skill presents:

- what will be created,
- which content moves into `AGENTS.md`,
- which harness files it will ask about deleting or replacing with a pointer,
- any frontmatter to be added, showing the derived `name` and `description` verbatim,
- which harnesses will be enabled,
- what is being left alone, and why.

Explicit approval is required before any step that deletes, replaces, or rewrites a user-authored file. Creating a missing directory or a missing `AGENTS.md` does not need approval. A step you decline leaves its file byte-identical.

Once a harness instruction file such as `.cursorrules`, `GEMINI.md`, or `.github/copilot-instructions.md` has been consolidated into `AGENTS.md`, what is left of it is your call, asked about each file on its own: delete it, replace it with a pointer to `AGENTS.md`, or leave it as it is. The skill never writes a copy of `AGENTS.md` in its place. Deletion is offered only when every harness that read the file will read `AGENTS.md` after the run, so `GEMINI.md` can be deleted only together with, or after, the `.gemini/settings.json` entry that names `AGENTS.md`. The offer for `.github/copilot-instructions.md` names the readers of that file that are not agent harnesses, because deleting it or replacing it with a pointer takes its content from them. A `CLAUDE.md` keeps its own rule: it is removed, or left holding the `@AGENTS.md` import.

### 4. Apply

1. Scaffold the baseline: `.agents/`, `.agents/skills/`, and a root `AGENTS.md` if absent. An existing `AGENTS.md` is never rewritten.
2. Move approved skills and commands to `.agents/skills/<name>/SKILL.md`, preferring `git mv` so history follows, and fix frontmatter per [Portable Skills](/agent-configuration/portable-skills/).
3. Merge approved instruction content into `AGENTS.md`, preserving your wording. Content is appended, not restructured. Each consolidated harness file is then deleted, replaced with a pointer, or left as it is, as you answered.
4. Run the `init` command to create the projections and report the enabled harnesses.
5. Resolve any reported conflict and retry. `--force` replaces one named projection; `--copy` is only for environments without symlinks.
   Where an existing skills copy drifted from `.agents/skills`, the command syncs it file by file. For each file changed on both sides, the skill shows you the difference and asks which side wins, then reruns the `sync` command with your picks. A file you give no answer for is left as it is on both sides.
6. Settle the instruction files the CLI does not touch. [Gemini CLI](/agent-configuration/harnesses/gemini-cli/) needs a `.gemini/settings.json` edit, and it is the only bridge left to write. No `CLAUDE.md` is written, at the root or beside a nested `AGENTS.md`: [Claude Code reads `AGENTS.md` itself](/agent-configuration/harnesses/claude-code/#instructions-need-nothing-written), and a generated copy would be read instead of it.

### 5. Verify and report

Each projection is checked to resolve into `.agents/skills`, and every migrated `SKILL.md` is checked to parse with valid frontmatter. The report states what was created, consolidated, linked, and left canonical-only.

Next the skill runs `doctor` again and lists the findings it does not own that [`repair`](/skills/repair/) does, such as a git-ignored bridge or MCP drift one side is plainly ahead on, and asks once whether to continue with `repair`. With no such finding, it does not ask. A finding about your global instructions is yours to fix in your home directory, and the skill gives you the step.

The run ends by asking whether to run [`enhance`](/skills/enhance/), which offers guidance your `AGENTS.md` does not have. Decline and nothing more happens. That offer is the only opinion `init` carries, and even it is a question.

## Rules the skill follows

These hold regardless of what you ask for mid-run:

- Never invent project policy, and never rewrite your `AGENTS.md`.
- Never convert tool settings between formats without a documented mapping. Unmapped settings stay canonical.
- A user-authored settings file is amended in place, never round-tripped through `JSON.parse`. Key order, indentation, and comments survive the edit, because [harnesses disagree about whether comments are allowed](/agent-configuration/harness-differences/#json-configuration-disagrees-about-comments).
- Symlinks belong in version control. They stay tracked and are not added to `.gitignore`.
- `init` writes `AGENTS.md` and `.agents/skills/`, and treats only those as standard. Other folders under `.agents/`, such as `.agents/agents/` or `.agents/commands/`, are your project's choice: `init` does not create them, leaves any you have, and does not call them standard.
- Local agent configuration only: no workflows, Actions, repository settings, security scanning, branch rules, or unrelated project files.

## Agent worktree offers

Where Claude Code is in use, meaning the repository has a `.claude/` directory or you named Claude Code in the run, the skill also offers two settings, each on its own and written only on approval: ignoring `.claude/worktrees/` in `.gitignore` and in each tree-scanning tool's config, and setting `worktree.baseRef` to `"head"`. A setting the repository already has is not offered, and the report says it is covered. [Agent Worktrees](/agent-configuration/agent-worktrees/) explains why.

## Which harnesses get enabled

The enabled set is the union of three sources: Claude Code and Cursor unconditionally, any harness whose directory already exists in the repository, and any you name explicitly with `--harness codex,gemini-cli`.

A detected harness directory means there is existing configuration to reconcile. It is a starting point for the conversation, not a standing instruction to maintain that harness. The run reports which harnesses it enabled and why.

There is no way to disable a harness, and enabling one is not the same as writing files for it. Most enabled harnesses read `.agents/skills/` natively and receive nothing at all; only the projections are a real diff. See [Harness Differences](/agent-configuration/harness-differences/).

## Re-running

Re-run after adding or changing a skill only if you need a new harness enabled. A directory-level symlink is live: a skill added to `.agents/skills/` afterwards appears in every enabled harness with no further action. A `--copy` fallback is a snapshot instead, and does need a re-run.

A projection can also stop resolving later, most often on a clone that could not create the symlink. The [`doctor-buddy-agent-harness` skill](/skills/doctor-buddy-agent-harness/) is what reports that.
