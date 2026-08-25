---
'buddy-agent-harness': minor
---

`init` lists the configuration only one harness can read, and asks before migrating any of it.

`doctor` now reports these artifacts; `init` is the skill that acts on them. It reads the list from `doctor` rather than deriving a second one, presents each with the canonical form it is a candidate for, and asks per artifact — never for the set, because two rules can be in the list for opposite reasons and one approval would carry a file the owner never looked at.

Rules leave the canonical-only bucket. A rule whose paths are incidental to what it says converts to a skill, which every harness reads; a rule whose path scoping is the point has no equivalent and stays. Which one a given rule is cannot be read off the file, so it is offered rather than assumed. Subagents, hooks, output styles and MCP servers stay canonical-only and are reported as having no candidate at all, so the list is not read as a queue of pending work.

No conversion is offered that would leave fewer readers than before. Cursor reads `AGENTS.md` in Agent mode only, so consolidating `.cursorrules` and deleting it takes that guidance out of Chat and Composer; the offer is always the consolidation together with the generated copy that keeps them working. The existing rule against rewriting those files is not removed — it is the reason the migration is offered rather than applied.

The `init` skill now ships a `doctor` launcher beside its own, the way `repair` already does.
