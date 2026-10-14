# Cursor

**Write no skills projection.** Cursor reads `.agents/skills/` natively, plus `.cursor/skills/` and compat reads of `.claude/skills/` and `.codex/skills/`.

Cursor is enabled unconditionally alongside Claude Code, so it appears in the config record whether or not `.cursor/` exists. That record changes nothing on disk.

## Instructions — no bridge needed

Cursor reads `AGENTS.md` in the project root and in subdirectories, and picks it up automatically. It applies in every mode — Agent, Ask, Plan, and Debug.

Write no instruction bridge. Consolidating into `AGENTS.md` costs no mode coverage.

Two things to tell the user instead:

- **`AGENTS.md` has no conditional attachment** — no globs, no description-gating, no `@`-mention-only. It loads on every conversation. Where content needs to apply to one subtree, a nested `AGENTS.md` is the documented way to scope it; where it needs real conditions, that is what `.cursor/rules/*.mdc` is for.
- **Cursor reads `CLAUDE.md` the same way it reads `AGENTS.md`**, and always applies it regardless of any `alwaysApply` setting. So a `CLAUDE.md` is loaded unconditionally by Cursor *in addition to* `AGENTS.md`, while Claude Code reads it *instead of* `AGENTS.md`. This is a second reason never to write one.

## Do not

- **Do not generate `.cursor/rules/*.mdc` from `AGENTS.md`.** `.mdc` and `.md` are not interchangeable and path-scoping has no `AGENTS.md` equivalent, so a generated rule would be inventing scope the source never carried. A plain `.md` in `.cursor/rules/` is ignored outright — it has no frontmatter.
- **Do not delete or rewrite `.cursorrules` or `.cursor/rules/**` on the assumption that `AGENTS.md` covers them.** Mode coverage is not the reason. A `.mdc` rule can carry `globs` or a `description` that `AGENTS.md` cannot express, so the trade is conditional activation, and the owner has to agree to it.
- Do not assert whether Cursor's `.agents/skills` discovery recurses into nested subdirectories. It is untested.
- Do not claim `AGENTS.md` beats `.cursor/rules/*.mdc` or loses to it. The documented precedence covers Team → Project → User rules and does not place `AGENTS.md` in that order. The two coexist; Cursor loads both.

## Migrating a rule, when the owner asks for it

Offer, never assume:

- **A rule whose paths are incidental** — guidance that happens to name files but says something generally true — becomes a skill under `.agents/skills/`, which every harness reads. A rule whose scoping *is* the point has no equivalent; say so and leave it.
- **A rule with `globs` or a `description`** loads conditionally, and `AGENTS.md` has no equivalent. Consolidating it makes it always-on. Say that, and let the owner decide whether the content is worth the context on every turn.
- An `alwaysApply: true` rule with no `globs` moves to `AGENTS.md` with nothing lost.


## Frontmatter

`paths`, `disable-model-invocation`, and legacy `globs` are Cursor-recognized. Other harnesses drop them — keep load-bearing behavior in the body, per `frontmatter.md`.
