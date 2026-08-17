# Buddy Agent Harness

[![CI](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml/badge.svg)](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml)
[![Codecov](https://codecov.io/gh/repobuddy/buddy-agent-harness/graph/badge.svg)](https://codecov.io/gh/repobuddy/buddy-agent-harness)
[![npm](https://img.shields.io/npm/v/buddy-agent-harness)](https://www.npmjs.com/package/buddy-agent-harness)
[![License](https://img.shields.io/npm/l/buddy-agent-harness)](LICENSE)

An agent plugin and CLI for initializing or updating a consumer repository's standards-based agent configuration across agent harnesses.

## Install the plugin

In Claude Code, add the [cyberplace](https://github.com/cyberuni/cyberplace) marketplace and install the plugin and its `init` skill:

```text
/plugin marketplace add cyberuni/cyberplace
/plugin install buddy-agent-harness@cyberplace
```

## CLI

`init` runs behind the `init` skill, which sorts the configuration you already wrote before the command links anything. Install the package alongside `repobuddy` to mount both commands on `buddy`, as `buddy agent-harness doctor` and `buddy agent-harness init`.

The repository root's `AGENTS.md` and `.agents/` tree are canonical: `.agents/AGENTS.md` holds shared behavior, `.agents/skills/**/SKILL.md` holds capabilities, and separately named files hold tool settings. The active harness is enabled by default; explicit user preferences add others. The command preserves user-authored configuration and projects only supported mappings; it records nothing on disk.

`init` takes `--root`, `--copy`, `--force`, and `--format`; `--help` lists them.

`doctor` is the read-only counterpart, and the one command worth running without any of the above. It reports whether the bridges `init` created still resolve after a clone — the common failure being a Windows checkout with `core.symlinks=false`, where git writes a committed symlink out as a regular file and the harness silently loads no skills:

```sh
npx -y buddy-agent-harness doctor
```

It never repairs anything and always exits `0`; each finding names the `init` command that fixes it.
