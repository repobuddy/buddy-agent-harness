---
title: CLI Overview
description: The buddy-agent-harness command line, and when to use it instead of the skill.
---

`buddy-agent-harness` provides one command, `init`, which links the canonical `.agents/skills` directory into the harnesses that cannot read it directly.

```sh
npx -y buddy-agent-harness init
```

## Skill or CLI?

The CLI is the mechanical half. It creates projections, records the enabled harnesses, and reports conflicts. It does not read your existing `CLAUDE.md`, move skills, merge instructions, or write the instruction bridges.

Use the [`init` skill](/guides/initialize/) when adopting or migrating a repository. That is the whole job, and the CLI is step 4 of it. Use the CLI directly when the repository is already consolidated and you only need the links refreshed or a new harness enabled.

Full flags, output shape, and conflict behavior: [`init`](/cli/init/).
