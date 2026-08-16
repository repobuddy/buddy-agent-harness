---
title: Migrating Existing Configuration
description: Consolidate CLAUDE.md, .cursor/rules, and per-harness skill directories into one canonical source.
---

Most repositories do not start empty. They have a `CLAUDE.md`, a `.cursor/rules/` tree, a `.claude/skills/` directory, or all three. Migration is the part of [initialization](/guides/initialize/) that needs judgment, which is why the skill handles it and the CLI does not.

## What gets found, and where it goes

| Class | Look for | Disposition |
| --- | --- | --- |
| Instructions | `AGENTS.md`, `.agents/AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `.github/instructions/**`, `GEMINI.md`, `.windsurfrules` | Consolidate into `AGENTS.md`; confirm before replacing anything |
| Skills | `.claude/skills/`, `.cursor/skills/`, `.codex/skills/`, `.github/skills/`, `.windsurf/skills/`, `.gemini/skills/` | Move to `.agents/skills/`, fix frontmatter, then link back |
| Commands | `.claude/commands/*.md`, `.cursor/commands/*.md` | Move to `.agents/skills/<name>/SKILL.md` |
| Subagents | `.claude/agents/` | Canonical-only. No cross-harness format exists, so it is reported and left in place |
| Rules | `.cursor/rules/**.mdc`, `.claude/rules/`, `.windsurf/rules/` | Canonical-only. `.mdc` and `.md` are not interchangeable, and path-scoping syntax differs |
| MCP servers | `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.claude/settings.json` | Canonical-only. Never converted between formats |
| Hooks, output styles | hook blocks in settings files, `.claude/output-styles/` | Canonical-only. Hook event names differ by case across harnesses, so no safe projection exists |

## Instructions consolidate

Harness instruction files are prose, and prose merges. Their content moves into the root `AGENTS.md` with the author's wording preserved, appended rather than restructured. The harness file is replaced with a pointer only where you approve it.

The two harnesses that cannot read `AGENTS.md` keep a real file:

- **Claude Code** reads `CLAUDE.md`. The bridge is a `CLAUDE.md` containing `@AGENTS.md`, with any Claude-specific notes below the import.
- **Gemini CLI** defaults to `GEMINI.md`. The bridge is adding `AGENTS.md` to `context.fileName` in `.gemini/settings.json`.

Neither is written by the CLI. See [Claude Code](/agent-configuration/harnesses/claude-code/) and [Gemini CLI](/agent-configuration/harnesses/gemini-cli/).

## Commands become skills

`.claude/commands/*.md` and `.cursor/commands/*.md` migrate to `.agents/skills/<name>/SKILL.md`. Claude Code has merged commands into skills, so this follows the harness rather than fighting it. Migration uses `git mv` where possible so history follows the file.

Each migrated file needs frontmatter that satisfies the Agent Skills specification: at minimum a `name` matching its new directory and a `description`. A derived `name` and `description` are shown verbatim for approval before being written. See [Portable Skills](/agent-configuration/portable-skills/) for what survives the trip across harnesses.

## Rules do not convert

The most common migration mistake is generating `.cursor/rules/*.mdc` from `AGENTS.md`, or deleting `.cursorrules` on the assumption that `AGENTS.md` now covers it.

It does not. `.mdc` and `.md` are not interchangeable, path-scoped rules have no `AGENTS.md` equivalent, and [Cursor reads `AGENTS.md` in Agent mode only](/agent-configuration/harnesses/cursor/), so Chat and Composer still read the rules files. A repository that consolidates into `AGENTS.md` and deletes its rules loses instructions in two of three Cursor surfaces.

The same reasoning covers subagents, hooks, and MCP servers. They are reported and left exactly where they are.

## Conflicts

A pre-existing harness skills directory containing real skills is a conflict by design. The CLI checks every target before changing any of them, and without `--force` a conflict stops the run with all targets unchanged.

Move those skills into `.agents/skills/` first. Do not clear the conflict with `--force`, which discards them.
