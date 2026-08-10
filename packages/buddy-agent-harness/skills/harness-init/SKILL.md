---
name: harness-init
description: Use this skill when initializing a consumer repository's canonical skills across enabled coding-agent harnesses.
---

# Harness Init

Run `npx -y buddy-agent-harness harness init` from the consumer repository. The command uses `.agents/skills/` as the canonical skill directory.

It always configures Claude Code. It configures Cursor, Codex, Copilot CLI, and Windsurf only when their respective detection paths already exist. Pass `--root <directory>` when configuring a package inside a monorepo.

Use `--copy` only if the operating system refuses symlinks. Resolve any listed conflicts before retrying; use `--force` only when replacing those targets is intended. Default TOON is the agent-oriented machine contract; use `--format json` for non-LLM programmatic consumption.
