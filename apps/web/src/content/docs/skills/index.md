---
title: Skills
description: The two skills the plugin ships, init and doctor, and when to run the CLI instead.
---

The plugin ships two skills. [`init`](/skills/init/) gives a repository one canonical agent configuration and bridges the harnesses that cannot read it. [`doctor`](/skills/doctor/) reports whether those bridges still resolve.

Each skill has a CLI command behind it. The skill is the half that needs judgment about files you wrote; the command is the mechanical half.

| Reach for | When |
| --- | --- |
| the [`init` skill](/skills/init/) | adopting or migrating a repository, where existing `CLAUDE.md`, rules, and skill directories have to be sorted first |
| the [`doctor` skill](/skills/doctor/) | a harness loads no project skills, most often after a clone on Windows |
| the [CLI](/cli/) | the repository is already consolidated, or you want the report in a script |

## Install

In Claude Code, add the marketplace and install the plugin:

```text
/plugin marketplace add repobuddy/buddy-agent-harness
/plugin install buddy-agent-harness@repobuddy
```

Both skills come with it:

```text
/buddy-agent-harness:init
/buddy-agent-harness:doctor
```

## Or skip the install

Both commands run from npm without installing anything, and each skill runs the matching command as its own last step:

```sh
npx -y buddy-agent-harness init
npx -y buddy-agent-harness doctor
```

The default output is TOON, compact for an agent to parse and awkward for a person to read. Add `--format text` for an aligned report:

```sh
npx -y buddy-agent-harness doctor --format text
```

`init` accepts the same flag. Full options are in the [CLI reference](/cli/).
