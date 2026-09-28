---
title: Cursor
description: Cursor reads .agents/skills and AGENTS.md natively, in every mode.
---

Cursor reads `.agents/skills/` natively, plus `.cursor/skills/` and compatibility reads of `.claude/skills/` and `.codex/skills/`. **No skills projection is written.** The canonical directory is already a Cursor directory.

Cursor is enabled unconditionally alongside Claude Code, so the command reports it as enabled whether or not `.cursor/` exists. Nothing is written for it either way.

Instructions need nothing written either.

## AGENTS.md is a first-class rule type

Cursor's rules documentation lists four types of rules and `AGENTS.md` is one of them, described as "Agent instructions in markdown format. Simple alternative to `.cursor/rules`." Put it in the project root and "Cursor picks it up automatically." Nested files in subdirectories work too, and their instructions "are combined with parent directories, with more specific instructions taking precedence."

It applies in every mode. Cursor's own FAQ, under "Do rules apply in all modes?":

> Yes. Project rules, user rules, and team rules apply in Agent, Ask, Plan, and Debug modes. The rules are included in every conversation regardless of which mode you're using.

One gap worth naming: that sentence enumerates project, user, and team rules and does not name `AGENTS.md`. Mode-independence is documented for three of the four rule types explicitly, and follows for `AGENTS.md` because the docs frame it as one of the four and as a substitute for project rules, with no mode exception anywhere.

### There was a mode split here, and it was wrong

Earlier versions of this page said Cursor read `AGENTS.md` in Agent mode only, and that Chat and Composer would lose instructions consolidated into it. That was sourced to third-party comparisons, marked contested, and is **withdrawn**. Two things are wrong with it: rules apply in all four modes, and Chat and Composer have not been separate surfaces since v0.46, which merged them into the Agent panel — "No more confusion between Chat, Composer, and Agent — just one smart interface." "Composer" now names a model. See [Sources & Confidence](/sources/).

The phrase that most likely produced it is Cursor's own: "Rules only apply to Agent (Chat)." That reads like *Agent mode, not Ask mode*, and means *the agent chat surface, not Tab completion, Inline Edit, or Bugbot PR reviews*. The real loading boundaries are per feature, not per mode.

## What AGENTS.md cannot do

It has no conditional attachment — no `globs`, no `description`-gating, no `@`-mention-only. It loads on every conversation. Cursor names the tradeoff directly: "For more control over when rules apply, use project rules in `.cursor/rules/` instead."

So the two coexist, and Cursor loads both. The documented precedence — Team Rules → Project Rules → User Rules — does not place `AGENTS.md` in the order, so where the two carry contradictory instructions the winner is undefined. Keep `AGENTS.md` as the always-on baseline and reach for `.mdc` rules where activation has to be conditional.

## CLAUDE.md is a Cursor instruction file

> Cursor reads `CLAUDE.md` files the same way it reads `AGENTS.md`.

And unconditionally: "`CLAUDE.md` files are always applied to every conversation, regardless of any `alwaysApply` frontmatter setting."

This is a second, independent reason never to write one. Claude Code reads a `CLAUDE.md` *instead of* `AGENTS.md`; Cursor loads it *in addition to* `AGENTS.md`. One file, two harnesses, two different ways for the canonical file to stop being the single source.

## What not to do

- **Do not generate `.cursor/rules/*.mdc` from `AGENTS.md`.** Rules are canonical-only. `.mdc` and `.md` are not interchangeable, and path-scoping has no `AGENTS.md` equivalent. A plain `.md` in `.cursor/rules/` is ignored outright, having no frontmatter to carry `description`, `globs`, or `alwaysApply`.
- **Do not delete a `.cursor/rules/*.mdc` because `AGENTS.md` now carries the words.** Coverage is not the reason to keep it — activation is. A rule with `globs` or a `description` loads when those conditions match; the same words in `AGENTS.md` load on every turn.
- Do not assume Cursor's `.agents/skills` discovery recurses into nested subdirectories. That is untested.

The practical position: consolidate instructions into `AGENTS.md`, and move an `alwaysApply: true` rule there freely. Where a rule earns its conditional activation, leave it as a rule.

## Frontmatter

`paths`, `disable-model-invocation`, and legacy `globs` are Cursor-recognized. Other harnesses drop them, so keep load-bearing behavior in the Markdown body. See [Portable Skills](/agent-configuration/portable-skills/).

## Reference

- [Cursor: Agent Skills](https://cursor.com/docs/skills)
- [Cursor: Rules](https://cursor.com/docs/rules)
- [Cursor: Rules (help)](https://cursor.com/help/customization/rules)
- [Cursor: Agent mode — "Do rules apply in all modes?"](https://cursor.com/help/ai-features/agent)
- [Cursor changelog 0.46 — Chat, Composer, and Agent unified](https://cursor.com/changelog/0-46-x)
