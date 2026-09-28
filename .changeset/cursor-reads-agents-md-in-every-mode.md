---
'buddy-agent-harness': patch
---

Cursor reads `AGENTS.md` in every mode, and the skills no longer say otherwise. The previous claim — that Cursor reads it in Agent mode only, and that Chat and Composer would lose instructions consolidated into it — was sourced to third-party comparisons and marked contested. Cursor's own documentation contradicts it: "Project rules, user rules, and team rules apply in Agent, Ask, Plan, and Debug modes. The rules are included in every conversation regardless of which mode you're using." Chat, Composer, and Agent were merged into one interface in v0.46, and "Composer" now names a model, so the surfaces said to lose their instructions had not been separate readers for roughly a year and a half.

What changes in practice:

- **`init` no longer reports an instruction gap for Cursor.** Nothing is written for it, as before, and the skill no longer tells you a consolidation costs you coverage.
- **A Cursor rule is offered on activation, not on readership.** `init` used to offer consolidating a `.cursorrules` or `.cursor/rules/*.mdc` only alongside a generated copy left behind for the other modes. There are no other modes to keep working. The trade it names now is the real one: a rule carrying `globs` or a `description` loads when those match, and the same content in `AGENTS.md` loads on every turn.
- **`doctor`'s `nonstandard-instructions` repair drops the generated-bridge wording**, since leaving one behind is a per-harness question rather than what every consolidation does.
- **`CLAUDE.md` has a second reason not to exist.** Cursor reads it the same way it reads `AGENTS.md` and applies it to every conversation regardless of `alwaysApply`. Claude Code reads it *instead of* `AGENTS.md`; Cursor loads it *in addition to*. The rule against writing one was argued from Claude Code alone and now holds twice over.

Evidence: E-CUR-05, E-CUR-06, E-CUR-07, superseding E-CUR-02. Disclosed under Corrections on the Sources page.
