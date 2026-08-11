---
title: Canonical Configuration
description: Keep portable agent configuration in one repository-owned source.
---

The canonical configuration belongs to the repository, not a particular coding harness. Harness-specific files are compatible projections of that source, not places to maintain duplicate policy.

## Layout

```text
repository/
├── AGENTS.md                 # project-level agent instructions
└── .agents/
    ├── AGENTS.md             # shared repository guidance
    ├── skills/
    │   └── <skill>/SKILL.md  # reusable capabilities
    └── <tool-setting>        # separately named tool configuration
```

`AGENTS.md` is an open project-level format for instructions to coding agents. `SKILL.md` packages a reusable capability. Tool settings remain distinct because each setting has its own schema and compatibility rules.

## Source, not a generator

Buddy Agent Harness does not invent instructions or rewrite a team's policy. It preserves user-authored configuration and only projects artifacts into a harness when a supported mapping exists. A setting with no safe mapping stays canonical rather than being guessed or converted.

This gives a team one reviewable change for shared behavior while allowing each harness to read the configuration format it supports.

## Related formats

- [AGENTS.md](https://agents.md/) for project instructions.
- [Agent Skills](https://agentskills.io/specification) for reusable capabilities.
