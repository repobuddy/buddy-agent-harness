# Buddy Agent Harness

[![CI](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml/badge.svg)](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml)
[![Codecov](https://codecov.io/gh/repobuddy/buddy-agent-harness/graph/badge.svg)](https://codecov.io/gh/repobuddy/buddy-agent-harness)
[![npm](https://img.shields.io/npm/v/buddy-agent-harness)](https://www.npmjs.com/package/buddy-agent-harness)
[![License](https://img.shields.io/npm/l/buddy-agent-harness)](LICENSE)

An agent plugin and CLI for initializing or updating a consumer repository's standards-based agent configuration across coding-agent harnesses.

## Install the plugin

In Claude Code, add the marketplace and install the plugin and its `init` skill:

```text
/plugin marketplace add repobuddy/buddy-agent-harness
/plugin install buddy-agent-harness@repobuddy
```

## CLI

Run the CLI without a global installation:

```sh
npx -y buddy-agent-harness init
```

The repository root's `AGENTS.md` and `.agents/` tree are canonical: `.agents/AGENTS.md` holds shared behavior, `.agents/skills/**/SKILL.md` holds capabilities, and separately named files hold tool settings. The active harness is enabled by default; explicit user preferences add others. The command preserves user-authored configuration and projects only supported mappings; it records nothing on disk.

Use `buddy-agent-harness init --help` to see `--root`, `--copy`, `--force`, and `--format`.
