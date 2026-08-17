---
title: CLI Overview
description: The buddy-agent-harness command line, and when to use it instead of the skill.
---

`buddy-agent-harness` provides two commands. `init` links the canonical `.agents/skills` directory into the harnesses that cannot read it directly; `doctor` reports whether those links still resolve.

```sh
npx -y buddy-agent-harness init
npx -y buddy-agent-harness doctor
```

## Skill or CLI?

The CLI is the mechanical half. It creates projections, records the enabled harnesses, and reports conflicts. It does not read your existing `CLAUDE.md`, move skills, merge instructions, or write the instruction bridges.

Use the [`init` skill](/guides/initialize/) when adopting or migrating a repository. That is the whole job, and the CLI is step 4 of it. Use the CLI directly when the repository is already consolidated and you only need the links refreshed or a new harness enabled.

`doctor` is the read-only half of the same picture. It writes nothing and always exits `0`; each finding names the `init` command that repairs it. Reach for it when a harness loads no project skills, most often after a clone on Windows.

Full flags, output shape, and conflict behavior: [`init`](/cli/init/) and [`doctor`](/cli/doctor/).
