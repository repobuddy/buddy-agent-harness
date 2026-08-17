---
title: Skills
description: The three skills the plugin ships, init, doctor and enhance, and when to run the CLI instead.
---

The plugin ships three skills. [`init`](/skills/init/) gives a repository one canonical agent configuration and bridges the harnesses that cannot read it. [`doctor`](/skills/doctor/) reports whether those bridges still resolve. [`enhance`](/skills/enhance/) offers guidance the repository does not have yet.

`init` and `doctor` each have a CLI command behind them. The skill is the half that needs judgment about files you wrote; the command is the mechanical half. `enhance` has no command, because there is no mechanical half to hand off.

| Reach for | When |
| --- | --- |
| the [`init` skill](/skills/init/) | adopting or migrating a repository, where existing `CLAUDE.md`, rules, and skill directories have to be sorted first |
| the [`doctor` skill](/skills/doctor/) | a harness loads no project skills, most often after a clone on Windows |
| the [`enhance` skill](/skills/enhance/) | the repository has an `AGENTS.md` and you want the sections it is missing offered to you |
| the [CLI](/cli/) | the repository is already consolidated, or you want the report in a script |

`init` consolidates what you already have; `enhance` proposes what you do not. Keeping them apart is what lets `init` stay safe to run on any repository and carry no opinions.

## Install

In Claude Code, add the [cyberplace](https://github.com/cyberuni/cyberplace) marketplace and install the plugin:

```text
/plugin marketplace add cyberuni/cyberplace
/plugin install buddy-agent-harness@cyberplace
```

All three come with it:

```text
/buddy-agent-harness:init
/buddy-agent-harness:doctor
/buddy-agent-harness:enhance
```

## The commands behind them

`init` and `doctor` each end by running the matching command, `buddy-agent-harness init` or `buddy-agent-harness doctor`. Those are an npm package rather than part of the plugin, so they run on their own without it. `doctor` in particular is worth having on a repository you only cloned: see the [CLI reference](/cli/).
