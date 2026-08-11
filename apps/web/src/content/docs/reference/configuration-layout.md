---
title: Configuration Layout
description: The current harness paths and canonical source layout.
---

## Canonical skills

Each immediate directory under `.agents/skills/` is a canonical skill. Files at that level are ignored. A canonical skill is linked or copied into each selected harness at the path below.

| Harness | Current selection | Skill location |
| --- | --- | --- |
| Claude Code | Always selected | `.claude/skills/<skill>` |
| Cursor | Existing `.cursor/` directory | `.cursor/<skill>` |
| Codex | Existing `.codex/` directory | `.codex/<skill>` |
| Copilot CLI | Existing `.github/skills/` directory | `.github/skills/<skill>` |
| Windsurf | Existing `.windsurf/` directory | `.windsurf/<skill>` |

## Configuration record

After a successful run, the initializer writes:

```text
.agents/buddy-agent-harness/config.json
```

The record lists the harnesses selected for that run. It is not a replacement for user-authored policy or a signal that every vendor directory should be changed.

## Compatibility boundary

Today, the CLI synchronizes skills. Repository instructions and tool settings are part of the documented configuration objective, but they are only projected once a compatible, explicit mapping is implemented for a harness.
