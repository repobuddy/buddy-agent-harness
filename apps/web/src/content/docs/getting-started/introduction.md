---
title: Introduction
description: Set up a shared agent-configuration source for a repository.
---

Buddy Agent Harness keeps repository agent configuration portable across coding harnesses. Use it when a team works with more than one agent and wants to avoid manually maintaining equivalent configuration in several vendor directories.

## Install

Install the plugin and its `harness-init` skill:

```sh
npx skills add repobuddy/buddy-agent-harness --plugin
```

In Claude Code, install it from the Repobuddy marketplace:

```text
/plugin marketplace add repobuddy/buddy-agent-harness
/plugin install buddy-agent-harness@repobuddy
```

## Initialize a repository

From the repository root, ask your agent to run `harness-init`, or invoke the CLI directly:

```sh
npx -y buddy-agent-harness init
```

The command creates `.agents/skills/` when needed, projects its skills into selected harness locations, and records the selected harnesses in `.agents/buddy-agent-harness/config.json`.

## Start small

You do not need to create every configuration artifact before initializing. Start with one repository skill, keep it in `.agents/skills/<name>/SKILL.md`, and rerun initialization after adding or changing a skill. See [Canonical Configuration](../concepts/canonical-configuration/) for the intended full layout.
