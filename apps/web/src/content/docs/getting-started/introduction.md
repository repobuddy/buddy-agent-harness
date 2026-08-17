---
title: Introduction
description: Keep one repository-owned agent configuration that every coding harness can read.
---

Buddy Agent Harness gives a repository one canonical agent configuration (a root `AGENTS.md` and an `.agents/` tree) and bridges the coding harnesses that cannot read it directly.

Use it when a team works with more than one agent and does not want to maintain equivalent instructions in `CLAUDE.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, and a per-harness skills directory at the same time.

## The model

The repository root is the consumer boundary. Everything portable lives there:

```text
repository/
├── AGENTS.md                 # project-level agent instructions
└── .agents/
    ├── AGENTS.md             # shared repository guidance
    ├── skills/
    │   └── <skill>/SKILL.md  # reusable capabilities
    └── <tool-setting>        # separately named tool configuration
```

Harness-specific files are *projections* of that source, never a second source of truth. Most harnesses need no projection at all: Codex, Cursor, GitHub Copilot CLI, and Devin Desktop read `.agents/skills/` natively. Only Claude Code and Gemini CLI read solely their own directory and need a link.

This is a consolidation job, not a copy-everywhere job. See [Configuration Layout](/reference/configuration-layout/) for the full layout and [Harness Differences](/agent-configuration/harness-differences/) for who needs what.

## What it will not do

Buddy Agent Harness does not invent instructions or rewrite a team's policy. It preserves user-authored configuration and projects an artifact only where a documented, safe mapping exists. A setting with no such mapping (MCP servers, subagents, hooks, path-scoped rules) stays canonical rather than being guessed at or converted.

It also stays out of everything that is not local agent configuration: no changes to CI, workflows, repository settings, security scanning, or branch rules.

## Install

In Claude Code, install the plugin and its `init` skill from the Repobuddy marketplace:

```text
/plugin marketplace add repobuddy/buddy-agent-harness
/plugin install buddy-agent-harness@repobuddy
```

## Initialize a repository

From the repository root, invoke the `init` skill:

```text
/buddy-agent-harness:init
```

Any agent that reads `.agents/skills/` can be asked in prose instead:

```text
Initialize this repository's agent configuration.
```

The skill surveys what configuration you already have, proposes a consolidation plan, applies it once you approve, and runs the CLI to create the projections. That is the primary path. Start at [Skill: init](/skills/init/).

The CLI alone handles only the linking step:

```sh
npx -y buddy-agent-harness init
```

Use it directly on a repository that is already consolidated. See the [CLI reference](/cli/init/).

## Check the bridges

A link that a clone failed to create is silent: the harness finds no directory and loads zero project skills. The `doctor` skill and its command report that, and repair nothing:

```text
/buddy-agent-harness:doctor
```

```sh
npx -y buddy-agent-harness doctor --format text
```

Both commands default to TOON output, which is compact for an agent to parse; `--format text` prints an aligned report for a person. See [Skill: doctor](/skills/doctor/) and the [CLI reference](/cli/doctor/).

## Start small

You do not need to create every configuration artifact before initializing. Start with one repository skill in `.agents/skills/<name>/SKILL.md` and a root `AGENTS.md`. Re-running initialization is idempotent: an existing symlink that already resolves into `.agents/` is left alone.
