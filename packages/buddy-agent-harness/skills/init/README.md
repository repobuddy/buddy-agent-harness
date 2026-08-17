# Harness Init

Give a repository one canonical agent configuration — a root `AGENTS.md` and an `.agents/` tree — and bridge the harnesses that cannot read it directly.

## What it does

The skill runs a five-phase workflow: survey the repository, classify what it finds, confirm the plan with you, apply it, then verify.

It detects agent configuration you already have — instruction files, skills, commands, subagents, rules, MCP servers, hooks — and either consolidates it into the canonical source, links it back out, or reports it as canonical-only where no safe cross-harness mapping exists. It never removes or rewrites a file you authored without asking first.

## Why the projection step is small

Codex, Cursor, GitHub Copilot CLI, and Devin Desktop read `.agents/skills/` natively, so they need nothing. Only Claude Code and Gemini CLI need a link, which the skill creates by running the `init` command in Phase 4.

Claude Code also reads `CLAUDE.md` rather than `AGENTS.md`, so the skill sets up a `CLAUDE.md` that imports `@AGENTS.md`.

`references/standard.md` defines the baseline every repository gets from the open standards. `references/harnesses/<harness>.md` covers what each harness needs on top of that baseline — and how well-sourced each claim is. `SKILL.md` routes to them directly.

## The part that needs care

Linking is easy; frontmatter is not. Each harness recognizes a different set of `SKILL.md` fields and silently drops the rest, so anything that must hold everywhere belongs in the Markdown body rather than in a harness-specific field. See `references/frontmatter.md`.

## Boundaries

Local agent configuration only. The skill does not invent instructions, convert tool settings without a documented mapping, or change CI, GitHub settings, security scanning, or branch rules.
