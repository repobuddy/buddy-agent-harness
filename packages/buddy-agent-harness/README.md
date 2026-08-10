# Buddy Agent Harness

[![CI](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml/badge.svg)](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml)
[![Codecov](https://codecov.io/gh/repobuddy/buddy-agent-harness/graph/badge.svg)](https://codecov.io/gh/repobuddy/buddy-agent-harness)
[![npm](https://img.shields.io/npm/v/buddy-agent-harness)](https://www.npmjs.com/package/buddy-agent-harness)
[![License](https://img.shields.io/npm/l/buddy-agent-harness)](LICENSE)

An agent plugin and CLI for initializing canonical skills across the coding-agent harnesses already enabled in a consumer repository.

## Install the plugin

Install the portable plugin and its `harness-init` skill with `npx skills`:

```sh
npx skills add repobuddy/buddy-agent-harness --plugin
```

In Claude Code, add the marketplace and install the plugin:

```text
/plugin marketplace add repobuddy/buddy-agent-harness
/plugin install buddy-agent-harness@repobuddy
```

Other agent clients can install the same repository through their plugin marketplace or use the `npx skills` command above.

## CLI

After the npm package is published, run the CLI without a global installation:

```sh
npx -y buddy-agent-harness init
```

Claude Code receives relative per-skill links unconditionally. Cursor, Codex, Copilot CLI, and Windsurf are configured only when their documented skills path already exists. The command records its enabled harnesses in `.agents/buddy-agent-harness/config.json`.

Use `buddy-agent-harness init --help` to see `--root`, `--copy`, `--force`, and `--format`.
