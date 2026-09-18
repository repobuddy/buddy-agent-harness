---
title: CLI Overview
description: The buddy-agent-harness command line, and when to use it instead of the skill.
---

`buddy-agent-harness` provides four commands. `init` links the canonical `.agents/skills` directory into the harnesses that cannot read it directly; `doctor` reports whether those links still resolve, along with the instruction bridges into `AGENTS.md` that the `init-buddy-agent-harness` skill writes; [`dep-plugins`](/cli/dep-plugins/) derives a marketplace catalog for plugins shipped by the repository's own dependencies, so a harness can install them; [`governance`](/cli/governance/) reads the project, user, and machine-wide layers that can override a governance document a skill would otherwise load from its own copy.

`doctor` is the one you run on its own:

```sh
npx -y buddy-agent-harness doctor
```

`init` runs behind the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/). Installing the package alongside `repobuddy` mounts both commands on `buddy`, as `buddy agent-harness doctor` and `buddy agent-harness init`.

## Skill or CLI?

The CLI is the mechanical half. It creates projections, records the enabled harnesses, and reports conflicts. It does not read your existing `CLAUDE.md`, move skills, merge instructions, or write the instruction bridges.

Use the [`init-buddy-agent-harness` skill](/skills/init-buddy-agent-harness/) when adopting or migrating a repository. That is the whole job, and the CLI is step 4 of it. Use the CLI directly when the repository is already consolidated and you only need the links refreshed or a new harness enabled.

`doctor` is the read-only half of the same picture. It writes nothing and always exits `0`; each finding names its repair — an `init` command for a skills bridge, and the `init-buddy-agent-harness` skill for an instruction bridge, which no command rebuilds. Reach for it when a harness loads no project skills, most often after a clone on Windows, or when one appears to be ignoring `AGENTS.md`. The [`doctor-buddy-agent-harness` skill](/skills/doctor-buddy-agent-harness/) wraps the same command for an agent.

Both commands print TOON by default and accept `--format text` for a report a person can read:

```sh
npx -y buddy-agent-harness doctor --format text
```

Full flags, output shape, and conflict behavior: [`init`](/cli/init/), [`doctor`](/cli/doctor/), [`dep-plugins`](/cli/dep-plugins/), and [`governance`](/cli/governance/).
