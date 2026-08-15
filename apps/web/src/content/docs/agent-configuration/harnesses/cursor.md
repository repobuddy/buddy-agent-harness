---
title: Cursor
description: Cursor reads .agents/skills natively, but AGENTS.md reportedly only in Agent mode.
---

Cursor reads `.agents/skills/` natively, plus `.cursor/skills/` and compatibility reads of `.claude/skills/` and `.codex/skills/`. **No skills projection is written.** The canonical directory is already a Cursor directory.

Cursor is enabled unconditionally alongside Claude Code, so it appears in the configuration record whether or not `.cursor/` exists. That record changes nothing on disk.

The interesting part is instructions.

## The mode split

Cursor reads `AGENTS.md` in **Agent mode only**. Chat and Composer read `.cursorrules` and `.cursor/rules/*.mdc` instead.

If that is right, a repository that consolidates everything into `AGENTS.md` keeps its instructions in Agent mode and loses them in Chat and Composer — two of three surfaces.

**This claim is contested.** It comes from third-party comparisons, not from Cursor's own documentation. It is consequential enough to be worth verifying against Cursor's documentation before you rely on it either way, and it is stated here as unconfirmed rather than as settled fact. See [Sources & Confidence](/sources/).

## What not to do

- **Do not generate `.cursor/rules/*.mdc` from `AGENTS.md`.** Rules are canonical-only. `.mdc` and `.md` are not interchangeable, and path-scoping has no `AGENTS.md` equivalent.
- **Do not delete or rewrite `.cursorrules` or `.cursor/rules/**` on the assumption that `AGENTS.md` covers them.** In Chat and Composer it does not.
- Do not assume Cursor's `.agents/skills` discovery recurses into nested subdirectories. That is untested.

The practical position: consolidate instructions into `AGENTS.md`, and leave the Cursor rules files alone rather than trading a confirmed loss for an unconfirmed gain.

## Frontmatter

`paths`, `disable-model-invocation`, and legacy `globs` are Cursor-recognized. Other harnesses drop them, so keep load-bearing behavior in the Markdown body — see [Portable Skills](/agent-configuration/portable-skills/).

## Reference

- [Cursor: Agent Skills](https://cursor.com/docs/skills)
