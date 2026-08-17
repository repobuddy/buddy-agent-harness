# buddy-agent-harness

[![CI](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml/badge.svg)](https://github.com/repobuddy/buddy-agent-harness/actions/workflows/release.yml)
[![Codecov](https://codecov.io/gh/repobuddy/buddy-agent-harness/graph/badge.svg)](https://codecov.io/gh/repobuddy/buddy-agent-harness)
[![npm](https://img.shields.io/npm/v/buddy-agent-harness)](https://www.npmjs.com/package/buddy-agent-harness)
[![License](https://img.shields.io/npm/l/buddy-agent-harness)](LICENSE)

Initialize or update a consumer repository's standards-based agent configuration so its instructions, skills, and compatible tool settings work across multiple coding-agent harnesses.

## Install the plugin

In Claude Code, add the [cyberplace](https://github.com/cyberuni/cyberplace) marketplace and install the plugin and its `init` skill:

```text
/plugin marketplace add cyberuni/cyberplace
/plugin install buddy-agent-harness@cyberplace
```

## CLI

`doctor` is the read-only half. It runs on any clone, with the plugin installed or not:

```sh
npx -y buddy-agent-harness doctor
```

`init` runs behind the `init` skill, which sorts the configuration you already wrote before the command links anything.

To mount both commands on `buddy`, install the package alongside `repobuddy` and declare its plugin module in the consumer repository's `.repobuddy.json`:

```json
{
  "plugins": ["buddy-agent-harness"]
}
```

Then run `buddy agent-harness doctor`. `repobuddy` deliberately loads plugins declared in this configuration; it does not scan installed dependencies.

The canonical configuration is the repository root's `AGENTS.md` and `.agents/` tree: `.agents/AGENTS.md` holds shared behavior, `.agents/skills/**/SKILL.md` holds capabilities, and separately named files hold tool settings.

Codex, Cursor, GitHub Copilot CLI, and Devin Desktop read `.agents/skills/` natively, so nothing is written for them. Claude Code and Gemini CLI get a directory-level symlink to it. Claude Code and Cursor are always enabled; a detected harness directory or `--harness codex,gemini-cli` adds others. The command preserves user-authored configuration and reports TOON by default; it records nothing on disk.

`init` takes `--root`, `--harness`, `--copy`, `--force`, and `--format`; `--help` lists them.

`buddy-agent-harness doctor` is the read-only check that those bridges still resolve after a clone. It reports every bridge with a status, names the `init` command that repairs each finding, and always exits `0` — the diagnosis succeeding is not the same as the repository being healthy. See [`skills/doctor/SKILL.md`](packages/buddy-agent-harness/skills/doctor/SKILL.md).

The `init` skill goes further than the CLI: it surveys agent configuration the repository already has, consolidates it into the canonical source with your approval, and then links. See [`skills/init/SKILL.md`](packages/buddy-agent-harness/skills/init/SKILL.md).
