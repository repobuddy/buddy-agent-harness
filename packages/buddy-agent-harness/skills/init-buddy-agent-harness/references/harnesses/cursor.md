# Cursor

**Write no skills projection.** Cursor reads `.agents/skills/` natively, plus `.cursor/skills/` and compat reads of `.claude/skills/` and `.codex/skills/`.

Cursor is enabled unconditionally alongside Claude Code, so it appears in the config record whether or not `.cursor/` exists. That record changes nothing on disk.

## Report the instruction gap

Cursor reads `AGENTS.md` in **Agent mode only**. Chat and Composer read `.cursorrules` and `.cursor/rules/*.mdc` instead.

Tell the user: a repository that consolidates into `AGENTS.md` keeps its instructions in Agent mode and loses them in Chat and Composer.

**Report this as contested.** It is secondary-sourced, not confirmed from Cursor's own documentation. Do not state it as settled fact.

## Do not

- **Do not generate `.cursor/rules/*.mdc` from `AGENTS.md`.** `.mdc` and `.md` are not interchangeable and path-scoping has no `AGENTS.md` equivalent, so a generated rule would be inventing scope the source never carried.
- **Do not delete or rewrite `.cursorrules` or `.cursor/rules/**` on the assumption that `AGENTS.md` covers them.** In Chat and Composer it does not. This is the reason a migration is *offered* rather than applied: the owner is agreeing to a trade, and they cannot agree to one nobody described.
- Do not assert whether Cursor's `.agents/skills` discovery recurses into nested subdirectories. It is untested.

## Migrating a rule, when the owner asks for it

Offer, never assume, and offer the whole thing:

- **A rule whose paths are incidental** — guidance that happens to name files but says something generally true — becomes a skill under `.agents/skills/`, which every harness reads. A rule whose scoping *is* the point has no equivalent; say so and leave it.
- **Consolidating `.cursorrules` into `AGENTS.md` narrows who reads it** unless a copy stays behind for Chat and Composer. Offer the consolidation and the copy together. Never offer the consolidation alone, and never delete the file because `AGENTS.md` now carries the words.

## Frontmatter

`paths`, `disable-model-invocation`, and legacy `globs` are Cursor-recognized. Other harnesses drop them — keep load-bearing behavior in the body, per `frontmatter.md`.
