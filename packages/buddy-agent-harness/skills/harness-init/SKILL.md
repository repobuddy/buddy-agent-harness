---
name: harness-init
description: Use this skill when initializing or updating a consumer repository's standards-based agent configuration for use across multiple coding-agent harnesses.
---

# Harness Init

Initialize or update the consumer repository's agent configuration so its instructions, skills, and tool settings have one standards-based source and can be projected safely into multiple coding-agent harnesses.

1. Locate the Git repository root. Inspect its `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/`, and any canonical tool-settings files, alongside existing vendor configuration.
2. Treat `.agents/` as the repository's portable configuration home: `AGENTS.md` holds shared behavior, `skills/**/SKILL.md` holds reusable capabilities, and tool settings remain separately named configuration artifacts.
3. Enable the active harness by default. Add only the additional harnesses the user has explicitly chosen; do not infer that choice from vendor directories.
4. Run `npx -y buddy-agent-harness init` at the repository root and confirm the output records the enabled harnesses and updated configuration.

Preserve user-authored instructions and configuration. Create or update vendor projections only where the canonical artifact has a compatible representation; use relative links when supported and copies only when links are unavailable. Resolve conflicts before retrying, and use `--force` only when replacing the exact conflicting projection is intended.

Do not invent project policy, rewrite a user's `AGENTS.md`, or convert tool settings between formats without an explicit supported mapping. Default TOON is the agent-oriented machine contract; use `--format json` for non-LLM programmatic consumption.

This skill configures local agent configuration only. Do not change workflows, GitHub Actions, repository settings, security scanning, branch rules, or unrelated project files as part of initialization.
