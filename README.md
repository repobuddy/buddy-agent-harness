# buddy-agent-harness

[![CI](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml/badge.svg)](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml)
[![Codecov](https://codecov.io/gh/repobuddy/buddy-agent-harness/graph/badge.svg)](https://codecov.io/gh/repobuddy/buddy-agent-harness)
[![npm](https://img.shields.io/npm/v/buddy-agent-harness)](https://www.npmjs.com/package/buddy-agent-harness)
[![License](https://img.shields.io/npm/l/buddy-agent-harness)](LICENSE)

Initialize or update a consumer repository's standards-based agent configuration so its instructions, skills, and compatible tool settings work across multiple coding-agent harnesses.

## Install the plugin

Install the portable plugin and its `init` skill with `npx skills`:

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

```sh
npx -y buddy-agent-harness init
```

To mount the same command on `bd`, install the package alongside `repobuddy` and declare its plugin module in the consumer repository's `.repobuddy.json`:

```json
{
  "plugins": ["buddy-agent-harness"]
}
```

Then run `bd harness init`. `repobuddy` deliberately loads plugins declared in this configuration; it does not scan installed dependencies.

The canonical configuration is the repository root's `AGENTS.md` and `.agents/` tree: `.agents/AGENTS.md` holds shared behavior, `.agents/skills/**/SKILL.md` holds capabilities, and separately named files hold tool settings. The active harness is enabled by default; explicit user preferences add others. The command preserves user-authored configuration, projects only supported mappings, reports TOON by default, and records enabled harnesses in `.agents/buddy-agent-harness/config.json`.

Use `buddy-agent-harness init --help` to see `--root`, `--copy`, `--force`, and `--format`.
